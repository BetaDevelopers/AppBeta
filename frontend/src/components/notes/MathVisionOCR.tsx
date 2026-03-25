import React, { useRef, useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';
import { useMathOCR, MathRegion } from '@/features/ai/hooks/useMathOCR';

interface MathVisionOCRProps {
    onInsertRegions: (regions: MathRegion[]) => void;
    onClose: () => void;
}

export default function MathVisionOCR({ onInsertRegions, onClose }: MathVisionOCRProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [step, setStep] = useState<'capture' | 'analyze' | 'select'>('capture');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [regions, setRegions] = useState<MathRegion[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [error, setError] = useState('');
    const [showCamera, setShowCamera] = useState(false);

    const { segmentImage, isProcessing } = useMathOCR();

    // ── Gestió de l'entrada d'imatge ───────────────────────────────
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
            setError('No es pot accedir a la càmera');
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

        // Aturar càmera
        streamRef.current?.getTracks().forEach(t => t.stop());
        setShowCamera(false);

        processImage(b64);
    };

    const processImage = async (b64: string) => {
        setStep('analyze');
        setError('');
        try {
            const result = await segmentImage(b64);
            if (result && result.length > 0) {
                setRegions(result);
                setSelectedIndices(new Set(result.map((_, i) => i)));
                setStep('select');
            } else {
                setError('No s\'ha detectat cap regió matemàtica o de text.');
                setStep('capture');
            }
        } catch (err) {
            setError('Error en l\'anàlisi de la imatge.');
            setStep('capture');
        }
    };

    const toggleRegion = (idx: number) => {
        const next = new Set(selectedIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedIndices(next);
    };

    const handleConfirm = () => {
        const selected = regions.filter((_, i) => selectedIndices.has(i));
        onInsertRegions(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold leading-none">MathVision OCR</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Detecció multi-regió</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 relative min-h-[400px]">

                    {step === 'capture' && !showCamera && (
                        <div className="h-full flex flex-col items-center justify-center gap-6 py-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                                <button
                                    onClick={openCamera}
                                    className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </div>
                                    <span className="text-white font-bold">Usar Càmera</span>
                                </button>
                                <label className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                    <span className="text-white font-bold">Pujar Fitxer</span>
                                </label>
                            </div>
                            {error && <p className="text-red-400 text-sm font-medium animate-bounce">⚠ {error}</p>}
                        </div>
                    )}

                    {showCamera && (
                        <div className="h-full flex flex-col gap-4 relative">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-black aspect-video object-cover" />
                            <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-2xl pointer-events-none m-4 flex items-center justify-center">
                                <div className="w-3/4 h-3/4 border border-dashed border-white/20 rounded-xl" />
                            </div>
                            <div className="flex justify-center gap-4 mt-4">
                                <button onClick={() => { setShowCamera(false); streamRef.current?.getTracks().forEach(t => t.stop()); }} className="px-6 py-2 rounded-xl text-white bg-white/10 hover:bg-white/20 transition-colors">Cancel·lar</button>
                                <button onClick={capturePhoto} className="px-8 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 font-bold transition-transform active:scale-95 shadow-lg">Fer Foto</button>
                            </div>
                        </div>
                    )}

                    {step === 'analyze' && (
                        <div className="h-full flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                                            <path d="M12 8l0 4l2 2" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl text-white font-bold">Analitzant Layout Matemàtic</h3>
                                <p className="text-slate-400 text-sm mt-1">La IA està segmentant text i equacions...</p>
                            </div>
                        </div>
                    )}

                    {step === 'select' && capturedImage && (
                        <div className="flex flex-col md:flex-row gap-6 h-full">
                            {/* Image Preview with Overlay */}
                            <div className="flex-1 relative bg-black/20 rounded-2xl overflow-hidden border border-white/5">
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                                <div className="absolute inset-0">
                                    {regions.map((region, i) => (
                                        <div
                                            key={i}
                                            onClick={() => toggleRegion(i)}
                                            className={`absolute cursor-pointer border-2 transition-all ${selectedIndices.has(i)
                                                    ? region.type === 'equation' ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-purple-600/20 border-purple-500'
                                                    : 'bg-transparent border-white/20 hover:border-white/50'
                                                }`}
                                            style={{
                                                left: `${region.bbox.x / 10}%`,
                                                top: `${region.bbox.y / 10}%`,
                                                width: `${region.bbox.w / 10}%`,
                                                height: `${region.bbox.h / 10}%`,
                                            }}
                                            title={region.type === 'equation' ? region.latex : region.content}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Selection List */}
                            <div className="w-full md:w-80 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Regions detectades</span>
                                    <span className="text-xs font-bold text-indigo-400">{selectedIndices.size} seleccionades</span>
                                </div>
                                <div className="flex-1 overflow-auto flex flex-col gap-2 pr-2 custom-scrollbar">
                                    {regions.map((region, i) => (
                                        <div
                                            key={i}
                                            onClick={() => toggleRegion(i)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedIndices.has(i)
                                                    ? 'bg-white/10 border-indigo-500/50'
                                                    : 'bg-white/20 border-transparent opacity-50 grayscale hover:grayscale-0'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${region.type === 'equation' ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'
                                                    }`}>
                                                    {region.type === 'equation' ? '∑ Equació' : 'Text'}
                                                </span>
                                                {selectedIndices.has(i) && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                            </div>
                                            <p className="text-[11px] text-slate-300 line-clamp-2 font-mono italic">
                                                {region.type === 'equation' ? region.latex : region.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleConfirm}
                                    disabled={selectedIndices.size === 0}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
                                >
                                    INSERIR {selectedIndices.size} REGIONS
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden internal canvas */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
        </div>
    );
}
