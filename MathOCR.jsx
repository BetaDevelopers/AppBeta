/**
 * MathOCR.jsx
 *
 * Handwritten Math → LaTeX → KaTeX renderer.
 *
 * Usage:
 *   <MathOCR apiBase="http://localhost:8000/api/v1" />
 *
 * Input sent to backend:
 *   POST /api/v1/math-ocr
 *   { strokes: [{x,y}[][]], imageBase64?: string }
 *
 * Output from backend:
 *   { isEquation: boolean, latex: string, confidence: number }
 */

import { useRef, useState, useEffect, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 640;
const CANVAS_H = 220;
const STROKE_COLOR = "#e2d9f3";
const STROKE_WIDTH = 3;
const API_BASE =
    import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ─── helpers ──────────────────────────────────────────────────────────────────
function canvasToBase64(canvas) {
    return canvas.toDataURL("image/png").split(",")[1];
}

function renderKatex(latex) {
    try {
        return katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
            output: "html",
        });
    } catch {
        return `<span style="color:#f87171">${latex}</span>`;
    }
}

// ─── component ────────────────────────────────────────────────────────────────
export default function MathOCR({ apiBase = API_BASE }) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    // Drawing state
    const isDrawing = useRef(false);
    const currentStroke = useRef([]);
    const [allStrokes, setAllStrokes] = useState([]); // [{x,y}[][]]

    // OCR state
    const [result, setResult] = useState(null); // { isEquation, latex, confidence }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    // ── canvas init ─────────────────────────────────────────────────────────────
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

    // ── redraw ──────────────────────────────────────────────────────────────────
    const redraw = useCallback((strokes) => {
        const ctx = ctxRef.current;
        ctx.fillStyle = "#0f0a1e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        strokes.forEach((stroke) => {
            if (stroke.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            stroke.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
        });
    }, []);

    // ── pointer helpers ─────────────────────────────────────────────────────────
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

    function onPointerUp(e) {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const stroke = currentStroke.current;
        if (stroke.length > 0) {
            setAllStrokes((prev) => [...prev, stroke]);
        }
        currentStroke.current = [];
    }

    // ── clear ───────────────────────────────────────────────────────────────────
    function handleClear() {
        setAllStrokes([]);
        setResult(null);
        setError(null);
        const ctx = ctxRef.current;
        ctx.fillStyle = "#0f0a1e";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ── undo ────────────────────────────────────────────────────────────────────
    function handleUndo() {
        setAllStrokes((prev) => {
            const next = prev.slice(0, -1);
            redraw(next);
            return next;
        });
    }

    // ── recognize ───────────────────────────────────────────────────────────────
    async function handleRecognize() {
        if (allStrokes.length === 0) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const imageBase64 = canvasToBase64(canvasRef.current);
            const body = {
                strokes: allStrokes,
                imageBase64,
            };

            const res = await fetch(`${apiBase}/math-ocr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    // ── copy ────────────────────────────────────────────────────────────────────
    async function handleCopy() {
        if (!result?.latex) return;
        await navigator.clipboard.writeText(result.latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }

    // ── confidence colour ───────────────────────────────────────────────────────
    function confColor(c) {
        if (c >= 0.7) return "#4ade80";
        if (c >= 0.4) return "#facc15";
        return "#f87171";
    }

    // ── render ──────────────────────────────────────────────────────────────────
    return (
        <div style={styles.wrapper} id="math-ocr-widget">
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.headerIcon}>∑</span>
                <div>
                    <div style={styles.title}>Math Handwriting Recognition</div>
                    <div style={styles.subtitle}>
                        Draw a mathematical expression · get instant LaTeX
                    </div>
                </div>
            </div>

            {/* Canvas */}
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
                {allStrokes.length === 0 && (
                    <div style={styles.placeholder}>
                        Draw here… &nbsp;✏️&nbsp; e.g.&nbsp; E = mc²
                    </div>
                )}
            </div>

            {/* Action bar */}
            <div style={styles.actions}>
                <button
                    id="math-ocr-undo"
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={handleUndo}
                    disabled={allStrokes.length === 0}
                    title="Undo last stroke"
                >
                    ↩ Undo
                </button>
                <button
                    id="math-ocr-clear"
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={handleClear}
                    disabled={allStrokes.length === 0}
                    title="Clear canvas"
                >
                    🗑 Clear
                </button>
                <button
                    id="math-ocr-recognize"
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={handleRecognize}
                    disabled={loading || allStrokes.length === 0}
                >
                    {loading ? (
                        <span style={styles.spinner} />
                    ) : (
                        "⚡ Recognize"
                    )}
                </button>
            </div>

            {/* Error */}
            {error && <div style={styles.errorBox}>⚠ {error}</div>}

            {/* Result */}
            {result && (
                <div style={styles.resultBox} id="math-ocr-result">
                    {result.isEquation ? (
                        <>
                            {/* KaTeX render */}
                            <div
                                style={styles.katexWrap}
                                dangerouslySetInnerHTML={{ __html: renderKatex(result.latex) }}
                            />

                            {/* LaTeX source */}
                            <div style={styles.latexRow}>
                                <code style={styles.latexCode}>{result.latex}</code>
                                <button
                                    id="math-ocr-copy"
                                    style={styles.copyBtn}
                                    onClick={handleCopy}
                                    title="Copy LaTeX"
                                >
                                    {copied ? "✓ Copied!" : "⎘ Copy"}
                                </button>
                            </div>

                            {/* Confidence */}
                            <div style={styles.metaRow}>
                                <span style={styles.metaLabel}>Confidence</span>
                                <div style={styles.confBar}>
                                    <div
                                        style={{
                                            ...styles.confFill,
                                            width: `${Math.round(result.confidence * 100)}%`,
                                            background: confColor(result.confidence),
                                        }}
                                    />
                                </div>
                                <span
                                    style={{ ...styles.confNum, color: confColor(result.confidence) }}
                                >
                                    {Math.round(result.confidence * 100)}%
                                </span>
                            </div>
                        </>
                    ) : (
                        <div style={styles.noEquation}>
                            🤔 No mathematical equation detected.
                            <br />
                            <span style={styles.noEquationSub}>
                                Try drawing numbers, variables, or operators.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Examples */}
            {!result && !loading && (
                <div style={styles.examples}>
                    <span style={styles.exLabel}>Examples:</span>
                    {["E=mc²", "√x+1", "1/2", "∫f(x)dx"].map((ex) => (
                        <span key={ex} style={styles.exTag}>
                            {ex}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── styles (JS-in-CSS — no external dependency) ──────────────────────────────
const styles = {
    wrapper: {
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #0f0a1e 0%, #1a1035 100%)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: "20px",
        padding: "28px",
        maxWidth: "700px",
        margin: "0 auto",
        boxShadow: "0 8px 40px rgba(88,28,235,0.25), 0 2px 8px rgba(0,0,0,0.4)",
        color: "#e2d9f3",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "22px",
    },
    headerIcon: {
        fontSize: "36px",
        background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        lineHeight: 1,
    },
    title: {
        fontSize: "19px",
        fontWeight: 700,
        letterSpacing: "-0.3px",
        color: "#f0e6ff",
    },
    subtitle: {
        fontSize: "12px",
        color: "#9d8ec7",
        marginTop: "2px",
    },
    canvasWrap: {
        position: "relative",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid rgba(139,92,246,0.35)",
        boxShadow: "inset 0 0 30px rgba(88,28,235,0.12)",
        cursor: "crosshair",
    },
    canvas: {
        display: "block",
        width: "100%",
        height: "auto",
        touchAction: "none",
    },
    placeholder: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "rgba(157,142,199,0.45)",
        fontSize: "16px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        userSelect: "none",
    },
    actions: {
        display: "flex",
        gap: "10px",
        marginTop: "16px",
        flexWrap: "wrap",
    },
    btn: {
        flex: 1,
        minWidth: "90px",
        padding: "10px 18px",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        transition: "opacity 0.18s, transform 0.12s",
    },
    btnSecondary: {
        background: "rgba(139,92,246,0.12)",
        color: "#c4b5fd",
        border: "1px solid rgba(139,92,246,0.3)",
    },
    btnPrimary: {
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        color: "#fff",
        boxShadow: "0 4px 20px rgba(124,58,237,0.45)",
    },
    spinner: {
        display: "inline-block",
        width: "16px",
        height: "16px",
        border: "2.5px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    errorBox: {
        marginTop: "14px",
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.35)",
        borderRadius: "10px",
        padding: "12px 16px",
        fontSize: "13px",
        color: "#fca5a5",
    },
    resultBox: {
        marginTop: "18px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: "14px",
        padding: "20px",
    },
    katexWrap: {
        fontSize: "26px",
        textAlign: "center",
        padding: "10px 0 18px",
        color: "#f0e6ff",
        overflowX: "auto",
    },
    latexRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "8px",
        padding: "8px 12px",
        marginBottom: "14px",
        flexWrap: "wrap",
    },
    latexCode: {
        flex: 1,
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: "13px",
        color: "#a78bfa",
        wordBreak: "break-all",
    },
    copyBtn: {
        background: "rgba(139,92,246,0.2)",
        border: "1px solid rgba(139,92,246,0.4)",
        color: "#c4b5fd",
        borderRadius: "6px",
        padding: "4px 11px",
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: 600,
        whiteSpace: "nowrap",
    },
    metaRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    metaLabel: {
        fontSize: "12px",
        color: "#9d8ec7",
        whiteSpace: "nowrap",
    },
    confBar: {
        flex: 1,
        height: "6px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "99px",
        overflow: "hidden",
    },
    confFill: {
        height: "100%",
        borderRadius: "99px",
        transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
    },
    confNum: {
        fontSize: "12px",
        fontWeight: 700,
        whiteSpace: "nowrap",
    },
    noEquation: {
        textAlign: "center",
        padding: "16px 0",
        fontSize: "15px",
        color: "#c4b5fd",
        lineHeight: 1.8,
    },
    noEquationSub: {
        fontSize: "12px",
        color: "#9d8ec7",
    },
    examples: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "14px",
        flexWrap: "wrap",
    },
    exLabel: {
        fontSize: "12px",
        color: "#9d8ec7",
    },
    exTag: {
        background: "rgba(139,92,246,0.12)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: "99px",
        padding: "3px 10px",
        fontSize: "12px",
        color: "#c4b5fd",
        fontFamily: "'Fira Code', monospace",
    },
};
