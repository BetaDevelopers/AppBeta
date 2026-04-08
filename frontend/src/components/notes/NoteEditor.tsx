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
import { useMathOCR, MathRegion } from '@/features/ai/hooks/useMathOCR';

// ── Definit FORA de NoteEditor per evitar desmuntatge en cada re-render ──
function ToolBtn({ onClick, disabled, title, accent, children }: {
    onClick: () => void; disabled?: boolean; title?: string; accent?: boolean; children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all active:scale-95 disabled:opacity-25 min-w-[48px] border
                ${accent
                    ? 'bg-blue-600/20 border-blue-500/20 text-blue-300 hover:bg-blue-600/30'
                    : 'bg-white/[0.04] border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                }`}
        >
            {children}
        </button>
    );
}

export const NoteEditor: React.FC = () => {
    const { currentNote, updateNote, deleteNote, setCurrentNote, improveWithAI, summarizeWithAI, suggestSubjectWithAI, isSaving } = useNotesStore();
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
    const [editor, setEditor] = useState<any>(null);
    const { openTool, setEditor: storeSetEditor } = useMathToolsStore();
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorRef = useRef<any>(null);
    useEffect(() => {
        const handleOpenDrawing = () => setShowDrawing(true);
        const handleOpenMathVision = () => setShowMathVision(true);
        const handleOpenDataVision = () => setShowDataVision(true);
        const handleAiOptimize = () => handleOptimize();
        const handleAiSummarize = () => handleSummarize();
        const handleAiSuggest = () => handleSuggestSubject();
        const handleGenerateChartEvent = () => openTool('tableToChart');
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

    // Helper: converteix markdown bàsic a HTML compatible amb Tiptap
    const markdownToHtml = (md: string): string => {
        if (!md) return '';
        return md
            // Títols
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Format
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/~~(.+?)~~/g, '<s>$1</s>')
            // Llistes — agrupa els <li> dins <ul>
            .replace(/((?:^- .+\n?)+)/gm, (block) => {
                const items = block
                    .trim()
                    .split('\n')
                    .map((l) => `<li>${l.replace(/^- /, '')}</li>`)
                    .join('');
                return `<ul>${items}</ul>`;
            })
            // Llistes numerades
            .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
                const items = block
                    .trim()
                    .split('\n')
                    .map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`)
                    .join('');
                return `<ol>${items}</ol>`;
            })
            // Paràgrafs (línies que no comencen per etiqueta HTML)
            .replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p>$1</p>')
            // Neteja paràgrafs buits
            .replace(/<p>\s*<\/p>/g, '');
    };

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
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 20) return;

        setAiLoading(true);
        setAiMode('improve');
        setError(null);

        try {
            const improved = await improveWithAI(plainText);
            setIsTypingAI(true);

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
            setSyncStatus('syncing');
            await updateNote(currentNote!.id, { content: current, ai_processed: true });
            setSyncStatus('synced');
        } catch (err: any) {
            setIsTypingAI(false);
            setError('Error al connectar amb la IA. Comprova la clau API.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
            setAiMode(null);
        }
    };

    const handleSummarize = async () => {
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 20) return;
        setAiLoading(true);
        setAiMode('summarize');
        try {
            const result = await summarizeWithAI(plainText);
            const summaryHtml = `<div style="background:rgba(59,130,246,0.05);padding:20px;border-radius:16px;margin:20px 0;border:1px solid rgba(59,130,246,0.1);"><strong>📝 Resum Automàtic:</strong><br/>${result}</div>`;
            setContent(content + summaryHtml);
        } catch {
            setError('Error al generar resum.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
            setAiMode(null);
        }
    };

    const handleSuggestSubject = async () => {
        const plainText = content.replace(/<[^>]*>/g, '');
        if (plainText.length < 10) return;
        setAiLoading(true);
        try {
            const subject = await suggestSubjectWithAI(plainText);
            setToast(`💡 IA suggereix: ${subject}`);
            setTimeout(() => setToast(null), 5000);
            // No l'assignem automàticament per seguretat, només el suggerim
        } catch {
            setError('Error al suggerir assignatura.');
            setTimeout(() => setError(null), 4000);
        } finally {
            setAiLoading(false);
        }
    };

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
        <div className="flex flex-col h-full bg-[#0a0f1e] relative">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0a0f1e] sticky top-0 z-[100] glass-effect">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentNote(null)} className="p-3 bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black text-white leading-tight truncate max-w-[300px]">{title || 'Sense títol'}</h1>
                        {currentNote.subject_name && (
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentNote.subject_name}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" className="text-red-400 hover:bg-red-500/10 p-3 bg-white/5 border border-white/5" onClick={() => setShowDeleteModal(true)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 max-w-5xl mx-auto w-full scrollbar-hide">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-5xl font-black border-none outline-none bg-transparent placeholder:text-slate-800 text-white tracking-tighter leading-tight mb-6"
                    placeholder="Sin título..."
                />
                <div className="h-1 bg-blue-600 w-20 mb-10 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />

                <RichEditor
                    content={content}
                    onChange={setContent}
                    isTypingAI={isTypingAI}
                    onEditorReady={setEditor}
                />

            </div>

            {error && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200]
                      bg-red-500/20 border border-red-500/30 rounded-2xl
                      px-8 py-4 text-sm text-red-100 whitespace-nowrap
                      animate-fade-in-up font-bold shadow-2xl backdrop-blur-xl">
                    ⚠ {error}
                </div>
            )}

            {toast && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200]
                      bg-blue-600/20 border border-blue-500/30 rounded-2xl
                      px-8 py-4 text-sm text-blue-100 whitespace-nowrap
                      animate-fade-in-up font-bold shadow-2xl backdrop-blur-xl">
                    ℹ {toast}
                </div>
            )}

            {/* ── Toolbar inferior ── */}
            <div className="border-t border-white/5 bg-[#0a0f1e]/60 backdrop-blur-md sticky bottom-0 z-[100]">
                <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide">

                    {/* 1 · Lápiz */}
                    <ToolBtn onClick={() => openTool('mathOCR')} title="Lápiz intel·ligent">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Lápiz
                    </ToolBtn>

                    {/* 2 · Càmera */}
                    <ToolBtn onClick={() => openTool('smartCamera')} title="Escanejar amb càmera">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Càmera
                    </ToolBtn>

                    {/* 3 · Gràfic */}
                    <ToolBtn onClick={() => openTool('tableToChart')} title="Taula → gràfic">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Gràfic
                    </ToolBtn>

                    {/* 4 · TeXificar */}
                    <ToolBtn onClick={() => openTool('mathEditor')} title="Text → LaTeX">
                        <span className="text-lg leading-none">∑</span>
                        TeXificar
                    </ToolBtn>

                    {/* divider */}
                    <div className="w-px h-8 bg-white/5 flex-shrink-0 mx-1" />

                    {/* 5 · Optimitzar */}
                    <ToolBtn
                        onClick={handleOptimize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                        title="Millorar amb IA"
                        accent
                    >
                        {aiLoading && aiMode === 'improve' ? <Spinner size="sm" className="text-white" /> : <span className="text-base leading-none">✨</span>}
                        Optimitzar
                    </ToolBtn>

                    {/* 6 · Resumir */}
                    <ToolBtn
                        onClick={handleSummarize}
                        disabled={aiLoading || content.replace(/<[^>]*>/g, '').length < 20}
                        title="Generar resum"
                    >
                        {aiLoading && aiMode === 'summarize' ? <Spinner size="sm" className="text-blue-400" /> : <span className="text-base leading-none">📝</span>}
                        Resumir
                    </ToolBtn>

                    {/* 7 · Pujar */}
                    <ToolBtn onClick={() => openTool('fileUpload')} title="Pujar fitxer OCR">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Pujar
                    </ToolBtn>

                    {/* divider */}
                    <div className="w-px h-8 bg-white/5 flex-shrink-0 mx-1" />

                    {/* Eines extra — icones compactes */}
                    {[
                        { tool: 'mathOCRImage', icon: '🖼', title: 'Imatge → OCR matemàtic' },
                        { tool: 'geometry',     icon: '📐', title: 'Geometria → SVG' },
                        { tool: 'diagram',      icon: '🗂', title: 'Diagrama' },
                        { tool: 'calibrate',    icon: '🎯', title: 'Calibrar escriptura' },
                    ].map(({ tool, icon, title }) => (
                        <button
                            key={tool}
                            onClick={() => openTool(tool as any)}
                            title={title}
                            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-base border border-white/5 bg-white/[0.03] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 transition-all active:scale-95"
                        >
                            {icon}
                        </button>
                    ))}
                </div>

                {/* Estat de sincronització */}
                <div className="flex items-center justify-end gap-4 px-4 pb-2">
                    <span className={`text-[10px] font-medium transition-all duration-300 ${
                        syncStatus === 'synced'  ? 'text-green-600' :
                        syncStatus === 'syncing' ? 'text-blue-400 animate-pulse' : 'text-slate-700'
                    }`}>
                        {syncStatus === 'synced'  && '✓ Sincronitzat'}
                        {syncStatus === 'syncing' && '⟳ Sincronitzant...'}
                        {syncStatus === 'local'   && '· Guardat localment'}
                    </span>
                    <span className="text-[10px] text-slate-700">{wordCount} paraules</span>
                </div>
            </div>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar nota">
                <p className="text-slate-400 mb-8 font-medium text-lg leading-relaxed">¿Estás seguro de querer eliminar esta nota?</p>
                <div className="flex gap-4 justify-end">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
                    <Button variant="danger" className="flex-1" onClick={handleDelete}>Eliminar</Button>
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

        </div>
    );
};
