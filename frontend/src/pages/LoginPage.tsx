import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthForm } from '../components/auth/AuthForm';

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 selection:bg-blue-500/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-[480px] relative">
                <div className="glass-card shadow-[0_32px_120px_-10px_rgba(0,0,0,0.8)] p-8 sm:p-14 border-white/5 bg-[#0f172a]/50 backdrop-blur-2xl rounded-[48px]">
                    <AuthForm
                        isRegisterInitial={location.pathname === '/register'}
                        onSuccess={() => navigate('/dashboard')}
                        onToggleView={(isReg) => navigate(isReg ? '/register' : '/login')}
                    />
                </div>

                {/* Brand Logo or Name */}
                <div className="mt-12 text-center">
                    <span className="text-white/10 text-[10px] font-black tracking-[0.6em] uppercase">Notas Digitales Beta 3M</span>
                </div>
            </div>
        </div>
    );
}
