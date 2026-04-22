import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

const SAMPLE_MD = `| Producto | Ventas | Coste |
|----------|--------|-------|
| Laptop   | 1200   | 800   |
| Mouse    | 450    | 150   |
| Teclado  | 780    | 340   |
| Monitor  | 950    | 500   |`;

const CHART_TYPES = [
    { id: "bar",      label: "Barras",  icon: "▊" },
    { id: "line",     label: "Líneas",  icon: "╱" },
    { id: "area",     label: "Área",    icon: "◣" },
    { id: "pie",      label: "Pastel",  icon: "◔" },
    { id: "doughnut", label: "Anillo",  icon: "◎" },
    { id: "scatter",  label: "Puntos",  icon: "⁘" },
];

const PALETTE = [
    { bg: "rgba(99,102,241,0.75)",  border: "rgb(99,102,241)" },
    { bg: "rgba(16,185,129,0.75)",  border: "rgb(16,185,129)" },
    { bg: "rgba(245,158,11,0.75)",  border: "rgb(245,158,11)" },
    { bg: "rgba(239,68,68,0.75)",   border: "rgb(239,68,68)" },
    { bg: "rgba(59,130,246,0.75)",  border: "rgb(59,130,246)" },
    { bg: "rgba(168,85,247,0.75)",  border: "rgb(168,85,247)" },
    { bg: "rgba(236,72,153,0.75)",  border: "rgb(236,72,153)" },
    { bg: "rgba(20,184,166,0.75)",  border: "rgb(20,184,166)" },
];

function parseTable(text) {
    const rawLines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 2) return null;

    if (!text.includes("|")) {
        const rows = rawLines.map(l => l.split(",").map(c => c.trim()));
        if (rows.length < 2) return null;
        return { headers: rows[0], rows: rows.slice(1) };
    }

    const tableLines = rawLines.filter(l => l.includes("|") && !/^\|[\s\-|]+\|$/.test(l));
    if (tableLines.length < 2) return null;

    const parseRow = line =>
        line.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

    return { headers: parseRow(tableLines[0]), rows: tableLines.slice(1).map(parseRow) };
}

function buildChartData(parsed, chartType) {
    const { headers, rows } = parsed;
    const labels = rows.map(r => r[0] ?? "");

    const numericColIndices = headers
        .map((_, i) => i).slice(1)
        .filter(i => rows.some(r => r[i] !== undefined && !isNaN(parseFloat(r[i]))));

    if (numericColIndices.length === 0) return null;

    const isPolar = chartType === "pie" || chartType === "doughnut";

    if (isPolar) {
        const i = numericColIndices[0];
        return {
            labels,
            datasets: [{
                label: headers[i] ?? "Valor",
                data: rows.map(r => parseFloat(r[i]) || 0),
                backgroundColor: PALETTE.map(c => c.bg),
                borderColor: PALETTE.map(c => c.border),
                borderWidth: 2,
            }],
        };
    }

    if (chartType === "scatter") {
        if (numericColIndices.length < 2) return null;
        const xi = numericColIndices[0];
        const yi = numericColIndices[1];
        return {
            datasets: [{
                label: `${headers[xi]} vs ${headers[yi]}`,
                data: rows.map(r => ({ x: parseFloat(r[xi]) || 0, y: parseFloat(r[yi]) || 0 })),
                backgroundColor: PALETTE[0].bg,
                borderColor: PALETTE[0].border,
                pointRadius: 6,
            }],
        };
    }

    const isArea = chartType === "area";
    return {
        labels,
        datasets: numericColIndices.map((ci, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            return {
                label: headers[ci] ?? `Serie ${idx + 1}`,
                data: rows.map(r => parseFloat(r[ci]) || 0),
                backgroundColor: isArea ? color.bg.replace("0.75", "0.2") : color.bg,
                borderColor: color.border,
                borderWidth: 2,
                fill: isArea,
                tension: 0.4,
                pointBackgroundColor: color.border,
                pointRadius: isArea ? 4 : 3,
            };
        }),
    };
}

export default function TableToChart({ onResult, initialConfig } = {}) {
    const [inputText, setInputText] = useState(initialConfig?.tableData || SAMPLE_MD);
    const [chartType, setChartType] = useState(initialConfig?.chartType || "bar");
    const [chartData, setChartData]   = useState(null);
    const [error, setError]           = useState(null);
    const [ready, setReady]           = useState(false); // true once canvas is captured
    const chartRef   = useRef(null);
    // Callback fired by Chart.js onComplete — uses ref so useMemo doesn't stale
    const onCompleteRef = useRef(null);

    // When editing an existing chart, re-fill from config
    useEffect(() => {
        if (initialConfig) {
            setInputText(initialConfig.tableData || SAMPLE_MD);
            setChartType(initialConfig.chartType || "bar");
            setChartData(null);
            setReady(false);
            setError(null);
        }
    }, [initialConfig]);

    const handleGenerate = useCallback(() => {
        setError(null);
        setReady(false);

        const parsed = parseTable(inputText);
        if (!parsed) {
            setError("No se ha podido leer la tabla. Usa formato Markdown (|col|) o CSV.");
            return;
        }
        const data = buildChartData(parsed, chartType);
        if (!data) {
            setError("Necesitas al menos una columna numérica para graficar.");
            return;
        }

        // Set capture callback — fires when Chart.js finishes animation
        onCompleteRef.current = () => {
            const imageBase64 = chartRef.current?.toBase64Image?.("image/png", 1) ?? null;
            if (imageBase64 && onResult) {
                onResult(JSON.stringify({ imageBase64, chartType, tableData: inputText }));
                setReady(true);
            }
            onCompleteRef.current = null;
        };

        setChartData(data);
    }, [inputText, chartType, onResult]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 400,
            onComplete: () => { onCompleteRef.current?.(); },
        },
        plugins: {
            legend: {
                position: "bottom",
                labels: { color: "#94a3b8", font: { family: "Inter", weight: "600", size: 11 } },
            },
            tooltip: {
                backgroundColor: "rgba(15,23,42,0.95)",
                titleColor: "#6366f1",
                bodyColor: "#f8fafc",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: chartType === "pie" || chartType === "doughnut" ? {} : {
            x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#475569", font: { size: 11 } } },
            y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#475569", font: { size: 11 } } },
        },
    }), [chartType]);

    const renderChart = () => {
        if (!chartData) return null;
        const props = { ref: chartRef, data: chartData, options: chartOptions };
        switch (chartType) {
            case "line":     return <Line {...props} />;
            case "area":     return <Line {...props} />;
            case "pie":      return <Pie {...props} />;
            case "doughnut": return <Doughnut {...props} />;
            case "scatter":  return <Scatter {...props} />;
            default:         return <Bar {...props} />;
        }
    };

    return (
        <div className="bg-[#030712]/60 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-6xl mx-auto font-sans">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-3xl border border-emerald-500/20">
                    📊
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Motor de análisis de datos</h2>
                    <p className="text-sm text-slate-500 font-medium">Conversión inteligente de tablas sin procesar a visualizaciones analíticas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Column */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Conjunto de datos de origen</span>
                        <span className="text-[10px] font-bold text-slate-600">Compatible con Markdown/CSV</span>
                    </div>
                    <textarea
                        className="h-[220px] w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm text-indigo-200 font-mono resize-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none transition-all placeholder:text-slate-800"
                        value={inputText}
                        onChange={e => { setInputText(e.target.value); setChartData(null); setReady(false); setError(null); }}
                        placeholder="| Mes | Valor | ..."
                    />

                    {/* Chart type selector */}
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Tipo de gráfico</span>
                        <div className="grid grid-cols-3 gap-2">
                            {CHART_TYPES.map(ct => (
                                <button
                                    key={ct.id}
                                    onClick={() => { setChartType(ct.id); setChartData(null); setReady(false); }}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                        chartType === ct.id
                                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
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
                        className="h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all active:scale-[0.98]"
                    >
                        ⚡ Generar gráfico
                    </button>
                </div>

                {/* Preview Column */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Visualización en vivo</span>
                        {ready && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 px-3 py-1 rounded-full animate-in fade-in">
                                ✓ Listo para insertar
                            </span>
                        )}
                        {chartData && !ready && (
                            <span className="bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                                Preparando…
                            </span>
                        )}
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 min-h-[260px] flex items-center justify-center relative overflow-hidden">
                        {error ? (
                            <div className="text-red-400 font-bold text-xs flex items-center gap-2 text-center px-4">
                                <span>⚠</span> {error}
                            </div>
                        ) : chartData ? (
                            <div className="w-full h-[240px]">
                                {renderChart()}
                            </div>
                        ) : (
                            <div className="text-center opacity-20">
                                <span className="text-5xl mb-3 block">🧪</span>
                                <p className="text-xs font-black uppercase tracking-widest">Esperando datos</p>
                            </div>
                        )}
                    </div>

                    {ready && (
                        <p className="text-[10px] text-slate-500 text-center">
                            Inserta y luego <strong className="text-indigo-400">arrastra las esquinas</strong> para cambiar el tamaño · <strong className="text-indigo-400">haz clic</strong> para editar datos
                        </p>
                    )}
                </div>
            </div>

            {/* Examples */}
            <div className="mt-8 pt-8 border-t border-white/5 flex gap-4 overflow-x-auto pb-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center pr-4 shrink-0">Ejemplos:</span>
                {[
                    { name: "Ingresos mensuales",              text: "| Mes | Ingresos |\n|-----|----------|\n| Ene | 4500     |\n| Feb | 5200     |\n| Mar | 4800     |\n| Abr | 6100     |" },
                    { name: "Participación presupuesto",       text: "Categoría,Presupuesto,Gasto\nMarketing,4000,3800\nDesarrollo,12000,11500\nRRHH,2000,2100" },
                    { name: "Métrica de rendimiento",          text: "| Semana | Progreso | Objetivo |\n|--------|----------|----------|\n| 1      | 10       | 15       |\n| 2      | 25       | 30       |\n| 3      | 45       | 45       |\n| 4      | 70       | 60       |" },
                ].map(ex => (
                    <button
                        key={ex.name}
                        onClick={() => { setInputText(ex.text); setChartData(null); setReady(false); setError(null); }}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 whitespace-nowrap hover:bg-white/10 hover:text-white transition-all shrink-0"
                    >
                        {ex.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
