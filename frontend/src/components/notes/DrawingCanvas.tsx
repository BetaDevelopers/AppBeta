import {
    useState,
    useCallback,
    useRef,
    useEffect,
    lazy,
    Suspense,
} from 'react';
import { Spinner } from '../ui/Spinner';
import { useMathOCR } from '@/features/ai/hooks/useMathOCR';

// Lazy loading per no bloquejar el bundle principal
const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw }))
);

interface DrawingCanvasProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertAsImage: (dataUrl: string) => void;
    onConvertToText: (markdown: string) => void;
    /** Crida quan s'ha reconegut una equació matemàtica → latex vàlid per a KaTeX */
    onInsertAsLatex?: (latex: string) => void;
}

export default function DrawingCanvas({
    isOpen,
    onClose,
    onInsertAsImage,
    onConvertToText,
    onInsertAsLatex,
}: DrawingCanvasProps) {
    const excalidrawRef = useRef<any>(null);
    const [elements, setElements] = useState<readonly any[]>([]);
    const [appState, setAppState] = useState<any>({});
    const [isConverting, setIsConverting] = useState(false);
    const [convertStep, setConvertStep] = useState('');
    const [error, setError] = useState('');
    const [mathResult, setMathResult] = useState<{ latex: string; confidence: number } | null>(null);
    const isEmpty = elements.length === 0;
    const { recognize, isProcessing: isMathProcessing } = useMathOCR();

    const handleChange = useCallback((els: readonly any[], state: any, files: any) => {
        setElements(els);
        setAppState(state);
    }, []);

    // Escapada ràpida amb teclat
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [onClose]);

    // ── Insereix com a imatge SVG a la nota ──────────────────────────
    const handleInsertAsImage = async () => {
        try {
            const { exportToSvg: expSvg } = await import('@excalidraw/excalidraw');
            const svg = await expSvg({
                elements,
                appState: {
                    ...appState,
                    exportBackground: true,
                    theme: 'dark',
                },
                files: excalidrawRef.current?.getFiles?.() ?? {},
            });

            const svgString = new XMLSerializer().serializeToString(svg);
            // Converteix SVG a data URL (evita problemes de CORS/seguretat)
            const b64 = btoa(unescape(encodeURIComponent(svgString)));
            const dataUrl = `data:image/svg+xml;base64,${b64}`;

            onInsertAsImage(dataUrl);
            onClose();
        } catch (err: any) {
            setError('Error exportant el dibuix: ' + err.message);
        }
    };

    // ── Converteix dibuix a text via GPT-4o OCR ──────────────────────
    const handleConvertToText = async () => {
        if (isEmpty) return;
        setError('');
        setIsConverting(true);

        try {
            // 1. Exporta el canvas a PNG
            setConvertStep('Exportant dibuix...');
            const { exportToBlob: expBlob } = await import('@excalidraw/excalidraw');
            const blob = await expBlob({
                elements,
                appState: {
                    ...appState,
                    exportBackground: true,
                    theme: 'dark',
                },
                files: excalidrawRef.current?.getFiles?.() ?? {},
                mimeType: 'image/png',
                quality: 0.92,
            });

            // 2. Blob → base64
            setConvertStep('Preparant imatge...');
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            bytes.forEach((b) => { binary += String.fromCharCode(b); });
            const base64 = btoa(binary);

            // 3. Envia al mateix endpoint OCR que la càmera
            setConvertStep('Analitzant amb IA... (10-20s)');
            const token = localStorage.getItem('beta3m_token');
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/ai/ocr`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        image: base64,
                        mime_type: 'image/png',
                    }),
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al convertir');

            onConvertToText(data.content_markdown || '');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error desconegut');
        } finally {
            setIsConverting(false);
            setConvertStep('');
        }
    };

    // ── Reconèixer equació matemàtica (GPT-4o Vision) ────────────────────
    const handleRecognizeMath = async () => {
        if (isEmpty) return;
        setError('');
        setMathResult(null);

        try {
            // Exporta el canvas a PNG blob → base64
            const { exportToBlob: expBlob } = await import('@excalidraw/excalidraw');
            const blob = await expBlob({
                elements,
                appState: {
                    ...appState,
                    exportBackground: true,
                    theme: 'dark',
                },
                files: excalidrawRef.current?.getFiles?.() ?? {},
                mimeType: 'image/png',
                quality: 0.92,
            });

            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            bytes.forEach((b) => { binary += String.fromCharCode(b); });
            const base64 = btoa(binary);

            const result = await recognize([], base64);

            if (!result) {
                setError('Error al connectar amb la IA. Torna-ho a intentar.');
                return;
            }

            if (!result.isEquation || !result.latex) {
                setError(`No s\'ha detectat cap equació matemàtica (confiança: ${Math.round(result.confidence * 100)}%).`);
                return;
            }

            setMathResult({ latex: result.latex, confidence: result.confidence });
        } catch (err: any) {
            setError('Error al reconèixer la matemàtica: ' + err.message);
        }
    };

    const handleInsertLatex = () => {
        if (!mathResult || !onInsertAsLatex) return;
        onInsertAsLatex(mathResult.latex);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Dark overlay backdrop */}
            <div className="fixed inset-0 bg-black/70 z-[99]" onClick={onClose} />

            <div className="drawing-canvas-overlay fixed inset-0 z-[100] flex flex-col bg-[#0d1117] animate-in fade-in duration-200">
                <style>{`
                    .drawing-canvas-overlay .excalidraw,
                    .drawing-canvas-overlay .excalidraw .Island,
                    .drawing-canvas-overlay .excalidraw .App-main,
                    .drawing-canvas-overlay .excalidraw .App-top-bar,
                    .drawing-canvas-overlay .excalidraw .App-bottom-bar {
                        background-color: transparent !important;
                        background: transparent !important;
                    }
                    .drawing-canvas-overlay .excalidraw__canvas {
                        background-color: transparent !important;
                    }
                    .drawing-canvas-overlay .layer-ui__wrapper__footer-center,
                    .drawing-canvas-overlay .zen-mode-transition,
                    .drawing-canvas-overlay .sidebar-trigger,
                    .drawing-canvas-overlay .layer-ui__wrapper__top-left {
                        display: none !important;
                    }
                    .drawing-canvas-overlay .Stack.Stack_vertical {
                        display: none !important;
                    }
                `}</style>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="toolbar flex items-center justify-between px-4 flex-shrink-0 bg-[#141824] border-b border-white/10" style={{ height: '60px' }}>
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                <path d="M2 2l7.586 7.586" />
                                <circle cx="11" cy="11" r="2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white leading-tight">Mode llapis</p>
                            <p className="text-xs text-gray-500 hidden sm:block">Usa el dit, stylus o ratolí</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {/* ∑ Equació */}
                        {onInsertAsLatex && (
                            <button
                                onClick={handleRecognizeMath}
                                disabled={isEmpty || isMathProcessing || isConverting}
                                className="flex items-center gap-2 px-3 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ height: 'var(--touch-md)' }}
                                title="Detecta equacions i les insereix com a fórmula LaTeX"
                            >
                                {isMathProcessing ? (
                                    <><Spinner size="sm" /><span className="hidden sm:inline text-xs">Analitzant…</span></>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 7h16M4 12h10M4 17h16" /><circle cx="18" cy="12" r="3" />
                                        </svg>
                                        <span className="hidden sm:inline">∑ Equació</span>
                                        <span className="sm:hidden">∑</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* Convertir a text */}
                        <button
                            onClick={handleConvertToText}
                            disabled={isEmpty || isConverting}
                            className="flex items-center gap-2 px-3 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ height: 'var(--touch-md)' }}
                        >
                            {isConverting ? (
                                <><Spinner size="sm" /><span className="hidden sm:inline text-xs">{convertStep}</span></>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    <span className="hidden sm:inline">Convertir a text</span>
                                    <span className="sm:hidden">Text</span>
                                </>
                            )}
                        </button>

                        {/* Close — 52x52 */}
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            style={{ width: 'var(--touch-md)', height: 'var(--touch-md)' }}
                            title="Cerrar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Error toast */}
                {error && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2.5 text-xs text-red-300 whitespace-nowrap shadow-xl">
                        ⚠ {error}
                        <button onClick={() => setError('')} className="ml-1 font-bold text-red-400 hover:text-red-200">✕</button>
                    </div>
                )}

                {/* Math result preview */}
                {mathResult && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl px-5 py-3 text-xs text-indigo-200 shadow-xl backdrop-blur-sm">
                        <span className="opacity-70">∑</span>
                        <code className="font-mono text-indigo-100 max-w-[260px] truncate">{mathResult.latex}</code>
                        <span className="text-indigo-400 font-medium">{Math.round(mathResult.confidence * 100)}%</span>
                        <button onClick={handleInsertLatex} className="ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-bold transition-colors">
                            Inserir ✓
                        </button>
                        <button onClick={() => setMathResult(null)} className="text-indigo-400 hover:text-indigo-200 font-bold">✕</button>
                    </div>
                )}

                {/* ── Canvas ─────────────────────────────────────────────── */}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>}>
                        <Excalidraw
                            excalidrawAPI={(api: any) => (excalidrawRef.current = api)}
                            initialData={{
                                elements,
                                appState: {
                                    theme: 'dark',
                                    viewBackgroundColor: 'transparent',
                                    activeTool: { type: 'freedraw' },
                                    zenModeEnabled: true,
                                    gridModeEnabled: false,
                                    ...appState,
                                },
                            }}
                            onChange={handleChange}
                            UIOptions={{
                                canvasActions: {
                                    export: false,
                                    loadScene: false,
                                    saveAsImage: false,
                                    saveToActiveFile: false,
                                    changeViewBackgroundColor: false,
                                },
                            }}
                            langCode="ca"
                        />
                    </Suspense>
                </div>

                {/* ── Bottom: Insert button full-width ───────────────────── */}
                <div className="flex-shrink-0 px-4 pb-4 pt-3 bg-[#141824] border-t border-white/5 safe-area-bottom">
                    <button
                        onClick={handleInsertAsImage}
                        disabled={isEmpty}
                        className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold text-[15px] border border-white/10 text-gray-200 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                        style={{ height: '56px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Inserir a la nota
                    </button>
                </div>
            </div>
        </>
    );
}
