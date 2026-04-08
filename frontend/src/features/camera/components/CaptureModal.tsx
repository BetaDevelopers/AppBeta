import React, { useRef, useState, useEffect } from 'react'
import { Camera, RefreshCw, X, ShieldAlert, Check, Loader2 } from 'lucide-react'
import { useOCR } from '@/hooks/useOCR'
import { useFilesystemStore } from '@/features/filesystem/store/useFilesystemStore'
import { motion } from 'framer-motion'

export const CaptureModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const { recognizeText, loading, progress } = useOCR()
    const { activeNoteId, notes, updateNote } = useFilesystemStore()

    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)

    const activeNote = notes.find(n => n.id === activeNoteId)

    // Cleanup on unmount (evita que el stream segueixi actiu si el component es desmunta)
    useEffect(() => () => stopCamera(), [])

    useEffect(() => {
        if (isOpen) {
            startCamera()
        } else {
            stopCamera()
        }
    }, [isOpen])

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            setStream(s)
            if (videoRef.current) videoRef.current.srcObject = s
        } catch (err) {
            setError('No se pudo acceder a la cámara. Verifica los permisos.')
        }
    }

    const stopCamera = () => {
        stream?.getTracks().forEach(track => track.stop())
        setStream(null)
    }

    const capture = () => {
        if (!videoRef.current) return
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
        setCapturedImage(canvas.toDataURL('image/jpeg'))
    }

    const handleUsePhoto = async () => {
        if (!capturedImage || !activeNote) return

        const text = await recognizeText(capturedImage)
        if (text) {
            const newParagraph = {
                type: 'paragraph',
                children: [{ text: `[Escaneado: ${new Date().toLocaleTimeString()}]\n${text}` }]
            }
            const updatedContent = [...(activeNote.content as any[]), newParagraph]
            await updateNote(activeNote.id, { content: updatedContent })
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-950/80">
            <div className="bg-slate-900 w-full max-w-4xl rounded-3xl border border-white/10 shadow-3xl overflow-hidden flex flex-col h-[80vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-lg tracking-tight uppercase">Captura de Pizarra</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Módulo de Escaneo Beta</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                            <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
                            <p className="text-white font-black text-xl tracking-tighter uppercase italic">Analizando Texto...</p>
                            <div className="w-1/2 h-1 bg-white/10 rounded-full mt-4 overflow-hidden relative">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-emerald-500"
                                    style={{ width: `${progress * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {!capturedImage ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            {error ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                                    <p className="text-slate-300 font-bold mb-4">{error}</p>
                                    <button onClick={startCamera} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all">Reintentar</button>
                                </div>
                            ) : (
                                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                                    <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-xl m-8" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan" />
                                </div>
                            )}
                        </>
                    ) : (
                        <img src={capturedImage} className="max-w-full max-h-full object-contain" />
                    )}
                </div>

                <div className="p-8 bg-slate-900 border-t border-white/5 flex items-center justify-center gap-4">
                    {!capturedImage ? (
                        <button
                            onClick={capture}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl scale-100 hover:scale-110 active:scale-95 transition-all"
                        >
                            <div className="w-14 h-14 border-2 border-slate-900 rounded-full flex items-center justify-center">
                                <div className="w-10 h-10 bg-slate-900 rounded-full" />
                            </div>
                        </button>
                    ) : (
                        <div className="flex gap-4 w-full max-w-sm">
                            <button
                                onClick={() => setCapturedImage(null)}
                                disabled={loading}
                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={18} />
                                <span>Reintentar</span>
                            </button>
                            <button
                                onClick={handleUsePhoto}
                                disabled={loading || !activeNote}
                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Check size={18} />
                                <span>{activeNote ? 'Usar Foto' : 'Elige una nota'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
