import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import RichEditor from './RichEditor';
import DrawingCanvas from './DrawingCanvas';
import MathVisionOCR from './MathVisionOCR';
import DataVisionOCR from './DataVisionOCR';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useMathOCR, MathRegion } from '@/features/ai/hooks/useMathOCR';
import { markdownToHtml } from '../../utils/editorUtils';
import { useSubjectsStore } from '../../store/subjectsStore';
import { Pencil, Camera, Sparkles, FileText, Sigma, BarChart2, GitBranch, Triangle, Target, Check } from 'lucide-react';

// ── Definit FORA de NoteEditor per evitar desmuntatge en cada re-render ──
function ToolBtn({ onClick, disabled, title, accent, children }: {
    onClick: () => void; disabled?: boolean; title?: string; accent?: boolean; children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-[10px] text-[10px] font-medium transition-all duration-150 active:scale-95 disabled:opacity-25 w-full border
                ${accent
                    ? 'bg-blue-600/20 border-blue-500/20 text-blue-300 hover:bg-blue-600/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                    : 'bg-white/[0.04] border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                }`}
        >
            {children}
        </button>
    );
}

export const NoteEditor: React.FC = () => {
    const { currentNote, updateNote, deleteNote, setCurrentNote, improveWithAI, summarizeWithAI, suggestSubjectWithAI, isSaving } = useNotesStore();
    const { subjects } = useSubjectsStore();
    const [title, setTitle] = useState(currentNote?.title || '');
    const [content, setContent] = useState(currentNote?.content || '');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDrawing, setShowDrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMode, setAiMode] = useState<'improve' | 'summarize' | null>(null);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced'>('synced');
    const [showMathVision, setShowMathVision] = useState(false);
    const [showDataVision, setShowDataVision] = useState(false);
    const [summaryPanel, setSummaryPanel] = useState<{ original: string; summary: string } | null>(null);
    const [editor, setEditor] = useState<any>(null);

    const isEmpty =
        title.trim() === '' &&
        content.replace(/<[^>]*>/g, '').trim() === '';

    const { openTool, setEditor: storeSetEditor } = useMathToolsStore();
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorRef = useRef<any>(null);
    const isGuest = useAuthStore(s => s.isGuest);
    const openAuthModal = useUIStore(s => s.openAuthModal);
    // Refs per evitar stale closures als event listeners dels slash commands
    // S'inicialitzen amb no-op i s'actualitzen síncronament cada render (veure més avall)
    const handleOptimizeRef = useRef<() => void>(() => { });
    const handleSummarizeRef = useRef<() => void>(() => { });
    const handleSuggestSubjectRef = useRef<() => void>(() => { });

    const handleOpenTool = (tool: any) => {
        if (isGuest) {
            openAuthModal('selection');
        } else {
            openTool(tool);
        }
    };

    useEffect(() => {
        const handleOpenDrawing = () => setShowDrawing(true);
        const handleOpenMathVision = () => {
            if (isGuest) openAuthModal('selection');
            else setShowMathVision(true);
        };
        const handleOpenDataVision = () => {
            if (isGuest) openAuthModal('selection');
            else setShowDataVision(true);
        };
        const handleAiOptimize = () => handleOptimizeRef.current();
        const handleAiSummarize = () => handleSummarizeRef.current();
        const handleAiSuggest = () => handleSuggestSubjectRef.current();
        const handleGenerateChartEvent = () => handleOpenTool('tableToChart');
        const handleImageUpload = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const base64 = re.target?.result as string;
                    editor?.chain().focus().setImage({ src: base64 }).run();
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };

        window.addEventListener('open-drawing-canvas', handleOpenDrawing);
        window.addEventListener('open-math-vision', handleOpenMathVision);
        window.addEventListener('open-data-vision', handleOpenDataVision);
        window.addEventListener('trigger-ai-optimize', handleAiOptimize);
        window.addEventListener('trigger-ai-summarize', handleAiSummarize);
        window.addEventListener('trigger-ai-suggest', handleAiSuggest);
        window.addEventListener('trigger-image-upload', handleImageUpload);
        window.addEventListener('trigger-generate-chart', handleGenerateChartEvent);

        return () => {
            window.removeEventListener('open-drawing-canvas', handleOpenDrawing);
            window.removeEventListener('open-math-vision', handleOpenMathVision);
            window.removeEventListener('open-data-vision', handleOpenDataVision);
            window.removeEventListener('trigger-ai-optimize', handleAiOptimize);
            window.removeEventListener('trigger-ai-summarize', handleAiSummarize);
            window.removeEventListener('trigger-ai-suggest', handleAiSuggest);
            window.removeEventListener('trigger-image-upload', handleImageUpload);
            window.removeEventListener('trigger-generate-chart', handleGenerateChartEvent);
        };
    }, []);

    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
            setContent(currentNote.content);
            setSyncStatus('synced');
        }
    }, [currentNote?.id]);

    useEffect(() => {
        if (!currentNote) return;
        if (title === currentNote.title && content === currentNote.content) return;

        setSyncStatus('local'); // guardat localment, API pendent

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            // Només actualitza l'estat visual — el worker fa el sync real
            updateNote(currentNote.id, { title, content });
        }, 1500); // debounce per no saturar Dexie

        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    }, [title, content]);

    // Sincronitza l'estat visual amb el procés de guardat del store
    useEffect(() => {
        if (isSaving) {
            setSyncStatus('syncing');
        } else if (syncStatus === 'syncing') {
            setSyncStatus('synced');
        }
    }, [isSaving]);

    // Registra l'editor al store global (per als modals i RightPanel)
    useEffect(() => {
        if (editor) storeSetEditor(editor);
        return () => { storeSetEditor(null); };
    }, [editor]);


    const handleOCRResult = (
        markdown: string,
        hasFormulas: boolean,
        ocrTitle: string | null
    ) => {
        if (!editor) return;

        // Si la nota no té títol i l'OCR n'ha detectat un, aplica'l
        if (ocrTitle && (!title || title === 'Sense títol')) {
            setTitle(ocrTitle);
        }

        // Insereix el contingut escanejat al final de la nota
        editor.chain()
            .focus('end')
            .insertContent('<hr />')
            .insertContent(
                `<p><strong>📷 Contingut escanejat:</strong></p>`
            )
            .insertContent(markdownToHtml(markdown))
            .run();

        // Avís si hi ha fórmules (KaTeX no instal·lat per defecte)
        if (hasFormulas) {
            setToast('⚗ S\'han detectat fórmules. Instal·la KaTeX per renderitzar-les.');
            setTimeout(() => setToast(''), 5000);
        }
    };

    // Insereix el SVG del dibuix com a imatge inline a la nota
    // Insereix Markdown directament (per a DataVision)
    const handleInsertMarkdown = (markdown: string) => {
        if (!editor || !markdown) return;
        editor.chain()
            .focus('end')
            .insertContent('<hr />')
            .insertContent(markdown)
            .run();
        setToast('Taula de dades inserida');
        setTimeout(() => setToast(null), 3000);
    };

    const handleInsertDrawingAsImage = (dataUrl: string) => {
        if (!editor) return;
        editor.chain()
            .focus('end')
            .insertContent(
                `<img
                src="${dataUrl}"
                alt="Dibuix"
                style="max-width:100%;border-radius:10px;margin:12px 0;border:1px solid rgba(255,255,255,0.08);"
            />`
            )
            .run();
    };

    // Insereix el text convertit des del dibuix (reutilitza markdownToHtml de Fase 2)
    const handleDrawingToText = (markdown: string) => {
        if (!editor || !markdown) return;
        editor.chain()
            .focus('end')
            .insertContent('<hr />')
            .insertContent('<p><strong>✏ Convertit des del dibuix:</strong></p>')
            .insertContent(markdownToHtml(markdown))
            .run();
    };

    // Insereix una equació LaTeX reconeguda com a fórmula inline ($...$)
    // L'extensió Mathematics de Tiptap detecta automàticament el delimitador $
    const handleInsertAsLatex = (latex: string) => {
        if (!editor || !latex) return;
        editor.chain()
            .focus('end')
            .insertContent(`$${latex}$`)
            .run();
    };

    const handleInsertMathVisionRegions = (regions: MathRegion[]) => {
        if (!editor || !regions.length) return;

        const chain = editor.chain().focus('end').insertContent('<hr />');

        regions.forEach(region => {
            if (region.type === 'equation') {
                chain.insertContent(`<p>$${region.latex}$</p>`);
            } else {
                chain.insertContent(`<p>${region.content}</p>`);
            }
        });

        chain.run();
        setToast(`${regions.length} regions inserides`);
        setTimeout(() => setToast(null), 3000);
    };

    const handleOptimize = async () => {
        if (isGuest) {
            openAuthModal('selection');
            return;
        }
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 20) return;

        setAiLoading(true);
        setAiMode('improve');
        setError(null);

        try {
            const improved = await improveWithAI(plainText);
            if (!editor || !currentNote) return;

            setIsTypingAI(true);

            // Escribir directamente en el editor para evitar que el useEffect
            // de RichEditor compare texto plano con HTML y resetee el cursor
            editor.commands.setContent('', false);
            await new Promise(r => setTimeout(r, 150));

            const words = improved.split(' ');
            let current = '';
            for (let i = 0; i < words.length; i++) {
                current += (i === 0 ? '' : ' ') + words[i];
                editor.commands.setContent(`<p>${current}</p>`, false);
                const delay = words[i].length > 6 ? 35 : words[i].endsWith('.') ? 80 : 25;
                await new Promise(r => setTimeout(r, delay));
            }

            // Sincronizar el estado React con el contenido final del editor
            const finalHtml = editor.getHTML();
            setContent(finalHtml);
            setIsTypingAI(false);
            setSyncStatus('syncing');
            await updateNote(currentNote.id, { content: finalHtml, ai_processed: true });
            setSyncStatus('synced');
        } catch (err: any) {
            setIsTypingAI(false);
            setError(err.message || 'Error al connectar amb la IA. Comprova la clau API.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
            setAiMode(null);
        }
    };

    const handleSummarize = async () => {
        if (isGuest) { openAuthModal('selection'); return; }
        const plainText = content.replace(/<[^>]*>/g, '').trim();
        if (plainText.length < 20) return;
        setAiLoading(true);
        setAiMode('summarize');
        try {
            const result = await summarizeWithAI(plainText);
            setSummaryPanel({ original: plainText, summary: result });
        } catch (err: any) {
            setError(err.message || 'Error al generar resumen.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
            setAiMode(null);
        }
    };

    const handleInsertSummary = () => {
        if (!summaryPanel || !editor) return;
        const summaryHtml = `<div style="background:rgba(59,130,246,0.05);padding:24px;border-radius:24px;margin:24px 0;border:1px solid rgba(59,130,246,0.15);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="font-size:20px;">📝</span>
                <strong style="text-transform:uppercase;letter-spacing:0.1em;font-size:12px;color:#3b82f6;">Resumen Automático</strong>
            </div>
            ${markdownToHtml(summaryPanel.summary)}
        </div>`;
        editor.chain().focus('end').insertContent('<hr />').insertContent(summaryHtml).run();
        setSummaryPanel(null);
        setToast('Resumen insertado en la nota');
        setTimeout(() => setToast(null), 3000);
    };

    const handleSuggestSubject = async () => {
        if (isGuest) {
            openAuthModal('selection');
            return;
        }
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 10) return;
        setAiLoading(true);
        try {
            const subject = await suggestSubjectWithAI(plainText);
            setToast(`💡 IA suggereix: ${subject}`);
            setTimeout(() => setToast(null), 5000);
            // No l'assignem automàticament per seguretat, només el suggerim
        } catch (err: any) {
            setError(err.message || 'Error al suggerir assignatura.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
        }
    };

    // Actualitza els refs síncronament cada render perquè els event listeners
    // (registrats una sola vegada) cridin sempre la versió actual de les funcions
    handleOptimizeRef.current = handleOptimize;
    handleSummarizeRef.current = handleSummarize;
    handleSuggestSubjectRef.current = handleSuggestSubject;

    const handleDelete = async () => {
        if (currentNote) {
            await deleteNote(currentNote.id);
            setCurrentNote(null);
        }
        setShowDeleteModal(false);
    };

    if (!currentNote) return null;

    const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(x => x.length > 0).length;

    return (
        <div className="flex flex-col h-full bg-[#030712] relative overflow-hidden">
            {/* Header / Breadcrumb - Minimalista */}
            <div className="px-6 py-4 flex items-center justify-between z-[100] glass border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentNote(null)}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1 text-[11px] font-black uppercase tracking-tighter text-blue-400 hover:text-white hover:bg-white/10 transition-all outline-none cursor-pointer"
                                    value={currentNote.subject_id || ''}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? null : Number(e.target.value);
                                        updateNote(currentNote.id, { subject_id: val });
                                    }}
                                >
                                    <option value="" className="bg-[#161B22] text-slate-400 uppercase">Sense Assignatura</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id} className="bg-[#161B22] text-white uppercase">
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400/50">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${syncStatus === 'synced' ? 'text-emerald-500' :
                        syncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : 'text-slate-600'
                        }`}>
                        {syncStatus === 'synced' ? <Check size={10} strokeWidth={3} /> : '•'}
                        {syncStatus === 'synced' ? 'Sincronitzat' : syncStatus === 'syncing' ? 'Guardant...' : 'Local'}
                    </span>
                    <button
                        className="p-2 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 border border-transparent hover:border-red-500/20"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Error & Toast Notifications */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
                {error && (
                    <div className="bg-red-500 text-white rounded-2xl px-6 py-3 text-sm font-bold shadow-2xl animate-fade-in-up border border-white/20 backdrop-blur-xl">
                        ⚠️ {error}
                    </div>
                )}
                {toast && (
                    <div className="bg-blue-600 text-white rounded-2xl px-6 py-3 text-sm font-bold shadow-2xl animate-fade-in-up border border-white/20 backdrop-blur-xl">
                        ✨ {toast}
                    </div>
                )}
            </div>

            {/* Main: Left Vertical Toolbar + Editor */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Left Vertical Toolbar ── */}
                <div className="flex flex-col items-center gap-1 py-4 px-2 glass border-r border-white/5 w-[72px] flex-shrink-0 overflow-y-auto scrollbar-hide">
                    {/* Primary Tools */}
                    <ToolBtn onClick={() => handleOpenTool('mathOCR')} title="Escritura inteligente" accent>
                        <Pencil size={22} />
                        <span className="text-[10px] uppercase tracking-tighter font-black">Lápiz</span>
                    </ToolBtn>

                    <ToolBtn onClick={() => handleOpenTool('smartCamera')} title="Escaneo Rápido">
                        <Camera size={22} />
                        <span className="text-[10px] uppercase tracking-tighter font-black">Cámara</span>
                    </ToolBtn>

                    <div className="h-px w-10 bg-white/10 my-1" />

                    {/* AI Tools */}
                    <ToolBtn
                        onClick={handleOptimize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                        title="Optimizar texto"
                    >
                        {aiLoading && aiMode === 'improve' ? <Spinner size="sm" /> : <Sparkles size={20} />}
                        <span className="text-[10px] uppercase tracking-tighter font-black text-blue-400">Elegante</span>
                    </ToolBtn>

                    <ToolBtn
                        onClick={handleSummarize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                        title="Resumen Automático"
                    >
                        {aiLoading && aiMode === 'summarize' ? <Spinner size="sm" /> : <FileText size={20} />}
                        <span className="text-[10px] uppercase tracking-tighter font-black">Resumir</span>
                    </ToolBtn>

                    <div className="h-px w-10 bg-white/10 my-1" />

                    {/* Math/Data Tools */}
                    <ToolBtn onClick={() => handleOpenTool('mathEditor')} title="Modo ecuaciones">
                        <Sigma size={22} />
                        <span className="text-[10px] uppercase tracking-tighter font-black">Matemát.</span>
                    </ToolBtn>

                    <div className="grid grid-cols-2 gap-1 mt-1">
                        {[
                            { t: 'tableToChart', icon: <BarChart2 size={15} /> },
                            { t: 'diagram',      icon: <GitBranch size={15} /> },
                            { t: 'geometry',     icon: <Triangle size={15} /> },
                            { t: 'calibrate',    icon: <Target size={15} /> },
                        ].map(({ t, icon }) => (
                            <button
                                key={t}
                                onClick={() => handleOpenTool(t as any)}
                                className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-white/5 border border-white/5 text-slate-400 hover:bg-white/[0.09] hover:text-slate-200 transition-all duration-150 active:scale-90"
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Àrea d'edició principal */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide relative">
                    {/* Empty-state overlay */}
                    {isEmpty && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-fade-in-up">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                                <FileText size={56} strokeWidth={1} className="text-slate-500" />
                                <div className="text-center">
                                    <p className="text-slate-400 text-base font-medium">Empieza a escribir o dibuja con el lápiz</p>
                                    <p className="text-slate-600 text-sm mt-1">Escribe <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono">/</kbd> para ver comandos</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="max-w-4xl mx-auto">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-6xl font-black border-none outline-none bg-transparent placeholder:text-slate-800 text-white tracking-tighter leading-none mb-10 font-display focus:ring-0"
                            placeholder="Sin título..."
                        />

                        <RichEditor
                            content={content}
                            onChange={setContent}
                            isTypingAI={isTypingAI}
                            onEditorReady={setEditor}
                        />
                    </div>
                </div>
            </div>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar nota">
                <div className="p-2">
                    <p className="text-slate-400 mb-8 font-medium text-lg leading-relaxed">¿Estás seguro de que quieres eliminar esta nota de tu biblioteca inteligente?</p>
                    <div className="flex gap-4">
                        <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setShowDeleteModal(false)}>CONSERVAR</Button>
                        <Button variant="danger" className="flex-1 rounded-2xl" onClick={handleDelete}>ELIMINAR AHORA</Button>
                    </div>
                </div>
            </Modal>

            <DrawingCanvas
                isOpen={showDrawing}
                onClose={() => setShowDrawing(false)}
                onInsertAsImage={handleInsertDrawingAsImage}
                onConvertToText={handleDrawingToText}
                onInsertAsLatex={handleInsertAsLatex}
            />

            {showMathVision && (
                <MathVisionOCR
                    onClose={() => setShowMathVision(false)}
                    onInsertRegions={handleInsertMathVisionRegions}
                />
            )}

            {showDataVision && (
                <DataVisionOCR
                    onClose={() => setShowDataVision(false)}
                    onResult={handleInsertMarkdown}
                />
            )}

            {/* ── Summary comparison panel ── */}
            {summaryPanel && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px',
                }}>
                    <div style={{
                        background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '2rem', width: '100%', maxWidth: '900px',
                        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 24 }}>📝</span>
                                <div>
                                    <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>Resumen de la nota</p>
                                    <p style={{ margin: 0, fontSize: 11, color: '#475569', marginTop: 2 }}>Compara el texto original con el resumen generado por IA</p>
                                </div>
                            </div>
                            <button onClick={() => setSummaryPanel(null)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>

                        {/* Columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, overflow: 'hidden', minHeight: 0 }}>
                            {/* Original */}
                            <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Original</span>
                                    <span style={{ fontSize: 10, color: '#334155' }}>{summaryPanel.original.length} caracteres</span>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, lineHeight: 1.7, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {summaryPanel.original}
                                </div>
                            </div>

                            {/* Summary */}
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <span style={{ background: 'rgba(59,130,246,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Resumen IA</span>
                                    <span style={{ fontSize: 10, color: '#334155' }}>{summaryPanel.summary.length} caracteres</span>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, lineHeight: 1.7, color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {summaryPanel.summary}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={() => setSummaryPanel(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 20px', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Cerrar
                            </button>
                            <button onClick={handleInsertSummary} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 12, padding: '10px 24px', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}>
                                + Insertar resumen en la nota
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
