import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from './ui/Button';

export const GuestBanner: React.FC = () => {
    const isGuest = useAuthStore((s) => s.isGuest);
    const openAuthModal = useUIStore((s) => s.openAuthModal);

    if (!isGuest) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
                <span>Modo invitado · Tus notas no se guardan en la nube</span>
            </div>
            <button
                onClick={() => openAuthModal('register')}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-all backdrop-blur-md border border-white/10"
            >
                Crear cuenta gratuita
            </button>
        </div>
    );
};
