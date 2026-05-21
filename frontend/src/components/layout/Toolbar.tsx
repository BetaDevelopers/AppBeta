import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import { useUIStore } from '../../store/uiStore';
import { Crown, Sparkles } from 'lucide-react';

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
        user?.plan === 'premium' ? <><Crown size={14}/> Premium</>
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
                            d={leftSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </button>

                <div
                    className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
                    onClick={() => navigate('/dashboard')}
                >
                    <div className="w-8 h-8 btn-premium rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                        <span className="text-white font-bold text-xs tracking-tighter">3M</span>
                    </div>
                    <span className="text-base font-bold text-white tracking-tight font-display hidden sm:block">
                        BETA 3M
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

                {/* Saving indicator */}
                {isSaving && (
                    <div className="flex items-center gap-2 bg-[#3b82f6]/10 px-2.5 py-1 rounded-full border border-[#3b82f6]/20">
                        <div className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-pulse" />
                        <span className="text-[#3b82f6] text-xs font-medium hidden sm:block">Guardando</span>
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
                    <Sparkles size={14}/>
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

                {/* Avatar */}
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/perfil')}
                >
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-sm font-semibold text-[#fafafa] leading-none group-hover:text-[#3b82f6] transition-colors">
                            {isGuest ? 'Modo Invitado' : (user?.display_name || user?.email?.split('@')[0])}
                        </span>
                        <span className="text-[11px] text-[#444] mt-0.5">{isGuest ? 'Sin cuenta' : 'Estudiante'}</span>
                    </div>
                    {/* Avatar size: 40px on mobile, 44px on tablet+ */}
                    <div
                        className="rounded-xl bg-gradient-to-br from-[#111] to-[#1a1a1a] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#fafafa] font-bold flex-shrink-0 overflow-hidden group-hover:border-[#3b82f6]/30 transition-all mobile:w-10 mobile:h-10 tablet:w-11 tablet:h-11 w-9 h-9"
                    >
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm">{user?.email?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                </div>

                {/* Logout / Login */}
                <button
                    onClick={isGuest ? () => openAuthModal('login') : handleLogout}
                    className="flex items-center justify-center rounded-xl text-[#444] hover:text-[#F78166] hover:bg-[rgba(247,129,102,0.1)] transition-all border border-transparent hover:border-[rgba(247,129,102,0.15)]"
                    style={{ width: '44px', height: '44px' }}
                    title={isGuest ? 'Iniciar sesión' : 'Cerrar sesión'}
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
