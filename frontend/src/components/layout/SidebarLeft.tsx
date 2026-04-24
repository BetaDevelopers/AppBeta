import React, { useState, useRef, useCallback } from 'react';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useNotesStore } from '../../store/notesStore';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { SubjectModal } from '../subjects/SubjectModal';
import type { Subject } from '../../types';
import { PenLine, ScanLine, Sigma, BarChart2, TrendingDown, Triangle, GitBranch, Crosshair, Wrench } from 'lucide-react';

interface SidebarLeftProps {
    open: boolean;
    collapsed: boolean;      // true = icon-only 72px mode (tablet-landscape)
    isOverlay: boolean;      // true = drawer/overlay mode (mobile, tablet-portrait)
    onToggle: () => void;
    onClose: () => void;
}

const EINES: { tool: string; icon: React.ReactNode; label: string }[] = [
    { tool: 'mathOCR',      icon: <PenLine size={18} />,     label: 'Lápiz inteligente' },
    { tool: 'mathOCRImage', icon: <ScanLine size={18} />,    label: 'OCR imagen' },
    { tool: 'mathEditor',   icon: <Sigma size={18} />,       label: 'TeXificar' },
    { tool: 'tableToChart', icon: <BarChart2 size={18} />,   label: 'Tabla → gráfico' },
    { tool: 'chartToTable', icon: <TrendingDown size={18} />, label: 'Gráfico → tabla' },
    { tool: 'geometry',     icon: <Triangle size={18} />,    label: 'Geometría' },
    { tool: 'diagram',      icon: <GitBranch size={18} />,   label: 'Diagrama' },
    { tool: 'calibrate',    icon: <Crosshair size={18} />,   label: 'Calibrar escritura' },
];

interface ContextMenu {
    subjectId: number;
    x: number;
    y: number;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
    open,
    collapsed,
    isOverlay,
    onToggle,
    onClose,
}) => {
    const { subjects, deleteSubject } = useSubjectsStore();
    const { notes, activeSubjectId, setActiveSubject, fetchNotes, createNote } = useNotesStore();
    const { openTool } = useMathToolsStore();
    const isGuest = useAuthStore((s) => s.isGuest);
    const openAuthModal = useUIStore((s) => s.openAuthModal);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [einesOpen, setEinesOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressActive = useRef(false);

    const handleCreateNote = async () => { await createNote(); };

    const handleSelectSubject = async (id: number | null) => {
        setActiveSubject(id);
        await fetchNotes(id || undefined);
    };

    const handleOpenCreate = () => {
        if (isGuest) { openAuthModal('selection'); return; }
        setEditingSubject(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = useCallback((s: Subject) => {
        setEditingSubject(s);
        setIsModalOpen(true);
        setContextMenu(null);
    }, []);

    const handleDeleteSubject = useCallback(async (s: Subject) => {
        setContextMenu(null);
        const confirmed = window.confirm(
            `¿Eliminar "${s.name}"? Las notas quedarán sin asignatura.`
        );
        if (!confirmed) return;
        await deleteSubject(s.id);
    }, [deleteSubject]);

    const handleOpenTool = (tool: any) => {
        if (isGuest) { openAuthModal('selection'); return; }
        openTool(tool);
    };

    const startLongPress = (e: React.TouchEvent | React.MouseEvent, s: Subject) => {
        longPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressActive.current = true;
            const rect = (e.target as HTMLElement).closest('[data-subject]')?.getBoundingClientRect();
            setContextMenu({
                subjectId: s.id,
                x: rect ? rect.right - 120 : 150,
                y: rect ? rect.bottom + 4 : 100,
            });
        }, 500);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleSubjectClick = (s: Subject) => {
        if (longPressActive.current) { longPressActive.current = false; return; }
        handleSelectSubject(s.id);
    };

    const closeContextMenu = () => setContextMenu(null);

    const sortedSubjects = [...subjects].sort((a, b) => {
        const pa = a.position ?? 9999;
        const pb = b.position ?? 9999;
        if (pa !== pb) return pa - pb;
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });

    // ── Width logic ──────────────────────────────────────────────────
    // isOverlay: drawer, always full content width (240px) when open
    // !isOverlay + collapsed: 72px icon-only
    // !isOverlay + !collapsed: 240px full
    const sidebarWidth = !open
        ? (isOverlay ? '0px' : (collapsed ? 'var(--sidebar-left-collapsed)' : 'var(--sidebar-left)'))
        : (isOverlay ? '240px' : (collapsed ? 'var(--sidebar-left-collapsed)' : 'var(--sidebar-left)'));

    const isIconOnly = collapsed && !isOverlay && open;
    // Overlay closed → hidden; overlay open → shown as absolute drawer
    const overlayClass = isOverlay
        ? `absolute top-0 left-0 h-full z-40 ${open ? 'translate-x-0' : '-translate-x-full'}`
        : 'relative';

    return (
        <>
            <aside
                className={`
                    sidebar flex-shrink-0 bg-[#161B22] border-r border-[rgba(255,255,255,0.08)] h-full flex flex-col overflow-hidden shadow-xl
                    transition-all duration-300 ease-out safe-area-left
                    ${overlayClass}
                `}
                style={{ width: isOverlay ? (open ? '240px' : '0px') : sidebarWidth }}
            >
                {/* ── Header ─────────────────────────────────────── */}
                <div className={`flex items-center pt-5 pb-4 ${isIconOnly ? 'justify-center px-2' : 'justify-between px-5'}`}>
                    {!isIconOnly && (
                        <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">
                            Navegació
                        </span>
                    )}
                    <button
                        onClick={isOverlay ? onClose : onToggle}
                        className="flex items-center justify-center rounded-lg text-[#484F58] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                        style={{ width: '44px', height: '44px' }}
                        aria-label={isOverlay ? 'Cerrar sidebar' : (collapsed ? 'Expandir' : 'Colapsar')}
                        title={isOverlay ? 'Cerrar' : (collapsed ? 'Expandir sidebar' : 'Colapsar sidebar')}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isOverlay || !collapsed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            )}
                        </svg>
                    </button>
                </div>

                <div className={`pb-4 flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 ${isIconOnly ? 'px-2' : 'px-4'}`}>

                    {/* ── Create note button ────────────────────── */}
                    <button
                        onClick={handleCreateNote}
                        className="relative w-full overflow-hidden rounded-xl shadow-lg shadow-blue-600/20 transition-transform active:scale-95"
                        style={{ height: 'var(--touch-md)' }}
                        title={isIconOnly ? 'Crear nueva nota' : undefined}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1d6fee] to-[#388BFD]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" />
                        <div className="relative flex items-center justify-center gap-2 text-white font-semibold text-[15px]">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            {!isIconOnly && <span>Crear nueva nota</span>}
                        </div>
                    </button>

                    {/* ── All notes ────────────────────────────── */}
                    <div>
                        <button
                            onClick={() => handleSelectSubject(null)}
                            className={`w-full flex items-center rounded-xl text-[15px] font-medium transition-colors
                                ${isIconOnly ? 'justify-center' : 'gap-3 px-4'}
                                ${activeSubjectId === null
                                    ? 'bg-[rgba(56,139,253,0.1)] text-[#388BFD]'
                                    : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                                }`}
                            style={{ height: 'var(--touch-md)' }}
                            title={isIconOnly ? 'Todas mis notas' : undefined}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${activeSubjectId === null ? 'bg-[#388BFD] shadow-[0_0_8px_rgba(56,139,253,0.6)]' : 'bg-[#2D333B]'}`} />
                            {!isIconOnly && (
                                <>
                                    <span className="flex-1 text-left">Todas mis notas</span>
                                    {notes.length > 0 && (
                                        <span className="ml-auto text-[11px] font-medium text-[#484F58]">{notes.length}</span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── Subjects section ─────────────────────── */}
                    {!isIconOnly && (
                        <div>
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">
                                    Asignaturas
                                </span>
                                <button
                                    onClick={handleOpenCreate}
                                    className="flex items-center justify-center rounded-lg text-[#484F58] hover:text-[#388BFD] hover:bg-[rgba(56,139,253,0.1)] transition-colors"
                                    style={{ width: '32px', height: '32px' }}
                                    aria-label="Nueva asignatura"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto scrollbar-hide notes-fade-mask">
                                {sortedSubjects.map((s) => (
                                    <div
                                        key={s.id}
                                        data-subject={s.id}
                                        className={`group w-full flex items-center gap-2 pl-4 pr-1 rounded-xl text-[14px] transition-all cursor-pointer select-none
                                            ${activeSubjectId === s.id
                                                ? 'bg-[#21262D] text-[#E6EDF3] font-semibold'
                                                : 'text-[#8B949E] hover:bg-[#21262D]/50 hover:text-[#E6EDF3] font-medium'
                                            }`}
                                        style={{ height: '44px' }}
                                        onClick={() => handleSubjectClick(s)}
                                        onMouseDown={(e) => startLongPress(e, s)}
                                        onTouchStart={(e) => startLongPress(e, s)}
                                        onMouseUp={cancelLongPress}
                                        onTouchEnd={cancelLongPress}
                                    >
                                        {s.icon ? (
                                            <span className="text-base leading-none flex-shrink-0 w-5 text-center">{s.icon}</span>
                                        ) : (
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{
                                                    backgroundColor: s.color,
                                                    boxShadow: activeSubjectId === s.id ? `0 0 10px ${s.color}` : 'none',
                                                }}
                                            />
                                        )}
                                        <span className="truncate flex-1 text-left">{s.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }}
                                            className="flex-shrink-0 flex items-center justify-center rounded-lg text-[#484F58] hover:text-[#8B949E] hover:bg-[#21262D] transition-colors"
                                            style={{ width: '32px', height: '32px' }}
                                            aria-label="Editar asignatura"
                                            title="Editar"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s); }}
                                            className="flex-shrink-0 flex items-center justify-center rounded-lg text-[#484F58] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            style={{ width: '32px', height: '32px' }}
                                            aria-label="Eliminar asignatura"
                                            title="Eliminar"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                {subjects.length === 0 && (
                                    <div className="px-4 py-5 rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] text-center">
                                        <p className="text-[13px] text-[#484F58]">Sin asignaturas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Math tools section ───────────────────── */}
                    <div>
                        {!isIconOnly ? (
                            <>
                                <button
                                    onClick={() => setEinesOpen(v => !v)}
                                    className="w-full flex items-center justify-between px-1 mb-1 rounded-lg hover:bg-[#21262D] transition-colors text-[#484F58] hover:text-[#8B949E]"
                                    style={{ height: '36px' }}
                                >
                                    <span className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-2">
                                        <Wrench size={12} /> Herramientas
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
                                                className="w-full flex items-center gap-3 px-4 rounded-xl text-[13px] font-medium text-[#8B949E] hover:bg-[rgba(56,139,253,0.08)] hover:text-[#388BFD] transition-colors"
                                                style={{ height: 'var(--touch-sm)' }}
                                            >
                                                <span className="w-5 flex items-center justify-center flex-shrink-0 text-[#8B949E]">{icon}</span>
                                                <span className="flex-1 text-left">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Icon-only mode: show each tool as 52x52 icon button with tooltip */
                            <div className="flex flex-col gap-1 items-center mt-1">
                                {EINES.map(({ tool, icon, label }) => (
                                    <button
                                        key={tool}
                                        onClick={() => handleOpenTool(tool)}
                                        className="group/tool relative flex items-center justify-center rounded-xl text-[#8B949E] hover:bg-[rgba(56,139,253,0.1)] hover:text-[#388BFD] transition-colors"
                                        style={{ width: 'var(--touch-md)', height: 'var(--touch-md)' }}
                                        title={label}
                                    >
                                        <span className="flex items-center justify-center text-[#8B949E]">{icon}</span>
                                        {/* Tooltip */}
                                        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#1C2128] border border-white/10 text-[12px] text-[#E6EDF3] whitespace-nowrap opacity-0 group-hover/tool:opacity-100 transition-opacity shadow-xl z-50">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────── */}
                {!isIconOnly && (
                    <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.08)] safe-area-bottom">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#484F58]">Beta Access</span>
                            <span className="text-[11px] text-[#484F58]">v24.4.09</span>
                        </div>
                    </div>
                )}
            </aside>

            {/* Long-press context menu */}
            {contextMenu && (() => {
                const s = subjects.find(sub => sub.id === contextMenu.subjectId);
                if (!s) return null;
                return (
                    <>
                        <div className="fixed inset-0 z-[300]" onClick={closeContextMenu} />
                        <div
                            className="fixed z-[301] bg-[#1C2128] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#E6EDF3] hover:bg-[#21262D] transition-colors text-left"
                                style={{ minHeight: '48px' }}
                                onClick={() => handleOpenEdit(s)}
                            >
                                <svg className="w-4 h-4 text-[#8B949E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                            </button>
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                style={{ minHeight: '48px' }}
                                onClick={() => handleDeleteSubject(s)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    </>
                );
            })()}

            <SubjectModal
                isOpen={isModalOpen}
                subject={editingSubject ?? undefined}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingSubject(null);
                }}
            />
        </>
    );
};
