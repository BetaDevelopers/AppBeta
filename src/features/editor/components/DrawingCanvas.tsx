import React, { useRef, useState, useCallback } from 'react'
import { Transforms, Editor, Element as SlateElement } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'
import { Trash2, PenTool, Eraser, Sparkles, Wand2 } from 'lucide-react'
import { detectShape, Point } from '@/lib/ai/shape-detection'
import { useOCR } from '@/features/ai/hooks/useOCR'

export const DrawingCanvas = ({ attributes, children, element }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [points, setPoints] = useState<Point[]>([])
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
    const editor = useSlate()
    const selected = useSelected()
    const focused = useFocused()
    const { performOCR, isProcessing } = useOCR()

    const draw = useCallback((e: React.PointerEvent) => {
        if (!isDrawing || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        setPoints(prev => [...prev, { x, y }])

        ctx.lineWidth = tool === 'eraser' ? 20 : 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : '#c084fc'

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'
        } else {
            ctx.globalCompositeOperation = 'source-over'
        }

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }, [isDrawing, tool])

    const startDrawing = (e: React.PointerEvent) => {
        setIsDrawing(true)
        setPoints([])
        draw(e)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const shape = detectShape(points)

        if (shape && tool === 'pen') {
            handleShapeDetection(shape)
        }

        const canvas = canvasRef.current
        if (canvas) {
            canvas.getContext('2d')?.beginPath()
        }
    }

    const handleShapeDetection = (shape: any) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 3
        const { x, y, width, height } = shape.bounds
        if (shape.type === 'circle') {
            ctx.beginPath()
            ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
            ctx.stroke()
        } else if (shape.type === 'rectangle') {
            ctx.strokeRect(x, y, width, height)
        }
    }

    const handleEnhance = async () => {
        if (!canvasRef.current) return
        const text = await performOCR(canvasRef.current)
        if (text && text.trim()) {
            const path = ReactEditor.findPath(editor, element)
            Transforms.insertNodes(
                editor,
                { type: 'paragraph', children: [{ text: `[Texto reconocido]: ${text}` }] } as any,
                { at: Path.next(path) }
            )
        }
    }

    return (
        <div {...attributes} className="my-8 relative group">
            <div contentEditable={false} className={clsx(
                "rounded-2xl overflow-hidden bg-slate-950 border-2 transition-all",
                selected && focused ? "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)]" : "border-slate-800"
            )}>
                <div className="bg-slate-900/80 backdrop-blur-sm border-b border-white/5 p-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setTool('pen')}
                            className={clsx("p-2 rounded-lg transition-all", tool === 'pen' ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-500 hover:bg-white/5")}
                        >
                            <PenTool size={16} />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={clsx("p-2 rounded-lg transition-all", tool === 'eraser' ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-500 hover:bg-white/5")}
                        >
                            <Eraser size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleEnhance}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-violet-500/20 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        <span>{isProcessing ? 'Procesando...' : 'Mejorar Escritura'}</span>
                    </button>

                    <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={600}
                    className="w-full aspect-[2/1] cursor-crosshair touch-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
            </div>
            {children}
        </div>
    )
}

function clsx(...args: any[]) {
    return args.filter(Boolean).join(' ')
}

const Path = {
    next: (path: number[]) => {
        const newPath = [...path]
        newPath[newPath.length - 1]++
        return newPath
    }
}
