import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { AuthForm } from './AuthForm';

export const GuestAuthModal: React.FC = () => {
    const { isAuthModalOpen, authModalView, closeAuthModal, setAuthModalView, postAuthAction } = useUIStore();

    if (!isAuthModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500"
                onClick={closeAuthModal}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-[480px] bg-[#0f172a] shadow-[0_32px_120px_-10px_rgba(0,0,0,0.8)] border border-white/5 rounded-[48px] p-8 sm:p-12 animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={closeAuthModal}
                    className="absolute top-8 right-8 p-2 text-slate-500 hover:text-white transition-colors z-10"
                    aria-label="Cerrar"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <AuthForm
                    isRegisterInitial={authModalView === 'register' || authModalView === 'selection'}
                    onSuccess={() => {
                        closeAuthModal();
                        if (postAuthAction) postAuthAction();
                    }}
                    onToggleView={(isReg) => setAuthModalView(isReg ? 'register' : 'login')}
                />
            </div>
        </div>
    );
};
