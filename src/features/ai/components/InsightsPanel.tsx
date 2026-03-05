import React, { useMemo } from 'react'
import { useFilesystemStore } from '@/features/filesystem/store/useFilesystemStore'
import { Sparkles, FileText, Clock, BarChart3, BookOpen, Hash } from 'lucide-react'
import { SummaryPanel } from './SummaryPanel'
import { Text } from 'slate'

export const InsightsPanel: React.FC = () => {
    const { notes, subjects, activeNoteId } = useFilesystemStore()

    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId])

    // Helper to count words in Slate nodes
    const getStats = (content: any[]) => {
        let textContent = ''
        const extract = (nodes: any[]) => {
            nodes.forEach(n => {
                if (Text.isText(n)) textContent += n.text + ' '
                else if (n.children) extract(n.children)
            })
        }
        extract(content)

        const words = textContent.trim().split(/\s+/).filter(w => w.length > 0).length
        const chars = textContent.trim().length
        const readingTime = Math.ceil(words / 200) // Avg 200 wpm

        return { words, chars, readingTime }
    }

    const { words, chars, readingTime } = useMemo(() => {
        if (!activeNote) return { words: 0, chars: 0, readingTime: 0 }
        return getStats(activeNote.content as any[])
    }, [activeNote])

    const totalNotes = notes.length
    const totalSubjects = subjects.length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px' }}>

            {/* ── Document Stats ─────────────────────────────────── */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', opacity: 0.6 }}>
                    <BarChart3 size={14} />
                    <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estadísticas</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        icon={<FileText size={16} />}
                        label="Palabras"
                        value={words.toString()}
                        color="#3b82f6"
                    />
                    <StatCard
                        icon={<Clock size={16} />}
                        label="Lectura"
                        value={`${readingTime} min`}
                        color="#8b5cf6"
                    />
                    <StatCard
                        icon={<Hash size={16} />}
                        label="Caracteres"
                        value={chars.toString()}
                        color="#ec4899"
                    />
                    <StatCard
                        icon={<BookOpen size={16} />}
                        label="Apuntes"
                        value={totalNotes.toString()}
                        color="#10b981"
                    />
                </div>
            </section>

            {/* ── AI Assistant ───────────────────────────────────── */}
            <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
                <SummaryPanel
                    content={activeNote ? JSON.stringify(activeNote.content) : ''}
                    isOpen={true}
                    onClose={() => { }}
                />
            </section>
        </div>
    )
}

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
        <div>
            <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--beta-text-muted)', fontWeight: '700' }}>{label}</div>
        </div>
    </div>
)
