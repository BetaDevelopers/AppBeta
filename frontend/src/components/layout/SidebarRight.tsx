import React, { useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useNotesStore } from '../../store/notesStore';
import SmartCamera from '../camera/SmartCamera';
import FileUploadOCR from '../files/FileUploadOCR';

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
    return (
        <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm">{icon}</span>
                <span className="text-[12px] font-semibold text-slate-300">{title}</span>
            </div>
            {subtitle && (
                <p className="text-[11px] text-slate-600 pl-6">{subtitle}</p>
            )}
        </div>
    );
}

function Divider() {
    return <div className="mx-4 border-t border-white/5 my-1" />;
}

export default function SidebarRight() {
    const { editor } = useMathToolsStore();
    const { currentNote } = useNotesStore();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [showUpload, setShowUpload] = useState(false);

    const insertText = (text: string) => editor?.chain().focus().insertContent(text).run();
    const insertImage = (src: string) => editor?.chain().focus().setImage({ src }).run();

    const noteImages = useMemo(() => {
        if (!currentNote?.content) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentNote.content, 'text/html');
        return Array.from(doc.querySelectorAll('img'))
            .map(img => img.getAttribute('src') ?? '')
            .filter(Boolean);
    }, [currentNote?.content]);

    function stripHtml(html: string) {
        return html
            .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
            .replace(/<\/h[1-6]>/gi, '\n\n').replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    }

    function downloadBlob(content: string, filename: string, mime: string) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: filename }).click();
        URL.revokeObjectURL(url);
    }

    const downloadMD  = () => currentNote && downloadBlob(`# ${currentNote.title}\n\n${stripHtml(currentNote.content)}`, `${currentNote.title || 'nota'}.md`, 'text/markdown');
    const downloadTXT = () => currentNote && downloadBlob(`${currentNote.title}\n${'─'.repeat(40)}\n\n${stripHtml(currentNote.content)}`, `${currentNote.title || 'nota'}.txt`, 'text/plain');

    async function downloadPDF() {
        if (!currentNote) return;
        const element = document.querySelector('.ProseMirror') as HTMLElement;
        if (!element) { downloadTXT(); return; }
        try {
            const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const m = 10, imgW = pageW - m * 2, imgH = (canvas.height * imgW) / canvas.width;
            pdf.setFontSize(13); pdf.setTextColor(40, 40, 40);
            pdf.text(currentNote.title || 'Nota', m, m + 6);
            pdf.setDrawColor(200, 200, 200); pdf.line(m, m + 9, pageW - m, m + 9);
            const cy = m + 14, avH = pageH - cy - m;
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            if (imgH <= avH) { pdf.addImage(imgData, 'JPEG', m, cy, imgW, imgH); }
            else {
                let y = 0;
                while (y < imgH) {
                    if (y > 0) pdf.addPage();
                    const sh = Math.min(avH, imgH - y);
                    const sc = document.createElement('canvas');
                    sc.width = canvas.width; sc.height = (sh / imgW) * canvas.width;
                    const ctx = sc.getContext('2d')!;
                    ctx.drawImage(canvas, 0, (y / imgW) * canvas.width, canvas.width, sc.height, 0, 0, canvas.width, sc.height);
                    pdf.addImage(sc.toDataURL('image/jpeg', 0.92), 'JPEG', m, y === 0 ? cy : m, imgW, sh);
                    y += sh;
                }
            }
            pdf.save(`${currentNote.title || 'nota'}.pdf`);
        } catch { downloadTXT(); }
    }

    function addImageToNote(file: File) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => insertImage(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    const noEditor = !editor;

    return (
        <aside className="flex-shrink-0 w-60 bg-[#080d1a]/80 backdrop-blur-md border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-hide">

                {/* ── Càmera ── */}
                <SectionHeader icon="📷" title="Càmera" subtitle="Escaneja text i fórmules" />
                <div className="px-3 pb-3">
                    {noEditor && (
                        <p className="text-[11px] text-slate-700 mb-2 px-1">Selecciona una nota per inserir</p>
                    )}
                    <SmartCamera onResult={noEditor ? undefined : insertText} />
                </div>

                <Divider />

                {/* ── Fitxers ── */}
                <SectionHeader icon="📂" title="Fitxers" subtitle="Adjunta contingut a la nota" />
                <div className="px-3 pb-3 flex flex-col gap-1.5">

                    {/* Pujar arxiu */}
                    <button
                        onClick={() => setShowUpload(v => !v)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all border ${
                            showUpload
                                ? 'bg-blue-600/10 border-blue-500/20 text-blue-300'
                                : 'border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                        }`}
                    >
                        <span className="text-sm">📎</span>
                        <span>Pujar arxiu per OCR</span>
                        <svg className={`w-3 h-3 ml-auto text-slate-600 transition-transform ${showUpload ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {showUpload && (
                        <div className="rounded-lg bg-black/20 border border-white/5 p-2.5">
                            <FileUploadOCR
                                onResult={noEditor ? undefined : insertText}
                                onInsertImage={noEditor ? undefined : insertImage}
                            />
                        </div>
                    )}

                    {/* Afegir imatge */}
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={noEditor}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all disabled:opacity-25"
                    >
                        <span className="text-sm">🖼</span>
                        <span>Afegir imatge a la nota</span>
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && addImageToNote(e.target.files[0])} />

                    {/* Imatges existents */}
                    {noteImages.length > 0 && (
                        <div className="mt-1">
                            <p className="text-[10px] text-slate-700 px-1 mb-1.5">
                                {noteImages.length} imatge{noteImages.length !== 1 ? 's' : ''} a la nota
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                                {noteImages.map((src, i) => (
                                    <img key={i} src={src} alt={`Imatge ${i + 1}`}
                                        className="w-full h-12 object-cover rounded-md border border-white/5 bg-black/20" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Divider />

                {/* ── Descarregar ── */}
                <SectionHeader icon="⬇" title="Descarregar" subtitle={currentNote ? currentNote.title || 'Nota sense títol' : 'Cap nota seleccionada'} />
                <div className="px-3 pb-4 flex flex-col gap-1">
                    {!currentNote ? (
                        <p className="text-[11px] text-slate-700 px-1">Obre una nota per descarregar-la</p>
                    ) : (
                        <>
                            {[
                                { fn: downloadPDF, icon: '📄', label: 'PDF',       hover: 'hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/5' },
                                { fn: downloadMD,  icon: '📝', label: 'Markdown',  hover: 'hover:text-purple-300 hover:border-purple-500/20 hover:bg-purple-500/5' },
                                { fn: downloadTXT, icon: '📃', label: 'Text pla',  hover: 'hover:text-slate-200 hover:border-slate-500/20 hover:bg-slate-500/5' },
                            ].map(({ fn, icon, label, hover }) => (
                                <button key={label} onClick={fn}
                                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] border border-white/5 bg-transparent text-slate-500 transition-all ${hover}`}
                                >
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
