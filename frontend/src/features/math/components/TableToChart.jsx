import { useState, useMemo, useCallback } from "react";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
import { tableToChart } from "../../../api/mathApi";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const SAMPLE_MD = `| Product | Sales | Cost |
|---------|-------|------|
| Laptop  | 1200  | 800  |
| Mouse   | 450   | 150  |
| Keyboard| 780   | 340  |
| Monitor | 950   | 500  |`;

export default function TableToChart({ onResult } = {}) {
    const [inputText, setInputText] = useState(SAMPLE_MD);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = useCallback(async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const data = await tableToChart(inputText);
            setResult(data);
            if (data?.reasoning && onResult) onResult(data.reasoning);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [inputText, onResult]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: { color: "#94a3b8", font: { family: "Inter", weight: '600', size: 10 } }
            },
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                titleColor: "#6366f1",
                bodyColor: "#f8fafc",
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: { weight: '800' }
            },
        },
        scales: result?.chartType !== "pie" ? {
            x: {
                grid: { color: "rgba(255, 255, 255, 0.03)" },
                ticks: { color: "#475569", font: { size: 10 } }
            },
            y: {
                grid: { color: "rgba(255, 255, 255, 0.03)" },
                ticks: { color: "#475569", font: { size: 10 } }
            },
        } : {},
    }), [result]);

    const renderChart = () => {
        if (!result) return null;
        const { chartType, chartData } = result;
        const props = { data: chartData, options: chartOptions };
        switch (chartType) {
            case "line": return <Line {...props} />;
            case "pie": return <Pie {...props} />;
            case "scatter": return <Scatter {...props} />;
            default: return <Bar {...props} />;
        }
    };

    return (
        <div className="bg-[#030712]/60 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl max-w-6xl mx-auto font-sans">
            <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-4xl border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                    📊
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Data Insights Engine</h2>
                    <p className="text-sm text-slate-500 font-medium">Smart conversion from raw tables to analytical visualizations</p>
                </div>
                {loading && (
                    <div className="ml-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-600/10 border border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Generating Insight...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Column */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Source Dataset</span>
                        <span className="text-[10px] font-bold text-slate-600">Markdown / CSV Compatible</span>
                    </div>
                    <textarea
                        className="h-[340px] w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm text-indigo-200 font-mono resize-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none transition-all placeholder:text-slate-800"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="| Month | Value | ..."
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all disabled:opacity-30 active:scale-[0.98]"
                    >
                        {loading ? "Analyzing Structure..." : "⚡ Plot Visualization"}
                    </button>
                </div>

                {/* Preview Column */}
                <div className="flex flex-col">
                    <div className="flex items-center justify-between px-2 mb-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Visualization</span>
                        {result && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 px-3 py-1 rounded-full">
                                {result.chartType} detected
                            </span>
                        )}
                    </div>

                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 min-h-[340px] flex items-center justify-center relative overflow-hidden group">
                        {loading && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4">
                                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                <span className="text-xs font-bold text-emerald-500/80">Mapping data points...</span>
                            </div>
                        )}

                        {error ? (
                            <div className="text-red-400 font-bold text-xs flex items-center gap-2">
                                <span>⚠</span> {error}
                            </div>
                        ) : result ? (
                            <div className="w-full h-full animate-in fade-in zoom-in-95 duration-700">
                                {renderChart()}
                            </div>
                        ) : (
                            <div className="text-center opacity-20">
                                <span className="text-6xl mb-4 block">🧪</span>
                                <p className="text-xs font-black uppercase tracking-widest">Waiting for data</p>
                            </div>
                        )}
                    </div>

                    {result?.reasoning && (
                        <div className="mt-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4 animate-in slide-in-from-bottom-2">
                            <span className="text-xl">💡</span>
                            <p className="text-xs text-slate-400 leading-relaxed"><strong className="text-indigo-400 uppercase tracking-tighter">AI Reasoning:</strong> {result.reasoning}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center pr-4">Load Examples:</span>
                {[
                    { name: "Monthly Revenue", text: "| Month | Revenue |\n|-------|---------|\n| Jan   | 4500    |\n| Feb   | 5200    |\n| Mar   | 4800    |" },
                    { name: "Budget Share", text: "Category,Budget,Spent\nMarketing,4000,3800\nDev,12000,11500\nHR,2000,2100" },
                    { name: "Performance Metric", text: "Week,Progress,Target\n1,10,15\n2,25,30\n3,45,45\n4,70,60" }
                ].map(ex => (
                    <button
                        key={ex.name}
                        onClick={() => setInputText(ex.text)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 whitespace-nowrap hover:bg-white/10 hover:text-white transition-all shadow-sm"
                    >
                        {ex.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
