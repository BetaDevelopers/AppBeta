import React from 'react'
import { useOCR } from '../hooks/useOCR'
import { useAI } from '../hooks/useAI'
import { FileSearch, Layers, Sparkles } from 'lucide-react'

const AIPanel: React.FC = () => {
    const { recognizeText, loading: ocrLoading } = useOCR();
    const { generateSummary, loading: aiLoading } = useAI();

    const handleOCR = async () => {
        // In a real app, this would take the canvas image
        alert("Iniciando OCR sobre el canvas...");
        const text = await recognizeText("https://tesseract.projectnaptha.com/img/eng_bw.png");
        if (text) alert("Texto reconocido: " + text.substring(0, 100) + "...");
    };

    const handleSummary = async () => {
        const summary = await generateSummary("Contenido de los apuntes técnicos sobre física.");
        if (summary) alert(summary);
    };

    return (
        <div style={{ padding: 16, borderTop: '1px solid #444', marginTop: 'auto' }}>
            <h4>Herramientas IA</h4>
            <button
                style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer' }}
                onClick={handleOCR}
                disabled={ocrLoading}
            >
                <FileSearch size={16} /> {ocrLoading ? 'Procesando...' : 'Reconocimiento OCR'}
            </button>
            <button
                style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer' }}
                onClick={handleSummary}
                disabled={aiLoading}
            >
                <Sparkles size={16} /> {aiLoading ? 'Generando...' : 'Resumen Inteligente'}
            </button>
        </div>
    );
};

export default AIPanel
