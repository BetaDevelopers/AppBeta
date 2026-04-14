import { useRef, useState, useEffect, useCallback } from "react";
import { Bar, Line } from "react-chartjs-2";
import { interpretDiagram } from "../../../api/mathApi";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function DiagramCanvas({ onResult } = {}) {
    const canvasRef = useRef(null);
    const [allStrokes, setAllStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const CANVAS_W = 600;
    const CANVAS_H = 380;

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";

        allStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            stroke.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
        });

        if (currentStroke && currentStroke.length > 1) {
            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            currentStroke.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
        }
    }, [allStrokes, currentStroke]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    async function handleInterpret(strokes) {
        if (strokes.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const data = await interpretDiagram(strokes);
            setResult(data);
            if (data?.description && onResult) onResult(data.description);
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
        const clientX = (e.clientX || (e.touches && e.touches[0].clientX));
        const clientY = (e.clientY || (e.touches && e.touches[0].clientY));
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const onStart = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        setCurrentStroke([getPos(e)]);
        setResult(null);
    };

    const onMove = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        setCurrentStroke(prev => [...prev, getPos(e)]);
    };

    const onEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentStroke) {
            setAllStrokes(prev => [...prev, { points: currentStroke }]);
        }
        setCurrentStroke(null);
    };

    const clear = () => {
        setAllStrokes([]);
        setResult(null);
        setError(null);
    };

    return (
        <div className="bg-[#0f172a]/60 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl max-w-5xl mx-auto font-sans">
            <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-[1.25rem] bg-violet-500/20 flex items-center justify-center text-3xl border border-violet-500/30 shadow-lg shadow-violet-500/10">
                    📉
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Diagram Intelligence</h2>
                    <p className="text-sm text-slate-400 font-medium">Draw axes, bars, or circuits → AI Structural Decoding</p>
                </div>
                {loading && (
                    <div className="ml-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-violet-600/20 border border-violet-500/30">
                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                        <span className="text-[11px] font-black text-violet-300 uppercase tracking-[0.2em]">Analyzing...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Canvas */}
                <div className="space-y-4">
                    <div className="relative bg-black/60 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner aspect-[4/3] lg:aspect-auto h-full min-h-[380px]">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            className="w-full h-full cursor-crosshair touch-none"
                            onMouseDown={onStart}
                            onMouseMove={onMove}
                            onMouseUp={onEnd}
                            onMouseLeave={onEnd}
                            onTouchStart={onStart}
                            onTouchMove={onMove}
                            onTouchEnd={onEnd}
                        />

                        {allStrokes.length === 0 && !loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                                <span className="text-5xl mb-4">✍️</span>
                                <p className="text-sm font-black uppercase tracking-widest text-slate-500">Dibuja tus ejes y datos</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={clear}
                            className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-2"
                        >
                            <span>🗑</span> Limpiar
                        </button>
                        <button
                            onClick={() => handleInterpret(allStrokes)}
                            disabled={allStrokes.length === 0 || loading}
                            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 transition-all disabled:opacity-30 disabled:grayscale"
                        >
                            {loading ? "Interpretando..." : "⚡ Decodificar Esquema"}
                        </button>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="bg-black/40 rounded-[2rem] border border-white/5 p-8 flex flex-col">
                    {!result ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-4">
                                <span className="text-3xl">🧩</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 max-w-[200px]">La interpretación estructural aparecerá aquí después de dibujar.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-4 py-1.5 rounded-full bg-violet-600 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                    {result.diagramType}
                                </span>
                            </div>

                            <p className="text-slate-300 text-sm leading-relaxed mb-8 font-medium italic">
                                "{result.description}"
                            </p>

                            <div className="flex-1 bg-white/[0.03] rounded-2xl p-4 min-h-[240px] flex items-center justify-center border border-white/5 shadow-inner">
                                {result.chartConfig && (result.diagramType === "bar" || result.diagramType === "line") ? (
                                    <div className="w-full h-full max-h-[220px]">
                                        {result.diagramType === "bar" ? (
                                            <Bar
                                                data={result.chartConfig.data}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    scales: {
                                                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                                                        x: { grid: { display: false }, border: { display: false } }
                                                    },
                                                    plugins: { legend: { display: false } }
                                                }}
                                            />
                                        ) : (
                                            <Line
                                                data={result.chartConfig.data}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    elements: { line: { tension: 0.4 } },
                                                    scales: {
                                                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                                                        x: { grid: { display: false }, border: { display: false } }
                                                    },
                                                    plugins: { legend: { display: false } }
                                                }}
                                            />
                                        )}
                                    </div>
                                ) : result.diagramType === "circuit" ? (
                                    <div className="flex flex-col items-center gap-4 text-violet-400">
                                        <div className="text-6xl animate-pulse">🔌</div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Esquema Eléctrico detectado</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-600 text-xs font-bold uppercase">Sin previsualización visual</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                    <span className="text-lg">⚠</span> {error}
                </div>
            )}
        </div>
    );
}
