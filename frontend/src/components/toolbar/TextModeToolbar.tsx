import React, { useState, useRef } from 'react';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Mic, MicOff, Keyboard, Pencil, MoreHorizontal,
} from 'lucide-react';
import { useMathToolsStore } from '../../store/mathToolsStore';

const TEXT_COLORS = ['#FFFFFF', '#94A3B8', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#000000'];

const EMOJI_GRID = [
  '😀','😂','🥹','😍','🤩','😎','🤓','😤','🥳','😴','🤯','🫶',
  '❤️','💙','💚','💛','🧡','💜','🖤','🤍','💯','✅','❌','⭐',
  '👍','👎','👏','🙌','🤝','✌️','🫡','💪','🎉','🎊','🎈','🎯',
  '📚','📖','✏️','📝','💡','🔬','🧠','🎨','🚀','⚡','🔥','💎',
];

const LANGUAGES = [
  { code: 'es-ES', label: 'Español',   flag: '🇪🇸', short: 'ES' },
  { code: 'ca-ES', label: 'Català',    flag: '🏔',  short: 'CA' },
  { code: 'en-US', label: 'English',   flag: '🇬🇧', short: 'EN' },
  { code: 'fr-FR', label: 'Français',  flag: '🇫🇷', short: 'FR' },
  { code: 'de-DE', label: 'Deutsch',   flag: '🇩🇪', short: 'DE' },
  { code: 'pt-PT', label: 'Português', flag: '🇵🇹', short: 'PT' },
];

interface Props {
  editor: any;
  lang: string;
  onLangChange: (l: string) => void;
  onEnterDrawMode: () => void;
  onAddImage: () => void;
  onAddTable: () => void;
  onAddSticker: () => void;
  onAddSignature: () => void;
  onScanDocument: () => void;
  onOpenFormula: () => void;
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  isVoiceSupported: boolean;
}

function TBtn({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 38, height: 38,
        borderRadius: 9,
        border: active ? '1px solid rgba(59,130,246,0.55)' : '1px solid transparent',
        background: active ? 'rgba(59,130,246,0.22)' : 'transparent',
        color: active ? '#93C5FD' : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.13)', flexShrink: 0, margin: '0 2px' }} />;
}

function LangButton({ lang, onLangChange }: { lang: string; onLangChange: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(p => !p)}
        title="Idioma"
        style={{
          height: 38, padding: '0 8px',
          borderRadius: 9,
          border: open ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
          background: open ? 'rgba(59,130,246,0.12)' : 'transparent',
          color: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', gap: 4,
          cursor: 'pointer', fontSize: 13, fontWeight: 700,
          flexShrink: 0,
          transition: 'all 150ms ease',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>🌐</span>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em' }}>{current.short}</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onPointerDown={() => setOpen(false)}
          />
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
              background: 'rgba(16,16,24,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '8px',
              backdropFilter: 'blur(20px)',
              zIndex: 200,
              display: 'flex', flexDirection: 'column', gap: 2,
              minWidth: 160,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { onLangChange(l.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 9,
                  border: 'none',
                  background: l.code === lang ? 'rgba(59,130,246,0.18)' : 'transparent',
                  color: l.code === lang ? '#93C5FD' : 'rgba(255,255,255,0.75)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  transition: 'background 100ms',
                }}
                onPointerEnter={e => {
                  if (l.code !== lang) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                }}
                onPointerLeave={e => {
                  if (l.code !== lang) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                <span style={{ fontWeight: l.code === lang ? 700 : 400 }}>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TextModeToolbar({
  editor,
  lang,
  onLangChange,
  onEnterDrawMode,
  onAddImage,
  onAddTable,
  onAddSticker,
  onAddSignature,
  onScanDocument,
  onOpenFormula,
  isVoiceListening,
  onToggleVoice,
  isVoiceSupported,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const { openTool } = useMathToolsStore();

  if (!editor) return null;

  const closeAll = () => {
    setShowColorPicker(false);
    setShowFontPicker(false);
    setShowEmojiPicker(false);
    setShowMenu(false);
  };

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  };

  const focusKeyboard = () => {
    editor.commands.focus();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', position: 'relative' }}>

      {/* ── Idioma (fijo izquierda, fuera del scroll) ── */}
      <LangButton lang={lang} onLangChange={onLangChange} />
      <Sep />

      {/* ── Left scrollable zone ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        flex: 1, overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>

        {/* Font picker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { setShowFontPicker(p => !p); setShowColorPicker(false); setShowEmojiPicker(false); }}
            style={{
              height: 38, padding: '0 10px',
              borderRadius: 9, border: '1px solid transparent',
              background: 'transparent',
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              letterSpacing: '-0.02em',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            title="Fuente"
          >
            Aa
          </button>
          {showFontPicker && (
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
                background: 'rgba(16,16,24,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '10px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: 4,
                minWidth: 160,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              {[
                { label: 'Sans', family: 'ui-sans-serif, system-ui, sans-serif' },
                { label: 'Serif', family: 'ui-serif, Georgia, serif' },
                { label: 'Mono', family: 'ui-monospace, monospace' },
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => {
                    editor.chain().focus().setMark('textStyle', { fontFamily: f.family }).run();
                    setShowFontPicker(false);
                  }}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: f.family, fontSize: 14,
                    transition: 'background 100ms',
                  }}
                  onPointerEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* B I U */}
        <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
          <Bold size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
          <Italic size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado">
          <Underline size={14} />
        </TBtn>

        {/* Text color */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            ref={colorBtnRef}
            onClick={() => { setShowColorPicker(p => !p); setShowFontPicker(false); setShowEmojiPicker(false); }}
            title="Color de texto"
            style={{
              width: 38, height: 38,
              borderRadius: 9, border: '1px solid transparent',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', gap: 3, flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', lineHeight: 1, fontFamily: 'system-ui' }}>A</span>
            <span style={{
              width: 16, height: 3, borderRadius: 2,
              background: editor.getAttributes('textStyle').color || '#ffffff',
            }} />
          </button>
          {showColorPicker && (
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
                background: 'rgba(16,16,24,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '12px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: c, border: '2px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* H1 H2 H3 */}
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 size={14} />
        </TBtn>

        <Sep />

        {/* Lists */}
        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
          <List size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered size={15} />
        </TBtn>

        <Sep />

        {/* Align */}
        <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Izquierda">
          <AlignLeft size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centro">
          <AlignCenter size={14} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Derecha">
          <AlignRight size={14} />
        </TBtn>
      </div>

      <Sep />

      {/* ── Right fixed zone ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>

        {/* Voice */}
        {isVoiceSupported && (
          <div style={{ position: 'relative' }}>
            <TBtn onClick={onToggleVoice} active={isVoiceListening} title={isVoiceListening ? 'Parar dictado' : 'Dictado por voz'}>
              {isVoiceListening ? <MicOff size={15} /> : <Mic size={15} />}
            </TBtn>
            {isVoiceListening && (
              <span style={{
                position: 'absolute', inset: -2,
                borderRadius: 11,
                border: '2px solid #EF4444',
                animation: 'voice-ring 1s ease infinite',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        )}

        {/* Emoji */}
        <div style={{ position: 'relative' }}>
          <TBtn onClick={() => { setShowEmojiPicker(p => !p); setShowFontPicker(false); setShowColorPicker(false); }} title="Emoji">
            <span style={{ fontSize: 17, lineHeight: 1 }}>😊</span>
          </TBtn>
          {showEmojiPicker && (
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', right: 0,
                background: 'rgba(16,16,24,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '12px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
                display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
                width: 280,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              {EMOJI_GRID.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  style={{
                    width: 30, height: 30,
                    borderRadius: 6, border: 'none',
                    background: 'transparent',
                    fontSize: 19, cursor: 'pointer',
                    transition: 'background 100ms',
                  }}
                  onPointerEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Force keyboard */}
        <TBtn onClick={focusKeyboard} title="Abrir teclado">
          <Keyboard size={15} />
        </TBtn>

        {/* Draw mode */}
        <TBtn onClick={onEnterDrawMode} title="Modo dibujo">
          <Pencil size={15} />
        </TBtn>

        {/* More menu */}
        <div style={{ position: 'relative' }}>
          <TBtn onClick={() => setShowMenu(p => !p)} active={showMenu} title="Más opciones">
            <MoreHorizontal size={15} />
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
                { label: 'Insertar fórmula', icon: '∑', action: () => { onOpenFormula(); setShowMenu(false); } },
                { label: 'Geometría', icon: '△', action: () => { openTool('geometry'); setShowMenu(false); } },
                { label: 'Gráfico de datos', icon: '📈', action: () => { openTool('tableToChart'); setShowMenu(false); } },
                { label: 'OCR Express', icon: '📷', action: () => { openTool('smartCamera'); setShowMenu(false); } },
                { label: 'Añadir imagen', icon: '🖼️', action: () => { onAddImage(); setShowMenu(false); } },
                { label: 'Añadir tabla', icon: '⬜', action: () => { onAddTable(); setShowMenu(false); } },
                { label: 'Añadir sticker', icon: '😊', action: () => { onAddSticker(); setShowMenu(false); } },
                { label: 'Añadir firma', icon: '✍️', action: () => { onAddSignature(); setShowMenu(false); } },
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
                  <span style={{ fontSize: 17 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Close pickers on outside click */}
      {(showColorPicker || showFontPicker || showEmojiPicker || showMenu) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onPointerDown={closeAll}
        />
      )}

      <style>{`
        @keyframes voice-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
