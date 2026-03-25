import React, { useRef, useState, useCallback, useEffect, useReducer } from 'react'
import { Transforms } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'
import { clsx } from 'clsx'
import {
    Trash2, Pen, Eraser, Sparkles, Highlighter,
    RefreshCw, GripHorizontal, CheckCircle, AlertCircle,
    Undo2, Redo2, MousePointer2,
} from 'lucide-react'
import { useMathOCR } from '@/features/ai/hooks/useMathOCR'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Point {
    x: number
    y: number
    width?: number          // pressure-derived width per point (pen only)
}

interface Stroke {
    points: Point[]
    tool: 'pen' | 'marker' | 'eraser'
    color: string
    baseWidth: number
    opacity: number
}

type DrawTool = 'pen' | 'marker' | 'eraser' | 'selection'

interface Toast {
    type: 'success' | 'error' | 'info'
    message: string
}

// ── Canvas state (undo/redo via reducer) ──────────────────────────────────────

interface CanvasState {
    strokes: Stroke[]
    undoStack: Stroke[][]
    redoStack: Stroke[][]
}

type CanvasAction =
    | { type: 'ADD_STROKE'; stroke: Stroke }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'CLEAR' }

const MAX_HISTORY = 20

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
    switch (action.type) {
        case 'ADD_STROKE':
            return {
                strokes: [...state.strokes, action.stroke],
                undoStack: [...state.undoStack, state.strokes].slice(-MAX_HISTORY),
                redoStack: [],
            }
        case 'UNDO': {
            if (state.undoStack.length === 0) return state
            const prev = state.undoStack[state.undoStack.length - 1]
            return {
                strokes: prev,
                undoStack: state.undoStack.slice(0, -1),
                redoStack: [...state.redoStack, state.strokes].slice(-MAX_HISTORY),
            }
        }
        case 'REDO': {
            if (state.redoStack.length === 0) return state
            const next = state.redoStack[state.redoStack.length - 1]
            return {
                strokes: next,
                undoStack: [...state.undoStack, state.strokes].slice(-MAX_HISTORY),
                redoStack: state.redoStack.slice(0, -1),
            }
        }
        case 'CLEAR':
            if (state.strokes.length === 0) return state
            return {
                strokes: [],
                undoStack: [...state.undoStack, state.strokes].slice(-MAX_HISTORY),
                redoStack: [],
            }
        default:
            return state
    }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
    { value: '#1e293b', label: 'Negre' },
    { value: '#2563eb', label: 'Blau' },
    { value: '#ef4444', label: 'Vermell' },
    { value: '#22c55e', label: 'Verd' },
    { value: '#f97316', label: 'Taronja' },
    { value: '#8b5cf6', label: 'Lila' },
    { value: '#ffffff', label: 'Blanc' },
]

// Pixels/ms at which velocity-simulated pressure reaches its minimum
const MAX_SPEED_PX_MS = 2.5

// ── drawStroke helper ─────────────────────────────────────────────────────────

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const { points, tool, color, baseWidth, opacity } = stroke
    if (points.length < 2) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.globalAlpha = 1
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = baseWidth
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
        ctx.stroke()

    } else if (tool === 'marker') {
        // Marker: thick, semi-transparent, smooth spline
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = opacity * 0.45
        ctx.strokeStyle = color
        ctx.lineWidth = baseWidth
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
        ctx.stroke()

    } else {
        // Pen: variable width per segment derived from pressure/velocity
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = opacity
        ctx.strokeStyle = color
        for (let i = 1; i < points.length; i++) {
            const w = ((points[i - 1].width ?? baseWidth) + (points[i].width ?? baseWidth)) / 2
            ctx.lineWidth = Math.max(0.5, w)
            ctx.beginPath()
            ctx.moveTo(points[i - 1].x, points[i - 1].y)
            ctx.lineTo(points[i].x, points[i].y)
            ctx.stroke()
        }
    }

    ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DrawingCanvas = ({ attributes, children, element }: any) => {
    const canvasRef    = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [canvasState, dispatch] = useReducer(canvasReducer, {
        strokes: [], undoStack: [], redoStack: [],
    })

    const [isDrawing,     setIsDrawing]     = useState(false)
    const [tool,          setTool]          = useState<DrawTool>('pen')
    const [color,         setColor]         = useState('#1e293b')
    const [strokeWidth,   setStrokeWidth]   = useState(3)
    const [opacity,       setOpacity]       = useState(1)
    const [currentStroke, setCurrentStroke] = useState<Point[]>([])
    const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
    const [toast,         setToast]         = useState<Toast | null>(null)

    const selectionStart  = useRef<{ x: number; y: number } | null>(null)
    const lastPointerData = useRef({ x: 0, y: 0, time: 0 })
    const smoothPressure  = useRef(1)

    const editor   = useSlate()
    const selected = useSelected()
    const focused  = useFocused()
    const { recognize, isProcessing } = useMathOCR()

    const { strokes, undoStack, redoStack } = canvasState

    // ── Toast ──────────────────────────────────────────────────────────────
    const showToast = (type: Toast['type'], message: string, ms = 3500) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), ms)
    }

    // ── Redraw all strokes ─────────────────────────────────────────────────
    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        strokes.forEach(s => drawStroke(ctx, s))

        // In-progress stroke
        if (currentStroke.length > 1 && tool !== 'selection') {
            drawStroke(ctx, {
                points:    currentStroke,
                tool:      tool as 'pen' | 'marker' | 'eraser',
                color,
                baseWidth: tool === 'marker' ? strokeWidth * 3.5 : tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
                opacity,
            })
        }

        // Selection rectangle
        if (selectionRect && tool === 'selection') {
            ctx.save()
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1
            ctx.setLineDash([5, 5])
            ctx.strokeStyle = '#8b5cf6'
            ctx.lineWidth = 1.5
            ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h)
            ctx.fillStyle = 'rgba(139, 92, 246, 0.06)'
            ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h)
            ctx.setLineDash([])
            ctx.restore()
        }
    }, [strokes, currentStroke, tool, color, strokeWidth, opacity, selectionRect])

    useEffect(() => { redrawAll() }, [redrawAll])

    // ── Keyboard shortcuts ─────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault()
                dispatch({ type: 'UNDO' })
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault()
                dispatch({ type: 'REDO' })
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    // ── Pointer helpers ────────────────────────────────────────────────────
    const getCanvasPoint = (e: React.PointerEvent): { x: number; y: number } => {
        const canvas = canvasRef.current!
        const rect   = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left) * (canvas.width  / rect.width),
            y: (e.clientY - rect.top)  * (canvas.height / rect.height),
        }
    }

    /**
     * Returns a per-point width derived from:
     *  - PointerEvent.pressure  if pointerType === 'pen'
     *  - Velocity simulation    otherwise (slow = thick, fast = thin)
     */
    const getPressureWidth = (e: React.PointerEvent, pos: { x: number; y: number }): number => {
        const maxW = tool === 'marker' ? strokeWidth * 3.5
                   : tool === 'eraser' ? strokeWidth * 4
                   : strokeWidth
        const minW = maxW * 0.25
        const now  = performance.now()
        const prev = lastPointerData.current
        let rawP: number

        if (e.pointerType === 'pen' && e.pressure > 0) {
            rawP = e.pressure
        } else {
            const dt = now - prev.time
            if (dt > 0 && dt < 80) {
                const dist  = Math.hypot(pos.x - prev.x, pos.y - prev.y)
                rawP = 1 - Math.min(dist / dt / MAX_SPEED_PX_MS, 1)
            } else {
                rawP = smoothPressure.current
            }
        }

        // Exponential moving average for smooth transitions
        smoothPressure.current = 0.6 * smoothPressure.current + 0.4 * rawP
        lastPointerData.current = { x: pos.x, y: pos.y, time: now }

        return minW + smoothPressure.current * (maxW - minW)
    }

    // ── Drawing events ─────────────────────────────────────────────────────
    const startDrawing = (e: React.PointerEvent) => {
        const pos = getCanvasPoint(e)
        if (tool === 'selection') {
            selectionStart.current = pos
            setSelectionRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
        } else {
            smoothPressure.current = 1
            lastPointerData.current = { x: pos.x, y: pos.y, time: performance.now() }
            const w = getPressureWidth(e, pos)
            setIsDrawing(true)
            setCurrentStroke([{ x: pos.x, y: pos.y, width: w }])
            canvasRef.current?.setPointerCapture(e.pointerId)
        }
    }

    const onPointerMove = (e: React.PointerEvent) => {
        const pos = getCanvasPoint(e)
        if (tool === 'selection' && selectionStart.current) {
            const sx = selectionStart.current.x
            const sy = selectionStart.current.y
            setSelectionRect({
                x: Math.min(sx, pos.x),
                y: Math.min(sy, pos.y),
                w: Math.abs(pos.x - sx),
                h: Math.abs(pos.y - sy),
            })
        } else if (isDrawing) {
            const w = getPressureWidth(e, pos)
            setCurrentStroke(prev => [...prev, { x: pos.x, y: pos.y, width: w }])
        }
    }

    const stopDrawing = () => {
        if (tool !== 'selection' && isDrawing && currentStroke.length > 1) {
            dispatch({
                type: 'ADD_STROKE',
                stroke: {
                    points:    currentStroke,
                    tool:      tool as 'pen' | 'marker' | 'eraser',
                    color,
                    baseWidth: tool === 'marker' ? strokeWidth * 3.5 : tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
                    opacity,
                },
            })
        }
        setIsDrawing(false)
        setCurrentStroke([])
    }

    // ── Math recognition ───────────────────────────────────────────────────
    const handleMathSolve = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        let penStrokes = strokes.filter(s => s.tool === 'pen')

        if (selectionRect && Math.abs(selectionRect.w) > 5 && Math.abs(selectionRect.h) > 5) {
            const r    = selectionRect
            const minX = Math.min(r.x, r.x + r.w)
            const maxX = Math.max(r.x, r.x + r.w)
            const minY = Math.min(r.y, r.y + r.h)
            const maxY = Math.max(r.y, r.y + r.h)
            const inside = penStrokes.filter(s =>
                s.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
            )
            if (inside.length > 0) penStrokes = inside
        }

        if (penStrokes.length === 0) {
            showToast('error', 'No hi ha traços de llapis per analitzar.')
            return
        }

        const tmp    = document.createElement('canvas')
        tmp.width    = canvas.width
        tmp.height   = canvas.height
        const tmpCtx = tmp.getContext('2d')!
        tmpCtx.fillStyle = '#ffffff'
        tmpCtx.fillRect(0, 0, tmp.width, tmp.height)
        tmpCtx.drawImage(canvas, 0, 0)

        const pngBase64    = tmp.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
        const strokePoints = penStrokes.map(s => s.points.map(p => ({ x: p.x, y: p.y })))

        const result = await recognize(strokePoints, pngBase64)
        if (!result) {
            showToast('error', 'Error al connectar amb la IA. Torna-ho a intentar.')
            return
        }
        if (!result.isEquation) {
            showToast('info', `No s'ha detectat cap equació (${Math.round(result.confidence * 100)}% confiança).`)
            return
        }

        const path = ReactEditor.findPath(editor, element)
        Transforms.insertNodes(
            editor,
            { type: 'math-block', latex: result.latex, children: [{ text: '' }] } as any,
            { at: [path[0] + 1] }
        )

        showToast(
            'success',
            `${result.latex.substring(0, 45)}${result.latex.length > 45 ? '…' : ''} · ${Math.round(result.confidence * 100)}%`
        )
        setSelectionRect(null)
        selectionStart.current = null
    }

    const hasPenStrokes = strokes.some(s => s.tool === 'pen')

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div {...attributes} className="my-12 relative group">
            <div
                ref={containerRef}
                contentEditable={false}
                style={{
                    borderRadius: 32,
                    overflow: 'hidden',
                    background: '#fff',
                    border: `1px solid ${selected && focused ? '#2563eb' : 'rgba(0,0,0,0.06)'}`,
                    transition: 'border-color 0.3s, box-shadow 0.5s',
                    boxShadow: selected && focused
                        ? '0 40px 80px rgba(37,99,235,0.15)'
                        : '0 10px 40px rgba(0,0,0,0.05)',
                    position: 'relative',
                }}
            >
                {/* ── Floating Vertical Toolbar ───────────────────────────── */}
                <motion.div
                    drag
                    dragMomentum={false}
                    dragConstraints={containerRef}
                    className="no-select"
                    style={{
                        position:       'absolute',
                        top:            20,
                        left:           20,
                        zIndex:         50,
                        borderRadius:   20,
                        padding:        '10px 8px',
                        display:        'flex',
                        flexDirection:  'column',
                        alignItems:     'center',
                        gap:            3,
                        width:          52,
                        background:     'rgba(255,255,255,0.94)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        border:         '1px solid rgba(0,0,0,0.08)',
                        boxShadow:      '0 8px 32px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(255,255,255,0.8)',
                        userSelect:     'none',
                    }}
                >
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                        <GripHorizontal size={14} />
                    </div>

                    <TBDivider />

                    {/* Tools */}
                    <ToolBtn active={tool === 'pen'}       onClick={() => setTool('pen')}       title="Llapis – pressió variable">
                        <Pen size={15} />
                    </ToolBtn>
                    <ToolBtn active={tool === 'marker'}    onClick={() => setTool('marker')}    title="Rotulador – semitransparent" activeColor="#f59e0b">
                        <Highlighter size={15} />
                    </ToolBtn>
                    <ToolBtn active={tool === 'eraser'}    onClick={() => setTool('eraser')}    title="Goma d'esborrar" activeColor="#ef4444">
                        <Eraser size={15} />
                    </ToolBtn>
                    <ToolBtn active={tool === 'selection'} onClick={() => setTool('selection')} title="Selecció per a IA" activeColor="#8b5cf6">
                        <MousePointer2 size={15} />
                    </ToolBtn>

                    <TBDivider />

                    {/* Color palette */}
                    {COLORS.map(c => (
                        <ColorSwatch
                            key={c.value}
                            color={c.value}
                            active={color === c.value}
                            onClick={() => setColor(c.value)}
                            title={c.label}
                        />
                    ))}

                    <TBDivider />

                    {/* Stroke width slider */}
                    <VerticalSlider
                        value={strokeWidth}
                        min={1}
                        max={20}
                        onChange={setStrokeWidth}
                        accentColor={color}
                        label={`Gruix: ${strokeWidth}px`}
                    />

                    {/* Opacity slider */}
                    <VerticalSlider
                        value={Math.round(opacity * 100)}
                        min={20}
                        max={100}
                        onChange={v => setOpacity(v / 100)}
                        accentColor="#64748b"
                        label={`Opacitat: ${Math.round(opacity * 100)}%`}
                    />

                    <TBDivider />

                    {/* Undo / Redo */}
                    <IconBtn onClick={() => dispatch({ type: 'UNDO' })} disabled={undoStack.length === 0} title="Desfer (Ctrl+Z)">
                        <Undo2 size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => dispatch({ type: 'REDO' })} disabled={redoStack.length === 0} title="Refer (Ctrl+Y / Ctrl+Shift+Z)">
                        <Redo2 size={14} />
                    </IconBtn>

                    <TBDivider />

                    {/* Clear */}
                    <IconBtn onClick={() => dispatch({ type: 'CLEAR' })} title="Esborrar tot" danger>
                        <Trash2 size={14} />
                    </IconBtn>
                </motion.div>

                {/* ── Toast notification ──────────────────────────────────── */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={{
                                position:       'absolute',
                                top:            16,
                                left:           '50%',
                                transform:      'translateX(-50%)',
                                zIndex:         60,
                                display:        'flex',
                                alignItems:     'center',
                                gap:            8,
                                padding:        '10px 18px',
                                borderRadius:   16,
                                fontSize:       12,
                                fontWeight:     600,
                                whiteSpace:     'nowrap',
                                backdropFilter: 'blur(12px)',
                                boxShadow:      '0 4px 20px rgba(0,0,0,0.12)',
                                background: toast.type === 'success' ? 'rgba(16,185,129,0.12)'
                                          : toast.type === 'error'   ? 'rgba(239,68,68,0.12)'
                                          :                            'rgba(59,130,246,0.12)',
                                border: `1px solid ${
                                    toast.type === 'success' ? 'rgba(16,185,129,0.3)'
                                  : toast.type === 'error'   ? 'rgba(239,68,68,0.3)'
                                  :                            'rgba(59,130,246,0.3)'
                                }`,
                                color: toast.type === 'success' ? '#10b981'
                                     : toast.type === 'error'   ? '#ef4444'
                                     :                            '#3b82f6',
                            }}
                        >
                            {toast.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                            {toast.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Recognize button (bottom-right) ─────────────────────── */}
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleMathSolve}
                    disabled={isProcessing || !hasPenStrokes}
                    style={{ position: 'absolute', bottom: 18, right: 18, zIndex: 50 }}
                    className={clsx(
                        'px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest',
                        'flex items-center gap-2 shadow-lg transition-all select-none',
                        isProcessing
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : !hasPenStrokes
                                ? 'bg-violet-100 text-violet-300 cursor-not-allowed'
                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20 cursor-pointer'
                    )}
                    title="Reconeix la matemàtica i insereix com a bloc LaTeX"
                >
                    {isProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {isProcessing ? 'Analitzant…' : 'Reconèixer ↗'}
                </motion.button>

                {/* ── Canvas ─────────────────────────────────────────────── */}
                <canvas
                    ref={canvasRef}
                    width={1600}
                    height={800}
                    className="paper-grid"
                    style={{
                        width:       '100%',
                        aspectRatio: '2/1',
                        touchAction: 'none',
                        background:  '#ffffff',
                        display:     'block',
                        cursor:      tool === 'eraser' ? 'cell' : 'crosshair',
                    }}
                    onPointerDown={startDrawing}
                    onPointerMove={onPointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />

                {/* Empty-state hint */}
                <AnimatePresence>
                    {strokes.length === 0 && !isDrawing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position:       'absolute',
                                inset:          0,
                                display:        'flex',
                                flexDirection:  'column',
                                alignItems:     'center',
                                justifyContent: 'center',
                                pointerEvents:  'none',
                                gap:            8,
                            }}
                        >
                            <div style={{ fontSize: 44, opacity: 0.05 }}>∫</div>
                            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.18)', fontWeight: 600 }}>
                                Dibuixa una equació · fes clic a <strong>Reconèixer ↗</strong> per convertir a LaTeX
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {children}
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TBDivider = () => (
    <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />
)

const ToolBtn = ({
    active, onClick, title, children, activeColor = '#2563eb',
}: {
    active: boolean; onClick: () => void; title: string
    children: React.ReactNode; activeColor?: string
}) => (
    <button
        onClick={onClick}
        title={title}
        className={clsx(
            'w-9 h-9 flex items-center justify-center rounded-xl transition-all',
            active ? 'shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
        )}
        style={active ? { color: activeColor, background: `${activeColor}18` } : {}}
    >
        {children}
    </button>
)

const IconBtn = ({
    onClick, disabled, title, children, danger = false,
}: {
    onClick: () => void; disabled?: boolean; title: string
    children: React.ReactNode; danger?: boolean
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={clsx(
            'w-9 h-9 flex items-center justify-center rounded-xl transition-all',
            danger
                ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-25'
                : 'text-slate-500 hover:text-slate-800 hover:bg-black/5 disabled:opacity-25'
        )}
    >
        {children}
    </button>
)

const ColorSwatch = ({
    color, active, onClick, title,
}: {
    color: string; active: boolean; onClick: () => void; title: string
}) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            width:        active ? 22 : 16,
            height:       active ? 22 : 16,
            borderRadius: '50%',
            background:   color,
            border:       active         ? '2px solid #2563eb'
                        : color === '#ffffff' ? '1px solid rgba(0,0,0,0.15)'
                        :                  '1px solid transparent',
            boxShadow:   active ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
            transition:  'all 0.12s',
            flexShrink:  0,
        }}
    />
)

const VerticalSlider = ({
    value, min, max, onChange, accentColor, label,
}: {
    value: number; min: number; max: number
    onChange: (v: number) => void; accentColor: string; label: string
}) => (
    <div
        title={label}
        style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}
    >
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{
                writingMode: 'vertical-lr' as any,
                direction:   'rtl',
                height:      52,
                width:       20,
                cursor:      'pointer',
                accentColor,
            }}
        />
    </div>
)
