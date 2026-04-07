import React, { useRef, useState, useEffect, useCallback } from 'react';
import katex from 'katex';
import { ocrImage } from '../../api/mathApi';

interface SmartCameraProps {
    onResult?: (markdown: string) => void;
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

type Phase = 'idle' | 'preview' | 'captured' | 'processing' | 'result';

export default function SmartCamera({ onResult }: SmartCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [phase, setPhase] = useState<Phase>('idle');
    const [capturedSrc, setCapturedSrc] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<{
        content_markdown: string;
        title: string;
        has_formulas: boolean;
        has_tables: boolean;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraAvailable, setCameraAvailable] = useState(true);

    // Cleanup: para el stream solo en unmount
    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => () => stopStream(), [stopStream]);

    // Re-adjunta el stream al video quan tornem a 'preview'
    useEffect(() => {
        if (phase === 'preview' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, [phase]);

    async function startCamera() {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setPhase('preview');
        } catch {
            setCameraAvailable(false);
            setError('No s\'ha pogut accedir a la càmera. Comprova els permisos del navegador.');
        }
    }

    function capture() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d')!.drawImage(video, 0, 0);

        // toBlob és asíncron i no bloqueja el fil principal
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    setCapturedSrc(e.target?.result as string);
                    setPhase('captured');
                    // El stream segueix actiu per si "Nova foto" torna al preview
                };
                reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.92
        );
    }

    async function runOCR() {
        if (!capturedSrc) return;
        setPhase('processing');
        setError(null);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        try {
            const b64 = capturedSrc.split(',')[1];
            const data = await ocrImage(b64, controller.signal);
            setOcrResult(data);
            setPhase('result');
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setError('Temps d\'espera esgotat (30s). Torna-ho a intentar.');
            } else {
                setError(e.message ?? 'Error al processar la imatge');
            }
            setPhase('captured');
        } finally {
            clearTimeout(timeout);
        }
    }

    // "Nova foto": si el stream segueix viu tornem a preview sense reiniciar;
    // si ja s'havia aturat (p.ex. permís revocat) tornem a idle.
    function novaFoto() {
        setCapturedSrc(null);
        setOcrResult(null);
        setError(null);
        if (streamRef.current) {
            setPhase('preview');
        } else {
            setPhase('idle');
        }
    }

    function handleInsert() {
        if (ocrResult?.content_markdown && onResult) {
            onResult(ocrResult.content_markdown);
        }
    }

    return (
        <div className="space-y-3">
            {/* Canvas ocult sempre al DOM per poder capturar */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video: visible només en preview, però sempre muntat per mantenir el ref */}
            <div className={phase === 'preview' ? '' : 'hidden'}>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                    <video ref={videoRef} className="w-full" autoPlay playsInline muted />
                </div>
                <button
                    onClick={capture}
                    className="w-full mt-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                >
                    ⬤ Capturar
                </button>
            </div>

            {/* IDLE */}
            {phase === 'idle' && (
                <div className="text-center py-6">
                    <div className="text-4xl mb-3">📷</div>
                    <p className="text-xs text-slate-500 mb-4">Fes una foto per escanejar text i fórmules</p>
                    {cameraAvailable ? (
                        <button
                            onClick={startCamera}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                        >
                            📷 Obrir càmera
                        </button>
                    ) : (
                        <p className="text-xs text-red-400">Càmera no disponible en aquest dispositiu</p>
                    )}
                </div>
            )}

            {/* CAPTURED */}
            {phase === 'captured' && capturedSrc && (
                <div className="space-y-2">
                    <img src={capturedSrc} alt="Captura" className="w-full rounded-xl border border-white/10" />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <button
                            onClick={novaFoto}
                            className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                        >
                            📷 Nova foto
                        </button>
                        <button
                            onClick={runOCR}
                            className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95"
                        >
                            🔍 Escanejar
                        </button>
                    </div>
                </div>
            )}

            {/* PROCESSING */}
            {phase === 'processing' && (
                <div className="relative">
                    {capturedSrc && (
                        <img src={capturedSrc} alt="Captura" className="w-full rounded-xl border border-white/10 opacity-40" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Analitzant…</p>
                    </div>
                </div>
            )}

            {/* RESULT */}
            {phase === 'result' && ocrResult && (
                <div className="space-y-3">
                    {capturedSrc && (
                        <img src={capturedSrc} alt="Captura" className="w-full rounded-xl border border-white/10 opacity-60" />
                    )}

                    {/* Badges */}
                    {(ocrResult.has_formulas || ocrResult.has_tables) && (
                        <div className="flex gap-2">
                            {ocrResult.has_formulas && (
                                <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/20">
                                    ∑ Fórmules
                                </span>
                            )}
                            {ocrResult.has_tables && (
                                <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/20">
                                    ⊞ Taules
                                </span>
                            )}
                        </div>
                    )}

                    {ocrResult.title && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{ocrResult.title}</p>
                    )}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                        {renderMixed(ocrResult.content_markdown)}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={novaFoto}
                            className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                        >
                            📷 Nova foto
                        </button>
                        {onResult && (
                            <button
                                onClick={handleInsert}
                                className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                            >
                                📋 Inserir a la nota
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
