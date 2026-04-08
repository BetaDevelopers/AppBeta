/**
 * MathToolsPage.jsx — Pàgina d'eines matemàtiques (ruta /tools).
 * Agrupa tots els components math amb pestanyes.
 */

import { useState } from "react";
import MathOCR from "../features/math/components/MathOCR";
import MathOCRImage from "../features/math/components/MathOCRImage";
import MathEditor from "../features/math/components/MathEditor";
import TableToChart from "../features/math/components/TableToChart";
import ChartToTable from "../features/math/components/ChartToTable";
import GeometryCanvas from "../features/math/components/GeometryCanvas";
import DiagramCanvas from "../features/math/components/DiagramCanvas";
import HandwritingCalibrator from "../features/math/components/HandwritingCalibrator";

const TABS = [
    { id: "draw", label: "✏️ Draw", sub: "Stroke → LaTeX" },
    { id: "image", label: "🖼 Image Upload", sub: "Image → OCR" },
    { id: "editor", label: "✍️ Edit Text", sub: "Text → Math Sync" },
    { id: "table", label: "📊 Table AI", sub: "Table → Chart" },
    { id: "extract", label: "📸 Chart Visual", sub: "Chart → Table" },
    { id: "geometry", label: "🎨 Geometry", sub: "Hand-draw → SVG" },
    { id: "diagram", label: "📉 Diagram AI", sub: "Schematic → Data" },
    { id: "calibrate", label: "📐 Calibrate", sub: "Profile Stylus" },
];

export default function MathToolsPage() {
    const [tab, setTab] = useState("draw");

    return (
        <div style={{ minHeight: "100%", paddingBottom: "48px" }}>
            <div style={S.pageHeader}>
                <div>
                    <h1 style={S.pageTitle}>🧮 Eines Math</h1>
                    <p style={S.pageDesc}>
                        Reconeixement d'equacions manuscrites, OCR d'imatges, gràfics i més · powered by IA
                    </p>
                </div>
            </div>

            <div style={S.tabBar}>
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        style={{ ...S.tabBtn, ...(tab === t.id ? S.tabBtnActive : {}) }}
                        onClick={() => setTab(t.id)}
                    >
                        <span style={S.tabLabel}>{t.label}</span>
                        <span style={S.tabSub}>{t.sub}</span>
                    </button>
                ))}
            </div>

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
        </div>
    );
}

const S = {
    pageHeader: { marginBottom: "24px" },
    pageTitle: { fontSize: "26px", fontWeight: 800, color: "#1a1a2e", margin: 0, letterSpacing: "-0.4px", fontFamily: "'Inter', sans-serif" },
    pageDesc: { fontSize: "13px", color: "#6b7280", margin: "4px 0 0", fontFamily: "'Inter', sans-serif" },
    tabBar: { display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" },
    tabBtn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "12px 22px", borderRadius: "12px", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", transition: "all 0.18s", fontFamily: "'Inter', sans-serif", minWidth: "130px" },
    tabBtnActive: { border: "1.5px solid #7c3aed", background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", boxShadow: "0 2px 12px rgba(124,58,237,0.15)" },
    tabLabel: { fontSize: "13px", fontWeight: 700, color: "#1f2937" },
    tabSub: { fontSize: "11px", color: "#9ca3af" },
    widgetWrap: { marginBottom: "32px" },
};
