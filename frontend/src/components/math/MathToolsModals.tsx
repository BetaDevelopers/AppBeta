import React from 'react';
import { useMathToolsStore } from '../../store/mathToolsStore';
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
    const { activeTool, pendingResult, editor, closeTool, setPendingResult } = useMathToolsStore();

    const insert = (text: string) => {
        if (!editor || !text) return;
        editor.chain().focus().insertContent(text).run();
    };

    const insertAndClose = (text: string) => {
        insert(text);
        closeTool();
    };

    const insertImage = (src: string) => {
        if (!editor) return;
        editor.chain().focus().setImage({ src }).run();
        closeTool();
    };

    const canInsert = !!pendingResult && !!editor;

    return (
        <>
            {/* ── Lápiz Intel·ligent → MathOCR ── */}
            <MathToolModal
                isOpen={activeTool === 'mathOCR'}
                onClose={closeTool}
                title="Lápiz — Dibuix a LaTeX"
                canInsert={canInsert}
                onInsert={() => insertAndClose(`$$${pendingResult}$$`)}
            >
                <MathOCR onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Càmera Intel·ligent → SmartCamera ── */}
            <MathToolModal
                isOpen={activeTool === 'smartCamera'}
                onClose={closeTool}
                title="Càmera — Escanejar amb OCR"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <SmartCamera onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Pujar arxiu → FileUploadOCR ── */}
            <MathToolModal
                isOpen={activeTool === 'fileUpload'}
                onClose={closeTool}
                title="Pujar arxiu — OCR"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <FileUploadOCR
                    onResult={setPendingResult}
                    onInsertImage={insertImage}
                />
            </MathToolModal>

            {/* ── Imatge → MathOCRImage ── */}
            <MathToolModal
                isOpen={activeTool === 'mathOCRImage'}
                onClose={closeTool}
                title="Imatge — OCR Matemàtic"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <MathOCRImage onResult={setPendingResult} />
            </MathToolModal>

            {/* ── TeXificar → MathEditor ── */}
            <MathToolModal
                isOpen={activeTool === 'mathEditor'}
                onClose={closeTool}
                title="TeXificar — Text a LaTeX"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <MathEditor onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Gràfic → TableToChart ── */}
            <MathToolModal
                isOpen={activeTool === 'tableToChart'}
                onClose={closeTool}
                title="Gràfic — Taula a Gràfic"
                canInsert={canInsert}
                onInsert={() => insertAndClose(`\n\n> 📊 ${pendingResult}`)}
                insertLabel="Inserir descripció"
            >
                <TableToChart onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Pujar gràfic → ChartToTable ── */}
            <MathToolModal
                isOpen={activeTool === 'chartToTable'}
                onClose={closeTool}
                title="Gràfic → Taula de dades"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <ChartToTable onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Geometria → GeometryCanvas ── */}
            <MathToolModal
                isOpen={activeTool === 'geometry'}
                onClose={closeTool}
                title="Geometria — Dibuix a SVG"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
                insertLabel="Inserir SVG"
            >
                <GeometryCanvas onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Diagrama → DiagramCanvas ── */}
            <MathToolModal
                isOpen={activeTool === 'diagram'}
                onClose={closeTool}
                title="Diagrama — Interpret Esquema"
                canInsert={canInsert}
                onInsert={() => insertAndClose(pendingResult!)}
            >
                <DiagramCanvas onResult={setPendingResult} />
            </MathToolModal>

            {/* ── Calibrar → HandwritingCalibrator (sense inserció) ── */}
            <MathToolModal
                isOpen={activeTool === 'calibrate'}
                onClose={closeTool}
                title="Calibrar Escriptura"
            >
                <HandwritingCalibrator />
            </MathToolModal>
        </>
    );
}
