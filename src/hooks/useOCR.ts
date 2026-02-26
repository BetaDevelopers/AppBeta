import { createWorker } from 'tesseract.js';
import { useState } from 'react';

export const useOCR = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const recognizeText = async (image: string | File) => {
        setLoading(true);
        setProgress(0);
        try {
            const worker = await createWorker('spa', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(m.progress);
                    }
                }
            });
            const { data: { text } } = await worker.recognize(image);
            await worker.terminate();
            return text;
        } catch (error) {
            console.error('OCR Error:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { recognizeText, loading, progress };
};
