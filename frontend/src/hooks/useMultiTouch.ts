import React, { useRef, useState, useCallback } from 'react';

export function useMultiTouch(scrollRef?: React.RefObject<HTMLElement | null>) {
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);

  /** Returns true if panning started (2+ fingers detected). */
  const onDown = useCallback((e: React.PointerEvent): boolean => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size >= 2 && !isPanningRef.current) {
      isPanningRef.current = true;
      setIsPanning(true);
      return true;
    }
    return isPanningRef.current;
  }, []);

  /** Returns true if the event was consumed by panning (caller should skip draw logic). */
  const onMove = useCallback((e: React.PointerEvent): boolean => {
    if (!isPanningRef.current || activePointers.current.size < 2) return false;
    const prev = activePointers.current.get(e.pointerId);
    if (prev && scrollRef?.current) {
      // scrollTop is more reliable than scrollBy on iOS Safari
      scrollRef.current.scrollTop += prev.y - e.clientY;
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    return true;
  }, [scrollRef]);

  const onUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2 && isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }
  }, []);

  return { isPanning, onDown, onMove, onUp };
}
