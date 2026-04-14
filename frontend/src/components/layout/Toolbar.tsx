import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import { useUIStore } from '../../store/uiStore';

interface ToolbarProps {
    onToggleChat?: () => void;
    chatOpen?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onToggleChat, chatOpen }) => {
    const { user, logout, isGuest } = useAuthStore();
    const { isSaving } = useNotesStore();
    const openAuthModal = useUIStore((s) => s.openAuthModal);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            // Leer del store en el momento del disparo para evitar stale closure
            const { searchNotes: search, fetchNotes: fetch, activeSubjectId: subjectId } = useNotesStore.getState();
            if (q.trim().length >= 2) {
                await search(q);
            } else {
                await fetch(subjectId ?? undefined);
            }
        }, 300);
    };

    const handleClearSearch = async () => {
        setSearchQuery('');
        // Leer subjectId al momento de la llamada, no del closure
        const { fetchNotes: fetch, activeSubjectId: subjectId } = useNotesStore.getState();
        await fetch(subjectId ?? undefined);
    };

    const planLabel =
        user?.plan === 'premium' ? '👑 Premium'
            : user?.plan === 'pro' ? '⭐ Pro'
                : 'Free';

    const planClass =
        user?.plan === 'premium'
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/30 text-white'
            : user?.plan === 'pro'
                ? 'bg-gradient-to-r from-[#8957E5] to-[#A371F7] border-purple-400/30 text-white'
                : 'bg-white/5 border-white/10 text-[#8B949E] hover:text-white hover:bg-white/10';

    const handleIAToggle = () => {
        if (isGuest) {
            openAuthModal('selection');
        } else {
            onToggleChat?.();
        }
    };

    return (
        <header
            className="glass border-b border-[rgba(255,255,255,0.08)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-[100] shadow-2xl backdrop-blur-3xl"
            style={{ minHeight: 'var(--touch-target-lg)' }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                onClick={() => navigate('/dashboard')}
            >
                <div className="w-8 h-8 btn-premium rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="text-white font-bold text-xs tracking-tighter">3M</span>
                </div>
                <span className="text-base font-bold text-white tracking-tight font-display hidden sm:block">
                    BETA 3M
                </span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl mx-4 sm:mx-8">
                <div className="relative">
                    <svg
                        className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#484F58]"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Busca en tus notas..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-full py-2.5 pl-11 pr-9 text-[15px] font-medium focus:bg-[#2D333B] focus:ring-2 focus:ring-[#388BFD]/30 focus:border-[#388BFD]/40 outline-none transition-all placeholder:text-[#484F58] text-[#E6EDF3]"
                        style={{ height: '40px' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484F58] hover:text-[#E6EDF3] transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Saving indicator */}
                {isSaving && (
                    <div className="flex items-center gap-2 bg-[#388BFD]/10 px-3 py-1.5 rounded-full border border-[#388BFD]/20">
                        <div className="w-1.5 h-1.5 bg-[#388BFD] rounded-full animate-pulse" />
                        <span className="text-[#388BFD] text-xs font-medium hidden sm:block">Guardant</span>
                    </div>
                )}

                {/* IA Assistant button */}
                <button
                    onClick={handleIAToggle}
                    className={`flex items-center gap-1.5 px-3 rounded-xl border text-[13px] font-semibold transition-all duration-200
                        ${chatOpen
                            ? 'bg-[#A371F7] text-white border-[#A371F7] shadow-[0_0_16px_rgba(163,113,247,0.4)]'
                            : 'bg-[rgba(163,113,247,0.1)] border-[rgba(163,113,247,0.2)] text-[#A371F7] hover:bg-[rgba(163,113,247,0.2)]'
                        }`}
                    style={{ height: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
                    title="Assistent IA"
                >
                    <span>✨</span>
                    <span className="hidden md:inline">IA</span>
                </button>

                {/* Plan badge - Only show if not guest */}
                {!isGuest && (
                    <button
                        onClick={() => navigate('/plans')}
                        className={`px-3 rounded-full text-[13px] font-semibold transition-all border shadow-sm ${planClass}`}
                        style={{ height: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
                    >
                        {planLabel}
                    </button>
                )}

                {/* Avatar */}
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/perfil')}
                >
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-sm font-semibold text-[#E6EDF3] leading-none group-hover:text-[#388BFD] transition-colors">
                            {isGuest ? 'Modo Invitado' : (user?.display_name || user?.email?.split('@')[0])}
                        </span>
                        <span className="text-[11px] text-[#484F58] mt-0.5">{isGuest ? 'Sin cuenta' : 'Estudiant'}</span>
                    </div>
                    <div
                        className="rounded-xl bg-gradient-to-br from-[#21262D] to-[#2D333B] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#E6EDF3] font-bold flex-shrink-0 overflow-hidden group-hover:border-[#388BFD]/30 transition-all"
                        style={{ width: '36px', height: '36px' }}
                    >
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm">{user?.email?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                </div>

                {/* Logout or Login */}
                <button
                    onClick={isGuest ? () => openAuthModal('login') : handleLogout}
                    className="flex items-center justify-center rounded-xl text-[#484F58] hover:text-[#F78166] hover:bg-[rgba(247,129,102,0.1)] transition-all border border-transparent hover:border-[rgba(247,129,102,0.15)]"
                    style={{ width: 'var(--touch-target)', height: 'var(--touch-target)' }}
                    title={isGuest ? 'Iniciar sessió' : 'Tancar sessió'}
                >
                    {isGuest ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l4-4m0 0l-4-4m4 4H4m13 4h1a2 2 0 002-2V7a2 2 0 00-2-2h-1" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    )}
                </button>
            </div>
        </header>
    );
};
