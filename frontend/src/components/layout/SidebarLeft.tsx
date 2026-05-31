import React, { useState, useRef, useCallback } from 'react';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useNotesStore } from '../../store/notesStore';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { BetaLogo } from '../ui/BetaLogo';
import { SubjectModal } from '../subjects/SubjectModal';
import type { Subject } from '../../types';
<<<<<<< HEAD
import { ConfirmModal } from '../ui/ConfirmModal';
import {
    PenLine, ScanLine, Sigma, BarChart2, TrendingDown, Triangle, GitBranch, Wrench, MoreHorizontal, Trash2, Pencil, Folder,
    FileText, Ruler, Leaf, Zap, BookOpen, Microscope, Palette, Monitor, Landmark, Music, Globe, Lightbulb, Calculator, FlaskConical
} from 'lucide-react';

const SUBJECT_ICON_MAP: Record<string, React.ElementType> = {
    FileText, Ruler, Leaf, Zap, BookOpen, Microscope,
    Palette, Monitor, Landmark, Music, Globe, Lightbulb,
    Calculator, FlaskConical, BarChart2,
};
=======
import { PenLine, ScanLine, Sigma, BarChart2, TrendingDown, Triangle, GitBranch, Crosshair, Wrench } from 'lucide-react';
>>>>>>> parent of 7d49d8a0 (push 2)

interface SidebarLeftProps {
    open: boolean;
    collapsed: boolean;      // true = icon-only 72px mode (tablet-landscape)
    isOverlay: boolean;      // true = drawer/overlay mode (mobile, tablet-portrait)
    onToggle: () => void;
    onClose: () => void;
}

const EINES: { tool: string; icon: React.ReactNode; label: string }[] = [
    { tool: 'mathOCR', icon: <PenLine size={18} />, label: 'Lápiz inteligente' },
    { tool: 'mathOCRImage', icon: <ScanLine size={18} />, label: 'OCR imagen' },
    { tool: 'mathEditor', icon: <Sigma size={18} />, label: 'TeXificar' },
    { tool: 'tableToChart', icon: <BarChart2 size={18} />, label: 'Tabla → gráfico' },
    { tool: 'chartToTable', icon: <TrendingDown size={18} />, label: 'Gráfico → tabla' },
<<<<<<< HEAD
    { tool: 'geometry', icon: <Triangle size={18} />, label: 'Geometría' },
    { tool: 'diagram', icon: <GitBranch size={18} />, label: 'Diagrama' },
=======
    { tool: 'geometry',     icon: <Triangle size={18} />,    label: 'Geometría' },
    { tool: 'diagram',      icon: <GitBranch size={18} />,   label: 'Diagrama' },
    { tool: 'calibrate',    icon: <Crosshair size={18} />,   label: 'Calibrar escritura' },
>>>>>>> parent of 7d49d8a0 (push 2)
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
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

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

    const handleDeleteSubject = useCallback((s: Subject) => {
        setContextMenu(null);
        setSubjectToDelete(s);
    }, []);

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
        ? `absolute top-0 left-0 h-full z-[120] ${open ? 'translate-x-0' : '-translate-x-full'}`
        : 'relative';

    return (
        <>
            <aside
                className={`
                    sidebar flex-shrink-0 bg-[#0a0a0a] border-r border-[#1a1a1a] h-full flex flex-col overflow-hidden shadow-xl
                    transition-all duration-300 ease-out safe-area-left
                    ${overlayClass}
                `}
                style={{ width: isOverlay ? (open ? '240px' : '0px') : sidebarWidth }}
            >
                {/* ── Header ─────────────────────────────────────── */}
                <div className={`flex items-center pt-4 pb-3 ${isIconOnly ? 'justify-center px-2' : 'justify-between px-4'}`}>
                    {!isIconOnly && (
                        <span className="font-bold tracking-tight flex items-center gap-2">
                            <BetaLogo className="w-6 h-6 rounded-md shadow-sm" />
                            <span className="text-[#fafafa] text-[15px]">Beta3M</span>
                        </span>
                    )}
                    {/* Only show collapse/expand button in non-overlay (desktop) mode */}
                    {!isOverlay && (
                        <button
                            onClick={onToggle}
                            className="flex items-center justify-center rounded-lg text-[#444] hover:text-[#fafafa] hover:bg-[#111] transition-colors flex-shrink-0"
                            style={{ width: '40px', height: '40px' }}
                            aria-label={collapsed ? 'Expandir' : 'Colapsar'}
                            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {!collapsed ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                        d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                        d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>

                <div className={`pb-4 flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 ${isIconOnly ? 'px-2' : 'px-4'}`}>

                    {/* ── Create note button ────────────────────── */}
                    <button
                        onClick={handleCreateNote}
                        className="relative w-full overflow-hidden rounded-xl shadow-lg shadow-blue-600/20 transition-transform active:scale-95"
                        style={{ height: 'var(--touch-md)' }}
                        title={isIconOnly ? 'Crear nueva nota' : undefined}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1d6fee] to-[#3b82f6]" />
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
                                    ? 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6]'
                                    : 'text-[#555] hover:bg-[#111] hover:text-[#fafafa]'
                                }`}
                            style={{ height: 'var(--touch-md)' }}
                            title={isIconOnly ? 'Todas mis notas' : undefined}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${activeSubjectId === null ? 'bg-[#3b82f6] shadow-[0_0_8px_rgba(56,139,253,0.6)]' : 'bg-[#1a1a1a]'}`} />
                            {!isIconOnly && (
                                <>
                                    <span className="flex-1 text-left">Todas mis notas</span>
                                    {notes.length > 0 && (
                                        <span className="ml-auto text-[11px] font-medium text-[#444]">{notes.length}</span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── Subjects section ─────────────────────── */}
                    {!isIconOnly && (
                        <div>
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[11px] font-semibold text-[#444] uppercase tracking-widest">
                                    Asignaturas
                                </span>
                                <button
                                    onClick={handleOpenCreate}
                                    className="flex items-center justify-center rounded-lg text-[#444] hover:text-[#3b82f6] hover:bg-[rgba(59,130,246,0.1)] transition-colors"
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
                                                ? 'bg-[#111] text-[#fafafa] font-semibold'
                                                : 'text-[#555] hover:bg-[#111]/50 hover:text-[#fafafa] font-medium'
                                            }`}
                                        style={{ height: '44px' }}
                                        onClick={() => handleSubjectClick(s)}
                                        onMouseDown={(e) => startLongPress(e, s)}
                                        onTouchStart={(e) => startLongPress(e, s)}
                                        onMouseUp={cancelLongPress}
                                        onTouchEnd={cancelLongPress}
                                    >
                                        {s.icon && SUBJECT_ICON_MAP[s.icon] ? (
                                            <span
                                                className="flex-shrink-0 w-6 text-center text-[#555] opacity-80"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: s.color,
                                                }}
                                            >
                                                {React.createElement(SUBJECT_ICON_MAP[s.icon], { size: 18 })}
                                            </span>
                                        ) : (
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1.5 mr-0.5"
                                                style={{
                                                    backgroundColor: s.color,
                                                    boxShadow: activeSubjectId === s.id ? `0 0 10px ${s.color}` : 'none',
                                                }}
                                            />
                                        )}
                                        <span className="truncate flex-1 text-left min-w-0 leading-none">{s.name}</span>
                                        {/* Three-dots context menu */}
                                        <div className="relative flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (contextMenu?.subjectId === s.id) {
                                                        setContextMenu(null);
                                                    } else {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setContextMenu({
                                                            subjectId: s.id,
                                                            x: rect.right + 10,
                                                            y: rect.bottom,
                                                        });
                                                    }
                                                }}
                                                className="flex items-center justify-center rounded-lg text-[#444] hover:text-[#aaa] hover:bg-[#111] transition-colors opacity-0 group-hover:opacity-100"
                                                style={{ width: '28px', height: '28px' }}
                                                aria-label="Opciones"
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {subjects.length === 0 && (
                                    <div className="px-4 py-5 rounded-xl border border-dashed border-[#1a1a1a] text-center">
                                        <p className="text-[13px] text-[#444]">Sin asignaturas</p>
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
                                    className="w-full flex items-center justify-between px-1 mb-1 rounded-lg hover:bg-[#111] transition-colors text-[#444] hover:text-[#555]"
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
                                    <div className="flex flex-col gap-0.5 mt-1 animate-fade-in-down">
                                        {EINES.map(({ tool, icon, label }) => (
                                            <button
                                                key={tool}
                                                onClick={() => handleOpenTool(tool)}
                                                className="w-full flex items-center gap-3 px-4 rounded-xl text-[13px] font-medium text-[#555] hover:bg-[rgba(56,139,253,0.08)] hover:text-[#3b82f6] transition-all duration-150 active:scale-[0.97]"
                                                style={{ height: 'var(--touch-sm)' }}
                                            >
                                                <span className="w-5 flex items-center justify-center flex-shrink-0 text-[#555]">{icon}</span>
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
                                        className="group/tool relative flex items-center justify-center rounded-xl text-[#555] hover:bg-[rgba(59,130,246,0.1)] hover:text-[#3b82f6] transition-all duration-150 active:scale-90"
                                        style={{ width: 'var(--touch-md)', height: 'var(--touch-md)' }}
                                        title={label}
                                    >
                                        <span className="flex items-center justify-center text-[#555]">{icon}</span>
                                        {/* Tooltip */}
                                        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#111] border border-[#1a1a1a] text-[12px] text-[#fafafa] whitespace-nowrap opacity-0 group-hover/tool:opacity-100 transition-opacity shadow-xl z-50">
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
                    <div className="px-5 py-4 border-t border-[#1a1a1a] safe-area-bottom">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#444]">Beta Access</span>
                            <span className="text-[11px] text-[#444]">v1.0.0-beta</span>
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
                            className="fixed z-[301] bg-[#111] border border-[#1a1a1a] rounded-xl shadow-2xl py-1 min-w-[160px]"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#fafafa] hover:bg-[#1a1a1a] transition-colors text-left"
                                style={{ minHeight: '48px' }}
                                onClick={() => { handleOpenEdit(s); closeContextMenu(); }}
                            >
                                <Pencil size={15} className="text-[#555]" />
                                Renombrar
                            </button>
                            <button
                                disabled
                                title="Próximamente"
                                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#333] cursor-not-allowed text-left"
                                style={{ minHeight: '48px' }}
                            >
                                <Folder size={15} />
                                Mover a...
                            </button>
                            <div className="h-px bg-[#1a1a1a] mx-2" />
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                style={{ minHeight: '48px' }}
                                onClick={() => { handleDeleteSubject(s); closeContextMenu(); }}
                            >
                                <Trash2 size={15} />
                                Borrar
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

            {subjectToDelete && (
                <ConfirmModal
                    title="Borrar asignatura"
                    description={`¿Eliminar "${subjectToDelete.name}"? Las notas quedarán sin asignatura.`}
                    onConfirm={async () => { await deleteSubject(subjectToDelete.id); setSubjectToDelete(null); }}
                    onCancel={() => setSubjectToDelete(null)}
                />
            )}
        </>
    );
};
