import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Bar, Line, Scatter } from "react-chartjs-2";
import { interpretDiagram } from "../../../api/mathApi";
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    BarElement, LineElement, PointElement,
    Title, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(
    CategoryScale, LinearScale,
    BarElement, LineElement, PointElement,
    Title, Tooltip, Legend, Filler
);

const CANVAS_W = 600;
const CANVAS_H = 380;

const SERIES_COLORS = [
    { border: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.15)"  },
    { border: "rgb(16,185,129)",  bg: "rgba(16,185,129,0.15)"  },
    { border: "rgb(245,158,11)",  bg: "rgba(245,158,11,0.15)"  },
    { border: "rgb(239,68,68)",   bg: "rgba(239,68,68,0.15)"   },
];

const CHART_TYPES = [
    { id: "line",     label: "Líneas",  icon: "╱" },
    { id: "bar",      label: "Barras",  icon: "▊" },
    { id: "area",     label: "Área",    icon: "◣" },
    { id: "scatter",  label: "Puntos",  icon: "⁘" },
];

const EMPTY_AXES = {
    xLabel: "", xUnit: "", xMin: "", xMax: "", xStep: "",
    yLabel: "", yUnit: "", yMin: "", yMax: "", yStep: "",
};

// ── Small reusable field ───────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "" }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/40 transition-colors w-full"
            />
        </div>
    );
}

export default function DiagramCanvas({ onResult } = {}) {
    const canvasRef      = useRef(null);
    const allStrokesRef  = useRef([]);
    const chartRef       = useRef(null);   // ref to Chart.js instance for PNG capture
    const captureRef     = useRef(null);   // updated each render to avoid stale closures
    const [strokeCount,  setStrokeCount]  = useState(0);
    const [isDrawing,    setIsDrawing]    = useState(false);
    const [currentStroke,setCurrentStroke]= useState(null);
    const [result,       setResult]       = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);

    // ── Edit state ─────────────────────────────────────────────────
    const [editMode,      setEditMode]      = useState(false);
    const [editTab,       setEditTab]       = useState("datos"); // tipo | ejes | datos
    const [editChartType, setEditChartType] = useState("line");
    const [editAxes,      setEditAxes]      = useState(EMPTY_AXES);
    const [editSeries,    setEditSeries]    = useState([]);

    // Initialise edit state when result arrives
    useEffect(() => {
        if (!result) return;
        const xa = result.xAxis ?? {};
        const ya = result.yAxis ?? {};
        setEditChartType(result.diagramType || "line");
        setEditAxes({
            xLabel: xa.label  ?? "",
            xUnit:  xa.unit   ?? "",
            xMin:   xa.min    != null ? String(xa.min)  : "",
            xMax:   xa.max    != null ? String(xa.max)  : "",
            xStep:  xa.step   != null ? String(xa.step) : "",
            yLabel: ya.label  ?? "",
            yUnit:  ya.unit   ?? "",
            yMin:   ya.min    != null ? String(ya.min)  : "",
            yMax:   ya.max    != null ? String(ya.max)  : "",
            yStep:  ya.step   != null ? String(ya.step) : "",
        });
        const len = xa.values?.length ?? 0;
        const ds  = result.chartConfig?.data?.datasets ?? [];
        if (ds.length === 0) {
            setEditSeries([{ label: "Datos", values: Array(len).fill("") }]);
            setEditMode(true);
            setEditTab("datos");
        } else {
            setEditSeries(ds.map(d => ({
                label:  String(d.label ?? "Serie"),
                values: (d.data ?? []).map(v => v == null ? "" : String(v)),
            })));
        }
    }, [result]);

    // ── Helpers for edit state ─────────────────────────────────────
    const setAxField = (k, v) => setEditAxes(prev => ({ ...prev, [k]: v }));
    const updateValue = (si, xi, val) =>
        setEditSeries(prev => prev.map((s, i) =>
            i !== si ? s : { ...s, values: s.values.map((v, j) => j === xi ? val : v) }
        ));
    const updateLabel = (si, val) =>
        setEditSeries(prev => prev.map((s, i) => i !== si ? s : { ...s, label: val }));
    const addSeries = () => {
        const len = result?.xAxis?.values?.length ?? 0;
        setEditSeries(prev => [...prev, { label: `Serie ${prev.length + 1}`, values: Array(len).fill("") }]);
    };
    const removeSeries = (si) => setEditSeries(prev => prev.filter((_, i) => i !== si));

    // ── Active config (edit overrides result) ──────────────────────
    const activeType = editMode ? editChartType : (result?.diagramType || "line");

    // Aspect ratio = xRange / yRange → 1 unit on X = 1 unit on Y visually
    const chartAspectRatio = useMemo(() => {
        const xa = (editMode ? {
            min: editAxes.xMin !== "" ? parseFloat(editAxes.xMin) : result?.xAxis?.min,
            max: editAxes.xMax !== "" ? parseFloat(editAxes.xMax) : result?.xAxis?.max,
        } : result?.xAxis) ?? {};
        const ya = (editMode ? {
            min: editAxes.yMin !== "" ? parseFloat(editAxes.yMin) : result?.yAxis?.min,
            max: editAxes.yMax !== "" ? parseFloat(editAxes.yMax) : result?.yAxis?.max,
        } : result?.yAxis) ?? {};
        const xRange = xa.max != null && xa.min != null ? xa.max - xa.min : 0;
        const yRange = ya.max != null && ya.min != null ? ya.max - ya.min : 0;
        return xRange > 0 && yRange > 0 ? xRange / yRange : null;
    }, [result, editMode, editAxes]);

    const activeXAxis = useMemo(() => {
        if (!result?.xAxis) return null;
        if (!editMode) return result.xAxis;
        return {
            ...result.xAxis,
            label: editAxes.xLabel,
            unit:  editAxes.xUnit,
            min:   editAxes.xMin  !== "" ? parseFloat(editAxes.xMin)  : result.xAxis.min,
            max:   editAxes.xMax  !== "" ? parseFloat(editAxes.xMax)  : result.xAxis.max,
            step:  editAxes.xStep !== "" ? parseFloat(editAxes.xStep) : result.xAxis.step,
        };
    }, [result, editMode, editAxes]);

    const activeYAxis = useMemo(() => {
        if (!result?.yAxis) return null;
        if (!editMode) return result.yAxis;
        return {
            ...result.yAxis,
            label: editAxes.yLabel,
            unit:  editAxes.yUnit,
            min:   editAxes.yMin  !== "" ? parseFloat(editAxes.yMin)  : result.yAxis.min,
            max:   editAxes.yMax  !== "" ? parseFloat(editAxes.yMax)  : result.yAxis.max,
            step:  editAxes.yStep !== "" ? parseFloat(editAxes.yStep) : result.yAxis.step,
        };
    }, [result, editMode, editAxes]);

    // Bar uses CategoryScale; everything else uses LinearScale with {x,y} pairs
    const useLinearX = activeType !== "bar";

    // ── Build chart data ───────────────────────────────────────────
    const displayChartData = useMemo(() => {
        if (!result?.xAxis?.values) return null;
        const xVals  = result.xAxis.values;           // [2, 4, 6] — the written tick values
        const labels = xVals.map(String);             // used only for bar / pie

        // Helper: attach x positions to an array of plain y values
        const withX = (yArr) => yArr.map((y, i) => ({
            x: xVals[i] ?? i,
            y: (y == null || y === "") ? null : parseFloat(y),
        }));

        const makeDs = (src, idx, isAiDs = false) => {
            const c = SERIES_COLORS[idx % SERIES_COLORS.length];
            const isArea = activeType === "area";
            const rawData = isAiDs ? (src.data ?? []) : src.values;
            return {
                label:               isAiDs ? (src.label ?? "Data") : src.label,
                data:                useLinearX ? withX(rawData) : rawData.map(v => v == null ? null : parseFloat(v)),
                borderColor:         isAiDs ? (src.borderColor ?? c.border) : c.border,
                backgroundColor:     isAiDs ? (src.backgroundColor ?? c.bg)  : c.bg,
                borderWidth:         2.5,
                tension:             0.35,
                pointBackgroundColor:isAiDs ? (src.pointBackgroundColor ?? c.border) : c.border,
                pointRadius:         5,
                fill:                isArea,
                spanGaps:            true,
            };
        };

        if (!editMode && result.chartConfig?.data?.datasets?.length > 0) {
            const datasets = result.chartConfig.data.datasets.map((ds, i) => makeDs(ds, i, true));
            return useLinearX ? { datasets } : { labels, datasets };
        }

        const datasets = editSeries.map((s, i) => makeDs(s, i));
        return useLinearX ? { datasets } : { labels, datasets };
    }, [result, editMode, editSeries, activeType, useLinearX]);

    // ── Chart.js options ───────────────────────────────────────────
    const chartOptions = useMemo(() => {
        const xa = activeXAxis ?? {};
        const ya = activeYAxis ?? {};
        const xTitle = [xa.label, xa.unit ? `(${xa.unit})` : ""].filter(Boolean).join(" ");
        const yTitle = [ya.label, ya.unit ? `(${ya.unit})` : ""].filter(Boolean).join(" ");
        const titleCfg = (text) => text
            ? { display: true, text, color: "#64748b", font: { family: "Inter", size: 11, weight: "600" } }
            : { display: false };
        const intOnly = v => Number.isInteger(v) ? v : null;

        return {
            responsive: true,
            // When both axis ranges are known, force equal pixel-per-unit on both axes
            maintainAspectRatio: chartAspectRatio != null,
            aspectRatio: chartAspectRatio ?? 1.6,
            animation: { duration: 300, easing: "easeOutQuart" },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#94a3b8", font: { family: "Inter", size: 11, weight: "600" }, padding: 14, boxWidth: 12 },
                },
                tooltip: {
                    backgroundColor: "rgba(10,15,30,0.97)",
                    titleColor: "#818cf8",
                    bodyColor: "#f1f5f9",
                    borderColor: "rgba(99,102,241,0.3)",
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: (xa.unit || ya.unit) ? {
                        title: items => `${items[0].parsed?.x ?? items[0].label ?? ""}${xa.unit ? ` ${xa.unit}` : ""}`,
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y ?? ""}${ya.unit ? ` ${ya.unit}` : ""}`,
                    } : undefined,
                },
            },
            scales: {
                x: {
                    // Linear scale so tick spacing matches the numeric step — same logic as Y
                    ...(useLinearX ? {
                        type:     "linear",
                        min:      xa.min  ?? undefined,
                        max:      xa.max  ?? undefined,
                        ticks: {
                            color:    "#475569",
                            font:     { size: 11 },
                            stepSize: xa.step ?? undefined,
                            callback: intOnly,
                        },
                    } : {
                        ticks: { color: "#475569", font: { size: 11 } },
                    }),
                    title:  titleCfg(xTitle),
                    grid:   { color: "rgba(255,255,255,0.04)" },
                    border: { color: "rgba(255,255,255,0.07)" },
                },
                y: {
                    type:     "linear",
                    min:      ya.min  ?? undefined,
                    max:      ya.max  ?? undefined,
                    title:    titleCfg(yTitle),
                    grid:     { color: "rgba(255,255,255,0.06)" },
                    border:   { color: "rgba(255,255,255,0.07)", dash: [4, 4] },
                    ticks: {
                        color:    "#475569",
                        font:     { size: 11 },
                        padding:  6,
                        stepSize: ya.step ?? undefined,
                        callback: intOnly,
                    },
                },
            },
        };
    }, [activeXAxis, activeYAxis, useLinearX, chartAspectRatio]);

    // Keep captureRef up-to-date so the animation callback always uses current values
    captureRef.current = useCallback(() => {
        const img = chartRef.current?.toBase64Image?.("image/png", 1);
        if (img && onResult) {
            onResult(JSON.stringify({ imageBase64: img, chartType: activeType }));
        }
    }, [onResult, activeType]);

    // Fire capture after every chart render/update
    const optionsWithCapture = useMemo(() => ({
        ...chartOptions,
        animation: {
            ...chartOptions.animation,
            onComplete: () => { captureRef.current?.(); },
        },
    }), [chartOptions]);

    const renderChart = () => {
        if (!displayChartData) return null;
        const props = { ref: chartRef, data: displayChartData, options: optionsWithCapture };
        if (activeType === "bar")     return <Bar {...props} />;
        if (activeType === "scatter") return <Scatter {...props} />;
        return <Line {...props} />;
    };

    // ── Canvas helpers ─────────────────────────────────────────────
    const redraw = useCallback((strokes, current) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(167,139,250,0.9)";
        strokes.forEach(s => {
            if (s.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            s.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });
        if (current?.length > 1) {
            ctx.beginPath();
            ctx.moveTo(current[0].x, current[0].y);
            current.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    }, []);

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX ?? e.touches?.[0]?.clientX) - rect.left) * (CANVAS_W / rect.width),
            y: ((e.clientY ?? e.touches?.[0]?.clientY) - rect.top)  * (CANVAS_H / rect.height),
        };
    };
    const onStart = (e) => { e.preventDefault(); setIsDrawing(true); setCurrentStroke([getPos(e)]); setResult(null); setError(null); };
    const onMove  = (e) => {
        if (!isDrawing) return; e.preventDefault();
        setCurrentStroke(prev => { const u = [...prev, getPos(e)]; redraw(allStrokesRef.current, u); return u; });
    };
    const onEnd = () => {
        if (!isDrawing || !currentStroke) return;
        setIsDrawing(false);
        const ns = [...allStrokesRef.current, { points: currentStroke }];
        allStrokesRef.current = ns; setStrokeCount(ns.length); setCurrentStroke(null); redraw(ns, null);
    };

    const clear = () => {
        allStrokesRef.current = []; setStrokeCount(0); setCurrentStroke(null);
        setResult(null); setEditMode(false); setEditSeries([]); setError(null);
        canvasRef.current?.getContext("2d")?.clearRect(0, 0, CANVAS_W, CANVAS_H);
    };

    const handleInterpret = async () => {
        if (allStrokesRef.current.length === 0) return;
        setLoading(true); setError(null);
        const imageBase64 = canvasRef.current?.toDataURL("image/png")?.split(",")[1] ?? undefined;
        try {
            const data = await interpretDiagram(allStrokesRef.current, imageBase64);
            setResult(data);
            if (data?.description && onResult) onResult(data.description);
        } catch (e) { setError(e.message || "Error al interpretar el diagrama"); }
        finally { setLoading(false); }
    };

    const noDataDetected = result && (result.chartConfig?.data?.datasets ?? []).length === 0;

    return (
        <div className="bg-[#0f172a]/60 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className="flex items-center gap-5 mb-8 flex-wrap">
                <div className="w-14 h-14 rounded-[1.25rem] bg-violet-500/20 flex items-center justify-center text-3xl border border-violet-500/30 flex-shrink-0">📉</div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Intérprete de gráficos</h2>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                        Dibuja ejes con valores y unidades → IA genera el gráfico · edítalo después
                    </p>
                </div>
                {loading && (
                    <div className="ml-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-violet-600/20 border border-violet-500/30">
                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                        <span className="text-[11px] font-black text-violet-300 uppercase tracking-[0.2em]">Leyendo imagen…</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Canvas ── */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tu dibujo</span>
                        <span className="text-[10px] text-slate-700 font-bold">Dibuja ejes · valores · unidades</span>
                    </div>
                    <div className="relative bg-black/60 rounded-[1.5rem] border border-white/5 overflow-hidden" style={{ height: 320 }}>
                        <canvas
                            ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                            className="w-full h-full cursor-crosshair touch-none"
                            onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
                            onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
                        />
                        {strokeCount === 0 && !loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                                <span className="text-5xl mb-3">✍️</span>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Dibuja tus ejes y datos</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={clear} className="px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                            🗑 Limpiar
                        </button>
                        <button
                            onClick={handleInterpret}
                            disabled={strokeCount === 0 || loading}
                            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 transition-all disabled:opacity-30 disabled:grayscale"
                        >
                            {loading ? "Interpretando…" : "⚡ Interpretar gráfico"}
                        </button>
                    </div>
                </div>

                {/* ── Right: preview + editor ── */}
                <div className="flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Gráfico</span>
                        <div className="flex items-center gap-2">
                            {result && (
                                <span className="px-3 py-1 rounded-full bg-violet-600 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                    {activeType}
                                </span>
                            )}
                            {result?.xAxis && (
                                <button
                                    onClick={() => setEditMode(m => !m)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all ${
                                        editMode
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400"
                                    }`}
                                >
                                    {editMode ? "✓ Editando" : "✏️ Editar"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Chart preview */}
                    <div className="bg-[#050a14] rounded-[1.5rem] border border-white/5 p-4"
                        style={{ minHeight: 140, maxHeight: 420 }}>
                        {!result ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-25">
                                <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🧩</span>
                                </div>
                                <p className="text-xs text-slate-500">El gráfico aparecerá aquí.</p>
                            </div>
                        ) : result.chartConfig?.data || editMode ? (
                            <div className="w-full">{renderChart()}</div>
                        ) : (
                            <div className="h-full flex items-center justify-center opacity-40 text-center">
                                <span className="text-xs text-slate-500 font-bold">Sin tipo de gráfico compatible</span>
                            </div>
                        )}
                    </div>

                    {/* Axis pills when not editing */}
                    {!editMode && result?.xAxis && (
                        <div className="flex gap-2 flex-wrap">
                            {result.xAxis.values?.length > 0 && (
                                <span className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-slate-400 font-bold">
                                    X: {result.xAxis.values.join(", ")}{result.xAxis.unit ? ` (${result.xAxis.unit})` : ""}
                                </span>
                            )}
                            {result.yAxis?.values?.length > 0 && (
                                <span className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-slate-400 font-bold">
                                    Y: {result.yAxis.values.join(", ")}{result.yAxis.unit ? ` (${result.yAxis.unit})` : ""}
                                </span>
                            )}
                            {noDataDetected && (
                                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 text-amber-400 font-bold">
                                    ⚠ Sin datos — usa el editor
                                </span>
                            )}
                        </div>
                    )}

                    {/* ── EDIT PANEL ── */}
                    {editMode && result?.xAxis && (
                        <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
                            {/* Tab bar */}
                            <div className="flex border-b border-white/5">
                                {[
                                    { id: "tipo",  label: "📊 Tipo"  },
                                    { id: "ejes",  label: "⚙️ Ejes"  },
                                    { id: "datos", label: "📈 Datos" },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setEditTab(tab.id)}
                                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            editTab === tab.id
                                                ? "bg-violet-600/20 text-violet-300 border-b-2 border-violet-500"
                                                : "text-slate-600 hover:text-slate-400 hover:bg-white/3"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4">
                                {/* ── TAB: TIPO ── */}
                                {editTab === "tipo" && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {CHART_TYPES.map(ct => (
                                            <button
                                                key={ct.id}
                                                onClick={() => setEditChartType(ct.id)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                    editChartType === ct.id
                                                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                                                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                            >
                                                <span className="text-base leading-none">{ct.icon}</span>
                                                {ct.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* ── TAB: EJES ── */}
                                {editTab === "ejes" && (
                                    <div className="flex flex-col gap-4">
                                        {/* X axis */}
                                        <div>
                                            <div className="text-[9px] font-black text-violet-400/70 uppercase tracking-widest mb-2">Eje X</div>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <Field label="Etiqueta" value={editAxes.xLabel} onChange={v => setAxField("xLabel", v)} placeholder="Distancia" />
                                                <Field label="Unidad"   value={editAxes.xUnit}  onChange={v => setAxField("xUnit", v)}  placeholder="m" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Field label="Mín"  type="number" value={editAxes.xMin}  onChange={v => setAxField("xMin", v)}  placeholder="0" />
                                                <Field label="Máx"  type="number" value={editAxes.xMax}  onChange={v => setAxField("xMax", v)}  placeholder="6" />
                                                <Field label="Paso" type="number" value={editAxes.xStep} onChange={v => setAxField("xStep", v)} placeholder="2" />
                                            </div>
                                        </div>
                                        {/* Y axis */}
                                        <div>
                                            <div className="text-[9px] font-black text-emerald-400/70 uppercase tracking-widest mb-2">Eje Y</div>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <Field label="Etiqueta" value={editAxes.yLabel} onChange={v => setAxField("yLabel", v)} placeholder="Velocidad" />
                                                <Field label="Unidad"   value={editAxes.yUnit}  onChange={v => setAxField("yUnit", v)}  placeholder="km/h" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Field label="Mín"  type="number" value={editAxes.yMin}  onChange={v => setAxField("yMin", v)}  placeholder="0" />
                                                <Field label="Máx"  type="number" value={editAxes.yMax}  onChange={v => setAxField("yMax", v)}  placeholder="6" />
                                                <Field label="Paso" type="number" value={editAxes.yStep} onChange={v => setAxField("yStep", v)} placeholder="2" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── TAB: DATOS ── */}
                                {editTab === "datos" && (
                                    <div className="flex flex-col gap-3">
                                        {/* Column headers */}
                                        <div className="flex gap-1 pl-[68px]">
                                            {result.xAxis.values.map((xv, xi) => (
                                                <div key={xi} className="flex-1 text-center text-[9px] font-black text-slate-600 uppercase">
                                                    {xv}{result.xAxis.unit ? ` ${result.xAxis.unit}` : ""}
                                                </div>
                                            ))}
                                        </div>

                                        {editSeries.map((s, si) => (
                                            <div key={si} className="flex items-center gap-1">
                                                <input
                                                    value={s.label}
                                                    onChange={e => updateLabel(si, e.target.value)}
                                                    className="w-16 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-violet-500/50 text-center"
                                                    style={{ borderLeftColor: SERIES_COLORS[si % SERIES_COLORS.length].border, borderLeftWidth: 3 }}
                                                />
                                                {result.xAxis.values.map((_, xi) => (
                                                    <input
                                                        key={xi}
                                                        type="number"
                                                        value={s.values[xi] ?? ""}
                                                        onChange={e => updateValue(si, xi, e.target.value)}
                                                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg py-1.5 text-xs text-center text-white outline-none focus:border-violet-500/50 transition-colors"
                                                        placeholder="—"
                                                    />
                                                ))}
                                                {editSeries.length > 1 && (
                                                    <button onClick={() => removeSeries(si)} className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs">✕</button>
                                                )}
                                            </div>
                                        ))}

                                        {editSeries.length < 4 && (
                                            <button
                                                onClick={addSeries}
                                                className="text-[10px] text-violet-400 font-black hover:text-violet-300 transition-colors uppercase tracking-wide text-left"
                                            >
                                                + Añadir serie
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!editMode && result?.description && (
                        <p className="text-[11px] text-slate-600 italic px-1">" {result.description} "</p>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                    <span>⚠</span> {error}
                </div>
            )}
        </div>
    );
}
