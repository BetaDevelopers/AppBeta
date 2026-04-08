/**
 * Beta Shape Recognition Engine
 */

export interface Point {
    x: number;
    y: number;
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle' | 'line';

export interface DetectedShape {
    type: ShapeType;
    bounds: { x: number; y: number; width: number; height: number };
    confidence: number;
}

export const detectShape = (points: Point[]): DetectedShape | null => {
    if (points.length < 10) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;

    const start = points[0];
    const end = points[points.length - 1];
    const distStartEnd = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    // Circularity check
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    const radius = (width + height) / 4;

    let totalError = 0;
    points.forEach(p => {
        const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
        totalError += Math.abs(dist - radius);
    });

    const circularity = totalError / points.length / radius;

    if (circularity < 0.2 && distStartEnd < 50) {
        return { type: 'circle', bounds: { x: minX, y: minY, width, height }, confidence: 1 - circularity };
    }

    if (distStartEnd < 100) {
        return { type: 'rectangle', bounds: { x: minX, y: minY, width, height }, confidence: 0.8 };
    }

    return { type: 'line', bounds: { x: minX, y: minY, width, height }, confidence: 0.5 };
};
