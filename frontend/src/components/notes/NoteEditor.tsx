import React, { useState, useEffect, useRef } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import RichEditor from './RichEditor';
import { SlashCommandList } from './SlashCommands';

export const NoteEditor: React.FC = () => {
    const { currentNote, updateNote, deleteNote, setCurrentNote, improveWithAI, summarizeWithAI, isSaving } = useNotesStore();
    const [title, setTitle] = useState(currentNote?.title || '');
    const [content, setContent] = useState(currentNote?.content || '');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiModal, setAiModal] = useState<{ isOpen: boolean; title: string; text: string; mode: 'improve' | 'summarize' }>({
        isOpen: false,
        title: '',
        text: '',
        mode: 'improve',
    });
    const [aiLoading, setAiLoading] = useState(false);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
            setContent(currentNote.content);
        }
    }, [currentNote?.id]);

    useEffect(() => {
        if (!currentNote) return;
        if (title === currentNote.title && content === currentNote.content) return;

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            updateNote(currentNote.id, { title, content });
        }, 2000);

        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    }, [title, content]);

    const handleOptimize = async () => {
        // Escollir HTML ràpidament
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 20) return;

        setAiLoading(true);
        setError(null);

        try {
            const improved = await improveWithAI(plainText);
            setIsTypingAI(true);

            // Animació: esborra i vull escriure
            setContent('');
            await new Promise(r => setTimeout(r, 150));

            const words = improved.split(' ');
            let current = '';

            for (let i = 0; i < words.length; i++) {
                current += (i === 0 ? '' : ' ') + words[i];
                setContent(current);
                const delay = words[i].length > 6 ? 35 : words[i].endsWith('.') ? 80 : 25;
                await new Promise(r => setTimeout(r, delay));
            }

            setIsTypingAI(false);
            await updateNote(currentNote!.id, { content: current, ai_processed: true });
        } catch (err: any) {
            setIsTypingAI(false);
            setError('Error al connectar amb la IA. Comprova la clau API.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
        }
    };

    const handleSummarize = async () => {
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 20) return;
        setAiLoading(true);
        try {
            const result = await summarizeWithAI(plainText);
            setAiModal({ isOpen: true, title: 'Resum Intel·ligent', text: result, mode: 'summarize' });
        } catch (err: any) {
            setError('Error al generar resum.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
        }
    };

    const handleApplyAI = () => {
        if (aiModal.mode === 'improve') {
            setContent(aiModal.text);
            updateNote(currentNote!.id, { content: aiModal.text, ai_processed: true });
        }
        setAiModal({ ...aiModal, isOpen: false });
    };

    const handleDelete = async () => {
        if (currentNote) {
            await deleteNote(currentNote.id);
            setCurrentNote(null);
        }
        setShowDeleteModal(false);
    };

    if (!currentNote) return null;

    return (
        <div className="flex flex-col h-full bg-[#0a0f1e] relative">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0a0f1e] sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentNote(null)} className="p-3 bg-[#0f172a] border border-white/5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    {currentNote.subject_name && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-xl">
                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ backgroundColor: currentNote.subject_color }} />
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{currentNote.subject_name}</span>
                        </div>
                    )}
                </div>
                <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 p-3 bg-[#0f172a] border border-white/5" onClick={() => setShowDeleteModal(true)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-12 max-w-5xl mx-auto w-full scrollbar-hide">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-5xl font-black border-none outline-none bg-transparent placeholder:text-slate-800 text-white tracking-tighter leading-tight mb-8"
                    placeholder="Título de la nota..."
                />
                <div className="h-1 bg-blue-600 w-24 mb-12 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />

                <RichEditor
                    content={content}
                    onChange={setContent}
                    isTypingAI={isTypingAI}
                />
            </div>

            {error && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50
                      bg-red-500/20 border border-red-500/30 rounded-2xl
                      px-6 py-4 text-sm text-red-200 whitespace-nowrap
                      animate-fade-in-up font-bold shadow-2xl backdrop-blur-md">
                    ⚠ {error}
                </div>
            )}

            <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#0f172a] m-6 rounded-3xl border border-white/5 shadow-2xl glass-effect">
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        className="gap-3 h-12 px-6"
                        onClick={handleOptimize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                    >
                        {aiLoading ? <Spinner size="sm" className="text-white" /> : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        )}
                        <span className="font-black text-sm uppercase tracking-wide">{aiLoading ? 'Optimizando...' : 'Optimizar'}</span>
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-3 h-12 px-6"
                        onClick={handleSummarize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                    >
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-black text-sm uppercase tracking-wide">Resumen</span>
                    </Button>

                    <button
                        onClick={() => setShowBlockMenu(true)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl
                       border border-white/5 bg-white/5 text-slate-400 hover:text-white
                       hover:bg-white/10 transition-all text-xl font-bold"
                        title="Insertar bloque (+)"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center gap-4 pr-3">
                    {isTypingAI && (
                        <div className="flex items-center gap-3 text-blue-400 animate-pulse text-xs font-black uppercase tracking-widest">
                            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            IA escribiendo...
                        </div>
                    )}
                    {!isTypingAI && (
                        isSaving ? (
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                                <Spinner size="xs" className="text-blue-500" /> Sincronizando
                            </div>
                        ) : (
                            <div className="text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                Sincronitzat ✓
                            </div>
                        )
                    )}
                </div>
            </div>

            <Modal
                isOpen={aiModal.isOpen}
                onClose={() => setAiModal({ ...aiModal, isOpen: false })}
                title={aiModal.title}
            >
                <div className="space-y-6">
                    <div className="p-6 bg-[#0a0f1e] rounded-2xl border border-white/5 text-slate-300 text-lg leading-relaxed max-h-[500px] overflow-y-auto font-medium scrollbar-hide">
                        {aiModal.text}
                    </div>
                    <div className="flex gap-4 justify-end pt-2">
                        <Button variant="secondary" className="px-8" onClick={() => setAiModal({ ...aiModal, isOpen: false })}>
                            {aiModal.mode === 'improve' ? 'Descartar' : 'Cerrar'}
                        </Button>
                        {aiModal.mode === 'improve' ? (
                            <Button className="px-8" onClick={handleApplyAI}>Aplicar</Button>
                        ) : (
                            <Button className="px-8" onClick={() => {
                                navigator.clipboard.writeText(aiModal.text);
                            }}>Copiar</Button>
                        )}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar nota">
                <p className="text-slate-400 mb-8 font-medium text-lg leading-relaxed">¿Estás completamente seguro de querer eliminar esta nota? Esta acción es irreversible y se perderán todos los datos.</p>
                <div className="flex gap-4 justify-end">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
                    <Button variant="danger" className="flex-1" onClick={handleDelete}>Eliminar permanentemente</Button>
                </div>
            </Modal>

            <Modal isOpen={showBlockMenu} onClose={() => setShowBlockMenu(false)} title="Insertar bloque">
                <div className="w-full">
                    <SlashCommandList
                        command={(item: any) => {
                            // Com que RichEditor no exposa l'editor directament d'una manera fàcil aquí
                            // Podríem usar un hack d'event o simplement dir a l'usuari que usi la toolbar
                            // Però per ara, mostrem la llista de comandos com a informació o botons ràpids.
                            // Realment per Tiptap, el menú flotant ja és prou bo.
                            setShowBlockMenu(false);
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
};
