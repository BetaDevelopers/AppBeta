import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PointerMode } from '../../hooks/usePointerMode';
import { useStrokeRecognition, RecognitionResult } from '../../hooks/useStrokeRecognition';

interface Point { x: number; y: number; }
interface Stroke { points: Point[]; color: string; width: number; }

export type BrushType = 'pen' | 'marker' | 'eraser';

export interface InlineCanvasProps {
    mode: PointerMode;
    editorRef: React.RefObject<HTMLElement | null>;
    onRecognized: (result: RecognitionResult) => void;
    brushType?: BrushType;
    toolColor?: string;
    toolWidth?: number;
}

export default function InlineCanvas({
    mode,
    editorRef,
    onRecognized,
    brushType = 'pen',
    toolColor = '#e2e8f0',
    toolWidth = 2,
}: InlineCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
    const isDrawingRef = useRef(false);
    const recognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [bounds, setBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const { processStroke } = useStrokeRecognition();

    // Track editor bounds (fixed overlay)
    useEffect(() => {
        const update = () => {
            const el = editorRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setBounds({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        update();
        const ro = new ResizeObserver(update);
        if (editorRef.current) ro.observe(editorRef.current);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [editorRef]);

    // Resize canvas pixel buffer when bounds change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bounds.width) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = bounds.width * dpr;
        canvas.height = bounds.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        redrawAll();
    }, [bounds]);

    const getStrokeColor = () => (brushType === 'eraser' ? 'rgba(0,0,0,1)' : toolColor);
    const getStrokeWidth = () => {
        if (brushType === 'marker') return toolWidth * 4;
        if (brushType === 'eraser') return 24;
        return toolWidth;
    };

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, bounds.width, bounds.height);
        for (const stroke of strokesRef.current) {
            if (stroke.points.length < 2) continue;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = 'source-over';
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }
    }, [bounds]);

    const captureStrokeRegion = useCallback((): string | null => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const stroke of strokesRef.current) {
            for (const p of stroke.points) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            }
        }

        const pad = 24;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(bounds.width, maxX + pad);
        maxY = Math.min(bounds.height, maxY + pad);
        const w = maxX - minX;
        const h = maxY - minY;
        if (w <= 4 || h <= 4) return null;

        const tmp = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        tmp.width = w * dpr;
        tmp.height = h * dpr;
        const tmpCtx = tmp.getContext('2d')!;
        tmpCtx.scale(dpr, dpr);
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, w, h);
        tmpCtx.drawImage(canvas, minX * dpr, minY * dpr, w * dpr, h * dpr, 0, 0, w, h);
        return tmp.toDataURL('image/png');
    }, [bounds]);

    const clearCanvas = useCallback(() => {
        strokesRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, bounds.width, bounds.height);
        }
    }, [bounds]);

    const undoLastStroke = useCallback(() => {
        strokesRef.current = strokesRef.current.slice(0, -1);
        redrawAll();
    }, [redrawAll]);

    // Listen for canvas-clear and canvas-undo events from DrawingToolbar
    useEffect(() => {
        const onClear = () => clearCanvas();
        const onUndo = () => undoLastStroke();
        window.addEventListener('canvas-clear', onClear);
        window.addEventListener('canvas-undo', onUndo);
        return () => {
            window.removeEventListener('canvas-clear', onClear);
            window.removeEventListener('canvas-undo', onUndo);
        };
    }, [clearCanvas, undoLastStroke]);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (mode !== 'draw') return;
        e.preventDefault();
        isDrawingRef.current = true;
        canvasRef.current?.setPointerCapture(e.pointerId);
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        currentStrokeRef.current = [{ x, y }];
        if (recognitionTimerRef.current) clearTimeout(recognitionTimerRef.current);
    }, [mode, bounds]);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || mode !== 'draw') return;
        e.preventDefault();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        currentStrokeRef.current.push({ x, y });

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        const pts = currentStrokeRef.current;
        if (pts.length < 2) return;
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];

        ctx.beginPath();
        const speed = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const dynamicWidth = Math.max(1, getStrokeWidth() - speed * 0.03);

        if (brushType === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = getStrokeColor();
        }
        ctx.lineWidth = dynamicWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }, [mode, bounds, brushType, toolColor, toolWidth]);

    const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        if (currentStrokeRef.current.length > 1 && brushType !== 'eraser') {
            strokesRef.current.push({
                points: [...currentStrokeRef.current],
                color: getStrokeColor(),
                width: getStrokeWidth(),
            });
        }
        currentStrokeRef.current = [];

        // Wait 600ms after last stroke-lift before sending to AI
        if (recognitionTimerRef.current) clearTimeout(recognitionTimerRef.current);
        recognitionTimerRef.current = setTimeout(async () => {
            const dataUrl = captureStrokeRegion();
            if (!dataUrl) return;

            // Clear canvas immediately for snappy feel
            clearCanvas();

            const result = await processStroke(dataUrl);
            onRecognized(result);
        }, 600);
    }, [brushType, captureStrokeRegion, clearCanvas, processStroke, onRecognized]);

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
                position: 'fixed',
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                pointerEvents: mode === 'draw' ? 'all' : 'none',
                zIndex: 50,
                touchAction: 'none',
                cursor: mode === 'draw'
                    ? (brushType === 'eraser' ? 'cell' : 'crosshair')
                    : 'default',
            }}
        />
    );
}
