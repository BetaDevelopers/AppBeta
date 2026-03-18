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
    updateNote: (id: number, data: Partial<Note>) => Promise<void>;
    deleteNote: (id: number) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setActiveSubject: (id: number | null) => void;
    searchNotes: (query: string) => Promise<Note[]>;
    improveWithAI: (text: string) => Promise<string>;
    summarizeWithAI: (text: string) => Promise<string>;
}

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

    updateNote: async (id, data) => {
        set({ isSaving: true });
        try {
            const updated = await apiClient.put<Note>(`/notes/${id}`, data);
            await db.notes.put(updated);
            set((s) => ({
                notes: s.notes.map((n) => (n.id === id ? updated : n)),
                currentNote: s.currentNote?.id === id ? updated : s.currentNote,
                isSaving: false,
            }));
        } catch {
            set({ isSaving: false });
            throw new Error('Error al guardar la nota');
        }
    },

    deleteNote: async (id) => {
        await apiClient.delete(`/notes/${id}`);
        await db.notes.delete(id);
        set((s) => ({
            notes: s.notes.filter((n) => n.id !== id),
            currentNote: s.currentNote?.id === id ? null : s.currentNote,
        }));
    },

    setCurrentNote: (note) => set({ currentNote: note }),
    setActiveSubject: (id) => set({ activeSubjectId: id }),

    searchNotes: async (query) => {
        try {
            return await apiClient.get<Note[]>(`/notes/search?q=${encodeURIComponent(query)}`);
        } catch {
            const all = await db.notes.toArray();
            const q = query.toLowerCase();
            return all.filter(
                (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
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
}));
