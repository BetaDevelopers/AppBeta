import React, { useState, useEffect } from 'react'
import { FilesystemPanel } from './features/filesystem/components/FilesystemPanel'
import { BetaEditor } from './features/editor/components/BetaEditor'
import { BetaProvider } from './shared/components/BetaProvider'
import { SummaryPanel } from './features/ai/components/SummaryPanel'
import { SmartFormGenerator } from './features/ai/components/SmartFormGenerator'
import { CaptureModal } from './features/camera/components/CaptureModal'
import { useFilesystemStore } from './features/filesystem/store/useFilesystemStore'
import {
    LayoutGrid, Camera, Sparkles, FolderOpen, Settings,
    Search, ChevronLeft, FileText, Download, Sun, Moon,
    Cloud, BookOpen, ChevronRight
} from 'lucide-react'
import { exportToMarkdown } from './shared/utils/export'

type ActivityTab = 'notes' | 'folders' | 'ai' | 'camera' | 'settings'

const ActivityButton: React.FC<{
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
}> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        title={label}
        aria-label={label}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            width: '100%',
            padding: '12px 0',
            background: active ? 'var(--beta-accent-subtle)' : 'transparent',
            border: 'none',
            borderLeft: active ? '2px solid var(--beta-accent)' : '2px solid transparent',
            color: active ? 'var(--beta-accent)' : 'var(--beta-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
        }}
    >
        {icon}
        <span>{label}</span>
    </button>
)

const App: React.FC = () => {
    const [activity, setActivity] = useState<ActivityTab>('notes')
    const [isPanelOpen, setIsPanelOpen] = useState(true)
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'editor' | 'form'>('editor')
    const [theme, setTheme] = useState<'dark' | 'light'>(() =>
        (localStorage.getItem('beta-theme') as 'dark' | 'light') || 'dark'
    )
    const [searchQuery, setSearchQuery] = useState('')

    const { notes } = useFilesystemStore()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('beta-theme', theme)
    }, [theme])

    const handleActivityClick = (tab: ActivityTab) => {
        if (tab === 'camera') { setIsCameraOpen(true); return }
        if (activity === tab) {
            setIsPanelOpen(p => !p)
        } else {
            setActivity(tab)
            setIsPanelOpen(true)
        }
    }

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

    const isDark = theme === 'dark'
    const border = isDark ? 'var(--beta-border)' : 'rgba(0,0,0,0.08)'

    return (
        <BetaProvider>
            <div style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                background: isDark ? 'var(--beta-bg)' : '#f8fafc',
                color: isDark ? 'var(--beta-text-primary)' : '#0f172a',
                fontFamily: "'Inter', sans-serif",
            }}>

                {/* ── Activity Bar (Leftmost) ─────────────────────────── */}
                <nav style={{
                    width: '64px',
                    background: isDark ? '#080e1c' : '#f1f5f9',
                    borderRight: `1px solid ${border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: '12px',
                    gap: '4px',
                    flexShrink: 0,
                    zIndex: 50,
                }}>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            width: '32px', height: '32px', background: 'var(--beta-accent)',
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                        }}>
                            <span style={{ color: '#fff', fontWeight: '900', fontSize: '14px' }}>β</span>
                        </div>
                    </div>

                    <ActivityButton icon={<BookOpen size={20} />} label="Notas" active={activity === 'notes' && isPanelOpen} onClick={() => handleActivityClick('notes')} />
                    <ActivityButton icon={<FolderOpen size={20} />} label="Carpetas" active={activity === 'folders' && isPanelOpen} onClick={() => handleActivityClick('folders')} />
                    <ActivityButton icon={<Sparkles size={20} />} label="AI" active={activity === 'ai' && isPanelOpen} onClick={() => handleActivityClick('ai')} />
                    <ActivityButton icon={<Camera size={20} />} label="Cámara" active={false} onClick={() => handleActivityClick('camera')} />

                    <div style={{ flex: 1 }} />

                    <button onClick={toggleTheme} style={bottomIconStyle}>
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <ActivityButton icon={<Settings size={20} />} label="Config" active={activity === 'settings' && isPanelOpen} onClick={() => handleActivityClick('settings')} />
                </nav>

                {/* ── Content Sidebar (Tree) ─────────────────────────── */}
                {isPanelOpen && (
                    <aside style={{
                        width: '260px',
                        background: isDark ? 'var(--beta-surface)' : '#fff',
                        borderRight: `1px solid ${border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        flexShrink: 0,
                        zIndex: 40,
                    }}>
                        <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--beta-text-muted)' }}>
                                {activity.toUpperCase()}
                            </span>
                            <button onClick={() => setIsPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--beta-text-muted)' }}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <FilesystemPanel />
                        </div>
                    </aside>
                )}

                {/* ── Main content area ──────────────────────────────── */}
                <main style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* Top title bar */}
                    <header style={{
                        height: '48px',
                        padding: '0 24px',
                        borderBottom: `1px solid ${border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isDark ? 'rgba(15,23,42,0.4)' : '#fff',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} style={{ color: 'var(--beta-accent)' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Física II: Mecánica Cuántica.pdf</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.05)', padding: '2px', borderRadius: '6px' }}>
                                {(['editor', 'form'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            padding: '4px 16px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none', cursor: 'pointer',
                                            background: activeTab === tab ? (isDark ? 'var(--beta-surface-2)' : '#fff') : 'transparent',
                                            color: activeTab === tab ? 'var(--beta-text-primary)' : 'var(--beta-text-muted)',
                                        }}
                                    >
                                        {tab === 'editor' ? 'Editor' : 'IA Estructura'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsAiPanelOpen(!isAiPanelOpen)} style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--beta-accent)', color: '#fff',
                                fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <Sparkles size={14} />
                                Beta AI
                            </button>
                        </div>
                    </header>

                    {/* Scrollable Editor */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
                        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                            {activeTab === 'editor' ? <BetaEditor /> : <SmartFormGenerator content="..." />}
                        </div>
                    </div>
                </main>

                {/* ── AI Panel (Right) ───────────────────────────────── */}
                {isAiPanelOpen && (
                    <SummaryPanel content="..." isOpen={isAiPanelOpen} onClose={() => setIsAiPanelOpen(false)} />
                )}

                <CaptureModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} />
            </div>
        </BetaProvider>
    )
}

const bottomIconStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--beta-text-muted)', padding: '12px', display: 'flex'
}

export default App
