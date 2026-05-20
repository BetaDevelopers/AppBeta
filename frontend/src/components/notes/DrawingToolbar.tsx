import React, { useState, useEffect, useRef } from 'react';
import { Pen, Pencil, Diamond, Trash2 } from 'lucide-react';
import { PointerMode } from '../../hooks/usePointerMode';

export type DrawTool = 'pen' | 'marker' | 'shapes' | 'eraser';

interface DrawingToolbarProps {
    mode: PointerMode;
    activeTool: DrawTool;
    onToolChange: (t: DrawTool) => void;
    onUndo: () => void;
    onClear: () => void;
}

const TOOLS: { id: DrawTool; icon: React.ReactElement; label: string }[] = [
    { id: 'pen',    icon: <Pen size={20} />,     label: 'Lápiz' },
    { id: 'marker', icon: <Pencil size={20} />,  label: 'Rotulador' },
    { id: 'shapes', icon: <Diamond size={20} />, label: 'Formas' },
    { id: 'eraser', icon: <span style={{ fontSize: 20 }}>⬜</span>, label: 'Borrador' },
];

const TOOLBAR_STYLE: React.CSSProperties = {
    position: 'fixed',
    top: 90,
    right: 20,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'rgba(8,10,22,0.94)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '10px 8px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    animation: 'fadeInRight 180ms cubic-bezier(0.22,1,0.36,1) both',
};

export default function DrawingToolbar({
    mode,
    activeTool,
    onToolChange,
    onUndo,
    onClear,
}: DrawingToolbarProps) {
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetHideTimer = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };

    useEffect(() => {
        if (mode === 'draw') {
            setVisible(true);
            resetHideTimer();
        } else {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            setVisible(false);
        }
    }, [mode]);

    if (!visible) return null;

    const btnStyle = (active: boolean): React.CSSProperties => ({
        width: 52,
        height: 52,
        borderRadius: 13,
        border: active
            ? '1.5px solid rgba(59,130,246,0.8)'
            : '1.5px solid rgba(255,255,255,0.06)',
        background: active
            ? 'rgba(59,130,246,0.18)'
            : 'rgba(255,255,255,0.03)',
        fontSize: 22,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        color: '#e2e8f0',
    });

    return (
        <div style={TOOLBAR_STYLE} onPointerEnter={resetHideTimer}>
            {TOOLS.map(t => (
                <button
                    key={t.id}
                    onClick={() => { onToolChange(t.id); resetHideTimer(); }}
                    title={t.label}
                    style={btnStyle(activeTool === t.id)}
                >
                    {t.icon}
                </button>
            ))}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 4px' }} />

            <button
                onClick={() => { onUndo(); resetHideTimer(); }}
                title="Deshacer"
                style={btnStyle(false)}
            >
                ↩
            </button>
            <button
                onClick={() => { onClear(); resetHideTimer(); }}
                title="Limpiar todo"
                style={{ ...btnStyle(false), color: '#f87171' }}
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}
