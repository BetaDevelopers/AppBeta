/**
 * AdminMathOCR.jsx
 * Admin page that hosts both math OCR widgets:
 *   1. MathOCR      – canvas drawing → LaTeX (stroke data)
 *   2. MathOCRImage – image upload   → region detection (image base64)
 */
import { useState } from "react";
import MathOCR from "../../../components/admin/MathOCR";
import MathOCRImage from "../../../components/admin/MathOCRImage";
import MathEditor from "../../../components/admin/MathEditor";
import TableToChart from "../../../components/admin/TableToChart";
import ChartToTable from "../../../components/admin/ChartToTable";
import GeometryCanvas from "../../../components/admin/GeometryCanvas";
import DiagramCanvas from "../../../components/admin/DiagramCanvas";
import HandwritingCalibrator from "../../../components/admin/HandwritingCalibrator";

const TABS = [
    { id: "draw", label: "✏️ Draw", sub: "Stroke → LaTeX" },
    { id: "image", label: "🖼 Image Upload", sub: "Image → Regions" },
    { id: "editor", label: "✍️ Edit Text", sub: "Text → Math Sync" },
    { id: "table", label: "📊 Table AI", sub: "Table → Chart" },
    { id: "extract", label: "📸 Chart Visual", sub: "Chart → Table" },
    { id: "geometry", label: "🎨 Geometry", sub: "Hand-draw → SVG" },
    { id: "diagram", label: "📉 Diagram AI", sub: "Schematic → Data" },
    { id: "calibrate", label: "📐 Calibrate", sub: "Profile Stylus" },
];

export default function AdminMathOCR() {
    const [tab, setTab] = useState("draw");

    return (
        <div style={{ minHeight: "100%", paddingBottom: "48px" }}>

            {/* ── Page header ── */}
            <div style={S.pageHeader}>
                <div>
                    <h1 style={S.pageTitle}>Math OCR</h1>
                    <p style={S.pageDesc}>
                        Handwritten equation recognition &amp; image-based math detection · powered by LaTeX
                    </p>
                </div>
            </div>

            {/* ── Tab switcher ── */}
            <div style={S.tabBar}>
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        id={`math-ocr-tab-${t.id}`}
                        style={{ ...S.tabBtn, ...(tab === t.id ? S.tabBtnActive : {}) }}
                        onClick={() => setTab(t.id)}
                    >
                        <span style={S.tabLabel}>{t.label}</span>
                        <span style={S.tabSub}>{t.sub}</span>
                    </button>
                ))}
            </div>

            {/* ── Widget ── */}
            <div style={S.widgetWrap}>
                {tab === "draw" && <MathOCR />}
                {tab === "image" && <MathOCRImage />}
                {tab === "editor" && <MathEditor />}
                {tab === "table" && <TableToChart />}
                {tab === "extract" && <ChartToTable />}
                {tab === "geometry" && <GeometryCanvas />}
                {tab === "diagram" && <DiagramCanvas />}
                {tab === "calibrate" && <HandwritingCalibrator />}
            </div>

            {/* ── Endpoint reference card ── */}
            <div style={S.refCard}>
                <div style={S.refTitle}>📡 API Reference</div>
                <div style={S.refGrid}>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/math-ocr</code>
                        <span style={S.refDesc}>Strokes → LaTeX</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/math-ocr-image</code>
                        <span style={S.refDesc}>Image → Regions</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/math-editor</code>
                        <span style={S.refDesc}>Text → Math Sync</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/table-analyzer</code>
                        <span style={S.refDesc}>Table → Chart</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/chart-to-table</code>
                        <span style={S.refDesc}>Chart → Table</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/geometry-vectorizer</code>
                        <span style={S.refDesc}>Hand-draw → SVG</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/diagram-interpreter</code>
                        <span style={S.refDesc}>Drawing → Data</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={S.refMethod}>POST</span>
                        <code style={S.refPath}>/api/v1/handwriting-calibrator</code>
                        <span style={S.refDesc}>Profile → Matrix</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={{ ...S.refMethod, background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>GET</span>
                        <code style={S.refPath}>/api/v1/math-ocr/demo</code>
                        <span style={S.refDesc}>Demo response</span>
                    </div>
                    <div style={S.refItem}>
                        <span style={{ ...S.refMethod, background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>GET</span>
                        <code style={S.refPath}>/api/v1/math-ocr-image/demo</code>
                        <span style={S.refDesc}>Demo response</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const S = {
    pageHeader: {
        marginBottom: "24px",
    },
    pageTitle: {
        fontSize: "26px",
        fontWeight: 800,
        color: "#1a1a2e",
        margin: 0,
        letterSpacing: "-0.4px",
        fontFamily: "'Inter', sans-serif",
    },
    pageDesc: {
        fontSize: "13px",
        color: "#6b7280",
        margin: "4px 0 0",
        fontFamily: "'Inter', sans-serif",
    },

    tabBar: {
        display: "flex",
        gap: "10px",
        marginBottom: "24px",
        flexWrap: "wrap",
    },
    tabBtn: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
        padding: "12px 22px",
        borderRadius: "12px",
        border: "1.5px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        transition: "all 0.18s",
        fontFamily: "'Inter', sans-serif",
        minWidth: "160px",
    },
    tabBtnActive: {
        border: "1.5px solid #7c3aed",
        background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
        boxShadow: "0 2px 12px rgba(124,58,237,0.15)",
    },
    tabLabel: {
        fontSize: "14px",
        fontWeight: 700,
        color: "#1f2937",
    },
    tabSub: {
        fontSize: "11px",
        color: "#9ca3af",
    },

    widgetWrap: {
        marginBottom: "32px",
    },

    refCard: {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "20px 24px",
        fontFamily: "'Inter', sans-serif",
    },
    refTitle: {
        fontSize: "13px",
        fontWeight: 700,
        color: "#374151",
        marginBottom: "14px",
    },
    refGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "10px",
    },
    refItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "#f9fafb",
        borderRadius: "8px",
        border: "1px solid #f3f4f6",
    },
    refMethod: {
        background: "rgba(124,58,237,0.1)",
        color: "#7c3aed",
        borderRadius: "4px",
        padding: "2px 7px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
    },
    refPath: {
        fontFamily: "'Fira Code', monospace",
        fontSize: "11px",
        color: "#374151",
        flex: 1,
        wordBreak: "break-all",
    },
    refDesc: {
        fontSize: "11px",
        color: "#9ca3af",
        whiteSpace: "nowrap",
    },
};
