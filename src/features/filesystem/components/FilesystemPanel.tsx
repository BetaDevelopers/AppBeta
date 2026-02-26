import React, { useEffect, useState } from 'react'
import { useFilesystemStore } from '../store/useFilesystemStore'
import { ChevronRight, ChevronDown, Hash, FolderOpen, Folder, Plus } from 'lucide-react'

const SUBJECT_COLORS = [
    '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'
]

export const FilesystemPanel: React.FC = () => {
    const { subjects, notes, loadWorkspace, createSubject, createNote } = useFilesystemStore()
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    useEffect(() => { loadWorkspace('default-workspace') }, [loadWorkspace])

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleAddSubject = () => {
        const name = prompt('Nueva asignatura:')
        if (!name) return
        const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
        createSubject({ workspaceId: 'default-workspace', name, color, icon: 'folder', order: subjects.length })
    }

    const handleAddNote = (e: React.MouseEvent, subjectId: string) => {
        e.stopPropagation()
        const title = prompt('Nuevo apunte:')
        if (title) createNote({ subjectId, title, content: [], tags: [], isPinned: 0, isTrashed: 0, wordCount: 0 })
        if (!expanded.has(subjectId)) setExpanded(new Set(expanded).add(subjectId))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--beta-border)' }}>
                <input
                    placeholder="Filtrar notas..."
                    style={{
                        width: '100%', padding: '6px 12px',
                        background: 'rgba(0,0,0,0.1)', border: '1px solid var(--beta-border)',
                        borderRadius: '6px', fontSize: '12px', color: 'var(--beta-text-primary)',
                        outline: 'none',
                    }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
                {subjects.map(subject => {
                    const isOpen = expanded.has(subject.id)
                    const subjectNotes = notes.filter(n => n.subjectId === subject.id)
                    return (
                        <div key={subject.id} style={{ marginBottom: '4px' }}>
                            <div
                                onClick={() => toggle(subject.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                                    transition: 'background 0.15s ease',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--beta-accent-subtle)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Folder size={14} style={{ color: subject.color }} />
                                <span style={{ flex: 1, fontSize: '12px', fontWeight: '600' }}>{subject.name}</span>
                                <Plus size={14} style={{ color: 'var(--beta-text-muted)', cursor: 'pointer' }} onClick={(e) => handleAddNote(e, subject.id)} />
                            </div>

                            {isOpen && (
                                <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                                    {subjectNotes.map(note => (
                                        <div
                                            key={note.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--beta-accent-subtle)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <Hash size={12} style={{ color: 'var(--beta-accent)', opacity: 0.6 }} />
                                            <span style={{ fontSize: '12px', color: 'var(--beta-text-secondary)' }}>{note.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                <button
                    onClick={handleAddSubject}
                    style={{
                        marginTop: '12px', width: '100%', padding: '8px', border: '1px dashed var(--beta-border)',
                        borderRadius: '6px', background: 'none', color: 'var(--beta-text-muted)', fontSize: '11px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                >
                    <Plus size={14} />
                    Nueva Asignatura
                </button>
            </div>
        </div>
    )
}
