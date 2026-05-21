import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { useSubjectsStore } from '../../store/subjectsStore';
import { useAuthStore } from '../../store/authStore';
import { BASE_URL } from '../../api/client';
import { Clipboard, Brain, Search, Pencil, MessageSquare, BookOpen, Check, AlertTriangle } from 'lucide-react';

// ── Tipus ────────────────────────────────────────────────────
type ContextScope = 'current' | 'subject' | 'all';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'separator';
    content: string;
}

interface ChatWidgetProps {
    open: boolean;
    onClose: () => void;
}

// ── Accions ràpides ──────────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: <Clipboard size={14}/>, label: 'Resumen',    prompt: 'Hazme un resumen estructurado de esta nota.' },
    { icon: <Brain size={14}/>,     label: 'Preguntas',  prompt: 'Genera 5 preguntas de examen sobre este contenido con las respuestas.' },
    { icon: <Search size={14}/>,    label: 'Explica',    prompt: 'Explica los conceptos principales de esta nota de forma clara.' },
    { icon: <Pencil size={14}/>,    label: 'Mejora',     prompt: 'Sugiere cómo mejorar la estructura y claridad de esta nota.' },
];

// ── Helpers ──────────────────────────────────────────────────
function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

// ── Component ─────────────────────────────────────────────────
export default function ChatWidget({ open, onClose }: ChatWidgetProps) {
    const { currentNote, notes } = useNotesStore();
    const { subjects } = useSubjectsStore();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [contextScope, setContextScope] = useState<ContextScope>('current');
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const prevNoteIdRef = useRef<number | null>(null);

    // Missatge de benvinguda inicial
    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{
                id: uid(),
                role: 'assistant',
                content: currentNote
                    ? `¡Hola! Tengo el contexto de la nota **"${currentNote.title || 'Sin título'}"**. ¿En qué puedo ayudarte?`
                    : '¡Hola! Soy tu asistente de estudio. Abre una nota para tener contexto, o pregúntame lo que necesites.',
            }]);
        }
    }, [open]);

    // Detectar canvi de nota → separador
    useEffect(() => {
        if (!open) return;
        const newId = currentNote?.id ?? null;
        if (prevNoteIdRef.current !== null && prevNoteIdRef.current !== newId) {
            const title = currentNote?.title || 'Sense títol';
            setMessages(prev => [
                ...prev,
                { id: uid(), role: 'separator', content: `── Nota cambiada: ${title} ──` },
                { id: uid(), role: 'assistant', content: `He cargado la nota **"${title}"**. Puedes preguntarme cualquier cosa sobre ella.` },
            ]);
            setContextScope('current');
        }
        prevNoteIdRef.current = newId ?? null;
    }, [currentNote?.id, open]);

    // Scroll al final quan arriben missatges nous
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Focus a l'input quan s'obre
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    // ── Construir context ─────────────────────────────────────
    const buildContext = useCallback((): string => {
        if (contextScope === 'current') {
            if (!currentNote) return '';
            const plain = stripHtml(currentNote.content).substring(0, 3000);
            return `Título: ${currentNote.title || 'Sin título'}\n\n${plain}`;
        }

        if (contextScope === 'subject') {
            if (!currentNote) return '';
            const subjectNotes = notes
                .filter(n => n.subject_id === currentNote.subject_id)
                .slice(0, 5);
            const subjectName = subjects.find(s => s.id === currentNote.subject_id)?.name || 'Asignatura';
            return `Asignatura: ${subjectName}\n\n` + subjectNotes
                .map(n => `## ${n.title || 'Sin título'}\n${stripHtml(n.content).substring(0, 600)}`)
                .join('\n\n---\n\n');
        }

        // 'all'
        return notes.slice(0, 10)
            .map(n => `## ${n.title || 'Sin título'}\n${stripHtml(n.content).substring(0, 300)}`)
            .join('\n\n---\n\n');
    }, [contextScope, currentNote, notes, subjects]);

    // ── Enviar missatge ───────────────────────────────────────
    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;

        setInput('');
        setError(null);

        const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        // Construir historial per al backend (sols role user/assistant)
        const history = [...messages, userMsg]
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 30_000);

        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ messages: history, context: buildContext(), note_id: currentNote?.id ?? null }),
                signal: abortRef.current.signal,
            });

            if (res.status === 401) { useAuthStore.getState().logout(); return; }
            if (res.status === 403) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Pla insuficient per usar la IA');
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Error del servidor');
            }

            const data = await res.json();
            setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: data.reply }]);
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setError('Temps d\'espera esgotat. Torna-ho a intentar.');
            } else {
                setError(e.message || 'Error desconegut');
            }
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }, [loading, messages, buildContext]);

    // Enviar amb Enter (Shift+Enter = salt de línia)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(input);
        }
    };

    const copyMessage = async (msg: ChatMessage) => {
        await navigator.clipboard.writeText(msg.content);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const clearChat = () => {
        setMessages([{
            id: uid(),
            role: 'assistant',
            content: currentNote
                ? `Conversación reiniciada. Tengo el contexto de **"${currentNote.title || 'Sin título'}"**.`
                : 'Conversación reiniciada. Pregúntame lo que necesites.',
        }]);
        setError(null);
    };

    // ── Context scope label ───────────────────────────────────
    const subjectName = subjects.find(s => s.id === currentNote?.subject_id)?.name;
    const scopeOptions: { value: ContextScope; label: string }[] = [
        { value: 'current', label: 'Nota actual' },
        { value: 'subject', label: subjectName ? `Asignatura: ${subjectName}` : 'Asignatura' },
        { value: 'all',     label: 'Todas las notas' },
    ];

    if (!open) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-[500] flex flex-col w-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
            style={{ height: '520px', background: '#0d1322' }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0f1e] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare size={14}/>
                    <span className="text-sm font-semibold text-white">Asistente IA</span>
                    {loading && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={clearChat}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
                        title="Limpiar conversación"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
                        title="Cerrar"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Selector de context ── */}
            <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
                <select
                    value={contextScope}
                    onChange={e => setContextScope(e.target.value as ContextScope)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 outline-none focus:border-blue-500/40 focus:text-slate-200 transition-all cursor-pointer"
                >
                    {scopeOptions.map(o => (
                        <option key={o.value} value={o.value} className="bg-[#0d1322] text-slate-200">
                            Context: {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* ── Historial ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-hide">
                {messages.map(msg => {
                    if (msg.role === 'separator') {
                        return (
                            <div key={msg.id} className="flex items-center gap-2 py-1">
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[10px] text-slate-700 whitespace-nowrap">{msg.content}</span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>
                        );
                    }

                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
                            <div
                                className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                                    isUser
                                        ? 'bg-blue-600/20 text-blue-100 rounded-br-sm'
                                        : 'bg-white/5 text-slate-200 rounded-bl-sm'
                                }`}
                            >
                                <MarkdownText text={msg.content} />
                            </div>
                            {!isUser && (
                                <button
                                    onClick={() => copyMessage(msg)}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-700 hover:text-slate-400 transition-all"
                                    title="Copiar respuesta"
                                >
                                    {copiedId === msg.id ? (
                                        <><Check size={14}/><span>Copiado</span></>
                                    ) : (
                                        <><Clipboard size={14}/><span>Copiar</span></>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Spinner mentre carrega */}
                {loading && (
                    <div className="flex items-start gap-2">
                        <div className="bg-white/5 rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-2">
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                                        style={{ animationDelay: `${i * 150}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-[11px] text-red-300 flex items-center gap-1">
                        <AlertTriangle size={14}/> {error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* ── Accions ràpides ── */}
            <div className="px-3 py-2 border-t border-white/5 flex gap-1.5 flex-wrap flex-shrink-0">
                {QUICK_ACTIONS.map(a => (
                    <button
                        key={a.label}
                        onClick={() => send(a.prompt)}
                        disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border border-white/5 bg-white/[0.03] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 transition-all disabled:opacity-30"
                    >
                        <span>{a.icon}</span>
                        <span>{a.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Input ── */}
            <div className="px-3 pb-3 pt-2 flex items-end gap-2 flex-shrink-0">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    disabled={loading}
                    rows={1}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-500/40 transition-all resize-none scrollbar-hide disabled:opacity-50"
                    style={{ maxHeight: '80px', overflowY: 'auto' }}
                    onInput={e => {
                        const t = e.target as HTMLTextAreaElement;
                        t.style.height = 'auto';
                        t.style.height = Math.min(t.scrollHeight, 80) + 'px';
                    }}
                />
                <button
                    onClick={() => send(input)}
                    disabled={loading || !input.trim()}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Enviar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// ── Renderitzador de markdown bàsic ──────────────────────────
function MarkdownText({ text }: { text: string }) {
    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                // Capçaleres
                if (line.startsWith('### ')) return <div key={i} className="font-bold text-slate-100 mt-1">{renderInline(line.slice(4))}</div>;
                if (line.startsWith('## '))  return <div key={i} className="font-bold text-slate-100 mt-1.5">{renderInline(line.slice(3))}</div>;
                if (line.startsWith('# '))   return <div key={i} className="font-bold text-white mt-2">{renderInline(line.slice(2))}</div>;
                // Llistes
                if (line.startsWith('- ') || line.startsWith('• ')) {
                    return <div key={i} className="flex gap-1.5 mt-0.5"><span className="text-slate-500 flex-shrink-0">·</span><span>{renderInline(line.slice(2))}</span></div>;
                }
                // Línia buida
                if (line.trim() === '') return <div key={i} className="h-1.5" />;
                // Paràgraf normal
                return <div key={i}>{renderInline(line)}</div>;
            })}
        </>
    );
}

function renderInline(text: string): React.ReactNode {
    // **negreta**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} className="text-slate-100 font-semibold">{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>
    );
}
