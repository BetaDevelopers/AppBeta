import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';

interface ToolbarProps {
    onToggleChat?: () => void;
    chatOpen?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onToggleChat, chatOpen }) => {
    const { user, logout } = useAuthStore();
    const { isSaving, searchNotes, fetchNotes } = useNotesStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        if (q.trim()) {
            await searchNotes(q);
        } else {
            await fetchNotes();
        }
    };

    const planLabel =
        user?.plan === 'premium' ? '👑 Premium'
        : user?.plan === 'pro'     ? '⭐ Pro'
        : 'Free';

    const planClass =
        user?.plan === 'premium'
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/30 text-white'
            : user?.plan === 'pro'
                ? 'bg-gradient-to-r from-[#8957E5] to-[#A371F7] border-purple-400/30 text-white'
                : 'bg-white/5 border-white/10 text-[#8B949E] hover:text-white hover:bg-white/10';

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
                        onChange={handleSearch}
                        className="w-full bg-[#21262D] border border-[rgba(255,255,255,0.08)] rounded-full py-2.5 pl-11 pr-4 text-[15px] font-medium focus:bg-[#2D333B] focus:ring-2 focus:ring-[#388BFD]/30 focus:border-[#388BFD]/40 outline-none transition-all placeholder:text-[#484F58] text-[#E6EDF3]"
                        style={{ height: '40px' }}
                    />
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
                    onClick={onToggleChat}
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

                {/* Plan badge */}
                <button
                    onClick={() => navigate('/plans')}
                    className={`px-3 rounded-full text-[13px] font-semibold transition-all border shadow-sm ${planClass}`}
                    style={{ height: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
                >
                    {planLabel}
                </button>

                {/* Avatar */}
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => navigate('/perfil')}
                >
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-sm font-semibold text-[#E6EDF3] leading-none group-hover:text-[#388BFD] transition-colors">
                            {user?.display_name || user?.email?.split('@')[0]}
                        </span>
                        <span className="text-[11px] text-[#484F58] mt-0.5">Estudiant</span>
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

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center rounded-xl text-[#484F58] hover:text-[#F78166] hover:bg-[rgba(247,129,102,0.1)] transition-all border border-transparent hover:border-[rgba(247,129,102,0.15)]"
                    style={{ width: 'var(--touch-target)', height: 'var(--touch-target)' }}
                    title="Tancar sessió"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    );
};
