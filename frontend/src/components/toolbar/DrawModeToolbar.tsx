import React, { useState } from 'react';
import { Undo2, Redo2, MoreHorizontal, Check, Hand, Settings } from 'lucide-react';
import type { DrawTool, DrawSettings, ShapeType } from './toolbarTypes';
import ToolPicker from './ToolPicker';
import ColorPicker from './ColorPicker';

interface Props {
  settings: DrawSettings;
  onSettingsChange: (s: DrawSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExit: () => void;
  onClearCanvas: () => void;
  onMinimize: () => void;
  onCopyAsImage: () => void;
}

const SHAPE_TYPES: { id: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'line',
    label: 'Línea',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Flecha',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
        <polyline points="10,4 20,4 20,14" />
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectángulo',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Círculo / Elipse',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'triangle',
    label: 'Triángulo',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L21 20 L3 20 Z" />
      </svg>
    ),
  },
];

function TBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 52, height: 52,
        borderRadius: 12,
        border: active ? '1px solid rgba(59,130,246,0.55)' : '1px solid transparent',
        background: active ? 'rgba(59,130,246,0.22)' : 'transparent',
        color: active ? '#93C5FD' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 150ms ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 2px' }} />;
}

export default function DrawModeToolbar({
  settings, onSettingsChange,
  onUndo, onRedo, canUndo, canRedo,
  onExit, onClearCanvas, onMinimize, onCopyAsImage,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const setTool = (tool: DrawTool) => onSettingsChange({ ...settings, tool });
  const setShapeType = (shapeType: ShapeType) => onSettingsChange({ ...settings, shapeType });

  const isShapeMode = settings.tool === 'shape';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', gap: 0 }}>

      {/* Shape sub-picker — shown only in shape mode */}
      {isShapeMode && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 10px',
            background: 'rgba(20,20,36,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 2, flexShrink: 0 }}>
            Figura
          </span>
          {SHAPE_TYPES.map(({ id, label, icon }) => {
            const isActive = settings.shapeType === id;
            return (
              <button
                key={id}
                title={label}
                onClick={() => setShapeType(id)}
                style={{
                  width: 52, height: 48,
                  borderRadius: 10,
                  border: isActive ? '1px solid rgba(139,92,246,0.7)' : '1px solid rgba(255,255,255,0.08)',
                  background: isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  flexShrink: 0,
                }}
              >
                {icon}
              </button>
            );
          })}

          {/* Separator */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 4px' }} />

          {/* Fill toggle */}
          <button
            title={settings.shapeFill ? 'Relleno: activado' : 'Relleno: desactivado'}
            onClick={() => onSettingsChange({ ...settings, shapeFill: !settings.shapeFill })}
            style={{
              width: 52, height: 48,
              borderRadius: 10,
              border: settings.shapeFill ? '1px solid rgba(139,92,246,0.7)' : '1px solid rgba(255,255,255,0.08)',
              background: settings.shapeFill ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
              color: settings.shapeFill ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 120ms ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill={settings.shapeFill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
            </svg>
          </button>

          {/* Color dot */}
          <div
            title="Color actual"
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: settings.color,
              border: '2px solid rgba(255,255,255,0.2)',
              flexShrink: 0, marginLeft: 2,
              opacity: settings.opacity,
            }}
          />

          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'rgba(139,92,246,0.7)', fontWeight: 600, flexShrink: 0 }}>
            {SHAPE_TYPES.find(s => s.id === settings.shapeType)?.label ?? 'Rectángulo'}
          </span>
        </div>
      )}

      {/* Main toolbar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', position: 'relative' }}>

        {/* ── Undo / Redo ── */}
        <TBtn onClick={onUndo} disabled={!canUndo} title="Deshacer">
          <Undo2 size={18} />
        </TBtn>
        <TBtn onClick={onRedo} disabled={!canRedo} title="Rehacer">
          <Redo2 size={18} />
        </TBtn>

        <Sep />

        {/* ── Tool picker ── */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ToolPicker
            activeTool={settings.tool}
            onToolSelect={setTool}
            onToolLongPress={() => setShowColorPicker(true)}
          />
        </div>

        <Sep />

        {/* ── Color dot ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { setShowColorPicker(p => !p); setShowMenu(false); setShowPenSettings(false); }}
            title="Color y grosor"
            style={{
              width: 44, height: 44,
              borderRadius: 10, border: '1px solid transparent',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: settings.color,
              border: '2px solid rgba(255,255,255,0.25)',
              opacity: settings.opacity,
              display: 'block',
            }} />
          </button>
          {showColorPicker && (
            <ColorPicker
              color={settings.color}
              width={settings.width}
              opacity={settings.opacity}
              onColorChange={c => onSettingsChange({ ...settings, color: c })}
              onWidthChange={w => onSettingsChange({ ...settings, width: w })}
              onOpacityChange={o => onSettingsChange({ ...settings, opacity: o })}
            />
          )}
        </div>

        <Sep />

        {/* ── Finger draw toggle (hidden in shape mode) ── */}
        {!isShapeMode && (
          <TBtn
            onClick={() => onSettingsChange({ ...settings, drawWithFinger: !settings.drawWithFinger })}
            active={settings.drawWithFinger}
            title="Dibujar con dedo"
          >
            <Hand size={17} />
          </TBtn>
        )}

        {/* ── Pen settings ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <TBtn onClick={() => { setShowPenSettings(p => !p); setShowColorPicker(false); setShowMenu(false); }} title="Ajustes lápiz">
            <Settings size={16} />
          </TBtn>
          {showPenSettings && (
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
                background: 'rgba(16,16,24,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '14px 16px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
                minWidth: 220,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Ajustes lápiz
              </span>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Palm rejection</span>
                <div
                  onClick={() => onSettingsChange({ ...settings, palmRejection: !settings.palmRejection })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '8px 10px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: settings.palmRejection ? '#3B82F6' : 'rgba(255,255,255,0.15)',
                    position: 'relative', transition: 'background 200ms',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2,
                      left: settings.palmRejection ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', transition: 'left 200ms',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                    {settings.palmRejection ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* ── More menu ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <TBtn onClick={() => { setShowMenu(p => !p); setShowColorPicker(false); setShowPenSettings(false); }} active={showMenu} title="Más opciones">
            <MoreHorizontal size={16} />
          </TBtn>
          {showMenu && (
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
                background: 'rgba(16,16,24,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '8px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: 2,
                minWidth: 190,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              {[
                { label: 'Copiar como imagen', icon: '📋', action: () => { onCopyAsImage(); setShowMenu(false); } },
                { label: 'Limpiar canvas', icon: '🗑️', action: () => { onClearCanvas(); setShowMenu(false); } },
                { label: 'Minimizar toolbar', icon: '↓', action: () => { onMinimize(); setShowMenu(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9,
                    border: 'none', background: 'transparent',
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13,
                    transition: 'background 100ms',
                  }}
                  onPointerEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Exit draw mode ── */}
        <button
          onClick={onExit}
          title="Salir del modo dibujo"
          style={{
            height: 34, padding: '0 12px',
            borderRadius: 9,
            border: '1px solid rgba(59,130,246,0.4)',
            background: 'rgba(59,130,246,0.15)',
            color: '#93C5FD',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            flexShrink: 0,
            transition: 'all 150ms ease',
          }}
        >
          <Check size={14} />
          Listo
        </button>

        {/* Close pickers on outside click */}
        {(showColorPicker || showMenu || showPenSettings) && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onPointerDown={() => { setShowColorPicker(false); setShowMenu(false); setShowPenSettings(false); }}
          />
        )}
      </div>
    </div>
  );
}
