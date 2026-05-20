import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Spinner } from '../ui/Spinner';
import { X, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Sparkles } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

interface Props {
  noteText: string;
  onClose: () => void;
}

export default function FlashcardsMode({ noteText, onClose }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ reply: string }>('/ai/chat', {
        messages: [{
          role: 'user',
          content: `Genera entre 5 y 10 flashcards de estudio a partir de este texto.
Responde SOLO con JSON válido, sin markdown, sin explicaciones:
[{"question":"...","answer":"..."},...]

Texto:
${noteText.substring(0, 4000)}`,
        }],
      });
      const raw = res.reply?.trim() ?? '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Formato inválido');
      const parsed: Flashcard[] = JSON.parse(match[0]);
      if (!parsed.length) throw new Error('Sin flashcards');
      setCards(parsed);
      setCurrent(0);
      setFlipped(false);
      setGenerated(true);
    } catch (e: any) {
      setError('No se pudieron generar las flashcards. Intenta con más texto.');
    } finally {
      setLoading(false);
    }
  };

  const prev = () => { setCurrent(i => Math.max(0, i - 1)); setFlipped(false); };
  const next = () => { setCurrent(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.97)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}
    >
      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <BookOpen size={20} color="#3b82f6" />
        <span style={{ color: '#fafafa', fontWeight: 800, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Modo Estudio
        </span>
        <button onClick={onClose} style={{ position: 'absolute', right: 20, background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#555' }}>
          <X size={18} />
        </button>
      </div>

      {!generated && !loading && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p style={{ color: '#555', fontSize: 15, maxWidth: 340 }}>
            La IA generará flashcards de pregunta/respuesta a partir del contenido de la nota.
          </p>
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
          <button onClick={generate} style={{
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15,
            fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Generar Flashcards
          </button>
        </div>
      )}

      {loading && <Spinner size="lg" />}

      {generated && cards.length > 0 && (
        <>
          {/* Progress */}
          <div style={{ color: '#444', fontSize: 13, fontWeight: 600 }}>
            {current + 1} / {cards.length}
          </div>

          {/* Card */}
          <div
            onClick={() => setFlipped(f => !f)}
            style={{
              width: 'min(90vw, 480px)', minHeight: 220,
              background: flipped ? 'rgba(59,130,246,0.12)' : '#111',
              border: `1px solid ${flipped ? 'rgba(59,130,246,0.4)' : '#1a1a1a'}`,
              borderRadius: 16, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none', textAlign: 'center',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: flipped ? '#60a5fa' : '#444', marginBottom: 16 }}>
              {flipped ? 'Respuesta' : 'Pregunta'}
            </div>
            <div style={{ color: '#fafafa', fontSize: 18, lineHeight: 1.5, fontWeight: flipped ? 400 : 600 }}>
              {flipped ? cards[current].answer : cards[current].question}
            </div>
            {!flipped && (
              <div style={{ marginTop: 20, color: '#444', fontSize: 12 }}>Toca para ver la respuesta</div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={prev} disabled={current === 0}
              style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 18px', cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.3 : 1, color: '#fafafa' }}>
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => { setFlipped(false); setCurrent(0); setGenerated(false); setCards([]); }}
              style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', color: '#555' }}>
              <RotateCcw size={18} />
            </button>
            <button onClick={next} disabled={current === cards.length - 1}
              style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 18px', cursor: current === cards.length - 1 ? 'not-allowed' : 'pointer', opacity: current === cards.length - 1 ? 0.3 : 1, color: '#fafafa' }}>
              <ChevronRight size={22} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
