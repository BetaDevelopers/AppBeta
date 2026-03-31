/**
 * MathEditor.jsx
 *
 * A smart mathematical text editor.
 * Take raw markdown/text → identify informal math → convert to KaTeX.
 *
 * Usage:
 *   <MathEditor apiBase="http://localhost:8000/api/v1" />
 *
 * POST /api/v1/math-editor
 *   { text: string }
 *   → { improved: string, equationsFound: number }
 */

import { useState, useCallback, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ─── Constants & Examples ───────────────────────────────────────────────────
const SAMPLE_TEXT = `Calcularem el triangle rectangle:
El teorema de Pitàgores és a2 + b2 = c2. 
Si prenem sqrt(x+1) = 3 per trobar x.
També cal revisar E=mc2 per física.
Finalment pi*r^2 per l'àrea d'un cercle.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split text by KaTeX delimiters ($...$ or $$...$$) and render segments.
 */
function renderMixedText(text) {
    if (!text) return null;

    // Pattern: matches $...$ or $$...$$
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

    return parts.map((part, i) => {
        if (part.startsWith("$")) {
            const isDisplay = part.startsWith("$$");
            const latex = part.replace(/\$+/g, "");
            try {
                const html = katex.renderToString(latex, {
                    throwOnError: false,
                    displayMode: isDisplay,
                });
                return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch (e) {
                return <code key={i} style={{ color: "#f87171" }}>{part}</code>;
            }
        }
        return <span key={i}>{part}</span>;
    });
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function MathEditor({ apiBase = API_BASE }) {
    const [inputText, setInputText] = useState(SAMPLE_TEXT);
    const [outputText, setOutputText] = useState("");
    const [eqCount, setEqCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    // ── Transform ──
    const handleTransform = useCallback(async (text) => {
        if (!text.trim()) {
            setOutputText("");
            setEqCount(0);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/math-editor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setOutputText(data.improved);
            setEqCount(data.equationsFound);
            setLastSync(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    // Initial transform
    useEffect(() => {
        handleTransform(SAMPLE_TEXT);
    }, [handleTransform]);

    // ── Render ──
    return (
        <div style={S.wrapper} id="math-editor-widget">
            {/* Header */}
            <div style={S.header}>
                <span style={S.headerIcon}>✍️</span>
                <div>
                    <h2 style={S.title}>Math-Aware Note Editor</h2>
                    <p style={S.subtitle}>
                        Type informal math symbols and see them glow into professional KaTeX.
                    </p>
                </div>
                {loading && <div style={S.spinner} />}
            </div>

            <div style={S.grid}>
                {/* INPUT SIDE */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={S.tag}>INPUT</span>
                        <span style={S.label}>Markdown or Plain Text</span>
                    </div>
                    <textarea
                        style={S.textarea}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type equations like x^2, sqrt(y), E=mc2..."
                        id="math-editor-input"
                    />
                    <button
                        style={S.btn}
                        onClick={() => handleTransform(inputText)}
                        disabled={loading}
                    >
                        {loading ? "Transforming..." : "⚡ Upgrade Math"}
                    </button>
                </div>

                {/* OUTPUT SIDE */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={{ ...S.tag, background: "#7c3aed" }}>OUTPUT</span>
                        <span style={S.label}>Live Mathematical Preview</span>
                        {eqCount > 0 && (
                            <span style={S.countBadge}>
                                {eqCount} equation{eqCount !== 1 ? "s" : ""} found
                            </span>
                        )}
                    </div>
                    <div style={S.previewBox} id="math-editor-preview">
                        {error ? (
                            <div style={S.error}>{error}</div>
                        ) : (
                            <article style={S.content}>
                                {renderMixedText(outputText || inputText)}
                            </article>
                        )}
                        {!outputText && !loading && (
                            <div style={S.empty}>No output generated yet.</div>
                        )}
                    </div>

                    <div style={S.metaRow}>
                        {lastSync && (
                            <span style={S.lastSync}>
                                Last synchronized: {lastSync.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            style={S.copyBtn}
                            onClick={() => navigator.clipboard.writeText(outputText)}
                            disabled={!outputText}
                        >
                            ⎘ Copy Raw Result
                        </button>
                    </div>
                </div>
            </div>

            {/* Syntax Guide */}
            <div style={S.guide}>
                <div style={S.guideTitle}>💡 Recognition guide:</div>
                <div style={S.guideGrid}>
                    {[
                        { raw: "x^2", out: "$x^{2}$" },
                        { raw: "sqrt(2)", out: "$\\sqrt{2}$" },
                        { raw: "a+b=c", out: "$a+b=c$" },
                        { raw: "E=mc2", out: "$E=mc^{2}$" },
                        { raw: "pi*r^2", out: "$\\pi \cdot r^{2}$" },
                        { raw: "(a)/(b)", out: "$\\frac{a}{b}$" },
                    ].map((item, i) => (
                        <div key={i} style={S.guideItem}>
                            <code style={S.guideRaw}>{item.raw}</code>
                            <span style={S.guideArrow}>→</span>
                            <span dangerouslySetInnerHTML={{ __html: katex.renderToString(item.out.replace(/\$/g, "")) }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    wrapper: {
        fontFamily: "'Inter', sans-serif",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        maxWidth: "1000px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
    },
    headerIcon: { fontSize: "28px" },
    title: { fontSize: "20px", fontWeight: 800, margin: 0, color: "#111827" },
    subtitle: { fontSize: "12px", color: "#6b7280", margin: "2px 0 0" },
    spinner: {
        width: "16px",
        height: "16px",
        border: "2px solid #e5e7eb",
        borderTopColor: "#7c3aed",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        marginLeft: "auto",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "24px",
        marginBottom: "24px",
    },
    col: { display: "flex", flexDirection: "column", gap: "10px" },
    colHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
    tag: {
        background: "#111827",
        color: "#fff",
        fontSize: "9px",
        fontWeight: 900,
        padding: "2px 6px",
        borderRadius: "4px",
        letterSpacing: "1px",
    },
    label: { fontSize: "12px", fontWeight: 700, color: "#4b5563", flex: 1 },
    countBadge: {
        background: "rgba(124, 58, 237, 0.1)",
        color: "#7c3aed",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "99px",
    },
    textarea: {
        height: "280px",
        border: "1.5px solid #e5e7eb",
        borderRadius: "14px",
        padding: "16px",
        fontSize: "14px",
        lineHeight: "1.6",
        fontFamily: "'Fira Code', monospace",
        resize: "none",
        background: "#f9fafb",
        transition: "border-color 0.15s, box-shadow 0.15s",
        outline: "none",
    },
    previewBox: {
        height: "280px",
        border: "1.5px solid #e5e7eb",
        borderRadius: "14px",
        padding: "20px",
        overflowY: "auto",
        background: "#fff",
        fontSize: "15px",
        lineHeight: "1.7",
        color: "#374151",
    },
    btn: {
        background: "#111827",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "12px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "transform 0.1s, opacity 0.1s",
    },
    copyBtn: {
        background: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "4px 10px",
        fontSize: "11px",
        color: "#6b7280",
        cursor: "pointer",
        fontWeight: 600,
    },
    metaRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "4px",
    },
    lastSync: { fontSize: "11px", color: "#9ca3af" },
    content: { whiteSpace: "pre-wrap" },
    empty: { color: "#9ca3af", fontSize: "13px", textAlign: "center", paddingTop: "100px" },
    error: { color: "#ef4444", fontSize: "13px" },
    guide: {
        background: "#f3f4f6",
        borderRadius: "12px",
        padding: "16px",
    },
    guideTitle: {
        fontSize: "12px",
        fontWeight: 700,
        color: "#374151",
        marginBottom: "10px",
    },
    guideGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "12px",
    },
    guideItem: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    guideRaw: { fontSize: "11px", color: "#6b7280", fontWeight: 600 },
    guideArrow: { fontSize: "10px", color: "#9ca3af" },
};
