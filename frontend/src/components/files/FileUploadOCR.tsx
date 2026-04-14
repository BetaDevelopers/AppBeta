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
                return <span key={i} className="inline-block py-1" dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
                return <code key={i} className="text-red-400 font-mono text-[10px]">{part}</code>;
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
            setError('PDF no soportado directamente. Convierte a JPG/PNG.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Formato no soportado. Sube una imagen (JPG, PNG o WEBP).');
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
                setError(err.message ?? 'Error al procesar la imagen');
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
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl max-w-4xl mx-auto overflow-hidden font-sans">
            <div className="flex items-center gap-6 mb-8 px-2">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-3xl border border-violet-500/20 shadow-xl shadow-violet-500/5">
                    📂
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter leading-7">Extractor de Documentos</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Digitalización de apuntes y archivos</p>
                </div>
            </div>

            {phase === 'idle' && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => inputRef.current?.click()}
                        className={`group relative border-2 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300
                            ${dragging
                                ? 'border-violet-500 bg-violet-500/10 scale-[0.98]'
                                : 'border-white/10 hover:border-violet-500/40 hover:bg-white/5'
                            }`}
                    >
                        <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300 group-hover:-rotate-6">📁</div>
                        <h3 className="text-white font-bold text-lg mb-2">Suelte su archivo aquí</h3>
                        <p className="text-xs text-slate-500 font-medium mb-6">o haga clic para explorar sus carpetas</p>

                        <div className="flex justify-center gap-3">
                            {['JPG', 'PNG', 'WEBP'].map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-600 uppercase tracking-widest">{tag}</span>
                            ))}
                        </div>
                    </div>
                    {error && (
                        <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold flex items-center gap-3">
                            <span className="text-lg">⚠</span> {error}
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                    />
                </div>
            )}

            {phase === 'processing' && (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
                    <div className="relative mb-8">
                        <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-white/5 border-b-white/20 rounded-full animate-spin [animation-duration:1.5s]" />
                        </div>
                    </div>
                    <p className="text-xs font-black text-violet-400 uppercase tracking-[0.4em] animate-pulse">Analizando Estructura...</p>
                </div>
            )}

            {phase === 'result' && ocrResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 group shadow-inner aspect-[4/3] flex items-center justify-center">
                            {imageSrc && (
                                <img src={imageSrc} alt="Archivo" className="max-w-full max-h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                            )}
                            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase text-white/40">Origen</div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenido Extraído</span>
                                <span className="text-[9px] font-bold text-violet-500/60 uppercase">Heurística AI</span>
                            </div>

                            <div className="bg-[#030712]/60 border border-white/5 rounded-[2rem] p-6 text-sm text-slate-300 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                                {renderMixed(ocrResult.content_markdown)}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                        <div className="flex gap-4">
                            <button
                                onClick={() => onResult?.(ocrResult.content_markdown)}
                                className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-1 transition-all active:scale-95"
                            >
                                Inserir como Texto Pro
                            </button>
                            {onInsertImage && imageSrc && (
                                <button
                                    onClick={() => onInsertImage(imageSrc)}
                                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    🖼 Imagen
                                </button>
                            )}
                        </div>
                        <button
                            onClick={reset}
                            className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-all"
                        >
                            ← Subir otro archivo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
