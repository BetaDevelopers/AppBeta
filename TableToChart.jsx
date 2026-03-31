/**
 * TableToChart.jsx
 *
 * Tabular Data → AI Analysis → Interactive Chart.js.
 * Paste a Markdown or CSV table and see the most appropriate visualization.
 *
 * Usage:
 *   <TableToChart apiBase="http://localhost:8000/api/v1" />
 *
 * POST /api/v1/table-analyzer
 *   { tableMarkdown: string }
 *   → { chartType, chartData, reasoning }
 */

import { useState, useMemo, useCallback } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

const SAMPLE_MD = `| Product | Sales | Cost |
|---------|-------|------|
| Laptop  | 1200  | 800  |
| Mouse   | 450   | 150  |
| Keyboard| 780   | 340  |
| Monitor | 950   | 500  |`;

// ─── Component ──────────────────────────────────────────────────────────────
export default function TableToChart({ apiBase = API_BASE }) {
    const [inputText, setInputText] = useState(SAMPLE_MD);
    const [result, setResult] = useState(null); // { chartType, chartData, reasoning }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Analyze ──
    const handleAnalyze = useCallback(async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/table-analyzer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableMarkdown: inputText }),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiBase, inputText]);

    // ── Chart Config ──
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: "bottom", labels: { color: "#e2d9f3", font: { family: "Inter" } } },
            tooltip: {
                backgroundColor: "rgba(15, 10, 30, 0.95)",
                titleColor: "#a78bfa",
                bodyColor: "#f0e6ff",
                borderColor: "rgba(139, 92, 246, 0.2)",
                borderWidth: 1,
            },
        },
        scales: result?.chartType !== "pie" ? {
            x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#9d8ec7" } },
            y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#9d8ec7" } },
        } : {},
    }), [result]);

    // ── Render Chart ──
    const renderChart = () => {
        if (!result) return null;
        const { chartType, chartData } = result;

        switch (chartType) {
            case "line": return <Line data={chartData} options={chartOptions} />;
            case "pie": return <Pie data={chartData} options={chartOptions} />;
            case "scatter": return <Scatter data={chartData} options={chartOptions} />;
            default: return <Bar data={chartData} options={chartOptions} />;
        }
    };

    return (
        <div style={S.wrapper} id="table-analyzer-widget">
            {/* Header */}
            <div style={S.header}>
                <span style={S.headerIcon}>📊</span>
                <div>
                    <h2 style={S.title}>Table Data Visualizer</h2>
                    <p style={S.subtitle}>
                        Paste Markdown or CSV · AI suggests the best chart · Dynamic result
                    </p>
                </div>
            </div>

            <div style={S.grid}>
                {/* INPUT side */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={S.tag}>RAW TABLE</span>
                        <span style={S.label}>Paste Markdown or CSV</span>
                    </div>
                    <textarea
                        style={S.textarea}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="| Col 1 | Col 2 | ..."
                        id="table-analyzer-input"
                    />
                    <button
                        style={S.btn}
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? <span style={S.spinner} /> : "⚡ Analyze & Plot"}
                    </button>
                </div>

                {/* OUTPUT side */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={{ ...S.tag, background: "#10b981" }}>CHART</span>
                        <span style={S.label}>Dynamic Visualization</span>
                        {result && (
                            <span style={S.typeBadge}>
                                {result.chartType.toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div style={S.chartBox}>
                        {loading && (
                            <div style={S.loadingOverlay}>
                                <span style={S.spinnerBig} />
                                <span style={S.loadingText}>Analyzing dataset structure...</span>
                            </div>
                        )}

                        {error ? (
                            <div style={S.errorBox}>⚠ {error}</div>
                        ) : result ? (
                            <div style={S.chartInner}>{renderChart()}</div>
                        ) : (
                            <div style={S.emptyState}>
                                No data analyzed yet. Click the button to see the chart.
                            </div>
                        )}
                    </div>

                    {result && (
                        <div style={S.reasoning}>
                            <span style={S.reasonIcon}>💡</span>
                            <p style={S.reasonText}>
                                <strong>AI Reasoning:</strong> {result.reasoning}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Examples */}
            {!result && (
                <div style={S.footer}>
                    <span style={S.footerLabel}>Quick examples (click to paste):</span>
                    <div style={S.examples}>
                        {[
                            {
                                name: "Monthly Revenue",
                                text: "| Month | Revenue |\n|-------|---------|\n| Jan   | 4500    |\n| Feb   | 5200    |\n| Mar   | 4800    |"
                            },
                            {
                                name: "Budget Share",
                                text: "Category,Budget,Spent\nMarketing,4000,3800\nDev,12000,11500\nHR,2000,2100"
                            }
                        ].map(ex => (
                            <button key={ex.name} style={S.exBtn} onClick={() => setInputText(ex.text)}>
                                {ex.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    wrapper: {
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #0a0618 0%, #10082a 100%)",
        border: "1px solid rgba(139,92,246,0.22)",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 8px 40px rgba(88,28,235,0.22), 0 2px 8px rgba(0,0,0,0.5)",
        color: "#e2d9f3",
        maxWidth: "1100px",
        margin: "0 auto",
    },
    header: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
    headerIcon: { fontSize: "28px" },
    title: { fontSize: "20px", fontWeight: 800, margin: 0, color: "#f0e6ff" },
    subtitle: { fontSize: "12px", color: "#9d8ec7", margin: "2px 0 0" },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "24px"
    },
    col: { display: "flex", flexDirection: "column", gap: "10px" },
    colHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
    tag: {
        background: "#a78bfa",
        color: "#fff",
        fontSize: "9px",
        fontWeight: 900,
        padding: "2px 6px",
        borderRadius: "4px",
        letterSpacing: "0.5px",
    },
    label: { fontSize: "12px", fontWeight: 700, color: "#9d8ec7", flex: 1 },
    typeBadge: {
        background: "rgba(16, 185, 129, 0.15)",
        color: "#10b981",
        fontSize: "10px",
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: "99px",
        border: "1px solid rgba(16, 185, 129, 0.3)",
    },

    textarea: {
        height: "300px",
        background: "rgba(0,0,0,0.3)",
        border: "1.5px solid rgba(139,92,246,0.2)",
        borderRadius: "14px",
        padding: "16px",
        fontSize: "13px",
        color: "#a78bfa",
        fontFamily: "'Fira Code', monospace",
        resize: "none",
        outline: "none",
        transition: "border-color 0.2s",
    },
    btn: {
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "12px",
        fontSize: "14px",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(124,58,237,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
    },

    chartBox: {
        height: "300px",
        background: "rgba(255,255,255,0.02)",
        border: "1.5px solid rgba(139,92,246,0.15)",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "20px",
        overflow: "hidden",
    },
    chartInner: { width: "100%", height: "100%" },
    emptyState: { color: "#5a507a", fontSize: "14px", fontWeight: 500, fontStyle: "italic" },
    loadingOverlay: {
        position: "absolute",
        inset: 0,
        background: "rgba(10, 6, 24, 0.7)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
    },
    loadingText: { fontSize: "12px", color: "#a78bfa" },
    spinner: { width: "16px", height: "16px", border: "2.5px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    spinnerBig: { width: "32px", height: "32px", border: "4px solid rgba(124,58,237,0.1)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

    errorBox: { color: "#f87171", fontSize: "13px", padding: "20px" },

    reasoning: {
        marginTop: "12px",
        background: "rgba(124,58,237,0.06)",
        border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
    },
    reasonIcon: { fontSize: "18px" },
    reasonText: { margin: 0, fontSize: "12px", lineHeight: 1.5, color: "#c4b5fd" },

    footer: { marginTop: "20px", borderTop: "1px solid rgba(139,92,246,0.15)", paddingTop: "16px" },
    footerLabel: { fontSize: "12px", color: "#9d8ec7", marginBottom: "8px", display: "block" },
    examples: { display: "flex", gap: "8px" },
    exBtn: {
        background: "rgba(139,92,246,0.1)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: "6px",
        padding: "4px 10px",
        color: "#a78bfa",
        fontSize: "11px",
        cursor: "pointer",
    },
};
