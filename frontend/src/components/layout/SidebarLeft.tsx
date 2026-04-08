import React, { useState } from 'react';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useNotesStore } from '../../store/notesStore';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { SubjectModal } from '../subjects/SubjectModal';
import { NoteCard } from '../notes/NoteCard';
import { Button } from '../ui/Button';

interface SidebarLeftProps {
    collapsed: boolean;
    onToggle: () => void;
}

const EINES = [
    { tool: 'mathOCR',      icon: '✏',  label: 'Lápiz intel·ligent',   desc: 'Dibuix → LaTeX' },
    { tool: 'mathOCRImage', icon: '🖼',  label: 'OCR imatge',           desc: 'Imatge → text' },
    { tool: 'mathEditor',   icon: '∑',   label: 'TeXificar',             desc: 'Text → LaTeX' },
    { tool: 'tableToChart', icon: '📊',  label: 'Taula → gràfic',       desc: 'Genera gràfic' },
    { tool: 'chartToTable', icon: '📉',  label: 'Gràfic → taula',       desc: 'Extreu dades' },
    { tool: 'geometry',     icon: '📐',  label: 'Geometria',             desc: 'Dibuix → SVG' },
    { tool: 'diagram',      icon: '🗂',  label: 'Diagrama',              desc: 'Interpreta esquema' },
    { tool: 'calibrate',    icon: '🎯',  label: 'Calibrar escriptura',   desc: 'Ajusta el lápiz' },
] as const;

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ collapsed, onToggle }) => {
    const { subjects } = useSubjectsStore();
    const { notes, activeSubjectId, setActiveSubject, fetchNotes, createNote } = useNotesStore();
    const { openTool } = useMathToolsStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [einesOpen, setEinesOpen] = useState(false);

    const handleCreateNote = async () => { await createNote(); };

    const handleSelectSubject = async (id: number | null) => {
        setActiveSubject(id);
        await fetchNotes(id || undefined);
    };

    return (
        <>
            <aside
                className={`
                    flex-shrink-0 bg-[#0f172a] border-r border-white/5 h-full flex flex-col overflow-hidden shadow-2xl
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'w-0' : 'w-80'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <span className="text-xs font-semibold text-slate-500">Notes</span>
                    <button
                        onClick={onToggle}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
                        title="Col·lapsar"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <div className="px-4 pb-3 space-y-1 overflow-hidden">
                    {/* Nova nota */}
                    <Button onClick={handleCreateNote} className="w-full gap-2 h-10 text-sm mb-4">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova nota
                    </Button>

                    {/* Totes les notes */}
                    <button
                        onClick={() => handleSelectSubject(null)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                            activeSubjectId === null
                                ? 'bg-blue-600/10 text-blue-400 font-medium'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSubjectId === null ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        Totes les notes
                    </button>
                </div>

                {/* Assignatures */}
                <div className="px-4 pb-3">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-semibold text-slate-600">Assignatures</span>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-1 hover:text-blue-400 hover:bg-blue-400/10 rounded-md text-slate-600 transition-all"
                            title="Nova assignatura"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-0.5 max-h-44 overflow-y-auto scrollbar-hide">
                        {subjects.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => handleSelectSubject(s.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                                    activeSubjectId === s.id
                                        ? 'bg-blue-600/10 text-blue-400 font-medium'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}55` }}
                                />
                                <span className="truncate flex-1 text-left">{s.name}</span>
                            </button>
                        ))}
                        {subjects.length === 0 && (
                            <p className="text-[11px] text-slate-700 px-3 py-2">Cap assignatura creada</p>
                        )}
                    </div>
                </div>

                {/* Eines math — col·lapsable */}
                <div className="px-4 pb-3 border-t border-white/5 pt-3">
                    <button
                        onClick={() => setEinesOpen(v => !v)}
                        className="w-full flex items-center justify-between px-1 py-1 rounded-lg text-slate-500 hover:text-slate-300 transition-all group"
                    >
                        <span className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className="text-sm">🔧</span>
                            Eines matemàtiques
                        </span>
                        <svg
                            className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${einesOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {einesOpen && (
                        <div className="mt-1.5 space-y-0.5">
                            {EINES.map(({ tool, icon, label }) => (
                                <button
                                    key={tool}
                                    onClick={() => openTool(tool)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all text-sm group"
                                >
                                    <span className="w-5 text-center flex-shrink-0 text-base">{icon}</span>
                                    <span className="flex-1 text-left text-[12px]">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recents */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide border-t border-white/5 pt-3">
                    <span className="text-[11px] font-semibold text-slate-600 px-1 block mb-3">Recents</span>
                    <div className="space-y-2">
                        {notes.map((n) => (
                            <NoteCard key={n.id} note={n} />
                        ))}
                        {notes.length === 0 && (
                            <p className="text-center py-10 text-[12px] text-slate-700">Sense notes</p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Tira per reobrir quan col·lapsat */}
            {collapsed && (
                <button
                    onClick={onToggle}
                    className="flex-shrink-0 w-7 h-full bg-[#0f172a]/50 border-r border-white/5 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-[#0f172a]/70 transition-all"
                    title="Obrir panell"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            <SubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};
