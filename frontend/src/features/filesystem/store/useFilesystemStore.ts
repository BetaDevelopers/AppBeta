import { create } from 'zustand';
import { db, NoteDocument, Subject, Workspace } from '@/lib/db';

interface FilesystemStore {
    currentWorkspace: Workspace | null;
    subjects: Subject[];
    notes: NoteDocument[];
    trashedNotes: NoteDocument[];
    activeNoteId: string | null;
    isLoading: boolean;

    // Actions
    loadWorkspace: (id: string) => Promise<void>;
    loadTrash: () => Promise<void>;
    setActiveNote: (id: string | null) => void;
    createSubject: (subject: Omit<Subject, 'id' | 'createdAt'>) => Promise<void>;
    renameSubject: (id: string, name: string) => Promise<void>;
    deleteSubject: (id: string) => Promise<void>;
    createNote: (note: Omit<NoteDocument, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt'>) => Promise<void>;
    renameNote: (id: string, title: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    restoreNote: (id: string) => Promise<void>;
    deleteNotePermanently: (id: string) => Promise<void>;
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
    trashedNotes: [],
    activeNoteId: null,
    isLoading: false,

    loadWorkspace: async (id: string) => {
        set({ isLoading: true });
        const workspace = await db.workspaces.get(id);
        const subjects = await db.subjects.where('workspaceId').equals(id).sortBy('order');
        const notes = await db.notes.where('isTrashed').equals(0).toArray();
        const trashed = await db.notes.where('isTrashed').equals(1).toArray();

        set({
            currentWorkspace: workspace || null,
            subjects,
            notes,
            trashedNotes: trashed,
            isLoading: false,
            activeNoteId: notes.length > 0 ? notes[0].id : null
        });
    },

    loadTrash: async () => {
        const trashed = await db.notes.where('isTrashed').equals(1).toArray();
        set({ trashedNotes: trashed });
    },

    setActiveNote: (id) => set({ activeNoteId: id }),

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
        await db.subjects.delete(id);
        await db.notes.where('subjectId').equals(id).modify({ isTrashed: 1 });
        const allNotes = await db.notes.where('isTrashed').equals(0).toArray();
        const trashed = await db.notes.where('isTrashed').equals(1).toArray();
        set((state) => ({
            subjects: state.subjects.filter(s => s.id !== id),
            notes: allNotes,
            trashedNotes: trashed
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
        set((state) => ({ notes: [...state.notes, newNote], activeNoteId: id }));
    },

    renameNote: async (id, title) => {
        await db.notes.update(id, { title, updatedAt: Date.now() });
        set((state) => ({
            notes: state.notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n)
        }));
    },

    deleteNote: async (id) => {
        await db.notes.update(id, { isTrashed: 1 });
        const note = await db.notes.get(id);
        set((state) => ({
            notes: state.notes.filter(n => n.id !== id),
            trashedNotes: note ? [...state.trashedNotes, note] : state.trashedNotes,
            activeNoteId: state.activeNoteId === id ? null : state.activeNoteId
        }));
    },

    restoreNote: async (id) => {
        await db.notes.update(id, { isTrashed: 0 });
        const note = await db.notes.get(id);
        set((state) => ({
            trashedNotes: state.trashedNotes.filter(n => n.id !== id),
            notes: note ? [...state.notes, note] : state.notes
        }));
    },

    deleteNotePermanently: async (id) => {
        await db.notes.delete(id);
        set((state) => ({
            trashedNotes: state.trashedNotes.filter(n => n.id !== id)
        }));
    },

    updateNote: async (id, updates) => {
        await db.notes.update(id, { ...updates, updatedAt: Date.now() });
        set((state) => ({
            notes: state.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
        }));
    }
}));
