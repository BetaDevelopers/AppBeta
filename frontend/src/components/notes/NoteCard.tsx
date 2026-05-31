import React, { useState, useRef } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { useSubjectsStore } from '../../store/subjectsStore';
import type { Note } from '../../types';
import { MoreHorizontal, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

interface NoteCardProps {
    note: Note;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
    const { currentNote, setCurrentNote, deleteNote, updateNote } = useNotesStore();
    const { subjects } = useSubjectsStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
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

    const startRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTitleDraft(note.title || '');
        setEditingTitle(true);
        setShowMenu(false);
    };

    const commitRename = () => {
        const trimmed = titleDraft.trim();
        if (trimmed && trimmed !== note.title) updateNote(note.id, { title: trimmed });
        setEditingTitle(false);
    };

    const cancelRename = () => {
        setEditingTitle(false);
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => { if (!editingTitle) setCurrentNote(note); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !editingTitle) setCurrentNote(note); }}
                className={`group relative w-full text-left p-5 rounded-[var(--border-radius-xl)] transition-all duration-150 border cursor-pointer active:scale-[0.98] ${isActive
                    ? 'bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.4)] shadow-[0_0_24px_rgba(59,130,246,0.1)]'
                    : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#222] hover:bg-[#141414] hover:translate-x-1'
                    }`}
                style={{ minHeight: '140px' }}
            >
                {/* Active glow */}
                <div className="absolute inset-0 overflow-hidden rounded-[var(--border-radius-xl)] pointer-events-none">
                    {isActive && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#3b82f6]/10 blur-3xl -mr-8 -mt-8" />
                    )}
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                        {editingTitle ? (
                            <input
                                ref={inputRef}
                                autoFocus
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                                    if (e.key === 'Escape') cancelRename();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold leading-snug tracking-tight font-display text-[#fafafa] bg-transparent border-b border-[#3b82f6] outline-none w-full min-w-0"
                                style={{ fontSize: 'var(--font-size-lg)' }}
                            />
                        ) : (
                            <h4
                                className={`font-semibold leading-snug tracking-tight font-display ${isActive ? 'text-[#fafafa]' : 'text-[#C9D1D9] group-hover:text-[#fafafa]'}`}
                                style={{ fontSize: 'var(--font-size-lg)' }}
                            >
                                {note.title || 'Sin título'}
                            </h4>
                        )}

                        <div className="relative flex-shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowMove(false); }}
                                className="p-1.5 rounded-lg hover:bg-[#141414] text-[#555] hover:text-white transition-all"
                            >
                                <MoreHorizontal size={18} />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-[#1a1a1a] rounded-xl shadow-2xl z-[100] py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                                    {!showMove ? (
                                        <>
                                            <button
                                                onClick={startRename}
                                                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#555] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-2"
                                            >
                                                <Edit2 size={12} /> Renombrar
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowMove(true); }}
                                                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#555] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-2"
                                            >
                                                <RotateCcw size={12} /> Mover a...
                                            </button>
                                            <div className="h-px bg-[#222] my-1" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setShowMenu(false); }}
                                                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                            >
                                                <Trash2 size={12} /> Borrar
                                            </button>
                                        </>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto scrollbar-hide">
                                            <button onClick={(e) => { e.stopPropagation(); setShowMove(false); }} className="w-full text-left px-4 py-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:bg-[#1a1a1a]">
                                                ← Volver
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); updateNote(note.id, { subject_id: null }); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-[#555] hover:text-white hover:bg-[#1a1a1a]">
                                                (Sin carpeta)
                                            </button>
                                            {subjects.map(s => (
                                                <button key={s.id} onClick={(e) => { e.stopPropagation(); updateNote(note.id, { subject_id: s.id }); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-[#555] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-2">
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
                        className="text-[#555] line-clamp-2 leading-relaxed flex-1 mb-4"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                        {note.content?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Sin contenido...'}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#141414]">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[#444]" style={{ fontSize: 'var(--font-size-xs)' }}>
                                {formatDate(note.updated_at)}
                            </span>
                        </div>

                        {note.ai_processed && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(59,130,246,0.1)] rounded-[var(--border-radius-sm)] border border-[rgba(59,130,246,0.2)]">
                                <span className="text-[#3b82f6]" style={{ fontSize: 'var(--font-size-xs)' }}>✨ Smart</span>
                            </div>
                        )}

                        {note.subject_name && !note.subject_color && (
                            <span className="text-[#444]" style={{ fontSize: 'var(--font-size-xs)' }}>
                                {note.subject_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {confirmDelete && (
                <ConfirmModal
                    title="Borrar nota"
                    description={`¿Borrar "${note.title || 'Sin título'}"? Esta acción no se puede deshacer.`}
                    onConfirm={() => { deleteNote(note.id); setConfirmDelete(false); }}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </>
    );
};
