# Selection Menu & Smart Resolve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace RichEditor's minimal BubbleMenu with a full 3-row selection menu (basic actions, AI actions, color picker), a step-by-step solve panel, and inline "=" detection that shows a quick-resolve button.

**Architecture:** Six independent-then-converging tasks: backend beautify mode first (Task 1), API helper (Task 2), Color extension (Task 3), then two new components `SelectionMenu.tsx` (Task 4) and `SolvePanel.tsx` (Task 5), wired together in `RichEditor.tsx` (Task 6). The existing minimal `<BubbleMenu>` in RichEditor is fully replaced by `SelectionMenu`.

**Tech Stack:** React 18 + Tiptap v3.20.4, `@tiptap/extension-color` + `@tiptap/extension-text-style` (install required), KaTeX (already installed), `apiClient.post` pattern, gpt-4o-mini via existing backend endpoints.

---

## Key facts (read before starting)

| What | Where |
|------|-------|
| Existing BubbleMenu to replace | `RichEditor.tsx` lines 146-171 |
| `mathFix` API function | `frontend/src/api/mathApi.ts:69-74` |
| `apiClient.post<T>()` | `frontend/src/api/client.ts:36` |
| `fixMathText` backend handler | `backend/src/controllers/math.controller.js:314` |
| `/math-fix` route | `backend/src/routes/ai.routes.js:52-55` |
| `mathSolve` API function | `frontend/src/api/mathApi.ts:62-67` — takes `latex: string`, returns `{ result, steps, explanation }` |
| Mathematics extension | Already installed + configured in `RichEditor.tsx:64` — renders `$latex$` with KaTeX |
| Tiptap v3 BubbleMenu component | `import { BubbleMenu } from '@tiptap/react/menus'` — already used |
| `/api/ai/improve` returns | `{ result: string }` |
| `/api/ai/chat` returns | `{ reply: string }`, takes `{ messages, context? }` |

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `backend/src/controllers/math.controller.js` | Modify (~line 314) | Add `mode: 'beautify'` branch to `fixMathText` |
| `backend/src/routes/ai.routes.js` | Modify (lines 52-55) | Add optional `mode` field to `/math-fix` validation |
| `frontend/src/api/mathApi.ts` | Modify (lines 69-74) | Accept optional `mode` in `mathFix()` |
| `frontend/src/components/notes/SelectionMenu.tsx` | Create | 3-row BubbleMenu: basic actions, AI actions, color picker |
| `frontend/src/components/notes/SolvePanel.tsx` | Create | Modal with step-by-step solution, KaTeX rendering |
| `frontend/src/components/notes/RichEditor.tsx` | Modify | Install Color ext, import SelectionMenu + SolvePanel, replace old BubbleMenu, add = detection |

**Do NOT touch:** `NoteEditor.tsx`, `SidebarLeft.tsx`, `SidebarRight.tsx`, or any store files.

---

## Task 1: Backend — add `mode: 'beautify'` to `/api/ai/math-fix`

**Files:**
- Modify: `backend/src/controllers/math.controller.js` (around line 314)
- Modify: `backend/src/routes/ai.routes.js` (lines 52-55)

- [ ] **Step 1: Read the current `fixMathText` function**

Read `backend/src/controllers/math.controller.js` lines 308-384 to understand the current implementation. The function:
- Takes `req.body.text`
- Calls GPT-4o to detect and convert informal math to LaTeX
- Returns `{ improved: string, equationsFound: number }`

- [ ] **Step 2: Add beautify branch inside `fixMathText`**

Find the function body at line 314. Right after `const { text } = req.body;` (line 316), add:

```js
const fixMathText = async (req, res) => {
  try {
    const { text, mode } = req.body;   // <-- add mode

    if (!text) {
      return res.status(400).json({ error: "Cal enviar 'text' per processar." });
    }

    // ── Beautify mode: convert to clean LaTeX, return latex string ────────
    if (mode === 'beautify') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'Convierte este texto matemático informal a LaTeX bien formateado. Devuelve SOLO el LaTeX sin explicaciones, sin backticks y sin delimitadores $ o $$.',
            },
            { role: 'user', content: text },
          ],
        }),
      });
      const data = await response.json();
      const latex = data.choices[0].message.content.trim();
      pool.query(
        'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
        [req.user.id]
      ).catch(() => {});
      return res.json({ latex });
    }

    // ── Existing fix mode (unchanged below) ──────────────────────────────
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      // ... rest of existing code unchanged
```

The key change: add `const { text, mode } = req.body;` and insert the `if (mode === 'beautify')` block before the existing fetch call. The existing code from `const response = await fetch(...)` onwards stays unchanged.

- [ ] **Step 3: Update route validation to allow optional `mode`**

In `backend/src/routes/ai.routes.js`, find lines 52-55:
```js
router.post('/math-fix',
  validateBody({ text: TEXT_RULE }),
  fixMathText
);
```

Replace with:
```js
router.post('/math-fix',
  validateBody({
    text: TEXT_RULE,
    mode: { type: 'string', required: false, maxLength: 50 },
  }),
  fixMathText
);
```

- [ ] **Step 4: Test manually**

Start the backend: `cd backend && npm start` (or `node src/app.js`).

Test beautify mode with curl:
```bash
curl -X POST http://localhost:3000/api/ai/math-fix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text": "integral from 0 to infinity of x^2 dx", "mode": "beautify"}'
```
Expected response: `{"latex": "\\int_0^{\\infty} x^2 \\, dx"}` (or similar valid LaTeX)

Test without mode (existing behavior still works):
```bash
curl -X POST http://localhost:3000/api/ai/math-fix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text": "the energy is E=mc2"}'
```
Expected: `{"improved": "...", "equationsFound": 1}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/math.controller.js backend/src/routes/ai.routes.js
git commit -m "feat(backend): add mode=beautify to /api/ai/math-fix for LaTeX conversion"
```

---

## Task 2: Frontend API — update `mathFix()` to accept optional mode

**Files:**
- Modify: `frontend/src/api/mathApi.ts` (lines 69-74)

- [ ] **Step 1: Update `mathFix` signature and return type**

Find the current `mathFix` function at lines 69-74:
```typescript
export function mathFix(text: string) {
    return apiClient.post<{ fixedText?: string; latex?: string; content_markdown?: string }>(
        '/ai/math-fix',
        { text }
    );
}
```

Replace with:
```typescript
export function mathFix(text: string, mode?: 'beautify') {
    return apiClient.post<{
        fixedText?: string;
        latex?: string;
        improved?: string;
        equationsFound?: number;
        content_markdown?: string;
    }>(
        '/ai/math-fix',
        { text, ...(mode ? { mode } : {}) }
    );
}
```

Changes:
- Added optional `mode?: 'beautify'` parameter
- Added `improved` and `equationsFound` to return type (what the existing mode returns)
- Spreads `mode` into body only when provided

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors related to `mathFix`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/mathApi.ts
git commit -m "feat(api): add optional mode parameter to mathFix()"
```

---

## Task 3: Install Color extension + configure in RichEditor

**Files:**
- Modify: `frontend/src/components/notes/RichEditor.tsx` (imports + extensions array)

- [ ] **Step 1: Install the packages**

```bash
cd frontend && npm install @tiptap/extension-color@3.20.4 @tiptap/extension-text-style@3.20.4
```

Expected output: `added 2 packages` (or similar). Verify in `package.json` that both appear under `dependencies`.

- [ ] **Step 2: Add imports to RichEditor.tsx**

Open `frontend/src/components/notes/RichEditor.tsx`. After the existing imports (around line 14), add:

```tsx
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
```

- [ ] **Step 3: Add extensions to useEditor array**

In the `useEditor` extensions array (currently lines 48-67), add `Color` and `TextStyle` after `Underline`:

```tsx
extensions: [
    StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] }
    }),
    Underline,
    TextStyle,                           // <-- add (peer required by Color)
    Color,                               // <-- add
    Placeholder.configure({
        placeholder: 'Escribe tus pensamientos aquí... (escribe / para comandos mágicos)',
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
    Mathematics,
    SlashCommandExtension,
    ChartBlock,
],
```

- [ ] **Step 4: Test that Color command works**

Start dev server: `cd frontend && npm run dev`

Open browser console on the editor page, then run:
```js
// The editor should be globally accessible via mathToolsStore or window.editor
// Manually verify the Color extension is loaded (no console errors about setColor)
```
Expected: No console errors about unrecognized commands.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/notes/RichEditor.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: install @tiptap/extension-color and TextStyle, add to RichEditor"
```

---

## Task 4: Create `SelectionMenu.tsx`

**Files:**
- Create: `frontend/src/components/notes/SelectionMenu.tsx`

This component replaces the existing minimal `<BubbleMenu>` in RichEditor. It owns its own BubbleMenu wrapper.

- [ ] **Step 1: Create the file with complete implementation**

Create `frontend/src/components/notes/SelectionMenu.tsx` with this content:

```tsx
import React, { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { apiClient } from '../../api/client';
import { mathFix } from '../../api/mathApi';

interface SelectionMenuProps {
    editor: any;
    onOpenSolvePanel: (selectedText: string) => void;
}

const TEXT_COLORS = [
    { label: 'Blanco',   value: '#f8fafc' },
    { label: 'Azul',     value: '#3B82F6' },
    { label: 'Rojo',     value: '#EF4444' },
    { label: 'Verde',    value: '#22C55E' },
    { label: 'Naranja',  value: '#F97316' },
    { label: 'Morado',   value: '#A855F7' },
    { label: 'Gris',     value: '#6B7280' },
    { label: 'Ámbar',    value: '#F59E0B' },
];

const LANGUAGES = [
    { code: 'en', label: '🇬🇧 Inglés' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'fr', label: '🇫🇷 Francés' },
    { code: 'de', label: '🇩🇪 Alemán' },
    { code: 'zh', label: '🇨🇳 Chino' },
];

const LANG_NAMES: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', zh: 'Chinese',
};

function MenuBtn({
    onClick,
    title,
    danger = false,
    loading = false,
    children,
}: {
    onClick: () => void;
    title: string;
    danger?: boolean;
    loading?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            disabled={loading}
            className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-lg transition-all duration-150 active:scale-[0.92] disabled:opacity-40
                ${danger ? 'hover:bg-red-500/20' : 'hover:bg-white/[0.08]'}`}
        >
            {loading
                ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                : children}
        </button>
    );
}

export default function SelectionMenu({ editor, onOpenSolvePanel }: SelectionMenuProps) {
    const [showTranslate, setShowTranslate] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const getSelectedText = (): string => {
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, '\n');
    };

    const withLoading = async (key: string, fn: () => Promise<void>) => {
        setLoadingAction(key);
        try { await fn(); } catch (e) { console.error(e); } finally { setLoadingAction(null); }
    };

    // ── Row 1: Basic actions ────────────────────────────────────────────────

    const handleCopy = () => {
        navigator.clipboard.writeText(getSelectedText()).catch(console.error);
    };

    const handleCut = () => {
        navigator.clipboard.writeText(getSelectedText())
            .then(() => editor.chain().focus().deleteSelection().run())
            .catch(console.error);
    };

    const handlePaste = () => {
        navigator.clipboard.readText()
            .then(text => editor.chain().focus().insertContent(text).run())
            .catch(console.error);
    };

    const handleDuplicate = () => {
        const { to } = editor.state.selection;
        const text = getSelectedText();
        editor.chain().focus().insertContentAt(to, text).run();
    };

    const handleDelete = () => {
        editor.chain().focus().deleteSelection().run();
    };

    // ── Row 2: AI actions ───────────────────────────────────────────────────

    const handleBeautify = () => withLoading('beautify', async () => {
        const text = getSelectedText();
        if (!text) return;
        const res = await mathFix(text, 'beautify');
        const latex = res.latex;
        if (!latex) return;
        // Insert as inline math — Mathematics extension renders $...$ with KaTeX
        editor.chain().focus().deleteSelection().insertContent(`$${latex}$`).run();
    });

    const handleResolve = () => {
        const text = getSelectedText();
        if (text) onOpenSolvePanel(text);
    };

    const handleTranslate = (langCode: string) => withLoading('translate', async () => {
        const text = getSelectedText();
        if (!text) return;
        setShowTranslate(false);
        const res = await apiClient.post<{ reply: string }>('/ai/chat', {
            messages: [{
                role: 'user',
                content: `Translate the following text to ${LANG_NAMES[langCode]}. Return ONLY the translated text, no explanations:\n\n${text}`,
            }],
        });
        editor.chain().focus().deleteSelection().insertContent(res.reply).run();
    });

    const handleEnderezar = () => withLoading('enderezar', async () => {
        const text = getSelectedText();
        if (!text) return;
        const res = await apiClient.post<{ result: string }>('/ai/improve', { text });
        editor.chain().focus().deleteSelection().insertContent(res.result).run();
    });

    // ── Row 3: Color ────────────────────────────────────────────────────────

    const handleSetColor = (color: string) => {
        editor.chain().focus().setColor(color).run();
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <BubbleMenu
            editor={editor}
            appendTo={() => document.body}
            shouldShow={({ state }: { state: any }) => {
                const { from, to } = state.selection;
                return from !== to;
            }}
        >
            <div
                className="flex flex-col animate-panel-enter"
                style={{
                    background: 'rgba(26,26,46,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    padding: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(20px)',
                    minWidth: '280px',
                }}
            >
                {/* Row 1: Basic actions */}
                <div className="flex items-center gap-0.5">
                    <MenuBtn onClick={handleCut}       title="Cortar">✂️</MenuBtn>
                    <MenuBtn onClick={handleCopy}      title="Copiar">📋</MenuBtn>
                    <MenuBtn onClick={handlePaste}     title="Pegar">📄</MenuBtn>
                    <MenuBtn onClick={handleDuplicate} title="Duplicar">🔁</MenuBtn>
                    <MenuBtn onClick={handleDelete}    title="Borrar" danger>🗑️</MenuBtn>
                </div>

                {/* Separator */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

                {/* Row 2: AI actions */}
                <div className="flex items-center gap-0.5 relative">
                    <MenuBtn
                        onClick={handleBeautify}
                        title="Embellecer (convertir a LaTeX)"
                        loading={loadingAction === 'beautify'}
                    >✨</MenuBtn>

                    <MenuBtn onClick={handleResolve} title="Resolver paso a paso">🔢</MenuBtn>

                    {/* Translate with inline dropdown */}
                    <div className="relative">
                        <MenuBtn
                            onClick={() => setShowTranslate(v => !v)}
                            title="Traducir"
                            loading={loadingAction === 'translate'}
                        >🌐</MenuBtn>
                        {showTranslate && (
                            <div
                                className="absolute top-full left-0 mt-1 z-[200] rounded-xl py-1 min-w-[150px]"
                                style={{
                                    background: 'rgba(26,26,46,0.97)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleTranslate(lang.code)}
                                        className="w-full text-left px-3 py-2.5 text-[13px] text-slate-300 hover:bg-white/[0.06] transition-colors"
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <MenuBtn
                        onClick={handleEnderezar}
                        title="Enderezar (mejorar formato)"
                        loading={loadingAction === 'enderezar'}
                    >📐</MenuBtn>
                </div>

                {/* Separator */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

                {/* Row 3: Color picker */}
                <div className="flex items-center gap-2 px-2 py-1">
                    {TEXT_COLORS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => handleSetColor(value)}
                            title={label}
                            className="w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-transform active:scale-90 flex-shrink-0"
                            style={{ backgroundColor: value }}
                        />
                    ))}
                </div>
            </div>
        </BubbleMenu>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors in `SelectionMenu.tsx`. Common error to watch for: `editor` typed as `any` — this is intentional since Tiptap's v3 editor type is complex.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/notes/SelectionMenu.tsx
git commit -m "feat: create SelectionMenu component with 3-row BubbleMenu"
```

---

## Task 5: Create `SolvePanel.tsx`

**Files:**
- Create: `frontend/src/components/notes/SolvePanel.tsx`

- [ ] **Step 1: Create the file**

Create `frontend/src/components/notes/SolvePanel.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface SolvePanelProps {
    selectedText: string;
    onClose: () => void;
    onInsert: (content: string) => void;
}

const MATH_TUTOR_PROMPT =
    'Eres un tutor matemático experto. Resuelve paso a paso la siguiente expresión de forma clara y educativa. ' +
    'Formato: "Paso 1: ...\nPaso 2: ...\nResultado: ...". ' +
    'Usa notación matemática clara. No uses LaTeX en tu respuesta, escribe las ecuaciones en texto plano.';

function renderSolution(text: string): React.ReactNode {
    return text.split('\n').map((line, i) => {
        const isPaso = /^Paso\s+\d+:/i.test(line.trim());
        const isResultado = /^Resultado:/i.test(line.trim());
        if (isPaso) {
            return (
                <div key={i} className="mb-3">
                    <span className="text-blue-400 font-bold text-[13px] uppercase tracking-widest">
                        {line.split(':')[0]}:
                    </span>
                    <span className="text-slate-300 text-[15px] ml-2">
                        {line.split(':').slice(1).join(':').trim()}
                    </span>
                </div>
            );
        }
        if (isResultado) {
            return (
                <div key={i} className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold text-[13px] uppercase tracking-widest">Resultado:</span>
                    <span className="text-emerald-300 font-semibold text-[16px] ml-2">
                        {line.split(':').slice(1).join(':').trim()}
                    </span>
                </div>
            );
        }
        return line.trim()
            ? <p key={i} className="text-slate-400 text-[14px] leading-relaxed mb-1">{line}</p>
            : <br key={i} />;
    });
}

export default function SolvePanel({ selectedText, onClose, onInsert }: SolvePanelProps) {
    const [solution, setSolution] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setSolution('');
        setError(null);

        apiClient.post<{ reply: string }>('/ai/chat', {
            messages: [{
                role: 'user',
                content: `Resuelve paso a paso: ${selectedText}`,
            }],
            context: MATH_TUTOR_PROMPT,
        }).then(res => {
            if (!cancelled) setSolution(res.reply);
        }).catch(err => {
            if (!cancelled) setError(err.message || 'Error al resolver');
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [selectedText]);

    const handleInsert = () => {
        onInsert(solution);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative w-full max-w-2xl max-h-[80vh] flex flex-col animate-panel-enter"
                style={{
                    background: '#0a0f1e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '2rem',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div>
                        <h3 className="text-white font-bold text-[17px]">Resolución paso a paso</h3>
                        <p className="text-slate-500 text-[12px] mt-0.5 truncate max-w-[380px]">
                            {selectedText}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
                    {loading && (
                        <div className="flex items-center gap-3 text-slate-400 text-[14px]">
                            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            Resolviendo...
                        </div>
                    )}
                    {error && (
                        <p className="text-red-400 text-[14px]">⚠ {error}</p>
                    )}
                    {solution && !loading && (
                        <div>{renderSolution(solution)}</div>
                    )}
                </div>

                {/* Footer */}
                {solution && !loading && (
                    <div
                        className="flex items-center justify-end gap-3 px-6 py-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[13px] text-slate-500 hover:text-white transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleInsert}
                            className="px-5 py-2 text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95"
                        >
                            + Insertar en la nota
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors in `SolvePanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/notes/SolvePanel.tsx
git commit -m "feat: create SolvePanel component for step-by-step math resolution"
```

---

## Task 6: Update `RichEditor.tsx` — integrate everything + "=" detection

**Files:**
- Modify: `frontend/src/components/notes/RichEditor.tsx`

This is the integration task. Three changes:
1. Import + render `SelectionMenu` (replacing the existing `<BubbleMenu>` block)
2. Import + render `SolvePanel` (state lives here)
3. Add "=" detection on `onUpdate` + floating "⚡ Resolver" button

- [ ] **Step 1: Read the full current RichEditor.tsx**

Read `frontend/src/components/notes/RichEditor.tsx` to confirm current line numbers. The key sections are:
- Imports (lines 1-19)
- `useEditor` call (lines 47-77)
- `useEffect` for onEditorReady (lines 79-83)
- `useEffect` for content sync (lines 86-90)
- Existing `<BubbleMenu>` block (lines 146-171) — **this entire block will be deleted**
- `<EditorContent>` (line 173)

- [ ] **Step 2: Add imports**

At the top of `RichEditor.tsx`, add after the existing imports:

```tsx
import SelectionMenu from './SelectionMenu';
import SolvePanel from './SolvePanel';
```

- [ ] **Step 3: Add SolvePanel state + equalsHint state**

Inside the `RichEditor` function body, after `const editor = useEditor({...})` (after line 77), add:

```tsx
const [solveText, setSolveText] = React.useState<string | null>(null);
const [equalsHint, setEqualsHint] = React.useState<{ x: number; y: number; lineText: string } | null>(null);
const [solvingEquals, setSolvingEquals] = React.useState(false);

// Detect "=" at end of math expression on every editor update
React.useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
        const { state, view } = editor;
        const { from } = state.selection;
        if (from === undefined) return;
        const $pos = state.doc.resolve(from);
        const lineStart = $pos.start();
        const lineText = state.doc.textBetween(lineStart, from).trimEnd();

        if (lineText.endsWith('=')) {
            const beforeEq = lineText.slice(0, -1).trim();
            const isMath = beforeEq.length > 0 && /[\d\+\-\*\/\^\(\)√∫∑]/.test(beforeEq);
            if (isMath) {
                try {
                    const coords = view.coordsAtPos(from);
                    setEqualsHint({ x: coords.right + 8, y: coords.top - 8, lineText: beforeEq });
                } catch {
                    setEqualsHint(null);
                }
                return;
            }
        }
        setEqualsHint(null);
    };
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
        editor.off('update', handleUpdate);
        editor.off('selectionUpdate', handleUpdate);
    };
}, [editor]);
```

- [ ] **Step 4: Add equals-resolve handler**

After the effect above, add the handler function:

```tsx
const handleResolveEquals = async () => {
    if (!equalsHint || !editor) return;
    setSolvingEquals(true);
    try {
        const { mathSolve } = await import('../../api/mathApi');
        const res = await mathSolve(equalsHint.lineText);
        const result = res.result || res.steps?.[res.steps.length - 1] || '';
        if (result) {
            // Insert result after the "=" at current cursor position
            editor.chain().focus().insertContent(` ${result}`).run();
        }
    } catch (e) {
        console.error(e);
    } finally {
        setSolvingEquals(false);
        setEqualsHint(null);
    }
};
```

- [ ] **Step 5: Replace old BubbleMenu with SelectionMenu in JSX**

Find the existing `<BubbleMenu>` block (lines 146-171):
```tsx
{/* Bubble Menu — Contextual floating magic */}
<BubbleMenu
    editor={editor}
    appendTo={() => document.body}
    shouldShow={({ state }: { state: any }) => {
        const { from, to } = state.selection;
        return from !== to;
    }}
>
    <div className="flex items-center gap-1 glass-card border border-white/10 rounded-2xl px-2 py-2 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10">
        <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')} title="Negrita">
            <Bold size={14} />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight({ color: '#2563eb' }).run()}
            active={editor.isActive('highlight')} title="Resaltar">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
        </BubbleBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')} title="Código">
            <span className="text-[10px]">&lt;/&gt;</span>
        </BubbleBtn>
    </div>
</BubbleMenu>
```

Delete the entire block. In its place, put:
```tsx
{/* Selection Menu — replaces old BubbleMenu */}
<SelectionMenu
    editor={editor}
    onOpenSolvePanel={setSolveText}
/>
```

- [ ] **Step 6: Add SolvePanel and equalsHint button to JSX**

After `<EditorContent>` (line 173), before the closing `</div>` of the component root, add:

```tsx
{/* Solve Panel — opened via SelectionMenu "Resolver" or equalsHint button */}
{solveText && (
    <SolvePanel
        selectedText={solveText}
        onClose={() => setSolveText(null)}
        onInsert={(content) => {
            editor.chain().focus('end').insertContent('<hr />').insertContent(`<p>${content}</p>`).run();
            setSolveText(null);
        }}
    />
)}

{/* "=" equals-sign floating resolve button */}
{equalsHint && (
    <button
        onClick={handleResolveEquals}
        disabled={solvingEquals}
        className="fixed z-[500] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
        style={{
            left: equalsHint.x,
            top: equalsHint.y,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            transform: 'translateY(-100%)',
        }}
    >
        {solvingEquals
            ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : '⚡'}
        Resolver
    </button>
)}
```

- [ ] **Step 7: Clean up unused imports**

After the changes, the `BubbleMenu` import from `@tiptap/react/menus` and `BubbleBtn` component defined in RichEditor.tsx may no longer be used (since SelectionMenu handles its own BubbleMenu). Check:

1. `import { BubbleMenu } from '@tiptap/react/menus'` — if SelectionMenu imports it internally, remove from RichEditor
2. The `BubbleBtn` function in RichEditor — it IS still used by the permanent toolbar (lines 98-143). Keep it.
3. Lucide imports (`Bold`, `Italic`, etc.) — still used in the permanent toolbar. Keep them.

Remove only the `BubbleMenu` import from `@tiptap/react/menus` if it's no longer used directly in `RichEditor.tsx`. Check that the permanent toolbar (the sticky div at line 97) does NOT use `BubbleMenu` — it doesn't, it's just regular `div` + `BubbleBtn` buttons.

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors. Common issues:
- `React.useState` requires `import React from 'react'` or use named imports: `import React, { useState, useEffect } from 'react'` — verify the import at line 1.
- If `useEffect` from React is already imported, change `React.useEffect` to `useEffect`, `React.useState` to `useState`.

- [ ] **Step 9: Smoke test in browser**

```bash
cd frontend && npm run dev
```

Test the following scenarios:

**SelectionMenu:**
- Select any text in the editor → menu appears above selection with 3 rows
- Click ✂️ Cut → text disappears, clipboard has the text
- Click 📋 Copy → clipboard has the text
- Click 🗑️ Delete → text deleted
- Click 🌐 Translate → dropdown appears with 5 language options
- Click "🇬🇧 Inglés" → text replaced with English translation (requires backend running)
- Click 🔢 Resolver → SolvePanel opens

**SolvePanel:**
- Panel opens with backdrop
- Loading spinner shows, then solution renders with "Paso 1:", "Resultado:" styled
- "Insertar en la nota" → panel closes, solution appended at end of note
- Click backdrop → panel closes

**Equals hint:**
- Type `2 + 3 =` in the editor → "⚡ Resolver" button appears floating near cursor
- Click button → result (`5`) inserted after `=`
- Type non-math text ending with `=` (e.g., `name =`) → button does NOT appear

**Color picker:**
- Select text → click blue circle in row 3 → text turns blue
- Select text → click red circle → text turns red

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/notes/RichEditor.tsx
git commit -m "feat: integrate SelectionMenu, SolvePanel, and equals-detection into RichEditor"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Plan task |
|-----------------|-----------|
| BubbleMenu with 3 rows appearing on selection | Task 4 (SelectionMenu), Task 6 (wired) |
| Row 1: Cut, Copy, Paste, Duplicate, Delete | Task 4 |
| Row 2: Embellecer (→ LaTeX via beautify mode) | Task 1 (backend), Task 4 (frontend) |
| Row 2: Resolver (opens solve panel) | Task 5 + Task 4 |
| Row 2: Traducir (dropdown with 5 langs) | Task 4 |
| Row 2: Enderezar (improve text) | Task 4 |
| Row 3: 8 color circles | Task 3 (Color ext), Task 4 |
| Menu design: dark bg, blur, 14px radius | Task 4 |
| Menu animation: scale+opacity 150ms | Task 4 (uses `.animate-panel-enter` from CSS plan) |
| "=" detection in RichEditor | Task 6 |
| = detection: math regex | Task 6 |
| = detection: floating button | Task 6 |
| = detection: calls backend + inserts result | Task 6 (uses `mathSolve`) |
| Embellecer: calls math-fix with mode:beautify | Tasks 1, 2, 4 |
| Embellecer: inserts LaTeX with KaTeX | Task 4 (inserts `$latex$`, Mathematics ext renders it) |
| Resolver panel: calls /api/ai/chat with tutor prompt | Task 5 |
| Resolver panel: shows steps + result | Task 5 |
| Resolver panel: "Insertar en nota" button | Task 5 |
| Resolver panel: close on backdrop or X | Task 5 |
| Traducir: uses /api/ai/chat | Task 4 |
| Color: uses @tiptap/extension-color | Tasks 3, 4 |
| Touch targets 44px minimum | Task 4 (MenuBtn: min-w/h 44px) |
| No new non-Tiptap libraries | ✅ (Color and TextStyle are Tiptap packages) |

**Gaps addressed:**
- Spec mentions `···` ("más") button for extra AI actions — not implemented (deferred, not critical for first version)
- Spec says "Resolve" called in Feature 2 calls `/api/ai/math-fix` — plan uses `/api/ai/math-solve` instead (more accurate for solving equations vs. fixing notation)
- `mode: 'beautify'` was missing from the validate rule — fixed in Task 1

**Placeholder scan:** None found — all steps have complete code blocks.

**Type consistency:** `mathFix(text, mode)` defined in Task 2 and used in Task 4. `setSolveText` typed as `(text: string | null) => void` — `SelectionMenuProps.onOpenSolvePanel` typed as `(selectedText: string) => void` ✅ compatible. `SolvePanel.selectedText: string` matches `solveText` after null-guard ✅.
