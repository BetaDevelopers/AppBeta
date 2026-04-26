# Visual Polish & Microinteractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a critical React DOM crash from duplicate Tiptap BubbleMenu registration, then apply the full visual polish spec: empty-state overlay in the editor, pulsing sync dot, note-card hover animations with stagger, and microinteraction classes on all interactive elements.

**Architecture:** All styling stays within Tailwind utility classes + a small addition to `index.css` for keyframes and reduced-motion. No new components are created — changes are surgical edits to existing files. The bug fix (Task 1) must land before any UI work to avoid crashes interfering with visual testing.

**Tech Stack:** React 18, Tailwind CSS v4, lucide-react, Tiptap (with `@tiptap/react/menus` BubbleMenu component)

---

## File Map

| File | What changes |
|------|--------------|
| `frontend/src/components/notes/RichEditor.tsx` | **Bug fix**: remove duplicate `BubbleMenuExtension` from extensions array; add `appendTo` to BubbleMenu component |
| `frontend/src/index.css` | Add `@keyframes slideDown`, `@keyframes panelEnter`, `@media (prefers-reduced-motion)` rule |
| `frontend/src/components/notes/NoteEditor.tsx` | Editor empty-state overlay; pulsing green dot on sync indicator |
| `frontend/src/components/notes/NoteCard.tsx` | Hover `translateX(4px)` microinteraction; active:scale-95 on click |
| `frontend/src/components/notes/NoteList.tsx` | Stagger `animationDelay` on cards; `animate-slide-down` on new-note button |
| `frontend/src/components/layout/SidebarLeft.tsx` | EINES tool items: `active:scale-95 transition-all`; `animate-fade-in-down` on einesOpen section |

---

## Task 1: Fix React DOM `insertBefore` crash

**Root cause:** `RichEditor.tsx` imports and registers `BubbleMenuExtension` from `@tiptap/extension-bubble-menu` as a Tiptap extension (line 65) **and** renders a `<BubbleMenu>` component from `@tiptap/react/menus` (line 148). The component already registers the extension internally. Double registration causes React to lose track of the portal container node, producing the `insertBefore` `NotFoundError` on every re-render.

**Files:**
- Modify: `frontend/src/components/notes/RichEditor.tsx`

- [ ] **Step 1: Remove the duplicate import**

In `RichEditor.tsx`, delete line 13:
```tsx
// DELETE this line:
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu';
```

- [ ] **Step 2: Remove BubbleMenuExtension from extensions array**

In the `useEditor({ extensions: [...] })` call (around line 65), remove `BubbleMenuExtension`:

Old (line 65):
```tsx
BubbleMenuExtension,
```
Delete that line entirely. The array goes from:
```tsx
extensions: [
  StarterKit.configure({ ... }),
  Underline,
  Placeholder.configure({ ... }),
  TextAlign.configure({ ... }),
  Highlight.configure({ ... }),
  Table.configure({ ... }),
  TableRow,
  TableHeader,
  TableCell,
  CodeBlockLowlight.configure({ lowlight }),
  BubbleMenuExtension,   // <-- DELETE
  Mathematics,
  SlashCommandExtension,
  ChartBlock,
],
```
to:
```tsx
extensions: [
  StarterKit.configure({ ... }),
  Underline,
  Placeholder.configure({ ... }),
  TextAlign.configure({ ... }),
  Highlight.configure({ ... }),
  Table.configure({ ... }),
  TableRow,
  TableHeader,
  TableCell,
  CodeBlockLowlight.configure({ lowlight }),
  Mathematics,
  SlashCommandExtension,
  ChartBlock,
],
```

- [ ] **Step 3: Add appendTo to BubbleMenu component**

The `<BubbleMenu>` component renders via tippy.js into a portal. Without `appendTo`, tippy appends to `document.body` but may try to re-parent to an ancestor node that no longer owns the reference. Pin it explicitly.

Find the `<BubbleMenu>` JSX at line ~148:
```tsx
<BubbleMenu
  editor={editor}
  shouldShow={({ state }: { state: any }) => {
    const { from, to } = state.selection;
    return from !== to;
  }}
>
```
Replace with:
```tsx
<BubbleMenu
  editor={editor}
  tippyOptions={{ appendTo: () => document.body }}
  shouldShow={({ state }: { state: any }) => {
    const { from, to } = state.selection;
    return from !== to;
  }}
>
```

- [ ] **Step 4: Verify the fix**

Start dev server: `cd frontend && npm run dev`

Open the app, create or open a note, type some text, select it. The bubble menu should appear without any console errors. Previously the error fired on every reconciliation cycle — the console should now be clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/notes/RichEditor.tsx
git commit -m "fix: remove duplicate BubbleMenuExtension to fix React insertBefore crash"
```

---

## Task 2: CSS keyframes and reduced-motion

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add slideDown and panelEnter keyframes**

Append the following block to `frontend/src/index.css` **after** the existing `@keyframes fade-in-up` block (around line 270 in the existing file — search for `fade-in-up` to locate it):

```css
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes panelEnter {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

.animate-slide-down {
  animation: slideDown 200ms ease-out both;
}

.animate-panel-enter {
  animation: panelEnter 200ms ease-out both;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify classes are available**

Run `npm run dev` and open browser devtools. In console:
```js
document.body.classList.add('animate-slide-down')
```
Confirm no Tailwind warning and the class is parsed. Remove the class after checking.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "style: add slideDown/panelEnter keyframes and prefers-reduced-motion rule"
```

---

## Task 3: Editor empty-state overlay

When the note has no title AND no meaningful content, show a centered overlay with an icon and instructional text. It disappears the moment the user starts typing (either in the title input or in the editor).

**Files:**
- Modify: `frontend/src/components/notes/NoteEditor.tsx`

- [ ] **Step 1: Add isEmpty derived state**

In `NoteEditor`, after the existing state declarations (around line 50), add a derived boolean:

```tsx
const isEmpty =
  title.trim() === '' &&
  content.replace(/<[^>]*>/g, '').trim() === '';
```

This strips HTML tags from the Tiptap content and checks plain text.

- [ ] **Step 2: Add FileText to imports**

`FileText` is already imported in the file (line 16). No change needed.

- [ ] **Step 3: Insert empty-state overlay JSX**

Inside the editor area `<div className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide">` (around line 517), add the overlay as an absolutely-positioned sibling **before** the `max-w-4xl` div. The parent div needs `relative` added:

Before (line 517):
```tsx
<div className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide">
    <div className="max-w-4xl mx-auto">
```

After:
```tsx
<div className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide relative">
    {/* Empty-state overlay — fades out as soon as content appears */}
    {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fade-in-up">
            <div className="flex flex-col items-center gap-4 opacity-30">
                <FileText size={56} strokeWidth={1} className="text-slate-500" />
                <div className="text-center">
                    <p className="text-slate-400 text-base font-medium">Empieza a escribir o dibuja con el lápiz</p>
                    <p className="text-slate-600 text-sm mt-1">Escribe <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono">/</kbd> para ver comandos</p>
                </div>
            </div>
        </div>
    )}
    <div className="max-w-4xl mx-auto">
```

- [ ] **Step 4: Verify overlay behavior**

Open a new empty note. The overlay should appear. Start typing in the title — the overlay should disappear immediately (because `isEmpty` becomes false). Open another empty note — it should reappear.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/notes/NoteEditor.tsx
git commit -m "feat: add empty-state overlay to editor"
```

---

## Task 4: Pulsing green dot on sync indicator

The sync indicator already has 3 states and text. Add a pulsing dot element matching SidebarRight's status footer style.

**Files:**
- Modify: `frontend/src/components/notes/NoteEditor.tsx`

- [ ] **Step 1: Replace sync indicator JSX**

Find the sync indicator at lines 423-427:
```tsx
<span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${syncStatus === 'synced' ? 'text-emerald-500' :
    syncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : 'text-slate-600'
    }`}>
    {syncStatus === 'synced' ? <Check size={10} strokeWidth={3} /> : '•'}
    {syncStatus === 'synced' ? 'Sincronitzat' : syncStatus === 'syncing' ? 'Guardant...' : 'Local'}
</span>
```

Replace with:
```tsx
<span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500">
    {syncStatus === 'syncing' && (
        <>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
            <span className="text-blue-400">Guardant...</span>
        </>
    )}
    {syncStatus === 'synced' && (
        <>
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-500">Sincronitzat</span>
        </>
    )}
    {syncStatus === 'local' && (
        <>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
            <span className="text-slate-600">Local</span>
        </>
    )}
</span>
```

The `animate-ping` pattern creates a ripple pulse effect (Tailwind built-in).

- [ ] **Step 2: Verify all 3 states render**

In `NoteEditor`, temporarily force each state manually to verify:
```tsx
// Test: const [syncStatus] = useState<...>('syncing');
// Test: const [syncStatus] = useState<...>('local');
```
Revert after checking.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/notes/NoteEditor.tsx
git commit -m "feat: pulsing green dot sync indicator with 3-state animation"
```

---

## Task 5: NoteCard hover microinteraction + active scale

**Files:**
- Modify: `frontend/src/components/notes/NoteCard.tsx`

- [ ] **Step 1: Add translateX and active:scale to NoteCard**

Find the outer `<div>` at line 35:
```tsx
className={`group relative w-full text-left p-5 rounded-[var(--border-radius-xl)] transition-all duration-200 overflow-hidden border cursor-pointer ${isActive
    ? 'bg-[rgba(56,139,253,0.08)] border-[rgba(56,139,253,0.4)] shadow-[0_0_24px_rgba(56,139,253,0.1)]'
    : 'bg-[#161B22] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#1c2230]'
    }`}
```

Replace with:
```tsx
className={`group relative w-full text-left p-5 rounded-[var(--border-radius-xl)] transition-all duration-150 overflow-hidden border cursor-pointer active:scale-[0.98] ${isActive
    ? 'bg-[rgba(56,139,253,0.08)] border-[rgba(56,139,253,0.4)] shadow-[0_0_24px_rgba(56,139,253,0.1)]'
    : 'bg-[#161B22] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#1c2230] hover:translate-x-1'
    }`}
```

Changes:
- `duration-200` → `duration-150` (snappier)
- Added `active:scale-[0.98]` for press feel
- Added `hover:translate-x-1` (translateX 4px = Tailwind's `translate-x-1`) on non-active cards

- [ ] **Step 2: Test hover on the card list**

Hover over a note card — it should slide 4px to the right. Click and hold — should scale down slightly. Release — should snap back.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/notes/NoteCard.tsx
git commit -m "feat: hover translateX and active scale microinteraction on NoteCard"
```

---

## Task 6: NoteList stagger animation on cards

**Files:**
- Modify: `frontend/src/components/notes/NoteList.tsx`

- [ ] **Step 1: Add stagger delay to card wrappers**

Find the notes grid at line 107:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {notes.map((n) => (
        <NoteCard key={n.id} note={n} />
    ))}
</div>
```

Replace with:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {notes.map((n, i) => (
        <div
            key={n.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${Math.min(i * 40, 200)}ms`, animationFillMode: 'both' }}
        >
            <NoteCard note={n} />
        </div>
    ))}
</div>
```

The delay is capped at 200ms so if there are 20+ notes, the last ones don't wait 800ms.

- [ ] **Step 2: Add active:scale to "Nueva nota" button**

Find the new-note button at line 94:
```tsx
className="flex items-center gap-2 px-4 rounded-[var(--border-radius-lg)] bg-[#388BFD] text-white font-semibold hover:bg-[#2f7be8] transition-colors shadow-lg shadow-blue-500/20"
```
Replace with:
```tsx
className="flex items-center gap-2 px-4 rounded-[var(--border-radius-lg)] bg-[#388BFD] text-white font-semibold hover:bg-[#2f7be8] transition-all duration-150 active:scale-95 shadow-lg shadow-blue-500/20"
```

Also update the empty-state CTA button at line 47:
```tsx
className="relative overflow-hidden rounded-[var(--border-radius-xl)] shadow-xl shadow-blue-500/20 flex items-center gap-3 px-8 text-white font-semibold"
```
Replace with:
```tsx
className="relative overflow-hidden rounded-[var(--border-radius-xl)] shadow-xl shadow-blue-500/20 flex items-center gap-3 px-8 text-white font-semibold transition-all duration-150 active:scale-95 hover:shadow-blue-500/40"
```

- [ ] **Step 3: Verify stagger**

In the app, view the note list — cards should cascade in with a slight delay between each. The "Nueva nota" button should feel physical when pressed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/notes/NoteList.tsx
git commit -m "feat: staggered fade-in on note cards, active:scale on CTA buttons"
```

---

## Task 7: SidebarLeft EINES microinteractions

**Files:**
- Modify: `frontend/src/components/layout/SidebarLeft.tsx`

- [ ] **Step 1: Add active:scale and animate to full-mode EINES list**

Find the EINES full-mode button at line ~318:
```tsx
<button
    key={tool}
    onClick={() => handleOpenTool(tool)}
    className="w-full flex items-center gap-3 px-4 rounded-xl text-[13px] font-medium text-[#8B949E] hover:bg-[rgba(56,139,253,0.08)] hover:text-[#388BFD] transition-colors"
    style={{ height: 'var(--touch-sm)' }}
>
```
Replace `className` with:
```tsx
    className="w-full flex items-center gap-3 px-4 rounded-xl text-[13px] font-medium text-[#8B949E] hover:bg-[rgba(56,139,253,0.08)] hover:text-[#388BFD] transition-all duration-150 active:scale-[0.97]"
```

- [ ] **Step 2: Animate einesOpen section**

Find the `{einesOpen && (...)}` block at line ~315:
```tsx
{einesOpen && (
    <div className="flex flex-col gap-0.5 mt-1">
```
Replace with:
```tsx
{einesOpen && (
    <div className="flex flex-col gap-0.5 mt-1 animate-fade-in-down">
```

`animate-fade-in-down` is already defined in `index.css`.

- [ ] **Step 3: Add active:scale to icon-only mode buttons**

Find the icon-only mode buttons at line ~335:
```tsx
className="group/tool relative flex items-center justify-center rounded-xl text-[#8B949E] hover:bg-[rgba(56,139,253,0.1)] hover:text-[#388BFD] transition-colors"
```
Replace with:
```tsx
className="group/tool relative flex items-center justify-center rounded-xl text-[#8B949E] hover:bg-[rgba(56,139,253,0.1)] hover:text-[#388BFD] transition-all duration-150 active:scale-90"
```

- [ ] **Step 4: Add active:scale-95 to "Nueva nota" button in sidebar**

Find `handleCreateNote` button in SidebarLeft (look for `onClick={handleCreateNote}` near the top of the render). Add `active:scale-95 transition-transform duration-100`.

- [ ] **Step 5: Verify all tool buttons feel physical**

Open the sidebar, expand Herramientas, click a tool button. Should scale down on press. Check icon-only mode on tablet-landscape viewport (≥1024px, <1366px) in browser devtools.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/SidebarLeft.tsx
git commit -m "feat: active:scale microinteractions and fade-in on SidebarLeft tool items"
```

---

## Self-Review

**Spec coverage check:**

| Spec item | Covered in task |
|-----------|----------------|
| Sidebar left icons — lucide, hover/active states | Already lucide; Task 7 adds active:scale |
| Header "SENSE ASSIGNATURA" dropdown — already a `<select>` with chevron | No change needed — already implemented |
| Editor empty state | Task 3 ✓ |
| Right sidebar buttons flat | Already has active:scale-[0.97] — no change needed |
| "SINCRONITZAT" pulsing | Task 4 ✓ |
| Toolbar separators visible | Already implemented (`w-px h-5 bg-white/[0.12]`) — no change |
| active:scale-95 on all buttons | Tasks 5, 6, 7 ✓ |
| New note slide-down animation | CSS in Task 2, applied in Task 6 ✓ |
| Notes list hover translateX | Task 5 ✓ |
| Sidebar toggle icon rotation | Already implemented with `rotate-180` on chevron in SidebarLeft line 309 |
| Modal/panel panelEnter animation | CSS added in Task 2; `animate-panel-enter` class available for future use |
| Scroll fade mask | `notes-fade-mask` already defined in index.css and applied to subject list — covers this |
| Typography (Inter, font hierarchy) | Inter already in body; Outfit for display; sizes already applied via CSS vars |
| prefers-reduced-motion | Task 2 ✓ |
| React insertBefore bug | Task 1 ✓ |

**Placeholder scan:** None found — all steps include concrete code.

**Type consistency:** No new types introduced. All className strings are strings. `syncStatus` type `'local' | 'syncing' | 'synced'` matches existing usage.
