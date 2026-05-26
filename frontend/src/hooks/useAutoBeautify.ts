import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { detectShape } from '../lib/ai/shape-detection';
import type { Point, DetectedShape } from '../lib/ai/shape-detection';
import type { Stroke } from '../components/notes/InkCanvas';
import type { FloatingObject } from '../types/canvas';

export type AutoStatus = 'idle' | 'processing' | 'success' | 'fail';

export interface InkCanvasHandle {
  captureCanvas: () => Promise<string>;
  clearStrokes: () => void;
  getSvgElement: () => SVGSVGElement | null;
}

// ── Shape → perfect normalized SVG path (relative to bbox) ───────────────────

function shapeToSvgPath(shape: DetectedShape, offsetX: number, offsetY: number): string {
  const nx = (v: number) => +(v - offsetX).toFixed(2);
  const ny = (v: number) => +(v - offsetY).toFixed(2);

  if (shape.type === 'circle') {
    const cx = nx(shape.cx), cy = ny(shape.cy), r = +shape.r.toFixed(2);
    // Two-arc technique for a perfect closed circle
    return `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
  }

  if (shape.type === 'rectangle') {
    // Subtle rounded corners like Apple Notes
    const rx = +(Math.min(6, Math.min(shape.w, shape.h) * 0.06)).toFixed(2);
    const x = nx(shape.x), y = ny(shape.y), w = +shape.w.toFixed(2), h = +shape.h.toFixed(2);
    return (
      `M ${x + rx},${y} L ${x + w - rx},${y} Q ${x + w},${y} ${x + w},${y + rx} ` +
      `L ${x + w},${y + h - rx} Q ${x + w},${y + h} ${x + w - rx},${y + h} ` +
      `L ${x + rx},${y + h} Q ${x},${y + h} ${x},${y + h - rx} ` +
      `L ${x},${y + rx} Q ${x},${y} ${x + rx},${y} Z`
    );
  }

  if (shape.type === 'triangle') {
    return (
      `M ${nx(shape.p1.x)},${ny(shape.p1.y)} ` +
      `L ${nx(shape.p2.x)},${ny(shape.p2.y)} ` +
      `L ${nx(shape.p3.x)},${ny(shape.p3.y)} Z`
    );
  }

  if (shape.type === 'line') {
    return `M ${nx(shape.x1)},${ny(shape.y1)} L ${nx(shape.x2)},${ny(shape.y2)}`;
  }

  return '';
}

// ── Compute tight bounding box for a shape ───────────────────────────────────

function shapeBbox(shape: DetectedShape, PAD = 14) {
  if (shape.type === 'circle') {
    return {
      minX: shape.cx - shape.r - PAD,
      minY: shape.cy - shape.r - PAD,
      w: (shape.r + PAD) * 2,
      h: (shape.r + PAD) * 2,
    };
  }
  if (shape.type === 'rectangle') {
    return { minX: shape.x - PAD, minY: shape.y - PAD, w: shape.w + PAD * 2, h: shape.h + PAD * 2 };
  }
  if (shape.type === 'triangle') {
    const xs = [shape.p1.x, shape.p2.x, shape.p3.x];
    const ys = [shape.p1.y, shape.p2.y, shape.p3.y];
    const minX = Math.min(...xs) - PAD, minY = Math.min(...ys) - PAD;
    return { minX, minY, w: Math.max(...xs) - Math.min(...xs) + PAD * 2, h: Math.max(...ys) - Math.min(...ys) + PAD * 2 };
  }
  if (shape.type === 'line') {
    const minX = Math.min(shape.x1, shape.x2) - PAD;
    const minY = Math.min(shape.y1, shape.y2) - PAD;
    return {
      minX,
      minY,
      w: Math.max(Math.abs(shape.x2 - shape.x1) + PAD * 2, 24),
      h: Math.max(Math.abs(shape.y2 - shape.y1) + PAD * 2, 24),
    };
  }
  return { minX: 0, minY: 0, w: 40, h: 40 };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAutoBeautify(
  editor: any,
  inkRef: RefObject<InkCanvasHandle | null>,
  active: boolean,
  onStrokeObject?: (obj: FloatingObject) => void,
) {
  const [status, setStatus] = useState<AutoStatus>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProcess = useCallback((strokes: Stroke[]) => {
    if (!active || strokes.length === 0) return;
    if (strokes.length !== 1) return; // multi-stroke handled by InkCanvas OCR buffers

    const pts: Point[] = strokes[0].points.map(p => ({ x: p.x, y: p.y }));
    const shape = detectShape(pts);
    if (shape.type === 'unknown') return;

    if (!onStrokeObject) return;

    const { minX, minY, w, h } = shapeBbox(shape);
    const svgData = shapeToSvgPath(shape, minX, minY);
    if (!svgData) return;

    const shapeObj: FloatingObject = {
      id: crypto.randomUUID(),
      type: 'shape',
      position: { x: minX, y: minY },
      dimensions: { width: Math.max(w, 40), height: Math.max(h, 40) },
      svgData,
      stroke: strokes[0].color,
      strokeWidth: Math.max(strokes[0].width, 2.5),
      fill: 'none',
      isSelected: true, // auto-select so color picker appears immediately
      rotation: 0,
    };

    onStrokeObject(shapeObj);
    inkRef.current?.clearStrokes();
    setStatus('success');
    setTimeout(() => setStatus('idle'), 800);
  }, [active, inkRef, onStrokeObject]);

  const onStrokeFinish = useCallback((strokes: Stroke[]) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runProcess(strokes), 180);
  }, [runProcess]);

  useEffect(() => {
    if (!active) {
      if (debounce.current) clearTimeout(debounce.current);
      setStatus('idle');
    }
  }, [active]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  return { status, onStrokeFinish };
}
