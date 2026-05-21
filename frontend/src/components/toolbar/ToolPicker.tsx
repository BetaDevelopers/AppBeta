import React, { useRef } from 'react';
import type { DrawTool } from './toolbarTypes';

const TOOLS: { id: DrawTool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'pencil',
    label: 'Lápiz',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="2" x2="22" y2="6" />
        <path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z" />
        <line x1="2" y1="22" x2="7" y2="17" />
      </svg>
    ),
  },
  {
    id: 'pen',
    label: 'Bolígrafo',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    id: 'marker',
    label: 'Marcador',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17L17 3l4 4L11 21H7l-4-4z" />
        <line x1="14" y1="6" x2="18" y2="10" />
        <line x1="7" y1="17" x2="3" y2="21" />
      </svg>
    ),
  },
  {
    id: 'fountain',
    label: 'Pluma',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C9 6 4 10 4 15a8 8 0 0 0 16 0c0-5-5-9-8-13z" />
        <line x1="12" y1="15" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Goma',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16l10-10 7 7-3 3" />
        <line x1="7" y1="20" x2="3" y2="16" />
      </svg>
    ),
  },
  {
    id: 'ruler',
    label: 'Regla',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="8" width="20" height="8" rx="2" />
        <line x1="6" y1="8" x2="6" y2="12" />
        <line x1="10" y1="8" x2="10" y2="11" />
        <line x1="14" y1="8" x2="14" y2="12" />
        <line x1="18" y1="8" x2="18" y2="11" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Texto',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="12" y1="7" x2="12" y2="20" />
      </svg>
    ),
  },
];

interface Props {
  activeTool: DrawTool;
  onToolSelect: (t: DrawTool) => void;
  onToolLongPress: (t: DrawTool, rect: DOMRect) => void;
}

export default function ToolPicker({ activeTool, onToolSelect, onToolLongPress }: Props) {
  const timers = useRef<Map<DrawTool, ReturnType<typeof setTimeout>>>(new Map());

  const handleDown = (tool: DrawTool) => (e: React.PointerEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const timer = setTimeout(() => {
      onToolLongPress(tool, btn.getBoundingClientRect());
    }, 300);
    timers.current.set(tool, timer);
  };

  const handleUp = (tool: DrawTool) => () => {
    const t = timers.current.get(tool);
    if (t !== undefined) {
      clearTimeout(t);
      timers.current.delete(tool);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
      {TOOLS.map(({ id, label, icon }) => {
        const isActive = id === activeTool;
        return (
          <button
            key={id}
            title={label}
            onClick={() => onToolSelect(id)}
            onPointerDown={handleDown(id)}
            onPointerUp={handleUp(id)}
            onPointerLeave={handleUp(id)}
            style={{
              width: 44, height: 44,
              borderRadius: 10,
              border: isActive ? '1px solid rgba(59,130,246,0.6)' : '1px solid transparent',
              background: isActive ? 'rgba(59,130,246,0.22)' : 'transparent',
              color: isActive ? '#93C5FD' : 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
