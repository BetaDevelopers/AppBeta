import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import { useUIStore } from '../../store/uiStore';
import { Crown, Sparkles, Settings, LogOut, User } from 'lucide-react';
import { BetaLogo } from '../ui/BetaLogo';

interface ToolbarProps {
    onToggleChat?: () => void;
    chatOpen?: boolean;
    onToggleLeftSidebar?: () => void;
    leftSidebarOpen?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onToggleChat,
    chatOpen,
    onToggleLeftSidebar,
    leftSidebarOpen,
}) => {
    const { user, logout, isGuest } = useAuthStore();
    const { isSaving } = useNotesStore();
    const openAuthModal = useUIStore((s) => s.openAuthModal);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, []);

    useEffect(() => {
        if (searchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchExpanded]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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
        setSearchExpanded(false);
        const { fetchNotes: fetch, activeSubjectId: subjectId } = useNotesStore.getState();
        await fetch(subjectId ?? undefined);
    };

    const planLabel: React.ReactNode =
        user?.plan === 'premium' ? <><Crown size={14} /> Premium</>
            : user?.plan === 'pro' ? '⭐ Pro'
                : 'Free';

    const planClass =
        user?.plan === 'premium'
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/30 text-white'
            : user?.plan === 'pro'
                ? 'bg-gradient-to-r from-[#8957E5] to-[#A371F7] border-purple-400/30 text-white'
                : 'bg-white/5 border-white/10 text-[#555] hover:text-white hover:bg-white/10';

    const handleIAToggle = () => {
        if (isGuest) {
            openAuthModal('selection');
        } else {
            onToggleChat?.();
        }
    };

    // Mobile fullscreen search overlay
    if (searchExpanded) {
        return (
            <header
                className="glass border-b border-[rgba(255,255,255,0.08)] px-3 flex items-center gap-3 sticky top-0 z-[100] shadow-2xl"
                style={{ height: '60px' }}
            >
                <div className="relative flex-1">
                    <svg
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#444]"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Busca en tus notas..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-full py-2 pl-10 pr-9 text-[16px] font-medium focus:bg-[#1a1a1a] focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]/40 outline-none transition-all placeholder:text-[#444] text-[#fafafa]"
                        style={{ height: '40px' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#fafafa]"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <button
                    onClick={() => { setSearchExpanded(false); handleClearSearch(); }}
                    className="flex items-center justify-center rounded-xl text-[#555] hover:text-white transition-colors flex-shrink-0"
                    style={{ width: '44px', height: '44px' }}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>
        );
    }

    return (
        <header
            className="toolbar glass border-b border-[rgba(255,255,255,0.08)] px-3 sm:px-4 flex items-center justify-between sticky top-0 z-[100] shadow-2xl backdrop-blur-3xl"
            style={{ height: '60px' }}
        >
            {/* Left: hamburger (mobile/tablet) + logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Hamburger — shown on mobile & tablet when sidebar is not always visible */}
                <button
                    onClick={onToggleLeftSidebar}
                    className="desktop:hidden flex items-center justify-center rounded-xl text-[#555] hover:text-white hover:bg-white/10 transition-all"
                    style={{ width: '44px', height: '44px' }}
                    aria-label="Abrir menú"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div
                    className="flex items-center cursor-pointer flex-shrink-0"
                    onClick={() => navigate('/dashboard')}
                >
                    <span className="text-xl font-bold tracking-tight font-display flex items-center gap-2">
                        <BetaLogo className="w-6 h-6 rounded-md shadow-sm" />
                        <span className="text-white">Beta3M</span>
                    </span>
                </div>
            </div>

            {/* Center: search */}
            {/* Mobile: hidden (replaced by icon button) */}
            {/* Tablet: 50% width */}
            {/* Desktop: max-w-xl */}
            <div className="hidden mobile:hidden tablet:flex tablet:w-1/2 desktop:flex desktop:flex-1 desktop:max-w-xl mx-3 sm:mx-6">
                <div className="relative w-full">
                    <svg
                        className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#444]"
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
                        className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-full py-2.5 pl-11 pr-9 text-[15px] font-medium focus:bg-[#1a1a1a] focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]/40 outline-none transition-all placeholder:text-[#444] text-[#fafafa]"
                        style={{ height: '40px' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#fafafa] transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Search icon — mobile only */}
                <button
                    onClick={() => setSearchExpanded(true)}
                    className="mobile:flex hidden items-center justify-center rounded-xl text-[#555] hover:text-white hover:bg-white/10 transition-all"
                    style={{ width: '44px', height: '44px' }}
                    aria-label="Buscar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>

                {/* Connection / sync indicator */}
                {!isOnline ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                        <span className="text-red-400 text-xs font-medium hidden sm:block">Desconectado</span>
                    </div>
                ) : isSaving ? (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <span className="text-amber-400 text-xs font-medium hidden sm:block">Sincronizando</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-emerald-400 text-xs font-medium hidden sm:block">Conectado</span>
                    </div>
                )}

                {/* IA button — tablet: icon + "IA" text / desktop: icon + "IA" text */}
                <button
                    onClick={handleIAToggle}
                    className={`flex items-center gap-1.5 px-3 rounded-xl border text-[13px] font-semibold transition-all duration-200
                        ${chatOpen
                            ? 'bg-[#A371F7] text-white border-[#A371F7] shadow-[0_0_16px_rgba(163,113,247,0.4)]'
                            : 'bg-[rgba(163,113,247,0.1)] border-[rgba(163,113,247,0.2)] text-[#A371F7] hover:bg-[rgba(163,113,247,0.2)]'
                        }`}
                    style={{ height: '44px', minWidth: '44px' }}
                    title="Asistente IA"
                >
                    <Sparkles size={14} />
                    {/* Show "IA" text on tablet and desktop */}
                    <span className="hidden tablet:inline desktop:inline text-sm">IA</span>
                </button>

                {/* Plan badge */}
                {!isGuest && (
                    <button
                        onClick={() => navigate('/plans')}
                        className={`hidden sm:flex px-2.5 rounded-full text-[12px] font-semibold transition-all border shadow-sm items-center ${planClass}`}
                        style={{ height: '36px' }}
                    >
                        {planLabel}
                    </button>
                )}

                {/* Avatar + User dropdown */}
                <div className="relative">
                    <button
                        onClick={isGuest ? () => openAuthModal('login') : () => setShowUserMenu(v => !v)}
                        className="flex items-center gap-2 cursor-pointer group rounded-xl hover:bg-white/5 px-2 transition-all"
                        style={{ height: '44px' }}
                    >
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-sm font-semibold text-[#fafafa] leading-none group-hover:text-[#3b82f6] transition-colors">
                                {isGuest ? 'Modo Invitado' : (user?.display_name || user?.email?.split('@')[0])}
                            </span>
                            <span className="text-[11px] text-[#444] mt-0.5">{isGuest ? 'Sin cuenta' : user?.email}</span>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-[#111] to-[#1a1a1a] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#fafafa] font-bold flex-shrink-0 overflow-hidden group-hover:border-[#3b82f6]/30 transition-all w-9 h-9">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm">{isGuest ? '?' : (user?.email?.[0]?.toUpperCase() ?? '?')}</span>
                            )}
                        </div>
                    </button>

                    {showUserMenu && !isGuest && (
                        <>
                            <div className="fixed inset-0 z-[190]" onClick={() => setShowUserMenu(false)} />
                            <div className="absolute right-0 top-full mt-2 z-[191] bg-[#111] border border-[#1a1a1a] rounded-xl shadow-2xl py-1 min-w-[200px]">
                                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                                    <p className="text-[13px] font-semibold text-[#fafafa] truncate">{user?.display_name || user?.email?.split('@')[0]}</p>
                                    <p className="text-[11px] text-[#444] truncate mt-0.5">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => { navigate('/perfil'); setShowUserMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#fafafa] hover:bg-[#1a1a1a] transition-colors text-left"
                                >
                                    <Settings size={14} className="text-[#555]" /> Configuración
                                </button>
                                <div className="h-px bg-[#1a1a1a] my-1" />
                                <button
                                    onClick={() => { handleLogout(); setShowUserMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                >
                                    <LogOut size={14} /> Cerrar sesión
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
