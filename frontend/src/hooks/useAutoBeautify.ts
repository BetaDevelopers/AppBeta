import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { detectShape } from '../lib/ai/shape-detection';
import type { Point } from '../lib/ai/shape-detection';
import type { DetectedShape } from '../lib/ai/shape-detection';
import { postCanvasForOcr } from '../services/ocrApi';
import type { Stroke } from '../components/notes/InkCanvas';
import type { FloatingObject } from '../types/canvas';

export type AutoStatus = 'idle' | 'processing' | 'success' | 'fail';

export interface InkCanvasHandle {
  captureCanvas: () => Promise<string>;
  clearStrokes: () => void;
  getSvgElement: () => SVGSVGElement | null;
}

// ── Capture bounding-box canvas (black bg, white strokes) ─────────────────

function strokesToBoundedCanvas(strokes: Stroke[], padding = 24): {
  base64: string;
  cx: number;
  cy: number;
} | null {
  const allPts = strokes.flatMap(s => s.points);
  if (allPts.length === 0) return null;

  const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
  const mnX = Math.min(...xs) - padding;
  const mnY = Math.min(...ys) - padding;
  const cw  = Math.max(Math.max(...xs) - mnX + padding, 32);
  const ch  = Math.max(Math.max(...ys) - mnY + padding, 32);

  const canvas = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#fff';
  ctx.lineCap  = 'round';
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

  return { base64: canvas.toDataURL('image/png'), cx: mnX + cw / 2, cy: mnY + ch / 2 };
}

// ── Convert detected shape → SVG data-URL ─────────────────────────────────

function shapeToSvgDataUrl(shape: DetectedShape): { dataUrl: string; cx: number; cy: number } | null {
  const pad = 6;
  let inner = '', vw = 0, vh = 0, cx = 0, cy = 0;

  if (shape.type === 'circle') {
    const sz = (shape.r + pad) * 2;
    vw = sz; vh = sz; cx = shape.cx; cy = shape.cy;
    inner = `<circle cx="${shape.r + pad}" cy="${shape.r + pad}" r="${shape.r}" stroke="white" stroke-width="2" fill="none"/>`;
  } else if (shape.type === 'rectangle') {
    vw = shape.w + pad * 2; vh = shape.h + pad * 2;
    cx = shape.x + shape.w / 2; cy = shape.y + shape.h / 2;
    inner = `<rect x="${pad}" y="${pad}" width="${shape.w}" height="${shape.h}" stroke="white" stroke-width="2" fill="none" rx="2" stroke-linejoin="round"/>`;
  } else if (shape.type === 'triangle') {
    const pts = [shape.p1, shape.p2, shape.p3];
    const txs = pts.map(p => p.x), tys = pts.map(p => p.y);
    const mnX = Math.min(...txs), mnY = Math.min(...tys);
    vw = Math.max(...txs) - mnX + pad * 2;
    vh = Math.max(...tys) - mnY + pad * 2;
    cx = mnX + vw / 2; cy = mnY + vh / 2;
    const pStr = pts.map(p => `${p.x - mnX + pad},${p.y - mnY + pad}`).join(' ');
    inner = `<polygon points="${pStr}" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round"/>`;
  } else if (shape.type === 'line') {
    const mnX = Math.min(shape.x1, shape.x2), mnY = Math.min(shape.y1, shape.y2);
    vw = Math.max(Math.abs(shape.x2 - shape.x1) + pad * 2, 20);
    vh = Math.max(Math.abs(shape.y2 - shape.y1) + pad * 2, 20);
    cx = mnX + vw / 2; cy = mnY + vh / 2;
    inner = `<line x1="${shape.x1 - mnX + pad}" y1="${shape.y1 - mnY + pad}" x2="${shape.x2 - mnX + pad}" y2="${shape.y2 - mnY + pad}" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    return null;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}">${inner}</svg>`;
  return { dataUrl: `data:image/svg+xml;base64,${btoa(svg)}`, cx, cy };
}

// ── Shape → normalized SVG path (coords relative to bbox) ────────────────

function shapeToNormalizedSvgPath(shape: DetectedShape, offsetX: number, offsetY: number): string {
  const n = (v: number) => Math.round((v - offsetX) * 100) / 100;
  const m = (v: number) => Math.round((v - offsetY) * 100) / 100;

  if (shape.type === 'circle') {
    const cx = n(shape.cx), cy = m(shape.cy), r = shape.r;
    // Two-arc full circle
    return `M ${cx},${cy - r} A ${r},${r} 0 1,0 ${cx},${cy + r} A ${r},${r} 0 1,0 ${cx},${cy - r} Z`;
  }
  if (shape.type === 'rectangle') {
    const x = n(shape.x), y = m(shape.y), w = shape.w, h = shape.h;
    return `M ${x},${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  if (shape.type === 'triangle') {
    const p1 = `${n(shape.p1.x)},${m(shape.p1.y)}`;
    const p2 = `${n(shape.p2.x)},${m(shape.p2.y)}`;
    const p3 = `${n(shape.p3.x)},${m(shape.p3.y)}`;
    return `M ${p1} L ${p2} L ${p3} Z`;
  }
  if (shape.type === 'line') {
    return `M ${n(shape.x1)},${m(shape.y1)} L ${n(shape.x2)},${m(shape.y2)}`;
  }
  return '';
}

// ── Insert content at screen position ─────────────────────────────────────

function insertImageAt(editor: any, src: string, svgEl: SVGSVGElement | null, drawCx: number, drawCy: number) {
  if (svgEl && editor.view?.posAtCoords) {
    const rect = svgEl.getBoundingClientRect();
    const pos = editor.view.posAtCoords({ left: rect.left + drawCx, top: rect.top + drawCy });
    if (pos?.pos != null) {
      editor.chain().focus().setTextSelection(pos.pos).setImage({ src }).run();
      return;
    }
  }
  editor.chain().focus().setImage({ src }).run();
}

function insertTextAt(editor: any, text: string, svgEl: SVGSVGElement | null, drawCx: number, drawCy: number) {
  if (svgEl && editor.view?.posAtCoords) {
    const rect = svgEl.getBoundingClientRect();
    const pos = editor.view.posAtCoords({ left: rect.left + drawCx, top: rect.top + drawCy });
    if (pos?.pos != null) {
      editor.chain().focus().insertContentAt(pos.pos, text).run();
      return;
    }
  }
  editor.chain().focus().insertContent(text).run();
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAutoBeautify(
  editor: any,
  inkRef: RefObject<InkCanvasHandle | null>,
  active: boolean,
  onStrokeObject?: (obj: FloatingObject) => void,
) {
  const [status, setStatus] = useState<AutoStatus>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProcess = useCallback(async (strokes: Stroke[]) => {
    if (!active || !editor || strokes.length === 0) return;

    const token = localStorage.getItem('beta3m_token');
    if (!token) {
      setStatus('fail');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }

    const svgEl = inkRef.current?.getSvgElement() ?? null;

    // Phase 1: geometric shape detection (single stroke only — multi-stroke = text)
    if (strokes.length === 1) {
      const pts: Point[] = strokes[0].points.map(p => ({ x: p.x, y: p.y }));
      const shape = detectShape(pts);
      if (shape.type !== 'unknown') {
        if (onStrokeObject) {
          const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
          const PAD = 12;
          const minX = Math.min(...xs) - PAD;
          const minY = Math.min(...ys) - PAD;
          const w = Math.max(...xs) - Math.min(...xs) + PAD * 2;
          const h = Math.max(...ys) - Math.min(...ys) + PAD * 2;
          const svgData = shapeToNormalizedSvgPath(shape, minX, minY);
          if (svgData) {
            const shapeObj: FloatingObject = {
              id: crypto.randomUUID(),
              type: 'shape',
              position: { x: minX, y: minY },
              dimensions: { width: Math.max(w, 40), height: Math.max(h, 40) },
              svgData,
              stroke: strokes[0].color,
              strokeWidth: strokes[0].width,
              fill: 'none',
              isSelected: false,
              rotation: 0,
            };
            onStrokeObject(shapeObj);
            inkRef.current?.clearStrokes();
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1000);
          }
        } else {
          const shaped = shapeToSvgDataUrl(shape);
          if (shaped) {
            insertImageAt(editor, shaped.dataUrl, svgEl, shaped.cx, shaped.cy);
            inkRef.current?.clearStrokes();
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1000);
          }
        }
        return;
      }
    }

    // Phase 2: handwriting OCR
    setStatus('processing');
    const captured = strokesToBoundedCanvas(strokes);
    if (!captured) { setStatus('idle'); return; }

    try {
      const result = await postCanvasForOcr(captured.base64);
      // Backend returns { content } for handwriting mode
      const text = result?.content?.trim();
      if (!text) {
        setStatus('fail');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      }
      insertTextAt(editor, text + ' ', svgEl, captured.cx, captured.cy);
      inkRef.current?.clearStrokes();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1000);
    } catch {
      setStatus('fail');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [active, editor, inkRef, onStrokeObject]);

  const onStrokeFinish = useCallback((strokes: Stroke[]) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runProcess(strokes), 800);
  }, [runProcess]);

  // Reset when ink mode toggles off
  useEffect(() => {
    if (!active) {
      if (debounce.current) clearTimeout(debounce.current);
      setStatus('idle');
    }
  }, [active]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  return { status, onStrokeFinish };
}
