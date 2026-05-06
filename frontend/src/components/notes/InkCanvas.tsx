import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { smoothPoints } from './utils/strokeUtils';
import type { AutoStatus } from '../../hooks/useAutoBeautify';

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  points: Point[];
  width: number;
  color: string;
  timestamp: number;
}

type Props = {
  active: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  onChangeStrokes?: (strokes: Stroke[]) => void;
  processingStatus?: AutoStatus;
};

export type InkCanvasRef = {
  captureCanvas: () => Promise<string>;
  clearStrokes: () => void;
  getSvgElement: () => SVGSVGElement | null;
};

// ── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: AutoStatus }) {
  if (status === 'idle') return null;

  const pillStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    pointerEvents: 'none',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(15,15,30,0.85)',
    color: status === 'success' ? '#4ade80' : status === 'fail' ? '#f87171' : '#94a3b8',
  };

  return (
    <div style={pillStyle}>
      {status === 'processing' && (
        <span className="animate-spin" style={{
          width: 10, height: 10, borderRadius: '50%',
          border: '2px solid rgba(148,163,184,0.3)',
          borderTopColor: '#94a3b8',
          display: 'inline-block',
        }} />
      )}
      {status === 'processing' && 'Reconociendo...'}
      {status === 'success' && '✓ Listo'}
      {status === 'fail' && '? No reconocido'}
    </div>
  );
}

// ── Canvas ──────────────────────────────────────────────────────────────────

const InkCanvas = forwardRef<InkCanvasRef, Props>(({
  active,
  strokeWidth = 2,
  strokeColor = 'rgba(255,255,255,0.8)',
  onChangeStrokes,
  processingStatus = 'idle',
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  useImperativeHandle(ref, () => ({
    captureCanvas: async () => {
      if (!svgRef.current) return '';
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      const dataUrl: string = await new Promise(resolve => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width  = img.width  || svgRef.current!.clientWidth;
          canvas.height = img.height || svgRef.current!.clientHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
      });
      return dataUrl;
    },
    clearStrokes: () => {
      setStrokes([]);
      setCurrentPoints([]);
    },
    getSvgElement: () => svgRef.current,
  }));

  const toSvgPoint = (e: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    setCurrentPoints([toSvgPoint(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active || currentPoints.length === 0) return;
    setCurrentPoints(p => [...p, toSvgPoint(e)]);
  };

  const finishStroke = () => {
    if (currentPoints.length < 2) { setCurrentPoints([]); return; }
    const now = Date.now();
    const dx = currentPoints[0].x - currentPoints[currentPoints.length - 1].x;
    const dy = currentPoints[0].y - currentPoints[currentPoints.length - 1].y;
    const dist = Math.hypot(dx, dy);
    const elapsed = now - (strokes[strokes.length - 1]?.timestamp || now - 100);
    const speed = elapsed > 0 ? dist / elapsed : 1;
    const dynamicWidth = Math.max(1, Math.min(8, strokeWidth / (speed + 0.1)));
    const newStroke: Stroke = { points: currentPoints, width: dynamicWidth, color: strokeColor, timestamp: now };
    const updated = [...strokes, newStroke];
    setStrokes(updated);
    onChangeStrokes?.(updated);
    setCurrentPoints([]);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as SVGElement).releasePointerCapture(e.pointerId);
    finishStroke();
  };

  const handlePointerLeave = () => { if (active) finishStroke(); };

  const renderPath = (stroke: Stroke) => {
    const d = smoothPoints(stroke.points);
    if (!d) return null;
    return (
      <path key={stroke.timestamp} d={d}
        stroke={stroke.color} strokeWidth={stroke.width}
        fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );
  };

  const isPulsing = processingStatus === 'processing';

  return (
    <>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0 z-10 touch-none"
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'transparent',
          pointerEvents: active ? 'all' : 'none',
          cursor: active ? 'crosshair' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <g className={isPulsing ? 'animate-pulse' : ''}>
          {strokes.map(renderPath)}
          {currentPoints.length > 1 && (
            <path d={smoothPoints(currentPoints)}
              stroke={strokeColor} strokeWidth={strokeWidth}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>
      </svg>
      <StatusPill status={processingStatus} />
    </>
  );
});

export default InkCanvas;
