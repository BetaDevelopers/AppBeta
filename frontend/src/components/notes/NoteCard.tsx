import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import { useSubjectsStore } from '../../store/subjectsStore';
import type { Note } from '../../types';
import { MoreHorizontal, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface NoteCardProps {
    note: Note;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
    const { currentNote, setCurrentNote, deleteNote, updateNote } = useNotesStore();
    const { subjects } = useSubjectsStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const isActive = currentNote?.id === note.id;

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Hoy';
        if (diff === 1) return 'Ayer';
        if (diff < 7) return `hace ${diff} días`;
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => setCurrentNote(note)}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentNote(note)}
            className={`group relative w-full text-left p-5 rounded-[var(--border-radius-xl)] transition-all duration-150 overflow-hidden border cursor-pointer active:scale-[0.98] ${isActive
                ? 'bg-[rgba(56,139,253,0.08)] border-[rgba(56,139,253,0.4)] shadow-[0_0_24px_rgba(56,139,253,0.1)]'
                : 'bg-[#161B22] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#1c2230] hover:translate-x-1'
                }`}
            style={{ minHeight: '140px' }}
        >
            {/* Active glow */}
            {isActive && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#388BFD]/10 blur-3xl -mr-8 -mt-8 pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col h-full">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h4
                        className={`font-semibold leading-snug tracking-tight font-display ${isActive ? 'text-[#E6EDF3]' : 'text-[#C9D1D9] group-hover:text-[#E6EDF3]'
                            }`}
                        style={{ fontSize: 'var(--font-size-lg)' }}
                    >
                        {note.title || 'Sin título'}
                    </h4>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowMove(false); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1c2128] border border-white/10 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                                {!showMove ? (
                                    <>
                                        <button onClick={() => {
                                            const title = prompt('Nuevo título:', note.title);
                                            if (title) updateNote(note.id, { title });
                                            setShowMenu(false);
                                        }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                            <Edit2 size={12} /> Renombrar
                                        </button>
                                        <button onClick={() => setShowMove(true)} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                            <RotateCcw size={12} /> Mover a...
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button onClick={() => {
                                            if (window.confirm('¿Borrar nota?')) deleteNote(note.id);
                                            setShowMenu(false);
                                        }} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                                            <Trash2 size={12} /> Borrar
                                        </button>
                                    </>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto scrollbar-hide">
                                        <button onClick={() => setShowMove(false)} className="w-full text-left px-4 py-1 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:bg-white/5 mb-1 px-4 py-2">
                                            ← Volver
                                        </button>
                                        <button onClick={() => { updateNote(note.id, { subject_id: null }); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5">
                                            (Sin carpeta)
                                        </button>
                                        {subjects.map(s => (
                                            <button key={s.id} onClick={() => { updateNote(note.id, { subject_id: s.id }); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview */}
                <p
                    className="text-[#8B949E] line-clamp-2 leading-relaxed flex-1 mb-4"
                    style={{ fontSize: 'var(--font-size-sm)' }}
                >
                    {note.content?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Sin contenido...'}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-[#484F58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[#484F58]" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {formatDate(note.updated_at)}
                        </span>
                    </div>

                    {note.ai_processed && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(56,139,253,0.1)] rounded-[var(--border-radius-sm)] border border-[rgba(56,139,253,0.2)]">
                            <span className="text-[#388BFD]" style={{ fontSize: 'var(--font-size-xs)' }}>✨ Smart</span>
                        </div>
                    )}

                    {note.subject_name && !note.subject_color && (
                        <span className="text-[#484F58]" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {note.subject_name}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
