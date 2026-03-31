/**
 * HandwritingCalibrator.jsx
 *
 * Stylus Profiling → Normalization Matrix.
 * Draw a character like 'E' or '8' and see how the AI profiles your writing.
 */

import { useRef, useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export default function HandwritingCalibrator({ apiBase = API_BASE }) {
    const canvasRef = useRef(null);
    const [strokes, setStrokes] = useState([]); // [{points: {x,y}[]}]
    const [currentStroke, setCurrentStroke] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Sync ──
    async function calibrate(sample) {
        if (sample.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/handwriting-calibrator`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sampleStrokes: sample,
                    canvasWidth: 300,
                    canvasHeight: 300
                }),
            });
            const data = await res.json();
            setProfile(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // ── Drawing ──
    const getXY = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
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
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#a78bfa";
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
    };

    const onUp = () => {
        if (currentStroke) {
            const updated = [...strokes, { points: currentStroke }];
            setStrokes(updated);
            setCurrentStroke(null);
            calibrate(updated); // Sync and calibrate
        }
        setIsDrawing(false);
    };

    const clear = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, 300, 300);
        setStrokes([]);
        setProfile(null);
    };

    return (
        <div style={S.wrapper}>
            <div style={S.header}>
                <span style={S.icon}>📐</span>
                <div>
                    <h2 style={S.title}>Handwriting Stylus Profiler</h2>
                    <p style={S.subtitle}>Draw a letter ('A') or number ('8') to calibrate.</p>
                </div>
            </div>

            <div style={S.grid}>
                {/* L: CANVAS */}
                <div style={S.drawCol}>
                    <div style={S.canvasWrap}>
                        <canvas
                            ref={canvasRef} width={300} height={300}
                            style={S.canvas}
                            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
                            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                        />
                        {!isDrawing && strokes.length === 0 && <div style={S.hint}>Sample Draw...</div>}
                    </div>
                    <button style={S.clearBtn} onClick={clear}>🔄 Reset Samples</button>
                </div>

                {/* R: PROFILE RESULTS */}
                <div style={S.profileCol}>
                    {!profile ? (
                        <div style={S.empty}>Provide a sample to start analysis.</div>
                    ) : (
                        <div style={{ opacity: loading ? 0.6 : 1, transition: "0.2s" }}>
                            <div style={S.statGrid}>
                                <div style={S.statCard}>
                                    <p style={S.statLabel}>AVG DIMENSIONS</p>
                                    <p style={S.statVal}>{profile.avgCharWidth} × {profile.avgCharHeight}px</p>
                                </div>
                                <div style={S.statCard}>
                                    <p style={S.statLabel}>SUGGESTED FONT</p>
                                    <p style={S.statVal}>{profile.suggestedFontSize}pt</p>
                                </div>
                            </div>

                            <div style={S.slantWrap}>
                                <div style={S.slantDial}>
                                    <div style={{ ...S.slantNeedle, transform: `rotate(${profile.slantAngle}deg)` }} />
                                </div>
                                <div style={S.slantInfo}>
                                    <p style={S.statLabel}>DOMINANT SLANT</p>
                                    <p style={S.statVal}>{profile.slantAngle}°</p>
                                </div>
                            </div>

                            <div style={S.matrixRow}>
                                <p style={S.statLabel}>NORMALIZATION VECTOR</p>
                                <div style={S.matrixBox}>
                                    <code style={S.mCode}>Scale: ×{profile.normalizationMatrix.scaleX}</code>
                                    <code style={S.mCode}>Rot: {profile.normalizationMatrix.rotation}°</code>
                                </div>
                            </div>

                            <div style={S.successGlow}>Profile Stabilized</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const S = {
    wrapper: { background: "#060410", padding: "20px", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.3)", maxWidth: "700px", margin: "0 auto" },
    header: { display: "flex", gap: "10px", marginBottom: "20px" },
    icon: { fontSize: "24px" },
    title: { margin: 0, fontSize: "18px", color: "#f0e6ff" },
    subtitle: { fontSize: "11px", color: "#9d8ec7", margin: "2px 0 0" },
    grid: { display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" },
    drawCol: { display: "flex", flexDirection: "column", gap: "12px" },
    canvasWrap: { background: "#000", border: "2px solid #1a1530", borderRadius: "14px", overflow: "hidden", position: "relative" },
    canvas: { display: "block", cursor: "crosshair", touchAction: "none" },
    hint: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#3a3062", pointerEvents: "none", fontSize: "14px" },
    clearBtn: { background: "none", border: "1px solid rgba(157,142,199,0.3)", color: "#9d8ec7", padding: "8px", borderRadius: "8px", fontSize: "11px", cursor: "pointer", fontWeight: 600 },
    profileCol: { background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)", borderRadius: "14px", padding: "16px" },
    empty: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a507a", fontStyle: "italic", fontSize: "13px" },
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" },
    statCard: { background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" },
    statLabel: { fontSize: "9px", fontWeight: 800, letterSpacing: "1px", color: "#7c3aed", marginBottom: "4px" },
    statVal: { margin: 0, fontWeight: 700, fontSize: "15px", color: "#fff" },
    slantWrap: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px" },
    slantDial: { width: "40px", height: "40px", border: "2px solid #7c3aed", borderRadius: "50%", position: "relative" },
    slantNeedle: { position: "absolute", height: "50%", width: "2px", background: "#f0e6ff", bottom: "50%", left: "50%", transformOrigin: "bottom" },
    slantInfo: { flex: 1 },
    matrixRow: { borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" },
    matrixBox: { display: "flex", gap: "10px", marginTop: "4px" },
    mCode: { fontSize: "11px", background: "#000", padding: "4px 8px", borderRadius: "4px", color: "#4ade80", border: "1px solid #1a1a2e" },
    successGlow: { marginTop: "16px", textAlign: "center", fontStyle: "italic", color: "#4ade80", fontSize: "12px", fontWeight: 700, opacity: 0.8 }
};
