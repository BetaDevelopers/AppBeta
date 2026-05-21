import React, { useState } from 'react';
import { Undo2, Redo2, MoreHorizontal, Check, Hand, Settings } from 'lucide-react';
import type { DrawTool, DrawSettings } from './toolbarTypes';
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
        width: 44, height: 44,
        borderRadius: 10,
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

  const handleToolLongPress = (_tool: DrawTool) => {
    setShowColorPicker(true);
  };

  return (
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
          onToolLongPress={handleToolLongPress}
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

      {/* ── Finger draw toggle ── */}
      <TBtn
        onClick={() => onSettingsChange({ ...settings, drawWithFinger: !settings.drawWithFinger })}
        active={settings.drawWithFinger}
        title="Dibujar con dedo"
      >
        <Hand size={17} />
      </TBtn>

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

      {/* Close color picker on outside click */}
      {(showColorPicker || showMenu || showPenSettings) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onPointerDown={() => { setShowColorPicker(false); setShowMenu(false); setShowPenSettings(false); }}
        />
      )}
    </div>
  );
}
