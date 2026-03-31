/**
 * MathOCRImage.jsx — Upload image → backend OCR → render contingut amb KaTeX.
 * Adaptat per al backend real: POST /api/ai/ocr
 * Resposta: { title, content_markdown, has_formulas, has_tables, language }
 */

import { useRef, useState, useCallback, useEffect } from "react";
import katex from "katex";
import { mathOCRImage } from "../../../api/mathApi";

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

export default function MathOCRImage({ onResult } = {}) {
    const [imageSrc, setImageSrc] = useState(null);
    const [ocrResult, setOcrResult] = useState(null); // { title, content_markdown, has_formulas, has_tables, language }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);

    const fileInputRef = useRef(null);

    function loadFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        setOcrResult(null);
        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => setImageSrc(e.target.result);
        reader.readAsDataURL(file);
    }

    function handleFileInput(e) { loadFile(e.target.files?.[0]); }

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        loadFile(e.dataTransfer.files?.[0]);
    }, []);

    const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);

    useEffect(() => {
        function onPaste(e) {
            const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
            if (item) loadFile(item.getAsFile());
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);

    async function handleRecognize() {
        if (!imageSrc) return;
        setLoading(true);
        setError(null);
        setOcrResult(null);
        try {
            const b64 = imageSrc.split(",")[1];
            const data = await mathOCRImage(b64);
            setOcrResult(data);
            if (data?.content_markdown && onResult) onResult(data.content_markdown);
        } catch (err) {
            setError(err.message ?? "Error desconegut");
        } finally {
            setLoading(false);
        }
    }

    function handleClear() {
        setImageSrc(null);
        setOcrResult(null);
        setError(null);
    }

    return (
        <div style={S.wrapper} id="math-ocr-image-widget">
            <div style={S.header}>
                <span style={S.headerIcon}>🔍</span>
                <div>
                    <div style={S.title}>Math Image OCR</div>
                    <div style={S.subtitle}>
                        Upload an image · detect equations & text · get rendered content
                    </div>
                </div>
            </div>

            {/* Drop zone */}
            <div
                style={{ ...S.dropZone, ...(dragging ? S.dropZoneActive : {}), ...(imageSrc ? S.dropZoneHasImage : {}) }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !imageSrc && fileInputRef.current?.click()}
            >
                {imageSrc ? (
                    <img src={imageSrc} alt="uploaded" style={S.image} draggable={false} />
                ) : (
                    <div style={S.dropPrompt}>
                        <span style={S.dropIcon}>🖼</span>
                        <div style={S.dropText}>Drop an image here</div>
                        <div style={S.dropSubtext}>or click to browse · or Ctrl+V to paste</div>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileInput}
                />
            </div>

            {/* Action bar */}
            <div style={S.actions}>
                <button style={{ ...S.btn, ...S.btnSecondary }} onClick={() => fileInputRef.current?.click()}>
                    📂 Change image
                </button>
                {imageSrc && (
                    <button style={{ ...S.btn, ...S.btnSecondary }} onClick={handleClear}>
                        🗑 Clear
                    </button>
                )}
                <button
                    style={{ ...S.btn, ...S.btnPrimary, opacity: (!imageSrc || loading) ? 0.5 : 1 }}
                    onClick={handleRecognize}
                    disabled={!imageSrc || loading}
                >
                    {loading ? <span style={S.spinner} /> : "⚡ Analyze"}
                </button>
            </div>

            {error && <div style={S.errorBox}>⚠ {error}</div>}

            {/* OCR Result */}
            {ocrResult && (
                <div style={S.resultBox}>
                    <div style={S.resultHeader}>
                        {ocrResult.title && <div style={S.resultTitle}>{ocrResult.title}</div>}
                        <div style={S.chips}>
                            {ocrResult.has_formulas && <span style={S.chip}>∑ Fórmules</span>}
                            {ocrResult.has_tables && <span style={{ ...S.chip, background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>⊞ Taules</span>}
                            {ocrResult.language && <span style={{ ...S.chip, background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>🌐 {ocrResult.language}</span>}
                        </div>
                    </div>
                    <div style={S.contentBox}>
                        <article style={S.content}>
                            {ocrResult.has_formulas
                                ? renderMixedText(ocrResult.content_markdown)
                                : <pre style={S.plainText}>{ocrResult.content_markdown}</pre>
                            }
                        </article>
                    </div>
                </div>
            )}

            {!loading && imageSrc && !ocrResult && !error && (
                <div style={S.emptyResult}>
                    🤔 Cap resultat encara. Fes clic a <strong style={{ color: "#c4b5fd" }}>⚡ Analyze</strong> per iniciar.
                </div>
            )}
        </div>
    );
}

const S = {
    wrapper: { fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "linear-gradient(135deg, #0a0618 0%, #10082a 100%)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: "20px", padding: "28px", maxWidth: "740px", margin: "0 auto", boxShadow: "0 8px 40px rgba(88,28,235,0.22), 0 2px 8px rgba(0,0,0,0.5)", color: "#e2d9f3" },
    header: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" },
    headerIcon: { fontSize: "32px", lineHeight: 1 },
    title: { fontSize: "18px", fontWeight: 700, color: "#f0e6ff", letterSpacing: "-0.3px" },
    subtitle: { fontSize: "12px", color: "#9d8ec7", marginTop: "2px" },
    dropZone: { border: "2px dashed rgba(139,92,246,0.35)", borderRadius: "14px", minHeight: "160px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color 0.2s, background 0.2s", position: "relative", overflow: "hidden", background: "rgba(139,92,246,0.04)" },
    dropZoneActive: { borderColor: "#a78bfa", background: "rgba(139,92,246,0.10)" },
    dropZoneHasImage: { cursor: "default", border: "2px solid rgba(139,92,246,0.25)", minHeight: "unset" },
    image: { width: "100%", height: "auto", borderRadius: "12px", display: "block", userSelect: "none" },
    dropPrompt: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "32px 20px" },
    dropIcon: { fontSize: "40px", lineHeight: 1 },
    dropText: { fontSize: "15px", fontWeight: 600, color: "#c4b5fd" },
    dropSubtext: { fontSize: "12px", color: "#9d8ec7" },
    actions: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" },
    btn: { flex: 1, minWidth: "100px", padding: "10px 18px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "opacity 0.18s" },
    btnSecondary: { background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.28)" },
    btnPrimary: { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.40)" },
    spinner: { display: "inline-block", width: "15px", height: "15px", border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    errorBox: { marginTop: "12px", background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#fca5a5" },
    resultBox: { marginTop: "18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "14px", padding: "20px" },
    resultHeader: { marginBottom: "12px" },
    resultTitle: { fontSize: "15px", fontWeight: 700, color: "#f0e6ff", marginBottom: "8px" },
    chips: { display: "flex", gap: "8px", flexWrap: "wrap" },
    chip: { background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "99px", padding: "3px 10px", fontSize: "11px", fontWeight: 600 },
    contentBox: { background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "16px", maxHeight: "400px", overflowY: "auto" },
    content: { fontSize: "14px", lineHeight: 1.7, color: "#e2d9f3" },
    plainText: { margin: 0, fontFamily: "'Fira Code', monospace", fontSize: "13px", color: "#a78bfa", whiteSpace: "pre-wrap", wordBreak: "break-word" },
    emptyResult: { marginTop: "16px", textAlign: "center", fontSize: "14px", color: "#9d8ec7", padding: "18px", background: "rgba(139,92,246,0.04)", borderRadius: "12px", border: "1px dashed rgba(139,92,246,0.2)" },
};
