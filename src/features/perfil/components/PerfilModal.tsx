import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, ShieldCheck, Sparkles } from 'lucide-react'

interface PerfilModalProps {
    isOpen: boolean
    onClose: () => void
    userName?: string
    userEmail?: string
    planType?: string
}

export const PerfilModal: React.FC<PerfilModalProps> = ({
    isOpen,
    onClose,
    userName = 'Nacho del Río',
    userEmail = 'nacho@betastem.app',
    planType = 'Estudiante Premium',
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '24px',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        className="glass-effect"
                        style={{
                            width: '100%', maxWidth: '420px', borderRadius: '24px',
                            padding: '32px', border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
                            position: 'relative',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                background: 'rgba(255,255,255,0.06)', border: 'none',
                                borderRadius: '10px', padding: '8px', cursor: 'pointer',
                                color: 'var(--beta-text-muted)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                            <X size={18} />
                        </button>

                        {/* Avatar */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '16px', boxShadow: '0 10px 30px rgba(37,99,235,0.35)',
                            }}>
                                <User size={36} color="#fff" />
                            </div>
                            <h2 style={{
                                margin: 0, fontSize: '22px', fontWeight: '900',
                                color: 'var(--beta-text-primary)', letterSpacing: '-0.02em',
                            }}>
                                {userName}
                            </h2>
                            <div style={{
                                marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                                borderRadius: '20px', padding: '4px 12px',
                            }}>
                                <Sparkles size={12} color="#2563eb" />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>
                                    {planType}
                                </span>
                            </div>
                        </div>

                        {/* Info rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <InfoRow
                                icon={<User size={16} />}
                                label="Nombre"
                                value={userName}
                            />
                            <InfoRow
                                icon={<Mail size={16} />}
                                label="Correo"
                                value={userEmail}
                            />
                            <InfoRow
                                icon={<ShieldCheck size={16} />}
                                label="Plan"
                                value={planType}
                                highlight
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

const InfoRow: React.FC<{
    icon: React.ReactNode
    label: string
    value: string
    highlight?: boolean
}> = ({ icon, label, value, highlight }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px', padding: '14px 16px',
    }}>
        <div style={{
            color: highlight ? '#2563eb' : 'var(--beta-text-muted)',
            display: 'flex', flexShrink: 0,
        }}>
            {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--beta-text-muted)', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </div>
            <div style={{
                fontSize: '14px', fontWeight: '700',
                color: highlight ? '#2563eb' : 'var(--beta-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {value}
            </div>
        </div>
    </div>
)
