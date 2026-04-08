import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { User, Mail, ShieldCheck, Sparkles, ArrowLeft, Database } from 'lucide-react';

export const PerfilPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const planType = "Estudiante Premium"; // Hardcoded as requested

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080c14',
            fontFamily: "'Inter', sans-serif",
            color: '#f1f5f9',
            padding: '24px'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '32px',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 40px 80px rgba(0, 0, 0, 0.4)',
                    position: 'relative'
                }}
            >
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        position: 'absolute', top: '24px', left: '24px',
                        background: 'rgba(255, 255, 255, 0.06)', border: 'none',
                        borderRadius: '10px', padding: '8px', cursor: 'pointer',
                        color: 'rgba(255, 255, 255, 0.5)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    <ArrowLeft size={18} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '16px', boxShadow: '0 10px 30px rgba(37,99,235,0.35)',
                    }}>
                        <User size={36} color="#fff" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>
                        Mi Perfil
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <InfoRow icon={<Mail size={16} />} label="Correo Electrónico" value={user?.email || 'No disponible'} />
                    <InfoRow icon={<Database size={16} />} label="ID de Usuario" value={user?.id || 'No disponible'} />
                    <InfoRow icon={<ShieldCheck size={16} />} label="Plan de Suscripción" value={planType} highlight />
                </div>

                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        marginTop: '32px',
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Volver al Dashboard
                </button>
            </motion.div>
        </div>
    );
};

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string, highlight?: boolean }> = ({ icon, label, value, highlight }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '14px', padding: '14px 16px',
    }}>
        <div style={{ color: highlight ? '#2563eb' : 'rgba(255, 255, 255, 0.4)', display: 'flex', flexShrink: 0 }}>
            {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '600', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </div>
            <div style={{
                fontSize: '14px', fontWeight: '700',
                color: highlight ? '#2563eb' : '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {value}
            </div>
        </div>
    </div>
);
