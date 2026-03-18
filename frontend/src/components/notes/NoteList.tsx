import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import { NoteCard } from './NoteCard';

export const NoteList: React.FC = () => {
    const { notes, createNote, activeSubjectId } = useNotesStore();

    const handleCreateNote = async () => {
        await createNote();
    };

    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0a0f1e]">
                <div className="w-24 h-24 bg-[#0f172a] rounded-3xl shadow-2xl border border-white/5 flex items-center justify-center mb-8 ring-4 ring-blue-500/5">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </div>
                <div className="text-center max-w-sm mb-10">
                    <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Escribe tu primera nota</h2>
                    <p className="text-slate-400 text-base leading-relaxed">
                        {activeSubjectId
                            ? "No hay notas aún en esta asignatura."
                            : "Digitaliza tus apuntes con IA y organiza tu conocimiento de forma profesional."}
                    </p>
                </div>
                <button
                    onClick={handleCreateNote}
                    className="bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 group active:scale-95"
                >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva nota inteligente
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto bg-[#0a0f1e] scrollbar-hide">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-3xl font-black text-white tracking-tighter">Recientes</h2>
                    <div className="px-3 py-1 bg-[#1e293b] rounded-full border border-white/5">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{notes.length} notas</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notes.map((n) => (
                        <div key={n.id}>
                            <NoteCard note={n} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
