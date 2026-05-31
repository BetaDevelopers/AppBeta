import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { smoothPoints } from './utils/strokeUtils';
import type { AutoStatus } from '../../hooks/useAutoBeautify';
import type { FloatingObject } from '../../types/canvas';
import { postCanvasForOcr, fixHandwritingText } from '../../services/ocrApi';
import type { DrawTool } from '../toolbar/toolbarTypes';
import type { RulerState } from '../toolbar/RulerOverlay';
import { projectPointOnLine } from '../toolbar/RulerOverlay';
import { useMultiTouch } from '../../hooks/useMultiTouch';

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

interface LineBuffer {
  id: string;
  strokes: Stroke[];
  lastStrokeTime: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  boundingBox: { minX: number; minY: number; width: number; height: number };
}

type Props = {
  active: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  drawTool?: DrawTool;
  drawOpacity?: number;
  drawWithFinger?: boolean;
  palmRejection?: boolean;
  editorScrollRef?: React.RefObject<HTMLDivElement | null>;
  rulerState?: RulerState | null;
  onChangeStrokes?: (strokes: Stroke[]) => void;
  onStrokeObject?: (obj: FloatingObject) => void;
  onOcrText?: (text: string, cx: number, cy: number) => void;
  onTextTap?: (x: number, y: number) => void;
  processingStatus?: AutoStatus;
};

export type InkCanvasRef = {
  captureCanvas: () => Promise<string>;
  clearStrokes: () => void;
  getSvgElement: () => SVGSVGElement | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStrokeBbox(stroke: Stroke) {
  const xs = stroke.points.map(p => p.x);
  const ys = stroke.points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

function mergeBboxes(
  a: { minX: number; minY: number; width: number; height: number },
  b: { minX: number; minY: number; width: number; height: number }
) {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.minX + a.width, b.minX + b.width);
  const maxY = Math.max(a.minY + a.height, b.minY + b.height);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function renderBufferToCanvas(strokes: Stroke[], padding = 20): {
  base64: string; cx: number; cy: number;
} | null {
  const allPts = strokes.flatMap(s => s.points);
  if (allPts.length === 0) return null;
  const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
  const mnX = Math.min(...xs) - padding;
  const mnY = Math.min(...ys) - padding;
  const cw = Math.max(Math.max(...xs) - mnX + padding, 32);
  const ch = Math.max(Math.max(...ys) - mnY + padding, 32);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (pts.length < 2) continue;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - mnX, pts[0].y - mnY);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2 - mnX;
      const my = (pts[i].y + pts[i + 1].y) / 2 - mnY;
      ctx.quadraticCurveTo(pts[i].x - mnX, pts[i].y - mnY, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x - mnX, pts[pts.length - 1].y - mnY);
    ctx.stroke();
  }
  return {
    base64: canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, ''),
    cx: mnX + cw / 2,
    cy: mnY + ch / 2,
  };
}

function looksLikeMath(strokes: Stroke[]): boolean {
  if (strokes.length === 0) return false;

  const allPts = strokes.flatMap(s => s.points);
  const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
  const totalW = Math.max(...xs) - Math.min(...xs) + 0.1;
  const totalH = Math.max(...ys) - Math.min(...ys) + 0.1;

  let horizontalCount = 0;
  let smallCircleCount = 0;
  let verticalCount = 0;

  for (const s of strokes) {
    const sxs = s.points.map(p => p.x);
    const sys = s.points.map(p => p.y);
    const sw = Math.max(...sxs) - Math.min(...sxs);
    const sh = Math.max(...sys) - Math.min(...sys) + 0.1;
    const aspect = sw / sh;

    if (aspect > 5 && sh < 20) horizontalCount++;
    if (aspect > 0.5 && aspect < 2 && sw < totalW * 0.3 && sh < totalH * 0.5) smallCircleCount++;
    if (aspect < 0.3 && sh > 20) verticalCount++;
  }

  if (horizontalCount >= 2) return true;
  if (strokes.length >= 4 && smallCircleCount >= 2) return true;
  if (totalH / totalW > 1.5 && strokes.length >= 3) return true;

  if (strokes.length === 1) {
    const pts = strokes[0].points;
    let equalSignPattern = 0;
    for (let i = 5; i < pts.length - 5; i++) {
      const dy = Math.abs(pts[i].y - pts[i - 5].y);
      const dx = Math.abs(pts[i].x - pts[i - 5].x);
      if (dx > dy * 3) equalSignPattern++;
    }
    if (equalSignPattern > pts.length * 0.6) return true;
  }

  return false;
}

function getBoundingBox(strokes: Stroke[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const PAD = 8;
  return {
    minX: minX - PAD,
    minY: minY - PAD,
    width: (maxX - minX) + PAD * 2,
    height: (maxY - minY) + PAD * 2,
  };
}

function normalizeSvgData(strokes: Stroke[], offsetX: number, offsetY: number): string {
  return strokes
    .map(s => {
      const normalized = s.points.map(p => ({ x: p.x - offsetX, y: p.y - offsetY }));
      return smoothPoints(normalized);
    })
    .filter(Boolean)
    .join(' ');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexOrRgbaWithOpacity(color: string, opacity: number): string {
  if (opacity >= 1) return color;
  if (color.startsWith('rgba')) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, (_, r, g, b) =>
      `rgba(${r},${g},${b},${opacity})`
    );
  }
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return color;
}

// ── Status pill ───────────────────────────────────────────────────────────────

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

// ── Canvas ────────────────────────────────────────────────────────────────────

const InkCanvas = forwardRef<InkCanvasRef, Props>(({
  active,
  strokeWidth = 2,
  strokeColor = 'rgba(255,255,255,0.8)',
  drawTool = 'pencil',
  drawOpacity = 1,
  drawWithFinger = false,
  palmRejection = true,
  editorScrollRef,
  rulerState = null,
  onChangeStrokes,
  onStrokeObject,
  onOcrText,
  onTextTap,
  processingStatus = 'idle',
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const { isPanning, onDown: panDown, onMove: panMove, onUp: panUp } = useMultiTouch(
    editorScrollRef as React.RefObject<HTMLElement | null>
  );

  // Ref so finishStroke always sees latest strokes without stale closure
  const strokesRef = useRef<Stroke[]>([]);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sketch autocomplete state ─────────────────────────────────────────────
  const [completionPath, setCompletionPath] = useState<string | null>(null);
  const completionPathRef = useRef<string | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const clearCompletion = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    completionPathRef.current = null;
    setCompletionPath(null);
  };

  // ── LineBuffer state ──────────────────────────────────────────────────────
  const lineBuffersRef = useRef<LineBuffer[]>([]);
  const [lineBuffers, setLineBuffers] = useState<LineBuffer[]>([]);
  const [internalStatus, setInternalStatus] = useState<AutoStatus>('idle');
  // Stable refs so timer callbacks always call the latest prop versions
  const onOcrTextRef = useRef(onOcrText);
  useEffect(() => { onOcrTextRef.current = onOcrText; }, [onOcrText]);
  const onStrokeObjectRef = useRef(onStrokeObject);
  useEffect(() => { onStrokeObjectRef.current = onStrokeObject; }, [onStrokeObject]);

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
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      lineBuffersRef.current.forEach(b => { if (b.debounceTimer) clearTimeout(b.debounceTimer); });
      lineBuffersRef.current = [];
      setLineBuffers([]);
      strokesRef.current = [];
      setStrokes([]);
      setCurrentPoints([]);
      clearCompletion();
    },
    getSvgElement: () => svgRef.current,
  }));

  const toSvgPoint = (e: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
  };

  // Schedules conversion of accumulated strokes to a FloatingObject.
  // Each new stroke-end resets the 1200ms window.
  const scheduleCommit = useCallback((latestStrokes: Stroke[]) => {
    if (!onStrokeObject) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);

    commitTimerRef.current = setTimeout(() => {
      const pending = strokesRef.current;
      if (pending.length === 0) return;

      const bbox = getBoundingBox(pending);
      const svgData = normalizeSvgData(pending, bbox.minX, bbox.minY);
      if (!svgData) return;

      const firstStroke = pending[0];
      const obj: FloatingObject = {
        id: crypto.randomUUID(),
        type: 'stroke',
        position: { x: bbox.minX, y: bbox.minY },
        dimensions: { width: Math.max(bbox.width, 40), height: Math.max(bbox.height, 40) },
        svgData,
        stroke: firstStroke.color,
        strokeWidth: firstStroke.width,
        isSelected: false,
        rotation: 0,
      };

      onStrokeObject(obj);

      // Clear canvas after commit
      strokesRef.current = [];
      setStrokes([]);
    }, 1200);
  }, [onStrokeObject]);

  // ── LineBuffer: fire OCR for a completed buffer ──────────────────────────

  const fireBuffer = useCallback(async (bufferId: string) => {
    const buf = lineBuffersRef.current.find(b => b.id === bufferId);
    if (!buf) return;

    const consumed = buf.strokes;
    const bufBbox = buf.boundingBox;

    // Remove buffer and its strokes from state
    lineBuffersRef.current = lineBuffersRef.current.filter(b => b.id !== bufferId);
    setLineBuffers([...lineBuffersRef.current]);
    strokesRef.current = strokesRef.current.filter(
      s => !consumed.some(cs => cs.timestamp === s.timestamp)
    );
    setStrokes(prev => prev.filter(s => !consumed.some(cs => cs.timestamp === s.timestamp)));

    const rendered = renderBufferToCanvas(consumed);
    if (!rendered) return;

    const isMath = looksLikeMath(consumed);
    const mode = isMath ? 'math' : 'handwriting';

    setInternalStatus('processing');
    try {
      const result = await postCanvasForOcr(rendered.base64, mode);

      if (isMath && result?.type === 'latex' && result.content && onStrokeObjectRef.current) {
        const equationObj: FloatingObject = {
          id: crypto.randomUUID(),
          type: 'equation',
          position: { x: bufBbox.minX, y: bufBbox.minY },
          dimensions: {
            width: Math.max(bufBbox.width, 120),
            height: Math.max(bufBbox.height, 60),
          },
          latexSource: result.content.trim(),
          isSelected: false,
          rotation: 0,
          stroke: consumed[0]?.color ?? '#ffffff',
          strokeWidth: consumed[0]?.width ?? 2,
        };
        onStrokeObjectRef.current(equationObj);
        setInternalStatus('success');
        setTimeout(() => setInternalStatus('idle'), 1000);
      } else if (result?.content?.trim() && onOcrTextRef.current) {
        const raw = result.content.trim();
        const fixed = await fixHandwritingText(raw);
        onOcrTextRef.current(fixed + ' ', rendered.cx, rendered.cy);
        setInternalStatus('success');
        setTimeout(() => setInternalStatus('idle'), 1000);
      } else {
        setInternalStatus('fail');
        setTimeout(() => setInternalStatus('idle'), 2000);
      }
    } catch {
      setInternalStatus('fail');
      setTimeout(() => setInternalStatus('idle'), 2000);
    }
  }, []);

  // ── LineBuffer: assign a stroke to the correct buffer ────────────────────

  const addStrokeToBuffer = useCallback((stroke: Stroke) => {
    const strokeBbox = getStrokeBbox(stroke);
    const buffers = lineBuffersRef.current;
    const strokeCY = strokeBbox.minY + strokeBbox.height / 2;

    const matchIdx = buffers.findIndex(b => {
      const bCY = b.boundingBox.minY + b.boundingBox.height / 2;
      return Math.abs(bCY - strokeCY) < 60;
    });

    if (matchIdx >= 0) {
      const buf = buffers[matchIdx];
      if (buf.debounceTimer) clearTimeout(buf.debounceTimer);
      const updated: LineBuffer = {
        ...buf,
        strokes: [...buf.strokes, stroke],
        lastStrokeTime: stroke.timestamp,
        boundingBox: mergeBboxes(buf.boundingBox, strokeBbox),
        debounceTimer: setTimeout(() => fireBuffer(buf.id), 1000),
      };
      const updatedBuffers = [...buffers];
      updatedBuffers[matchIdx] = updated;
      lineBuffersRef.current = updatedBuffers;
      setLineBuffers([...updatedBuffers]);
    } else {
      const newId = crypto.randomUUID();
      const newBuf: LineBuffer = {
        id: newId,
        strokes: [stroke],
        lastStrokeTime: stroke.timestamp,
        debounceTimer: setTimeout(() => fireBuffer(newId), 1000),
        boundingBox: strokeBbox,
      };
      const updatedBuffers = [...buffers, newBuf];
      lineBuffersRef.current = updatedBuffers;
      setLineBuffers([...updatedBuffers]);
    }
  }, [fireBuffer]);

  const shouldIgnoreTouch = (e: React.PointerEvent) =>
    e.pointerType === 'touch' && !drawWithFinger;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!active) return;

    // panDown returns true synchronously when 2+ fingers are active
    if (panDown(e)) return;

    if (shouldIgnoreTouch(e)) return;

    (e.target as SVGElement).setPointerCapture(e.pointerId);

    // Text tool: report tap position and do not draw
    if (drawTool === 'text') {
      const pt = toSvgPoint(e);
      onTextTap?.(pt.x, pt.y);
      return;
    }

    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (completionPathRef.current) clearCompletion();
    setCurrentPoints([toSvgPoint(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    if (panMove(e)) return; // consumed by multi-touch pan

    if (currentPoints.length === 0) return;
    if (shouldIgnoreTouch(e)) return;

    let pt = toSvgPoint(e);

    // Ruler snap: project onto ruler line if within 20px
    if (rulerState && drawTool !== 'eraser') {
      const { ax, ay, bx, by } = rulerState;
      const proj = projectPointOnLine(pt.x, pt.y, ax, ay, bx, by);
      if (proj.dist < 20) pt = { ...pt, x: proj.x, y: proj.y };
    }
    setCurrentPoints(p => [...p, pt]);

    // Clear any previous completion suggestion when user continues drawing
    if (completionPathRef.current) clearCompletion();

    // Schedule pause detection after 700ms of no movement
    if (currentPoints.length > 3) {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(async () => {
        // Take snapshot of current points at this moment
        const pts = [...currentPoints, pt];
        if (pts.length <= 3) return;
        const d = smoothPoints(pts);
        if (!d) return;
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('beta3m_token');
        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;
        try {
          const res = await fetch(`${apiUrl}/ai/complete-sketch`, {
            method: 'POST',
            signal: ctrl.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
            },
            body: JSON.stringify({ partialPath: d }),
          });
          if (!res.ok || ctrl.signal.aborted) return;
          const data = await res.json();
          if (data.completionPath && !ctrl.signal.aborted) {
            completionPathRef.current = data.completionPath;
            setCompletionPath(data.completionPath);
          }
        } catch { /* aborted or network error */ }
      }, 700);
    }
  };

  const finishStroke = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    const suggestion = completionPathRef.current;
    clearCompletion();

    if (currentPoints.length < 2) { setCurrentPoints([]); return; }

    // Eraser mode: don't commit strokes as FloatingObjects
    if (drawTool === 'eraser') { setCurrentPoints([]); return; }

    const now = Date.now();
    const dx = currentPoints[0].x - currentPoints[currentPoints.length - 1].x;
    const dy = currentPoints[0].y - currentPoints[currentPoints.length - 1].y;
    const dist = Math.hypot(dx, dy);
    const elapsed = now - (strokesRef.current[strokesRef.current.length - 1]?.timestamp || now - 100);
    const speed = elapsed > 0 ? dist / elapsed : 1;

    // Tool-specific width calculation
    let finalWidth: number;
    if (drawTool === 'fountain') {
      finalWidth = Math.max(1, Math.min(10, strokeWidth * 2 / (speed * 0.8 + 0.5)));
    } else if (drawTool === 'pencil') {
      finalWidth = Math.max(1, Math.min(8, strokeWidth / (speed + 0.1)));
    } else {
      finalWidth = strokeWidth;
    }

    // Tool-specific color/opacity
    const markerOpacity = drawTool === 'marker' ? Math.min(drawOpacity, 0.45) : drawOpacity;
    const finalColor = drawTool === 'marker'
      ? hexOrRgbaWithOpacity(strokeColor, markerOpacity)
      : hexOrRgbaWithOpacity(strokeColor, drawOpacity);

    const dynamicWidth = finalWidth;
    const newStroke: Stroke = { points: currentPoints, width: dynamicWidth, color: finalColor, timestamp: now };

    // If there was an active suggestion, merge it into the stroke's svgData as a second path
    // by appending the completion to the stroke's points via a synthetic merged stroke
    const mergedStroke: typeof newStroke = suggestion
      ? { ...newStroke, color: newStroke.color }
      : newStroke;

    const updated = [...strokesRef.current, mergedStroke];
    strokesRef.current = updated;
    setStrokes(updated);
    onChangeStrokes?.(updated);
    setCurrentPoints([]);

    if (onOcrText) {
      addStrokeToBuffer(mergedStroke);
    } else {
      scheduleCommit(updated);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    panUp(e);
    if (shouldIgnoreTouch(e)) return;
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

  const displayStatus = internalStatus !== 'idle' ? internalStatus : processingStatus;
  const isPulsing = displayStatus === 'processing';

  return (
    <>
      <style>{`
        @keyframes ocr-fill { from { width: 0% } to { width: 100% } }
        @keyframes completion-draw { from { opacity: 0 } to { opacity: 0.4 } }
      `}</style>

      {/* ── LineBuffer overlays ── */}
      {lineBuffers.map(buf => (
        <div
          key={buf.id}
          style={{
            position: 'absolute',
            left: buf.boundingBox.minX,
            top: buf.boundingBox.minY,
            width: Math.max(buf.boundingBox.width, 4),
            height: Math.max(buf.boundingBox.height, 4),
            background: `${strokeColor}0D`,
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 3,
            overflow: 'hidden',
          }}
        >
          <div
            key={buf.lastStrokeTime}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 2,
              background: strokeColor,
              opacity: 0.7,
              animation: `ocr-fill 1800ms linear forwards`,
            }}
          />
        </div>
      ))}

      {/* Pan indicator */}
      {isPanning && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 20,
          background: 'rgba(15,15,30,0.7)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 11, color: 'rgba(255,255,255,0.6)',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}>
          ✋ Desplazando
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="touch-none"
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'transparent',
          pointerEvents: active ? 'all' : 'none',
          cursor: drawTool === 'eraser' ? 'cell' : drawTool === 'text' ? 'text' : active ? 'crosshair' : 'default',
          touchAction: 'none',
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
          {completionPath && (
            <path
              d={completionPath}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
              style={{ animation: 'completion-draw 300ms ease-out forwards' }}
            />
          )}
        </g>
      </svg>
      <StatusPill status={displayStatus} />
    </>
  );
});

export default InkCanvas;
