/**
 * GeometryCanvas.jsx
 *
 * Handwriting → Perfect Geometry.
 * Draw messy shapes, get perfect SVG elements.
 */

import { useRef, useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export default function GeometryCanvas({ apiBase = API_BASE }) {
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Sync ──
    async function handleSnap(rawPoints) {
        if (rawPoints.length < 5) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/geometry-vectorizer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    points: rawPoints,
                    canvasWidth: 500,
                    canvasHeight: 300
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

    // ── Canvas Drawing Handlers ──
    const getXY = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e) => {
        setIsDrawing(true);
        setPoints([getXY(e)]);
        setResult(null);
    };

    const onMove = (e) => {
        if (!isDrawing) return;
        const pt = getXY(e);
        setPoints(prev => [...prev, pt]);

        const ctx = canvasRef.current.getContext("2d");
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(167, 139, 250, 0.4)";
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
    };

    const onUp = () => {
        setIsDrawing(false);
        if (points.length > 5) handleSnap(points);
    };

    const clear = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, 500, 300);
        setPoints([]);
        setResult(null);
    };

    return (
        <div style={S.wrapper}>
            <div style={S.header}>
                <span style={S.icon}>🎨</span>
                <div>
                    <h2 style={S.title}>Geometry Vectorizer</h2>
                    <p style={S.subtitle}>Draw a rough shape → Snap to perfect SVG geometry.</p>
                </div>
            </div>

            <div style={S.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    width={500} height={300}
                    style={S.canvas}
                    onMouseDown={onDown}
                    onMouseMove={onMove}
                    onMouseUp={onUp}
                />

                {/* SVG Result Overlay */}
                {result && result.shape !== "unknown" && (
                    <svg style={S.overlay} width={500} height={300}>
                        <g style={S.svgGroup} dangerouslySetInnerHTML={{ __html: result.svgElement }} />
                    </svg>
                )}

                {loading && <div style={S.loader}>Snapping...</div>}
                {!isDrawing && points.length === 0 && <div style={S.hint}>Draw a circle, rectangle or triangle here.</div>}
            </div>

            <div style={S.controls}>
                <button style={S.clearBtn} onClick={clear}>🗑 Clear</button>
                {result && result.shape !== "unknown" && (
                    <div style={S.resInfo}>
                        <span style={S.badge}>{result.shape.toUpperCase()}</span>
                        <code style={S.code}>{result.svgElement}</code>
                    </div>
                )}
            </div>
        </div>
    );
}

const S = {
    wrapper: { background: "#060410", padding: "24px", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.3)", maxWidth: "550px", margin: "0 auto" },
    header: { display: "flex", gap: "10px", marginBottom: "16px" },
    icon: { fontSize: "22px" },
    title: { margin: 0, fontSize: "17px", color: "#f0e6ff" },
    subtitle: { fontSize: "11px", color: "#9d8ec7", margin: "2px 0 0" },
    canvasWrap: { position: "relative", background: "#000", borderRadius: "12px", border: "1px solid #1a1530", overflow: "hidden" },
    canvas: { display: "block", cursor: "crosshair" },
    overlay: { position: "absolute", top: 0, left: 0, pointerEvents: "none" },
    svgGroup: { stroke: "#4ade80", strokeWidth: 3, fill: "rgba(74,222,128,0.1)" },
    loader: { position: "absolute", top: "10px", right: "10px", fontSize: "11px", color: "#a78bfa", background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: "4px" },
    hint: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "13px", color: "#3a3062", pointerEvents: "none" },
    controls: { marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" },
    clearBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9d8ec7", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
    resInfo: { flex: 1, display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" },
    badge: { fontSize: "10px", fontWeight: 800, background: "#4ade80", color: "#060410", padding: "2px 6px", borderRadius: "4px" },
    code: { fontSize: "10px", color: "#9d8ec7", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
};
