import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useNotesStore } from '../../store/notesStore';
import SmartCamera from '../camera/SmartCamera';
import FileUploadOCR from '../files/FileUploadOCR';

interface RightPanelProps {
    open: boolean;
    onToggle: () => void;
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="border border-white/5 rounded-2xl overflow-hidden">
            <button
                onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/5 transition-all"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <span>{icon}</span> {title}
                </span>
                <svg
                    className={`w-3 h-3 text-slate-600 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!collapsed && (
                <div className="px-4 py-4 bg-[#0a0f1e]/50">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function RightPanel({ open, onToggle }: RightPanelProps) {
    const { editor } = useMathToolsStore();
    const { currentNote } = useNotesStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const insertText = (text: string) => {
        editor?.chain().focus().insertContent(text).run();
    };

    const insertImage = (src: string) => {
        editor?.chain().focus().setImage({ src }).run();
    };

    // Section C — extract images from note content
    const noteImages = useMemo(() => {
        if (!currentNote?.content) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentNote.content, 'text/html');
        return Array.from(doc.querySelectorAll('img')).map(img => img.getAttribute('src') ?? '').filter(Boolean);
    }, [currentNote?.content]);

    // Section D — download helpers
    function stripHtml(html: string): string {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    function downloadBlob(content: string, filename: string, mime: string) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadMD() {
        if (!currentNote) return;
        const text = stripHtml(currentNote.content);
        downloadBlob(`# ${currentNote.title}\n\n${text}`, `${currentNote.title || 'nota'}.md`, 'text/markdown');
    }

    function downloadTXT() {
        if (!currentNote) return;
        const text = stripHtml(currentNote.content);
        downloadBlob(`${currentNote.title}\n${'─'.repeat(40)}\n\n${text}`, `${currentNote.title || 'nota'}.txt`, 'text/plain');
    }

    async function downloadPDF() {
        if (!currentNote) return;
        const element = document.querySelector('.ProseMirror') as HTMLElement;
        if (!element) {
            // Fallback: text-only PDF
            const pdf = new jsPDF();
            const text = stripHtml(currentNote.content);
            pdf.setFontSize(18);
            pdf.text(currentNote.title || 'Nota', 15, 20);
            pdf.setFontSize(11);
            const lines = pdf.splitTextToSize(text, 180);
            pdf.text(lines, 15, 35);
            pdf.save(`${currentNote.title || 'nota'}.pdf`);
            return;
        }
        try {
            const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgW = pageW - margin * 2;
            const imgH = (canvas.height * imgW) / canvas.width;
            // Title page header
            pdf.setFontSize(14);
            pdf.setTextColor(40, 40, 40);
            pdf.text(currentNote.title || 'Nota', margin, margin + 6);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, margin + 9, pageW - margin, margin + 9);
            // Content
            const contentY = margin + 14;
            const availH = pageH - contentY - margin;
            if (imgH <= availH) {
                pdf.addImage(imgData, 'JPEG', margin, contentY, imgW, imgH);
            } else {
                let yOffset = 0;
                while (yOffset < imgH) {
                    if (yOffset > 0) pdf.addPage();
                    const sliceH = Math.min(availH, imgH - yOffset);
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = (sliceH / imgW) * canvas.width;
                    const ctx = sliceCanvas.getContext('2d')!;
                    ctx.drawImage(canvas, 0, (yOffset / imgW) * canvas.width, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
                    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, yOffset === 0 ? contentY : margin, imgW, sliceH);
                    yOffset += sliceH;
                }
            }
            pdf.save(`${currentNote.title || 'nota'}.pdf`);
        } catch {
            // Fallback
            downloadTXT();
        }
    }

    function addImageToNote(file: File) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const src = e.target?.result as string;
            insertImage(src);
        };
        reader.readAsDataURL(file);
    }

    const noEditor = !editor;

    return (
        <div className={`relative flex-shrink-0 transition-all duration-300 ease-in-out ${open ? 'w-72' : 'w-0'} bg-[#0a0f1e] border-l border-white/5 overflow-hidden`}>
            {/* Toggle tab */}
            <button
                onClick={onToggle}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-50
                           bg-[#0a0f1e] border border-white/5 border-r-0 rounded-l-xl
                           px-1.5 py-4 text-slate-600 hover:text-slate-300 transition-colors"
                title={open ? 'Tancar panell' : 'Obrir eines'}
            >
                <svg className={`w-3 h-3 transition-transform ${open ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Content */}
            <div className="h-full w-72 overflow-y-auto px-3 py-4 space-y-3 scrollbar-hide">

                {/* ── A: Càmera Intel·ligent ── */}
                <Section icon="📷" title="Càmera">
                    {noEditor && (
                        <p className="text-[10px] text-slate-600 mb-2">Selecciona una nota per inserir</p>
                    )}
                    <SmartCamera onResult={noEditor ? undefined : insertText} />
                </Section>

                {/* ── B: Pujar arxiu ── */}
                <Section icon="📂" title="Pujar arxiu">
                    {noEditor && (
                        <p className="text-[10px] text-slate-600 mb-2">Selecciona una nota per inserir</p>
                    )}
                    <FileUploadOCR
                        onResult={noEditor ? undefined : insertText}
                        onInsertImage={noEditor ? undefined : insertImage}
                    />
                </Section>

                {/* ── C: Imatges de la nota ── */}
                <Section icon="🖼" title="Imatges de la nota">
                    {!currentNote ? (
                        <p className="text-[10px] text-slate-600 text-center py-3">Cap nota seleccionada</p>
                    ) : noteImages.length === 0 ? (
                        <p className="text-[10px] text-slate-600 text-center py-3">Sense imatges a la nota</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {noteImages.map((src, i) => (
                                <img
                                    key={i}
                                    src={src}
                                    alt={`Imatge ${i + 1}`}
                                    className="w-full h-20 object-cover rounded-xl border border-white/5 bg-black/20"
                                />
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!editor}
                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/3 text-slate-500 hover:bg-white/8 hover:text-slate-300 transition-all disabled:opacity-30"
                    >
                        + Afegir imatge
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && addImageToNote(e.target.files[0])}
                    />
                </Section>

                {/* ── D: Descarregar nota ── */}
                <Section icon="⬇" title="Descarregar nota">
                    {!currentNote ? (
                        <p className="text-[10px] text-slate-600 text-center py-3">Cap nota seleccionada</p>
                    ) : (
                        <div className="space-y-2">
                            <button
                                onClick={downloadPDF}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/3 text-slate-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 transition-all"
                            >
                                <span className="text-base">📄</span> PDF
                            </button>
                            <button
                                onClick={downloadMD}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/3 text-slate-400 hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/20 transition-all"
                            >
                                <span className="text-base">📝</span> Markdown
                            </button>
                            <button
                                onClick={downloadTXT}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/3 text-slate-400 hover:bg-slate-500/10 hover:text-slate-300 hover:border-slate-500/20 transition-all"
                            >
                                <span className="text-base">📃</span> Text pla
                            </button>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}
