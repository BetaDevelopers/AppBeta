import React, { useState, useEffect } from 'react'
import { FilesystemPanel } from './features/filesystem/components/FilesystemPanel'
import { BetaEditor } from './features/editor/components/BetaEditor'
import { BetaProvider } from './shared/components/BetaProvider'
import { InsightsPanel } from './features/ai/components/InsightsPanel'
import { SmartFormGenerator } from './features/ai/components/SmartFormGenerator'
import { CaptureModal } from './features/camera/components/CaptureModal'
import { useFilesystemStore } from './features/filesystem/store/useFilesystemStore'
import {
    Maximize2, Minimize2, Sun, Moon, Sparkles,
    MoreVertical, User, FileText, Camera, BookOpen,
    FolderOpen, Settings, Plus, Wand2, ChevronRight, X, Globe, ShieldCheck, Database, Save
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIAssistant } from './hooks/useAIAssistant'
import { SettingsModal } from './features/settings/components/SettingsModal'

type ActivityTab = 'notes' | 'folders' | 'ai' | 'camera' | 'settings'

const App: React.FC = () => {
    const { notes, activeNoteId, renameNote, updateNote } = useFilesystemStore()
    const { optimizeNote, isOptimizing } = useAIAssistant()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [sidebarTab, setSidebarTab] = useState<'notes' | 'ai'>('notes')
    const [theme, setTheme] = useState<'dark' | 'light'>(() =>
        (localStorage.getItem('beta-theme') as 'dark' | 'light') || 'dark'
    )

    const activeNote = notes.find(n => n.id === activeNoteId)
    const isDark = theme === 'dark'
    const accentColor = '#2563eb'

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('beta-theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    // 3. Define handleOptimize
    const handleOptimize = async () => {
        if (!activeNote) return
        const optimized = await optimizeNote(activeNote.content as any)
        if (optimized) {
            updateNote(activeNote.id, { content: optimized }) // 5. Ensure updateNote is called
        }
    }

    return (
        <BetaProvider>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                background: isDark ? 'var(--beta-bg)' : '#f1f5f9',
                color: isDark ? 'var(--beta-text-primary)' : '#0f172a',
                fontFamily: "'Inter', sans-serif",
            }}>

                {/* ── Simplified Top Header ─────────────────────────── */}
                {/* ── Simplified Top Header ─────────────────────────── */}
                <header
                    className="glass-effect"
                    style={{
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        zIndex: 100,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '32px', height: '32px', background: accentColor,
                            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 8px 16px ${accentColor}33`
                        }}>
                            <span style={{ color: '#fff', fontWeight: '900', fontSize: '16px' }}>β</span>
                        </div>
                        {activeNote && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}
                            >
                                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--beta-text-secondary)' }}>
                                    {activeNote.title}
                                </span>
                            </motion.div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setIsCameraOpen(true)} style={headerIconStyle} title="Escanear Apunte">
                            <Camera size={20} />
                        </button>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
                        <button onClick={toggleTheme} style={headerIconStyle} title="Tema">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button onClick={toggleFullscreen} style={headerIconStyle} title="Expandir">
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                style={{
                                    ...headerIconStyle,
                                    background: isProfileOpen ? 'rgba(37,99,235,0.15)' : 'transparent',
                                    color: isProfileOpen ? accentColor : 'var(--beta-text-muted)',
                                }}
                                title="Mi Perfil"
                            >
                                <User size={20} />
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="glass-effect"
                                        style={{
                                            position: 'absolute', top: '50px', right: 0,
                                            width: '220px', borderRadius: '16px', padding: '8px',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                            zIndex: 300, border: '1px solid rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                                            <div style={{ fontWeight: '800', fontSize: '14px' }}>Nacho del Río</div>
                                            <div style={{ fontSize: '11px', color: 'var(--beta-text-muted)' }}>Estudiante Premium</div>
                                        </div>
                                        <ProfileMenuItem icon={<User size={14} />} label="Mi Perfil" />
                                        <ProfileMenuItem onClick={() => setIsSettingsOpen(true)} icon={<Settings size={14} />} label="Ajustes" />
                                        <ProfileMenuItem icon={<Sparkles size={14} />} label="Plan Beta AI" />
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
                                        <ProfileMenuItem icon={<Minimize2 size={14} />} label="Cerrar Sesión" color="#ef4444" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{
                                ...headerIconStyle,
                                background: isSidebarOpen ? 'rgba(37,99,235,0.18)' : 'transparent',
                                color: isSidebarOpen ? accentColor : 'var(--beta-text-muted)',
                            }}
                            title="Panel de Control"
                        >
                            <MoreVertical size={24} />
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {/* Tablet Edge Gutter (Swipe Trigger) */}
                    <motion.div
                        onPan={(_, info) => {
                            if (info.offset.x < -50 && !isSidebarOpen) {
                                setIsSidebarOpen(true)
                            }
                        }}
                        style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0,
                            width: '30px', zIndex: 100, cursor: 'w-resize',
                            background: 'transparent'
                        }}
                    />

                    {/* ── Main Canvas (The "Hoja") ─────────────────────── */}
                    <main style={{
                        flex: 1,
                        overflowY: 'auto',
                        position: 'relative',
                        background: isDark ? '#080c14' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 10,
                    }}>
                        <div style={{ width: '100%', padding: isFullscreen ? '0' : '48px 0', display: 'flex', justifyContent: 'center' }}>
                            <motion.div
                                className="page-canvas paper-texture"
                                layout
                                style={{
                                    boxShadow: isFullscreen ? 'none' : undefined,
                                    maxWidth: isFullscreen ? '100%' : '850px',
                                    borderRadius: isFullscreen ? '0' : '12px',
                                    minHeight: isFullscreen ? '100vh' : '1100px',
                                    width: '100%',
                                }}
                            >
                                <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                            {activeNote ? 'Editando Documento' : 'Nuevo Apunte'}
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {/* 4. Replace static 'Optimizar' button logic */}
                                            <button
                                                onClick={handleOptimize}
                                                disabled={isOptimizing}
                                                style={{ ...toolBtnStyle, opacity: isOptimizing ? 0.7 : 1 }}
                                                title="Mejorar Escritura"
                                            >
                                                <Wand2 size={14} className={isOptimizing ? 'animate-spin' : ''} /> {/* 4. Show spinner */}
                                                <span>{isOptimizing ? 'Optimizando...' : 'Optimizar'}</span> {/* 4. Change text */}
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        value={activeNote?.title || ''}
                                        onChange={(e) => activeNote && renameNote(activeNote.id, e.target.value)}
                                        placeholder="Sin Título"
                                        style={{
                                            margin: '0',
                                            fontSize: '3rem',
                                            fontWeight: '900',
                                            letterSpacing: '-0.05em',
                                            lineHeight: 1.1,
                                            width: '100%',
                                            border: 'none',
                                            outline: 'none',
                                            background: 'transparent',
                                            color: 'inherit',
                                            fontFamily: 'inherit',
                                        }}
                                    />
                                    <div style={{ height: '4px', background: accentColor, width: '60px', marginTop: '20px', borderRadius: '2px' }} />
                                </div>
                                <BetaEditor />
                            </motion.div>
                        </div>
                    </main>

                    {/* ── Right Overlay Sidebar (Drawer) ────────────────── */}
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsSidebarOpen(false)}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 150
                                    }}
                                />
                                <motion.aside
                                    initial={{ x: 380 }}
                                    animate={{ x: 0 }}
                                    exit={{ x: 380 }}
                                    className="glass-effect"
                                    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                                    style={{
                                        position: 'absolute', top: 0, right: 0, bottom: 0,
                                        width: '380px',
                                        zIndex: 200, display: 'flex', flexDirection: 'column',
                                        boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
                                        borderLeft: 'none',
                                    }}
                                >
                                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', color: accentColor, letterSpacing: '0.1em' }}>Espacio de Trabajo</span>
                                        <button onClick={() => setIsSidebarOpen(false)} style={headerIconStyle}>
                                            <ChevronRight size={22} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', padding: '6px', margin: '20px', borderRadius: '16px' }}>
                                        {(['notes', 'ai'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setSidebarTab(tab as any)}
                                                style={{
                                                    flex: 1, padding: '12px', border: 'none',
                                                    background: sidebarTab === tab ? accentColor : 'transparent',
                                                    color: sidebarTab === tab ? '#fff' : 'var(--beta-text-muted)',
                                                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '800', fontSize: '13px'
                                                }}
                                            >
                                                {tab === 'notes' ? <FolderOpen size={18} /> : <Sparkles size={18} />}
                                                {tab === 'notes' ? 'Navigator' : 'Insights'}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                                        {sidebarTab === 'notes' ? (
                                            <FilesystemPanel />
                                        ) : (
                                            <InsightsPanel />
                                        )}
                                    </div>

                                    <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                        <button
                                            onClick={() => setIsSidebarOpen(false)}
                                            style={{
                                                width: '100%', padding: '16px', background: accentColor, color: '#fff',
                                                border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                boxShadow: `0 10px 20px ${accentColor}44`,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Plus size={18} /> Crear Nueva Nota
                                        </button>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <CaptureModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} />

                <style dangerouslySetInnerHTML={{
                    __html: `
                .page-canvas {
                    background: #ffffff;
                    width: 100%;
                    min-height: 1056px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    padding: 60px 80px;
                    color: #1e293b;
                    position: relative;
                }
                [data-theme='dark'] .page-canvas {
                    background: #ffffff; /* Always keep paper white for students */
                    color: #0f172a;
                }
                .desk-area {
                    display: flex;
                    justify-content: center;
                    min-height: calc(100vh - 56px);
                }
            `}} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </BetaProvider>
    )
}

const ProfileMenuItem: React.FC<{ icon: React.ReactNode, label: string, color?: string, onClick?: () => void }> = ({ icon, label, color, onClick }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
            color: color || 'var(--beta-text-primary)',
            fontSize: '13px', fontWeight: '600'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
        {icon}
        {label}
    </div>
)

const headerIconStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--beta-text-muted)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
}

const toolBtnStyle: React.CSSProperties = {
    background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800'
}

export default App
