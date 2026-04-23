import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { tableToChart } from "../../../api/mathApi";

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

const SAMPLE_MD = `| Mes | Ventas (€) | Coste (€) |
|-----|------------|-----------|
| Ene | 4500       | 2800      |
| Feb | 5200       | 3100      |
| Mar | 4800       | 2900      |
| Abr | 6100       | 3500      |
| May | 7200       | 4000      |`;

const CHART_TYPES = [
    { id: "bar",      label: "Barras",  icon: "▊" },
    { id: "line",     label: "Líneas",  icon: "╱" },
    { id: "area",     label: "Área",    icon: "◣" },
    { id: "pie",      label: "Pastel",  icon: "◔" },
    { id: "doughnut", label: "Anillo",  icon: "◎" },
    { id: "scatter",  label: "Puntos",  icon: "⁘" },
];

const PALETTE = [
    { bg: "rgba(99,102,241,0.8)",  border: "rgb(99,102,241)" },
    { bg: "rgba(16,185,129,0.8)",  border: "rgb(16,185,129)" },
    { bg: "rgba(245,158,11,0.8)",  border: "rgb(245,158,11)" },
    { bg: "rgba(239,68,68,0.8)",   border: "rgb(239,68,68)" },
    { bg: "rgba(59,130,246,0.8)",  border: "rgb(59,130,246)" },
    { bg: "rgba(168,85,247,0.8)",  border: "rgb(168,85,247)" },
    { bg: "rgba(236,72,153,0.8)",  border: "rgb(236,72,153)" },
    { bg: "rgba(20,184,166,0.8)",  border: "rgb(20,184,166)" },
];

// ── Local fallback parser (used when API unavailable) ──────────────────────
function parseTable(text) {
    const rawLines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 2) return null;
    if (!text.includes("|")) {
        const rows = rawLines.map(l => l.split(",").map(c => c.trim()));
        return rows.length < 2 ? null : { headers: rows[0], rows: rows.slice(1) };
    }
    const tableLines = rawLines.filter(l => l.includes("|") && !/^\|[\s\-|]+\|$/.test(l));
    if (tableLines.length < 2) return null;
    const parseRow = line => line.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    return { headers: parseRow(tableLines[0]), rows: tableLines.slice(1).map(parseRow) };
}

function buildLocalChartData(parsed, chartType) {
    const { headers, rows } = parsed;
    const labels = rows.map(r => r[0] ?? "");
    const numCols = headers.map((_, i) => i).slice(1)
        .filter(i => rows.some(r => r[i] !== undefined && !isNaN(parseFloat(r[i]))));
    if (numCols.length === 0) return null;
    const isPolar = chartType === "pie" || chartType === "doughnut";
    if (isPolar) {
        const i = numCols[0];
        return { labels, datasets: [{ label: headers[i] ?? "Valor", data: rows.map(r => parseFloat(r[i]) || 0), backgroundColor: PALETTE.map(c => c.bg), borderColor: PALETTE.map(c => c.border), borderWidth: 2 }] };
    }
    if (chartType === "scatter") {
        if (numCols.length < 2) return null;
        const [xi, yi] = numCols;
        return { datasets: [{ label: `${headers[xi]} vs ${headers[yi]}`, data: rows.map(r => ({ x: parseFloat(r[xi]) || 0, y: parseFloat(r[yi]) || 0 })), backgroundColor: PALETTE[0].bg, borderColor: PALETTE[0].border, pointRadius: 6 }] };
    }
    const isArea = chartType === "area";
    return {
        labels,
        datasets: numCols.map((ci, idx) => {
            const c = PALETTE[idx % PALETTE.length];
            return { label: headers[ci] ?? `Serie ${idx + 1}`, data: rows.map(r => parseFloat(r[ci]) || 0), backgroundColor: isArea ? c.bg.replace("0.8", "0.15") : c.bg, borderColor: c.border, borderWidth: 2, fill: isArea, tension: 0.4, pointBackgroundColor: c.border, pointRadius: isArea ? 4 : 3 };
        }),
    };
}

const EMPTY_AXIS = { title: "", xAxisLabel: "", yAxisLabel: "", yUnit: "", yUnitPrefix: "", reasoning: "" };

export default function TableToChart({ onResult, initialConfig } = {}) {
    const [inputText,  setInputText]  = useState(initialConfig?.tableData || SAMPLE_MD);
    const [chartType,  setChartType]  = useState(initialConfig?.chartType || "bar");
    const [chartData,  setChartData]  = useState(null);
    const [axisInfo,   setAxisInfo]   = useState(EMPTY_AXIS);
    const [error,      setError]      = useState(null);
    const [analyzing,  setAnalyzing]  = useState(false);
    const [ready,      setReady]      = useState(false);
    const chartRef      = useRef(null);
    const onCompleteRef = useRef(null);

    useEffect(() => {
        if (initialConfig) {
            setInputText(initialConfig.tableData || SAMPLE_MD);
            setChartType(initialConfig.chartType || "bar");
            setChartData(null);
            setAxisInfo(EMPTY_AXIS);
            setReady(false);
            setError(null);
        }
    }, [initialConfig]);

    const scheduleCapture = useCallback((type, text) => {
        onCompleteRef.current = () => {
            const imageBase64 = chartRef.current?.toBase64Image?.("image/png", 1) ?? null;
            if (imageBase64 && onResult) {
                onResult(JSON.stringify({ imageBase64, chartType: type, tableData: text }));
                setReady(true);
            }
            onCompleteRef.current = null;
        };
    }, [onResult]);

    const handleGenerate = useCallback(async () => {
        setError(null);
        setReady(false);
        setAnalyzing(true);
        setChartData(null);
        setAxisInfo(EMPTY_AXIS);

        try {
            const result = await tableToChart(inputText);
            const aiType = result.chartType || "bar";
            setChartType(aiType);
            setAxisInfo({
                title:       result.title       || "",
                xAxisLabel:  result.xAxisLabel  || "",
                yAxisLabel:  result.yAxisLabel  || "",
                yUnit:       result.yUnit       || "",
                yUnitPrefix: result.yUnitPrefix || "",
                reasoning:   result.reasoning   || "",
            });
            scheduleCapture(aiType, inputText);
            setChartData(result.chartData);
        } catch {
            // Local fallback when API is unavailable
            const parsed = parseTable(inputText);
            if (!parsed) { setError("No se pudo leer la tabla. Usa formato Markdown (|col|) o CSV."); setAnalyzing(false); return; }
            const data = buildLocalChartData(parsed, chartType);
            if (!data) { setError("Necesitas al menos una columna numérica para graficar."); setAnalyzing(false); return; }
            scheduleCapture(chartType, inputText);
            setChartData(data);
        } finally {
            setAnalyzing(false);
        }
    }, [inputText, chartType, scheduleCapture]);

    const isPolar = chartType === "pie" || chartType === "doughnut";

    const chartOptions = useMemo(() => {
        const hasTitle  = Boolean(axisInfo.title);
        const hasXLabel = Boolean(axisInfo.xAxisLabel);
        const hasYLabel = Boolean(axisInfo.yAxisLabel);
        const hasUnit   = Boolean(axisInfo.yUnit || axisInfo.yUnitPrefix);
        const fmt = v => `${axisInfo.yUnitPrefix || ""}${v}${axisInfo.yUnit || ""}`;

        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: "easeOutQuart",
                onComplete: () => { onCompleteRef.current?.(); },
            },
            plugins: {
                title: {
                    display: hasTitle,
                    text: axisInfo.title,
                    color: "#e2e8f0",
                    font: { family: "Inter", size: 14, weight: "700" },
                    padding: { top: 0, bottom: 18 },
                },
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Inter", weight: "600", size: 11 },
                        padding: 16,
                        boxWidth: 12,
                        borderRadius: 3,
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(10,15,30,0.97)",
                    titleColor: "#818cf8",
                    bodyColor: "#f1f5f9",
                    borderColor: "rgba(99,102,241,0.3)",
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: hasUnit ? {
                        label: ctx => {
                            const val = ctx.parsed?.y ?? ctx.parsed;
                            return ` ${ctx.dataset.label}: ${fmt(val)}`;
                        },
                    } : undefined,
                },
            },
            scales: isPolar ? {} : {
                x: {
                    title: {
                        display: hasXLabel,
                        text: axisInfo.xAxisLabel,
                        color: "#64748b",
                        font: { family: "Inter", size: 11, weight: "600" },
                        padding: { top: 8 },
                    },
                    grid: { color: "rgba(255,255,255,0.04)" },
                    border: { color: "rgba(255,255,255,0.06)" },
                    ticks: { color: "#475569", font: { size: 11 }, padding: 6 },
                },
                y: {
                    title: {
                        display: hasYLabel,
                        text: axisInfo.yAxisLabel + (axisInfo.yUnit ? ` (${axisInfo.yUnit})` : ""),
                        color: "#64748b",
                        font: { family: "Inter", size: 11, weight: "600" },
                        padding: { right: 8 },
                    },
                    grid: { color: "rgba(255,255,255,0.06)" },
                    border: { color: "rgba(255,255,255,0.06)", dash: [4, 4] },
                    ticks: {
                        color: "#475569",
                        font: { size: 11 },
                        padding: 8,
                        ...(hasUnit ? { callback: v => fmt(v) } : {}),
                    },
                },
            },
        };
    }, [chartType, axisInfo, isPolar]);

    const renderChart = () => {
        if (!chartData) return null;
        const props = { ref: chartRef, data: chartData, options: chartOptions };
        switch (chartType) {
            case "line": case "area": return <Line {...props} />;
            case "pie":              return <Pie {...props} />;
            case "doughnut":         return <Doughnut {...props} />;
            case "scatter":          return <Scatter {...props} />;
            default:                 return <Bar {...props} />;
        }
    };

    return (
        <div className="bg-[#030712]/60 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-6xl mx-auto font-sans">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-3xl border border-indigo-500/20 flex-shrink-0">
                    📊
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Visualizador de datos profesional</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        La IA detecta ejes, unidades y separación automáticamente · gráfico listo para insertar.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Left: input + controls ── */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Datos de origen</span>
                        <span className="text-[10px] font-bold text-slate-700">Markdown · CSV</span>
                    </div>

                    <textarea
                        className="h-[200px] w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 text-sm text-indigo-200 font-mono resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none transition-all placeholder:text-slate-800"
                        value={inputText}
                        onChange={e => {
                            setInputText(e.target.value);
                            setChartData(null);
                            setReady(false);
                            setError(null);
                            setAxisInfo(EMPTY_AXIS);
                        }}
                        placeholder="| Mes | Ventas (€) | Coste (€) |&#10;|-----|------------|-----------|&#10;| Ene | 4500       | 2800      |"
                    />

                    {/* Chart type override */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tipo de gráfico</span>
                            <span className="text-[9px] text-slate-700 font-bold">— IA elige automáticamente</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {CHART_TYPES.map(ct => (
                                <button
                                    key={ct.id}
                                    onClick={() => { setChartType(ct.id); setChartData(null); setReady(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                        chartType === ct.id
                                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span className="text-base leading-none">{ct.icon}</span>
                                    {ct.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={analyzing}
                        className="h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {analyzing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analizando con IA…
                            </>
                        ) : "⚡ Generar gráfico profesional"}
                    </button>
                </div>

                {/* ── Right: preview ── */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Visualización</span>
                        {ready && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 px-3 py-1 rounded-full">
                                ✓ Listo para insertar
                            </span>
                        )}
                        {analyzing && (
                            <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 px-3 py-1 rounded-full animate-pulse">
                                🤖 Analizando…
                            </span>
                        )}
                    </div>

                    <div className="bg-[#050a14] border border-white/5 rounded-[1.5rem] p-5 min-h-[260px] flex items-center justify-center relative overflow-hidden">
                        {error ? (
                            <div className="text-red-400 font-bold text-xs flex items-center gap-2 text-center px-4">
                                <span>⚠</span> {error}
                            </div>
                        ) : chartData ? (
                            <div className="w-full h-[240px]">
                                {renderChart()}
                            </div>
                        ) : (
                            <div className="text-center opacity-20 select-none">
                                <span className="text-5xl mb-3 block">🧪</span>
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {analyzing ? "Procesando…" : "Esperando datos"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* AI analysis panel */}
                    {axisInfo.reasoning && (
                        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-4 flex gap-3">
                            <span className="text-lg flex-shrink-0 mt-0.5">🤖</span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Análisis IA</p>
                                <p className="text-xs text-slate-400 leading-relaxed">{axisInfo.reasoning}</p>
                                {(axisInfo.xAxisLabel || axisInfo.yAxisLabel) && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        {axisInfo.xAxisLabel && (
                                            <span className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-slate-500 font-bold">
                                                X: {axisInfo.xAxisLabel}
                                            </span>
                                        )}
                                        {axisInfo.yAxisLabel && (
                                            <span className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-slate-500 font-bold">
                                                Y: {axisInfo.yAxisLabel}{axisInfo.yUnit ? ` (${axisInfo.yUnit})` : ""}{axisInfo.yUnitPrefix ? ` [${axisInfo.yUnitPrefix}]` : ""}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {ready && (
                        <p className="text-[10px] text-slate-600 text-center">
                            Inserta y <strong className="text-indigo-400">arrastra esquinas</strong> para redimensionar · <strong className="text-indigo-400">clic</strong> para reeditar
                        </p>
                    )}
                </div>
            </div>

            {/* Examples */}
            <div className="mt-8 pt-6 border-t border-white/5 flex gap-3 overflow-x-auto pb-1">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center pr-4 shrink-0">
                    Ejemplos:
                </span>
                {[
                    { name: "Ventas mensuales",    text: "| Mes | Ventas (€) | Coste (€) |\n|-----|------------|----------|\n| Ene | 4500 | 2800 |\n| Feb | 5200 | 3100 |\n| Mar | 4800 | 2900 |\n| Abr | 6100 | 3500 |" },
                    { name: "Reparto presupuesto", text: "Área,Presupuesto (€)\nMarketing,4000\nDesarrollo,12000\nRRHH,2000\nOperaciones,3500" },
                    { name: "Progreso semanal",    text: "| Semana | Progreso (%) | Objetivo (%) |\n|--------|-------------|-------------|\n| 1 | 10 | 15 |\n| 2 | 25 | 30 |\n| 3 | 45 | 45 |\n| 4 | 70 | 60 |" },
                    { name: "Velocidad vs dist.",  text: "Velocidad (km/h),Distancia (km)\n30,5\n60,20\n90,50\n120,90\n150,140" },
                    { name: "Temperatura anual",   text: "| Mes | Temp. máx. (°C) | Temp. mín. (°C) |\n|-----|------------|----------|\n| Ene | 12 | 3 |\n| Abr | 20 | 9 |\n| Jul | 34 | 22 |\n| Oct | 22 | 12 |" },
                ].map(ex => (
                    <button
                        key={ex.name}
                        onClick={() => {
                            setInputText(ex.text);
                            setChartData(null);
                            setReady(false);
                            setError(null);
                            setAxisInfo(EMPTY_AXIS);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 whitespace-nowrap hover:bg-white/10 hover:text-white transition-all shrink-0"
                    >
                        {ex.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
