import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Transforms, Editor, Element as SlateElement } from 'slate'
import { ReactEditor, useSlate, useSelected, useFocused } from 'slate-react'
import { Trash2, PenTool, Eraser, Sparkles, Wand2, RefreshCw } from 'lucide-react'
import { useOCR } from '@/features/ai/hooks/useOCR'

interface Point {
    x: number
    y: number
    pressure?: number
}

const SMOOTHING_FACTOR = 0.3

export const DrawingCanvas = ({ attributes, children, element }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
    const [isBeautifying, setIsBeautifying] = useState(false)
    const editor = useSlate()
    const selected = useSelected()
    const focused = useFocused()
    const { performOCR, isProcessing } = useOCR()

    // Tablet-friendly drawing with smoothing
    const [lastPoints, setLastPoints] = useState<Point[]>([])

    const draw = useCallback((e: React.PointerEvent) => {
        if (!isDrawing || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const newPoint = { x, y, pressure: e.pressure }
        setLastPoints(prev => [...prev.slice(-3), newPoint])

        ctx.lineWidth = tool === 'eraser' ? 24 : 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#2563eb'

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'
        } else {
            ctx.globalCompositeOperation = 'source-over'
        }

        if (lastPoints.length > 2) {
            const xc = (lastPoints[lastPoints.length - 1].x + lastPoints[lastPoints.length - 2].x) / 2
            const yc = (lastPoints[lastPoints.length - 1].y + lastPoints[lastPoints.length - 2].y) / 2
            ctx.quadraticCurveTo(lastPoints[lastPoints.length - 2].x, lastPoints[lastPoints.length - 2].y, xc, yc)
            ctx.stroke()
        } else {
            ctx.lineTo(x, y)
            ctx.stroke()
        }

        ctx.beginPath()
        ctx.moveTo(x, y)
    }, [isDrawing, tool, lastPoints])

    const startDrawing = (e: React.PointerEvent) => {
        setIsDrawing(true)
        setLastPoints([{ x: e.clientX, y: e.clientY }])
        const canvas = canvasRef.current
        if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.beginPath()
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
            }
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        setLastPoints([])
    }

    const handleBeautify = async () => {
        setIsBeautifying(true)
        // Simulate AI Beautification (In a real app, we'd send the path data to a smoothing API)
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsBeautifying(false)
        alert('Trazos suavizados con IA (Simulación)')
    }

    const convertToText = async () => {
        if (!canvasRef.current) return
        const text = await performOCR(canvasRef.current)
        if (text && text.trim()) {
            const path = ReactEditor.findPath(editor, element)
            Transforms.insertNodes(
                editor,
                { type: 'paragraph', children: [{ text }] } as any,
                { at: [path[0] + 1] }
            )
        }
    }

    return (
        <div {...attributes} className="my-12 relative group">
            <div contentEditable={false} className={isProcessing || isBeautifying ? "animate-shimmer" : ""} style={{
                borderRadius: '24px', overflow: 'hidden', background: '#fff',
                border: `1px solid ${selected && focused ? '#2563eb' : 'rgba(0,0,0,0.06)'}`,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: selected && focused ? '0 30px 60px rgba(37,99,235,0.12)' : '0 10px 30px rgba(0,0,0,0.04)',
                position: 'relative'
            }}>
                <div style={{
                    background: 'rgba(255,255,255,0.95)', padding: '10px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => setTool('pen')}
                            style={{ ...toolIconStyle, background: tool === 'pen' ? '#2563eb' : 'transparent', color: tool === 'pen' ? '#fff' : '#64748b' }}
                        >
                            <PenTool size={16} />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            style={{ ...toolIconStyle, background: tool === 'eraser' ? '#2563eb' : 'transparent', color: tool === 'eraser' ? '#fff' : '#64748b' }}
                        >
                            <Eraser size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleBeautify}
                            disabled={isBeautifying}
                            style={{ ...actionBtnStyle, background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}
                        >
                            {isBeautifying ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            <span>Embellencer</span>
                        </button>

                        <button
                            onClick={convertToText}
                            disabled={isProcessing}
                            style={{ ...actionBtnStyle, background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                        >
                            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            <span>Pasar a Texto</span>
                        </button>
                    </div>

                    <button style={{ ...toolIconStyle, color: '#ef4444' }}>
                        <Trash2 size={16} />
                    </button>
                </div>

                <canvas
                    ref={canvasRef}
                    width={1600}
                    height={800}
                    className="paper-grid"
                    style={{
                        width: '100%', aspectRatio: '2/1', cursor: 'crosshair', touchAction: 'none',
                        background: '#ffffff',
                    }}
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

const toolIconStyle: React.CSSProperties = {
    padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.2s'
}

const actionBtnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', transition: 'all 0.2s'
}

