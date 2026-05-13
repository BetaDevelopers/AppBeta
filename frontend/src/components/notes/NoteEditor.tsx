import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import RichEditor from './RichEditor';
import DrawingCanvas from './DrawingCanvas';
import MathVisionOCR from './MathVisionOCR';
import DataVisionOCR from './DataVisionOCR';
import SelectionMenu from './SelectionMenu';
import { SolvePanel } from './SolvePanel';
import InlineCanvas from './InlineCanvas';
import DrawingToolbar, { DrawTool } from './DrawingToolbar';
import MathPill from './MathPill';
import { usePointerMode } from '../../hooks/usePointerMode';
import type { RecognitionResult } from '../../hooks/useStrokeRecognition';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useMathOCR, MathRegion } from '@/features/ai/hooks/useMathOCR';
import { markdownToHtml } from '../../utils/editorUtils';
import { useSubjectsStore } from '../../store/subjectsStore';
import { Pencil, Camera, Sparkles, FileText, Sigma, BarChart2, GitBranch, Triangle, Target, Trash2 } from 'lucide-react';
import InkCanvas, { Stroke } from './InkCanvas';
import type { InkCanvasRef } from './InkCanvas';
import InkToolbar from './InkToolbar';
import { postCanvasForOcr } from '../../services/ocrApi';
import { useAutoBeautify } from '../../hooks/useAutoBeautify';
import FloatingObjectComponent from './FloatingObject';
import type { FloatingObject } from '../../types/canvas';


// ── Helpers ──────────────────────────────────────────────────────────────────

function pointInPolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

function isObjectInLasso(obj: FloatingObject, poly: { x: number; y: number }[]): boolean {
  if (poly.length < 3) return false;
  const { x, y } = obj.position;
  const { width, height } = obj.dimensions;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].some(c => pointInPolygon(c.x, c.y, poly));
}

function computeGroupBbox(objects: FloatingObject[]) {
  const minX = Math.min(...objects.map(o => o.position.x));
  const minY = Math.min(...objects.map(o => o.position.y));
  const maxX = Math.max(...objects.map(o => o.position.x + o.dimensions.width));
  const maxY = Math.max(...objects.map(o => o.position.y + o.dimensions.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

interface SnapLine { x1: number; y1: number; x2: number; y2: number; axis: 'x' | 'y' }

function computeSnap(
  dragging: FloatingObject,
  others: FloatingObject[],
  newX: number,
  newY: number,
  threshold = 6
): { x: number; y: number; lines: SnapLine[] } {
  if (others.length === 0) return { x: newX, y: newY, lines: [] };

  const dw = dragging.dimensions.width;
  const dh = dragging.dimensions.height;

  // dragged anchors (desired new position)
  const dXA = [newX, newX + dw / 2, newX + dw];
  const dYA = [newY, newY + dh / 2, newY + dh];
  const dXOff = [0, dw / 2, dw];
  const dYOff = [0, dh / 2, dh];

  let minDX = threshold + 1, bestXSnap = newX, bestXLine = 0;
  let minDY = threshold + 1, bestYSnap = newY, bestYLine = 0;

  for (const o of others) {
    const ox = o.position.x, oy = o.position.y;
    const ow = o.dimensions.width, oh = o.dimensions.height;
    const oXA = [ox, ox + ow / 2, ox + ow];
    const oYA = [oy, oy + oh / 2, oy + oh];

    for (let di = 0; di < 3; di++) {
      for (let oi = 0; oi < 3; oi++) {
        const dx = Math.abs(dXA[di] - oXA[oi]);
        if (dx < minDX) { minDX = dx; bestXSnap = oXA[oi] - dXOff[di]; bestXLine = oXA[oi]; }
        const dy = Math.abs(dYA[di] - oYA[oi]);
        if (dy < minDY) { minDY = dy; bestYSnap = oYA[oi] - dYOff[di]; bestYLine = oYA[oi]; }
      }
    }
  }

  const snappedX = minDX <= threshold ? bestXSnap : newX;
  const snappedY = minDY <= threshold ? bestYSnap : newY;
  const lines: SnapLine[] = [];

  const snapDrag = { position: { x: snappedX, y: snappedY }, dimensions: { width: dw, height: dh } };
  const all = [...others, snapDrag];

  if (minDX <= threshold) {
    const minY = Math.min(...all.map(o => o.position.y)) - 10;
    const maxY = Math.max(...all.map(o => o.position.y + o.dimensions.height)) + 10;
    lines.push({ x1: bestXLine, y1: minY, x2: bestXLine, y2: maxY, axis: 'x' });
  }
  if (minDY <= threshold) {
    const minX = Math.min(...all.map(o => o.position.x)) - 10;
    const maxX = Math.max(...all.map(o => o.position.x + o.dimensions.width)) + 10;
    lines.push({ x1: minX, y1: bestYLine, x2: maxX, y2: bestYLine, axis: 'y' });
  }

  return { x: snappedX, y: snappedY, lines };
}

// ── Connector helpers ─────────────────────────────────────────────────────────

type AnchorHandle = 'n' | 's' | 'e' | 'w';

function getObjectAnchors(obj: FloatingObject): Array<{ x: number; y: number; handle: AnchorHandle }> {
  const { x, y } = obj.position;
  const { width: w, height: h } = obj.dimensions;
  return [
    { x: x + w / 2, y, handle: 'n' },
    { x: x + w / 2, y: y + h, handle: 's' },
    { x: x + w, y: y + h / 2, handle: 'e' },
    { x, y: y + h / 2, handle: 'w' },
  ];
}

function closestAnchor(from: { x: number; y: number }, obj: FloatingObject) {
  return getObjectAnchors(obj).reduce((best, a) =>
    Math.hypot(a.x - from.x, a.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y) ? a : best
  );
}

function translateSvgPath(path: string, dx: number, dy: number): string {
  return path.replace(/([-\d.]+),([-\d.]+)/g, (_, x, y) =>
    `${(parseFloat(x) + dx).toFixed(2)},${(parseFloat(y) + dy).toFixed(2)}`
  );
}

function buildConnectorData(
  sx: number, sy: number, sHandle: string,
  tx: number, ty: number, tHandle: string
): { position: { x: number; y: number }; dimensions: { width: number; height: number }; svgData: string } {
  const off = Math.min(Math.max(Math.hypot(tx - sx, ty - sy) * 0.5, 50), 100);
  const dirs: Record<string, [number, number]> = {
    n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0],
  };
  const [sdx, sdy] = dirs[sHandle] ?? [1, 0];
  const [tdx, tdy] = dirs[tHandle] ?? [-1, 0];
  const cp1x = sx + sdx * off, cp1y = sy + sdy * off;
  const cp2x = tx + tdx * off, cp2y = ty + tdy * off;
  const PAD = 16;
  const allX = [sx, cp1x, cp2x, tx], allY = [sy, cp1y, cp2y, ty];
  const minX = Math.min(...allX) - PAD, minY = Math.min(...allY) - PAD;
  const maxX = Math.max(...allX) + PAD, maxY = Math.max(...allY) + PAD;
  const absPath = `M ${sx},${sy} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`;
  return {
    position: { x: minX, y: minY },
    dimensions: { width: maxX - minX, height: maxY - minY },
    svgData: translateSvgPath(absPath, -minX, -minY),
  };
}

function recalcConnectors(objs: FloatingObject[], movedId: string): FloatingObject[] {
  return objs.map(o => {
    if (o.type !== 'connector') return o;
    if (o.sourceId !== movedId && o.targetId !== movedId) return o;
    const src = objs.find(x => x.id === o.sourceId);
    const tgt = objs.find(x => x.id === o.targetId);
    if (!src || !tgt) return o;
    const tgtCenter = { x: tgt.position.x + tgt.dimensions.width / 2, y: tgt.position.y + tgt.dimensions.height / 2 };
    const sa = closestAnchor(tgtCenter, src);
    const ta = closestAnchor(sa, tgt);
    return { ...o, ...buildConnectorData(sa.x, sa.y, sa.handle, ta.x, ta.y, ta.handle) };
  });
}

function insertTextAt(editor: any, text: string, svgEl: SVGSVGElement | null, cx: number, cy: number) {
  if (svgEl && editor?.view?.posAtCoords) {
    const rect = svgEl.getBoundingClientRect();
    const pos = editor.view.posAtCoords({ left: rect.left + cx, top: rect.top + cy });
    if (pos?.pos != null) {
      editor.chain().focus().insertContentAt(pos.pos, text).run();
      return;
    }
  }
  editor?.chain().focus().insertContent(text).run();
}

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
    const [solveText, setSolveText] = useState<string | null>(null);
    const [drawTool, setDrawTool] = useState<DrawTool>('pen');
    const [mathPill, setMathPill] = useState<{
        visible: boolean;
        pos: { top: number; left: number } | null;
        resolve: () => void;
    }>({ visible: false, pos: null, resolve: () => {} });
    // ink mode state
    const [inkMode, setInkMode] = useState(false);
    const toggleInk = () => setInkMode(prev => !prev);
    const inkCanvasRef = useRef<InkCanvasRef>(null);
    // floating objects layer — must be before useAutoBeautify so handleStrokesToObject is stable
    const [floatingObjects, setFloatingObjects] = useState<FloatingObject[]>([]);
    const floatingObjectsRef = useRef<FloatingObject[]>([]);
    floatingObjectsRef.current = floatingObjects;
    const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
    const [connectingPath, setConnectingPath] = useState<string | null>(null);
    const connectingFromRef = useRef<{
        sourceId: string; handle: AnchorHandle; anchorX: number; anchorY: number;
    } | null>(null);
    // ── Lasso ────────────────────────────────────────────────────────────────
    const layerContainerRef = useRef<HTMLDivElement>(null);
    const lassoRef = useRef<{
        active: boolean;
        startX: number;
        startY: number;
        points: { x: number; y: number }[];
    } | null>(null);
    const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
    const handleStrokesToObject = useCallback((newObj: FloatingObject) => {
        setFloatingObjects(prev => [...prev, newObj]);
    }, []);
    const { status: autoStatus, onStrokeFinish } = useAutoBeautify(editor, inkCanvasRef, inkMode, handleStrokesToObject);
    const [processing, setProcessing] = useState(false);
    // duplicate declarations removed
    const editorAreaRef = useRef<HTMLDivElement>(null);
    const { mode, setMode } = usePointerMode(editorAreaRef);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [isFlashActive, setIsFlashActive] = useState(false);
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

        // Insereix el contingut escanejat
        editor.chain()
            .focus()
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
            .focus()
            .insertContent('<hr />')
            .insertContent(markdown)
            .run();
        setToast('Taula de dades inserida');
        setTimeout(() => setToast(null), 3000);
    };

    const handleInsertDrawingAsImage = (dataUrl: string) => {
        if (!editor) return;
        editor.chain()
            .focus()
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
            .focus()
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
            .focus()
            .insertContent(`$${latex}$`)
            .run();
    };

    const handleInsertMathVisionRegions = (regions: MathRegion[]) => {
        if (!editor || !regions.length) return;

        const chain = editor.chain().focus().insertContent('<hr />');

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
        editor.chain().focus().insertContent('<hr />').insertContent(summaryHtml).run();
        setSummaryPanel(null);
        setToast('Resumen insertado en la nota');
        setTimeout(() => setToast(null), 3000);
    };

    const handleSolvePanelInsert = (content: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent('<hr />').insertContent(content).run();
        setSolveText(null);
    };

    const handleRecognized = (result: RecognitionResult) => {
        if (!editor) return;
        if (result.type === 'latex') {
            editor.chain().focus().insertContent(`$${result.content}$`).run();
        } else if (result.type === 'text') {
            editor.chain().focus().insertContent(result.content).run();
        } else {
            editor.chain().focus().insertContent(
                `<img src="${result.dataUrl}" alt="Dibuix" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
            ).run();
        }
        setMode('text');
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

    // ── FloatingObject handlers ──────────────────────────────────────────────

    const handleFloatDrag = useCallback((id: string, x: number, y: number) => {
        const current = floatingObjectsRef.current;
        const dragged = current.find(o => o.id === id);
        if (!dragged) return;

        const multiSelect = dragged.isSelected && current.filter(o => o.isSelected).length > 1;
        if (multiSelect) {
            const dx = x - dragged.position.x;
            const dy = y - dragged.position.y;
            setFloatingObjects(prev => prev.map(o => o.isSelected
                ? { ...o, position: { x: o.position.x + dx, y: o.position.y + dy } }
                : o
            ));
            return;
        }

        // Single-object drag: compute snap
        let finalX = x, finalY = y;
        if (current.length >= 2) {
            const others = current.filter(o => o.id !== id);
            const snap = computeSnap(dragged, others, x, y);
            finalX = snap.x;
            finalY = snap.y;
            setSnapLines(snap.lines);
        } else {
            setSnapLines([]);
        }

        setFloatingObjects(prev => {
            const updated = prev.map(o => o.id === id
                ? { ...o, position: { x: finalX, y: finalY } }
                : o
            );
            return recalcConnectors(updated, id);
        });
    }, []);

    const handleFloatDragEnd = useCallback(() => {
        setSnapLines([]);
    }, []);

    // ── Connector creation handlers ──────────────────────────────────────────

    const handleFloatConnectStart = useCallback((
        sourceId: string, handle: AnchorHandle, anchorX: number, anchorY: number
    ) => {
        connectingFromRef.current = { sourceId, handle, anchorX, anchorY };
        setConnectingPath(null);
    }, []);

    const handleFloatConnectMove = useCallback((clientX: number, clientY: number) => {
        const cf = connectingFromRef.current;
        if (!cf || !layerContainerRef.current) return;
        const rect = layerContainerRef.current.getBoundingClientRect();
        const tx = clientX - rect.left, ty = clientY - rect.top;
        const { anchorX: sx, anchorY: sy, handle } = cf;
        const dirs: Record<string, [number, number]> = { n: [0,-1], s: [0,1], e: [1,0], w: [-1,0] };
        const [ddx, ddy] = dirs[handle] ?? [1, 0];
        const dist = Math.max(Math.hypot(tx - sx, ty - sy), 1);
        const off = Math.min(dist * 0.5, 70);
        setConnectingPath(
            `M ${sx},${sy} C ${sx + ddx * off},${sy + ddy * off} ${tx - (tx - sx) / dist * 20},${ty - (ty - sy) / dist * 20} ${tx},${ty}`
        );
    }, []);

    const handleFloatConnectEnd = useCallback((clientX: number, clientY: number) => {
        const cf = connectingFromRef.current;
        connectingFromRef.current = null;
        setConnectingPath(null);
        if (!cf || !layerContainerRef.current) return;
        const rect = layerContainerRef.current.getBoundingClientRect();
        const cx = clientX - rect.left, cy = clientY - rect.top;
        const current = floatingObjectsRef.current;
        const target = current.find(o =>
            o.id !== cf.sourceId &&
            o.type !== 'connector' &&
            cx >= o.position.x && cx <= o.position.x + o.dimensions.width &&
            cy >= o.position.y && cy <= o.position.y + o.dimensions.height
        );
        if (!target) return;
        const source = current.find(o => o.id === cf.sourceId);
        if (!source) return;
        const srcAnchor = { x: cf.anchorX, y: cf.anchorY, handle: cf.handle };
        const tgtAnchor = closestAnchor(srcAnchor, target);
        const built = buildConnectorData(srcAnchor.x, srcAnchor.y, srcAnchor.handle, tgtAnchor.x, tgtAnchor.y, tgtAnchor.handle);
        const connObj: FloatingObject = {
            id: crypto.randomUUID(),
            type: 'connector',
            ...built,
            sourceId: cf.sourceId,
            targetId: target.id,
            arrowEnd: true,
            arrowStart: false,
            stroke: '#3B82F6',
            strokeWidth: 1.5,
            isSelected: false,
            rotation: 0,
        };
        setFloatingObjects(prev => [...prev, connObj]);
    }, []);

    const handleFloatArrowChange = useCallback((id: string, arrowStart: boolean, arrowEnd: boolean) => {
        setFloatingObjects(prev => prev.map(o => o.id === id ? { ...o, arrowStart, arrowEnd } : o));
    }, []);

    const handleFloatSelect = useCallback((id: string) => {
        setFloatingObjects(prev =>
            prev.map(o => ({ ...o, isSelected: o.id === id }))
        );
    }, []);

    const handleFloatDeselect = useCallback(() => {
        setFloatingObjects(prev =>
            prev.map(o => ({ ...o, isSelected: false }))
        );
    }, []);

    const handleFloatResize = useCallback((id: string, x: number, y: number, width: number, height: number) => {
        setFloatingObjects(prev =>
            prev.map(o => o.id === id
                ? { ...o, position: { x, y }, dimensions: { width, height } }
                : o
            )
        );
    }, []);

    const handleFloatDelete = useCallback((id: string) => {
        setFloatingObjects(prev => prev.filter(o => o.id !== id));
    }, []);

    const handleFloatColorChange = useCallback((id: string, color: string) => {
        setFloatingObjects(prev =>
            prev.map(o => o.id === id ? { ...o, stroke: color } : o)
        );
    }, []);

    const handleFloatStrokeWidthChange = useCallback((id: string, width: number) => {
        setFloatingObjects(prev =>
            prev.map(o => o.id === id ? { ...o, strokeWidth: width } : o)
        );
    }, []);

    const handleFloatFillChange = useCallback((id: string, fill: string) => {
        setFloatingObjects(prev =>
            prev.map(o => o.id === id ? { ...o, fill } : o)
        );
    }, []);

    const handleGroupDelete = useCallback(() => {
        setFloatingObjects(prev => prev.filter(o => !o.isSelected));
    }, []);

    // ── Lasso handlers ───────────────────────────────────────────────────────

    const handleLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (
            target.closest('[data-floating-object]') ||
            target.closest('.ProseMirror') ||
            inkMode
        ) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleFloatDeselect();
        lassoRef.current = { active: false, startX: x, startY: y, points: [{ x, y }] };
    };

    const handleLayerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!lassoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!lassoRef.current.active) {
            const dx = x - lassoRef.current.startX;
            const dy = y - lassoRef.current.startY;
            if (Math.hypot(dx, dy) < 6) return;
            lassoRef.current.active = true;
        }
        lassoRef.current.points.push({ x, y });
        setLassoPoints([...lassoRef.current.points]);
    };

    const handleLayerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!lassoRef.current?.active) {
            lassoRef.current = null;
            setLassoPoints([]);
            return;
        }
        const polygon = lassoRef.current.points;
        lassoRef.current = null;
        setFloatingObjects(prev => prev.map(o => ({ ...o, isSelected: isObjectInLasso(o, polygon) })));
        setLassoPoints([]);
    };

    const handleOcrText = useCallback((text: string, cx: number, cy: number) => {
        if (!editor) return;
        insertTextAt(editor, text, inkCanvasRef.current?.getSvgElement() ?? null, cx, cy);
    }, [editor]);

    const handleFloatLatexChange = useCallback((id: string, latex: string) => {
        setFloatingObjects(prev =>
            prev.map(o => o.id === id ? { ...o, latexSource: latex } : o)
        );
    }, []);

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
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500">
                        {syncStatus === 'syncing' && (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                                <span className="text-blue-400">Guardant...</span>
                            </>
                        )}
                        {syncStatus === 'synced' && (
                            <>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                <span className="text-emerald-500">Sincronitzat</span>
                            </>
                        )}
                        {syncStatus === 'local' && (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                                <span className="text-slate-600">Local</span>
                            </>
                        )}
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
                    <ToolBtn onClick={() => setInkMode(!inkMode)} title="Modo Dibujo Inteligente" accent={inkMode}>
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
                <div ref={editorAreaRef} className="flex-1 overflow-y-auto px-6 sm:px-16 py-16 scrollbar-hide relative">
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

                        {/* ── Layer stack ─────────────────────────────── */}
                        {(() => {
                            const selectedObjs = floatingObjects.filter(o => o.isSelected);
                            const groupBbox = selectedObjs.length > 1 ? computeGroupBbox(selectedObjs) : null;
                            return (
                        <div
                            ref={layerContainerRef}
                            style={{ position: 'relative', width: '100%', minHeight: '100%' }}
                            onPointerDown={handleLayerPointerDown}
                            onPointerMove={handleLayerPointerMove}
                            onPointerUp={handleLayerPointerUp}
                            onPointerCancel={handleLayerPointerUp}
                        >
                            {/* LAYER 1 — Rich text (base) */}
                            <RichEditor
                                content={content}
                                onChange={setContent}
                                isTypingAI={isTypingAI}
                                onEditorReady={setEditor}
                                onEqualsDetected={(show, pos, resolve) =>
                                    setMathPill({ visible: show, pos, resolve: resolve ?? (() => {}) })
                                }
                                inkMode={inkMode}
                                toggleInk={toggleInk}
                            />

                            {/* LAYER 2 — Floating objects */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 2,
                                    pointerEvents: 'none',
                                }}
                            >
                                {floatingObjects.map(obj => (
                                    <FloatingObjectComponent
                                        key={obj.id}
                                        object={obj}
                                        onDrag={handleFloatDrag}
                                        onDragEnd={handleFloatDragEnd}
                                        onSelect={handleFloatSelect}
                                        onResize={handleFloatResize}
                                        onDelete={handleFloatDelete}
                                        onColorChange={handleFloatColorChange}
                                        onStrokeWidthChange={handleFloatStrokeWidthChange}
                                        onFillChange={handleFloatFillChange}
                                        onLatexChange={handleFloatLatexChange}
                                        onConnectStart={!inkMode ? handleFloatConnectStart : undefined}
                                        onConnectMove={handleFloatConnectMove}
                                        onConnectEnd={handleFloatConnectEnd}
                                        onArrowChange={handleFloatArrowChange}
                                    />
                                ))}
                            </div>

                            {/* LAYER 2.5 — SVG overlay: lasso + snap lines + connectors */}
                            <svg
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%',
                                    zIndex: 2, pointerEvents: 'none',
                                    overflow: 'visible',
                                }}
                            >
                                {lassoPoints.length > 2 && (
                                    <polygon
                                        points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        stroke="#3B82F6"
                                        strokeWidth={1.5}
                                        strokeDasharray="6,3"
                                        fill="rgba(59,130,246,0.05)"
                                    />
                                )}
                                {groupBbox && (
                                    <rect
                                        x={groupBbox.x - 6} y={groupBbox.y - 6}
                                        width={groupBbox.width + 12} height={groupBbox.height + 12}
                                        stroke="#3B82F6" strokeWidth={1}
                                        strokeDasharray="6,3" fill="none"
                                    />
                                )}
                                {snapLines.map((sl, i) => (
                                    <line key={i}
                                        x1={sl.x1} y1={sl.y1} x2={sl.x2} y2={sl.y2}
                                        stroke="#3B82F6" strokeWidth={1} opacity={0.6}
                                    />
                                ))}
                                {connectingPath && (
                                    <path
                                        d={connectingPath}
                                        stroke="#3B82F6" strokeWidth={1.5}
                                        strokeDasharray="6,3" fill="none" opacity={0.8}
                                    />
                                )}
                            </svg>

                            {/* Group delete button */}
                            {groupBbox && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: groupBbox.x + groupBbox.width - 11,
                                        top: groupBbox.y - 32,
                                        zIndex: 5, pointerEvents: 'auto',
                                        background: '#ef4444', borderRadius: '50%',
                                        width: 22, height: 22,
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', cursor: 'pointer',
                                    }}
                                    onPointerDown={(e) => { e.stopPropagation(); handleGroupDelete(); }}
                                >
                                    <Trash2 size={12} color="#fff" />
                                </div>
                            )}

                            {/* LAYER 3 — Ink canvas (drawing mode only) */}
                            {inkMode && (
                                <InkCanvas
                                    ref={inkCanvasRef}
                                    active={inkMode}
                                    strokeWidth={strokeWidth}
                                    onChangeStrokes={onStrokeFinish}
                                    onStrokeObject={handleStrokesToObject}
                                    onOcrText={handleOcrText}
                                    processingStatus={autoStatus}
                                />
                            )}
                        </div>
                        );
                        })()}
                        {inkMode && (
                            <>
                                <InkToolbar
                                    active={inkMode}
                                    thickness={strokeWidth}
                                    onThicknessChange={setStrokeWidth}
                                    onUndo={() => {
                                        // Undo logic could be added here or via event
                                        window.dispatchEvent(new CustomEvent('canvas-undo'));
                                    }}
                                    onClear={() => {
                                        if (inkCanvasRef.current) {
                                            // Simplest way to clear for now is re-mounting or a ref method
                                            setInkMode(false);
                                            setTimeout(() => setInkMode(true), 0);
                                        }
                                    }}
                                    onEraser={() => {
                                        setToast('Borrador: Usa el botón de limpiar para empezar de nuevo');
                                        setTimeout(() => setToast(null), 3000);
                                    }}
                                    onBeautify={async () => {
                                        if (!inkCanvasRef.current) return;
                                        setProcessing(true);
                                        setIsFlashActive(true);
                                        setTimeout(() => setIsFlashActive(false), 300);
                                        
                                        const base64 = await inkCanvasRef.current.captureCanvas();
                                        try {
                                            const result = await postCanvasForOcr(base64);
                                            if (!result) {
                                                setToast('⚠️ Necesitas plan Pro para usar esta función');
                                                return;
                                            }
                                            if (result.type === 'text') {
                                                handleDrawingToText(result.content);
                                            } else if (result.type === 'latex') {
                                                handleInsertAsLatex(result.content);
                                            } else if (result.type === 'svg') {
                                                handleInsertDrawingAsImage(result.content);
                                            }
                                            setToast('✨ Convertido con éxito');
                                        } catch (e) {
                                            setToast('⚠️ Error procesando dibujo');
                                        } finally {
                                            setProcessing(false);
                                            setInkMode(false);
                                            setTimeout(() => setToast(null), 3000);
                                        }
                                    }}
                                    processing={processing}
                                />
                            </>
                        )}

                        {/* Flash Effect */}
                        {isFlashActive && (
                            <div className="fixed inset-0 z-[2000] bg-white/20 pointer-events-none animate-pulse" />
                        )}
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

            <MathPill
                visible={mathPill.visible}
                position={mathPill.pos}
                onResolve={mathPill.resolve}
            />

            {editor && (
                <SelectionMenu
                    editor={editor}
                    onOpenSolvePanel={(text) => setSolveText(text)}
                />
            )}
            {solveText && (
                <SolvePanel
                    selectedText={solveText}
                    onClose={() => setSolveText(null)}
                    onInsert={handleSolvePanelInsert}
                />
            )}
        </div>
    );
};
