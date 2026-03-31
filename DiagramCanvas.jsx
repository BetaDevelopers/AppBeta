/**
 * DiagramCanvas.jsx
 *
 * Hand-drawn Diagram → Business Chart / Circuit Description.
 * Draw multiple strokes (axes, bars, paths) and get a decoded digital counterpart.
 */

import { useRef, useState, useEffect } from "react";
import { Bar, Line } from "react-chartjs-2";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export default function DiagramCanvas({ apiBase = API_BASE }) {
    const canvasRef = useRef(null);
    const [allStrokes, setAllStrokes] = useState([]); // [{points: {x,y}[]}]
    const [currentStroke, setCurrentStroke] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Sync ──
    async function interpret(strokes) {
        if (strokes.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/diagram-interpreter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    strokes: strokes,
                    canvasWidth: 600,
                    canvasHeight: 350
                }),
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // ── Canvas Handlers ──
    const getXY = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return { x, y };
    };

    const onDown = (e) => {
        setIsDrawing(true);
        setCurrentStroke([getXY(e)]);
    };

    const onMove = (e) => {
        if (!isDrawing) return;
        const pt = getXY(e);
        setCurrentStroke(prev => [...prev, pt]);

        const ctx = canvasRef.current.getContext("2d");
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#e2d9f3";
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
    };

    const onUp = () => {
        if (currentStroke) {
            const updated = [...allStrokes, { points: currentStroke, timestamp: Date.now() }];
            setAllStrokes(updated);
            setCurrentStroke(null);
        }
        setIsDrawing(false);
    };

    const clear = () => {
        canvasRef.current.getContext("2d").clearRect(0, 0, 600, 350);
        setAllStrokes([]);
        setResult(null);
    };

    return (
        <div style={S.wrapper}>
            <div style={S.header}>
                <span style={S.icon}>📉</span>
                <div>
                    <h2 style={S.title}>Hand-drawn Diagram Interpreter</h2>
                    <p style={S.subtitle}>Draw a bar chart, a line chart, or a circuit schematic.</p>
                </div>
            </div>

            <div style={S.grid}>
                {/* Draw Area */}
                <div style={S.drawCol}>
                    <div style={S.canvasWrap}>
                        <canvas
                            ref={canvasRef} width={600} height={350}
                            style={S.canvas}
                            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
                            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                        />
                        {allStrokes.length === 0 && <div style={S.hint}>Draw axes and bars/lines here...</div>}
                    </div>
                    <div style={S.btnRow}>
                        <button style={S.clearBtn} onClick={clear}>🗑 Clear</button>
                        <button style={S.mainBtn} onClick={() => interpret(allStrokes)} disabled={allStrokes.length === 0 || loading}>
                            {loading ? "Interpreting..." : "⚡ Decode Schematic"}
                        </button>
                    </div>
                </div>

                {/* Interpretation Area */}
                <div style={S.resCol}>
                    <div style={S.resBox}>
                        {!result ? (
                            <div style={S.empty}>Structural interpretation will appear here.</div>
                        ) : (
                            <div style={S.resultContent}>
                                <span style={S.typeBadge}>TYPE: {result.diagramType.toUpperCase()}</span>

                                {result.description && <p style={S.desc}>{result.description}</p>}

                                {result.chartConfig && result.diagramType === "bar" && (
                                    <div style={S.chartWrap}><Bar data={result.chartConfig.data} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                )}
                                {result.chartConfig && result.diagramType === "line" && (
                                    <div style={S.chartWrap}><Line data={result.chartConfig.data} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                                )}

                                {result.diagramType === "circuit" && (
                                    <div style={S.circuitIcon}>🔌</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const S = {
    wrapper: { background: "#060410", padding: "24px", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.3)", maxWidth: "1000px", margin: "0 auto" },
    header: { display: "flex", gap: "10px", marginBottom: "20px" },
    title: { margin: 0, fontSize: "19px", color: "#f0e6ff" },
    subtitle: { fontSize: "12px", color: "#9d8ec7" },
    icon: { fontSize: "28px" },
    grid: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" },
    drawCol: { display: "flex", flexDirection: "column", gap: "12px" },
    canvasWrap: { background: "#000", border: "1.5px solid #1a1530", borderRadius: "14px", overflow: "hidden", position: "relative" },
    canvas: { width: "100%", height: "auto", display: "block", cursor: "crosshair", touchAction: "none" },
    btnRow: { display: "flex", gap: "10px" },
    clearBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9d8ec7", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" },
    mainBtn: { background: "#7c3aed", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, flex: 1, cursor: "pointer" },
    hint: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#3a3062", pointerEvents: "none" },
    resCol: { display: "flex", flexDirection: "column" },
    resBox: { flex: 1, background: "rgba(0,0,0,0.3)", border: "1.5px solid rgba(139,92,246,0.15)", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" },
    empty: { color: "#5a507a", fontSize: "13px", textAlign: "center", fontStyle: "italic" },
    resultContent: { width: "100%", height: "100%", display: "flex", flexDirection: "column" },
    typeBadge: { background: "#7c3aed", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 800, alignSelf: "flex-start", marginBottom: "12px" },
    desc: { fontSize: "13px", color: "#c4b5fd", lineHeight: 1.5, margin: "0 0 16px" },
    chartWrap: { flex: 1, minHeight: "200px" },
    circuitIcon: { fontSize: "60px", textAlign: "center", marginTop: "40px" }
};
