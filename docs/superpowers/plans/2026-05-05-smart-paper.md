# Smart Paper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform NoteEditor into a unified "smart paper" surface where the Tiptap text editor and an inline SVG/canvas drawing overlay coexist, switching automatically based on input type (keyboard→text, pen→draw, touch→scroll).

**Architecture:** Canvas overlay (`InlineCanvas`) sits `position: fixed` over the editor viewport; pointer type detection (`usePointerMode`) controls `pointer-events`; stroke AI recognition (`useStrokeRecognition`) converts drawings to text/LaTeX inline; existing SelectionMenu + SolvePanel wired into NoteEditor; MathPill watches for `=` at line end.

**Tech Stack:** React 19, Tiptap 3, HTML5 Canvas API, existing `/api/ai/ocr` + `/api/ai/math-ocr` endpoints, KaTeX, Lucide icons, Tailwind 4.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `components/notes/NoteEditor.tsx` | Integrate SelectionMenu, SolvePanel, InlineCanvas, DrawingToolbar |
| Modify | `components/notes/RichEditor.tsx` | Remove duplicate BubbleMenu; add `=` detection; expose `onEqualsDetected` |
| Create | `hooks/usePointerMode.ts` | PointerEvent type → 'text'\|'draw'\|'scroll' |
| Create | `components/notes/InlineCanvas.tsx` | Fixed canvas overlay, stroke capture, forward to recognition |
| Create | `components/notes/DrawingToolbar.tsx` | Mini frosted-glass toolbar (pen/marker/shapes/eraser/undo), auto-hide 3s |
| Create | `hooks/useStrokeRecognition.ts` | Wraps ocrImage + useMathOCR → RecognitionResult |
| Create | `components/notes/MathPill.tsx` | Floating pill when line ends with `=`, resolves after 800ms |

---

## Phase 1 — SelectionMenu + SolvePanel integration

### Task 1: Remove duplicate BubbleMenu from RichEditor

**Files:** `frontend/src/components/notes/RichEditor.tsx`

- [ ] Delete the `<BubbleMenu>` block inside `RichEditor` (lines ~148–175 — the contextual floating menu with Bold/Highlight/Code). The sticky toolbar at top already provides those controls and `SelectionMenu` will be the sole BubbleMenu.
- [ ] Keep all other RichEditor code unchanged.
- [ ] Run `npm run build` inside `frontend/` — expect 0 errors.

### Task 2: Integrate SelectionMenu + SolvePanel into NoteEditor

**Files:** `frontend/src/components/notes/NoteEditor.tsx`

- [ ] Add imports at top:
```tsx
import SelectionMenu from './SelectionMenu';
import { SolvePanel } from './SolvePanel';
```
- [ ] Add state near other useState declarations:
```tsx
const [solveText, setSolveText] = useState<string | null>(null);
```
- [ ] Add `handleSolvePanelInsert` handler (after `handleInsertSummary`):
```tsx
const handleSolvePanelInsert = (content: string) => {
    if (!editor) return;
    editor.chain().focus('end').insertContent('<hr />').insertContent(content).run();
    setSolveText(null);
};
```
- [ ] Render SelectionMenu + SolvePanel just before the closing `</div>` of the outermost container (after `showDataVision` block):
```tsx
{editor && (
    <SelectionMenu
        editor={editor}
        onOpenSolvePanel={(text) => setSolveText(text)}
    />
)}
{solveText && (
    <SolvePanel
        selectedText={solveText}
        onClose={() => setSolveText(null)}
        onInsert={handleSolvePanelInsert}
    />
)}
```
- [ ] Run `npm run build` — 0 errors.

---

## Phase 2 — Pointer mode detection

### Task 3: Create `usePointerMode` hook

**File:** `frontend/src/hooks/usePointerMode.ts`

- [ ] Create the file:
```typescript
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
```

---

## Phase 3 — Stroke recognition hook

### Task 4: Create `useStrokeRecognition` hook

**File:** `frontend/src/hooks/useStrokeRecognition.ts`

- [ ] Create the file:
```typescript
import { useCallback } from 'react';
import { ocrImage } from '../api/mathApi';
import { useMathOCR } from '../features/ai/hooks/useMathOCR';

export type RecognitionResult =
    | { type: 'latex'; content: string }
    | { type: 'text'; content: string }
    | { type: 'drawing'; dataUrl: string };

export function useStrokeRecognition() {
    const { recognize } = useMathOCR();

    const processStroke = useCallback(async (
        dataUrl: string
    ): Promise<RecognitionResult> => {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

        // 1. Try math OCR (higher priority)
        try {
            const math = await recognize([], dataUrl);
            if (math.isEquation && math.confidence >= 0.65 && math.latex) {
                return { type: 'latex', content: math.latex };
            }
        } catch { /* fall through */ }

        // 2. Try general OCR
        try {
            const ocr = await ocrImage(base64);
            const text = (ocr as any).text ?? (ocr as any).markdown ?? '';
            if (text.trim().length > 0) {
                return { type: 'text', content: text.trim() };
            }
        } catch { /* fall through */ }

        // 3. Keep as drawing
        return { type: 'drawing', dataUrl };
    }, [recognize]);

    return { processStroke };
}
```

---

## Phase 4 — InlineCanvas component

### Task 5: Create `InlineCanvas`

**File:** `frontend/src/components/notes/InlineCanvas.tsx`

- [ ] Create the file:
```tsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PointerMode } from '../../hooks/usePointerMode';
import { useStrokeRecognition, RecognitionResult } from '../../hooks/useStrokeRecognition';

interface Point { x: number; y: number; pressure: number; }
interface Stroke { points: Point[]; color: string; width: number; }

export interface InlineCanvasProps {
    mode: PointerMode;
    editorRef: React.RefObject<HTMLElement | null>;
    onRecognized: (result: RecognitionResult, insertAtPos?: number) => void;
    toolColor?: string;
    toolWidth?: number;
    brushType?: 'pen' | 'marker' | 'eraser';
}

export default function InlineCanvas({
    mode, editorRef, onRecognized, toolColor = '#e2e8f0', toolWidth = 2, brushType = 'pen',
}: InlineCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
    const isDrawingRef = useRef(false);
    const [bounds, setBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const recognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { processStroke } = useStrokeRecognition();

    // Keep canvas bounds in sync with editor
    useEffect(() => {
        const update = () => {
            const el = editorRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setBounds({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        update();
        const ro = new ResizeObserver(update);
        if (editorRef.current) ro.observe(editorRef.current);
        window.addEventListener('scroll', update, true);
        return () => { ro.disconnect(); window.removeEventListener('scroll', update, true); };
    }, [editorRef]);

    // Resize canvas when bounds change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bounds.width) return;
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        redraw();
    }, [bounds]);

    const getColor = () => brushType === 'eraser' ? 'rgba(0,0,0,0)' : toolColor;
    const getWidth = () => brushType === 'marker' ? toolWidth * 4 : brushType === 'eraser' ? 24 : toolWidth;

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const stroke of strokesRef.current) {
            if (stroke.points.length < 2) continue;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (brushType === 'eraser') ctx.globalCompositeOperation = 'destination-out';
            else ctx.globalCompositeOperation = 'source-over';
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                const p = stroke.points[i];
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }
    }, [brushType]);

    const captureStrokes = useCallback((): string | null => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;
        // Find bounding box of all strokes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const stroke of strokesRef.current) {
            for (const p of stroke.points) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
        }
        const pad = 20;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(canvas.width, maxX + pad);
        maxY = Math.min(canvas.height, maxY + pad);
        const w = maxX - minX;
        const h = maxY - minY;
        if (w <= 0 || h <= 0) return null;

        const tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        const tmpCtx = tmp.getContext('2d')!;
        // White background for OCR
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, w, h);
        tmpCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
        return tmp.toDataURL('image/png');
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (mode !== 'draw') return;
        e.preventDefault();
        isDrawingRef.current = true;
        const canvas = canvasRef.current!;
        canvas.setPointerCapture(e.pointerId);
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        currentStrokeRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        if (recognitionTimerRef.current) clearTimeout(recognitionTimerRef.current);
    }, [mode, bounds]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawingRef.current || mode !== 'draw') return;
        e.preventDefault();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        currentStrokeRef.current.push({ x, y, pressure: e.pressure || 0.5 });

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        const pts = currentStrokeRef.current;
        if (pts.length < 2) return;
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = getColor();
        const speed = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const dynamicWidth = Math.max(1, getWidth() - speed * 0.04);
        ctx.lineWidth = dynamicWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (brushType === 'eraser') ctx.globalCompositeOperation = 'destination-out';
        else ctx.globalCompositeOperation = 'source-over';
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
    }, [mode, bounds, brushType]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (currentStrokeRef.current.length > 1 && brushType !== 'eraser') {
            strokesRef.current.push({
                points: currentStrokeRef.current,
                color: getColor(),
                width: getWidth(),
            });
        }
        currentStrokeRef.current = [];

        // Wait 600ms after last stroke before recognizing (user might continue drawing)
        if (recognitionTimerRef.current) clearTimeout(recognitionTimerRef.current);
        recognitionTimerRef.current = setTimeout(async () => {
            const dataUrl = captureStrokes();
            if (!dataUrl) return;
            const result = await processStroke(dataUrl);
            // Clear canvas strokes
            strokesRef.current = [];
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
            onRecognized(result);
        }, 600);
    }, [brushType, captureStrokes, processStroke, onRecognized]);

    const clearCanvas = useCallback(() => {
        strokesRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    useEffect(() => {
        // Expose clear to parent via custom event
        const handler = () => clearCanvas();
        window.addEventListener('canvas-clear', handler);
        return () => window.removeEventListener('canvas-clear', handler);
    }, [clearCanvas]);

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
                position: 'fixed',
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                pointerEvents: mode === 'draw' ? 'all' : 'none',
                zIndex: 50,
                touchAction: 'none',
                cursor: mode === 'draw' ? 'crosshair' : 'default',
            }}
        />
    );
}
```

---

## Phase 5 — DrawingToolbar component

### Task 6: Create `DrawingToolbar`

**File:** `frontend/src/components/notes/DrawingToolbar.tsx`

- [ ] Create the file:
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { PointerMode } from '../../hooks/usePointerMode';

export type DrawTool = 'pen' | 'marker' | 'shapes' | 'eraser';

interface DrawingToolbarProps {
    mode: PointerMode;
    activeTool: DrawTool;
    onToolChange: (t: DrawTool) => void;
    onUndo: () => void;
    onClear: () => void;
}

const TOOLS: { id: DrawTool; icon: string; label: string }[] = [
    { id: 'pen',    icon: '🖊', label: 'Lápiz' },
    { id: 'marker', icon: '✏️', label: 'Rotulador' },
    { id: 'shapes', icon: '🔶', label: 'Formas' },
    { id: 'eraser', icon: '⬜', label: 'Borrador' },
];

export default function DrawingToolbar({ mode, activeTool, onToolChange, onUndo, onClear }: DrawingToolbarProps) {
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (mode === 'draw') {
            setVisible(true);
            resetHideTimer();
        } else {
            setVisible(false);
        }
    }, [mode]);

    const resetHideTimer = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };

    const handleToolClick = (t: DrawTool) => {
        onToolChange(t);
        resetHideTimer();
    };

    if (!visible) return null;

    return (
        <div
            onPointerEnter={resetHideTimer}
            style={{
                position: 'fixed',
                top: 80,
                right: 20,
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: 'rgba(10,10,20,0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18,
                padding: '10px 8px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
                animation: 'fadeInRight 200ms ease both',
            }}
        >
            {TOOLS.map(t => (
                <button
                    key={t.id}
                    onClick={() => handleToolClick(t.id)}
                    title={t.label}
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        border: activeTool === t.id
                            ? '1.5px solid rgba(59,130,246,0.8)'
                            : '1.5px solid transparent',
                        background: activeTool === t.id
                            ? 'rgba(59,130,246,0.2)'
                            : 'transparent',
                        fontSize: 22,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                >
                    {t.icon}
                </button>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 4px' }} />
            <button
                onClick={() => { onUndo(); resetHideTimer(); }}
                title="Deshacer"
                style={{
                    width: 52, height: 52, borderRadius: 12, border: '1.5px solid transparent',
                    background: 'transparent', fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', transition: 'all 0.15s',
                }}
            >
                ↩
            </button>
        </div>
    );
}
```

---

## Phase 6 — Wire InlineCanvas + DrawingToolbar into NoteEditor

### Task 7: Integrate drawing system in NoteEditor

**Files:** `frontend/src/components/notes/NoteEditor.tsx`

- [ ] Add imports:
```tsx
import { usePointerMode } from '../../hooks/usePointerMode';
import InlineCanvas from './InlineCanvas';
import DrawingToolbar, { DrawTool } from './DrawingToolbar';
import type { RecognitionResult } from '../../hooks/useStrokeRecognition';
```
- [ ] Add state and refs near the other state declarations:
```tsx
const editorAreaRef = useRef<HTMLDivElement>(null);
const { mode, setMode } = usePointerMode(editorAreaRef);
const [drawTool, setDrawTool] = useState<DrawTool>('pen');
const undoHistoryRef = useRef<string[]>([]);
```
- [ ] Add `handleRecognized` handler:
```tsx
const handleRecognized = (result: RecognitionResult) => {
    if (!editor) return;
    if (result.type === 'latex') {
        editor.chain().focus().insertContent(`$${result.content}$`).run();
    } else if (result.type === 'text') {
        editor.chain().focus().insertContent(result.content).run();
    } else {
        editor.chain().focus().insertContent(`<img src="${result.dataUrl}" alt="Dibuix" style="max-width:100%;border-radius:8px;margin:8px 0;" />`).run();
    }
};
```
- [ ] Wrap the `flex-1 overflow-y-auto` editing div with `ref={editorAreaRef}`:
  Find: `<div className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide relative">`
  Replace: `<div ref={editorAreaRef} className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide relative">`
- [ ] Add InlineCanvas and DrawingToolbar just before the closing tag of the outermost `<div className="flex flex-col h-full...">`:
```tsx
<InlineCanvas
    mode={mode}
    editorRef={editorAreaRef}
    onRecognized={handleRecognized}
    brushType={drawTool === 'shapes' ? 'pen' : drawTool}
/>
<DrawingToolbar
    mode={mode}
    activeTool={drawTool}
    onToolChange={setDrawTool}
    onUndo={() => window.dispatchEvent(new CustomEvent('canvas-undo'))}
    onClear={() => window.dispatchEvent(new CustomEvent('canvas-clear'))}
/>
```
- [ ] Run `npm run build` — 0 errors.

---

## Phase 7 — MathPill ("=" detection)

### Task 8: Create `MathPill` component

**File:** `frontend/src/components/notes/MathPill.tsx`

- [ ] Create the file:
```tsx
import React, { useEffect, useRef } from 'react';

interface MathPillProps {
    visible: boolean;
    position: { top: number; left: number } | null;
    onResolve: () => void;
}

export default function MathPill({ visible, position, onResolve }: MathPillProps) {
    if (!visible || !position) return null;
    return (
        <div
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left + 8,
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 20,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
                color: '#60a5fa',
                fontWeight: 700,
                backdropFilter: 'blur(8px)',
                animation: 'mathPillPulse 1s ease-in-out infinite',
                userSelect: 'none',
                pointerEvents: 'all',
            }}
            onClick={onResolve}
        >
            <span style={{ fontSize: 14 }}>⚡</span>
            <span>Resolver</span>
        </div>
    );
}
```

### Task 9: Add "=" detection to RichEditor

**File:** `frontend/src/components/notes/RichEditor.tsx`

- [ ] Update props interface to add:
```tsx
onEqualsDetected?: (show: boolean, pos: { top: number; left: number } | null, resolve: () => void) => void;
```
- [ ] Inside the `useEditor` `onUpdate` callback, add after `onChange(editor.getHTML())`:
```tsx
// "=" detection — Apple Math Notes style
const { state } = editor;
const { from } = state.selection;
const resolved = state.doc.resolve(from);
const lineText = resolved.parent.textContent;
const eqMatch = /^(.+[^=\s])\s*=\s*$/.test(lineText.trimEnd());
if (eqMatch && props.onEqualsDetected) {
    const coords = editor.view.coordsAtPos(from);
    props.onEqualsDetected(true, { top: coords.top - 4, left: coords.left }, async () => {
        const { mathFix } = await import('../../api/mathApi');
        const expr = lineText.replace(/=\s*$/, '').trim();
        try {
            const res = await mathFix(expr, 'solve');
            if (res.latex) {
                editor.chain().focus().insertContent(` $${res.latex}$`).run();
            }
        } catch { /* silent */ }
        props.onEqualsDetected?.(false, null, () => {});
    });
} else if (props.onEqualsDetected) {
    props.onEqualsDetected(false, null, () => {});
}
```
- [ ] Note: extract the `onUpdate` so `props` is accessible (RichEditor needs to reference the prop). Adjust as needed to avoid stale closure.

### Task 10: Wire MathPill in NoteEditor

**Files:** `frontend/src/components/notes/NoteEditor.tsx`

- [ ] Import: `import MathPill from './MathPill';`
- [ ] Add state:
```tsx
const [mathPill, setMathPill] = useState<{
    visible: boolean;
    pos: { top: number; left: number } | null;
    resolve: () => void;
}>({ visible: false, pos: null, resolve: () => {} });
```
- [ ] Pass to RichEditor:
```tsx
onEqualsDetected={(show, pos, resolve) =>
    setMathPill({ visible: show, pos: pos, resolve: resolve ?? (() => {}) })
}
```
- [ ] Render MathPill after InlineCanvas:
```tsx
<MathPill
    visible={mathPill.visible}
    position={mathPill.pos}
    onResolve={mathPill.resolve}
/>
```
- [ ] Add `@keyframes mathPillPulse` animation to `index.css`:
```css
@keyframes mathPillPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.75; transform: scale(0.97); }
}
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(12px); }
    to { opacity: 1; transform: translateX(0); }
}
```
- [ ] Run `npm run build` — 0 errors.

---

## Phase 8 — Final build & smoke test

### Task 11: Final verification

- [ ] Run `cd frontend && npm run build` — 0 errors, 0 TS errors
- [ ] Run `cd frontend && npm run dev` — open in browser
- [ ] Verify: SelectionMenu appears on text selection with 3 rows
- [ ] Verify: SolvePanel opens from SelectionMenu "Resolver"
- [ ] Verify (desktop simulation): change `e.pointerType` override in DevTools → drawing toolbar appears
- [ ] Commit: `feat: smart paper — inline canvas, drawing toolbar, SelectionMenu, MathPill`
