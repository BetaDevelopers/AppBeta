import { useCallback, useEffect, useRef, useState } from 'react';
import type { FloatingObject } from '../types/canvas';
import { db } from '../db/dexie';

const MAX_HISTORY = 50;

export function useFloatingHistory(
  floatingObjects: FloatingObject[],
  setFloatingObjects: (objs: FloatingObject[]) => void,
  noteId?: string
) {
  const stackRef = useRef<FloatingObject[][]>([]);
  const indexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const floatingRef = useRef(floatingObjects);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { floatingRef.current = floatingObjects; }, [floatingObjects]);

  // Load from Dexie when note changes
  useEffect(() => {
    if (!noteId) {
      stackRef.current = [];
      indexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }
    db.noteHistory.get(noteId).then(record => {
      if (record?.stack?.length) {
        stackRef.current = record.stack.slice(-MAX_HISTORY);
        indexRef.current = stackRef.current.length - 1;
      } else {
        stackRef.current = [];
        indexRef.current = -1;
      }
      setCanUndo(indexRef.current > 0);
      setCanRedo(false);
    }).catch(() => {});
  }, [noteId]);

  const syncUi = () => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < stackRef.current.length - 1);
  };

  const scheduleDbSave = useCallback(() => {
    if (!noteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const stack = stackRef.current;
      if (stack.length > 1) {
        db.noteHistory.put({ noteId, stack }).catch(() => {});
      }
    }, 1000);
  }, [noteId]);

  const pushSnapshot = useCallback(() => {
    const snapshot = JSON.parse(JSON.stringify(floatingRef.current)) as FloatingObject[];
    const newStack = [...stackRef.current.slice(0, indexRef.current + 1), snapshot].slice(-MAX_HISTORY);
    stackRef.current = newStack;
    indexRef.current = newStack.length - 1;
    syncUi();
    scheduleDbSave();
  }, [scheduleDbSave]);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current--;
    setFloatingObjects(JSON.parse(JSON.stringify(stackRef.current[indexRef.current])));
    syncUi();
  }, [setFloatingObjects]);

  const redo = useCallback(() => {
    if (indexRef.current >= stackRef.current.length - 1) return;
    indexRef.current++;
    setFloatingObjects(JSON.parse(JSON.stringify(stackRef.current[indexRef.current])));
    syncUi();
  }, [setFloatingObjects]);

  return { pushSnapshot, undo, redo, canUndo, canRedo };
}
