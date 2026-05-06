import { useCallback } from 'react';
import { ocrImage } from '../api/mathApi';
import { useMathOCR } from '../features/ai/hooks/useMathOCR';

export type RecognitionResult =
    | { type: 'latex'; content: string }
    | { type: 'text'; content: string }
    | { type: 'drawing'; dataUrl: string };

export function useStrokeRecognition() {
    const { recognize } = useMathOCR();

    const processStroke = useCallback(async (
        dataUrl: string
    ): Promise<RecognitionResult> => {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

        // 1. Try math OCR first (higher priority for formulae)
        try {
            const math = await recognize([], dataUrl);
            if (math && math.isEquation && math.confidence >= 0.65 && math.latex) {
                return { type: 'latex', content: math.latex };
            }
        } catch { /* fall through */ }

        // 2. Try general OCR
        try {
            const ocr = await ocrImage(base64);
            const text: string = (ocr as any).text ?? (ocr as any).markdown ?? '';
            if (text.trim().length > 0) {
                return { type: 'text', content: text.trim() };
            }
        } catch { /* fall through */ }

        // 3. Keep as drawing
        return { type: 'drawing', dataUrl };
    }, [recognize]);

    return { processStroke };
}
