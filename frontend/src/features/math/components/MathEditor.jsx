import { useState, useCallback, useEffect, useRef } from "react";
import katex from "katex";
import { mathFix, mathSolve } from "../../../api/mathApi";

const SAMPLE_TEXT = `Calcularem el triangle rectangle:
El teorema de Pitàgores és a2 + b2 = c2.
Si prenem sqrt(x+1) = 3 per trobar x.
També cal revisar E=mc2 per física.
Finalment pi*r^2 per l'àrea d'un cercle.`;

const DEBOUNCE_MS = 700;

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
    const [inputText,  setInputText]  = useState(SAMPLE_TEXT);
    const [outputText, setOutputText] = useState("");
    const [loading,    setLoading]    = useState(false);
    const [solving,    setSolving]    = useState(false);
    const [error,      setError]      = useState(null);
    const [typing,     setTyping]     = useState(false); // user is actively typing
    const debounceRef = useRef(null);
    const latestInput = useRef(SAMPLE_TEXT);

    // ── Auto-beautify on every keystroke (debounced) ──────────
    const autoBeautify = useCallback(async (text) => {
        if (!text.trim()) { setOutputText(""); return; }
        setLoading(true);
        setError(null);
        try {
            const fixed = await mathFix(text);
            const result = fixed.improved || fixed.fixedText || fixed.content_markdown || text;
            // Only update if the text hasn't changed since we started
            if (latestInput.current === text) {
                setOutputText(result);
                if (onResult) onResult(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [onResult]);

    const handleChange = useCallback((e) => {
        const val = e.target.value;
        setInputText(val);
        latestInput.current = val;
        setTyping(true);
        setError(null);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setTyping(false);
            autoBeautify(val);
        }, DEBOUNCE_MS);
    }, [autoBeautify]);

    // First load
    useEffect(() => {
        autoBeautify(SAMPLE_TEXT);
        return () => clearTimeout(debounceRef.current);
    }, []); // eslint-disable-line

    // ── Optional: full solve ──────────────────────────────────
    const handleSolve = useCallback(async () => {
        if (!outputText.trim()) return;
        setSolving(true);
        setError(null);
        try {
            const solved = await mathSolve(outputText);
            let result = "";
            if (solved.steps?.length) {
                result += "**Pasos:**\n";
                solved.steps.forEach((s, i) => { result += `${i + 1}. ${s}\n`; });
                result += "\n";
            }
            result += `**Resultado:** $${solved.result}$`;
            if (solved.explanation) result += `\n\n_${solved.explanation}_`;
            setOutputText(result);
            if (onResult) onResult(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setSolving(false);
        }
    }, [outputText, onResult]);

    // Status indicator text
    const statusText = typing
        ? "Escribiendo…"
        : loading
        ? "Embelleciendo…"
        : outputText
        ? "✓ Listo"
        : "";

    const statusColor = typing ? "#6b7280" : loading ? "#7c3aed" : "#10b981";

    return (
        <div style={S.wrapper}>
            <div style={S.header}>
                <span style={S.headerIcon}>✍️</span>
                <div>
                    <h2 style={S.title}>Embellecedor automático de escritura</h2>
                    <p style={S.subtitle}>
                        Escribe con normalidad — las fórmulas y símbolos se convierten a LaTeX automáticamente al dejar de escribir.
                    </p>
                </div>

                {/* Live status pill */}
                <div style={{ ...S.statusPill, color: statusColor, borderColor: statusColor + "40", opacity: statusText ? 1 : 0 }}>
                    {(loading || typing) && (
                        <span style={{ ...S.dot, background: statusColor }} />
                    )}
                    {statusText}
                </div>
            </div>

            <div style={S.grid}>
                {/* ── Left: input ── */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={S.tag}>ENTRADA</span>
                        <span style={S.label}>Escribe aquí libremente</span>
                    </div>
                    <div style={{ position: "relative" }}>
                        <textarea
                            style={{
                                ...S.textarea,
                                borderColor: typing ? "#7c3aed" : loading ? "#7c3aed44" : "#e5e7eb",
                                transition: "border-color 0.2s",
                            }}
                            value={inputText}
                            onChange={handleChange}
                            placeholder="Escribe ecuaciones como x^2, sqrt(y), E=mc2... se embellecerán solos"
                            spellCheck={false}
                        />
                        {/* Typing progress bar */}
                        {(typing || loading) && (
                            <div style={S.progressBar}>
                                <div style={{
                                    ...S.progressFill,
                                    width: loading ? "85%" : "40%",
                                    transition: loading ? "width 0.6s ease" : "none",
                                }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: output ── */}
                <div style={S.col}>
                    <div style={S.colHeader}>
                        <span style={{ ...S.tag, background: "#7c3aed" }}>RESULTADO</span>
                        <span style={S.label}>Vista previa en tiempo real</span>
                    </div>
                    <div style={{
                        ...S.previewBox,
                        opacity: loading ? 0.6 : 1,
                        transition: "opacity 0.2s",
                    }}>
                        {error ? (
                            <div style={S.error}>{error}</div>
                        ) : outputText ? (
                            <article style={S.content}>
                                {renderMixedText(outputText)}
                            </article>
                        ) : (
                            <div style={S.empty}>
                                {loading ? "Embelleciendo el texto…" : "El resultado aparecerá aquí automáticamente."}
                            </div>
                        )}
                    </div>

                    <div style={S.metaRow}>
                        <button
                            style={{ ...S.copyBtn, opacity: outputText ? 1 : 0.4 }}
                            onClick={() => navigator.clipboard.writeText(outputText)}
                            disabled={!outputText}
                        >
                            ⎘ Copiar
                        </button>
                        <button
                            style={{ ...S.solveBtn, opacity: outputText && !solving ? 1 : 0.4 }}
                            onClick={handleSolve}
                            disabled={!outputText || solving}
                        >
                            {solving ? "Resolviendo…" : "⚡ Resolver también"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Guide */}
            <div style={S.guide}>
                <div style={S.guideTitle}>💡 Se detectan automáticamente:</div>
                <div style={S.guideGrid}>
                    {[
                        { raw: "x^2",     out: "x^{2}" },
                        { raw: "sqrt(2)", out: "\\sqrt{2}" },
                        { raw: "E=mc2",   out: "E=mc^{2}" },
                        { raw: "pi*r^2",  out: "\\pi r^{2}" },
                        { raw: "(a)/(b)", out: "\\frac{a}{b}" },
                        { raw: "a+b=c",   out: "a+b=c" },
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
    wrapper:     { fontFamily: "'Inter',sans-serif", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "1000px", margin: "0 auto" },
    header:      { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" },
    headerIcon:  { fontSize: "28px" },
    title:       { fontSize: "20px", fontWeight: 800, margin: 0, color: "#111827" },
    subtitle:    { fontSize: "12px", color: "#6b7280", margin: "2px 0 0" },
    statusPill:  { marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", border: "1px solid", letterSpacing: "0.03em", transition: "opacity 0.3s, color 0.3s" },
    dot:         { width: 6, height: 6, borderRadius: "50%", animation: "pulse 1s infinite" },
    grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: "24px", marginBottom: "24px" },
    col:         { display: "flex", flexDirection: "column", gap: "10px" },
    colHeader:   { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
    tag:         { background: "#111827", color: "#fff", fontSize: "9px", fontWeight: 900, padding: "2px 6px", borderRadius: "4px", letterSpacing: "1px" },
    label:       { fontSize: "12px", fontWeight: 700, color: "#4b5563", flex: 1 },
    textarea:    { width: "100%", height: "260px", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "16px", fontSize: "14px", lineHeight: "1.6", fontFamily: "'Fira Code',monospace", resize: "none", background: "#f9fafb", outline: "none", color: "#111827", boxSizing: "border-box" },
    progressBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#f3f4f6", borderRadius: "0 0 14px 14px", overflow: "hidden" },
    progressFill:{ height: "100%", background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 2 },
    previewBox:  { height: "260px", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "20px", overflowY: "auto", background: "#fff", fontSize: "15px", lineHeight: "1.7", color: "#374151" },
    metaRow:     { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
    copyBtn:     { background: "none", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", color: "#6b7280", cursor: "pointer", fontWeight: 600 },
    solveBtn:    { background: "#111827", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" },
    content:     { whiteSpace: "pre-wrap", color: "#111827" },
    empty:       { color: "#9ca3af", fontSize: "13px", textAlign: "center", paddingTop: "90px" },
    error:       { color: "#ef4444", fontSize: "13px" },
    guide:       { background: "#f3f4f6", borderRadius: "12px", padding: "16px" },
    guideTitle:  { fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "10px" },
    guideGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "12px" },
    guideItem:   { display: "flex", flexDirection: "column", gap: "2px" },
    guideRaw:    { fontSize: "11px", color: "#6b7280", fontWeight: 600 },
    guideArrow:  { fontSize: "10px", color: "#9ca3af" },
};
