import React, { useState, useRef, useCallback } from 'react';
import type { FloatingObject } from '../../types/canvas';
import type { InkCanvasRef } from '../notes/InkCanvas';
import type { RulerState } from './RulerOverlay';
import type { DrawSettings } from './toolbarTypes';
import TextModeToolbar from './TextModeToolbar';
import DrawModeToolbar from './DrawModeToolbar';
import StickerPicker from './StickerPicker';
import SignatureModal from './SignatureModal';
import { useVoiceInput } from '../../hooks/useVoiceInput';

export type { DrawTool, DrawSettings } from './toolbarTypes';
export type { RulerState } from './RulerOverlay';

interface Props {
  editor: any;
  inkMode: boolean;
  setInkMode: (v: boolean) => void;
  inkCanvasRef: React.RefObject<InkCanvasRef | null>;
  onAddFloatingObject: (obj: Omit<FloatingObject, 'id' | 'isSelected' | 'rotation'>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  drawSettings: DrawSettings;
  onDrawSettingsChange: (s: DrawSettings) => void;
  rulerState: RulerState;
  onRulerStateChange: (r: RulerState) => void;
  rulerActive: boolean;
  onRulerActiveChange: (v: boolean) => void;
}

/** Floating minimized pill shown when toolbar is collapsed. */
function MinimizedPill({
  color, tool, onExpand,
}: {
  color: string; tool: string; onExpand: () => void;
}) {
  const pos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const [style, setStyle] = useState<React.CSSProperties>({ right: 16, bottom: 16 });

  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isDragging.current = false;
    pos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const dx = e.clientX - pos.current.x;
    const dy = e.clientY - pos.current.y;
    if (!isDragging.current && Math.hypot(dx, dy) > 4) isDragging.current = true;
    if (!isDragging.current) return;
    pos.current = { x: e.clientX, y: e.clientY };
    setStyle(prev => ({
      right: typeof prev.right === 'number' ? Math.max(0, prev.right - dx) : 16,
      bottom: typeof prev.bottom === 'number' ? Math.max(0, prev.bottom - dy) : 16,
    }));
  };

  const handleUp = () => {
    if (!isDragging.current) onExpand();
    isDragging.current = false;
  };

  return (
    <button
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      style={{
        position: 'fixed',
        ...style,
        zIndex: 1000,
        width: 56, height: 28,
        borderRadius: 14,
        background: 'rgba(12,12,18,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px',
        cursor: 'grab',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        touchAction: 'none',
      }}
    >
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: color,
        border: '1.5px solid rgba(255,255,255,0.2)',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        {tool.slice(0, 3)}
      </span>
    </button>
  );
}

export default function BottomToolbar({
  editor, inkMode, setInkMode,
  inkCanvasRef,
  onAddFloatingObject,
  onUndo, onRedo, canUndo, canRedo,
  drawSettings, onDrawSettingsChange,
  rulerState, onRulerStateChange,
  rulerActive, onRulerActiveChange,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');

  // Voice input: insert final results in Tiptap, show interim only in the indicator
  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    if (!editor) return;
    if (isFinal) {
      editor.chain().focus().insertContent(text + ' ').run();
      setVoiceInterim('');
    } else {
      setVoiceInterim(text);
    }
  }, [editor]);

  const { isListening, isSupported, toggle: toggleVoice } = useVoiceInput(handleVoiceResult);

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = re => {
        editor?.chain().focus().setImage({ src: re.target?.result as string }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAddSticker = (emoji: string) => {
    onAddFloatingObject({
      type: 'sticker',
      position: { x: 100, y: 100 },
      dimensions: { width: 80, height: 80 },
      stickerEmoji: emoji,
    });
  };

  const handleAddSignature = (base64: string) => {
    onAddFloatingObject({
      type: 'image',
      position: { x: 80, y: 80 },
      dimensions: { width: 300, height: 150 },
      imageBase64: base64,
    });
  };

  const handleCopyAsImage = async () => {
    if (!inkCanvasRef.current) return;
    const dataUrl = await inkCanvasRef.current.captureCanvas();
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch { /* clipboard API not available */ }
  };

  const handleClearCanvas = () => {
    inkCanvasRef.current?.clearStrokes();
  };

  if (isMinimized) {
    return (
      <MinimizedPill
        color={drawSettings.color}
        tool={drawSettings.tool}
        onExpand={() => setIsMinimized(false)}
      />
    );
  }

  return (
    <>
      {/* Sticker picker overlay */}
      {showStickers && (
        <StickerPicker
          onSelect={handleAddSticker}
          onClose={() => setShowStickers(false)}
        />
      )}

      {/* Signature modal */}
      {showSignature && (
        <SignatureModal
          onInsert={handleAddSignature}
          onClose={() => setShowSignature(false)}
        />
      )}

      {/* Voice interim text indicator */}
      {isListening && voiceInterim && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(12,12,18,0.9)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '6px 14px',
          fontSize: 13, color: 'rgba(255,255,255,0.55)',
          pointerEvents: 'none', zIndex: 50,
          backdropFilter: 'blur(10px)',
          maxWidth: '80%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {voiceInterim}
        </div>
      )}

      {/* Main toolbar */}
      <div
        style={{
          height: 56,
          background: 'rgba(12,12,18,0.96)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingLeft: 8,
          paddingRight: 8,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          position: 'relative',
        }}
      >
        {inkMode ? (
          <DrawModeToolbar
            settings={drawSettings}
            onSettingsChange={s => {
              // ruler tool toggles the overlay
              if (s.tool === 'ruler') {
                onRulerActiveChange(!rulerActive);
                onDrawSettingsChange({ ...s, tool: drawSettings.tool === 'ruler' ? 'pencil' : 'ruler' });
                return;
              }
              onDrawSettingsChange(s);
            }}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onExit={() => setInkMode(false)}
            onClearCanvas={handleClearCanvas}
            onMinimize={() => setIsMinimized(true)}
            onCopyAsImage={handleCopyAsImage}
          />
        ) : (
          <TextModeToolbar
            editor={editor}
            onEnterDrawMode={() => setInkMode(true)}
            onAddImage={handleAddImage}
            onAddTable={handleAddTable}
            onAddSticker={() => setShowStickers(true)}
            onAddSignature={() => setShowSignature(true)}
            onScanDocument={() => window.dispatchEvent(new CustomEvent('open-math-vision'))}
            isVoiceListening={isListening}
            onToggleVoice={toggleVoice}
            isVoiceSupported={isSupported}
          />
        )}
      </div>
    </>
  );
}
