import React, { useState, useEffect } from 'react';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useNotesStore } from '../../store/notesStore';
import { SubjectModal } from '../subjects/SubjectModal';
import { NoteCard } from '../notes/NoteCard';
import { Button } from '../ui/Button';

export const Sidebar: React.FC = () => {
    const { subjects, fetchSubjects } = useSubjectsStore();
    const { notes, fetchNotes, activeSubjectId, setActiveSubject, createNote } = useNotesStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchSubjects();
        fetchNotes();
    }, []);

    const handleCreateNote = async () => {
        await createNote();
    };

    const handleSelectSubject = async (id: number | null) => {
        setActiveSubject(id);
        await fetchNotes(id || undefined);
    };

    return (
        <aside className="w-80 bg-[#0f172a] border-r border-white/5 h-full flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 space-y-8">
                <Button onClick={handleCreateNote} className="w-full gap-3 shadow-xl shadow-blue-500/10 h-14 text-base">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva nota
                </Button>

                <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => handleSelectSubject(null)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all border border-transparent ${activeSubjectId === null
                                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${activeSubjectId === null ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                            Todas las notas
                        </button>
                        <div className="h-4" />

                        <div className="flex items-center justify-between px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">
                            <span>Asignaturas</span>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="p-1.5 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                title="Nueva asignatura"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
                            {subjects.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSelectSubject(s.id)}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all border border-transparent ${activeSubjectId === s.id
                                            ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                                            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                        }`}
                                >
                                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}66` }} />
                                    <span className="truncate flex-1 text-left">{s.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 mt-4 scrollbar-hide border-t border-white/5 pt-6">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-5">Recientes</div>
                <div className="space-y-3 px-2">
                    {notes.map((n) => (
                        <NoteCard key={n.id} note={n} />
                    ))}
                    {notes.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-slate-700 text-xs font-black uppercase tracking-widest">Vacío</div>
                        </div>
                    )}
                </div>
            </div>

            <SubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </aside>
    );
};
