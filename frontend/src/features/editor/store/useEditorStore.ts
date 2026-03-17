import { create } from 'zustand';
import { NoteDocument } from '@/lib/db';

interface EditorStore {
    activeNoteId: string | null;
    activeNote: NoteDocument | null;

    // Actions
    setActiveNote: (id: string | null) => void;
    setActiveNoteData: (note: NoteDocument | null) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
    activeNoteId: null,
    activeNote: null,

    setActiveNote: (id) => set({ activeNoteId: id }),
    setActiveNoteData: (note) => set({ activeNote: note }),
}));
