/**
 * ChartToTable.jsx
 *
 * Visual Chart → Reconstructed Data Table.
 * Extract values from a bar/pie chart screenshot.
 */

import { useState, useCallback, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export default function ChartToTable({ apiBase = API_BASE }) {
    const [image, setImage] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Load ──
    function loadFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        const rd = new FileReader();
        rd.onload = (e) => setImage(e.target.result);
        rd.readAsDataURL(file);
    }

    // Paste support
    useEffect(() => {
        function onPaste(e) {
            const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
            if (item) loadFile(item.getAsFile());
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);

    // ── Extract ──
    async function handleExtract() {
        if (!image) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/chart-to-table`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: image }),
            });
            if (!res.ok) throw new Error("Failed extraction");
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={S.wrapper}>
            {/* Header */}
            <div style={S.header}>
                <span style={S.icon}>📸</span>
                <div>
                    <h2 style={S.title}>Chart-to-Table Extractor</h2>
                    <p style={S.subtitle}>Paste a chart screenshot and extract raw numerical values.</p>
                </div>
            </div>

            <div style={S.grid}>
                {/* L: IMAGE INPUT */}
                <div style={S.col}>
                    <div
                        style={{ ...S.dropArea, ...(image ? S.previewMode : {}) }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }}
                        onClick={() => !image && document.getElementById("ctt-input").click()}
                    >
                        {image ? (
                            <img src={image} style={S.img} alt="chart" />
                        ) : (
                            <div style={S.prompt}>Drop chart here (or Paste)</div>
                        )}
                        <input id="ctt-input" type="file" style={{ display: "none" }} onChange={e => loadFile(e.target.files[0])} />
                    </div>
                    <button style={S.btn} onClick={handleExtract} disabled={!image || loading}>
                        {loading ? "Scanning pixels..." : "⚡ Extract Data Table"}
                    </button>
                </div>

                {/* R: EXTRACTED DATA */}
                <div style={S.col}>
                    {error && <div style={S.error}>{error}</div>}

                    <div style={S.resultArea}>
                        {result ? (
                            <>
                                <div style={S.resHeader}>
                                    <span style={S.badge}>{result.chartType.toUpperCase()} DETECTED</span>
                                    <div style={S.confWrap}>
                                        <div style={{ ...S.confBar, width: `${result.confidence * 100}%` }} />
                                    </div>
                                </div>

                                <div style={S.tableBox}>
                                    <pre style={S.mdPre}>{result.tableMarkdown}</pre>
                                </div>

                                <div style={S.list}>
                                    {result.data.map((d, i) => (
                                        <div key={i} style={S.listItem}>
                                            <span style={S.liLabel}>{d.label}</span>
                                            <span style={S.liVal}>{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={S.empty}>Reconstructed data will appear here.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const S = {
    wrapper: {
        padding: "24px", background: "#0a0618", borderRadius: "16px",
        border: "1px solid rgba(139,92,246,0.3)", color: "#fff", maxWidth: "900px", margin: "0 auto"
    },
    header: { display: "flex", gap: "12px", marginBottom: "20px" },
    icon: { fontSize: "24px" },
    title: { margin: 0, fontSize: "18px", fontWeight: 700 },
    subtitle: { margin: "2px 0 0", fontSize: "12px", color: "#9d8ec7" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
    col: { display: "flex", flexDirection: "column", gap: "12px" },
    dropArea: {
        height: "220px", border: "2px dashed rgba(139,92,246,0.3)", borderRadius: "12px",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        background: "rgba(139,92,246,0.05)", overflow: "hidden"
    },
    previewMode: { border: "1px solid rgba(139,92,246,0.3)" },
    prompt: { fontSize: "14px", color: "#9d8ec7" },
    img: { width: "100%", height: "100%", objectFit: "contain" },
    btn: {
        background: "#7c3aed", color: "#fff", border: "none", padding: "10px",
        borderRadius: "8px", fontWeight: 700, cursor: "pointer"
    },
    resultArea: {
        height: "260px", background: "rgba(0,0,0,0.3)", borderRadius: "12px",
        padding: "16px", border: "1px solid rgba(139,92,246,0.15)", overflowY: "auto"
    },
    resHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" },
    badge: { fontSize: "10px", fontWeight: 800, background: "#7c3aed", padding: "2px 6px", borderRadius: "4px" },
    confWrap: { flex: 1, height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" },
    confBar: { height: "100%", background: "#4ade80" },
    tableBox: { background: "#111", borderRadius: "8px", padding: "10px", marginBottom: "10px" },
    mdPre: { margin: 0, fontSize: "12px", color: "#4ade80", fontFamily: "monospace" },
    list: { display: "flex", flexDirection: "column", gap: "6px" },
    listItem: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#c4b5fd" },
    liLabel: { fontWeight: 600 },
    empty: { color: "#5a507a", fontSize: "12px", fontStyle: "italic", textAlign: "center", paddingTop: "80px" },
    error: { color: "#fca5a5", fontSize: "12px", margin: "8px 0" }
};
