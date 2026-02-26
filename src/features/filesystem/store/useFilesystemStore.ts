import { create } from 'zustand';
import { db, NoteDocument, Subject, Workspace } from '@/lib/db';

interface FilesystemStore {
    currentWorkspace: Workspace | null;
    subjects: Subject[];
    notes: NoteDocument[];
    isLoading: boolean;

    // Actions
    loadWorkspace: (id: string) => Promise<void>;
    createSubject: (subject: Omit<Subject, 'id' | 'createdAt'>) => Promise<void>;
    renameSubject: (id: string, name: string) => Promise<void>;
    deleteSubject: (id: string) => Promise<void>;
    createNote: (note: Omit<NoteDocument, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt'>) => Promise<void>;
    renameNote: (id: string, title: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    updateNote: (id: string, updates: Partial<NoteDocument>) => Promise<void>;
}

const safeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useFilesystemStore = create<FilesystemStore>((set, get) => ({
    currentWorkspace: null,
    subjects: [],
    notes: [],
    isLoading: false,

    loadWorkspace: async (id: string) => {
        set({ isLoading: true });
        const workspace = await db.workspaces.get(id);
        const subjects = await db.subjects.where('workspaceId').equals(id).sortBy('order');
        const notes = await db.notes.where('isTrashed').equals(0).toArray();

        set({ currentWorkspace: workspace || null, subjects, notes, isLoading: false });
    },

    createSubject: async (subjectData) => {
        const id = safeUUID();
        const newSubject: Subject = {
            ...subjectData,
            id,
            createdAt: Date.now(),
        };
        await db.subjects.add(newSubject);
        set((state) => ({ subjects: [...state.subjects, newSubject].sort((a, b) => a.order - b.order) }));
    },

    renameSubject: async (id, name) => {
        await db.subjects.update(id, { name });
        set((state) => ({
            subjects: state.subjects.map(s => s.id === id ? { ...s, name } : s)
        }));
    },

    deleteSubject: async (id) => {
        // Delete subject and move its notes to trash
        await db.subjects.delete(id);
        await db.notes.where('subjectId').equals(id).modify({ isTrashed: 1 });
        set((state) => ({
            subjects: state.subjects.filter(s => s.id !== id),
            notes: state.notes.filter(n => n.subjectId !== id)
        }));
    },

    createNote: async (noteData) => {
        const id = safeUUID();
        const newNote: NoteDocument = {
            ...noteData,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            syncedAt: null,
        };
        await db.notes.add(newNote);
        set((state) => ({ notes: [...state.notes, newNote] }));
    },

    renameNote: async (id, title) => {
        await db.notes.update(id, { title, updatedAt: Date.now() });
        set((state) => ({
            notes: state.notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n)
        }));
    },

    deleteNote: async (id) => {
        await db.notes.update(id, { isTrashed: 1 });
        set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
    },

    updateNote: async (id, updates) => {
        await db.notes.update(id, { ...updates, updatedAt: Date.now() });
        set((state) => ({
            notes: state.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
        }));
    }
}));
