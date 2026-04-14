import React, { useEffect, useState, useMemo } from 'react'
import { useFilesystemStore } from '../store/useFilesystemStore'
import {
    ChevronRight, ChevronDown, Hash, Folder,
    Plus, Trash2, Edit2, Search, Download, FileDown,
    RotateCcw, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExport } from '@/hooks/useExport'
import { SubjectModal } from '@/components/subjects/SubjectModal'
import { useSubjectsStore } from '@/store/subjectsStore'

const SUBJECT_COLORS = [
    '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'
]

export const FilesystemPanel: React.FC = () => {
    const {
        subjects, notes, trashedNotes, activeNoteId, setActiveNote, loadWorkspace, createSubject,
        createNote, renameSubject, deleteSubject, renameNote, deleteNote,
        restoreNote, deleteNotePermanently, updateNote
    } = useFilesystemStore()
    const { exportNoteAsPDF, exportNoteAsMarkdown, exportSubjectAsZip } = useExport()

    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [hoveredSubjectId, setHoveredSubjectId] = useState<string | null>(null)
    const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [showTrash, setShowTrash] = useState(false)
    const [movingNoteId, setMovingNoteId] = useState<string | null>(null)
    const [isSubModalOpen, setIsSubModalOpen] = useState(false)
    const [editingSubject, setEditingSubject] = useState<any>(null)

    useEffect(() => { loadWorkspace('default-workspace') }, [loadWorkspace])

    const filteredSubjects = useMemo(() => {
        if (!search) return subjects
        const s = search.toLowerCase()
        return subjects.filter(sub => {
            const matchSub = sub.name.toLowerCase().includes(s)
            const matchNote = notes.some(n => n.subjectId === sub.id && n.title.toLowerCase().includes(s))
            return matchSub || matchNote
        })
    }, [subjects, notes, search])

    const filteredNotes = (subjectId: string) => {
        const subNotes = notes.filter(n => n.subjectId === subjectId)
        if (!search) return subNotes
        return subNotes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
    }

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleAddSubject = () => {
        setEditingSubject(null)
        setIsSubModalOpen(true)
    }

    const handleAddNote = (e: React.MouseEvent, subjectId: string) => {
        e.stopPropagation()
        const title = 'Nuevo Apunte'
        createNote({ subjectId, title, content: [], tags: [], isPinned: 0, isTrashed: 0, wordCount: 0 })
        if (!expanded.has(subjectId)) setExpanded(new Set(expanded).add(subjectId))
    }

    const handleRenameSub = (e: React.MouseEvent, subject: any) => {
        e.stopPropagation()
        setEditingSubject(subject)
        setIsSubModalOpen(true)
    }

    const handleDeleteSub = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('¿Borrar esta asignatura y enviar sus apuntes a la papelera?')) deleteSubject(id)
    }

    const handleRenameN = (e: React.MouseEvent, id: string, oldTitle: string) => {
        e.stopPropagation()
        const title = prompt('Renombrar apunte:', oldTitle)
        if (title && title !== oldTitle) renameNote(id, title)
    }

    const handleDeleteN = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('¿Enviar este apunte a la papelera?')) deleteNote(id)
    }

    const handleRestoreN = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        restoreNote(id)
    }

    const handlePermDeleteN = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('¿Eliminar permanentemente este apunte? Esta acción no se puede deshacer.')) deleteNotePermanently(id)
    }

    const handleExportNote = (e: React.MouseEvent, note: any, type: 'pdf' | 'md') => {
        e.stopPropagation()
        if (type === 'pdf') exportNoteAsPDF()
        else exportNoteAsMarkdown(note)
    }

    const handleExportSubject = (e: React.MouseEvent, subject: any) => {
        e.stopPropagation()
        const subNotes = notes.filter(n => n.subjectId === subject.id)
        exportSubjectAsZip(subject, subNotes)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input
                        placeholder="Filtrar notas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 12px 12px 36px',
                            background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px', fontSize: '12px', color: 'var(--beta-text-primary)',
                            outline: 'none', transition: 'all 0.2s',
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <AnimatePresence>
                    {filteredSubjects.map(subject => {
                        const isOpen = expanded.has(subject.id) || !!search
                        const subjectNotes = filteredNotes(subject.id)
                        return (
                            <motion.div
                                key={subject.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                style={{ marginBottom: '6px' }}
                            >
                                <div
                                    onClick={() => toggle(subject.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px', borderRadius: '18px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: hoveredSubjectId === subject.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                                        border: hoveredSubjectId === subject.id ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={() => setHoveredSubjectId(subject.id)}
                                    onMouseLeave={() => setHoveredSubjectId(null)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--beta-text-muted)', opacity: 0.5 }}>
                                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Folder size={22} style={{ color: subject.color, fill: `${subject.color}22` }} />
                                    </div>
                                    <span style={{
                                        flex: 1, fontSize: '14px', fontWeight: '800',
                                        color: hoveredSubjectId === subject.id ? '#fff' : 'var(--beta-text-secondary)',
                                        letterSpacing: '-0.02em', transition: 'color 0.2s'
                                    }}>
                                        {subject.name}
                                    </span>

                                    <div style={{ display: 'flex', gap: '4px', opacity: hoveredSubjectId === subject.id ? 1 : 0.4 }}>
                                        <button onClick={(e) => handleAddNote(e, subject.id)} style={tinyBtnStyle} title="Añadir Nota"><Plus size={18} /></button>
                                        <button
                                            onClick={(e) => handleRenameSub(e, subject)}
                                            style={{ ...tinyBtnStyle, background: 'rgba(255,255,255,0.05)' }}
                                            title="Opciones de carpeta"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {(isOpen || !!search) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ marginLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
                                        >
                                            <div style={{ marginLeft: '14px', padding: '8px 0' }}>
                                                {subjectNotes.map(note => {
                                                    const isActive = activeNoteId === note.id
                                                    return (
                                                        <div
                                                            key={note.id}
                                                            onClick={() => setActiveNote(note.id)}
                                                            onMouseEnter={() => setHoveredNoteId(note.id)}
                                                            onMouseLeave={() => setHoveredNoteId(null)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                                padding: '12px 16px', borderRadius: '14px', cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                background: isActive ? 'rgba(37,99,235,0.15)' : (hoveredNoteId === note.id ? 'rgba(255,255,255,0.04)' : 'transparent'),
                                                            }}
                                                        >
                                                            <Hash size={18} style={{ color: isActive ? '#fff' : '#2563eb', opacity: isActive ? 1 : 0.5 }} />
                                                            <span style={{
                                                                flex: 1, fontSize: '14px',
                                                                color: isActive ? '#fff' : 'var(--beta-text-secondary)',
                                                                fontWeight: isActive ? '800' : '600'
                                                            }}>
                                                                {note.title}
                                                            </span>

                                                            <div style={{ display: 'flex', gap: '4px', opacity: (hoveredNoteId === note.id || isActive) ? 1 : 0.3 }}>
                                                                <button onClick={(e) => { e.stopPropagation(); setMovingNoteId(movingNoteId === note.id ? null : note.id); }} style={tinyBtnStyle} title="Mover a..."><RotateCcw size={14} /></button>

                                                                {movingNoteId === note.id && (
                                                                    <select
                                                                        autoFocus
                                                                        onBlur={() => setMovingNoteId(null)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            updateNote(note.id, { subjectId: e.target.value });
                                                                            setMovingNoteId(null);
                                                                        }}
                                                                        style={{
                                                                            position: 'absolute', right: '100%', top: 0, zIndex: 50,
                                                                            background: '#161B22', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                                                                            borderRadius: '8px', padding: '4px', fontSize: '11px', outline: 'none'
                                                                        }}
                                                                    >
                                                                        <option value="">(Sin carpeta)</option>
                                                                        {subjects.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                )}

                                                                <button onClick={(e) => handleRenameN(e, note.id, note.title)} style={tinyBtnStyle} title="Renombrar"><Edit2 size={14} /></button>
                                                                <button onClick={(e) => handleDeleteN(e, note.id)} style={{ ...tinyBtnStyle, color: '#ef4444' }} title="Borrar"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                <button
                    onClick={handleAddSubject}
                    style={{
                        marginTop: '24px', width: '100%', padding: '18px', border: '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: '18px', background: 'rgba(255,255,255,0.02)', color: 'var(--beta-text-muted)', fontSize: '14px',
                        fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#2563eb'
                        e.currentTarget.style.color = '#2563eb'
                        e.currentTarget.style.background = 'rgba(37,99,235,0.05)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.color = 'var(--beta-text-muted)'
                        e.currentTarget.style.background = 'transparent'
                    }}
                >
                    <Plus size={18} />
                    Añadir Asignatura
                </button>

                {/* ─── PAPELERA ────────────────────────────────────────── */}
                <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <div
                        onClick={() => setShowTrash(!showTrash)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                            cursor: 'pointer', color: 'var(--beta-text-muted)', opacity: 0.6
                        }}
                    >
                        {showTrash ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Trash2 size={14} />
                        <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Papelera ({trashedNotes.length})</span>
                    </div>

                    <AnimatePresence>
                        {showTrash && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ padding: '8px 0' }}>
                                    {trashedNotes.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--beta-text-muted)', fontStyle: 'italic' }}>
                                            Vacía
                                        </div>
                                    ) : trashedNotes.map(note => (
                                        <div
                                            key={note.id}
                                            onMouseEnter={() => setHoveredNoteId(note.id)}
                                            onMouseLeave={() => setHoveredNoteId(null)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '8px 12px', borderRadius: '10px', opacity: 0.5
                                            }}
                                        >
                                            <Hash size={14} />
                                            <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', textDecoration: 'line-through' }}>{note.title}</span>
                                            {hoveredNoteId === note.id && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={(e) => handleRestoreN(e, note.id)} style={tinyBtnStyle} title="Restaurar"><RotateCcw size={12} /></button>
                                                    <button onClick={(e) => handlePermDeleteN(e, note.id)} style={{ ...tinyBtnStyle, color: '#ef4444' }} title="Eliminar definitivamente"><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <SubjectModal
                isOpen={isSubModalOpen}
                subject={editingSubject}
                onClose={() => {
                    setIsSubModalOpen(false)
                    setEditingSubject(null)
                }}
            />
        </div>
    )
}

const tinyBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '8px', color: 'var(--beta-text-muted)', transition: 'all 0.2s'
}
