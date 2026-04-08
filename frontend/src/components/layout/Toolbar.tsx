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

    return (
        <header className="h-16 bg-[#0f172a] border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-[100] shadow-2xl">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/5">
                    <span className="text-white font-black text-sm uppercase tracking-tighter">3M</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-black text-white tracking-widest uppercase">Beta 3M</h1>
                    <div className="h-1 bg-blue-600 w-full rounded-full opacity-50" />
                </div>
            </div>

            <div className="flex-1 max-w-xl mx-12">
                <div className="relative group">
                    <svg
                        className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-all duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Busca en tus notas..."
                        onChange={handleSearch}
                        className="w-full bg-[#0a0f1e] border border-white/5 rounded-2xl py-3 pl-14 pr-6 text-sm font-bold focus:bg-white/[0.02] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-700 text-slate-200"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                {isSaving && (
                    <div className="flex items-center gap-3 bg-blue-500/5 px-4 py-2 rounded-xl border border-blue-500/10 animate-pulse">
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        <span className="text-blue-400 text-[10px] font-medium">Sincronitzant</span>
                    </div>
                )}

                <div className="flex items-center gap-3 border-l border-white/5 pl-6">
                    {/* Botó IA — xatbot */}
                    <button
                        onClick={onToggleChat}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors
                            ${chatOpen
                                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
                                : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                            }`}
                        title="Assistent IA d'estudi"
                    >
                        <span>💬</span>
                        <span className="hidden sm:inline">IA</span>
                    </button>

                    <button
                        onClick={() => navigate('/plans')}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border
                            ${user?.plan === 'premium'
                                ? 'bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-600/20'
                                : user?.plan === 'pro'
                                    ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                                    : 'bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20'
                            }`}
                    >
                        {user?.plan === 'premium' ? '👑 Premium' : user?.plan === 'pro' ? '⭐ Pro' : 'Free'}
                    </button>

                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-black text-white leading-none mb-1 truncate max-w-[120px]">
                            {user?.email}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600">Membre</span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20
                          flex items-center justify-center text-blue-400 text-sm font-black
                          flex-shrink-0 shadow-inner">
                        {user?.email?.[0]?.toUpperCase()}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600
                       hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/10"
                        title="Cerrar sesión"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};
