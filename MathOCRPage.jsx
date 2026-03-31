/**
 * MathOCRPage.jsx
 * Standalone demo page that mounts the MathOCR widget.
 * Route: /math-ocr (add to your router if needed)
 */
import MathOCR from "../components/admin/MathOCR";

export default function MathOCRPage() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(160deg, #07030f 0%, #100828 55%, #0b1130 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 16px",
            }}
        >
            <h1
                style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "clamp(20px, 4vw, 36px)",
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                    background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "8px",
                    textAlign: "center",
                }}
            >
                ✍️ Handwritten Math → LaTeX
            </h1>
            <p
                style={{
                    fontFamily: "'Inter', sans-serif",
                    color: "#9d8ec7",
                    fontSize: "14px",
                    marginBottom: "32px",
                    textAlign: "center",
                }}
            >
                Draw an equation on the canvas, then click <strong style={{ color: "#c4b5fd" }}>⚡ Recognize</strong>.
            </p>

            <MathOCR />

            {/* API spec card */}
            <div
                style={{
                    marginTop: "40px",
                    maxWidth: "700px",
                    width: "100%",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: "16px",
                    padding: "22px 26px",
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "12px",
                    color: "#9d8ec7",
                    lineHeight: 1.9,
                }}
            >
                <p style={{ margin: 0, color: "#c4b5fd", fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: "12px" }}>
                    📡 API contract
                </p>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {`POST /api/v1/math-ocr
Content-Type: application/json

Request
{
  "strokes": [[{"x": 10, "y": 40}, ...]],
  "imageBase64": "<optional png base64>"
}

Response
{
  "isEquation": true,
  "latex": "E = mc^{2}",
  "confidence": 0.82
}`}
                </pre>
                <p style={{ margin: "14px 0 0", color: "#c4b5fd", fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                    🛠 Demo endpoint
                </p>
                <code>GET /api/v1/math-ocr/demo → E = mc²</code>
            </div>
        </div>
    );
}
