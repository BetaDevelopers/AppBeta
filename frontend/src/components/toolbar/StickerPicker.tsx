import React, { useState } from 'react';

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Destacado',
    icon: '⭐',
    emojis: ['⭐', '🌟', '✨', '💫', '🏆', '🥇', '🎯', '🔥', '💎', '👑', '🚀', '💡'],
  },
  {
    label: 'Estudio',
    icon: '📚',
    emojis: ['📚', '📖', '✏️', '📝', '🖊️', '📐', '📏', '🔬', '🧪', '🧬', '🔭', '📊'],
  },
  {
    label: 'Ideas',
    icon: '💡',
    emojis: ['💡', '🧠', '🤔', '💭', '🎨', '🖌️', '🎭', '🎬', '🎵', '🎤', '🌈', '🦋'],
  },
  {
    label: 'Objetivos',
    icon: '🎯',
    emojis: ['🎯', '✅', '☑️', '📌', '📍', '🗓️', '⏰', '⚡', '💪', '🏃', '🥊', '🎪'],
  },
  {
    label: 'Expresiones',
    icon: '😀',
    emojis: ['😀', '😂', '🥹', '😍', '🤩', '😎', '🤓', '😤', '🥳', '😴', '🤯', '🫶'],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function StickerPicker({ onSelect, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(14,14,22,0.97)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20,
        padding: '16px',
        width: 340,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        zIndex: 400,
        boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Stickers
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto' }}>
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: 'none',
              background: i === activeTab ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
              color: i === activeTab ? '#93C5FD' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
              transition: 'all 150ms ease',
            }}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {CATEGORIES[activeTab].emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            style={{
              fontSize: 32,
              lineHeight: 1,
              padding: 6,
              borderRadius: 10,
              border: 'none',
              background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              transition: 'background 100ms, transform 100ms',
            }}
            onPointerEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
            onPointerLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
