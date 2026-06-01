import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Mic, MicOff, Keyboard, Pencil, MoreHorizontal,
} from 'lucide-react';

const TEXT_COLORS = ['#FFFFFF', '#94A3B8', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#000000'];

const EMOJI_GRID = [
  '😀','😂','🥹','😍','🤩','😎','🤓','😤','🥳','😴','🤯','🫶',
  '❤️','💙','💚','💛','🧡','💜','🖤','🤍','💯','✅','❌','⭐',
  '👍','👎','👏','🙌','🤝','✌️','🫡','💪','🎉','🎊','🎈','🎯',
  '📚','📖','✏️','📝','💡','🔬','🧠','🎨','🚀','⚡','🔥','💎',
];

<<<<<<< HEAD
const VOICE_LANGS = [
  { code: 'auto', flag: '🌐', label: 'Auto',     bcp: 'auto' },
  { code: 'es',   flag: '🇪🇸', label: 'Español',  bcp: 'es-ES' },
  { code: 'en',   flag: '🇬🇧', label: 'English',  bcp: 'en-US' },
  { code: 'fr',   flag: '🇫🇷', label: 'Français', bcp: 'fr-FR' },
  { code: 'de',   flag: '🇩🇪', label: 'Deutsch',  bcp: 'de-DE' },
  { code: 'it',   flag: '🇮🇹', label: 'Italiano', bcp: 'it-IT' },
  { code: 'pt',   flag: '🇵🇹', label: 'Português',bcp: 'pt-PT' },
  { code: 'ca',   flag: '🏴',  label: 'Català',   bcp: 'ca-ES' },
  { code: 'zh',   flag: '🇨🇳', label: '中文',     bcp: 'zh-CN' },
  { code: 'ja',   flag: '🇯🇵', label: '日本語',   bcp: 'ja-JP' },
  { code: 'ko',   flag: '🇰🇷', label: '한국어',   bcp: 'ko-KR' },
  { code: 'ar',   flag: '🇸🇦', label: 'العربية',  bcp: 'ar-SA' },
];

=======
>>>>>>> parent of 7d49d8a0 (push 2)
interface Props {
  editor: any;
  onEnterDrawMode: () => void;
  onAddImage: () => void;
  onAddTable: () => void;
  onAddSticker: () => void;
  onAddSignature: () => void;
  onScanDocument: () => void;
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  isVoiceSupported: boolean;
  voiceLang: string;
  onVoiceLangChange: (lang: string) => void;
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
<<<<<<< HEAD
        width: 48, height: 48,
        borderRadius: 11,
=======
        width: 40, height: 40,
        borderRadius: 9,
>>>>>>> parent of 7d49d8a0 (push 2)
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
  return <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />;
}

export default function TextModeToolbar({
  editor,
  onEnterDrawMode,
  onAddImage,
  onAddTable,
  onAddSticker,
  onAddSignature,
  onScanDocument,
  isVoiceListening,
  onToggleVoice,
  isVoiceSupported,
  voiceLang,
  onVoiceLangChange,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
<<<<<<< HEAD
  const [showLangPicker, setShowLangPicker] = useState(false);

  const closeAll = () => {
    setShowColorPicker(false); setShowFontPicker(false);
    setShowEmojiPicker(false); setShowMenu(false); setShowLangPicker(false);
  };
  const anyOpen = showColorPicker || showFontPicker || showEmojiPicker || showMenu || showLangPicker;
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anyOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('pointerdown', handleOutside, true);
    return () => document.removeEventListener('pointerdown', handleOutside, true);
  }, [anyOpen]);

  // Helper: find display info for current voiceLang
  const activeLang = VOICE_LANGS.find(l => (l.bcp === 'auto' ? 'auto' : l.bcp) === voiceLang) ?? VOICE_LANGS[0];


  if (!editor) return null;

=======

  const colorBtnRef = useRef<HTMLButtonElement>(null);

  if (!editor) return null;

>>>>>>> parent of 7d49d8a0 (push 2)
  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  };

  const focusKeyboard = () => {
    editor.commands.focus();
  };

  return (
<<<<<<< HEAD
    <div ref={toolbarRef} style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', position: 'relative' }}>
=======
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', position: 'relative' }}>
>>>>>>> parent of 7d49d8a0 (push 2)
      {/* ── Left scrollable zone ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>

        {/* Font picker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { const next = !showFontPicker; closeAll(); setShowFontPicker(next); }}
            style={{
              height: 40, padding: '0 10px',
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
          <Bold size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
          <Italic size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado">
          <Underline size={15} />
        </TBtn>

        {/* Text color */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { const next = !showColorPicker; closeAll(); setShowColorPicker(next); }}
            title="Color de texto"
            style={{
              width: 40, height: 40,
              borderRadius: 9, border: '1px solid transparent',
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', gap: 3, flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', lineHeight: 1, fontFamily: 'system-ui' }}>A</span>
            <span style={{
              width: 18, height: 3, borderRadius: 2,
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
          <Heading1 size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 size={15} />
        </TBtn>

        <Sep />

        {/* Lists */}
        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
          <List size={16} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered size={16} />
        </TBtn>

        <Sep />

        {/* Align */}
        <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Izquierda">
          <AlignLeft size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centro">
          <AlignCenter size={15} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Derecha">
          <AlignRight size={15} />
        </TBtn>
      </div>

      <Sep />

      {/* ── Right fixed zone ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>

        {/* Voice + Language picker */}
        {isVoiceSupported && (
<<<<<<< HEAD
          <>
            {/* Language dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { const next = !showLangPicker; closeAll(); setShowLangPicker(next); }}
                title="Idioma del dictado"
                style={{
                  height: 40, padding: '0 8px',
                  borderRadius: 9, border: showLangPicker ? '1px solid rgba(59,130,246,0.55)' : '1px solid transparent',
                  background: showLangPicker ? 'rgba(59,130,246,0.22)' : 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  cursor: 'pointer', fontSize: 15, flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16 }}>{activeLang.flag}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{activeLang.label}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showLangPicker && (
                <div
                  onPointerDown={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                    background: 'rgba(14,14,22,0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: 4,
                    backdropFilter: 'blur(20px)',
                    zIndex: 300, minWidth: 160,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    maxHeight: 320, overflowY: 'auto',
                  }}
                >
                  {VOICE_LANGS.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { onVoiceLangChange(lang.bcp === 'auto' ? 'auto' : lang.bcp); setShowLangPicker(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                        background: (lang.bcp === 'auto' ? 'auto' : lang.bcp) === voiceLang
                          ? 'rgba(59,130,246,0.2)' : 'transparent',
                        border: 'none', color: '#e2e8f0',
                        fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                      }}
                      onPointerEnter={e => { if ((lang.bcp === 'auto' ? 'auto' : lang.bcp) !== voiceLang) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                      onPointerLeave={e => { if ((lang.bcp === 'auto' ? 'auto' : lang.bcp) !== voiceLang) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 16 }}>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mic button */}
            <div style={{ position: 'relative' }}>
              <TBtn onClick={onToggleVoice} active={isVoiceListening} title={isVoiceListening ? 'Parar dictado' : 'Dictado por voz'}>
                {isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
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
          </>
=======
          <div style={{ position: 'relative' }}>
            <TBtn onClick={onToggleVoice} active={isVoiceListening} title={isVoiceListening ? 'Parar dictado' : 'Dictado por voz'}>
              {isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
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
>>>>>>> parent of 7d49d8a0 (push 2)
        )}

        {/* Emoji */}
        <div style={{ position: 'relative' }}>
<<<<<<< HEAD
          <TBtn onClick={() => { const next = !showEmojiPicker; closeAll(); setShowEmojiPicker(next); }} title="Emoji">
=======
          <TBtn onClick={() => { setShowEmojiPicker(p => !p); setShowFontPicker(false); setShowColorPicker(false); }} title="Emoji">
>>>>>>> parent of 7d49d8a0 (push 2)
            <span style={{ fontSize: 18, lineHeight: 1 }}>😊</span>
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
                    fontSize: 20, cursor: 'pointer',
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
          <Keyboard size={16} />
        </TBtn>

        {/* Draw mode */}
        <TBtn onClick={onEnterDrawMode} title="Modo dibujo">
          <Pencil size={16} />
        </TBtn>

        {/* More menu */}
        <div style={{ position: 'relative' }}>
<<<<<<< HEAD
          <TBtn onClick={() => { const next = !showMenu; closeAll(); setShowMenu(next); }} active={showMenu} title="Más opciones">
=======
          <TBtn onClick={() => setShowMenu(p => !p)} active={showMenu} title="Más opciones">
>>>>>>> parent of 7d49d8a0 (push 2)
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
                { label: 'Añadir imagen', icon: '🖼️', action: () => { onAddImage(); setShowMenu(false); } },
                { label: 'Añadir tabla', icon: '📊', action: () => { onAddTable(); setShowMenu(false); } },
                { label: 'Añadir sticker', icon: '😊', action: () => { onAddSticker(); setShowMenu(false); } },
                { label: 'Añadir firma', icon: '✍️', action: () => { onAddSignature(); setShowMenu(false); } },
                { label: 'Escanear documento', icon: '📷', action: () => { onScanDocument(); setShowMenu(false); } },
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

      <style>{`
        @keyframes voice-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
