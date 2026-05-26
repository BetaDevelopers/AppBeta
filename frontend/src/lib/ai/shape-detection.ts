export interface Point { x: number; y: number; }

export type DetectedShape =
  | { type: 'circle';    cx: number; cy: number; r: number }
  | { type: 'rectangle'; x: number; y: number; w: number; h: number }
  | { type: 'triangle';  p1: Point; p2: Point; p3: Point }
  | { type: 'line';      x1: number; y1: number; x2: number; y2: number }
  | { type: 'unknown' }

// ── Subsample to max N points for efficiency ─────────────────────────────────

function subsample(pts: Point[], maxPts = 150): Point[] {
  if (pts.length <= maxPts) return pts;
  const step = Math.floor(pts.length / maxPts);
  const out = pts.filter((_, i) => i % step === 0);
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// ── Circle detector ───────────────────────────────────────────────────────────

function detectCircle(pts: Point[]): { cx: number; cy: number; r: number; score: number } | null {
  // Centroid
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  // Mean radius
  const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
  const rMean = radii.reduce((s, r) => s + r, 0) / radii.length;
  if (rMean < 10) return null;

  // Low std dev → points cluster around a circle
  const variance = radii.reduce((s, r) => s + (r - rMean) ** 2, 0) / radii.length;
  const stdDev = Math.sqrt(variance);
  const score = 1 - stdDev / rMean;

  // Stroke must be closed (end near start)
  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  if (closeDist > rMean * 0.65) return null;

  return score > 0.85 ? { cx, cy, r: rMean, score } : null;
}

// ── Rectangle detector ───────────────────────────────────────────────────────

function detectRectangle(pts: Point[]): { x: number; y: number; w: number; h: number; score: number } | null {
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const w = maxX - minX, h = maxY - minY;
  if (w < 10 || h < 10) return null;

  // Aspect ratio guard — nothing more than 8:1
  const aspect = Math.max(w, h) / Math.min(w, h);
  if (aspect > 8) return null;

  // Average distance from each point to its nearest bounding-box edge
  const distToRect = (p: Point) => Math.min(
    Math.abs(p.x - minX),
    Math.abs(p.x - maxX),
    Math.abs(p.y - minY),
    Math.abs(p.y - maxY),
  );
  const avgDist = pts.reduce((s, p) => s + distToRect(p), 0) / pts.length;
  const diagonal = Math.hypot(w, h);
  const score = 1 - avgDist / (diagonal * 0.15);

  // Stroke must be closed
  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  if (closeDist > diagonal * 0.22) return null;

  return score > 0.78 ? { x: minX, y: minY, w, h, score } : null;
}

// ── Line detector (perpendicular distance — handles vertical lines) ───────────

function detectLine(pts: Point[]): { x1: number; y1: number; x2: number; y2: number; score: number } | null {
  const start = pts[0], end = pts[pts.length - 1];
  const len = Math.hypot(end.x - start.x, end.y - start.y);
  if (len < 30) return null;

  // Perpendicular distance from each point to the start→end segment
  const A = end.y - start.y;
  const B = start.x - end.x;
  const C = A * start.x + B * start.y;
  const norm = Math.hypot(A, B);
  if (norm < 0.001) return null;

  const avgDist = pts.reduce((s, p) => s + Math.abs(A * p.x + B * p.y - C) / norm, 0) / pts.length;
  const score = 1 - avgDist / (len * 0.15);

  return score > 0.88 ? { x1: start.x, y1: start.y, x2: end.x, y2: end.y, score } : null;
}

// ── Triangle detector ────────────────────────────────────────────────────────

function detectTriangle(pts: Point[]): { p1: Point; p2: Point; p3: Point; score: number } | null {
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const w = maxX - minX, h = maxY - minY;

  // Stroke must be closed
  const diagonal = Math.hypot(w, h);
  const closeDist = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  if (closeDist > diagonal * 0.25) return null;

  // Find inflection points (sharp direction changes)
  const corners: Point[] = [];
  const win = Math.max(3, Math.floor(pts.length / 30));
  for (let i = win; i < pts.length - win; i++) {
    const dx1 = pts[i].x - pts[i - win].x;
    const dy1 = pts[i].y - pts[i - win].y;
    const dx2 = pts[i + win].x - pts[i].x;
    const dy2 = pts[i + win].y - pts[i].y;
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
    const mag = (Math.hypot(dx1, dy1) * Math.hypot(dx2, dy2)) + 0.001;
    const sinAngle = cross / mag;
    if (sinAngle > 0.42) corners.push(pts[i]);
  }

  // Cluster corners (nearby corners → single corner)
  const clustered: Point[] = [];
  const minSep = diagonal * 0.12;
  for (const c of corners) {
    if (!clustered.some(cc => Math.hypot(cc.x - c.x, cc.y - c.y) < minSep)) {
      clustered.push(c);
    }
  }

  if (clustered.length < 1 || clustered.length > 4) return null;

  // Use start, a middle corner, and end as the three vertices
  const p1 = pts[0];
  const p3 = pts[pts.length - 1];
  const p2 = clustered[Math.floor(clustered.length / 2)];

  // Validate triangle area (not degenerate)
  const area = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  if (area < w * h * 0.08) return null;

  return { p1, p2, p3, score: 0.75 };
}

// ── Main export ───────────────────────────────────────────────────────────────

function isTooComplex(pts: Point[]): boolean {
  // Count sharp direction changes — too many = scribble, not a shape
  let dirChanges = 0;
  const win = Math.max(2, Math.floor(pts.length / 20));
  for (let i = win; i < pts.length - win; i++) {
    const dx1 = pts[i].x - pts[i - win].x;
    const dy1 = pts[i].y - pts[i - win].y;
    const dx2 = pts[i + win].x - pts[i].x;
    const dy2 = pts[i + win].y - pts[i].y;
    const dot = dx1 * dx2 + dy1 * dy2;
    const mag = (Math.hypot(dx1, dy1) * Math.hypot(dx2, dy2)) + 0.001;
    if (dot / mag < -0.3) dirChanges++; // angle > ~107°
  }
  // Scribbles have many direction reversals relative to point count
  return dirChanges > pts.length * 0.12;
}

export function detectShape(points: Point[]): DetectedShape {
  if (points.length < 12) return { type: 'unknown' };

  const pts = subsample(points, 150);

  // Reject complex strokes (scribbles, signatures, freehand text)
  if (isTooComplex(pts)) return { type: 'unknown' };

  // Priority: circle > line > rectangle > triangle
  const circle = detectCircle(pts);
  if (circle) return { type: 'circle', cx: circle.cx, cy: circle.cy, r: circle.r };

  const line = detectLine(pts);
  if (line) return { type: 'line', x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 };

  const rect = detectRectangle(pts);
  if (rect) return { type: 'rectangle', x: rect.x, y: rect.y, w: rect.w, h: rect.h };

  const tri = detectTriangle(pts);
  if (tri) return { type: 'triangle', p1: tri.p1, p2: tri.p2, p3: tri.p3 };

  return { type: 'unknown' };
}
