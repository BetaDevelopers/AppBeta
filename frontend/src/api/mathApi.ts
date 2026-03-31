import { apiClient } from './client';

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
    }>('/ai/ocr', { imageBase64 });
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
