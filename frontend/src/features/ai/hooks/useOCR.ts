/**
 * useOCR
 * ------
 * Hook genèric per a OCR de text (càmera / captura de pantalla).
 * Crida a POST /api/ai/ocr (GPT-4o Vision) en lloc de Tesseract local
 * per obtenir reconeixement de qualitat professional.
 *
 * Per a fórmules matemàtiques, usa `useMathOCR` en el seu lloc.
 */
import { useState, useCallback } from 'react';

export const useOCR = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    /**
     * performOCR
     * ----------
     * imageSource: string (base64 PNG/JPEG, pot portar prefix `data:`) o HTMLCanvasElement
     * Retorna: el text reconegut com markdown, o null si hi ha error.
     */
    const performOCR = useCallback(
        async (imageSource: string | HTMLCanvasElement): Promise<string | null> => {
            setIsProcessing(true);
            setProgress(0);

            try {
                // 1. Converteix HTMLCanvasElement → base64 si cal
                let base64: string;
                if (imageSource instanceof HTMLCanvasElement) {
                    base64 = imageSource
                        .toDataURL('image/png')
                        .replace(/^data:image\/\w+;base64,/, '');
                } else {
                    base64 = (imageSource as string).replace(/^data:image\/\w+;base64,/, '');
                }

                setProgress(0.3);

                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/ocr`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        image: base64,
                        mime_type: 'image/png',
                    }),
                });

                setProgress(0.9);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || `Error ${res.status}`);
                }

                setProgress(1);
                return (data.content_markdown as string) || null;
            } catch (error: any) {
                console.error('OCR Error:', error);
                return null;
            } finally {
                setIsProcessing(false);
                setProgress(0);
            }
        },
        []
    );

    return { performOCR, isProcessing, progress };
};
