import React from 'react';
import { Zap } from 'lucide-react';

interface MathPillProps {
    visible: boolean;
    position: { top: number; left: number } | null;
    onResolve: () => void;
}

export default function MathPill({ visible, position, onResolve }: MathPillProps) {
    if (!visible || !position) return null;

    return (
        <div
            onClick={onResolve}
            style={{
                position: 'fixed',
                top: position.top - 28,
                left: position.left + 8,
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(59,130,246,0.14)',
                border: '1px solid rgba(59,130,246,0.45)',
                borderRadius: 20,
                padding: '4px 12px 4px 8px',
                cursor: 'pointer',
                fontSize: 12,
                color: '#93c5fd',
                fontWeight: 700,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                userSelect: 'none',
                pointerEvents: 'all',
                boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
                animation: 'mathPillPulse 1.4s ease-in-out infinite',
                letterSpacing: '0.02em',
            }}
        >
            <Zap size={14} />
            <span>Resolver</span>
        </div>
    );
}
