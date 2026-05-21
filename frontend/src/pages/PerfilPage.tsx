import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import type { UserStats } from '../types';
import { FileText, BookOpen, Sparkles, Check, X } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_CONFIG = {
    free:    { label: 'Free',    color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', limit: '0 usos IA/mes' },
    pro:     { label: 'Pro',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  limit: '50 usos IA/mes' },
    premium: { label: 'Premium', color: '#a855f7', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.3)',  limit: 'IA il·limitada' },
};

function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getInitials(name?: string | null, email?: string) {
    if (name) return name.slice(0, 2).toUpperCase();
    return (email || 'U').slice(0, 2).toUpperCase();
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
            {children}
        </div>
    );
}

function Input({ value, onChange, type = 'text', placeholder, disabled }: {
    value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 14, outline: 'none',
                opacity: disabled ? 0.5 : 1,
            }}
        />
    );
}

function Btn({ onClick, children, variant = 'primary', disabled, small }: {
    onClick: () => void; children: React.ReactNode;
    variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean;
}) {
    const styles: Record<string, React.CSSProperties> = {
        primary: { background: '#3b82f6', color: '#fff', border: 'none' },
        ghost:   { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' },
        danger:  { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: small ? '7px 14px' : '10px 20px',
                borderRadius: 10, fontSize: small ? 12 : 14,
                fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
                ...styles[variant],
            }}
        >
            {children}
        </button>
    );
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
    return (
        <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: type === 'ok' ? '#4ade80' : '#f87171',
            zIndex: 9999, whiteSpace: 'nowrap',
        }}>
            {type === 'ok' ? <Check size={14}/> : <X size={14}/>} {msg}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const PerfilPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuthStore();

    // Profile edit
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [email, setEmail]             = useState(user?.email || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password change
    const [currentPw, setCurrentPw]   = useState('');
    const [newPw, setNewPw]           = useState('');
    const [confirmPw, setConfirmPw]   = useState('');
    const [savingPw, setSavingPw]     = useState(false);

    // Delete account
    const [showDelete, setShowDelete]     = useState(false);
    const [deletePw, setDeletePw]         = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Stats
    const [stats, setStats] = useState<UserStats | null>(null);

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    const showToast = (msg: string, type: 'ok' | 'err') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        apiClient.get<UserStats>('/users/me/stats')
            .then(setStats)
            .catch(() => {});
    }, []);

    // ── Save profile ─────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const body: Record<string, string> = {};
            if (displayName !== (user?.display_name || '')) body.display_name = displayName;
            if (email !== user?.email) body.email = email;
            if (!Object.keys(body).length) return showToast('Cap canvi detectat', 'err');

            const updated = await apiClient.put<typeof user>('/users/me', body);
            updateUser(updated as any);
            showToast('Perfil actualitzat', 'ok');
        } catch (e: any) {
            showToast(e.message || 'Error al guardar', 'err');
        } finally {
            setSavingProfile(false);
        }
    };

    // ── Change password ──────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (newPw !== confirmPw) return showToast('Les contrasenyes no coincideixen', 'err');
        if (newPw.length < 8) return showToast('Mínim 8 caràcters', 'err');
        setSavingPw(true);
        try {
            await apiClient.put('/users/me', { current_password: currentPw, password: newPw });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            showToast('Contrasenya actualitzada', 'ok');
        } catch (e: any) {
            showToast(e.message || 'Error al canviar la contrasenya', 'err');
        } finally {
            setSavingPw(false);
        }
    };

    // ── Delete account ───────────────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        if (!deletePw) return showToast('Introdueix la contrasenya', 'err');
        setDeletingAccount(true);
        try {
            await apiClient.delete('/users/me', { password: deletePw });
            logout();
            navigate('/login');
        } catch (e: any) {
            showToast(e.message || 'Error al eliminar el compte', 'err');
            setDeletingAccount(false);
        }
    };

    const plan       = user?.plan || 'free';
    const planCfg    = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
    const aiLimit    = plan === 'pro' ? 50 : plan === 'premium' ? Infinity : 0;
    const aiUsed     = user?.ai_uses_this_month || 0;
    const aiPct      = aiLimit === Infinity ? 100 : aiLimit === 0 ? 100 : Math.min((aiUsed / aiLimit) * 100, 100);

    return (
        <div style={{
            minHeight: '100vh', width: '100vw',
            background: '#080c14', color: '#f1f5f9',
            fontFamily: "'Inter', sans-serif",
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '24px 16px 48px',
        }}>
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            {/* Header */}
            <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
                        padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>El meu perfil</h1>
            </div>

            <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Avatar + plan */}
                <div style={{
                    padding: 24, borderRadius: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', gap: 20,
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, fontWeight: 900, color: '#fff',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
                    }}>
                        {getInitials(user?.display_name, user?.email)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.display_name || user?.email?.split('@')[0] || 'Usuari'}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: planCfg.bg, border: `1px solid ${planCfg.border}`,
                            borderRadius: 20, padding: '3px 12px',
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: planCfg.color }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: planCfg.color }}>
                                Pla {planCfg.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
                    }}>
                        {[
                            { label: 'Notes', value: stats.notes, icon: <FileText size={14}/> },
                            { label: 'Assignatures', value: stats.subjects, icon: <BookOpen size={14}/> },
                            { label: 'Usos IA', value: stats.ai_uses_this_month, icon: <Sparkles size={14}/> },
                        ].map(s => (
                            <div key={s.label} style={{
                                padding: '16px 12px', borderRadius: 16, textAlign: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* IA usage bar */}
                {plan !== 'premium' && (
                    <div style={{
                        padding: '16px 20px', borderRadius: 16,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                            <span style={{ fontWeight: 700 }}>Usos IA aquest mes</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {plan === 'free' ? 'No disponible' : `${aiUsed} / ${aiLimit}`}
                            </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 99, transition: 'width 0.5s',
                                width: `${plan === 'free' ? 100 : aiPct}%`,
                                background: plan === 'free' ? '#ef4444' : aiPct > 80 ? '#f59e0b' : '#3b82f6',
                            }} />
                        </div>
                        {plan === 'free' && (
                            <button
                                onClick={() => navigate('/plans')}
                                style={{
                                    marginTop: 12, width: '100%', padding: '9px', borderRadius: 10,
                                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                                    color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                }}
                            >
                                Actualitza el pla per usar la IA →
                            </button>
                        )}
                    </div>
                )}

                {/* Edit profile */}
                <div style={{
                    padding: 20, borderRadius: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <Section title="Informació del perfil">
                        <Field label="Nom visible">
                            <Input value={displayName} onChange={setDisplayName} placeholder="El teu nom" />
                        </Field>
                        <Field label="Correu electrònic">
                            <Input value={email} onChange={setEmail} type="email" placeholder="correu@exemple.com" />
                        </Field>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <Btn onClick={handleSaveProfile} disabled={savingProfile}>
                                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                            </Btn>
                        </div>
                    </Section>
                </div>

                {/* Change password */}
                <div style={{
                    padding: 20, borderRadius: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <Section title="Canviar contrasenya">
                        <Field label="Contrasenya actual">
                            <Input value={currentPw} onChange={setCurrentPw} type="password" placeholder="••••••••" />
                        </Field>
                        <Field label="Nova contrasenya">
                            <Input value={newPw} onChange={setNewPw} type="password" placeholder="Mínim 8 caràcters" />
                        </Field>
                        <Field label="Confirmar nova contrasenya">
                            <Input value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Repeteix la nova contrasenya" />
                        </Field>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <Btn onClick={handleChangePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw}>
                                {savingPw ? 'Actualitzant…' : 'Canviar contrasenya'}
                            </Btn>
                        </div>
                    </Section>
                </div>

                {/* Account info */}
                <div style={{
                    padding: 20, borderRadius: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <Section title="Informació del compte">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: 'ID d\'usuari', value: String(user?.id || '—') },
                                { label: 'Membre des de', value: formatDate(user?.created_at) },
                                { label: 'Pla actual', value: `${planCfg.label} — ${planCfg.limit}` },
                            ].map(row => (
                                <div key={row.label} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                            <Btn onClick={() => navigate('/plans')} variant="ghost">
                                Veure plans →
                            </Btn>
                            <Btn onClick={logout} variant="ghost">
                                Cerrar sesión
                            </Btn>
                        </div>
                    </Section>
                </div>

                {/* Danger zone */}
                <div style={{
                    padding: 20, borderRadius: 20,
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.15)',
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,68,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        Zona de perill
                    </div>
                    {!showDelete ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Eliminar compte</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Todas tus notas y datos se eliminarán permanentemente.</div>
                            </div>
                            <Btn onClick={() => setShowDelete(true)} variant="danger" small>Eliminar</Btn>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 13, color: '#f87171', marginBottom: 12, fontWeight: 600 }}>
                                Confirma la teva contrasenya per eliminar el compte permanentment:
                            </div>
                            <Input value={deletePw} onChange={setDeletePw} type="password" placeholder="La teva contrasenya" />
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                <Btn onClick={() => { setShowDelete(false); setDeletePw(''); }} variant="ghost">Cancel·lar</Btn>
                                <Btn onClick={handleDeleteAccount} variant="danger" disabled={deletingAccount || !deletePw}>
                                    {deletingAccount ? 'Eliminant…' : 'Confirmar eliminació'}
                                </Btn>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
