import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import { useUIStore } from '../../store/uiStore';
import { Crown, Sparkles } from 'lucide-react';
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
    const { user, isGuest } = useAuthStore();
    const { isSaving } = useNotesStore();
    const openAuthModal = useUIStore((s) => s.openAuthModal);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchExpanded, setSearchExpanded] = useState(false);
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
            : user?.plan === 'pro' ? <><Crown size={13} /> Pro</>
                : <>Gratis &rarr;</>;

    const planClass =
        user?.plan === 'premium'
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/30 text-white shadow-[0_0_16px_rgba(245,158,11,0.35)]'
            : user?.plan === 'pro'
                ? 'bg-gradient-to-r from-[#8957E5] to-[#A371F7] border-purple-400/30 text-white shadow-[0_0_16px_rgba(163,113,247,0.35)]'
                : 'bg-gradient-to-r from-[rgba(59,130,246,0.12)] to-[rgba(99,102,241,0.12)] border-[rgba(99,102,241,0.35)] text-[#818CF8] hover:text-white hover:from-[rgba(59,130,246,0.25)] hover:to-[rgba(99,102,241,0.25)] hover:shadow-[0_0_14px_rgba(99,102,241,0.3)]';

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
            {/* Left: hamburger (mobile/tablet) + logo + name */}
            <div className="flex items-center gap-2 flex-shrink-0">
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
                <BetaLogo className="w-7 h-7 rounded-lg flex-shrink-0" />
                <span className="text-[15px] font-bold text-[#fafafa] tracking-tight hidden sm:block">Beta3M</span>
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
                {/* Search icon — mobile only (below tablet breakpoint) */}
                <button
                    onClick={() => setSearchExpanded(true)}
                    className="flex tablet:hidden items-center justify-center rounded-xl text-[#555] hover:text-white hover:bg-white/10 transition-all"
                    style={{ width: '44px', height: '44px' }}
                    aria-label="Buscar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>

                {/* Connection / sync indicator — only show on problem states */}
                {!isOnline && (
                    <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                        <span className="text-red-400 text-xs font-medium hidden sm:block">Desconectado</span>
                    </div>
                )}
                {isOnline && isSaving && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <span className="text-amber-400 text-xs font-medium hidden sm:block">Sincronizando</span>
                    </div>
                )}

                {/* IA button */}
                <button
                    onClick={handleIAToggle}
                    className={`flex items-center justify-center rounded-xl border transition-all duration-200
                        ${chatOpen
                            ? 'bg-gradient-to-r from-[#7C3AED] to-[#A371F7] text-white border-[#A371F7]/40 shadow-[0_0_22px_rgba(163,113,247,0.55)]'
                            : 'bg-gradient-to-br from-[rgba(124,58,237,0.18)] to-[rgba(163,113,247,0.22)] border-[rgba(163,113,247,0.45)] text-[#C084FC] hover:text-white hover:from-[rgba(124,58,237,0.38)] hover:to-[rgba(163,113,247,0.42)] hover:shadow-[0_0_20px_rgba(163,113,247,0.4)] shadow-[0_0_12px_rgba(163,113,247,0.18)]'
                        }`}
                    style={{ height: '44px', width: '44px' }}
                    title="Asistente IA"
                >
                    <Sparkles size={20} className={chatOpen ? '' : 'animate-pulse'} />
                </button>

                {/* Plan badge */}
                {!isGuest && (
                    <button
                        onClick={() => navigate('/plans')}
                        className={`flex items-center gap-1.5 px-3 rounded-full text-[12px] font-bold transition-all border ${planClass}`}
                        style={{ height: '36px' }}
                    >
                        {planLabel}
                    </button>
                )}

                {/* Avatar — click navigates to settings */}
                <button
                    onClick={isGuest ? () => openAuthModal('login') : () => navigate('/perfil')}
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
            </div>
        </header>
    );
};
