import React, { useRef, useCallback, useState, useEffect } from 'react';
import katex from 'katex';
import type { FloatingObject, ResizeHandle } from '../../types/canvas';
import { postCanvasForOcr } from '../../services/ocrApi';
import { smoothPoints } from './utils/strokeUtils';
import type { Stroke, Point } from './InkCanvas';

type AnchorHandle = 'n' | 's' | 'e' | 'w';

interface FloatingObjectProps {
  object: FloatingObject;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string) => void;
  onSelect: (id: string) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onStrokeWidthChange: (id: string, width: number) => void;
  onFillChange: (id: string, fill: string) => void;
  onLatexChange?: (id: string, latex: string) => void;
  onConnectStart?: (id: string, handle: AnchorHandle, anchorX: number, anchorY: number) => void;
  onConnectMove?: (clientX: number, clientY: number) => void;
  onConnectEnd?: (clientX: number, clientY: number) => void;
  onArrowChange?: (id: string, arrowStart: boolean, arrowEnd: boolean) => void;
}

const STROKE_COLORS = ['#FFFFFF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#000000'];

// ── Resize handle descriptors ────────────────────────────────────────────────

const HANDLES: { id: ResizeHandle; cursor: string; top: string; left: string; transform: string }[] = [
  { id: 'nw', cursor: 'nw-resize', top: '-6px',  left: '-6px',  transform: 'none' },
  { id: 'n',  cursor: 'n-resize',  top: '-6px',  left: '50%',   transform: 'translateX(-50%)' },
  { id: 'ne', cursor: 'ne-resize', top: '-6px',  left: '100%',  transform: 'translateX(-6px)' },
  { id: 'e',  cursor: 'e-resize',  top: '50%',   left: '100%',  transform: 'translate(-6px, -50%)' },
  { id: 'se', cursor: 'se-resize', top: '100%',  left: '100%',  transform: 'translate(-6px, -6px)' },
  { id: 's',  cursor: 's-resize',  top: '100%',  left: '50%',   transform: 'translate(-50%, -6px)' },
  { id: 'sw', cursor: 'sw-resize', top: '100%',  left: '-6px',  transform: 'translateY(-6px)' },
  { id: 'w',  cursor: 'w-resize',  top: '50%',   left: '-6px',  transform: 'translateY(-50%)' },
];

// ── Component ────────────────────────────────────────────────────────────────

const CONN_HANDLE_ANCHORS: Array<{
  handle: AnchorHandle;
  cx: (w: number, h: number) => number;
  cy: (w: number, h: number) => number;
}> = [
  { handle: 'n', cx: (w) => w / 2,  cy: () => 0 },
  { handle: 's', cx: (w) => w / 2,  cy: (_w, h) => h },
  { handle: 'e', cx: (w) => w,       cy: (_w, h) => h / 2 },
  { handle: 'w', cx: () => 0,        cy: (_w, h) => h / 2 },
];

export default function FloatingObjectComponent({
  object,
  onDrag,
  onDragEnd,
  onSelect,
  onResize,
  onDelete,
  onColorChange,
  onStrokeWidthChange,
  onFillChange,
  onLatexChange,
  onConnectStart,
  onConnectMove,
  onConnectEnd,
  onArrowChange,
}: FloatingObjectProps) {
  const { id, position, dimensions, isSelected, svgData, imageBase64, ocrText, type } = object;

  // ── Connection handles ────────────────────────────────────────────────────
  const [showConnHandles, setShowConnHandles] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Equation edit mode ────────────────────────────────────────────────────
  const [isEditingEq, setIsEditingEq] = useState(false);
  const [editStrokes, setEditStrokes] = useState<Stroke[]>([]);
  const [editCurrentPts, setEditCurrentPts] = useState<Point[]>([]);
  const editStrokesRef = useRef<Stroke[]>([]);
  const editSvgRef = useRef<SVGSVGElement>(null);
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitEditRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    commitEditRef.current = async () => {
      const strokesToOcr = editStrokesRef.current;
      if (strokesToOcr.length === 0) { setIsEditingEq(false); return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(dimensions.width, 32);
      canvas.height = Math.max(dimensions.height, 32);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of strokesToOcr) {
        const pts = stroke.points;
        if (pts.length < 2) continue;
        ctx.lineWidth = stroke.width;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      const base64 = canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '');
      try {
        const result = await postCanvasForOcr(base64, 'math');
        if (result?.content) onLatexChange?.(id, result.content.trim());
      } catch { /* silently ignore */ }
      editStrokesRef.current = [];
      setEditStrokes([]);
      setEditCurrentPts([]);
      setIsEditingEq(false);
    };
  });

  const toEditPoint = (e: React.PointerEvent): Point => {
    const rect = editSvgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
  };

  const handleEditPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    setEditCurrentPts([toEditPoint(e)]);
  };

  const handleEditPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setEditCurrentPts(p => p.length > 0 ? [...p, toEditPoint(e)] : p);
  };

  const handleEditPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as SVGElement).releasePointerCapture(e.pointerId);
    if (editCurrentPts.length < 2) { setEditCurrentPts([]); return; }
    const newStroke: Stroke = {
      points: editCurrentPts,
      width: 2,
      color: '#ffffff',
      timestamp: Date.now(),
    };
    editStrokesRef.current = [...editStrokesRef.current, newStroke];
    setEditStrokes([...editStrokesRef.current]);
    setEditCurrentPts([]);
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(() => commitEditRef.current(), 1800);
  };

  // Drag state
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startObjX: number;
    startObjY: number;
  } | null>(null);

  // Resize state
  const resizeRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startObjX: number;
    startObjY: number;
    startW: number;
    startH: number;
  } | null>(null);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onBodyPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (type === 'equation' && e.detail >= 2) {
      setIsEditingEq(true);
      editStrokesRef.current = [];
      setEditStrokes([]);
      return;
    }

    onSelect(id);

    // Connectors: select only, no drag
    if (type === 'connector') return;

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startObjX: position.x, startObjY: position.y,
    };

    // Long press → connection handles
    if (onConnectStart) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        dragRef.current = null;
        setShowConnHandles(true);
      }, 500);
    }
  }, [id, type, position.x, position.y, onSelect, onConnectStart]);

  const onBodyPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (longPressTimerRef.current && Math.hypot(dx, dy) > 5) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    onDrag(id, dragRef.current.startObjX + dx, dragRef.current.startObjY + dy);
  }, [id, onDrag]);

  const onBodyPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!dragRef.current) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    onDragEnd?.(id);
  }, [id, onDragEnd]);

  // ── Resize handlers ────────────────────────────────────────────────────────

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) => {
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startObjX: position.x,
      startObjY: position.y,
      startW: dimensions.width,
      startH: dimensions.height,
    };
  }, [position.x, position.y, dimensions.width, dimensions.height]);

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const r = resizeRef.current;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;

    let x = r.startObjX;
    let y = r.startObjY;
    let w = r.startW;
    let h = r.startH;

    const MIN = 40;

    switch (r.handle) {
      case 'se': w = Math.max(MIN, r.startW + dx); h = Math.max(MIN, r.startH + dy); break;
      case 's':  h = Math.max(MIN, r.startH + dy); break;
      case 'e':  w = Math.max(MIN, r.startW + dx); break;
      case 'nw':
        w = Math.max(MIN, r.startW - dx);
        h = Math.max(MIN, r.startH - dy);
        x = r.startObjX + (r.startW - w);
        y = r.startObjY + (r.startH - h);
        break;
      case 'n':
        h = Math.max(MIN, r.startH - dy);
        y = r.startObjY + (r.startH - h);
        break;
      case 'ne':
        w = Math.max(MIN, r.startW + dx);
        h = Math.max(MIN, r.startH - dy);
        y = r.startObjY + (r.startH - h);
        break;
      case 'sw':
        w = Math.max(MIN, r.startW - dx);
        h = Math.max(MIN, r.startH + dy);
        x = r.startObjX + (r.startW - w);
        break;
      case 'w':
        w = Math.max(MIN, r.startW - dx);
        x = r.startObjX + (r.startW - w);
        break;
    }

    onResize(id, x, y, w, h);
  }, [id, onResize]);

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    resizeRef.current = null;
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: dimensions.width,
    height: dimensions.height,
    boxSizing: 'border-box',
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
    pointerEvents: 'auto',
    outline: isSelected ? '1.5px dashed #3b82f6' : 'none',
    borderRadius: 4,
  };

  return (
    <div
      data-floating-object="true"
      style={containerStyle}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onPointerCancel={onBodyPointerUp}
    >
      {/* ── Content ── */}
      {(type === 'stroke' || type === 'shape') && svgData && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <path
            d={svgData}
            stroke={object.stroke ?? 'rgba(255,255,255,0.85)'}
            strokeWidth={object.strokeWidth ?? 2}
            fill={object.fill ?? 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {type === 'equation' && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, boxSizing: 'border-box', overflow: 'hidden',
        }}>
          {object.latexSource
            ? <div dangerouslySetInnerHTML={{
                __html: katex.renderToString(object.latexSource, {
                  throwOnError: false, displayMode: true, output: 'html',
                })
              }} />
            : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>∅</span>
          }
          {isEditingEq && (
            <svg
              ref={editSvgRef}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                background: 'rgba(15,15,20,0.92)', cursor: 'crosshair', zIndex: 10,
              }}
              onPointerDown={handleEditPointerDown}
              onPointerMove={handleEditPointerMove}
              onPointerUp={handleEditPointerUp}
              onPointerCancel={handleEditPointerUp}
            >
              {editStrokes.map(s => {
                const d = smoothPoints(s.points);
                return d ? (
                  <path key={s.timestamp} d={d}
                    stroke="#fff" strokeWidth={s.width}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null;
              })}
              {editCurrentPts.length > 1 && (
                <path d={smoothPoints(editCurrentPts) ?? ''}
                  stroke="#fff" strokeWidth={2}
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}
              <text x="50%" y="92%" textAnchor="middle"
                fill="rgba(255,255,255,0.4)" fontSize={10}>
                Dibuja la ecuación — se reconoce automáticamente
              </text>
              <text
                x="96%" y="8%" textAnchor="end"
                fill="rgba(255,255,255,0.6)" fontSize={14}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
                  editStrokesRef.current = [];
                  setEditStrokes([]);
                  setEditCurrentPts([]);
                  setIsEditingEq(false);
                }}
              >✕</text>
            </svg>
          )}
        </div>
      )}

      {type === 'ocr-scan' && (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
          {imageBase64 && (
            <img
              src={imageBase64}
              alt="OCR scan"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              draggable={false}
            />
          )}
          {ocrText && !imageBase64 && (
            <div style={{
              padding: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(15,15,30,0.6)',
              height: '100%',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {ocrText}
            </div>
          )}
        </div>
      )}

      {type === 'connector' && svgData && (
        <svg
          width="100%" height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            {object.arrowEnd && (
              <marker id={`ae-${id}`} viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={object.stroke ?? '#3B82F6'} />
              </marker>
            )}
            {object.arrowStart && (
              <marker id={`as-${id}`} viewBox="0 0 10 10" refX="1" refY="5"
                markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 10 0 L 0 5 L 10 10 z" fill={object.stroke ?? '#3B82F6'} />
              </marker>
            )}
          </defs>
          {/* wide transparent hit area */}
          <path d={svgData} stroke="transparent" strokeWidth={12} fill="none" />
          <path d={svgData}
            stroke={object.stroke ?? '#3B82F6'}
            strokeWidth={object.strokeWidth ?? 1.5}
            fill="none" strokeLinecap="round"
            markerEnd={object.arrowEnd ? `url(#ae-${id})` : undefined}
            markerStart={object.arrowStart ? `url(#as-${id})` : undefined}
          />
        </svg>
      )}

      {/* ── Selection UI ── */}
      {isSelected && (
        <>
          {/* Properties panel */}
          <div
            style={{
              position: 'absolute',
              bottom: position.y < 80 ? 'auto' : '100%',
              top: position.y < 80 ? '100%' : 'auto',
              marginBottom: position.y < 80 ? 0 : 6,
              marginTop: position.y < 80 ? 6 : 0,
              left: 0,
              background: 'rgba(15,15,20,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '8px 12px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              pointerEvents: 'auto',
              zIndex: 3,
              whiteSpace: 'nowrap',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Color palette */}
            <div style={{ display: 'flex', gap: 4 }}>
              {STROKE_COLORS.map(color => (
                <div
                  key={color}
                  onPointerDown={(e) => { e.stopPropagation(); onColorChange(id, color); }}
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: color,
                    border: object.stroke === color
                      ? '2px solid #fff'
                      : '1px solid rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* Stroke width slider */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'default',
            }}>
              Grosor
              <input
                type="range" min={1} max={10} step={0.5}
                value={object.strokeWidth ?? 2}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => onStrokeWidthChange(id, parseFloat(e.target.value))}
                style={{ width: 64, accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </label>

            {type !== 'equation' && (
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const hasFill = object.fill && object.fill !== 'none';
                  const newFill = hasFill
                    ? 'none'
                    : (object.stroke?.startsWith('#')
                        ? object.stroke + '33'
                        : 'rgba(255,255,255,0.2)');
                  onFillChange(id, newFill);
                }}
                style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: object.fill && object.fill !== 'none'
                    ? 'rgba(59,130,246,0.35)'
                    : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.85)',
                  flexShrink: 0,
                }}
              >
                {object.fill && object.fill !== 'none' ? 'Relleno' : 'Sin relleno'}
              </button>
            )}

            {type === 'equation' && (
              <input
                type="text"
                value={object.latexSource ?? ''}
                onChange={(e) => onLatexChange?.(id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="LaTeX…"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, color: 'white', fontSize: 11,
                  padding: '2px 6px', width: 140,
                  fontFamily: 'monospace', outline: 'none',
                }}
              />
            )}

            {type === 'connector' && (
              <div style={{ display: 'flex', gap: 4 }}>
                {([
                  { label: '—', s: false, e: false },
                  { label: '→', s: false, e: true },
                  { label: '←', s: true, e: false },
                  { label: '↔', s: true, e: true },
                ] as const).map(opt => (
                  <button
                    key={opt.label}
                    onPointerDown={(ev) => { ev.stopPropagation(); onArrowChange?.(id, opt.s, opt.e); }}
                    style={{
                      padding: '2px 6px', borderRadius: 5, fontSize: 13, cursor: 'pointer',
                      background: object.arrowStart === opt.s && object.arrowEnd === opt.e
                        ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Delete button */}
          <div
            style={{
              position: 'absolute',
              top: -24,
              right: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              fontSize: 11,
              color: '#fff',
              fontWeight: 700,
              lineHeight: 1,
            }}
            onPointerDown={(e) => { e.stopPropagation(); onDelete(id); }}
          >
            ✕
          </div>

          {/* Connection handles (long-press activated) */}
          {showConnHandles && onConnectStart && CONN_HANDLE_ANCHORS.map(({ handle, cx, cy }) => {
            const hx = cx(dimensions.width, dimensions.height);
            const hy = cy(dimensions.width, dimensions.height);
            const absX = position.x + hx;
            const absY = position.y + hy;
            return (
              <div
                key={handle}
                style={{
                  position: 'absolute',
                  left: hx - 5, top: hy - 5,
                  width: 10, height: 10,
                  borderRadius: '50%',
                  background: '#3B82F6',
                  border: '2px solid #fff',
                  cursor: 'crosshair',
                  zIndex: 4,
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
                  onConnectStart(id, handle, absX, absY);
                  setShowConnHandles(false);
                }}
                onPointerMove={(e) => { e.stopPropagation(); onConnectMove?.(e.clientX, e.clientY); }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
                  onConnectEnd?.(e.clientX, e.clientY);
                }}
                onPointerCancel={(e) => { e.stopPropagation(); onConnectEnd?.(e.clientX, e.clientY); }}
              />
            );
          })}

          {/* Resize handles — not for connectors */}
          {type !== 'connector' && HANDLES.map(h => (
            <div
              key={h.id}
              style={{
                position: 'absolute',
                top: h.top,
                left: h.left,
                transform: h.transform,
                width: 12,
                height: 12,
                borderRadius: 2,
                background: '#fff',
                border: '1.5px solid #3b82f6',
                cursor: h.cursor,
                zIndex: 2,
                touchAction: 'none',
              }}
              onPointerDown={(e) => onHandlePointerDown(e, h.id)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            />
          ))}
        </>
      )}
    </div>
  );
}
