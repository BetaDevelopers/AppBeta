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
                return <span key={i} className="inline-block py-1" dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
                return <code key={i} className="text-red-400 font-mono text-[10px]">{part}</code>;
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
    const [shutter, setShutter] = useState(false);
    const [ocrResult, setOcrResult] = useState<{
        content_markdown: string;
        title: string;
        has_formulas: boolean;
        has_tables: boolean;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraAvailable, setCameraAvailable] = useState(true);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => () => stopStream(), [stopStream]);

    useEffect(() => {
        if (phase === 'preview' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => { });
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
            setError('Acceso denegado. Por favor, habilita la cámara en tu navegador.');
        }
    }

    function capture() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        setShutter(true);
        setTimeout(() => setShutter(false), 150);

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d')!.drawImage(video, 0, 0);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    setCapturedSrc(e.target?.result as string);
                    setPhase('captured');
                };
                reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.95
        );
    }

    async function runOCR() {
        if (!capturedSrc) return;
        setPhase('processing');
        setError(null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        try {
            const b64 = capturedSrc.split(',')[1];
            const data = await ocrImage(b64, controller.signal);
            setOcrResult(data);
            setPhase('result');
        } catch (e: any) {
            setError(e.name === 'AbortError' ? 'Time out. Inténtalo de nuevo.' : (e.message ?? 'Fallo en el reconocimiento biométrico de texto.'));
            setPhase('captured');
        } finally {
            clearTimeout(timeout);
        }
    }

    function novaFoto() {
        setCapturedSrc(null);
        setOcrResult(null);
        setError(null);
        if (streamRef.current) setPhase('preview');
        else setPhase('idle');
    }

    return (
        <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl max-w-4xl mx-auto overflow-hidden font-sans">
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-3xl border border-sky-500/20 shadow-xl shadow-sky-500/5">
                        📸
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter">Vision AI Hub</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Reconocimiento Inteligente de Documentos</p>
                    </div>
                </div>
                {phase === 'preview' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live Feed</span>
                    </div>
                )}
            </div>

            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-black shadow-inner aspect-[16/9] group">
                {/* VIDEO PREVIEW */}
                <div className={phase === 'preview' ? 'w-full h-full relative' : 'hidden'}>
                    <video ref={videoRef} className="w-full h-full object-cover scale-[1.02]" autoPlay playsInline muted />

                    {/* Camera HUD & Framing */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Corners with Pulsing effect */}
                        <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-sky-400 rounded-tl-3xl shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-pulse" />
                        <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-sky-400 rounded-tr-3xl shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-pulse" />
                        <div className="absolute bottom-32 left-8 w-16 h-16 border-b-4 border-l-4 border-sky-400 rounded-bl-3xl shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-pulse" />
                        <div className="absolute bottom-32 right-8 w-16 h-16 border-b-4 border-r-4 border-sky-400 rounded-br-3xl shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-pulse" />

                        {/* Scanning Line with Gradient Glow */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_30px_rgba(56,189,248,0.8)] animate-[scan_2.5s_ease-in-out_infinite] z-20">
                            <div className="absolute inset-x-0 h-40 bg-sky-400/5 -top-40 blur-3xl pointer-events-none" />
                        </div>

                        {/* Shutter Effect */}
                        {shutter && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}

                        {/* Grid Lines */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10 pointer-events-none">
                            <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" />
                            <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" />
                            <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" /> <div className="border-[0.5px] border-white" />
                        </div>

                        {/* Document Tint Hint */}
                        <div className="absolute inset-10 border-2 border-emerald-500/20 rounded-[2rem] bg-emerald-500/5 animate-pulse" />
                    </div>

                    <div className="absolute bottom-8 left-0 right-0 flex justify-center px-10 z-30">
                        <button
                            onClick={capture}
                            className="group relative flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-sky-500/30 blur-3xl group-hover:bg-sky-500/50 transition-all rounded-full" />
                            <div className="w-28 h-28 rounded-full border-[8px] border-white/20 p-2 flex items-center justify-center group-hover:border-white transition-colors">
                                <div className="w-full h-full rounded-full bg-white shadow-2xl flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </button>
                    </div>

                    <style>{`
                        @keyframes scan {
                            0% { top: 10%; opacity: 0; }
                            15% { opacity: 1; }
                            85% { opacity: 1; }
                            100% { top: 70%; opacity: 0; }
                        }
                    `}</style>
                </div>

                {/* IDLE PHASE */}
                {phase === 'idle' && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95">
                        <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center text-5xl mb-2 border border-white/5 shadow-2xl">
                            👁️
                        </div>
                        <p className="text-slate-500 font-bold text-sm tracking-wide text-center max-w-[280px]">
                            Alinea tu documento o apuntes para digitalizarlos con precisión matemática.
                        </p>
                        {cameraAvailable ? (
                            <button
                                onClick={startCamera}
                                className="px-10 h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-sky-600/20 hover:shadow-sky-600/40 transition-all hover:-translate-y-1 active:scale-95"
                            >
                                Iniciar Escáner Pro
                            </button>
                        ) : (
                            <p className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-100 text-[11px] font-bold">Cámara de sistema no detectada</p>
                        )}
                    </div>
                )}

                {/* CAPTURED / PROCESSING PHASE */}
                {(phase === 'captured' || phase === 'processing') && capturedSrc && (
                    <div className="w-full h-full relative group">
                        <img src={capturedSrc} alt="Capture" className={`w-full h-full object-cover transition-all duration-1000 ${phase === 'processing' ? 'blur-lg scale-110' : ''}`} />

                        {phase === 'captured' && (
                            <div className="absolute bottom-10 left-0 right-0 px-10 flex gap-4 animate-in slide-in-from-bottom-8">
                                <button
                                    onClick={novaFoto}
                                    className="flex-1 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={runOCR}
                                    className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-sky-500/40 hover:scale-105 transition-all"
                                >
                                    Digitalizar con IA
                                </button>
                            </div>
                        )}

                        {phase === 'processing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-b-indigo-400 rounded-full animate-spin [animation-direction:reverse]" />
                                    </div>
                                </div>
                                <span className="text-xs font-black text-sky-400 uppercase tracking-[0.5em] animate-pulse">Analizando Pixels...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* RESULT PHASE */}
                {phase === 'result' && ocrResult && (
                    <div className="w-full h-full bg-slate-950 p-10 flex flex-col items-center justify-center overflow-auto animate-in fade-in scale-95">
                        <div className="w-full max-w-2xl bg-slate-900/60 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                            <div className="flex gap-3 mb-8">
                                {ocrResult.has_formulas && <span className="px-3 py-1 rounded-lg bg-indigo-500/30 text-[10px] font-black uppercase text-indigo-300 border border-indigo-500/30">∑ Fórmulas</span>}
                                {ocrResult.has_tables && <span className="px-3 py-1 rounded-lg bg-emerald-500/30 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">⊞ Estructuras</span>}
                            </div>

                            <div className="text-slate-100 text-sm leading-[1.8] font-medium selection:bg-sky-500 selection:text-white">
                                {renderMixed(ocrResult.content_markdown)}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8 w-full max-w-2xl">
                            <button
                                onClick={novaFoto}
                                className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                            >
                                Nueva Captura
                            </button>
                            <button
                                onClick={() => onResult?.(ocrResult.content_markdown)}
                                className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all"
                            >
                                Insertar en la Nota Pro
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-4">
                    <span className="text-lg">⚠</span> {error}
                </div>
            )}
        </div>
    );
}
