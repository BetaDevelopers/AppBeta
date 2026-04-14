import React, { useState } from 'react';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useNotesStore } from '../../store/notesStore';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { SubjectModal } from '../subjects/SubjectModal';
import { Button } from '../ui/Button';

interface SidebarLeftProps {
    collapsed: boolean;
    onToggle: () => void;
}

const EINES = [
    { tool: 'mathOCR', icon: '✏️', label: 'Lápiz inteligente' },
    { tool: 'mathOCRImage', icon: '🖼️', label: 'OCR imagen' },
    { tool: 'mathEditor', icon: '∑', label: 'TeXificar' },
    { tool: 'tableToChart', icon: '📊', label: 'Tabla → gráfico' },
    { tool: 'chartToTable', icon: '📉', label: 'Gráfico → tabla' },
    { tool: 'geometry', icon: '📐', label: 'Geometría' },
    { tool: 'diagram', icon: '🗂️', label: 'Diagrama' },
    { tool: 'calibrate', icon: '🎯', label: 'Calibrar escritura' },
] as const;

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ collapsed, onToggle }) => {
    const { subjects } = useSubjectsStore();
    const { notes, activeSubjectId, setActiveSubject, fetchNotes, createNote } = useNotesStore();
    const { openTool } = useMathToolsStore();
    const isGuest = useAuthStore((s) => s.isGuest);
    const openAuthModal = useUIStore((s) => s.openAuthModal);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [einesOpen, setEinesOpen] = useState(false);

    const handleCreateNote = async () => { await createNote(); };

    const handleSelectSubject = async (id: number | null) => {
        setActiveSubject(id);
        await fetchNotes(id || undefined);
    };

    const handleEditSubject = (e: React.MouseEvent, s: any) => {
        e.stopPropagation();
        setEditingSubject(s);
        setIsModalOpen(true);
    };

    const handleOpenSubjectModal = () => {
        if (isGuest) {
            openAuthModal('selection');
        } else {
            setIsModalOpen(true);
        }
    };

    const handleOpenTool = (tool: any) => {
        if (isGuest) {
            openAuthModal('selection');
        } else {
            openTool(tool);
        }
    };

    return (
        <>
            <aside
                className={`
                    flex-shrink-0 bg-[#161B22] border-r border-[rgba(255,255,255,0.08)] h-full flex flex-col overflow-hidden shadow-xl
                    transition-all duration-300 ease-out
                    ${collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-72 opacity-100'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <span
                        className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest"
                    >
                        Navegació
                    </span>
                    <button
                        onClick={onToggle}
                        className="flex items-center justify-center rounded-lg text-[#484F58] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                        style={{ width: 'var(--touch-target)', height: 'var(--touch-target)' }}
                        aria-label="Tancar sidebar"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <div className="px-4 pb-4 flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-5">
                    {/* Create note button */}
                    <button
                        onClick={handleCreateNote}
                        className="relative w-full overflow-hidden rounded-[var(--border-radius-lg)] shadow-lg shadow-blue-600/20 transition-transform"
                        style={{ height: 'var(--touch-target)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1d6fee] to-[#388BFD]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" />
                        <div className="relative flex items-center justify-center gap-2 text-white font-semibold text-[15px]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            Crear nueva nota
                        </div>
                    </button>

                    {/* All notes */}
                    <div>
                        <button
                            onClick={() => handleSelectSubject(null)}
                            className={`w-full flex items-center gap-3 px-4 rounded-[var(--border-radius-md)] text-[15px] font-medium transition-colors
                                ${activeSubjectId === null
                                    ? 'bg-[rgba(56,139,253,0.1)] text-[#388BFD]'
                                    : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                                }`}
                            style={{ height: '44px' }}
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${activeSubjectId === null ? 'bg-[#388BFD] shadow-[0_0_8px_rgba(56,139,253,0.6)]' : 'bg-[#2D333B]'}`} />
                            Todas mis notas
                            {notes.length > 0 && (
                                <span className="ml-auto text-[11px] font-medium text-[#484F58]">{notes.length}</span>
                            )}
                        </button>
                    </div>

                    {/* Subjects section */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">
                                Asignaturas
                            </span>
                            <button
                                onClick={handleOpenSubjectModal}
                                className="flex items-center justify-center rounded-lg text-[#484F58] hover:text-[#388BFD] hover:bg-[rgba(56,139,253,0.1)] transition-colors"
                                style={{ width: '32px', height: '32px' }}
                                aria-label="Afegir assignatura"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto scrollbar-hide">
                            {subjects.map((s) => (
                                <div
                                    key={s.id}
                                    className={`group w-full flex items-center gap-3 px-4 rounded-[var(--border-radius-md)] text-[15px] transition-all cursor-pointer h-11
                                        ${activeSubjectId === s.id
                                            ? 'bg-[#21262D] text-[#E6EDF3] font-semibold'
                                            : 'text-[#8B949E] hover:bg-[#21262D]/50 hover:text-[#E6EDF3] font-medium'
                                        }`}
                                    onClick={() => handleSelectSubject(s.id)}
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                                        style={{
                                            backgroundColor: s.color,
                                            boxShadow: activeSubjectId === s.id ? `0 0 10px ${s.color}` : 'none',
                                        }}
                                    />
                                    <span className="truncate flex-1 text-left">{s.name}</span>

                                    <button
                                        onClick={(e) => handleEditSubject(e, s)}
                                        className="opacity-20 group-hover:opacity-100 p-2 rounded-lg hover:bg-[#323942] text-[#8B949E] hover:text-white transition-all"
                                        title="Opciones de carpeta"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {subjects.length === 0 && (
                                <div className="px-4 py-5 rounded-[var(--border-radius-md)] border border-dashed border-[rgba(255,255,255,0.08)] text-center">
                                    <p className="text-[13px] text-[#484F58]">Sin asignaturas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Math tools section */}
                    <div>
                        <button
                            onClick={() => setEinesOpen(v => !v)}
                            className="w-full flex items-center justify-between px-1 mb-1 rounded-lg hover:bg-[#21262D] transition-colors text-[#484F58] hover:text-[#8B949E]"
                            style={{ height: '36px' }}
                        >
                            <span className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-2">
                                <span>🛠</span> Herramientas
                            </span>
                            <svg
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${einesOpen ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {einesOpen && (
                            <div className="flex flex-col gap-0.5 mt-1">
                                {EINES.map(({ tool, icon, label }) => (
                                    <button
                                        key={tool}
                                        onClick={() => handleOpenTool(tool)}
                                        className="w-full flex items-center gap-3 px-4 rounded-[var(--border-radius-md)] text-[13px] font-medium text-[#8B949E] hover:bg-[rgba(56,139,253,0.08)] hover:text-[#388BFD] transition-colors"
                                        style={{ height: '44px' }}
                                    >
                                        <span className="w-5 text-center flex-shrink-0 text-base">{icon}</span>
                                        <span className="flex-1 text-left">{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#484F58]">Beta Access</span>
                        <span className="text-[11px] text-[#484F58]">v24.4.09</span>
                    </div>
                </div>
            </aside>

            {/* Collapsed toggle */}
            {collapsed && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[200]">
                    <button
                        onClick={onToggle}
                        className="glass rounded-xl flex items-center justify-center text-[#8B949E] hover:text-white hover:border-[#388BFD]/30 transition-all shadow-xl"
                        style={{ width: 'var(--touch-target)', height: 'var(--touch-target)' }}
                        aria-label="Obrir sidebar"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            <SubjectModal
                isOpen={isModalOpen}
                subject={editingSubject}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingSubject(null);
                }}
            />
        </>
    );
};
