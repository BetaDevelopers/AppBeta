/**
 * MathOCR.jsx — Handwritten Math → LaTeX → KaTeX renderer.
 * Lápiz Intel·ligent: shape detection + calcular button.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import katex from "katex";
import { mathOCR, mathFix } from "../../../api/mathApi";

const CANVAS_W = 640;
const CANVAS_H = 220;
const STROKE_COLOR = "#e2d9f3";
const STROKE_WIDTH = 3;

function canvasToBase64(canvas) {
    return canvas.toDataURL("image/png").split(",")[1];
}

function renderKatex(latex) {
    try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: "html" });
    } catch {
        return `<span style="color:#f87171">${latex}</span>`;
    }
}

// ── Shape detection helpers ───────────────────────────────────────────────────

function getBoundingBox(pts) {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function isClosed(pts, threshold = 30) {
    if (pts.length < 6) return false;
    const dx = pts[0].x - pts[pts.length - 1].x;
    const dy = pts[0].y - pts[pts.length - 1].y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
}

function countCorners(pts, angleThreshold = 40) {
    if (pts.length < 4) return 0;
    const step = Math.max(1, Math.floor(pts.length / 20));
    let corners = 0;
    for (let i = step; i < pts.length - step; i += step) {
        const prev = pts[i - step];
        const curr = pts[i];
        const next = pts[i + step];
        const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let diff = Math.abs((a2 - a1) * 180 / Math.PI);
        if (diff > 180) diff = 360 - diff;
        if (diff > angleThreshold) corners++;
    }
    return corners;
}

function detectShape(pts) {
    if (pts.length < 8) return null;
    const bb = getBoundingBox(pts);
    if (bb.w < 10 || bb.h < 10) return null;
    const closed = isClosed(pts);
    if (!closed) {
        // Check if it's a straight line (max perpendicular deviation < 15% of length)
        const dx = pts[pts.length - 1].x - pts[0].x;
        const dy = pts[pts.length - 1].y - pts[0].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 20) return null;
        const maxDev = pts.reduce((max, p) => {
            const dev = Math.abs(dy * p.x - dx * p.y + pts[pts.length - 1].x * pts[0].y - pts[pts.length - 1].y * pts[0].x) / len;
            return Math.max(max, dev);
        }, 0);
        if (maxDev < len * 0.12) return { type: 'line', bb };
        return null;
    }
    const aspect = bb.w / bb.h;
    const corners = countCorners(pts);
    if (corners <= 2 && aspect >= 0.6 && aspect <= 1.6) return { type: 'circle', bb };
    if (corners >= 3 && corners <= 5 && aspect >= 0.5 && aspect <= 2) {
        if (corners <= 4 || aspect < 0.8 || aspect > 1.2) return { type: 'rectangle', bb };
    }
    if (corners >= 2 && corners <= 4) return { type: 'triangle', bb };
    return { type: 'circle', bb }; // fallback for closed strokes
}

function drawPerfectShape(ctx, shape, color = "#a78bfa") {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    const { bb } = shape;
    if (shape.type === 'circle') {
        const r = Math.min(bb.w, bb.h) / 2;
        ctx.arc(bb.cx, bb.cy, r, 0, Math.PI * 2);
    } else if (shape.type === 'rectangle') {
        const pad = 4;
        ctx.roundRect(bb.minX - pad, bb.minY - pad, bb.w + pad * 2, bb.h + pad * 2, 4);
    } else if (shape.type === 'triangle') {
        ctx.moveTo(bb.cx, bb.minY - 4);
        ctx.lineTo(bb.maxX + 4, bb.maxY + 4);
        ctx.lineTo(bb.minX - 4, bb.maxY + 4);
        ctx.closePath();
    } else if (shape.type === 'line') {
        ctx.moveTo(bb.minX, (bb.minY + bb.maxY) / 2);
        ctx.lineTo(bb.maxX, (bb.minY + bb.maxY) / 2);
    }
    ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MathOCR({ onResult } = {}) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const isDrawing = useRef(false);
    const currentStroke = useRef([]);

    const [allStrokes, setAllStrokes] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [autoCorrect, setAutoCorrect] = useState(true);
    const [lastSnap, setLastSnap] = useState(null);          // nombre de la forma detectada
    const [calcResult, setCalcResult] = useState(null);       // resultat de "Calcular"
    const [calcLoading, setCalcLoading] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = STROKE_WIDTH;
        ctx.strokeStyle = STROKE_COLOR;
        ctx.fillStyle = "#0f0a1e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctxRef.current = ctx;
    }, []);

    const redraw = useCallback((strokes) => {
        const ctx = ctxRef.current;
        ctx.fillStyle = "#0f0a1e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        strokes.forEach((stroke) => {
            if (!stroke.points || stroke.points.length < 2) return;
            if (stroke.shape) {
                drawPerfectShape(ctx, stroke.shape);
            } else {
                ctx.beginPath();
                ctx.strokeStyle = STROKE_COLOR;
                ctx.lineWidth = STROKE_WIDTH;
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                stroke.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
                ctx.stroke();
            }
        });
    }, []);

    function getPos(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    function onPointerDown(e) {
        e.preventDefault();
        isDrawing.current = true;
        const pt = getPos(e);
        currentStroke.current = [pt];
        ctxRef.current.strokeStyle = STROKE_COLOR;
        ctxRef.current.lineWidth = STROKE_WIDTH;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(pt.x, pt.y);
    }

    function onPointerMove(e) {
        if (!isDrawing.current) return;
        e.preventDefault();
        const pt = getPos(e);
        currentStroke.current.push(pt);
        ctxRef.current.lineTo(pt.x, pt.y);
        ctxRef.current.stroke();
    }

    function onPointerUp() {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const pts = currentStroke.current;
        currentStroke.current = [];

        if (pts.length === 0) return;

        let strokeEntry = { points: pts, shape: null };

        if (autoCorrect && pts.length >= 8) {
            const detected = detectShape(pts);
            if (detected) {
                strokeEntry = { points: pts, shape: detected };
                setLastSnap(detected.type);
                setTimeout(() => setLastSnap(null), 2000);
                // Redraw everything: erase the raw stroke and draw perfect shape
                setAllStrokes(prev => {
                    const next = [...prev, strokeEntry];
                    requestAnimationFrame(() => redraw(next));
                    return next;
                });
                return;
            }
        }

        setAllStrokes(prev => [...prev, strokeEntry]);
    }

    function handleClear() {
        setAllStrokes([]);
        setResult(null);
        setCalcResult(null);
        setError(null);
        setLastSnap(null);
        const ctx = ctxRef.current;
        ctx.fillStyle = "#0f0a1e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    function handleUndo() {
        setAllStrokes(prev => {
            const next = prev.slice(0, -1);
            redraw(next);
            return next;
        });
    }

    async function handleRecognize() {
        if (allStrokes.length === 0) return;
        setLoading(true);
        setError(null);
        setResult(null);
        setCalcResult(null);
        try {
            const imageBase64 = canvasToBase64(canvasRef.current);
            const rawStrokes = allStrokes.map(s => s.points);
            const data = await mathOCR(rawStrokes, imageBase64);
            setResult(data);
            if (data?.latex && onResult) onResult(data.latex);
        } catch (err) {
            setError(err.message ?? "Error desconegut");
        } finally {
            setLoading(false);
        }
    }

    async function handleCalculate() {
        if (!result?.latex) return;
        setCalcLoading(true);
        try {
            const data = await mathFix(result.latex);
            const simplified = data.fixedText || data.content_markdown || data.latex || "";
            setCalcResult(simplified);
        } catch (err) {
            setCalcResult("Error al calcular");
        } finally {
            setCalcLoading(false);
        }
    }

    async function handleCopy() {
        if (!result?.latex) return;
        await navigator.clipboard.writeText(result.latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }

    function confColor(c) {
        if (c >= 0.7) return "#4ade80";
        if (c >= 0.4) return "#facc15";
        return "#f87171";
    }

    const hasStrokes = allStrokes.length > 0;

    return (
        <div style={styles.wrapper} id="math-ocr-widget">
            <div style={styles.header}>
                <span style={styles.headerIcon}>∑</span>
                <div style={{ flex: 1 }}>
                    <div style={styles.title}>Math Handwriting Recognition</div>
                    <div style={styles.subtitle}>Draw a mathematical expression · get instant LaTeX</div>
                </div>
                {/* Auto-correct toggle */}
                <button
                    onClick={() => setAutoCorrect(v => !v)}
                    style={{
                        ...styles.toggleBtn,
                        background: autoCorrect ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                        color: autoCorrect ? "#4ade80" : "#9d8ec7",
                        border: autoCorrect ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                    title="Correcció automàtica de formes"
                >
                    {autoCorrect ? "✦ Auto" : "· Auto"}
                </button>
            </div>

            {/* Shape snap notification */}
            {lastSnap && (
                <div style={styles.snapBadge}>
                    ✦ Forma corregida: {lastSnap}
                </div>
            )}

            <div style={styles.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    style={styles.canvas}
                    onMouseDown={onPointerDown}
                    onMouseMove={onPointerMove}
                    onMouseUp={onPointerUp}
                    onMouseLeave={onPointerUp}
                    onTouchStart={onPointerDown}
                    onTouchMove={onPointerMove}
                    onTouchEnd={onPointerUp}
                />
                {!hasStrokes && (
                    <div style={styles.placeholder}>Draw here… ✏️ e.g. E = mc²</div>
                )}
            </div>

            <div style={styles.actions}>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handleUndo} disabled={!hasStrokes}>↩ Undo</button>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handleClear} disabled={!hasStrokes}>🗑 Clear</button>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleRecognize} disabled={loading || !hasStrokes}>
                    {loading ? <span style={styles.spinner} /> : "⚡ Recognize"}
                </button>
            </div>

            {error && <div style={styles.errorBox}>⚠ {error}</div>}

            {result && (
                <div style={styles.resultBox} id="math-ocr-result">
                    {result.isEquation ? (
                        <>
                            <div style={styles.katexWrap} dangerouslySetInnerHTML={{ __html: renderKatex(result.latex) }} />
                            <div style={styles.latexRow}>
                                <code style={styles.latexCode}>{result.latex}</code>
                                <button style={styles.copyBtn} onClick={handleCopy}>{copied ? "✓ Copied!" : "⎘ Copy"}</button>
                            </div>
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>Confidence</span>
                                <div style={styles.confBar}>
                                    <div style={{ ...styles.confFill, width: `${Math.round(result.confidence * 100)}%`, background: confColor(result.confidence) }} />
                                </div>
                                <span style={{ ...styles.confNum, color: confColor(result.confidence) }}>
                                    {Math.round(result.confidence * 100)}%
                                </span>
                            </div>

                            {/* Calcular button */}
                            <div style={{ marginTop: "14px" }}>
                                <button
                                    style={{ ...styles.btn, ...styles.btnSecondary, flex: "none", width: "100%" }}
                                    onClick={handleCalculate}
                                    disabled={calcLoading}
                                >
                                    {calcLoading ? <span style={styles.spinner} /> : "⚡ Calcular / Simplificar"}
                                </button>
                            </div>

                            {calcResult && (
                                <div style={styles.calcBox}>
                                    <span style={styles.calcLabel}>Resultat:</span>
                                    <div style={styles.calcContent} dangerouslySetInnerHTML={{ __html: renderKatex(calcResult) }} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={styles.noEquation}>
                            🤔 No mathematical equation detected.
                            <br />
                            <span style={styles.noEquationSub}>Try drawing numbers, variables, or operators.</span>
                        </div>
                    )}
                </div>
            )}

            {!result && !loading && (
                <div style={styles.examples}>
                    <span style={styles.exLabel}>Examples:</span>
                    {["E=mc²", "√x+1", "1/2", "∫f(x)dx"].map((ex) => (
                        <span key={ex} style={styles.exTag}>{ex}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    wrapper: { fontFamily: "'Inter','Segoe UI',sans-serif", background: "linear-gradient(135deg,#0f0a1e 0%,#1a1035 100%)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "20px", padding: "28px", maxWidth: "700px", margin: "0 auto", boxShadow: "0 8px 40px rgba(88,28,235,0.25),0 2px 8px rgba(0,0,0,0.4)", color: "#e2d9f3" },
    header: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "22px" },
    headerIcon: { fontSize: "36px", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 },
    title: { fontSize: "19px", fontWeight: 700, letterSpacing: "-0.3px", color: "#f0e6ff" },
    subtitle: { fontSize: "12px", color: "#9d8ec7", marginTop: "2px" },
    toggleBtn: { flexShrink: 0, padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" },
    snapBadge: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#4ade80", marginBottom: "12px", textAlign: "center" },
    canvasWrap: { position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "inset 0 0 30px rgba(88,28,235,0.12)", cursor: "crosshair" },
    canvas: { display: "block", width: "100%", height: "auto", touchAction: "none" },
    placeholder: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(157,142,199,0.45)", fontSize: "16px", pointerEvents: "none", whiteSpace: "nowrap", userSelect: "none" },
    actions: { display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" },
    btn: { flex: 1, minWidth: "90px", padding: "10px 18px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "opacity 0.18s,transform 0.12s" },
    btnSecondary: { background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" },
    btnPrimary: { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.45)" },
    spinner: { display: "inline-block", width: "16px", height: "16px", border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    errorBox: { marginTop: "14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#fca5a5" },
    resultBox: { marginTop: "18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "14px", padding: "20px" },
    katexWrap: { fontSize: "26px", textAlign: "center", padding: "10px 0 18px", color: "#f0e6ff", overflowX: "auto" },
    latexRow: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,0,0,0.25)", borderRadius: "8px", padding: "8px 12px", marginBottom: "14px", flexWrap: "wrap" },
    latexCode: { flex: 1, fontFamily: "'Fira Code','Courier New',monospace", fontSize: "13px", color: "#a78bfa", wordBreak: "break-all" },
    copyBtn: { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd", borderRadius: "6px", padding: "4px 11px", fontSize: "12px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" },
    metaRow: { display: "flex", alignItems: "center", gap: "10px" },
    metaLabel: { fontSize: "12px", color: "#9d8ec7", whiteSpace: "nowrap" },
    confBar: { flex: 1, height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden" },
    confFill: { height: "100%", borderRadius: "99px", transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" },
    confNum: { fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" },
    calcBox: { marginTop: "14px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "14px 16px" },
    calcLabel: { fontSize: "11px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em" },
    calcContent: { fontSize: "22px", textAlign: "center", marginTop: "8px", color: "#f0e6ff", overflowX: "auto" },
    noEquation: { textAlign: "center", padding: "16px 0", fontSize: "15px", color: "#c4b5fd", lineHeight: 1.8 },
    noEquationSub: { fontSize: "12px", color: "#9d8ec7" },
    examples: { display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", flexWrap: "wrap" },
    exLabel: { fontSize: "12px", color: "#9d8ec7" },
    exTag: { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "99px", padding: "3px 10px", fontSize: "12px", color: "#c4b5fd", fontFamily: "'Fira Code',monospace" },
};
