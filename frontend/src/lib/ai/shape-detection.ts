export interface Point { x: number; y: number; }

export type DetectedShape =
  | { type: 'circle';    cx: number; cy: number; r: number }
  | { type: 'rectangle'; x: number; y: number; w: number; h: number }
  | { type: 'triangle';  p1: Point; p2: Point; p3: Point }
  | { type: 'line';      x1: number; y1: number; x2: number; y2: number }
  | { type: 'unknown' }

function simplify(pts: Point[], step = 4): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function angleDeg(a: Point, b: Point, c: Point): number {
  const ax = a.x - b.x, ay = a.y - b.y;
  const cx2 = c.x - b.x, cy2 = c.y - b.y;
  const dot = ax * cx2 + ay * cy2;
  const mag = Math.hypot(ax, ay) * Math.hypot(cx2, cy2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function findCorners(pts: Point[], threshold = 42): Point[] {
  const result: Point[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (angleDeg(pts[i - 1], pts[i], pts[i + 1]) < (180 - threshold)) {
      result.push(pts[i]);
    }
  }
  return result;
}

export function detectShape(points: Point[]): DetectedShape {
  if (points.length < 8) return { type: 'unknown' };

  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const cx = minX + w / 2, cy = minY + h / 2;

  const start = points[0], end = points[points.length - 1];
  const diagonal = Math.hypot(w, h);
<<<<<<< HEAD
  const isClosed = diagonal > 20 && Math.hypot(end.x - start.x, end.y - start.y) < diagonal * 0.4;
=======
  const isClosed = diagonal > 20 && Math.hypot(end.x - start.x, end.y - start.y) < diagonal * 0.3;
>>>>>>> parent of 7d49d8a0 (push 2)

  // ── Circle ────────────────────────────────────────────────────────────────
  const r = (w + h) / 4;
  const cirError = points.reduce((acc, p) => acc + Math.abs(Math.hypot(p.x - cx, p.y - cy) - r), 0);
<<<<<<< HEAD
  if (isClosed && cirError / points.length / (r || 1) < 0.35 && w > 20 && h > 20) {
=======
  if (isClosed && cirError / points.length / (r || 1) < 0.25 && w > 20 && h > 20) {
>>>>>>> parent of 7d49d8a0 (push 2)
    return { type: 'circle', cx, cy, r };
  }

  // ── Corner-based ──────────────────────────────────────────────────────────
  const simp = simplify(points);
  const corners = findCorners(simp);

  if (isClosed) {
    // Triangle: 2–3 corners (the start point acts as the 3rd corner)
    if (corners.length >= 2 && corners.length <= 3) {
      return { type: 'triangle', p1: simp[0], p2: corners[0], p3: corners[corners.length - 1] };
    }
    // Rectangle / polygon: 3–5 corners
    if (corners.length >= 3 && corners.length <= 5) {
      return { type: 'rectangle', x: minX, y: minY, w, h };
    }
  }

  // ── Straight line ─────────────────────────────────────────────────────────
  if (!isClosed && diagonal > 30) {
    const A = end.y - start.y, B = start.x - end.x;
    const C = A * start.x + B * start.y;
    const norm = Math.hypot(A, B);
    if (norm > 0) {
      const maxDev = points.reduce((acc, p) => Math.max(acc, Math.abs(A * p.x + B * p.y - C) / norm), 0);
      if (maxDev < diagonal * 0.12) {
        return { type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y };
      }
    }
  }

  return { type: 'unknown' };
}
