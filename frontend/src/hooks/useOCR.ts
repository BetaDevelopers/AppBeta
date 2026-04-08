import { useState } from 'react';

/**
 * useOCR
 * ------
 * Wrapper lleuger sobre POST /api/ai/ocr.
 * Manté la mateixa API pública que el hook anterior basat en Tesseract
 * perquè els components que l'utilitzen no hagin de canviar.
 */
export const useOCR = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    /**
     * recognizeText
     * Accepta un string base64 (amb o sense prefix data:), una URL, o un File.
     * Retorna el text reconegut o null si hi ha error.
     */
    const recognizeText = async (image: string | File): Promise<string | null> => {
        setLoading(true);
        setProgress(0);
        try {
            let base64: string;
            if (image instanceof File) {
                base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve((e.target?.result as string).replace(/^data:image\/\w+;base64,/, ''));
                    reader.onerror = reject;
                    reader.readAsDataURL(image);
                });
            } else if (typeof image === 'string' && image.startsWith('data:')) {
                base64 = image.replace(/^data:image\/\w+;base64,/, '');
            } else {
                // URL: fetch i converteix a base64
                const resp = await fetch(image as string);
                const blob = await resp.blob();
                base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve((e.target?.result as string).replace(/^data:image\/\w+;base64,/, ''));
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
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
                body: JSON.stringify({ image: base64, mime_type: 'image/png' }),
            });

            setProgress(0.9);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

            setProgress(1);
            return (data.content_markdown as string) ?? null;
        } catch (error) {
            console.error('OCR Error:', error);
            return null;
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    return { recognizeText, loading, progress };
};
