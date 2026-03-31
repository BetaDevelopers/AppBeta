/**
 * MathOCRImage.jsx
 *
 * Upload / paste an image → backend detects equation & text regions →
 * overlay bounding boxes → render KaTeX for each equation.
 *
 * Usage:
 *   <MathOCRImage apiBase="http://localhost:8000/api/v1" />
 *
 * POST /api/v1/math-ocr-image
 *   { imageBase64: string }
 *   → { regions: [{ type, content, latex?, bbox:{x,y,w,h}, confidence }] }
 */

import { useRef, useState, useCallback, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ─── KaTeX helper ─────────────────────────────────────────────────────────────
function renderKatex(latex) {
    try {
        return katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
            output: "html",
        });
    } catch {
        return `<code style="color:#f87171">${latex}</code>`;
    }
}

// ─── colour per region type ───────────────────────────────────────────────────
const REGION_COLORS = {
    equation: { stroke: "#a78bfa", fill: "rgba(167,139,250,0.12)", badge: "#7c3aed" },
    text: { stroke: "#60a5fa", fill: "rgba(96,165,250,0.08)", badge: "#2563eb" },
};

// ─── main component ───────────────────────────────────────────────────────────
export default function MathOCRImage({ apiBase = API_BASE }) {
    const [imageSrc, setImageSrc] = useState(null);   // data-URL
    const [imageSize, setImageSize] = useState(null);   // { w, h } natural
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);   // index of selected region
    const [dragging, setDragging] = useState(false);
    const [copied, setCopied] = useState(null);   // index

    const containerRef = useRef(null); // wrapper for the image + overlay
    const imgRef = useRef(null);
    const fileInputRef = useRef(null);

    // Recalculate rendered image dimensions on resize
    const [renderedSize, setRenderedSize] = useState(null);

    useEffect(() => {
        if (!imageSrc || !imgRef.current) return;
        const update = () => {
            const el = imgRef.current;
            if (!el) return;
            setRenderedSize({ w: el.clientWidth, h: el.clientHeight });
        };
        const ro = new ResizeObserver(update);
        ro.observe(imgRef.current);
        update();
        return () => ro.disconnect();
    }, [imageSrc]);

    // ── Load image ─────────────────────────────────────────────────────────────
    function loadFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        setRegions([]);
        setSelected(null);
        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const src = e.target.result;
            setImageSrc(src);
            // Get natural dimensions
            const img = new Image();
            img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    function handleFileInput(e) {
        loadFile(e.target.files?.[0]);
    }

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        loadFile(e.dataTransfer.files?.[0]);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragging(false), []);

    // Clipboard paste (Ctrl+V anywhere in the widget)
    useEffect(() => {
        function onPaste(e) {
            const item = Array.from(e.clipboardData?.items ?? []).find(
                (i) => i.type.startsWith("image/")
            );
            if (item) loadFile(item.getAsFile());
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);

    // ── Recognize ──────────────────────────────────────────────────────────────
    async function handleRecognize() {
        if (!imageSrc) return;
        setLoading(true);
        setError(null);
        setRegions([]);
        setSelected(null);

        try {
            // Strip data-URL prefix → raw base64
            const b64 = imageSrc.split(",")[1];
            const res = await fetch(`${apiBase}/math-ocr-image`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: b64 }),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setRegions(data.regions ?? []);
        } catch (err) {
            setError(err.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    // ── Copy latex ─────────────────────────────────────────────────────────────
    async function handleCopy(idx) {
        const latex = regions[idx]?.latex;
        if (!latex) return;
        await navigator.clipboard.writeText(latex);
        setCopied(idx);
        setTimeout(() => setCopied(null), 1800);
    }

    // ── Scale bbox from natural to rendered pixels ─────────────────────────────
    function scaleBBox(bbox) {
        if (!imageSize || !renderedSize) return bbox;
        const sx = renderedSize.w / imageSize.w;
        const sy = renderedSize.h / imageSize.h;
        return {
            x: Math.round(bbox.x * sx),
            y: Math.round(bbox.y * sy),
            w: Math.round(bbox.w * sx),
            h: Math.round(bbox.h * sy),
        };
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    const equationCount = regions.filter((r) => r.type === "equation").length;
    const textCount = regions.filter((r) => r.type === "text").length;

    return (
        <div style={S.wrapper} id="math-ocr-image-widget">
            {/* ── Header ── */}
            <div style={S.header}>
                <span style={S.headerIcon}>🔍</span>
                <div>
                    <div style={S.title}>Math Image OCR</div>
                    <div style={S.subtitle}>
                        Upload an image · detect equations & text · get LaTeX per region
                    </div>
                </div>
            </div>

            {/* ── Drop zone / image preview ── */}
            <div
                style={{
                    ...S.dropZone,
                    ...(dragging ? S.dropZoneActive : {}),
                    ...(imageSrc ? S.dropZoneHasImage : {}),
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !imageSrc && fileInputRef.current?.click()}
                id="math-ocr-image-dropzone"
            >
                {imageSrc ? (
                    /* Image + bounding-box overlay */
                    <div ref={containerRef} style={S.imageWrap}>
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="uploaded"
                            style={S.image}
                            draggable={false}
                        />
                        {/* SVG overlay for bboxes */}
                        {renderedSize && regions.length > 0 && (
                            <svg
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: renderedSize.w,
                                    height: renderedSize.h,
                                    pointerEvents: "none",
                                }}
                                width={renderedSize.w}
                                height={renderedSize.h}
                            >
                                {regions.map((r, i) => {
                                    const b = scaleBBox(r.bbox);
                                    const col = REGION_COLORS[r.type];
                                    const isSelected = selected === i;
                                    return (
                                        <g key={i} style={{ pointerEvents: "all", cursor: "pointer" }}
                                            onClick={(e) => { e.stopPropagation(); setSelected(selected === i ? null : i); }}>
                                            <rect
                                                x={b.x} y={b.y} width={b.w} height={b.h}
                                                fill={col.fill}
                                                stroke={col.stroke}
                                                strokeWidth={isSelected ? 2.5 : 1.5}
                                                strokeDasharray={isSelected ? "none" : "5 3"}
                                                rx={4}
                                            />
                                            {/* Label badge */}
                                            <rect
                                                x={b.x} y={b.y - 18}
                                                width={r.type === "equation" ? 72 : 42}
                                                height={18}
                                                fill={col.badge}
                                                rx={4}
                                            />
                                            <text
                                                x={b.x + 5} y={b.y - 5}
                                                fill="#fff"
                                                fontSize={11}
                                                fontFamily="Inter, sans-serif"
                                                fontWeight={600}
                                            >
                                                {r.type === "equation"
                                                    ? `eq ${i + 1} · ${Math.round(r.confidence * 100)}%`
                                                    : `txt ${i + 1}`}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>
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
                    id="math-ocr-image-file-input"
                />
            </div>

            {/* ── Action bar ── */}
            <div style={S.actions}>
                <button
                    id="math-ocr-image-change"
                    style={{ ...S.btn, ...S.btnSecondary }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    📂 Change image
                </button>
                {imageSrc && (
                    <button
                        id="math-ocr-image-clear"
                        style={{ ...S.btn, ...S.btnSecondary }}
                        onClick={() => { setImageSrc(null); setRegions([]); setError(null); setSelected(null); setImageSize(null); setRenderedSize(null); }}
                    >
                        🗑 Clear
                    </button>
                )}
                <button
                    id="math-ocr-image-analyze"
                    style={{ ...S.btn, ...S.btnPrimary, opacity: (!imageSrc || loading) ? 0.5 : 1 }}
                    onClick={handleRecognize}
                    disabled={!imageSrc || loading}
                >
                    {loading ? <span style={S.spinner} /> : "⚡ Analyze"}
                </button>
            </div>

            {/* ── Error ── */}
            {error && <div style={S.errorBox}>⚠ {error}</div>}

            {/* ── Results summary ── */}
            {regions.length > 0 && (
                <div style={S.summary}>
                    <span style={S.summaryChip}>
                        🟣 {equationCount} equation{equationCount !== 1 ? "s" : ""}
                    </span>
                    <span style={S.summaryChip}>
                        🔵 {textCount} text region{textCount !== 1 ? "s" : ""}
                    </span>
                    <span style={{ ...S.summaryChip, color: "#9d8ec7", fontSize: "11px" }}>
                        Click a region to expand
                    </span>
                </div>
            )}

            {/* ── Region list ── */}
            {regions.length > 0 && (
                <div style={S.regionList} id="math-ocr-image-regions">
                    {regions.map((r, i) => {
                        const col = REGION_COLORS[r.type];
                        const isOpen = selected === i;
                        return (
                            <div
                                key={i}
                                style={{
                                    ...S.regionCard,
                                    borderColor: isOpen ? col.stroke : "rgba(139,92,246,0.18)",
                                    background: isOpen ? col.fill : "rgba(255,255,255,0.025)",
                                }}
                                id={`math-ocr-region-${i}`}
                            >
                                {/* Card header */}
                                <div
                                    style={S.regionHeader}
                                    onClick={() => setSelected(isOpen ? null : i)}
                                >
                                    <span style={{ ...S.regionBadge, background: col.badge }}>
                                        {r.type === "equation" ? "EQ" : "TXT"} {i + 1}
                                    </span>
                                    <span style={S.regionMeta}>
                                        {r.bbox.w}×{r.bbox.h}px &nbsp;·&nbsp;
                                        ({r.bbox.x},{r.bbox.y}) &nbsp;·&nbsp;
                                        {Math.round(r.confidence * 100)}% confidence
                                    </span>
                                    <span style={{ ...S.chevron, transform: isOpen ? "rotate(180deg)" : "none" }}>
                                        ▾
                                    </span>
                                </div>

                                {/* Expanded body */}
                                {isOpen && (
                                    <div style={S.regionBody}>
                                        {r.type === "equation" && r.latex ? (
                                            <>
                                                {/* KaTeX render */}
                                                <div
                                                    style={S.katex}
                                                    dangerouslySetInnerHTML={{ __html: renderKatex(r.latex) }}
                                                />
                                                {/* LaTeX source */}
                                                <div style={S.latexRow}>
                                                    <code style={S.latexCode}>{r.latex}</code>
                                                    <button
                                                        style={S.copyBtn}
                                                        onClick={() => handleCopy(i)}
                                                        id={`math-ocr-copy-${i}`}
                                                    >
                                                        {copied === i ? "✓ Copied!" : "⎘ Copy"}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={S.textRegionNote}>
                                                Plain text region — no LaTeX generated.
                                            </div>
                                        )}

                                        {/* BBox detail */}
                                        <div style={S.bboxDetail}>
                                            <span style={S.bboxLabel}>BBox</span>
                                            <code style={S.bboxCode}>
                                                {{ ...r.bbox } &&
                                                    `x:${r.bbox.x} y:${r.bbox.y} w:${r.bbox.w} h:${r.bbox.h}`}
                                            </code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty state after analysis ── */}
            {!loading && imageSrc && regions.length === 0 && !error && (
                <div style={S.emptyResult}>
                    🤔 No regions detected yet. Click <strong style={{ color: "#c4b5fd" }}>⚡ Analyze</strong> to start.
                </div>
            )}

            {/* ── API spec ── */}
            {!imageSrc && (
                <div style={S.apiSpec}>
                    <span style={S.apiSpecLabel}>POST /api/v1/math-ocr-image</span>
                    <span style={S.apiSpecBody}>
                        {`{ imageBase64 } → { regions: [{ type, content, latex?, bbox, confidence }] }`}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const S = {
    wrapper: {
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #0a0618 0%, #10082a 100%)",
        border: "1px solid rgba(139,92,246,0.22)",
        borderRadius: "20px",
        padding: "28px",
        maxWidth: "740px",
        margin: "0 auto",
        boxShadow: "0 8px 40px rgba(88,28,235,0.22), 0 2px 8px rgba(0,0,0,0.5)",
        color: "#e2d9f3",
    },
    header: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" },
    headerIcon: { fontSize: "32px", lineHeight: 1 },
    title: { fontSize: "18px", fontWeight: 700, color: "#f0e6ff", letterSpacing: "-0.3px" },
    subtitle: { fontSize: "12px", color: "#9d8ec7", marginTop: "2px" },

    dropZone: {
        border: "2px dashed rgba(139,92,246,0.35)",
        borderRadius: "14px",
        minHeight: "160px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
        position: "relative",
        overflow: "hidden",
        background: "rgba(139,92,246,0.04)",
    },
    dropZoneActive: {
        borderColor: "#a78bfa",
        background: "rgba(139,92,246,0.10)",
    },
    dropZoneHasImage: {
        cursor: "default",
        border: "2px solid rgba(139,92,246,0.25)",
        minHeight: "unset",
    },

    imageWrap: {
        position: "relative",
        display: "inline-block",
        width: "100%",
        lineHeight: 0,
    },
    image: {
        width: "100%",
        height: "auto",
        borderRadius: "12px",
        display: "block",
        userSelect: "none",
    },
    dropPrompt: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "32px 20px",
    },
    dropIcon: { fontSize: "40px", lineHeight: 1 },
    dropText: { fontSize: "15px", fontWeight: 600, color: "#c4b5fd" },
    dropSubtext: { fontSize: "12px", color: "#9d8ec7" },

    actions: {
        display: "flex",
        gap: "10px",
        marginTop: "14px",
        flexWrap: "wrap",
    },
    btn: {
        flex: 1,
        minWidth: "100px",
        padding: "10px 18px",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        transition: "opacity 0.18s",
    },
    btnSecondary: {
        background: "rgba(139,92,246,0.1)",
        color: "#c4b5fd",
        border: "1px solid rgba(139,92,246,0.28)",
    },
    btnPrimary: {
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        color: "#fff",
        boxShadow: "0 4px 20px rgba(124,58,237,0.40)",
    },
    spinner: {
        display: "inline-block",
        width: "15px",
        height: "15px",
        border: "2.5px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    errorBox: {
        marginTop: "12px",
        background: "rgba(239,68,68,0.09)",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "13px",
        color: "#fca5a5",
    },
    summary: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px",
        flexWrap: "wrap",
    },
    summaryChip: {
        background: "rgba(139,92,246,0.1)",
        border: "1px solid rgba(139,92,246,0.22)",
        borderRadius: "99px",
        padding: "4px 12px",
        fontSize: "12px",
        color: "#c4b5fd",
        fontWeight: 600,
    },

    regionList: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" },
    regionCard: {
        border: "1px solid",
        borderRadius: "12px",
        overflow: "hidden",
        transition: "border-color 0.2s, background 0.2s",
    },
    regionHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        cursor: "pointer",
        userSelect: "none",
    },
    regionBadge: {
        color: "#fff",
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.5px",
    },
    regionMeta: { flex: 1, fontSize: "12px", color: "#9d8ec7" },
    chevron: { fontSize: "14px", color: "#9d8ec7", transition: "transform 0.2s" },

    regionBody: { padding: "14px 16px", borderTop: "1px solid rgba(139,92,246,0.15)" },
    katex: {
        fontSize: "22px",
        textAlign: "center",
        padding: "10px 0 14px",
        color: "#f0e6ff",
        overflowX: "auto",
    },
    latexRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(0,0,0,0.22)",
        borderRadius: "8px",
        padding: "7px 11px",
        marginBottom: "12px",
        flexWrap: "wrap",
    },
    latexCode: {
        flex: 1,
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: "12px",
        color: "#a78bfa",
        wordBreak: "break-all",
    },
    copyBtn: {
        background: "rgba(139,92,246,0.18)",
        border: "1px solid rgba(139,92,246,0.35)",
        color: "#c4b5fd",
        borderRadius: "6px",
        padding: "3px 10px",
        fontSize: "11px",
        cursor: "pointer",
        fontWeight: 600,
        whiteSpace: "nowrap",
    },
    textRegionNote: {
        fontSize: "13px",
        color: "#9d8ec7",
        padding: "6px 0 14px",
        fontStyle: "italic",
    },
    bboxDetail: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "4px",
    },
    bboxLabel: { fontSize: "11px", color: "#9d8ec7", fontWeight: 600, whiteSpace: "nowrap" },
    bboxCode: {
        fontFamily: "'Fira Code', monospace",
        fontSize: "11px",
        color: "#c4b5fd",
    },
    emptyResult: {
        marginTop: "16px",
        textAlign: "center",
        fontSize: "14px",
        color: "#9d8ec7",
        padding: "18px",
        background: "rgba(139,92,246,0.04)",
        borderRadius: "12px",
        border: "1px dashed rgba(139,92,246,0.2)",
    },
    apiSpec: {
        marginTop: "18px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "10px",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    apiSpecLabel: {
        fontFamily: "'Fira Code', monospace",
        fontSize: "12px",
        color: "#a78bfa",
        fontWeight: 600,
    },
    apiSpecBody: {
        fontFamily: "'Fira Code', monospace",
        fontSize: "11px",
        color: "#9d8ec7",
        wordBreak: "break-word",
    },
};
