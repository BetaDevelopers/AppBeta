import { useRef, useState, useEffect, useCallback } from "react";
import { vectorizeShape } from "../../../api/mathApi";

export default function GeometryCanvas({ onResult } = {}) {
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const CANVAS_W = 500;
    const CANVAS_H = 320;

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(167, 139, 250, 0.6)";

        if (points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
        }
    }, [points]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    async function handleSnap(rawPoints) {
        if (rawPoints.length < 5) return;
        setLoading(true);
        setError(null);
        try {
            const data = await vectorizeShape(rawPoints);
            setResult(data);
            if (data?.svgElement && onResult) {
                // Return a clean version of the SVG for the editor
                onResult(data.svgElement);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const onStart = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        setPoints([getPos(e)]);
        setResult(null);
        setError(null);
    };

    const onMove = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        setPoints(prev => [...prev, getPos(e)]);
    };

    const onEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (points.length > 5) handleSnap(points);
    };

    const clear = () => {
        setPoints([]);
        setResult(null);
        setError(null);
    };

    return (
        <div className="bg-[#0f172a]/40 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl max-w-xl mx-auto font-sans">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30">
                    📐
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Geometry Lab</h2>
                    <p className="text-xs text-slate-400 font-medium">Draw rough shapes → Get perfect SVG geometry</p>
                </div>
            </div>

            <div className="relative bg-black/40 rounded-3xl border border-white/5 overflow-hidden shadow-inner group">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="w-full h-auto cursor-crosshair touch-none"
                    onMouseDown={onStart}
                    onMouseMove={onMove}
                    onMouseUp={onEnd}
                    onMouseLeave={onEnd}
                    onTouchStart={onStart}
                    onTouchMove={onMove}
                    onTouchEnd={onEnd}
                />

                {result && result.shape !== "unknown" && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-indigo-500/[0.03]">
                        <svg
                            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                            className="w-full h-full animate-in zoom-in-95 duration-500"
                        >
                            <g
                                style={{ stroke: "#4ade80", strokeWidth: 4, fill: "rgba(74, 222, 128, 0.15)", strokeLinecap: "round", strokeLinejoin: "round" }}
                                dangerouslySetInnerHTML={{ __html: result.svgElement }}
                            />
                        </svg>
                    </div>
                )}

                {loading && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-md animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Optimizing...</span>
                    </div>
                )}

                {points.length === 0 && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                        <span className="text-4xl mb-2">✏️</span>
                        <p className="text-sm font-bold text-slate-500">Dibuja una forma (círculo, polígono...)</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                    <span>⚠</span> {error}
                </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
                <button
                    onClick={clear}
                    className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                    disabled={points.length === 0}
                >
                    Reiniciar
                </button>

                {result && result.shape !== "unknown" && (
                    <div className="flex-1 flex items-center gap-3 animate-in slide-in-from-right-4">
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            {result.shape} detectado
                        </span>
                        <div className="flex-1 h-10 bg-black/40 border border-white/5 rounded-xl flex items-center px-4 overflow-hidden">
                            <code className="text-[10px] text-slate-500 truncate font-mono">{result.svgElement}</code>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
