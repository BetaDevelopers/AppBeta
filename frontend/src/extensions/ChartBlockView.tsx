import { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { MoreHorizontal, Edit2, Copy, Trash2, Lock, Unlock } from 'lucide-react';

export function ChartBlockView({ node, updateAttributes, selected, editor, getPos }: any) {
    const { src, alt, width, tx, ty, locked } = node.attrs as {
        src: string; alt: string; width: number; tx: number; ty: number; locked: boolean;
    };

    const [resizing, setResizing] = useState(false);
    const [moving,   setMoving]   = useState(false);
    const [hovering, setHovering] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const resizeRef  = useRef({ x: 0, w: 500 });
    const moveRef    = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
    const menuRef    = useRef<HTMLDivElement>(null);

    const w      = typeof width === 'number' && width > 0 ? width : 500;
    const dtx    = typeof tx === 'number' ? tx : 0;
    const dty    = typeof ty === 'number' ? ty : 0;
    const isLocked = !!locked;

    const showControls = hovering || selected || showMenu;
    const showResize   = (hovering || selected || resizing || moving) && !isLocked;

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    // ── Resize ──────────────────────────────────────────────────────
    const onResizeStart = useCallback((e: React.PointerEvent, inverted = false) => {
        if (isLocked) return;
        e.preventDefault(); e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        resizeRef.current = { x: e.clientX, w: width || 500 };
        setResizing(true);
        const onMove = (ev: PointerEvent) => {
            const delta = inverted ? -(ev.clientX - resizeRef.current.x) : (ev.clientX - resizeRef.current.x);
            updateAttributes({ width: Math.round(Math.max(120, Math.min(1400, resizeRef.current.w + delta))) });
        };
        const onUp = () => { setResizing(false); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [width, updateAttributes, isLocked]);

    // ── Drag to move ─────────────────────────────────────────────────
    const onMoveStart = useCallback((e: React.PointerEvent) => {
        if (isLocked) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault(); e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        moveRef.current = { x: e.clientX, y: e.clientY, tx: dtx, ty: dty };
        setMoving(true);
        const onMove = (ev: PointerEvent) => {
            updateAttributes({
                tx: Math.round(moveRef.current.tx + ev.clientX - moveRef.current.x),
                ty: Math.round(moveRef.current.ty + ev.clientY - moveRef.current.y),
            });
        };
        const onUp = () => { setMoving(false); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [dtx, dty, updateAttributes, isLocked]);

    // ── Menu actions ──────────────────────────────────────────────────
    const handleEdit = useCallback(() => {
        setShowMenu(false);
        if (!alt?.startsWith('CHART:')) return;
        try {
            const json = decodeURIComponent(escape(atob(alt.slice(6))));
            window.dispatchEvent(new CustomEvent('edit-chart', { detail: JSON.parse(json) }));
        } catch { /* ignore */ }
    }, [alt]);

    const handleCopy = useCallback(async () => {
        setShowMenu(false);
        try {
            const res = await fetch(src);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch { /* ignore */ }
    }, [src]);

    const handleDelete = useCallback(() => {
        setShowMenu(false);
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos != null) {
            editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
        }
    }, [editor, getPos, node]);

    const toggleLock = useCallback((e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        updateAttributes({ locked: !isLocked });
    }, [isLocked, updateAttributes]);

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
            onMouseLeave={() => { if (!resizing && !moving && !showMenu) setHovering(false); }}
        >
            {/* Chart image */}
            <img
                src={src}
                alt={alt}
                draggable={false}
                onPointerDown={isLocked ? undefined : onMoveStart}
                style={{
                    width: '100%',
                    display: 'block',
                    borderRadius: '12px',
                    touchAction: isLocked ? 'auto' : 'none',
                    cursor: isLocked ? 'default' : (moving ? 'grabbing' : (showResize ? 'grab' : 'default')),
                    border: isLocked
                        ? '2px solid rgba(250,204,21,0.35)'
                        : (showResize ? '2px solid rgba(99,102,241,0.7)' : '2px solid transparent'),
                    transition: moving ? 'none' : 'border-color 0.15s',
                    boxSizing: 'border-box',
                    pointerEvents: isLocked ? 'none' : 'auto',
                }}
            />

            {/* Controls: three-dot menu (top-left) + lock (top-right) */}
            {showControls && (
                <>
                    {/* Three-dot menu */}
                    <div ref={menuRef} style={{ position: 'absolute', top: 8, left: 8, zIndex: 40 }}>
                        <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                            style={ctrlBtn(showMenu)}
                        >
                            <MoreHorizontal size={14} />
                        </button>

                        {showMenu && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                                background: 'rgba(14,14,22,0.98)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10, padding: 4,
                                backdropFilter: 'blur(20px)',
                                zIndex: 200, minWidth: 148,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                            }}>
                                {[
                                    { icon: Edit2,  label: 'Editar',        onClick: handleEdit,  color: '#e2e8f0' },
                                    { icon: Copy,   label: 'Copiar imagen', onClick: handleCopy,  color: '#e2e8f0' },
                                    { icon: Trash2, label: 'Borrar',        onClick: handleDelete, color: '#f87171' },
                                ].map(({ icon: Icon, label, onClick, color }) => (
                                    <button
                                        key={label}
                                        onClick={onClick}
                                        onPointerDown={e => e.stopPropagation()}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '7px 10px', borderRadius: 7,
                                            background: 'transparent', border: 'none',
                                            color, fontSize: 13, fontWeight: 500,
                                            cursor: 'pointer', textAlign: 'left',
                                        }}
                                        onPointerEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                        onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Icon size={13} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lock button */}
                    <button
                        onPointerDown={toggleLock}
                        onClick={e => e.stopPropagation()}
                        title={isLocked ? 'Desbloquear — vuelve a ser movible' : 'Bloquear posición — pinta libremente encima'}
                        style={{
                            ...ctrlBtn(false),
                            position: 'absolute', top: 8, right: 8, zIndex: 40,
                            background: isLocked ? 'rgba(250,204,21,0.2)' : 'rgba(0,0,0,0.75)',
                            border: isLocked ? '1px solid rgba(250,204,21,0.5)' : '1px solid rgba(255,255,255,0.15)',
                            color: isLocked ? '#fcd34d' : '#fff',
                        }}
                    >
                        {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                </>
            )}

            {/* Resize handles */}
            {showResize && (
                <>
                    <Handle style={{ right: -5, bottom: -5, cursor: 'se-resize' }} onPointerDown={e => onResizeStart(e, false)} />
                    <Handle style={{ left:  -5, bottom: -5, cursor: 'sw-resize' }} onPointerDown={e => onResizeStart(e, true)} />
                </>
            )}

            {/* Tooltips */}
            {resizing && <Chip color="#a5b4fc">{w}px</Chip>}
            {moving   && <Chip color="#6ee7b7">{dtx > 0 ? '+' : ''}{dtx}  {dty > 0 ? '+' : ''}{dty}px</Chip>}
            {showResize && !resizing && !moving && (
                <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.7)', color:'#94a3b8', fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6, pointerEvents:'none', zIndex:50, whiteSpace:'nowrap' }}>
                    Arrastra para mover
                </div>
            )}
            {isLocked && (hovering || selected) && (
                <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', background:'rgba(250,204,21,0.12)', color:'#fcd34d', fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6, pointerEvents:'none', zIndex:50, whiteSpace:'nowrap', border:'1px solid rgba(250,204,21,0.3)' }}>
                    Bloqueado · pinta encima libremente
                </div>
            )}
        </NodeViewWrapper>
    );
}

// ── Shared style helpers ──────────────────────────────────────────────────────

function ctrlBtn(active: boolean): React.CSSProperties {
    return {
        width: 28, height: 28, borderRadius: 8,
        background: active ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.75)',
        border: active ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.15)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', backdropFilter: 'blur(8px)',
    };
}

function Handle({ style, onPointerDown }: { style: React.CSSProperties; onPointerDown: (e: React.PointerEvent) => void }) {
    return (
        <div onPointerDown={onPointerDown} style={{ position:'absolute', width:20, height:20, borderRadius:'50%', background:'rgb(99,102,241)', boxShadow:'0 0 0 2px white', zIndex:20, ...style }} />
    );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.85)', color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, pointerEvents:'none', zIndex:50, border:`1px solid ${color}33`, whiteSpace:'nowrap' }}>
            {children}
        </div>
    );
}
