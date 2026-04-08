import { useRef, useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';

interface CameraOCRProps {
    onResult: (markdown: string, hasFormulas: boolean, title: string | null) => void;
}

// Detecta si és mòbil o tauleta
const isMobileDevice = (): boolean => {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

// Detecta si el dispositiu té càmera accessible via MediaDevices
const hasCamera = async (): Promise<boolean> => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some((d) => d.kind === 'videoinput');
    } catch {
        return false;
    }
};

export default function CameraOCR({ onResult }: CameraOCRProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [showCamera, setShowCamera] = useState(false); // modal càmera PC
    const [cameraReady, setCameraReady] = useState(false);
    const [deviceHasCam, setDeviceHasCam] = useState(false);
    const isMobile = isMobileDevice();

    useEffect(() => {
        hasCamera().then(setDeviceHasCam);
    }, []);

    // ── Compressió d'imatge ─────────────────────────────────────────
    const compressBlob = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);
                const MAX = 2048;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
                    else { width = Math.round(width * MAX / height); height = MAX; }
                }
                canvas.width = width; canvas.height = height;
                ctx.filter = 'contrast(1.15) brightness(1.05)';
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.88;
                const compress = () => {
                    const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
                    const sizeMB = (b64.length * 0.75) / 1_000_000;
                    if (sizeMB > 1.5 && quality > 0.3) { quality -= 0.08; compress(); }
                    else resolve(b64);
                };
                compress();
            };
            img.onerror = () => reject(new Error('Error carregant imatge'));
            img.src = url;
        });

    const compressFile = (file: File): Promise<string> =>
        compressBlob(file);

    // ── Envia a l'API OCR ───────────────────────────────────────────
    const sendToOCR = async (base64: string) => {
        const token = localStorage.getItem('beta3m_token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/ai/ocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ image: base64, mime_type: 'image/jpeg' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al processar');
        return data;
    };

    // ── OPCIÓ A: Input file (funciona a tot arreu) ──────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setIsProcessing(true);
        try {
            setProgress('Comprimint imatge...');
            const base64 = await compressFile(file);
            setProgress('Analitzant amb IA... (10-20s)');
            const data = await sendToOCR(base64);
            onResult(data.content_markdown || '', data.has_formulas || false, data.title || null);
        } catch (err: any) {
            setError(err.message || 'Error desconegut');
        } finally {
            setIsProcessing(false);
            setProgress('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── OPCIÓ B: MediaDevices API (càmera real al PC) ───────────────
    const openCameraPC = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // càmera posterior si n'hi ha
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            streamRef.current = stream;
            setShowCamera(true);

            // Espera que el modal es renderitzi abans d'assignar el stream
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().then(() => setCameraReady(true));
                }
            }, 100);
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                setError('Permís de càmera denegat. Activa\'l a la configuració del navegador.');
            } else if (err.name === 'NotFoundError') {
                setError('No s\'ha trobat cap càmera. Usa l\'opció "Pujar fitxer".');
            } else {
                setError(err.message || 'Error accedint a la càmera');
            }
        }
    };

    const closeCameraPC = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setShowCamera(false);
        setCameraReady(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);

        // Tanca la càmera immediatament (millor UX)
        closeCameraPC();

        try {
            setProgress('Comprimint imatge...');
            const blob = await new Promise<Blob>((res) =>
                canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92)
            );
            const base64 = await compressBlob(blob);

            setProgress('Analitzant amb IA... (10-20s)');
            const data = await sendToOCR(base64);
            onResult(data.content_markdown || '', data.has_formulas || false, data.title || null);
        } catch (err: any) {
            setError(err.message || 'Error al processar la foto');
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    // ── RENDER ──────────────────────────────────────────────────────
    return (
        <div className="relative">

            {/* Input file ocult (per pujar fitxer o càmera en mòbil) */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture={isMobile ? 'environment' : undefined} // només a mòbil
                onChange={handleFileChange}
                className="hidden"
                id="ocr-file-input"
            />

            {isProcessing ? (
                // Estat de càrrega — substitueix els botons
                <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-purple-300">
                    <Spinner size="sm" />
                    <span className="text-xs">{progress}</span>
                </div>
            ) : isMobile ? (
                // ── MÒBIL/TAULETA: un sol botó que obre la càmera directament
                <label
                    htmlFor="ocr-file-input"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm
                     font-medium cursor-pointer select-none transition-all active:scale-95
                     border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Càmera
                </label>
            ) : (
                // ── PC/PORTÀTIL: dos botons separats
                <div className="flex items-center gap-2">

                    {/* Botó càmera via MediaDevices (si en té) */}
                    {deviceHasCam && (
                        <button
                            onClick={openCameraPC}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm
                         font-medium transition-all active:scale-95
                         border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20"
                            title="Obrir càmera"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            Càmera
                        </button>
                    )}

                    {/* Botó pujar fitxer (sempre disponible) */}
                    <label
                        htmlFor="ocr-file-input"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm
                       font-medium cursor-pointer select-none transition-all active:scale-95
                       border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20"
                        title="Pujar imatge des de l'ordinador"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Pujar imatge
                    </label>
                </div>
            )}

            {/* Toast error */}
            {error && (
                <div className="absolute bottom-14 left-0 z-50 flex items-center gap-2
                        bg-red-500/20 border border-red-500/30 rounded-xl
                        px-4 py-2.5 text-xs text-red-300 whitespace-nowrap shadow-xl">
                    ⚠ {error}
                    <button onClick={() => setError('')}
                        className="ml-1 font-bold text-red-400 hover:text-red-200">✕</button>
                </div>
            )}

            {/* Canvas ocult per capturar fotos (PC) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* ── Modal càmera PC ──────────────────────────────────────── */}
            {showCamera && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-black">

                    {/* Header modal càmera */}
                    <div className="flex items-center justify-between px-5 py-3
                          bg-[#141824] border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm text-white font-medium">Càmera activa</span>
                        </div>
                        <button onClick={closeCameraPC}
                            className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                            ✕
                        </button>
                    </div>

                    {/* Visor de vídeo */}
                    <div className="flex-1 relative flex items-center justify-center bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="max-w-full max-h-full object-contain"
                        />

                        {/* Guia visual per enquadrar */}
                        {cameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center
                              pointer-events-none">
                                <div className="w-3/4 h-3/4 border-2 border-white/20 rounded-2xl
                                flex items-center justify-center">
                                    <span className="text-white/30 text-sm">
                                        Enquadra el contingut aquí
                                    </span>
                                </div>
                            </div>
                        )}

                        {!cameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner size="lg" />
                            </div>
                        )}
                    </div>

                    {/* Footer amb botó de captura */}
                    <div className="flex items-center justify-center gap-4 py-6
                          bg-[#141824] border-t border-white/10">
                        {/* Botó captura circular (estil càmera) */}
                        <button
                            onClick={capturePhoto}
                            disabled={!cameraReady}
                            className="w-16 h-16 rounded-full bg-white hover:bg-gray-100
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all active:scale-90 shadow-lg
                         flex items-center justify-center"
                            title="Fer foto"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-gray-400" />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
