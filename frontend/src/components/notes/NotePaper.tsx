import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';

/**
 * NotePaper — zona central del Dashboard.
 * Renderitza l'editor quan hi ha nota activa, o la llista si no.
 * El DrawingCanvas (overlay del lápiz) viu dins NoteEditor,
 * que a la seva vegada viu aquí, de manera que el canvas
 * queda contenido dins del NotePaper i no del Dashboard.
 */
export const NotePaper: React.FC = () => {
    const { currentNote } = useNotesStore();

    return (
        <main className="flex-1 overflow-hidden relative bg-slate-50/20 shadow-inner">
            {currentNote ? (
                <div className="h-full bg-white transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                    <NoteEditor />
                </div>
            ) : (
                <NoteList />
            )}
        </main>
    );
};
