import React, { useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { mathOCRImage } from '../../api/mathApi';

interface FileUploadOCRProps {
    onResult?: (markdown: string) => void;
    onInsertImage?: (src: string) => void;
}

function renderMixed(text: string) {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    return parts.map((part, i) => {
        if (part.startsWith('$')) {
            const display = part.startsWith('$$');
            const latex = part.replace(/\$+/g, '');
            try {
                const html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
                return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
                return <code key={i} style={{ color: '#f87171' }}>{part}</code>;
            }
        }
        return <span key={i}>{part}</span>;
    });
}

type Phase = 'idle' | 'processing' | 'result';

export default function FileUploadOCR({ onResult, onInsertImage }: FileUploadOCRProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<{ content_markdown: string; title: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const processFile = useCallback(async (file: File) => {
        if (file.type === 'application/pdf') {
            setError('PDF no suportat directament. Converteix a imatge (JPG/PNG) i torna a pujar.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Format no suportat. Puja una imatge JPG, PNG o WEBP.');
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const src = e.target?.result as string;
            setImageSrc(src);
            setPhase('processing');
            try {
                const b64 = src.split(',')[1];
                const data = await mathOCRImage(b64);
                setOcrResult(data);
                setPhase('result');
            } catch (err: any) {
                setError(err.message ?? 'Error al processar la imatge');
                setPhase('idle');
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const onDragLeave = useCallback(() => setDragging(false), []);

    function reset() {
        setImageSrc(null);
        setOcrResult(null);
        setError(null);
        setPhase('idle');
    }

    return (
        <div className="space-y-3">
            {phase === 'idle' && (
                <>
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                            ${dragging
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-white/10 hover:border-white/25 hover:bg-white/3'
                            }`}
                    >
                        <div className="text-2xl mb-2">📂</div>
                        <p className="text-xs text-slate-500">Arrossega una imatge aquí o fes clic per seleccionar</p>
                        <p className="text-[10px] text-slate-600 mt-1">JPG · PNG · WEBP</p>
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                    />
                </>
            )}

            {phase === 'processing' && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500">Analitzant imatge…</p>
                </div>
            )}

            {phase === 'result' && ocrResult && (
                <div className="space-y-3">
                    {imageSrc && (
                        <img src={imageSrc} alt="Fitxer" className="w-full rounded-xl border border-white/10 max-h-40 object-contain bg-black/20" />
                    )}
                    {ocrResult.title && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{ocrResult.title}</p>
                    )}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                        {renderMixed(ocrResult.content_markdown)}
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex flex-col gap-2">
                        {onResult && (
                            <button
                                onClick={() => onResult(ocrResult.content_markdown)}
                                className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                            >
                                + Inserir contingut a la nota
                            </button>
                        )}
                        {onInsertImage && imageSrc && (
                            <button
                                onClick={() => onInsertImage(imageSrc)}
                                className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                            >
                                🖼 Afegir com a imatge
                            </button>
                        )}
                        <button
                            onClick={reset}
                            className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-500 hover:bg-white/10 transition-all"
                        >
                            Pujar altra imatge
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
