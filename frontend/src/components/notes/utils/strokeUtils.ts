export interface Point {
  x: number;
  y: number;
}

/**
 * Convert an array of points into a smooth SVG path using quadratic Bezier curves.
 * This implementation follows the specification from the user request.
 */
export function smoothPoints(points: Point[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  return path;
}
