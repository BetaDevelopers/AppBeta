import React, { useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { Folder, AlertTriangle, Image } from 'lucide-react';
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
                return <span key={i} className="inline-block py-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
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
            setError('PDF no soportado. Convierte a JPG/PNG.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Formato no soportado. Usa JPG, PNG o WEBP.');
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

    const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const onDragLeave = useCallback(() => setDragging(false), []);

    function reset() {
        setImageSrc(null);
        setOcrResult(null);
        setError(null);
        setPhase('idle');
    }

    return (
        <div className="w-full font-sans">

            {/* ── Idle ── */}
            {phase === 'idle' && (
                <div>
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => inputRef.current?.click()}
                        className={`relative flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-xl cursor-pointer transition-all duration-200 border
                            ${dragging
                                ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/08 scale-[0.98]'
                                : 'border-dashed border-[rgba(255,255,255,0.10)] hover:border-[#7C5CFF]/40 hover:bg-[rgba(124,92,255,0.04)]'
                            }`}
                    >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${dragging ? 'bg-[#7C5CFF]/20 scale-110' : 'bg-[rgba(255,255,255,0.04)]'}`}>
                            <Folder size={20} className="text-[#8B949E]" />
                        </div>

                        <div className="text-center">
                            <p className="text-[13px] font-semibold text-[#C9D1D9]">Suelta tu archivo aquí</p>
                            <p className="text-[11px] text-[#484F58] mt-0.5">o haz clic para explorar</p>
                        </div>

                        {/* Format tags */}
                        <div className="flex gap-1.5">
                            {['JPG', 'PNG', 'WEBP'].map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[9px] font-bold text-[#484F58] uppercase tracking-widest"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-2 px-3 py-2 rounded-lg bg-[rgba(247,129,102,0.08)] border border-[rgba(247,129,102,0.15)] text-[#F78166] text-[11px] flex items-center gap-2">
                            <AlertTriangle size={14} />
                            <span>{error}</span>
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

            {/* ── Processing ── */}
            {phase === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-2 border-[#7C5CFF]/20 border-t-[#7C5CFF] animate-spin" />
                        <div className="absolute inset-[5px] rounded-full border-2 border-white/5 border-b-white/15 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
                    </div>
                    <p className="text-[10px] font-semibold text-[#7C5CFF]/80 uppercase tracking-[0.3em] animate-pulse">Analizando…</p>
                </div>
            )}

            {/* ── Result ── */}
            {phase === 'result' && ocrResult && (
                <div className="flex flex-col gap-3">
                    {/* Preview */}
                    {imageSrc && (
                        <div className="relative rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-black/30 aspect-video flex items-center justify-center">
                            <img src={imageSrc} alt="Origen" className="max-w-full max-h-full object-contain p-2" />
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[9px] font-bold text-[#484F58] uppercase tracking-wider backdrop-blur-sm">
                                Origen
                            </span>
                        </div>
                    )}

                    {/* Extracted text */}
                    <div>
                        <p className="text-[10px] font-semibold text-[#484F58] uppercase tracking-widest mb-1.5 px-0.5">Contenido extraído</p>
                        <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-[12px] text-[#8B949E] leading-relaxed max-h-40 overflow-y-auto scrollbar-hide">
                            {renderMixed(ocrResult.content_markdown)}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={() => onResult?.(ocrResult.content_markdown)}
                            className="w-full h-9 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4EEF] text-white text-[11px] font-semibold tracking-wide transition-all active:scale-95 shadow-lg shadow-[#7C5CFF]/20"
                        >
                            Insertar como texto
                        </button>
                        {onInsertImage && imageSrc && (
                            <button
                                onClick={() => onInsertImage(imageSrc)}
                                className="w-full h-9 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[rgba(255,255,255,0.07)] text-[11px] font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <Image size={14} /> Insertar imagen
                            </button>
                        )}
                        <button
                            onClick={reset}
                            className="w-full h-8 text-[10px] font-medium text-[#484F58] hover:text-[#8B949E] transition-colors uppercase tracking-widest"
                        >
                            ← Otro archivo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
