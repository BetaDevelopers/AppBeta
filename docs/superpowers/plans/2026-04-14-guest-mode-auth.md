# Guest Mode Authentication Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace forced login-on-open with a guest mode where users can explore and create notes locally, with auth gating only for cloud sync, AI, and subject management.

**Architecture:** Add `isGuest` + `authModalOpen` to `authStore`; make `notesStore` skip API calls for guests; introduce a global `AuthModal` overlay with inline login/register tabs; guard AI actions in `NoteEditor` and `ChatWidget`; guard subject creation in `SubjectModal`; update `Toolbar` for guest appearance; add `GuestBanner` in `DashboardPage`.

**Tech Stack:** React 18, Zustand, Dexie (IndexedDB), Tailwind CSS, React Router v6

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/store/authStore.ts` | Modify | Add `isGuest`, `authModalOpen`, `openAuthModal`, `closeAuthModal` |
| `frontend/src/store/notesStore.ts` | Modify | Guest-aware CRUD: skip API, use Dexie only |
| `frontend/src/components/auth/AuthModal.tsx` | **Create** | Fixed overlay with inline login/register tabs |
| `frontend/src/components/layout/GuestBanner.tsx` | **Create** | Thin bottom bar shown only in guest mode |
| `frontend/src/App.tsx` | Modify | Open routes for `/dashboard`/`/plans`, mount `AuthModal` + `GuestBanner` |
| `frontend/src/components/layout/Toolbar.tsx` | Modify | Show guest UI when `isGuest`, guard AI button |
| `frontend/src/components/layout/ChatWidget.tsx` | Modify | Intercept send + quick actions for guests |
| `frontend/src/components/notes/NoteEditor.tsx` | Modify | Guard `handleOptimize`, `handleSummarize`, `handleSuggestSubject` |
| `frontend/src/components/subjects/SubjectModal.tsx` | Modify | Guard `createSubject`/`updateSubject` for guests |

---

## Task 1: authStore — add isGuest + modal state

**Files:**
- Modify: `frontend/src/store/authStore.ts`

- [ ] **Step 1: Update the `AuthStore` interface**

Replace the interface (lines 8–19) with:

```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isInitializing: boolean;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<void>;
}
```

- [ ] **Step 2: Update the initial state and add new actions**

Replace the `create<AuthStore>` call (the full object from line 21 to the end) with:

```typescript
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('beta3m_token'),
  isAuthenticated: !!localStorage.getItem('beta3m_token'),
  isGuest: !localStorage.getItem('beta3m_token'),
  isInitializing: !!localStorage.getItem('beta3m_token'),
  authModalOpen: false,

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  initAuth: async () => {
    const token = localStorage.getItem('beta3m_token');
    if (!token) {
      set({ isInitializing: false, isGuest: true });
      return;
    }
    try {
      const user = await apiClient.get<User>('/users/me');
      set({ user, isInitializing: false, isGuest: false });
    } catch {
      localStorage.removeItem('beta3m_token');
      set({ user: null, token: null, isAuthenticated: false, isGuest: true, isInitializing: false });
    }
  },

  login: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/login', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, authModalOpen: false });
  },

  register: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/register', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, authModalOpen: false });
  },

  logout: () => {
    useNotesStore.getState().cleanup();
    localStorage.removeItem('beta3m_token');
    set({ user: null, token: null, isAuthenticated: false, isGuest: true });
  },

  updateUser: (data) => {
    set((s) => ({ user: s.user ? { ...s.user, ...data } : s.user }));
  },

  forgotPassword: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },
}));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors relating to `authStore.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/authStore.ts
git commit -m "feat: add isGuest flag and authModal state to authStore"
```

---

## Task 2: notesStore — guest-aware CRUD

**Files:**
- Modify: `frontend/src/store/notesStore.ts`

Guest users can create and edit notes locally (Dexie only). They cannot sync to the backend, so:
- `fetchNotes` → load from Dexie when guest
- `createNote` → insert in Dexie with a temp `Date.now()` ID when guest
- `updateNote` → update only Dexie + React state when guest (skip sync worker)
- `deleteNote` → delete only from Dexie when guest
- `searchNotes` → search Dexie only when guest
- AI methods → call `openAuthModal()` and throw when guest

- [ ] **Step 1: Add auth check import**

At the top of `notesStore.ts`, the `useAuthStore` import is already there as a circular import comment. Add it explicitly (it's safe since it's used only inside function bodies):

```typescript
import { useAuthStore } from './authStore';
```

(Add this after the existing imports — the comment on line 4–6 describes why it's safe.)

- [ ] **Step 2: Replace `fetchNotes`**

Replace the `fetchNotes` method:

```typescript
fetchNotes: async (subjectId) => {
    set({ isLoading: true });
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
        const cached = await db.notes.toArray();
        const filtered = subjectId
            ? cached.filter((n) => n.subject_id === subjectId)
            : cached;
        set({ notes: filtered, isLoading: false });
        return;
    }
    try {
        const path = subjectId ? `/notes?subject_id=${subjectId}` : '/notes';
        const notes = await apiClient.get<Note[]>(path);
        await db.notes.bulkPut(notes);
        set({ notes, isLoading: false });
    } catch {
        const cached = await db.notes.toArray();
        const filtered = subjectId
            ? cached.filter((n) => n.subject_id === subjectId)
            : cached;
        set({ notes: filtered, isLoading: false });
    }
},
```

- [ ] **Step 3: Replace `createNote`**

Replace the `createNote` method:

```typescript
createNote: async (data = {}) => {
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
        const guestNote: Note = {
            id: Date.now(),
            title: 'Sense títol',
            content: '',
            subject_id: get().activeSubjectId,
            user_id: 0,
            ai_processed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        await db.notes.put(guestNote);
        set((s) => ({ notes: [guestNote, ...s.notes], currentNote: guestNote }));
        return guestNote;
    }
    const note = await apiClient.post<Note>('/notes', {
        title: 'Sense títol',
        content: '',
        subject_id: get().activeSubjectId,
        ...data,
    });
    await db.notes.put(note);
    set((s) => ({ notes: [note, ...s.notes], currentNote: note }));
    return note;
},
```

- [ ] **Step 4: Replace `updateNote`**

Replace the `updateNote` method:

```typescript
updateNote: async (id, data, skipQueue = false) => {
    lastKeystroke = Date.now();

    // CAPA 1: Dexie (instantani → UX fluida)
    try {
        await db.notes.update(id, {
            ...data,
            updated_at: new Date().toISOString(),
        });
    } catch {
        // Dexie pot fallar si la nota no existeix localment, ignora
    }

    // Actualitza l'estat React immediatament
    set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, ...data } : n)),
        currentNote:
            s.currentNote?.id === id ? { ...s.currentNote, ...data } : s.currentNote,
    }));

    // Guest: only Dexie, no backend sync
    const { isGuest } = useAuthStore.getState();
    if (isGuest) return;

    if (skipQueue) {
        set({ isSaving: true });
        try {
            const updated = await apiClient.put<Note>(`/notes/${id}`, data);
            await db.notes.put(updated);
            set((s) => ({
                notes: s.notes.map((n) => (n.id === id ? updated : n)),
                currentNote:
                    s.currentNote?.id === id ? updated : s.currentNote,
                isSaving: false,
            }));
        } catch {
            set({ isSaving: false });
            throw new Error('Error al sincronitzar la nota');
        }
    } else {
        const existing = pendingSync.get(id);
        pendingSync.set(id, {
            data: { ...existing?.data, ...data },
            timestamp: Date.now(),
        });
        startWorker(async (noteId, noteData) => {
            await get().updateNote(noteId, noteData, true);
        });
    }
},
```

- [ ] **Step 5: Replace `deleteNote`**

Replace the `deleteNote` method:

```typescript
deleteNote: async (id) => {
    const { isGuest } = useAuthStore.getState();
    if (!isGuest) {
        await apiClient.delete(`/notes/${id}`);
    }
    await db.notes.delete(id);
    pendingSync.delete(id);
    set((s) => ({
        notes: s.notes.filter((n) => n.id !== id),
        currentNote: s.currentNote?.id === id ? null : s.currentNote,
    }));
},
```

- [ ] **Step 6: Replace `searchNotes`**

Replace the `searchNotes` method:

```typescript
searchNotes: async (query: string): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
        await get().fetchNotes(get().activeSubjectId ?? undefined);
        return;
    }
    const { isGuest } = useAuthStore.getState();
    if (isGuest) {
        const q = trimmed.toLowerCase();
        const all = await db.notes.toArray();
        const filtered = all.filter(
            (n) =>
                n.title.toLowerCase().includes(q) ||
                (n.content_plain || '').toLowerCase().includes(q)
        );
        set({ notes: filtered });
        return;
    }
    try {
        const results = await apiClient.get<Note[]>(
            `/notes/search?q=${encodeURIComponent(trimmed)}`
        );
        set({ notes: results });
    } catch {
        const q = trimmed.toLowerCase();
        const all = await db.notes.toArray();
        const filtered = all.filter(
            (n) =>
                n.title.toLowerCase().includes(q) ||
                (n.content_plain || '').toLowerCase().includes(q)
        );
        set({ notes: filtered });
    }
},
```

- [ ] **Step 7: Guard AI methods**

Replace the three AI methods so they call `openAuthModal` and throw for guests:

```typescript
improveWithAI: async (text) => {
    const { isGuest, openAuthModal } = useAuthStore.getState();
    if (isGuest) { openAuthModal(); throw new Error('guest'); }
    const { result } = await apiClient.post<{ result: string }>('/ai/improve', { text });
    return result;
},

summarizeWithAI: async (text) => {
    const { isGuest, openAuthModal } = useAuthStore.getState();
    if (isGuest) { openAuthModal(); throw new Error('guest'); }
    const { result } = await apiClient.post<{ result: string }>('/ai/summarize', { text });
    return result;
},

suggestSubjectWithAI: async (text) => {
    const { isGuest, openAuthModal } = useAuthStore.getState();
    if (isGuest) { openAuthModal(); throw new Error('guest'); }
    const { subject } = await apiClient.post<{ subject: string }>('/ai/suggest', { text });
    return subject;
},
```

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/store/notesStore.ts
git commit -m "feat: guest-aware CRUD in notesStore — Dexie-only for guests, AI guard"
```

---

## Task 3: AuthModal component

**Files:**
- Create: `frontend/src/components/auth/AuthModal.tsx`

A fixed full-screen overlay that shows inline login or register forms. Does not navigate. On success, `authStore.login`/`register` closes the modal automatically (both set `authModalOpen: false`).

- [ ] **Step 1: Create the file**

```typescript
// frontend/src/components/auth/AuthModal.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type Tab = 'register' | 'login';

export default function AuthModal() {
    const { authModalOpen, closeAuthModal, login, register } = useAuthStore();
    const [tab, setTab] = useState<Tab>('register');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!authModalOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
    };

    const switchTab = (t: Tab) => {
        setTab(t);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Completa todos los campos');
            return;
        }

        if (tab === 'register') {
            if (password.length < 8) {
                setError('La contraseña debe tener mínimo 8 caracteres');
                return;
            }
            if (password !== confirmPassword) {
                setError('Las contraseñas no coinciden');
                return;
            }
        }

        setLoading(true);
        try {
            if (tab === 'register') {
                await register(email, password);
            } else {
                await login(email, password);
            }
            // Modal closes automatically — login/register set authModalOpen: false
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeAuthModal}
            />

            {/* Card */}
            <div className="relative w-full max-w-[400px] bg-[#0f172a] rounded-[28px] border border-white/10 shadow-2xl p-8">
                {/* Close */}
                <button
                    onClick={closeAuthModal}
                    className="absolute top-4 right-4 p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
                    aria-label="Cerrar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex w-12 h-12 bg-blue-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-blue-600/25">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Guarda tus apuntes en la nube
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">
                        Crea una cuenta gratis para no perder nada
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl bg-white/5 p-1 mb-6">
                    <button
                        onClick={() => switchTab('register')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === 'register'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Crear cuenta
                    </button>
                    <button
                        onClick={() => switchTab('login')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === 'login'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Ya tengo cuenta
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-500/20">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Correo electrónico"
                        type="email"
                        placeholder="tú@ejemplo.com"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Contraseña"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    />
                    {tab === 'register' && (
                        <Input
                            label="Confirmar contraseña"
                            type="password"
                            placeholder="Repite la contraseña"
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                        />
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full rounded-xl py-3 font-bold"
                        disabled={loading}
                    >
                        {loading
                            ? 'Procesando...'
                            : tab === 'register'
                                ? 'Crear cuenta gratis'
                                : 'Iniciar sesión'
                        }
                    </Button>
                </form>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auth/AuthModal.tsx
git commit -m "feat: AuthModal — inline login/register overlay, no page navigation"
```

---

## Task 4: GuestBanner component

**Files:**
- Create: `frontend/src/components/layout/GuestBanner.tsx`

- [ ] **Step 1: Create the file**

```typescript
// frontend/src/components/layout/GuestBanner.tsx
import React from 'react';
import { useAuthStore } from '../../store/authStore';

export default function GuestBanner() {
    const { isGuest, openAuthModal } = useAuthStore();

    if (!isGuest) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[100] flex items-center justify-center gap-4 px-4 py-2.5 bg-[#0a0f1e] border-t border-white/10">
            <span className="text-[12px] text-slate-500">
                Modo invitado · Tus notas no se guardan en la nube
            </span>
            <button
                onClick={openAuthModal}
                className="text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap border border-blue-500/30 rounded-full px-3 py-1 hover:border-blue-400/50"
            >
                Crear cuenta gratuita
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/GuestBanner.tsx
git commit -m "feat: GuestBanner — subtle fixed bottom bar in guest mode"
```

---

## Task 5: App.tsx — routing + mount AuthModal + GuestBanner

**Files:**
- Modify: `frontend/src/App.tsx`

Changes:
- `PrivateRoute` now calls `openAuthModal` instead of redirecting to `/login`
- `/dashboard` and `/plans` are no longer wrapped in `PrivateRoute`
- `AuthModal` and `GuestBanner` are mounted globally

- [ ] **Step 1: Replace App.tsx entirely**

```typescript
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import { PerfilPage } from './pages/PerfilPage';
import AuthModal from './components/auth/AuthModal';
import GuestBanner from './components/layout/GuestBanner';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, openAuthModal } = useAuthStore();
    if (!isAuthenticated) {
        openAuthModal();
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
}

export default function App() {
    const initAuth = useAuthStore((s) => s.initAuth);
    const isInitializing = useAuthStore((s) => s.isInitializing);

    useEffect(() => {
        initAuth();
    }, []);

    if (isInitializing) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/perfil" element={
                    <PrivateRoute><PerfilPage /></PrivateRoute>
                } />
            </Routes>
            <AuthModal />
            <GuestBanner />
        </BrowserRouter>
    );
}
```

Note: `PrivateRoute` now calls `openAuthModal()` (which is a Zustand action, not a hook — safe to call outside render). `React` is not imported explicitly because JSX transform handles it; if the project requires it, add `import React from 'react';`.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: open routes for dashboard/plans, PrivateRoute shows AuthModal instead of redirect"
```

---

## Task 6: Toolbar — guest mode adaptations

**Files:**
- Modify: `frontend/src/components/layout/Toolbar.tsx`

Guest changes:
- Avatar area → shows "Invitado" + "Entrar" button that opens AuthModal
- Plan badge → hidden for guests
- AI button → opens AuthModal for guests
- Logout button → hidden for guests

- [ ] **Step 1: Add `isGuest` and `openAuthModal` to the component**

After line 12 (`const { user, logout } = useAuthStore();`), add:

```typescript
const { isGuest, openAuthModal } = useAuthStore();
```

- [ ] **Step 2: Update `handleLogout` to guard for guests**

Replace `handleLogout`:

```typescript
const handleLogout = () => {
    if (isGuest) return;
    logout();
    navigate('/login');
};
```

- [ ] **Step 3: Update the AI button to open modal for guests**

Replace the IA button (lines ~122–134) — change `onClick`:

```tsx
<button
    onClick={isGuest ? openAuthModal : onToggleChat}
    className={`flex items-center gap-1.5 px-3 rounded-xl border text-[13px] font-semibold transition-all duration-200
        ${chatOpen && !isGuest
            ? 'bg-[#A371F7] text-white border-[#A371F7] shadow-[0_0_16px_rgba(163,113,247,0.4)]'
            : 'bg-[rgba(163,113,247,0.1)] border-[rgba(163,113,247,0.2)] text-[#A371F7] hover:bg-[rgba(163,113,247,0.2)]'
        }`}
    style={{ height: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
    title={isGuest ? 'Necesitas cuenta para usar la IA' : 'Assistent IA'}
>
    <span>✨</span>
    <span className="hidden md:inline">IA</span>
</button>
```

- [ ] **Step 4: Replace the avatar + plan + logout section for guests**

Find the `{/* Right actions */}` div. The plan badge and avatar/logout area need conditional rendering. Replace the plan badge button with:

```tsx
{/* Plan badge — hidden for guests */}
{!isGuest && (
    <button
        onClick={() => navigate('/plans')}
        className={`px-3 rounded-full text-[13px] font-semibold transition-all border shadow-sm ${planClass}`}
        style={{ height: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
    >
        {planLabel}
    </button>
)}
```

Replace the avatar `div` (the `onClick={() => navigate('/perfil')}` block) with:

```tsx
{isGuest ? (
    <button
        onClick={openAuthModal}
        className="flex items-center gap-2 px-3 rounded-xl border border-blue-500/30 text-blue-400 hover:border-blue-400/50 hover:text-blue-300 text-[13px] font-semibold transition-all"
        style={{ height: 'var(--touch-target)' }}
    >
        Entrar
    </button>
) : (
    <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => navigate('/perfil')}
    >
        <div className="hidden lg:flex flex-col items-end">
            <span className="text-sm font-semibold text-[#E6EDF3] leading-none group-hover:text-[#388BFD] transition-colors">
                {user?.display_name || user?.email?.split('@')[0]}
            </span>
            <span className="text-[11px] text-[#484F58] mt-0.5">Estudiant</span>
        </div>
        <div
            className="rounded-xl bg-gradient-to-br from-[#21262D] to-[#2D333B] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#E6EDF3] font-bold flex-shrink-0 overflow-hidden group-hover:border-[#388BFD]/30 transition-all"
            style={{ width: '36px', height: '36px' }}
        >
            {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <span className="text-sm">{user?.email?.[0]?.toUpperCase()}</span>
            )}
        </div>
    </div>
)}
```

Replace the logout button with:

```tsx
{/* Logout — hidden for guests */}
{!isGuest && (
    <button
        onClick={handleLogout}
        className="flex items-center justify-center rounded-xl text-[#484F58] hover:text-[#F78166] hover:bg-[rgba(247,129,102,0.1)] transition-all border border-transparent hover:border-[rgba(247,129,102,0.15)]"
        style={{ width: 'var(--touch-target)', height: 'var(--touch-target)' }}
        title="Tancar sessió"
    >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    </button>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/Toolbar.tsx
git commit -m "feat: Toolbar guest mode — Entrar button, hidden logout/plan, AI opens modal"
```

---

## Task 7: ChatWidget — guard for guests

**Files:**
- Modify: `frontend/src/components/layout/ChatWidget.tsx`

When the user is a guest and tries to send a message or use a quick action, show the AuthModal instead.

- [ ] **Step 1: Add `isGuest`/`openAuthModal` to the component**

After line 51 (`const { subjects } = useSubjectsStore();`), add:

```typescript
const { isGuest, openAuthModal } = useAuthStore();
```

(The `useAuthStore` import is already at line 4.)

- [ ] **Step 2: Guard `send` for guests**

At the top of the `send` callback (line 131, after `const send = useCallback(async (text: string) => {`), add:

```typescript
if (isGuest) {
    openAuthModal();
    return;
}
```

So the beginning of `send` becomes:

```typescript
const send = useCallback(async (text: string) => {
    if (isGuest) {
        openAuthModal();
        return;
    }
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // ... rest unchanged
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/ChatWidget.tsx
git commit -m "feat: ChatWidget — opens AuthModal for guest users instead of sending"
```

---

## Task 8: NoteEditor — guard AI tools for guests

**Files:**
- Modify: `frontend/src/components/notes/NoteEditor.tsx`

The AI methods in `notesStore` already throw for guests (Task 2 Step 7). NoteEditor calls them and shows errors via `setError`. We need to suppress the generic error toast for the `'guest'` throw and let the modal handle it.

- [ ] **Step 1: Update error handling in `handleOptimize`**

Find the `catch (err: any)` block in `handleOptimize` (around line 306):

```typescript
} catch (err: any) {
    setIsTypingAI(false);
    setError(err.message || 'Error al connectar amb la IA. Comprova la clau API.');
    setTimeout(() => setError(null), 4000);
}
```

Replace it with:

```typescript
} catch (err: any) {
    setIsTypingAI(false);
    if (err.message !== 'guest') {
        setError(err.message || 'Error al connectar amb la IA. Comprova la clau API.');
        setTimeout(() => setError(null), 4000);
    }
}
```

- [ ] **Step 2: Update error handling in `handleSummarize`**

Find the `catch (err: any)` in `handleSummarize` (around line 326):

```typescript
} catch (err: any) {
    setError(err.message || 'Error al generar resum.');
    setTimeout(() => setError(null), 4000);
}
```

Replace it with:

```typescript
} catch (err: any) {
    if (err.message !== 'guest') {
        setError(err.message || 'Error al generar resum.');
        setTimeout(() => setError(null), 4000);
    }
}
```

- [ ] **Step 3: Update error handling in `handleSuggestSubject`**

Find the `catch (err: any)` in `handleSuggestSubject` (around line 342):

```typescript
} catch (err: any) {
    setError(err.message || 'Error al suggerir assignatura.');
    setTimeout(() => setError(null), 4000);
}
```

Replace it with:

```typescript
} catch (err: any) {
    if (err.message !== 'guest') {
        setError(err.message || 'Error al suggerir assignatura.');
        setTimeout(() => setError(null), 4000);
    }
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/notes/NoteEditor.tsx
git commit -m "feat: NoteEditor — suppress guest error toast, AuthModal handles it"
```

---

## Task 9: SubjectModal — guard create/update for guests

**Files:**
- Modify: `frontend/src/components/subjects/SubjectModal.tsx`

- [ ] **Step 1: Read the file to find the submit handler**

Read `frontend/src/components/subjects/SubjectModal.tsx` (especially around line 21–35 based on what grep showed).

- [ ] **Step 2: Add guard at top of submit handler**

After reading, find the submit handler that calls `createSubject`/`updateSubject`. Add at the top of the handler:

```typescript
const { isGuest, openAuthModal } = useAuthStore.getState();
if (isGuest) {
    openAuthModal();
    return;
}
```

Import `useAuthStore` at the top of the file if not already imported:

```typescript
import { useAuthStore } from '../../store/authStore';
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/subjects/SubjectModal.tsx
git commit -m "feat: SubjectModal — opens AuthModal for guests instead of creating subject"
```

---

## Task 10: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify guest flow**

Open `http://localhost:5173` in an incognito window (no token in localStorage).

Expected:
- Dashboard loads immediately (no redirect to login)
- GuestBanner shows at bottom: "Modo invitado · Tus notas no se guardan en la nube"
- Toolbar shows "Entrar" button, no avatar/logout/plan badge
- Clicking "✨ IA" in toolbar opens AuthModal
- Creating a note works (title + content editable, "• Local" sync status)
- Clicking "Smart" or "Resumir" AI buttons opens AuthModal
- Clicking "Crear cuenta gratuita" in banner opens AuthModal
- AuthModal has two tabs: "Crear cuenta" and "Ya tengo cuenta"
- Switching tabs clears form
- Registering or logging in closes modal and shows authenticated dashboard

- [ ] **Step 3: Verify authenticated flow**

Log in via the modal. Expected:
- Toolbar shows user avatar, plan badge, logout button
- GuestBanner disappears
- AI features work normally
- `/perfil` route is accessible
- Logging out returns to guest mode (GuestBanner reappears)

- [ ] **Step 4: Verify /login and /register pages still work**

Navigate to `http://localhost:5173/login` and `http://localhost:5173/register` directly. Both should still render normally.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete guest mode auth flow — dashboard accessible without account"
```
