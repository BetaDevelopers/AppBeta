import { useRef, useState, useEffect, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { mathOCR, mathFix } from "../../../api/mathApi";

const CANVAS_W = 720;
const CANVAS_H = 320;
const STROKE_COLOR = "#6366f1"; // Indigo
const STROKE_WIDTH = 3.5;

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

// --- Shape Detection ---
const getBoundingBox = (pts) => {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

const isClosed = (pts, threshold = 40) => {
    if (pts.length < 6) return false;
    const dx = pts[0].x - pts[pts.length - 1].x;
    const dy = pts[0].y - pts[pts.length - 1].y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
};

const countCorners = (pts, angleThreshold = 45) => {
    if (pts.length < 5) return 0;
    const step = Math.max(1, Math.floor(pts.length / 15));
    let corners = 0;
    for (let i = step; i < pts.length - step; i += step) {
        const prev = pts[i - step], curr = pts[i], next = pts[i + step];
        const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let diff = Math.abs((a2 - a1) * 180 / Math.PI);
        if (diff > 180) diff = 360 - diff;
        if (diff > angleThreshold) corners++;
    }
    return corners;
};

const detectShape = (pts) => {
    if (pts.length < 10) return null;
    const bb = getBoundingBox(pts);
    const closed = isClosed(pts);
    const aspect = bb.w / bb.h;
    const corners = countCorners(pts);

    if (!closed) {
        const dx = pts[pts.length - 1].x - pts[0].x, dy = pts[pts.length - 1].y - pts[0].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 30) return null;
        const maxDev = pts.reduce((max, p) => {
            const dev = Math.abs(dy * p.x - dx * p.y + pts[pts.length - 1].x * pts[0].y - pts[pts.length - 1].y * pts[0].x) / len;
            return Math.max(max, dev);
        }, 0);
        if (maxDev < len * 0.15) return { type: 'Línea', bb };
        return null;
    }

    if (corners <= 2 && aspect >= 0.7 && aspect <= 1.4) return { type: 'Círculo', bb };
    if (corners >= 3 && corners <= 5) {
        if (corners === 3) return { type: 'Triángulo', bb };
        return { type: 'Cuadrilátero', bb };
    }
    return null;
};

const drawPerfectShape = (ctx, shape, color = "#818cf8") => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    const { bb } = shape;
    if (shape.type === 'Círculo') {
        ctx.arc(bb.cx, bb.cy, Math.min(bb.w, bb.h) / 2, 0, Math.PI * 2);
    } else if (shape.type === 'Cuadrilátero') {
        ctx.roundRect(bb.minX, bb.minY, bb.w, bb.h, 4);
    } else if (shape.type === 'Triángulo') {
        ctx.moveTo(bb.cx, bb.minY); ctx.lineTo(bb.maxX, bb.maxY); ctx.lineTo(bb.minX, bb.maxY); ctx.closePath();
    } else if (shape.type === 'Línea') {
        ctx.moveTo(bb.minX, bb.cy); ctx.lineTo(bb.maxX, bb.cy);
    }
    ctx.stroke();
};

export default function MathOCR({ onResult } = {}) {
    const canvasRef = useRef(null);
    const [allStrokes, setAllStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcResult, setCalcResult] = useState(null);
    const [error, setError] = useState(null);
    const [autoMode, setAutoMode] = useState(true);
    const [snapActive, setSnapActive] = useState(null);

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
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            currentStroke.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
        }
    }, [allStrokes, currentStroke]);

    useEffect(() => { redraw(); }, [redraw]);

    const onStart = (e) => { e.preventDefault(); setIsDrawing(true); setCurrentStroke([getPos(e)]); };
    const onMove = (e) => { if (isDrawing) { e.preventDefault(); setCurrentStroke(p => [...p, getPos(e)]); } };
    const onEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const pts = currentStroke;
        if (pts?.length > 2) {
            const detected = autoMode ? detectShape(pts) : null;
            if (detected) {
                setSnapActive(detected.type);
                setTimeout(() => setSnapActive(null), 1500);
            }
            setAllStrokes(p => [...p, { points: pts, shape: detected }]);
        }
        setCurrentStroke(null);
    };

    async function handleRecognize() {
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
        try {
            const data = await mathFix(result.latex);
            setCalcResult(data.fixedText || data.content_markdown || data.latex || "");
        } catch { setCalcResult("Error al calcular"); } finally { setCalcLoading(false); }
    }

    return (
        <div className="bg-[#030712]/60 p-8 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-5xl mx-auto font-sans">
            <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-4xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 relative">
                    ∑
                    {loading && <div className="absolute inset-[-4px] border-2 border-indigo-500/40 border-t-transparent rounded-full animate-spin" />}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-white tracking-tight leading-7">Calculadora Digital Pro</h2>
                    <p className="text-sm text-slate-500 font-medium">Digitaliza fórmulas y formas con precisión científica</p>
                </div>
                <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${autoMode ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-600/10' : 'bg-white/5 border-white/10 text-slate-500 grayscale'}`}
                >
                    {autoMode ? '✦ Shape Snap ON' : 'Shape Snap OFF'}
                </button>
            </div>

            <div className="relative group">
                <div className="bg-black/60 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner aspect-[16/7]">
                    <canvas
                        ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                        className="w-full h-full cursor-crosshair touch-none"
                        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd}
                        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
                    />
                    {allStrokes.length === 0 && !loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-10">
                            <span className="text-8xl mb-4 font-black">✏️</span>
                            <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-400">Escribe tus ecuaciones</p>
                        </div>
                    )}
                </div>

                {snapActive && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-xl animate-in fade-in zoom-in-90 slide-in-from-top-4">
                        Perfeccionando {snapActive}...
                    </div>
                )}
            </div>

            <div className="flex gap-4 mt-6">
                <button
                    onClick={() => { setAllStrokes(p => { const n = p.slice(0, -1); return n; }); }}
                    disabled={allStrokes.length === 0}
                    className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-20"
                >
                    ↩ Deshacer
                </button>
                <button
                    onClick={() => { setAllStrokes([]); setResult(null); setCalcResult(null); }}
                    disabled={allStrokes.length === 0}
                    className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-20"
                >
                    🗑 Limpiar
                </button>
                <button
                    onClick={handleRecognize}
                    disabled={allStrokes.length === 0 || loading}
                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-20 active:scale-[0.98]"
                >
                    {loading ? "Reconociendo Escritura..." : "⚡ Digitalizar Expresión"}
                </button>
            </div>

            {(result || calcResult) && (
                <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                    <div className="bg-indigo-600/[0.03] border border-indigo-500/10 rounded-[2.5rem] p-10 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8 opacity-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Renderización KaTeX</span>
                            <div className="h-px flex-1 bg-indigo-500/10 mx-6" />
                            <button
                                onClick={() => navigator.clipboard.writeText(`$$${result?.latex}$$`)}
                                className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors"
                            >
                                Copiar LaTeX
                            </button>
                        </div>

                        <div className="flex items-center justify-center min-h-[140px] text-white">
                            <div
                                className="text-4xl md:text-6xl transition-all"
                                dangerouslySetInnerHTML={{ __html: renderKatex(result?.latex || '') }}
                            />
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-4">
                            {!calcResult && (
                                <button
                                    onClick={handleCalculate}
                                    disabled={calcLoading}
                                    className="px-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all shadow-xl"
                                >
                                    {calcLoading ? "Calculando Pasos..." : "⚡ Resolver y Simplificar"}
                                </button>
                            )}

                            {calcResult && (
                                <div className="w-full pt-8 border-t border-indigo-500/10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black">✓</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Solución Propuesta</span>
                                    </div>
                                    <div
                                        className="text-2xl md:text-4xl text-center text-slate-300"
                                        dangerouslySetInnerHTML={{ __html: renderKatex(calcResult) }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-100 text-[13px] font-bold flex items-center gap-3">
                    <span className="text-lg">⚠</span> {error}
                </div>
            )}
        </div>
    );
}
