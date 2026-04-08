import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import type { Note } from '../../types';

interface NoteCardProps {
    note: Note;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
    const { currentNote, setCurrentNote } = useNotesStore();
    const isActive = currentNote?.id === note.id;

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        if (diff === 0) return 'Avui';
        if (diff === 1) return 'Ahir';
        if (diff < 7) return `fa ${diff} dies`;
        return d.toLocaleDateString();
    };

    return (
        <button
            onClick={() => setCurrentNote(note)}
            className={`w-full text-left p-5 rounded-2xl transition-all border ${isActive
                ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <h4 className={`text-sm font-black truncate tracking-tight ${isActive ? 'text-blue-400' : 'text-slate-100'}`}>
                    {note.title || 'Sense títol'}
                </h4>
                {note.subject_color && (
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: note.subject_color }} />
                )}
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-medium">
                {note.content?.replace(/<[^>]*>/g, '').substring(0, 80) || 'Sin contenido...'}
            </p>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatDate(note.updated_at)}</span>
                {note.ai_processed && (
                    <div className="p-1 px-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">AI Optimized</span>
                    </div>
                )}
            </div>
        </button>
    );
};
