import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Transforms, Editor, Element as SlateElement } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'
import { clsx } from 'clsx'
import {
    Trash2, PenTool, Eraser, Sparkles, Wand2,
    RefreshCw, Scissors, MousePointer2, GripHorizontal
} from 'lucide-react'
import { useOCR } from '@/features/ai/hooks/useOCR'
import { motion, AnimatePresence } from 'framer-motion'

interface Point {
    x: number
    y: number
    pressure?: number
}

interface Stroke {
    points: Point[]
    tool: 'pen' | 'eraser'
}

export const DrawingCanvas = ({ attributes, children, element }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [tool, setTool] = useState<'pen' | 'eraser' | 'capture'>('pen')
    const [isBeautifying, setIsBeautifying] = useState(false)
    const [strokes, setStrokes] = useState<Stroke[]>([])
    const [currentStroke, setCurrentStroke] = useState<Point[]>([])

    // Selection for AI Solve
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null)

    const editor = useSlate()
    const selected = useSelected()
    const focused = useFocused()
    const { performOCR, isProcessing } = useOCR()

    const drawSpline = (ctx: CanvasRenderingContext2D, points: Point[]) => {
        if (points.length < 3) return

        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)

        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
        }

        // For the last 2 points
        ctx.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
        )
        ctx.stroke()
    }

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Redraw previous strokes
        strokes.forEach(s => {
            ctx.lineWidth = s.tool === 'eraser' ? 24 : 2.5
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.strokeStyle = s.tool === 'eraser' ? '#ffffff' : '#2563eb'
            ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
            drawSpline(ctx, s.points)
        })

        // Draw current stroke
        if (currentStroke.length > 0) {
            ctx.lineWidth = tool === 'eraser' ? 24 : 2.5
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#2563eb'
            ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
            drawSpline(ctx, currentStroke)
        }

        // Draw selection rect if in capture mode
        if (selectionRect && tool === 'capture') {
            ctx.globalCompositeOperation = 'source-over'
            ctx.setLineDash([5, 5])
            ctx.strokeStyle = '#8b5cf6'
            ctx.lineWidth = 1
            ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h)
            ctx.fillStyle = 'rgba(139, 92, 246, 0.05)'
            ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h)
            ctx.setLineDash([])
        }
    }, [strokes, currentStroke, tool, selectionRect])

    useEffect(() => {
        redrawAll()
    }, [redrawAll])

    const startDrawing = (e: React.PointerEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        if (tool === 'capture') {
            setSelectionRect({ x, y, w: 0, h: 0 })
        } else {
            setIsDrawing(true)
            setCurrentStroke([{ x, y }])
        }
    }

    const onPointerMove = (e: React.PointerEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        if (tool === 'capture' && selectionRect) {
            setSelectionRect(prev => prev ? { ...prev, w: x - prev.x, h: y - prev.y } : null)
        } else if (isDrawing) {
            setCurrentStroke(prev => [...prev, { x, y }])
        }
    }

    const stopDrawing = () => {
        if (isDrawing && currentStroke.length > 1) {
            setStrokes(prev => [...prev, { points: currentStroke, tool: tool as any }])
        }
        setIsDrawing(false)
        setCurrentStroke([])
        // Note: Selection rect stays until "AI Solve" is clicked or mode changed
    }

    const handleBeautify = async () => {
        setIsBeautifying(true)
        // Simulate real spline beautification
        await new Promise(resolve => setTimeout(resolve, 800))
        setIsBeautifying(false)
    }

    const handleAISolve = async () => {
        if (!selectionRect) return
        setIsBeautifying(true)
        // Simulate AI capturing area and solving equation
        await new Promise(resolve => setTimeout(resolve, 1500))

        const path = ReactEditor.findPath(editor, element)
        Transforms.insertNodes(
            editor,
            {
                type: 'paragraph',
                children: [{ text: '[AI Explain]: He analizado el área seleccionada. La ecuación representa una función logística donde la tasa de crecimiento disminuye a medida que se acerca al límite de saturación.' }]
            } as any,
            { at: [path[0] + 1] }
        )

        setSelectionRect(null)
        setIsBeautifying(false)
    }

    const clearCanvas = () => {
        setStrokes([])
        setSelectionRect(null)
    }

    return (
        <div {...attributes} className="my-12 relative group">
            <div contentEditable={false} className={isProcessing || isBeautifying ? "animate-pulse" : ""} style={{
                borderRadius: '32px', overflow: 'hidden', background: '#fff',
                border: `1px solid ${selected && focused ? '#2563eb' : 'rgba(0,0,0,0.06)'} `,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: selected && focused ? '0 40px 80px rgba(37,99,235,0.15)' : '0 10px 40px rgba(0,0,0,0.05)',
                position: 'relative'
            }}>
                {/* Floating Draggable Toolbar */}
                <motion.div
                    drag
                    dragMomentum={false}
                    className="glass-effect no-select"
                    style={{
                        position: 'absolute', top: '24px', left: '24px',
                        zIndex: 50, borderRadius: '24px', padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Handle */}
                    <div className="p-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-500 transition-colors">
                        <GripHorizontal size={18} />
                    </div>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-2xl">
                        <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={<PenTool size={18} />} label="Lápiz" />
                        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} label="Borrador" />
                        <ToolButton active={tool === 'capture'} onClick={() => setTool('capture')} icon={<Scissors size={18} />} label="Captura" color="#8b5cf6" />
                    </div>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    <div className="flex items-center gap-3">
                        <ActionButton
                            onClick={handleBeautify}
                            loading={isBeautifying}
                            icon={<Wand2 size={16} />}
                            label="Suavizar"
                            color="#2563eb"
                        />

                        {tool === 'capture' && selectionRect && (
                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={handleAISolve}
                                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
                            >
                                <Sparkles size={16} />
                                Resolver con IA
                            </motion.button>
                        )}

                        <div className="w-[1px] h-6 bg-white/10 mx-1" />

                        <button onClick={clearCanvas} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </motion.div>

                <canvas
                    ref={canvasRef}
                    width={1600}
                    height={800}
                    className="paper-grid"
                    style={{
                        width: '100%', aspectRatio: '2/1',
                        cursor: tool === 'capture' ? 'crosshair' : 'url("https://www.google.com/intl/en_ALL/mapfiles/openhand.cur"), auto',
                        touchAction: 'none',
                        background: '#ffffff',
                    }}
                    onPointerDown={startDrawing}
                    onPointerMove={onPointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
            </div>
            {children}
        </div>
    )
}

const ToolButton = ({ active, onClick, icon, label, color }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            active
                ? `bg-white shadow-sm text-[${color || '#2563eb'}]`
                : "text-slate-500 hover:text-slate-800"
        )}
        style={active ? { color: color || '#2563eb' } : {}}
    >
        {icon}
        <span className="hidden md:inline">{label}</span>
    </button>
)

const ActionButton = ({ onClick, loading, icon, label, color }: any) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700"
    >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : icon}
        {label}
    </button>
)

