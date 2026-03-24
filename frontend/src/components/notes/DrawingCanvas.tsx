import {
    useState,
    useCallback,
    useRef,
    lazy,
    Suspense,
} from 'react';
import { Spinner } from '../ui/Spinner';

// Lazy loading per no bloquejar el bundle principal
const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw }))
);

interface DrawingCanvasProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertAsImage: (dataUrl: string) => void;
    onConvertToText: (markdown: string) => void;
}

export default function DrawingCanvas({
    isOpen,
    onClose,
    onInsertAsImage,
    onConvertToText,
}: DrawingCanvasProps) {
    const excalidrawRef = useRef<any>(null);
    const [elements, setElements] = useState<readonly any[]>([]);
    const [appState, setAppState] = useState<any>({});
    const [isConverting, setIsConverting] = useState(false);
    const [convertStep, setConvertStep] = useState('');
    const [error, setError] = useState('');
    const isEmpty = elements.length === 0;

    const handleChange = useCallback((els: readonly any[], state: any, files: any) => {
        setElements(els);
        setAppState(state);
    }, []);

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

    if (!isOpen) return null;

    return (
        // Pantalla completa absoluta (funciona dins del <main relative> del Dashboard)
        <div className="absolute inset-0 z-50 flex flex-col bg-[#0d1117]">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="
        flex items-center justify-between
        px-5 py-3 flex-shrink-0
        bg-[#141824] border-b border-white/10
      ">
                {/* Info */}
                <div className="flex items-center gap-3">
                    <div className="
            w-8 h-8 rounded-xl bg-purple-600/20
            flex items-center justify-center
          ">
                        <svg
                            width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="#a78bfa" strokeWidth="2"
                        >
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            <path d="M2 2l7.586 7.586" />
                            <circle cx="11" cy="11" r="2" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white leading-tight">
                            Mode llapis
                        </p>
                        <p className="text-xs text-gray-500">
                            Usa el dit, stylus o ratolí · Converteix a text amb IA
                        </p>
                    </div>
                </div>

                {/* Botons d'acció */}
                <div className="flex items-center gap-2">

                    {/* Inserir com imatge */}
                    <button
                        onClick={handleInsertAsImage}
                        disabled={isEmpty}
                        className="
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm
              border border-white/10 text-gray-300
              hover:bg-white/5 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed
            "
                    >
                        <svg
                            width="13" height="13" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Inserir com imatge
                    </button>

                    {/* Convertir a text */}
                    <button
                        onClick={handleConvertToText}
                        disabled={isEmpty || isConverting}
                        className="
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              bg-purple-600 hover:bg-purple-500 text-white
              transition-colors active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed
            "
                    >
                        {isConverting ? (
                            <>
                                <Spinner size="sm" />
                                <span className="text-xs">{convertStep}</span>
                            </>
                        ) : (
                            <>
                                <svg
                                    width="13" height="13" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                >
                                    <path d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Convertir a text
                            </>
                        )}
                    </button>

                    {/* Tancar */}
                    <button
                        onClick={onClose}
                        className="
              w-9 h-9 flex items-center justify-center rounded-xl
              text-gray-500 hover:text-white hover:bg-white/10
              transition-colors text-lg leading-none
            "
                        title="Tancar"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Error toast */}
            {error && (
                <div className="
          absolute top-16 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-2
          bg-red-500/20 border border-red-500/30
          rounded-xl px-4 py-2.5 text-xs text-red-300
          whitespace-nowrap shadow-xl
        ">
                    ⚠ {error}
                    <button
                        onClick={() => setError('')}
                        className="ml-1 font-bold text-red-400 hover:text-red-200"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* ── Canvas Excalidraw ─────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                <Suspense
                    fallback={
                        <div className="flex-1 flex items-center justify-center">
                            <Spinner size="lg" />
                        </div>
                    }
                >
                    <Excalidraw
                        ref={(api: any) => (excalidrawRef.current = api)}
                        initialData={{
                            elements,
                            appState: {
                                theme: 'dark',
                                viewBackgroundColor: '#0d1117',
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
                            // Amaga el peu de pàgina de Excalidraw (més net)
                            dockedSidebarBreakpoint: 0,
                        }}
                        langCode="ca"
                    />
                </Suspense>
            </div>

            {/* ── Footer informatiu ─────────────────────────────────────── */}
            <div className="
        px-5 py-2 flex-shrink-0
        bg-[#141824] border-t border-white/5
      ">
                <p className="text-xs text-gray-700 text-center">
                    "Inserir com imatge" afegeix el dibuix com a SVG a la nota ·
                    "Convertir a text" usa GPT-4o per interpretar el contingut
                </p>
            </div>
        </div>
    );
}
