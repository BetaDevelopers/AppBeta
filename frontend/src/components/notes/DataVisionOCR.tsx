import React, { useRef, useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';
import { useMathOCR } from '@/features/ai/hooks/useMathOCR';

interface DataVisionOCRProps {
    onResult: (markdown: string) => void;
    onClose: () => void;
}

export default function DataVisionOCR({ onResult, onClose }: DataVisionOCRProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [step, setStep] = useState<'capture' | 'analyze' | 'result'>('capture');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [error, setError] = useState('');
    const [showCamera, setShowCamera] = useState(false);

    const { chartToTable, isProcessing } = useMathOCR();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const b64 = ev.target?.result as string;
            setCapturedImage(b64);
            processImage(b64);
        };
        reader.readAsDataURL(file);
    };

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 },
            });
            streamRef.current = stream;
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch (err) {
            setError('Càmera no disponible');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const b64 = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(b64);
        streamRef.current?.getTracks().forEach(t => t.stop());
        setShowCamera(false);
        processImage(b64);
    };

    const processImage = async (b64: string) => {
        setStep('analyze');
        setError('');
        try {
            const result = await chartToTable(b64);
            if (result && result.confidence > 0.1) {
                setExtractedData(result);
                setStep('result');
            } else {
                setError('No s\'ha pogut extreure informació clara d\'aquest gràfic.');
                setStep('capture');
            }
        } catch (err) {
            setError('Error en el processament.');
            setStep('capture');
        }
    };

    const handleConfirm = () => {
        if (extractedData) {
            onResult(extractedData.tableMarkdown);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📊</span>
                        <div>
                            <h2 className="text-white font-bold leading-none">DataVision OCR</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Extracció de dades visuals</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-8 min-h-[350px] flex flex-col justify-center">
                    {step === 'capture' && !showCamera && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={openCamera} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                </div>
                                <span className="text-white font-bold text-sm">Càmera</span>
                            </button>
                            <label className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex flex-col items-center gap-3 cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                </div>
                                <span className="text-white font-bold text-sm">Pujar Fitxer</span>
                            </label>
                            {error && <p className="col-span-full text-red-400 text-xs text-center mt-4">⚠ {error}</p>}
                        </div>
                    )}

                    {showCamera && (
                        <div className="flex flex-col gap-4">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-black aspect-video object-cover" />
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setShowCamera(false)} className="px-6 py-2 rounded-xl text-white bg-white/5">Enrere</button>
                                <button onClick={capturePhoto} className="px-6 py-2 rounded-xl text-white bg-blue-600 font-bold">Capturar</button>
                            </div>
                        </div>
                    )}

                    {step === 'analyze' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-white font-bold">Analitzant eixos i sèries...</p>
                        </div>
                    )}

                    {step === 'result' && extractedData && (
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-full">
                                    {extractedData.chartType} DETECTAT
                                </span>
                                <span className="text-xs text-slate-500">Confiança: {(extractedData.confidence * 100).toFixed(0)}%</span>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-4 overflow-x-auto max-h-[200px]">
                                <pre className="text-[10px] font-mono text-blue-300">{extractedData.tableMarkdown}</pre>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep('capture')} className="flex-1 py-3 rounded-2xl bg-white/5 text-white font-bold">Reintentar</button>
                                <button onClick={handleConfirm} className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20">INSERIR TAULA</button>
                            </div>
                        </div>
                    )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
