import { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

export function ChartBlockView({ node, updateAttributes, selected }: any) {
    const { src, alt, width, tx, ty } = node.attrs as {
        src: string; alt: string; width: number; tx: number; ty: number;
    };

    const [resizing,  setResizing]  = useState(false);
    const [moving,    setMoving]    = useState(false);
    const [hovering,  setHovering]  = useState(false);

    const resizeRef = useRef({ x: 0, w: 500 });
    const moveRef   = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
    const dragDist  = useRef(0); // to distinguish click vs drag

    const w   = typeof width === 'number' && width > 0 ? width : 500;
    const dtx = typeof tx === 'number' ? tx : 0;
    const dty = typeof ty === 'number' ? ty : 0;

    const show = hovering || selected || resizing || moving;

    // ── Resize ──────────────────────────────────────────────
    const onResizeStart = useCallback((e: React.PointerEvent, inverted = false) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        resizeRef.current = { x: e.clientX, w: width || 500 };
        setResizing(true);

        const onMove = (ev: PointerEvent) => {
            const delta = inverted
                ? -(ev.clientX - resizeRef.current.x)
                :  (ev.clientX - resizeRef.current.x);
            updateAttributes({ width: Math.round(Math.max(120, Math.min(1400, resizeRef.current.w + delta))) });
        };
        const onUp = () => {
            setResizing(false);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [width, updateAttributes]);

    // ── Free move (translate) ────────────────────────────────
    const onMoveStart = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        moveRef.current = { x: e.clientX, y: e.clientY, tx: dtx, ty: dty };
        dragDist.current = 0;
        setMoving(true);

        const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - moveRef.current.x;
            const dy = ev.clientY - moveRef.current.y;
            dragDist.current = Math.max(dragDist.current, Math.abs(dx) + Math.abs(dy));
            updateAttributes({
                tx: Math.round(moveRef.current.tx + dx),
                ty: Math.round(moveRef.current.ty + dy),
            });
        };
        const onUp = () => {
            setMoving(false);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [dtx, dty, updateAttributes]);

    // ── Edit on click (only if barely moved) ────────────────
    const handleClick = useCallback(() => {
        if (dragDist.current > 4) return; // was a drag, not a click
        if (!alt?.startsWith('CHART:')) return;
        try {
            const json = decodeURIComponent(escape(atob(alt.slice(6))));
            window.dispatchEvent(new CustomEvent('edit-chart', { detail: JSON.parse(json) }));
        } catch { /* ignore */ }
    }, [alt]);

    return (
        <NodeViewWrapper
            as="div"
            style={{
                display: 'block',
                width: `${w}px`,
                maxWidth: '100%',
                position: 'relative',
                margin: '16px auto',
                transform: `translate(${dtx}px, ${dty}px)`,
                userSelect: 'none',
                zIndex: moving ? 100 : 'auto',
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => { if (!resizing && !moving) setHovering(false); }}
        >
            <img
                src={src}
                alt={alt}
                draggable={false}
                onPointerDown={onMoveStart}
                onClick={handleClick}
                style={{
                    width: '100%',
                    display: 'block',
                    borderRadius: '12px',
                    touchAction: 'none',
                    cursor: moving ? 'grabbing' : (show ? 'grab' : 'default'),
                    border: show ? '2px solid rgba(99,102,241,0.7)' : '2px solid transparent',
                    transition: moving ? 'none' : 'border-color 0.15s',
                    boxSizing: 'border-box',
                }}
            />

            {/* Resize handles — corners only */}
            {show && (
                <>
                    <Handle style={{ right: -5, bottom: -5, width: 20, height: 20, borderRadius: '50%', cursor: 'se-resize' }}
                        onPointerDown={e => onResizeStart(e, false)} />
                    <Handle style={{ left: -5,  bottom: -5, width: 20, height: 20, borderRadius: '50%', cursor: 'sw-resize' }}
                        onPointerDown={e => onResizeStart(e, true)} />
                </>
            )}

            {/* Size tooltip while resizing */}
            {resizing && (
                <div style={{
                    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)', color: '#a5b4fc',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    pointerEvents: 'none', zIndex: 50, border: '1px solid rgba(99,102,241,0.4)',
                    whiteSpace: 'nowrap',
                }}>
                    {w}px
                </div>
            )}

            {/* Position tooltip while moving */}
            {moving && (
                <div style={{
                    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)', color: '#6ee7b7',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    pointerEvents: 'none', zIndex: 50, border: '1px solid rgba(16,185,129,0.4)',
                    whiteSpace: 'nowrap',
                }}>
                    {dtx > 0 ? '+' : ''}{dtx}px  {dty > 0 ? '+' : ''}{dty}px
                </div>
            )}

            {/* Hint */}
            {show && !resizing && !moving && (
                <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)', color: '#94a3b8',
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    pointerEvents: 'none', zIndex: 50, whiteSpace: 'nowrap',
                }}>
                    Arrastra para mover · clic para editar
                </div>
            )}
        </NodeViewWrapper>
    );
}

function Handle({ style, onPointerDown }: { style: React.CSSProperties; onPointerDown: (e: React.PointerEvent) => void }) {
    return (
        <div
            onPointerDown={onPointerDown}
            style={{
                position: 'absolute',
                background: 'rgb(99,102,241)',
                boxShadow: '0 0 0 2px white',
                zIndex: 20,
                ...style,
            }}
        />
    );
}
