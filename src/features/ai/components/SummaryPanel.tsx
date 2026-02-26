import React, { useState } from 'react'
import { aiClient } from '@/lib/ai/client'
import { Sparkles, FileText, ListChecks, BrainCircuit, X } from 'lucide-react'

const MODE_META = [
    { id: 'brief' as const, label: 'Breve', icon: <FileText size={16} /> },
    { id: 'structured' as const, label: 'Estruct.', icon: <BrainCircuit size={16} /> },
    { id: 'flashcards' as const, label: 'Tarjetas', icon: <ListChecks size={16} /> },
]

export const SummaryPanel: React.FC<{ content: string; isOpen: boolean; onClose: () => void }> = ({ content, isOpen, onClose }) => {
    const [summary, setSummary] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'brief' | 'structured' | 'flashcards'>('structured')

    const handleGenerate = async () => {
        setIsLoading(true)
        try {
            const res = await aiClient.generateSummary(content, { mode })
            setSummary(res)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <aside style={{
            width: 'var(--beta-ai-panel)',
            background: 'var(--beta-surface)',
            borderLeft: '1px solid var(--beta-border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            zIndex: 30,
            overflowY: 'auto',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--beta-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: 'var(--beta-accent)' }} />
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--beta-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Beta AI
                    </span>
                </div>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--beta-text-muted)', padding: '4px', borderRadius: '5px',
                    display: 'flex', alignItems: 'center',
                }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Mode selector */}
                <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--beta-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', margin: '0 0 10px' }}>
                        Modo
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {MODE_META.map(m => (
                            <button key={m.id} onClick={() => setMode(m.id)} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                padding: '10px 6px', borderRadius: '8px',
                                border: `1px solid ${mode === m.id ? 'var(--beta-accent)' : 'var(--beta-border)'}`,
                                background: mode === m.id ? 'var(--beta-accent-subtle)' : 'transparent',
                                color: mode === m.id ? 'var(--beta-accent)' : 'var(--beta-text-muted)',
                                fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                                {m.icon}
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate button */}
                <button onClick={handleGenerate} disabled={isLoading} style={{
                    width: '100%', padding: '12px',
                    background: 'var(--beta-accent)', border: 'none', borderRadius: '8px',
                    color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.15s',
                }}>
                    {isLoading
                        ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        : <Sparkles size={14} />
                    }
                    {summary ? 'Regenerar' : 'Generar Resumen'}
                </button>

                {/* Result */}
                {summary && (
                    <div className="animate-fade-up">
                        <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--beta-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                            Resultado
                        </p>
                        <div style={{
                            padding: '14px', background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--beta-border)', borderRadius: '8px',
                            color: 'var(--beta-text-secondary)', fontSize: '13px', lineHeight: 1.7,
                        }}>
                            {summary}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    )
}
