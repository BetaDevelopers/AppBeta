import React, { useState, useMemo } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { NoteCard } from './NoteCard';
import { apiClient } from '../../api/client';
import { Search, Sparkles, X, Camera, Sigma } from 'lucide-react';

export const NoteList: React.FC = () => {
    const { notes, createNote, activeSubjectId } = useNotesStore();
    const [query, setQuery] = useState('');
    const [aiResults, setAiResults] = useState<number[] | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const filteredNotes = useMemo(() => {
        if (aiResults !== null) return notes.filter(n => aiResults.includes(n.id));
        if (!query.trim()) return notes;
        const q = query.toLowerCase();
        return notes.filter(n =>
            n.title?.toLowerCase().includes(q) ||
            n.content?.replace(/<[^>]*>/g, '').toLowerCase().includes(q)
        );
    }, [notes, query, aiResults]);

    const handleAiSearch = async () => {
        if (!query.trim() || notes.length === 0) return;
        setAiLoading(true);
        setAiResults(null);
        try {
            const summaries = notes.map(n => ({
                id: n.id,
                title: n.title || 'Sin título',
                snippet: n.content?.replace(/<[^>]*>/g, '').substring(0, 200) ?? '',
            }));
            const res = await apiClient.post<{ reply: string }>('/ai/chat', {
                messages: [{
                    role: 'user',
                    content: `Busca en las siguientes notas las más relevantes para la consulta: "${query}".
Responde SOLO con un array JSON de IDs numéricos ordenados por relevancia (máx 5): [1, 3, ...]
Si ninguna es relevante, responde: []
Notas:
${JSON.stringify(summaries)}`,
                }],
            });
            const match = (res.reply || '').match(/\[[\d,\s]*\]/);
            if (match) setAiResults(JSON.parse(match[0]));
        } catch { /* fallback to text search */ }
        finally { setAiLoading(false); }
    };

    const clearSearch = () => { setQuery(''); setAiResults(null); };

    const handleCreateNote = async () => {
        await createNote();
    };

    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#000]">
                {/* Icon */}
                <div
                    className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] flex items-center justify-center mb-8 shadow-2xl"
                    style={{ width: '88px', height: '88px' }}
                >
                    <svg className="w-10 h-10 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </div>

                {/* Text */}
                <div className="text-center max-w-sm mb-8">
                    <h2
                        className="font-bold text-[#fafafa] mb-3 tracking-tight font-display"
                        style={{ fontSize: 'var(--font-size-2xl)' }}
                    >
                        {activeSubjectId ? 'Sin notas en esta asignatura' : 'Escribe tu primera nota'}
                    </h2>
                    <p
                        className="text-[#555]"
                        style={{ fontSize: 'var(--font-size-md)', lineHeight: 'var(--line-height-relaxed)' }}
                    >
                        {activeSubjectId
                            ? 'Crea una nota para empezar a organizar esta asignatura.'
                            : 'Digitaliza tus apuntes con IA y organiza tu conocimiento de forma profesional.'}
                    </p>
                </div>

                {/* CTA */}
                <button
                    onClick={handleCreateNote}
                    className="relative overflow-hidden rounded-[var(--border-radius-xl)] shadow-xl shadow-blue-500/20 flex items-center gap-3 px-8 text-white font-semibold transition-all duration-150 active:scale-95 hover:shadow-blue-500/40"
                    style={{
                        height: 'var(--touch-target-lg)',
                        fontSize: 'var(--font-size-md)',
                        background: 'linear-gradient(135deg, #1d6fee 0%, #3b82f6 100%)',
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#222,transparent_70%)]" />
                    <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative">Nueva nota inteligente</span>
                </button>

                {/* Feature hints */}
                <div className="flex items-center gap-6 mt-10 opacity-40">
                    {([
                        { icon: <Sparkles size={14} />, text: 'IA integrada' },
                        { icon: <Camera size={14} />,   text: 'Escaneo OCR' },
                        { icon: <Sigma size={14} />,    text: 'Matemáticas' },
                    ] as { icon: React.ReactNode; text: string }[]).map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-[#555]">
                            {icon}
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#000] scrollbar-hide">
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="font-bold text-[#fafafa] tracking-tight font-display" style={{ fontSize: 'var(--font-size-2xl)' }}>
                            Mis notas
                        </h2>
                        <p className="text-[#555] mt-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {filteredNotes.length}{filteredNotes.length !== notes.length ? ` de ${notes.length}` : ''} nota{notes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleCreateNote}
                        className="flex items-center gap-2 px-4 rounded-[var(--border-radius-lg)] bg-[#3b82f6] text-white font-semibold hover:bg-[#2f7be8] transition-all duration-150 active:scale-95 shadow-lg shadow-blue-500/20"
                        style={{ height: 'var(--touch-target)', fontSize: 'var(--font-size-sm)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva nota
                    </button>
                </div>

                {/* Search bar */}
                <div className="flex gap-2 mb-6">
                    <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3" style={{ height: '44px' }}>
                        <Search size={15} className="text-[#444] flex-shrink-0" />
                        <input
                            value={query}
                            onChange={e => { setQuery(e.target.value); setAiResults(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleAiSearch(); }}
                            placeholder="Buscar notas..."
                            className="flex-1 bg-transparent outline-none text-[#fafafa] placeholder:text-[#444] text-sm"
                        />
                        {query && (
                            <button onClick={clearSearch} className="text-[#444] hover:text-[#fafafa] transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleAiSearch}
                        disabled={!query.trim() || aiLoading}
                        title="Búsqueda semántica con IA"
                        className="flex items-center gap-1.5 px-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] text-[#444] hover:text-[#3b82f6] hover:border-[rgba(56,139,253,0.3)] disabled:opacity-30 transition-all"
                        style={{ height: '44px' }}
                    >
                        {aiLoading
                            ? <span className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                            : <Sparkles size={15} />
                        }
                        <span className="text-xs font-semibold hidden sm:block">IA</span>
                    </button>
                </div>

                {/* AI search badge */}
                {aiResults !== null && (
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <span className="text-xs text-blue-400 font-semibold flex items-center gap-1"><Sparkles size={12} /> Resultados IA</span>
                        <button onClick={clearSearch} className="text-xs text-[#444] hover:text-[#fafafa] underline">Limpiar</button>
                    </div>
                )}

                {/* Notes grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredNotes.length === 0 && query ? (
                        <div className="col-span-2 text-center py-12 text-[#444] text-sm">
                            Sin resultados para "{query}"
                        </div>
                    ) : filteredNotes.map((n, i) => (
                        <div key={n.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}>
                            <NoteCard note={n} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
