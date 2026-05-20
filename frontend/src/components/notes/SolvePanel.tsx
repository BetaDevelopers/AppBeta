import React, { useState, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Calculator, X, AlertTriangle, Check } from 'lucide-react';
import { apiClient } from '../../api/client';

const SLIDE_IN_CSS = `
@keyframes solve-panel-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
.solve-panel-enter {
  animation: solve-panel-slide-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
`;

const TUTOR_SYSTEM =
    'Eres un tutor matemático experto. Resuelve paso a paso de forma educativa. ' +
    'Usa el formato: "Paso 1: [explicación]\nPaso 2: ...\nResultado: [respuesta final]". ' +
    'Para ecuaciones usa notación $LaTeX$ (inline) o $$LaTeX$$ (bloque).';

// ---------------------------------------------------------------------------
// KaTeX helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderMath(text: string): string {
    // Split on $$...$$ and $...$ to preserve math, escape everything else
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
    return parts.map(part => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
            try {
                return katex.renderToString(part.slice(2, -2).trim(), { displayMode: true, throwOnError: false });
            } catch { return escapeHtml(part); }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            try {
                return katex.renderToString(part.slice(1, -1).trim(), { displayMode: false, throwOnError: false });
            } catch { return escapeHtml(part); }
        }
        return escapeHtml(part);
    }).join('');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnimatedDots() {
    const [dots, setDots] = React.useState('');
    React.useEffect(() => {
        const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 400);
        return () => clearInterval(t);
    }, []);
    return <span>{dots}</span>;
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center h-40 gap-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
            </div>
            <p className="text-slate-500 text-[14px]">
                Resolviendo<AnimatedDots />
            </p>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[14px]">
            <AlertTriangle size={14} /> {message}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Solution renderer
// ---------------------------------------------------------------------------

function renderSolution(text: string): React.ReactNode {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        const stepMatch = line.match(/^Paso\s+(\d+):\s*(.*)/i);
        const resultMatch = line.match(/^Resultado:\s*(.*)/i);

        if (stepMatch) {
            const stepNum = stepMatch[1];
            const stepContent = stepMatch[2];
            nodes.push(
                <div key={i} className="flex gap-4 mb-6">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                        <span className="text-blue-400 font-black text-[15px]">{stepNum}</span>
                    </div>
                    <div className="flex-1 pt-1.5">
                        <span
                            className="text-slate-200 text-[15px] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMath(stepContent) }}
                        />
                    </div>
                </div>
            );
        } else if (resultMatch) {
            const resultContent = resultMatch[1];
            nodes.push(
                <div
                    key={i}
                    className="mt-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3"
                >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check size={14} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-emerald-400 text-[11px] font-black uppercase tracking-widest mb-1">
                            Resultado
                        </p>
                        <div
                            className="text-emerald-300 font-semibold text-[16px]"
                            dangerouslySetInnerHTML={{ __html: renderMath(resultContent) }}
                        />
                    </div>
                </div>
            );
        } else if (line.trim()) {
            nodes.push(
                <p key={i} className="text-slate-400 text-[14px] leading-relaxed mb-2">
                    {line}
                </p>
            );
        }
    });

    return <>{nodes}</>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SolvePanelProps {
    selectedText: string;
    onClose: () => void;
    onInsert: (content: string) => void;
}

export function SolvePanel({ selectedText, onClose, onInsert }: SolvePanelProps) {
    const [loading, setLoading] = useState(true);
    const [solution, setSolution] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setSolution('');
        setError(null);

        apiClient
            .post<{ reply: string }>('/ai/chat', {
                messages: [
                    { role: 'system', content: TUTOR_SYSTEM },
                    { role: 'user', content: `Resuelve paso a paso: ${selectedText}` },
                ],
            })
            .then(res => {
                if (!cancelled) setSolution(res.reply);
            })
            .catch(err => {
                if (!cancelled) setError(err.message || 'Error al resolver');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedText]);

    const handleInsert = () => {
        if (!solution.trim()) return;
        onInsert(solution);
        onClose();
    };

    return (
        <>
            {/* Backdrop — clicks close panel */}
            <div
                className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="fixed top-0 right-0 h-full z-[1001] max-w-[420px] w-full flex flex-col solve-panel-enter"
                style={{
                    background: '#0d1117',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '-16px 0 48px rgba(0,0,0,0.5)',
                }}
            >
                <style>{SLIDE_IN_CSS}</style>

                {/* Header */}
                <div
                    className="flex items-start justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Calculator className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <h3 className="text-white font-bold text-[16px]">Resolución paso a paso</h3>
                        </div>
                        <p className="text-slate-500 text-[12px] truncate">{selectedText}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
                    {loading && <LoadingState />}
                    {error && <ErrorState message={error} />}
                    {solution && !loading && renderSolution(solution)}
                </div>

                {/* Sticky footer */}
                {solution && !loading && (
                    <div
                        className="px-5 py-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <button
                            onClick={handleInsert}
                            className="w-full py-3 rounded-2xl text-[14px] font-bold text-white transition-all active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                        >
                            + Insertar en la nota
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 mt-2 text-[13px] text-slate-500 hover:text-white transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

export default SolvePanel;
