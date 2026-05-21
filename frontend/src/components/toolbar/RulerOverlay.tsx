import React, { useState, useRef, useCallback } from 'react';

export interface RulerState {
  ax: number; ay: number;
  bx: number; by: number;
}

/** Projects point (px,py) onto segment (ax,ay)→(bx,by). Returns snapped position + distance. */
export function projectPointOnLine(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): { x: number; y: number; dist: number } {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay, dist: Math.hypot(px - ax, py - ay) };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx, cy = ay + t * dy;
  return { x: cx, y: cy, dist: Math.hypot(px - cx, py - cy) };
}

interface Props {
  ruler: RulerState;
  onChange: (r: RulerState) => void;
}

export default function RulerOverlay({ ruler, onChange }: Props) {
  const dragging = useRef<'a' | 'b' | null>(null);
  const { ax, ay, bx, by } = ruler;

  const angle = Math.atan2(by - ay, bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  const ticks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let d = 0; d <= len; d += 50) {
    const cx = ax + Math.cos(angle) * d;
    const cy = ay + Math.sin(angle) * d;
    const h = d % 200 === 0 ? 9 : d % 100 === 0 ? 6 : 4;
    ticks.push({
      x1: cx + perpX * h, y1: cy + perpY * h,
      x2: cx - perpX * h, y2: cy - perpY * h,
    });
  }

  const handleHandleDown = (handle: 'a' | 'b') => (e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = handle;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const svg = (e.currentTarget as SVGElement).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging.current === 'a') onChange({ ...ruler, ax: x, ay: y });
    else onChange({ ...ruler, bx: x, by: y });
  }, [ruler, onChange]);

  const handleUp = useCallback(() => { dragging.current = null; }, []);

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 10, overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {/* Ruler body */}
      <line x1={ax} y1={ay} x2={bx} y2={by}
        stroke="rgba(251,191,36,0.55)" strokeWidth={2} strokeDasharray="5,3" />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(251,191,36,0.4)" strokeWidth={1} />
      ))}

      {/* Handle A */}
      <circle
        cx={ax} cy={ay} r={10}
        fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth={1.5}
        style={{ pointerEvents: 'all', cursor: 'grab' }}
        onPointerDown={handleHandleDown('a')}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      />

      {/* Handle B */}
      <circle
        cx={bx} cy={by} r={10}
        fill="rgba(251,191,36,0.15)" stroke="rgba(251,191,36,0.8)" strokeWidth={1.5}
        style={{ pointerEvents: 'all', cursor: 'grab' }}
        onPointerDown={handleHandleDown('b')}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      />
    </svg>
  );
}
