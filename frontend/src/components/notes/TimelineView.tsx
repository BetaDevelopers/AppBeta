import React, { useMemo, useRef } from 'react';
import type { FloatingObject } from '../../types/canvas';

interface Props {
  floatingObjects: FloatingObject[];
  tiptapText: string;
  onClose: () => void;
  onObjectMove: (id: string, x: number, y: number) => void;
}

// ── Date extraction ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
  january:1, february:2, march:3, april:4, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

function extractDates(text: string): Date[] {
  const dates: Date[] = [];

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const numRe = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(text)) !== null) {
    const y = parseInt(m[3].length === 2 ? '20' + m[3] : m[3], 10);
    const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (!isNaN(d.getTime())) dates.push(d);
  }

  // "15 de enero de 2024" or "15 enero 2024"
  const wordRe = /\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:de\s+)?(\d{4}))?\b/gi;
  while ((m = wordRe.exec(text)) !== null) {
    const month = MONTHS[(m[2] ?? '').toLowerCase()];
    if (!month) continue;
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    const d = new Date(year, month - 1, parseInt(m[1], 10));
    if (!isNaN(d.getTime())) dates.push(d);
  }

  return dates;
}

function firstDate(obj: FloatingObject): Date | null {
  const src = [obj.ocrText ?? '', obj.latexSource ?? ''].join(' ');
  const found = extractDates(src);
  return found.length > 0 ? found[0] : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AXIS_MARGIN = 60;
const AXIS_HEIGHT = 60;
const CARD_W = 80;
const CARD_H = 50;

export default function TimelineView({ floatingObjects, tiptapText, onClose, onObjectMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; fixedX: number; startClientY: number; startObjY: number } | null>(null);

  // Extract all dates from the Tiptap text and from object ocrText
  const tiptapDates = useMemo(() => extractDates(tiptapText), [tiptapText]);

  // Assign dates to objects
  const dated = useMemo(() =>
    floatingObjects
      .filter(o => o.type !== 'connector')
      .map(o => ({ obj: o, date: firstDate(o) })),
    [floatingObjects]
  );

  const withDate = dated.filter(d => d.date !== null) as { obj: FloatingObject; date: Date }[];
  const withoutDate = dated.filter(d => d.date === null).map(d => d.obj);

  // Time axis range
  const allDates = [...tiptapDates, ...withDate.map(d => d.date)];
  const minTs = allDates.length > 0 ? Math.min(...allDates.map(d => d.getTime())) : Date.now() - 86400000 * 30;
  const maxTs = allDates.length > 0 ? Math.max(...allDates.map(d => d.getTime())) : Date.now();
  const span = Math.max(maxTs - minTs, 1);

  const dateToX = (date: Date, totalW: number) =>
    AXIS_MARGIN + ((date.getTime() - minTs) / span) * (totalW - AXIS_MARGIN * 2);

  // Drag handling (only Y axis for dated objects)
  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string, fixedX: number, objY: number) => {
    e.stopPropagation();
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, fixedX, startClientY: e.clientY, startObjY: objY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { id, fixedX, startClientY, startObjY } = dragRef.current;
    const newY = startObjY + (e.clientY - startClientY);
    onObjectMove(id, fixedX, Math.max(0, newY));
  };

  const handlePointerUp = () => { dragRef.current = null; };

  // Month axis marks
  const axisMarks = useMemo(() => {
    const marks: { label: string; ts: number }[] = [];
    const start = new Date(minTs);
    start.setDate(1);
    const cursor = new Date(start);
    while (cursor.getTime() <= maxTs + 86400000 * 31) {
      marks.push({
        label: cursor.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
        ts: cursor.getTime(),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return marks;
  }, [minTs, maxTs]);

  const totalW = 900;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        background: '#030712',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>
          Vista cronológica
        </span>
        <div
          style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: '2px 6px' }}
          onPointerDown={onClose}
        >✕</div>
      </div>

      {/* Tiptap text summary */}
      {tiptapText.trim() && (
        <div style={{
          padding: '8px 20px',
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {tiptapText.substring(0, 150)}
        </div>
      )}

      {/* Timeline area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', position: 'relative' }}>
        <div style={{ minWidth: totalW, minHeight: 400, position: 'relative' }}>

          {/* SVG axis */}
          <svg width={totalW} height={AXIS_HEIGHT} style={{ overflow: 'visible', display: 'block' }}>
            <line x1={AXIS_MARGIN} y1={AXIS_HEIGHT / 2} x2={totalW - AXIS_MARGIN} y2={AXIS_HEIGHT / 2}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            {axisMarks.map(({ label, ts }) => {
              const x = dateToX(new Date(ts), totalW);
              if (x < AXIS_MARGIN - 10 || x > totalW - AXIS_MARGIN + 10) return null;
              return (
                <g key={ts}>
                  <line x1={x} y1={AXIS_HEIGHT / 2 - 4} x2={x} y2={AXIS_HEIGHT / 2 + 4}
                    stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                  <text x={x} y={AXIS_HEIGHT / 2 + 16} textAnchor="middle"
                    fill="rgba(255,255,255,0.4)" fontSize={9}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Dated objects */}
          {withDate.map(({ obj, date }) => {
            const x = dateToX(date, totalW) - CARD_W / 2;
            const y = AXIS_HEIGHT + obj.position.y % 200 + 20;
            return (
              <div
                key={obj.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: CARD_W,
                  height: CARD_H,
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  overflow: 'hidden',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.7)',
                  padding: 4,
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handleCardPointerDown(e, obj.id, obj.position.x, obj.position.y)}
              >
                {obj.type === 'equation' && obj.latexSource
                  ? obj.latexSource.substring(0, 20)
                  : obj.ocrText?.substring(0, 30) ?? obj.type}
              </div>
            );
          })}

          {/* Undated objects column */}
          {withoutDate.length > 0 && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: AXIS_HEIGHT,
              width: 120,
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              paddingLeft: 10,
              paddingTop: 8,
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 6, textTransform: 'uppercase' }}>
                Sin fecha
              </div>
              {withoutDate.map((obj, i) => (
                <div key={obj.id} style={{
                  marginBottom: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 5,
                  padding: '4px 6px',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {obj.ocrText?.substring(0, 18) ?? obj.type}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
