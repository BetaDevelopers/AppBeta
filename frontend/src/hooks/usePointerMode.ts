import { useState, useEffect, RefObject } from 'react';

export type PointerMode = 'text' | 'draw' | 'scroll';

export function usePointerMode(containerRef: RefObject<HTMLElement | null>) {
    const [mode, setMode] = useState<PointerMode>('text');

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType === 'pen') setMode('draw');
            else if (e.pointerType === 'mouse') setMode('text');
            else if (e.pointerType === 'touch') setMode('scroll');
        };

        el.addEventListener('pointerdown', onPointerDown);
        return () => el.removeEventListener('pointerdown', onPointerDown);
    }, [containerRef]);

    return { mode, setMode };
}
