import { useState, useCallback } from 'react';

export interface MathRegion {
    type: 'equation' | 'text';
    content: string;
    latex?: string;
    bbox: { x: number; y: number; w: number; h: number };
}

export interface MathOCRResult {
    isEquation: boolean;
    latex: string;
    confidence: number;
}

interface Point {
    x: number;
    y: number;
}

/**
 * useMathOCR
 * ----------
 * Hook per a reconeixement de matemàtiques avançat.
 */
export const useMathOCR = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * recognize
     * ---------
     * Reconeixement d'una única fórmula des de traços o base64.
     */
    const recognize = useCallback(
        async (
            strokes: Point[][],
            imageBase64?: string
        ): Promise<MathOCRResult | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;
                const body: { strokes?: Point[][]; imageBase64?: string } = {};

                if (imageBase64) {
                    body.imageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                } else {
                    body.strokes = strokes;
                }

                const res = await fetch(`${apiUrl}/ai/math-ocr`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return {
                    isEquation: Boolean(data.isEquation),
                    latex: data.latex || '',
                    confidence: data.confidence || 0,
                };
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
     * segmentImage
     * ------------
     * Segmentació completa d'una imatge en text i múltiples regions matemàtiques.
     */
    const segmentImage = useCallback(
        async (imageBase64: string): Promise<MathRegion[] | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/math-segment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        imageBase64: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data.regions || [];
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * fixMathText
   * -----------
   * Converteix text casual (x^2) a format KaTeX ($x^2$).
   */
    const fixMathText = useCallback(
        async (text: string): Promise<{ improved: string; equationsFound: number } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/math-fix`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ text }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return {
                    improved: data.improved || text,
                    equationsFound: data.equationsFound || 0,
                };
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * tableToChart
   * ------------
   * Converteix una taula Markdown/CSV a dades de Chart.js.
   */
    const tableToChart = useCallback(
        async (tableMarkdown: string): Promise<{
            chartType: "bar" | "line" | "pie" | "scatter";
            chartData: any;
            reasoning: string;
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/table-to-chart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ tableMarkdown }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * chartToTable
   * ------------
   * Extreu dades numèriques d'una imatge de gràfic (Bar, Line, etc).
   */
    const chartToTable = useCallback(
        async (imageBase64: string): Promise<{
            chartType: string;
            tableMarkdown: string;
            data: { label: string; value: number }[];
            confidence: number;
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/chart-to-table`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        imageBase64: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * vectorize
   * ---------
   * Converteix un traç (array de punts) a una figura geomètrica perfecta (SVG).
   */
    const vectorize = useCallback(
        async (
            points: { x: number; y: number }[],
            canvasWidth: number,
            canvasHeight: number
        ): Promise<{
            shape: "circle" | "triangle" | "rectangle" | "line" | "arrow" | "unknown";
            svgElement: string;
            properties: any;
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/vectorize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ points, canvasWidth, canvasHeight }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * interpretDiagram
   * ----------------
   * Analitza traços per detectar gràfics (barX, lineY) o circuits.
   */
    const interpretDiagram = useCallback(
        async (
            strokes: any[],
            canvasWidth: number,
            canvasHeight: number,
            context?: string
        ): Promise<{
            diagramType: "bar" | "line" | "circuit" | "vector" | "unknown";
            chartConfig?: any;
            description?: string;
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/interpret-diagram`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ strokes, context, canvasWidth, canvasHeight }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * calibrate
   * ---------
   * Analitza mostres d'escriptura per trobar patrons de normalització.
   */
    const calibrate = useCallback(
        async (
            sampleStrokes: any[],
            canvasWidth: number,
            canvasHeight: number
        ): Promise<{
            avgCharHeight: number;
            avgCharWidth: number;
            slantAngle: number;
            suggestedFontSize: number;
            normalizationMatrix: any;
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/calibrate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ sampleStrokes, canvasWidth, canvasHeight }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    /**
   * tableAssist
   * -----------
   * Genera taules Markdown intel·ligents (buides o amb rangs).
   */
    const tableAssist = useCallback(
        async (
            instruction: string,
            rangeStart?: number,
            rangeEnd?: number,
            step?: number,
            axes?: { x: string; y: string }
        ): Promise<{
            tableMarkdown: string;
            rows: number;
            cols: number;
            headers: string[];
        } | null> => {
            setIsProcessing(true);
            setError(null);
            try {
                const token = localStorage.getItem('beta3m_token');
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await fetch(`${apiUrl}/ai/table-assist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ instruction, rangeStart, rangeEnd, step, axes }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

                return data;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        []
    );

    return {
        recognize,
        segmentImage,
        fixMathText,
        tableToChart,
        chartToTable,
        vectorize,
        interpretDiagram,
        calibrate,
        tableAssist,
        isProcessing,
        error
    };
};
