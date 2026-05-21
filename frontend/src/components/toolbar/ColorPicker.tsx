import React from 'react';

const COLORS = [
  '#FFFFFF', '#000000', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F9A8D4', '#FCD34D',
  '#86EFAC', '#93C5FD', '#C4B5FD', '#FCA5A5',
];

interface Props {
  color: string;
  width: number;
  opacity: number;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
  onOpacityChange: (o: number) => void;
}

export default function ColorPicker({
  color, width, opacity,
  onColorChange, onWidthChange, onOpacityChange,
}: Props) {
  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(18,18,26,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '14px 16px',
        width: 252,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 300,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Color grid 8×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            style={{
              width: 24, height: 24,
              borderRadius: '50%',
              background: c,
              border: c === color ? '2px solid #3B82F6' : '2px solid rgba(255,255,255,0.15)',
              outline: c === color ? '2px solid rgba(59,130,246,0.35)' : 'none',
              cursor: 'pointer',
              transition: 'transform 100ms',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Width slider */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Grosor · {width}px
        </span>
        <input
          type="range" min={1} max={20} value={width}
          onChange={e => onWidthChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3B82F6' }}
        />
      </label>

      {/* Opacity slider */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Opacidad · {Math.round(opacity * 100)}%
        </span>
        <input
          type="range" min={20} max={100} value={Math.round(opacity * 100)}
          onChange={e => onOpacityChange(Number(e.target.value) / 100)}
          style={{ width: '100%', accentColor: '#3B82F6' }}
        />
      </label>
    </div>
  );
}
