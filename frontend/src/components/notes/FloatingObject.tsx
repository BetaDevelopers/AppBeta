import React, { useRef, useCallback } from 'react';
import type { FloatingObject, ResizeHandle } from '../../types/canvas';

interface FloatingObjectProps {
  object: FloatingObject;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onStrokeWidthChange: (id: string, width: number) => void;
  onFillChange: (id: string, fill: string) => void;
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

export default function FloatingObjectComponent({
  object,
  onDrag,
  onSelect,
  onResize,
  onDelete,
  onColorChange,
  onStrokeWidthChange,
  onFillChange,
}: FloatingObjectProps) {
  const { id, position, dimensions, isSelected, svgData, imageBase64, ocrText, type } = object;

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
    // Only primary button / stylus
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(id);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startObjX: position.x,
      startObjY: position.y,
    };
  }, [id, position.x, position.y, onSelect]);

  const onBodyPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    onDrag(id, dragRef.current.startObjX + dx, dragRef.current.startObjY + dy);
  }, [id, onDrag]);

  const onBodyPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

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

            {/* Fill toggle */}
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

          {/* Resize handles */}
          {HANDLES.map(h => (
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
