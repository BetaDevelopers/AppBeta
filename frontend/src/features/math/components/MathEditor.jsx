/**
 * MathEditor.jsx — Text pla → KaTeX renderitzat.
 * Adaptat per al backend real: POST /api/ai/math-fix
 * Resposta: { fixedText?, latex?, content_markdown? }
 */

import { useState, useCallback, useEffect } from "react";
import katex from "katex";
import { mathFix, mathSolve } from "../../../api/mathApi";

const SAMPLE_TEXT = `Calcularem el triangle rectangle:
El teorema de Pitàgores és a2 + b2 = c2.
Si prenem sqrt(x+1) = 3 per trobar x.
També cal revisar E=mc2 per física.
Finalment pi*r^2 per l'àrea d'un cercle.`;

function renderMixedText(text) {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    return parts.map((part, i) => {
        if (part.startsWith("$")) {
            const isDisplay = part.startsWith("$$");
            const latex = part.replace(/\$+/g, "");
            try {
                const html = katex.renderToString(latex, { throwOnError: false, displayMode: isDisplay });
                return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
                return <code key={i} style={{ color: "#f87171" }}>{part}</code>;
            }
        }
        return <span key={i}>{part}</span>;
    });
}

export default function MathEditor({ onResult } = {}) {
    const [inputText, setInputText] = useState(SAMPLE_TEXT);
    const [outputText, setOutputText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    const handleTransform = useCallback(async (text) => {
        if (!text.trim()) { setOutputText(""); return; }
        setLoading(true);
        setError(null);
        try {
            // Primero convertir texto informal a LaTeX limpio
            const fixed = await mathFix(text);
            const latex = fixed.improved || fixed.fixedText || fixed.content_markdown || text;

            // Luego resolver/simplificar con el LaTeX obtenido
            const solved = await mathSolve(latex);

            let result = "";
            if (solved.steps?.length) {
                result += "**Pasos:**\n";
                solved.steps.forEach((s, i) => { result += `${i + 1}. ${s}\n`; });
                result += "\n";
            }
            result += `**Resultado:** $${solved.result}$`;
            if (solved.explanation) result += `\n\n_${solved.explanation}_`;

            setOutputText(result);
            setLastSync(new Date());
            if (result && onResult) onResult(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handleTransform(SAMPLE_TEXT);
    }, [handleTransform]);

    return (
        <div style={S.wrapper} id="math-editor-widget">
            <div style={S.header}>
                <span style={S.headerIcon}>✍️</span>
                <div>
                    <h2 style={S.title}>Editor de notas con reconocimiento matemático</h2>
                    <p style={S.subtitle}>
                        Escribe símbolos matemáticos informales y observa cómo se transforman en código KaTeX profesional.
                    </p>
                </div>
                {loading && <div style={S.spinner} />}
            </div>

            <div style={S.grid}>
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={S.tag}>APORTE</span>
                        <span style={S.label}>Markdown o texto plano</span>
                    </div>
                    <textarea
                        style={S.textarea}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escribe ecuaciones como x^2, sqrt(y), E=mc2..."
                        id="math-editor-input"
                    />
                    <button style={S.btn} onClick={() => handleTransform(inputText)} disabled={loading}>
                        {loading ? "Resolviendo..." : "⚡ Resolver y Simplificar"}
                    </button>
                </div>

                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={{ ...S.tag, background: "#7c3aed" }}>PRODUCCIÓN</span>
                        <span style={S.label}>Vista previa matemática en vivo</span>
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
                            <div style={S.empty}>Aún no se ha generado ninguna salida.</div>
                        )}
                    </div>

                    <div style={S.metaRow}>
                        {lastSync && (
                            <span style={S.lastSync}>
                                Última sincronización: {lastSync.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            style={S.copyBtn}
                            onClick={() => navigator.clipboard.writeText(outputText)}
                            disabled={!outputText}
                        >
                            ⎘ Copiar resultado sin procesar
                        </button>
                    </div>
                </div>
            </div>

            <div style={S.guide}>
                <div style={S.guideTitle}>💡 Guía de reconocimiento:</div>
                <div style={S.guideGrid}>
                    {[
                        { raw: "x^2", out: "x^{2}" },
                        { raw: "sqrt(2)", out: "\\sqrt{2}" },
                        { raw: "a+b=c", out: "a+b=c" },
                        { raw: "E=mc2", out: "E=mc^{2}" },
                        { raw: "pi*r^2", out: "\\pi r^{2}" },
                        { raw: "(a)/(b)", out: "\\frac{a}{b}" },
                    ].map((item, i) => (
                        <div key={i} style={S.guideItem}>
                            <code style={S.guideRaw}>{item.raw}</code>
                            <span style={S.guideArrow}>→</span>
                            <span dangerouslySetInnerHTML={{ __html: katex.renderToString(item.out, { throwOnError: false }) }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const S = {
    wrapper: { fontFamily: "'Inter', sans-serif", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "1000px", margin: "0 auto" },
    header: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
    headerIcon: { fontSize: "28px" },
    title: { fontSize: "20px", fontWeight: 800, margin: 0, color: "#111827" },
    subtitle: { fontSize: "12px", color: "#6b7280", margin: "2px 0 0" },
    spinner: { width: "16px", height: "16px", border: "2px solid #e5e7eb", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.6s linear infinite", marginLeft: "auto" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "24px", marginBottom: "24px" },
    col: { display: "flex", flexDirection: "column", gap: "10px" },
    colHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
    tag: { background: "#111827", color: "#fff", fontSize: "9px", fontWeight: 900, padding: "2px 6px", borderRadius: "4px", letterSpacing: "1px" },
    label: { fontSize: "12px", fontWeight: 700, color: "#4b5563", flex: 1 },
    textarea: { height: "280px", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "16px", fontSize: "14px", lineHeight: "1.6", fontFamily: "'Fira Code', monospace", resize: "none", background: "#f9fafb", outline: "none", color: "#111827" },
    previewBox: { height: "280px", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "20px", overflowY: "auto", background: "#fff", fontSize: "15px", lineHeight: "1.7", color: "#374151" },
    btn: { background: "#111827", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer" },
    copyBtn: { background: "none", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "#6b7280", cursor: "pointer", fontWeight: 600 },
    metaRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" },
    lastSync: { fontSize: "11px", color: "#9ca3af" },
    content: { whiteSpace: "pre-wrap", color: "#111827" },
    empty: { color: "#9ca3af", fontSize: "13px", textAlign: "center", paddingTop: "100px" },
    error: { color: "#ef4444", fontSize: "13px" },
    guide: { background: "#f3f4f6", borderRadius: "12px", padding: "16px" },
    guideTitle: { fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "10px" },
    guideGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" },
    guideItem: { display: "flex", flexDirection: "column", gap: "2px" },
    guideRaw: { fontSize: "11px", color: "#6b7280", fontWeight: 600 },
    guideArrow: { fontSize: "10px", color: "#9ca3af" },
};
