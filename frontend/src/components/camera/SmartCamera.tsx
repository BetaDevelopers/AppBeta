import React, { useRef, useState, useEffect, useCallback } from 'react';
import katex from 'katex';
import { mathOCRImage } from '../../api/mathApi';

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
    const [ocrResult, setOcrResult] = useState<{ content_markdown: string; title: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraAvailable, setCameraAvailable] = useState(true);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => () => stopStream(), [stopStream]);

    async function startCamera() {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
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
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        const src = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedSrc(src);
        stopStream();
        setPhase('captured');
    }

    async function runOCR() {
        if (!capturedSrc) return;
        setPhase('processing');
        setError(null);
        try {
            const b64 = capturedSrc.split(',')[1];
            const data = await mathOCRImage(b64);
            setOcrResult(data);
            setPhase('result');
        } catch (e: any) {
            setError(e.message ?? 'Error al processar la imatge');
            setPhase('captured');
        }
    }

    function reset() {
        setCapturedSrc(null);
        setOcrResult(null);
        setError(null);
        setPhase('idle');
    }

    function handleInsert() {
        if (ocrResult?.content_markdown && onResult) {
            onResult(ocrResult.content_markdown);
        }
    }

    return (
        <div className="space-y-3">
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

            {/* PREVIEW */}
            {phase === 'preview' && (
                <div className="space-y-2">
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                        <video ref={videoRef} className="w-full" autoPlay playsInline muted />
                    </div>
                    <button
                        onClick={capture}
                        className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                    >
                        ⬤ Capturar
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* CAPTURED */}
            {phase === 'captured' && capturedSrc && (
                <div className="space-y-2">
                    <img src={capturedSrc} alt="Captura" className="w-full rounded-xl border border-white/10" />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <button
                            onClick={reset}
                            className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                        >
                            Nova foto
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
                <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500">Analitzant imatge…</p>
                </div>
            )}

            {/* RESULT */}
            {phase === 'result' && ocrResult && (
                <div className="space-y-3">
                    {capturedSrc && (
                        <img src={capturedSrc} alt="Captura" className="w-full rounded-xl border border-white/10 opacity-60" />
                    )}
                    {ocrResult.title && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{ocrResult.title}</p>
                    )}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                        {renderMixed(ocrResult.content_markdown)}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={reset}
                            className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                        >
                            Nova foto
                        </button>
                        {onResult && (
                            <button
                                onClick={handleInsert}
                                className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                            >
                                + Inserir a la nota
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
