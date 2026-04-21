import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * OCR general per a SmartCamera.
 * Envia { image, mime_type } amb un AbortSignal per al timeout de 30s.
 */
export async function ocrImage(
    imageBase64: string,
    signal?: AbortSignal
): Promise<{
    title: string;
    content_markdown: string;
    has_formulas: boolean;
    has_tables: boolean;
    language: string;
}> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${BASE_URL}/ai/ocr`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image: imageBase64, mime_type: 'image/jpeg' }),
        signal,
    });

    if (res.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Sessió expirada');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Error del servidor');
    }

    return res.json();
}

export function mathOCR(strokes: { x: number; y: number }[][], imageBase64?: string) {
    return apiClient.post<{ isEquation: boolean; latex: string; confidence: number }>(
        '/ai/math-ocr',
        { strokes, imageBase64 }
    );
}

export function mathOCRImage(imageBase64: string) {
    return apiClient.post<{
        title: string;
        content_markdown: string;
        has_formulas: boolean;
        has_tables: boolean;
        language: string;
    }>('/ai/ocr', { image: imageBase64, mime_type: 'image/jpeg' });
}

export function mathSolve(latex: string) {
    return apiClient.post<{ result: string; steps: string[]; explanation: string }>(
        '/ai/math-solve',
        { latex }
    );
}

export function mathFix(text: string) {
    return apiClient.post<{ fixedText?: string; latex?: string; content_markdown?: string }>(
        '/ai/math-fix',
        { text }
    );
}

export function tableToChart(tableMarkdown: string) {
    return apiClient.post<{ chartType: string; chartData: object; reasoning: string }>(
        '/ai/table-to-chart',
        { tableMarkdown }
    );
}

export function chartToTable(imageBase64: string) {
    const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    return apiClient.post<{
        tableMarkdown: string;
        data?: { label: string; value: number }[];
        chartType: string;
        confidence?: number;
    }>('/ai/chart-to-table', { imageBase64: b64 });
}

export function vectorizeShape(points: { x: number; y: number }[]) {
    return apiClient.post<{ shape: string; svgElement: string }>(
        '/ai/vectorize',
        { points, canvasWidth: 500, canvasHeight: 300 }
    );
}

export function interpretDiagram(strokes: object[]) {
    return apiClient.post<{ diagramType: string; description: string; chartConfig?: object }>(
        '/ai/interpret-diagram',
        { strokes, canvasWidth: 600, canvasHeight: 350 }
    );
}

export function calibrateHandwriting(sampleStrokes: object[]) {
    return apiClient.post<{
        avgCharWidth: number;
        avgCharHeight: number;
        slantAngle: number;
        suggestedFontSize: number;
        normalizationMatrix: { scaleX: number; rotation: number };
    }>('/ai/calibrate', { sampleStrokes, canvasWidth: 300, canvasHeight: 300 });
}
