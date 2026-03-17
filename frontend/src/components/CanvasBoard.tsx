import React, { useRef, useState, useEffect } from 'react'
import { getStroke } from 'perfect-freehand'

interface Point {
    x: number;
    y: number;
    pressure?: number;
}

interface Stroke {
    points: Point[];
    color: string;
    width: number;
    type: 'stroke' | 'circle' | 'rect';
    x?: number;
    y?: number;
    radius?: number;
    widthRect?: number;
    heightRect?: number;
}

const CanvasBoard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [strokes, setStrokes] = useState<Stroke[]>([]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDrawing(true);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure }]);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const newPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure };
            setCurrentStroke((prev) => [...prev, newPoint]);
        }
    };

    const recognizeShape = (points: Point[]): Stroke | null => {
        if (points.length < 15) return null;

        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = maxX - minX;
        const height = maxY - minY;

        const start = points[0];
        const end = points[points.length - 1];
        const distStartEnd = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

        if (distStartEnd < 50) {
            const aspectRatio = width / height;
            if (Math.abs(1 - aspectRatio) < 0.4) {
                return { type: 'circle', x: minX + width / 2, y: minY + height / 2, radius: (width + height) / 4, color: '#4CAF50', width: 3, points: [] };
            } else {
                return { type: 'rect', x: minX, y: minY, widthRect: width, heightRect: height, color: '#2196F3', width: 3, points: [] };
            }
        }
        return null;
    };

    const handlePointerUp = () => {
        if (currentStroke.length > 0) {
            const shape = recognizeShape(currentStroke);
            if (shape) {
                setStrokes((prev) => [...prev, shape]);
            } else {
                setStrokes((prev) => [...prev, { points: currentStroke, color: 'white', width: 2, type: 'stroke' }]);
            }
        }
        setIsDrawing(false);
        setCurrentStroke([]);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderFreehand = (strokePoints: Point[], color: string) => {
            const outlinePoints = getStroke(strokePoints, { size: 3 });
            if (outlinePoints.length === 0) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
            for (const [x, y] of outlinePoints) ctx.lineTo(x, y);
            ctx.fill();
        };

        strokes.forEach((s) => {
            if (s.type === 'stroke') {
                renderFreehand(s.points, s.color);
            } else if (s.type === 'circle' && s.x && s.y && s.radius) {
                ctx.strokeStyle = s.color;
                ctx.lineWidth = s.width;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (s.type === 'rect' && s.x && s.y && s.widthRect && s.heightRect) {
                ctx.strokeStyle = s.color;
                ctx.lineWidth = s.width;
                ctx.strokeRect(s.x, s.y, s.widthRect, s.heightRect);
            }
        });

        if (currentStroke.length > 0) renderFreehand(currentStroke, 'rgba(255, 255, 255, 0.5)');
    }, [strokes, currentStroke]);

    return (
        <div className="canvas-container" style={{ width: '100%', height: '80vh', background: '#1e1e1e', touchAction: 'none', borderRadius: '8px', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                width={window.innerWidth - 320}
                height={window.innerHeight * 0.8}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ cursor: 'crosshair' }}
            />
        </div>
    );
};

export default CanvasBoard
