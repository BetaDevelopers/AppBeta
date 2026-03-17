import { useState } from 'react';
import { createWorker } from 'tesseract.js';

export const useOCR = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const performOCR = async (imageSource: string | HTMLCanvasElement): Promise<string | null> => {
        setIsProcessing(true);
        setProgress(0);

        try {
            const worker = await createWorker('spa', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(m.progress);
                    }
                }
            });

            const { data: { text } } = await worker.recognize(imageSource);
            await worker.terminate();
            return text;
        } catch (error) {
            console.error('OCR Error:', error);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    return { performOCR, isProcessing, progress };
};
