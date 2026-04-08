import { create } from 'zustand';
import { apiClient } from '../api/client';
import { db } from '../db/dexie';
import type { Note } from '../types';

interface NotesStore {
    notes: Note[];
    currentNote: Note | null;
    isLoading: boolean;
    isSaving: boolean;
    activeSubjectId: number | null;
    fetchNotes: (subjectId?: number) => Promise<void>;
    createNote: (data?: Partial<Note>) => Promise<Note>;
    updateNote: (id: number, data: Partial<Note>, skipQueue?: boolean) => Promise<void>;
    deleteNote: (id: number) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setActiveSubject: (id: number | null) => void;
    searchNotes: (query: string) => Promise<Note[]>;
    improveWithAI: (text: string) => Promise<string>;
    summarizeWithAI: (text: string) => Promise<string>;
    suggestSubjectWithAI: (text: string) => Promise<string>;
}

// ── Sync Worker ─────────────────────────────────────────────
// Guarda canvis a Dexie immediatament (capa 1)
// Envia a l'API quan l'usuari porta 8s quiet o cada 30s (capa 2)

interface PendingSync {
    data: Partial<Note>;
    timestamp: number;
}

const pendingSync = new Map<number, PendingSync>();
let lastKeystroke = Date.now();
let workerInterval: ReturnType<typeof setInterval> | null = null;

const startWorker = (syncFn: (id: number, data: Partial<Note>) => Promise<void>) => {
    if (workerInterval) return;
    workerInterval = setInterval(async () => {
        if (pendingSync.size === 0) return;
        const idleMs = Date.now() - lastKeystroke;
        // Sincronitza si portem 8s quiets O si tenim massa canvis acumulats (p.ex 5)
        const shouldSync = idleMs > 8000 || pendingSync.size >= 5;
        if (!shouldSync) return;

        const entries = [...pendingSync.entries()];
        pendingSync.clear();

        for (const [noteId, { data }] of entries) {
            try {
                await syncFn(noteId, data);
            } catch {
                // Re-encua si falla (es provarà al proper cicle)
                pendingSync.set(noteId, { data, timestamp: Date.now() });
            }
        }
    }, 5000);
};
// ────────────────────────────────────────────────────────────

export const useNotesStore = create<NotesStore>((set, get) => ({
    notes: [],
    currentNote: null,
    isLoading: false,
    isSaving: false,
    activeSubjectId: null,

    fetchNotes: async (subjectId) => {
        set({ isLoading: true });
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

    createNote: async (data = {}) => {
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

        if (skipQueue) {
            // CAPA 2 directa: crida real a la API (des del worker)
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
            // CAPA 2 diferida: encua per al worker
            const existing = pendingSync.get(id);
            pendingSync.set(id, {
                data: { ...existing?.data, ...data }, // fusiona canvis pendents
                timestamp: Date.now(),
            });

            // Arrenca el worker si no estava actiu
            startWorker(async (noteId, noteData) => {
                await get().updateNote(noteId, noteData, true);
            });
        }
    },

    deleteNote: async (id) => {
        await apiClient.delete(`/notes/${id}`);
        await db.notes.delete(id);
        pendingSync.delete(id); // Elimina de la cua si s'esborra
        set((s) => ({
            notes: s.notes.filter((n) => n.id !== id),
            currentNote: s.currentNote?.id === id ? null : s.currentNote,
        }));
    },

    setCurrentNote: (note) => set({ currentNote: note }),
    setActiveSubject: (id) => set({ activeSubjectId: id }),

    searchNotes: async (query: string): Promise<Note[]> => {
        if (query.trim().length < 2) return [];
        try {
            return await apiClient.get<Note[]>(
                `/notes/search?q=${encodeURIComponent(query.trim())}`
            );
        } catch {
            // Fallback offline: cerca a Dexie
            const q = query.toLowerCase();
            const all = await db.notes.toArray();
            return all.filter(
                (n) =>
                    n.title.toLowerCase().includes(q) ||
                    (n.content_plain || '').toLowerCase().includes(q)
            );
        }
    },

    improveWithAI: async (text) => {
        const { result } = await apiClient.post<{ result: string }>('/ai/improve', { text });
        return result;
    },

    summarizeWithAI: async (text) => {
        const { result } = await apiClient.post<{ result: string }>('/ai/summarize', { text });
        return result;
    },
    suggestSubjectWithAI: async (text) => {
        const { subject } = await apiClient.post<{ subject: string }>('/ai/suggest', { text });
        return subject;
    },
}));
