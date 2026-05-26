import React, { useRef, useState, useCallback, useEffect } from 'react';
import katex from 'katex';
import { mathOCR } from '../../api/mathApi';
import type { FloatingObject } from '../../types/canvas';

const CW = 400;
const CH = 180;

function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return `<span style="color:rgba(255,255,255,0.4)">${latex}</span>`;
  }
}

interface Props {
  onInsert: (obj: Omit<FloatingObject, 'id' | 'isSelected' | 'rotation'>) => void;
  onClose: () => void;
}

export default function FormulaInput({ onInsert, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);
  const isDrawing = useRef(false);
  const [latex, setLatex] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawStroke = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  const redraw = useCallback((all: { x: number; y: number }[][], active: { x: number; y: number }[] | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CW, CH);
    all.forEach(s => drawStroke(ctx, s));
    if (active) drawStroke(ctx, active);
  }, []);

  useEffect(() => { redraw(strokes, currentStroke); }, [strokes, currentStroke, redraw]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CW / rect.width),
      y: (e.clientY - rect.top) * (CH / rect.height),
    };
  };

  const scheduleOCR = (all: { x: number; y: number }[][]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (all.length === 0) return;
      setLoading(true);
      try {
        const b64 = canvasRef.current?.toDataURL('image/png').split(',')[1];
        const data = await mathOCR(all, b64);
        if (data?.latex) setLatex(data.latex);
      } catch { /* silenciar errores interim */ }
      finally { setLoading(false); }
    }, 600);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;
    setCurrentStroke([getPos(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    setCurrentStroke(prev => prev ? [...prev, getPos(e)] : [getPos(e)]);
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    setCurrentStroke(prev => {
      if (prev && prev.length > 1) {
        const next = [...strokesRef.current, prev];
        strokesRef.current = next;
        setStrokes(next);
        scheduleOCR(next);
      }
      return null;
    });
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    strokesRef.current = [];
    setStrokes([]);
    setCurrentStroke(null);
    setLatex('');
    setLoading(false);
  };

  const handleInsert = () => {
    if (!latex) return;
    onInsert({
      type: 'equation',
      position: { x: 80, y: 80 },
      dimensions: { width: 320, height: 80 },
      latexSource: latex,
    });
    onClose();
  };

  const hasContent = strokes.length > 0;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.45)' }}
        onPointerDown={onClose}
      />

      <div
        onPointerDown={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 300,
          width: 'min(420px, 92vw)',
          background: 'rgba(10,10,18,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
            ∑ Insertar fórmula
          </span>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 8,
              border: 'none', background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Canvas area */}
        <div style={{ padding: '10px 12px 0', position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
              width: '100%', height: 'auto', display: 'block',
              borderRadius: 12, background: '#000',
              touchAction: 'none', cursor: 'crosshair',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {!hasContent && (
            <div style={{
              position: 'absolute', inset: '10px 12px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', borderRadius: 12,
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', fontWeight: 600, letterSpacing: '0.06em' }}>
                Escribe con el lápiz
              </span>
            </div>
          )}
        </div>

        {/* KaTeX preview */}
        <div style={{
          minHeight: 58, margin: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 14px', overflow: 'hidden',
        }}>
          {loading ? (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
              Reconociendo…
            </span>
          ) : latex ? (
            <div
              style={{ color: '#fff', fontSize: 22 }}
              dangerouslySetInnerHTML={{ __html: renderKatex(latex) }}
            />
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em' }}>
              Vista previa KaTeX
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '6px 12px 14px' }}>
          <button
            onClick={handleClear}
            disabled={!hasContent}
            style={{
              height: 38, padding: '0 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: hasContent ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
              fontSize: 12, fontWeight: 700,
              cursor: hasContent ? 'pointer' : 'not-allowed',
              transition: 'all 120ms', flexShrink: 0,
            }}
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            style={{
              height: 38, padding: '0 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 120ms', flexShrink: 0,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleInsert}
            disabled={!latex}
            style={{
              flex: 1, height: 38, borderRadius: 10, border: 'none',
              background: latex ? 'rgba(99,102,241,0.9)' : 'rgba(99,102,241,0.2)',
              color: latex ? '#fff' : 'rgba(255,255,255,0.25)',
              fontSize: 12, fontWeight: 800,
              cursor: latex ? 'pointer' : 'not-allowed',
              transition: 'all 120ms', letterSpacing: '0.02em',
            }}
          >
            Insertar como KaTeX
          </button>
        </div>
      </div>
    </>
  );
}
