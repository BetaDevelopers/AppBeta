import React, { useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useNotesStore } from '../../store/notesStore';
import FileUploadOCR from '../files/FileUploadOCR';
import { ScanLine, ImagePlus, FileDown, FileCode, FileText, FolderOpen, Download, ChevronDown } from 'lucide-react';

interface SidebarRightProps {
    isOverlay?: boolean;
    onClose?: () => void;
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
    return (
        <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
                <span className="flex items-center text-[#484F58]">{icon}</span>
                <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">{title}</span>
            </div>
            {subtitle && (
                <p className="text-[13px] text-[#8B949E] mt-1 pl-7 truncate">{subtitle}</p>
            )}
        </div>
    );
}

function Divider() {
    return <div className="mx-5 border-t border-[rgba(255,255,255,0.08)] my-1" />;
}

function ActionButton({
    onClick,
    icon,
    label,
    disabled,
    variant = 'default',
}: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'danger';
}) {
    const variantClass =
        variant === 'primary'
            ? 'bg-[#388BFD] text-white border-[#388BFD]/30 hover:bg-[#2f7be8]'
            : variant === 'danger'
            ? 'bg-transparent text-[#F78166] border-[rgba(247,129,102,0.2)] hover:bg-[rgba(247,129,102,0.08)]'
            : 'bg-[#21262D] text-[#8B949E] border-[rgba(255,255,255,0.08)] hover:bg-[#2D333B] hover:text-[#E6EDF3]';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-4 rounded-xl border transition-all duration-150 active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none ${variantClass}`}
            style={{ height: 'var(--touch-md)', fontSize: '15px', fontWeight: 500 }}
        >
            <span className="flex-shrink-0 leading-none">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

export default function SidebarRight({ isOverlay = false, onClose }: SidebarRightProps) {
    const { editor } = useMathToolsStore();
    const { currentNote } = useNotesStore();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [showUpload, setShowUpload] = useState(false);

    const insertText  = (text: string) => editor?.chain().focus().insertContent(text).run();
    const insertImage = (src: string)  => editor?.chain().focus().setImage({ src }).run();

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
            if (imgH <= avH) {
                pdf.addImage(imgData, 'JPEG', m, cy, imgW, imgH);
            } else {
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
        <aside
            className={`
                sidebar flex-shrink-0 bg-[#161B22] border-l border-[rgba(255,255,255,0.08)] flex flex-col overflow-hidden shadow-xl z-[50]
                ${isOverlay ? 'absolute right-0 top-0 h-full' : 'relative'}
            `}
            style={{ width: 'var(--sidebar-right)' }}
        >
            {/* Close button — shown when overlay */}
            {isOverlay && onClose && (
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">Panel</span>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded-xl text-[#484F58] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                        style={{ width: '44px', height: '44px' }}
                        aria-label="Cerrar panel"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">

                {/* ── Recursos ─── */}
                <SectionHeader icon={<FolderOpen size={14} />} title="Recursos" subtitle="Archivos adjuntos" />
                <div className="px-4 pb-4 flex flex-col gap-2">
                    <button
                        onClick={() => setShowUpload(v => !v)}
                        className={`w-full flex items-center gap-3 px-4 rounded-xl border transition-all duration-150 active:scale-[0.97] ${
                            showUpload
                                ? 'bg-[rgba(56,139,253,0.1)] border-[rgba(56,139,253,0.3)] text-[#388BFD]'
                                : 'bg-[#21262D] border-[rgba(255,255,255,0.08)] text-[#8B949E] hover:bg-[#2D333B] hover:text-[#E6EDF3]'
                        }`}
                        style={{ height: 'var(--touch-md)', fontSize: '15px', fontWeight: 500 }}
                    >
                        <ScanLine size={20} className="flex-shrink-0" />
                        <span>OCR Express</span>
                        <ChevronDown
                            size={14}
                            className={`ml-auto text-[#484F58] transition-transform duration-200 ${showUpload ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showUpload && (
                        <div className="rounded-xl bg-[#21262D] border border-[rgba(255,255,255,0.08)] p-3 animate-fade-in-down">
                            <FileUploadOCR
                                onResult={noEditor ? undefined : insertText}
                                onInsertImage={noEditor ? undefined : insertImage}
                            />
                        </div>
                    )}

                    <ActionButton
                        onClick={() => imageInputRef.current?.click()}
                        icon={<ImagePlus size={20} />}
                        label="Insertar imagen"
                        disabled={noEditor}
                    />
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && addImageToNote(e.target.files[0])}
                    />

                    {noteImages.length > 0 && (
                        <div className="mt-1">
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[11px] font-semibold text-[#484F58] uppercase tracking-widest">Multimedia</span>
                                <span className="text-[11px] font-medium text-[#388BFD]">{noteImages.length}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {noteImages.map((src, i) => (
                                    <div
                                        key={i}
                                        className="group/img relative aspect-square rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#21262D] cursor-zoom-in"
                                    >
                                        <img
                                            src={src}
                                            alt={`Imatge ${i + 1}`}
                                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Divider />

                {/* ── Exportar ─── */}
                <SectionHeader
                    icon={<Download size={14} />}
                    title="Exportar"
                    subtitle={currentNote ? (currentNote.title || 'Sin nombre') : undefined}
                />
                <div className="px-4 pb-6 flex flex-col gap-2">
                    {!currentNote ? (
                        <div className="px-4 py-5 rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] text-center">
                            <p className="text-[13px] text-[#484F58]">Abre una nota para exportar</p>
                        </div>
                    ) : (
                        <>
                            <ActionButton onClick={downloadPDF} icon={<FileDown size={20} />}  label="Exportar PDF"      variant="default" />
                            <ActionButton onClick={downloadMD}  icon={<FileCode size={20} />}  label="Exportar Markdown" variant="default" />
                            <ActionButton onClick={downloadTXT} icon={<FileText size={20} />}  label="Exportar texto"    variant="default" />
                        </>
                    )}
                </div>
            </div>

            {/* Status footer */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.08)] safe-area-bottom">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#484F58]">Estado IA</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-pulse" />
                        <span className="text-[11px] text-[#3FB950] font-medium">Listo</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
