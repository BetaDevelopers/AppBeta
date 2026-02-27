import React, { useEffect, useState } from 'react'
import { useFilesystemStore } from '../store/useFilesystemStore'
import {
    ChevronRight, ChevronDown, Hash, Folder,
    Plus, Trash2, Edit2, Search, Download, FileDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExport } from '@/hooks/useExport'

const SUBJECT_COLORS = [
    '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'
]

export const FilesystemPanel: React.FC = () => {
    const {
        subjects, notes, activeNoteId, setActiveNote, loadWorkspace, createSubject,
        createNote, renameSubject, deleteSubject, renameNote, deleteNote
    } = useFilesystemStore()
    const { exportNoteAsPDF, exportNoteAsMarkdown, exportSubjectAsZip } = useExport()
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    useEffect(() => { loadWorkspace('default-workspace') }, [loadWorkspace])

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleAddSubject = () => {
        const name = 'Nueva Asignatura'
        const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
        createSubject({ workspaceId: 'default-workspace', name, color, icon: 'folder', order: subjects.length })
    }

    const handleAddNote = (e: React.MouseEvent, subjectId: string) => {
        e.stopPropagation()
        const title = 'Nuevo Apunte'
        createNote({ subjectId, title, content: [], tags: [], isPinned: 0, isTrashed: 0, wordCount: 0 })
        if (!expanded.has(subjectId)) setExpanded(new Set(expanded).add(subjectId))
    }

    const handleRenameSub = (e: React.MouseEvent, id: string, oldName: string) => {
        e.stopPropagation()
        const name = prompt('Renombrar asignatura:', oldName)
        if (name && name !== oldName) renameSubject(id, name)
    }

    const handleDeleteSub = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('¿Borrar esta asignatura y todos sus apuntes?')) deleteSubject(id)
    }

    const handleRenameN = (e: React.MouseEvent, id: string, oldTitle: string) => {
        e.stopPropagation()
        const title = prompt('Renombrar apunte:', oldTitle)
        if (title && title !== oldTitle) renameNote(id, title)
    }

    const handleDeleteN = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('¿Borrar este apunte?')) deleteNote(id)
    }

    const handleExportNote = (e: React.MouseEvent, note: any, type: 'pdf' | 'md') => {
        e.stopPropagation()
        if (type === 'pdf') exportNoteAsPDF(note)
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
                    {subjects.map(subject => {
                        const isOpen = expanded.has(subject.id)
                        const subjectNotes = notes.filter(n => n.subjectId === subject.id)
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
                                    onMouseEnter={() => setHoveredId(subject.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: hoveredId === subject.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--beta-text-muted)' }}>
                                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </div>
                                    <Folder size={18} style={{ color: subject.color }} />
                                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '700', letterSpacing: '-0.01em' }}>{subject.name}</span>

                                    <AnimatePresence>
                                        {hoveredId === subject.id && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }}
                                                style={{ display: 'flex', gap: '6px' }}
                                            >
                                                <button onClick={(e) => handleExportSubject(e, subject)} style={tinyBtnStyle} title="Exportar ZIP (Todos los apuntes)"><FileDown size={14} /></button>
                                                <button onClick={(e) => handleAddNote(e, subject.id)} style={tinyBtnStyle} title="Añadir Nota"><Plus size={14} /></button>
                                                <button onClick={(e) => handleRenameSub(e, subject.id, subject.name)} style={tinyBtnStyle} title="Renombrar"><Edit2 size={12} /></button>
                                                <button onClick={(e) => handleDeleteSub(e, subject.id)} style={{ ...tinyBtnStyle, color: '#ef4444' }} title="Borrar"><Trash2 size={12} /></button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ marginLeft: '14px', borderLeft: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
                                        >
                                            <div style={{ marginLeft: '12px', padding: '6px 0' }}>
                                                {subjectNotes.map(note => {
                                                    const isActive = activeNoteId === note.id
                                                    return (
                                                        <div
                                                            key={note.id}
                                                            onClick={() => setActiveNote(note.id)}
                                                            onMouseEnter={() => setHoveredId(note.id)}
                                                            onMouseLeave={() => setHoveredId(null)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                background: isActive ? 'rgba(37,99,235,0.15)' : (hoveredId === note.id ? 'rgba(255,255,255,0.04)' : 'transparent'),
                                                            }}
                                                        >
                                                            <Hash size={16} style={{ color: isActive ? '#fff' : '#2563eb', opacity: isActive ? 1 : 0.5 }} />
                                                            <span style={{
                                                                flex: 1, fontSize: '13px',
                                                                color: isActive ? '#fff' : 'var(--beta-text-secondary)',
                                                                fontWeight: isActive ? '800' : '600'
                                                            }}>
                                                                {note.title}
                                                            </span>

                                                            {hoveredId === note.id && (
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <button onClick={(e) => handleExportNote(e, note, 'pdf')} style={tinyBtnStyle} title="Exportar PDF"><FileDown size={12} /></button>
                                                                    <button onClick={(e) => handleExportNote(e, note, 'md')} style={tinyBtnStyle} title="Exportar Markdown"><Hash size={12} /></button>
                                                                    <button onClick={(e) => handleRenameN(e, note.id, note.title)} style={tinyBtnStyle}><Edit2 size={12} /></button>
                                                                    <button onClick={(e) => handleDeleteN(e, note.id)} style={{ ...tinyBtnStyle, color: '#ef4444' }}><Trash2 size={12} /></button>
                                                                </div>
                                                            )}
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
                        marginTop: '20px', width: '100%', padding: '14px', border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '14px', background: 'transparent', color: 'var(--beta-text-muted)', fontSize: '13px',
                        fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
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
            </div>
        </div>
    )
}

const tinyBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '8px', color: 'var(--beta-text-muted)', transition: 'all 0.2s'
}
