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
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0D1117]">
                {/* Icon */}
                <div
                    className="bg-[#161B22] rounded-3xl border border-[rgba(255,255,255,0.08)] flex items-center justify-center mb-8 shadow-2xl"
                    style={{ width: '88px', height: '88px' }}
                >
                    <svg className="w-10 h-10 text-[#2D333B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </div>

                {/* Text */}
                <div className="text-center max-w-sm mb-8">
                    <h2
                        className="font-bold text-[#E6EDF3] mb-3 tracking-tight font-display"
                        style={{ fontSize: 'var(--font-size-2xl)' }}
                    >
                        {activeSubjectId ? 'Sin notas en esta asignatura' : 'Escribe tu primera nota'}
                    </h2>
                    <p
                        className="text-[#8B949E]"
                        style={{ fontSize: 'var(--font-size-md)', lineHeight: 'var(--line-height-relaxed)' }}
                    >
                        {activeSubjectId
                            ? 'Crea una nota para empezar a organizar esta asignatura.'
                            : 'Digitaliza tus apuntes con IA y organiza tu conocimiento de forma profesional.'}
                    </p>
                </div>

                {/* CTA */}
                <button
                    onClick={handleCreateNote}
                    className="relative overflow-hidden rounded-[var(--border-radius-xl)] shadow-xl shadow-blue-500/20 flex items-center gap-3 px-8 text-white font-semibold transition-all duration-150 active:scale-95 hover:shadow-blue-500/40"
                    style={{
                        height: 'var(--touch-target-lg)',
                        fontSize: 'var(--font-size-md)',
                        background: 'linear-gradient(135deg, #1d6fee 0%, #388BFD 100%)',
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]" />
                    <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative">Nueva nota inteligente</span>
                </button>

                {/* Feature hints */}
                <div className="flex items-center gap-6 mt-10 opacity-40">
                    {[
                        { icon: '✨', text: 'IA integrada' },
                        { icon: '📷', text: 'Escaneo OCR' },
                        { icon: '∑',  text: 'Matemáticas' },
                    ].map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-[#8B949E]">
                            <span className="text-base">{icon}</span>
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#0D1117] scrollbar-hide">
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2
                            className="font-bold text-[#E6EDF3] tracking-tight font-display"
                            style={{ fontSize: 'var(--font-size-2xl)' }}
                        >
                            Mis notas
                        </h2>
                        <p className="text-[#8B949E] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {notes.length} nota{notes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleCreateNote}
                        className="flex items-center gap-2 px-4 rounded-[var(--border-radius-lg)] bg-[#388BFD] text-white font-semibold hover:bg-[#2f7be8] transition-all duration-150 active:scale-95 shadow-lg shadow-blue-500/20"
                        style={{ height: 'var(--touch-target)', fontSize: 'var(--font-size-sm)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva nota
                    </button>
                </div>

                {/* Notes grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map((n, i) => (
                        <div
                            key={n.id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
                        >
                            <NoteCard note={n} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
