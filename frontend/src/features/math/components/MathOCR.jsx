import { useRef, useState, useEffect, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { mathOCR, mathSolve } from "../../../api/mathApi";

const CANVAS_W = 720;
const CANVAS_H = 320;
const STROKE_COLOR = "#6366f1";
const STROKE_WIDTH = 3.5;
const AUTO_RECOGNIZE_MS = 700;

function canvasToBase64(canvas) {
    return canvas.toDataURL("image/png").split(",")[1];
}

function renderKatex(latex) {
    try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
        return `<span class="text-red-400 opacity-50 text-base">${latex}</span>`;
    }
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

const getBoundingBox = (pts) => {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

const isClosed = (pts, threshold) => {
    if (pts.length < 8) return false;
    const t = threshold || 40;
    const dx = pts[0].x - pts[pts.length - 1].x;
    const dy = pts[0].y - pts[pts.length - 1].y;
    return Math.sqrt(dx * dx + dy * dy) < t;
};

const simplifyRDP = (pts, eps = 13) => {
    if (pts.length <= 2) return pts;
    const [p1, p2] = [pts[0], pts[pts.length - 1]];
    const denom = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        const d = Math.abs((p2.y - p1.y) * pts[i].x - (p2.x - p1.x) * pts[i].y + p2.x * p1.y - p2.y * p1.x) / denom;
        if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > eps) {
        return [...simplifyRDP(pts.slice(0, maxIdx + 1), eps).slice(0, -1), ...simplifyRDP(pts.slice(maxIdx), eps)];
    }
    return [p1, p2];
};

// Find the 3 best triangle corners from the simplified polygon
function extractTriangleCorners(pts) {
    const simp = simplifyRDP(pts, 10);
    if (simp.length < 3) return null;

    // Take first 3 points from the simplified polygon — they represent the main corners
    // Ensure we don't overshoot
    const verts = simp.slice(0, Math.min(4, simp.length));

    // Sort by Y to find apex (min Y = highest on screen) and base points
    const sorted = [...verts].sort((a, b) => a.y - b.y);
    const apex = sorted[0];
    const rest = sorted.slice(1).sort((a, b) => a.x - b.x);
    const baseL = rest[0];
    const baseR = rest[rest.length - 1];

    return { apex, baseL, baseR };
}

const detectShape = (pts) => {
    if (pts.length < 8) return null;
    const bb = getBoundingBox(pts);
    const diagSize = Math.sqrt(bb.w ** 2 + bb.h ** 2);
    const closed = isClosed(pts, Math.max(28, diagSize * 0.18));
    const aspect = bb.w / (bb.h || 1);

    if (!closed) {
        const first = pts[0], last = pts[pts.length - 1];
        const dx = last.x - first.x, dy = last.y - first.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 20) return null;
        const maxDev = pts.reduce((max, p) => {
            const d = Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / len;
            return Math.max(max, d);
        }, 0);
        if (maxDev < len * 0.13) {
            const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
            const orientation = angle < 22 ? 'horizontal' : angle > 68 ? 'vertical' : 'diagonal';
            return { type: 'Línea', orientation, start: first, end: last, bb };
        }
        return null;
    }

    const simplified = simplifyRDP(pts, 14);
    const n = simplified.length;

    const strokePerim = pts.reduce((s, p, i) => {
        const q = pts[(i + 1) % pts.length];
        return s + Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2);
    }, 0);
    const polyPerim = simplified.reduce((s, p, i) => {
        if (i === 0) return 0;
        return s + Math.sqrt((p.x - simplified[i - 1].x) ** 2 + (p.y - simplified[i - 1].y) ** 2);
    }, 0) + Math.sqrt((simplified[0].x - simplified[n - 1].x) ** 2 + (simplified[0].y - simplified[n - 1].y) ** 2);
    const curvature = strokePerim / (polyPerim || 1);

    if (n <= 4 && curvature > 1.12) return { type: 'Círculo', bb };
    if (n >= 7) return { type: 'Círculo', bb };

    // Triangle: preserve actual corners for proper isosceles/scalene rendering
    if (n <= 4) {
        const corners = extractTriangleCorners(pts);
        return { type: 'Triángulo', bb, corners };
    }

    if (n >= 6 && n <= 8) return { type: 'Pentágono', bb };

    if (aspect >= 0.80 && aspect <= 1.25) return { type: 'Cuadrado', bb };
    return { type: 'Rectángulo', bb };
};

const drawPerfectShape = (ctx, shape, color = "#818cf8") => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    const { bb } = shape;

    if (shape.type === 'Círculo') {
        ctx.ellipse(bb.cx, bb.cy, bb.w / 2, bb.h / 2, 0, 0, Math.PI * 2);

    } else if (shape.type === 'Cuadrado') {
        const side = (bb.w + bb.h) / 2;
        ctx.roundRect(bb.cx - side / 2, bb.cy - side / 2, side, side, 2);

    } else if (shape.type === 'Rectángulo') {
        ctx.roundRect(bb.minX, bb.minY, bb.w, bb.h, 3);

    } else if (shape.type === 'Triángulo') {
        const { corners } = shape;
        if (corners) {
            const { apex, baseL, baseR } = corners;

            // Snap base to same Y if the two base points are nearly at the same height
            const baseDeltaY = Math.abs(baseL.y - baseR.y);
            const snapBaseY = baseDeltaY < bb.h * 0.15
                ? (baseL.y + baseR.y) / 2
                : null;

            // Snap apex X to the base midpoint if drawing is roughly isosceles
            const baseMidX = (baseL.x + baseR.x) / 2;
            const apexOffsetRatio = Math.abs(apex.x - baseMidX) / (bb.w || 1);
            const finalApexX = apexOffsetRatio < 0.22 ? baseMidX : apex.x;

            ctx.moveTo(finalApexX, apex.y);
            ctx.lineTo(baseL.x, snapBaseY ?? baseL.y);
            ctx.lineTo(baseR.x, snapBaseY ?? baseR.y);
        } else {
            // Fallback: isosceles from bounding box
            ctx.moveTo(bb.cx, bb.minY);
            ctx.lineTo(bb.maxX, bb.maxY);
            ctx.lineTo(bb.minX, bb.maxY);
        }
        ctx.closePath();

    } else if (shape.type === 'Pentágono') {
        const r = Math.min(bb.w, bb.h) / 2;
        for (let i = 0; i < 5; i++) {
            const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const x = bb.cx + r * Math.cos(a), y = bb.cy + r * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();

    } else if (shape.type === 'Línea') {
        if (shape.orientation === 'vertical') {
            ctx.moveTo(bb.cx, bb.minY);
            ctx.lineTo(bb.cx, bb.maxY);
        } else if (shape.orientation === 'diagonal') {
            ctx.moveTo(shape.start.x, shape.start.y);
            ctx.lineTo(shape.end.x, shape.end.y);
        } else {
            ctx.moveTo(bb.minX, bb.cy);
            ctx.lineTo(bb.maxX, bb.cy);
        }
    }

    ctx.stroke();
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MathOCR({ onResult } = {}) {
    const canvasRef = useRef(null);
    const resultPanelRef = useRef(null);
    const [allStrokes, setAllStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcResult, setCalcResult] = useState(null);
    const [calcSteps, setCalcSteps] = useState([]);
    const [calcExplanation, setCalcExplanation] = useState('');
    const [error, setError] = useState(null);
    const [autoMode, setAutoMode] = useState(true);
    const [snapActive, setSnapActive] = useState(null);
    const [autoRecognizing, setAutoRecognizing] = useState(false);
    const autoRecognizeRef = useRef(null);
    const allStrokesRef = useRef([]);

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const clientX = (e.clientX || (e.touches && e.touches[0].clientX));
        const clientY = (e.clientY || (e.touches && e.touches[0].clientY));
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const redraw = useCallback(() => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        allStrokes.forEach(s => {
            if (s.shape) drawPerfectShape(ctx, s.shape);
            else {
                ctx.beginPath(); ctx.strokeStyle = STROKE_COLOR; ctx.lineWidth = STROKE_WIDTH;
                ctx.lineJoin = ctx.lineCap = "round";
                ctx.moveTo(s.points[0].x, s.points[0].y);
                s.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
            }
        });

        if (currentStroke) {
            ctx.beginPath(); ctx.strokeStyle = STROKE_COLOR; ctx.lineWidth = STROKE_WIDTH;
            ctx.lineJoin = ctx.lineCap = "round";
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            currentStroke.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
        }
    }, [allStrokes, currentStroke]);

    useEffect(() => { redraw(); }, [redraw]);

    // Scroll result panel into view when result appears
    useEffect(() => {
        if (result && resultPanelRef.current) {
            resultPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [result]);

    const onStart = (e) => {
        if (e.touches && e.touches.length >= 2) {
            isPanningRef.current = true;
            panStartY.current = e.touches[0].clientY;
            setIsDrawing(false);
            setCurrentStroke(null);
            return;
        }
        e.preventDefault();
        setIsDrawing(true);
        setCurrentStroke([getPos(e)]);
    };
    const onMove = (e) => {
        if (isPanningRef.current && e.touches && e.touches.length >= 2) {
            const dy = panStartY.current - e.touches[0].clientY;
            const scrollEl = canvasRef.current?.closest('[class*="overflow-y"]') ||
                             canvasRef.current?.closest('.overflow-y-auto') ||
                             document.querySelector('.overflow-y-auto');
            if (scrollEl) scrollEl.scrollTop += dy;
            panStartY.current = e.touches[0].clientY;
            return;
        }
        if (isDrawing) { e.preventDefault(); setCurrentStroke(p => [...p, getPos(e)]); }
    };
    const onEnd   = () => {
        if (isPanningRef.current) { isPanningRef.current = false; return; }
        if (!isDrawing) return;
        setIsDrawing(false);
        const pts = currentStroke;
        if (pts?.length > 2) {
            const detected = autoMode ? detectShape(pts) : null;
            if (detected) {
                setSnapActive(detected.type);
                setTimeout(() => setSnapActive(null), 1500);
            }
            setAllStrokes(p => {
                const next = [...p, { points: pts, shape: detected }];
                allStrokesRef.current = next;
                return next;
            });

            clearTimeout(autoRecognizeRef.current);
            setAutoRecognizing(true);
            autoRecognizeRef.current = setTimeout(async () => {
                const strokes = allStrokesRef.current;
                if (strokes.length === 0) { setAutoRecognizing(false); return; }
                setAutoRecognizing(false);
                setLoading(true);
                setError(null);
                try {
                    const raw = strokes.map(s => s.points);
                    const data = await mathOCR(raw, canvasToBase64(canvasRef.current));
                    setResult(data);
                    if (data?.latex && onResult) onResult(data.latex);
                } catch (e) { setError(e.message); }
                finally { setLoading(false); }
            }, AUTO_RECOGNIZE_MS);
        }
        setCurrentStroke(null);
    };

    const clearAll = useCallback(() => {
        clearTimeout(autoRecognizeRef.current);
        setAutoRecognizing(false);
        allStrokesRef.current = [];
        setAllStrokes([]);
        setResult(null);
        setCalcResult(null);
        setCalcSteps([]);
        setCalcExplanation('');
        setError(null);
    }, []);

    const undoLast = useCallback(() => {
        clearTimeout(autoRecognizeRef.current);
        setAutoRecognizing(false);
        setAllStrokes(p => {
            const next = p.slice(0, -1);
            allStrokesRef.current = next;
            return next;
        });
    }, []);

    async function handleRecognize() {
        clearTimeout(autoRecognizeRef.current);
        setAutoRecognizing(false);
        if (allStrokes.length === 0) return;
        setLoading(true); setError(null);
        try {
            const raw = allStrokes.map(s => s.points);
            const data = await mathOCR(raw, canvasToBase64(canvasRef.current));
            setResult(data);
            if (data?.latex && onResult) onResult(data.latex);
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }

    async function handleCalculate() {
        if (!result?.latex) return;
        setCalcLoading(true);
        setCalcResult(null); setCalcSteps([]); setCalcExplanation('');
        try {
            const data = await mathSolve(result.latex);
            setCalcResult(data.result || "");
            setCalcSteps(data.steps || []);
            setCalcExplanation(data.explanation || "");
        } catch (e) {
            setCalcResult("\\text{Error al resolver}");
            setCalcExplanation(e.message || "");
        } finally { setCalcLoading(false); }
    }

    const hasContent = allStrokes.length > 0;
    const showResultPanel = loading || autoRecognizing || result;

    return (
        <div className="bg-[#030712]/60 p-8 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-5xl mx-auto font-sans">

            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-4xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 relative">
                    ∑
                    {loading && <div className="absolute inset-[-4px] border-2 border-indigo-500/40 border-t-transparent rounded-full animate-spin" />}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-white tracking-tight leading-7">Lápiz Inteligente</h2>
                    <p className="text-sm text-slate-500 font-medium">Escribe números, fórmulas o dibuja figuras</p>
                </div>
                <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${autoMode ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-600/10' : 'bg-white/5 border-white/10 text-slate-500 grayscale'}`}
                >
                    {autoMode ? '✦ Shape Snap ON' : 'Shape Snap OFF'}
                </button>
            </div>

            {/* Canvas */}
            <div className="relative group">
                <div className="bg-black/60 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner aspect-[16/7]">
                    <canvas
                        ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                        className="w-full h-full cursor-crosshair touch-none"
                        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd}
                        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
                    />
                    {!hasContent && !loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-10">
                            <span className="text-8xl mb-4 font-black">✏️</span>
                            <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-400">Escribe aquí</p>
                        </div>
                    )}
                </div>

                {snapActive && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-xl animate-in fade-in zoom-in-90 slide-in-from-top-4">
                        Perfeccionando {snapActive}…
                    </div>
                )}

                {(autoRecognizing || loading) && !snapActive && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur rounded-full border border-indigo-500/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                            {loading ? "Embelleciendo…" : "Analizando…"}
                        </span>
                    </div>
                )}
            </div>

            {/* ── KaTeX Result Panel — always visible once active ── */}
            {showResultPanel && (
                <div
                    ref={resultPanelRef}
                    className="mt-5 rounded-[2rem] border border-indigo-500/15 bg-indigo-600/[0.04] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-400"
                >
                    {/* Label row */}
                    <div className="flex items-center justify-between px-6 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${loading || autoRecognizing ? 'bg-indigo-400 animate-ping' : 'bg-emerald-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/70">
                                {loading || autoRecognizing ? 'Reconociendo…' : 'Renderización KaTeX'}
                            </span>
                        </div>
                        {result?.latex && (
                            <button
                                onClick={() => navigator.clipboard.writeText(`$$${result.latex}$$`)}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-400 transition-colors"
                            >
                                Copiar LaTeX
                            </button>
                        )}
                    </div>

                    {/* Math display */}
                    <div className="flex items-center justify-center min-h-[100px] px-6 pb-4">
                        {(loading || autoRecognizing) && !result ? (
                            <div className="flex gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-500/40 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                                ))}
                            </div>
                        ) : result?.latex ? (
                            <div
                                className="text-4xl md:text-5xl text-white transition-all"
                                dangerouslySetInnerHTML={{ __html: renderKatex(result.latex) }}
                            />
                        ) : null}
                    </div>

                    {/* Resolver button */}
                    {result?.latex && !calcResult && (
                        <div className="px-6 pb-5 flex justify-center">
                            <button
                                onClick={handleCalculate}
                                disabled={calcLoading}
                                className="px-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all shadow-xl"
                            >
                                {calcLoading ? "Calculando…" : "⚡ Resolver y simplificar"}
                            </button>
                        </div>
                    )}

                    {/* Calculation result */}
                    {calcResult && (
                        <div className="px-6 pb-6 pt-2 border-t border-indigo-500/10 space-y-5">
                            {calcSteps.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Pasos</span>
                                    <div className="space-y-2.5">
                                        {calcSteps.map((step, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-[9px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                                                <div className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: renderKatex(step) }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black">✓</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Resultado</span>
                                </div>
                                <div className="text-3xl text-center text-slate-300" dangerouslySetInnerHTML={{ __html: renderKatex(calcResult) }} />
                                {calcExplanation && (
                                    <p className="mt-3 text-xs text-slate-500 text-center leading-relaxed">{calcExplanation}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4 mt-5">
                <button
                    onClick={undoLast}
                    disabled={!hasContent}
                    className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-20"
                >
                    ↩ Deshacer
                </button>
                <button
                    onClick={clearAll}
                    disabled={!hasContent}
                    className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-20"
                >
                    🗑 Limpiar
                </button>
                <button
                    onClick={handleRecognize}
                    disabled={!hasContent || loading}
                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-20 active:scale-[0.98]"
                >
                    {loading ? "Reconociendo…" : "⚡ Digitalizar ahora"}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-4 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-100 text-[13px] font-bold flex items-center gap-3">
                    <span className="text-lg">⚠</span> {error}
                </div>
            )}
        </div>
    );
}
