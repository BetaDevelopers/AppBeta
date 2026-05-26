import React, { useState, useEffect } from 'react';
import { useMathToolsStore } from '../../store/mathToolsStore';
import { markdownToHtml } from '../../utils/editorUtils';
import MathToolModal from '../notes/MathToolModal';
import MathOCR from '@/features/math/components/MathOCR';
import MathOCRImage from '@/features/math/components/MathOCRImage';
import MathEditor from '@/features/math/components/MathEditor';
import TableToChart from '@/features/math/components/TableToChart';
import ChartToTable from '@/features/math/components/ChartToTable';
import GeometryCanvas from '@/features/math/components/GeometryCanvas';
import DiagramCanvas from '@/features/math/components/DiagramCanvas';
import HandwritingCalibrator from '@/features/math/components/HandwritingCalibrator';
import SmartCamera from '../camera/SmartCamera';
import FileUploadOCR from '../files/FileUploadOCR';

export default function MathToolsModals() {
    const { activeTool, pendingResult, editor, closeTool, setPendingResult, openTool } = useMathToolsStore();
    const [editingChartConfig, setEditingChartConfig] = useState<{ chartType: string; tableData: string } | null>(null);

    // Listen for click-to-edit events from the note editor
    useEffect(() => {
        const handleEditChart = (e: Event) => {
            const config = (e as CustomEvent).detail as { chartType: string; tableData: string };
            setEditingChartConfig(config);
            openTool('tableToChart');
        };
        window.addEventListener('edit-chart', handleEditChart);
        return () => window.removeEventListener('edit-chart', handleEditChart);
    }, [openTool]);

    const insertHtml = (html: string) => {
        if (!editor || !html) return;
        editor.chain().focus().insertContent(html).run();
    };

    const insertMarkdown = (md: string) => {
        if (!editor || !md) return;
        // Split on $$...$$ and $...$ so math segments get proper Tiptap nodes
        const parts = md.split(/((?:\$\$[\s\S]*?\$\$|\$[^$\n]+?\$))/g);
        const chain = editor.chain().focus();
        parts.forEach(part => {
            if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
                const latex = part.slice(2, -2).trim();
                if (latex) chain.insertBlockMath({ latex });
            } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                const latex = part.slice(1, -1).trim();
                if (latex) chain.insertInlineMath({ latex });
            } else if (part.trim()) {
                chain.insertContent(markdownToHtml(part));
            }
        });
        chain.run();
    };

    const insertLatex = (latex: string) => {
        if (!editor || !latex) return;
        editor.chain().focus().insertBlockMath({ latex }).run();
    };

    const insertAndClose = (type: 'html' | 'md' | 'latex' | 'image', content: string) => {
        if (type === 'latex') insertLatex(content);
        else if (type === 'md') insertMarkdown(content);
        else if (type === 'image') {
            editor?.chain().focus().setImage({ src: content }).run();
        } else insertHtml(content);

        closeTool();
    };

    const canInsert = !!pendingResult && !!editor;

    return (
        <>
            {/* ── Lápiz Intel·ligent → MathOCR ── */}
            <MathToolModal
                isOpen={activeTool === 'mathOCR'}
                onClose={closeTool}
                title="Lápiz inteligente — Reconocimiento"
                canInsert={canInsert}
                onInsert={() => insertAndClose('latex', pendingResult!)}
            >
                <MathOCR onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Càmera Intel·ligent → SmartCamera ── */}
            <MathToolModal
                isOpen={activeTool === 'smartCamera'}
                onClose={closeTool}
                title="Cámara — Escaneo con OCR"
                canInsert={canInsert}
                onInsert={() => insertAndClose('md', pendingResult!)}
            >
                <SmartCamera onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Pujar arxiu → FileUploadOCR ── */}
            <MathToolModal
                isOpen={activeTool === 'fileUpload'}
                onClose={closeTool}
                title="Cargar archivo — OCR"
                canInsert={canInsert}
                onInsert={() => insertAndClose('md', pendingResult!)}
            >
                <FileUploadOCR
                    onResult={setPendingResult}
                    onInsertImage={(src) => insertAndClose('image', src)}
                />
            </MathToolModal>

            {/* ── Imatge → MathOCRImage ── */}
            <MathToolModal
                isOpen={activeTool === 'mathOCRImage'}
                onClose={closeTool}
                title="OCR de Imagen — Matemáticas"
                canInsert={canInsert}
                onInsert={() => insertAndClose('md', pendingResult!)}
            >
                <MathOCRImage onResult={setPendingResult} />
            </MathToolModal>

            {/* ── TeXificar → MathEditor ── */}
            <MathToolModal
                isOpen={activeTool === 'mathEditor'}
                onClose={closeTool}
                title="TeXificar — Convertir a LaTeX"
                canInsert={canInsert}
                onInsert={() => insertAndClose('md', pendingResult!)}
            >
                <MathEditor onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Gràfic → TableToChart ── */}
            <MathToolModal
                isOpen={activeTool === 'tableToChart'}
                onClose={() => { setEditingChartConfig(null); closeTool(); }}
                title="Visualizador de Datos"
                canInsert={canInsert}
                onInsert={() => {
                    try {
                        const parsed = JSON.parse(pendingResult!);
                        const { imageBase64, chartType, tableData } = parsed;
                        if (!imageBase64 || !editor) throw new Error('no image');
                        const configEncoded = btoa(unescape(encodeURIComponent(JSON.stringify({ chartType, tableData }))));
                        editor.chain().focus().insertContent({
                            type: 'chartBlock',
                            attrs: {
                                src: imageBase64,
                                alt: `CHART:${configEncoded}`,
                                width: 600,
                            },
                        }).run();
                        setEditingChartConfig(null);
                        closeTool();
                    } catch {
                        closeTool();
                    }
                }}
            >
                <TableToChart onResult={setPendingResult} initialConfig={editingChartConfig ?? undefined} />
            </MathToolModal>

            {/* ── Pujar gràfic → ChartToTable ── */}
            <MathToolModal
                isOpen={activeTool === 'chartToTable'}
                onClose={closeTool}
                title="Gráfico → Tabla de datos"
                canInsert={canInsert}
                onInsert={() => insertAndClose('md', pendingResult!)}
            >
                <ChartToTable onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Geometria → GeometryCanvas ── */}
            <MathToolModal
                isOpen={activeTool === 'geometry'}
                onClose={closeTool}
                title="Laboratorio de Geometría"
                canInsert={canInsert}
                onInsert={() => {
                    // El result de geometría suele ser un SVG o una descripción
                    const block = `<div style="background:rgba(139,92,246,0.05);padding:20px;border-radius:16px;border:1px solid rgba(139,92,246,0.2);margin:16px 0;">
                        ${pendingResult}
                    </div>`;
                    insertAndClose('html', block);
                }}
            >
                <GeometryCanvas onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Diagrama → DiagramCanvas ── */}
            <MathToolModal
                isOpen={activeTool === 'diagram'}
                onClose={closeTool}
                title="Generador de Diagramas"
                canInsert={canInsert}
                onInsert={() => {
                    try {
                        const parsed = JSON.parse(pendingResult!);
                        const { imageBase64, chartType } = parsed;
                        if (!imageBase64 || !editor) throw new Error('no image');
                        const configEncoded = btoa(unescape(encodeURIComponent(
                            JSON.stringify({ chartType, tableData: '' })
                        )));
                        editor.chain().focus().insertContent({
                            type: 'chartBlock',
                            attrs: {
                                src: imageBase64,
                                alt: `CHART:${configEncoded}`,
                                width: 380,
                            },
                        }).run();
                        closeTool();
                    } catch {
                        closeTool();
                    }
                }}
            >
                <DiagramCanvas onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Calibrar → HandwritingCalibrator ── */}
            <MathToolModal
                isOpen={activeTool === 'calibrate'}
                onClose={closeTool}
                title="Calibrar escritura"
            >
                <HandwritingCalibrator />
            </MathToolModal>
        </>
    );
}
