/**
 * Freeform polygon helpers — used by the freeform paint mode (drag-to-trace)
 * and by gridless region painting.
 */

import type { Vec2 } from "../types";

/** Squared distance helper. */
function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Ramer–Douglas–Peucker simplification.
 *
 * @param points     Polyline / polygon vertices (open, no duplicate closing point).
 * @param tolerance  Maximum perpendicular deviation in world units.
 */
export function simplify(points: Vec2[], tolerance: number): Vec2[] {
  if (points.length < 3) return points.slice();
  const tol2 = tolerance * tolerance;

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let maxI = -1;
    const pa = points[a]!;
    const pb = points[b]!;
    for (let i = a + 1; i < b; i++) {
      const d = perpDist2(points[i]!, pa, pb);
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxI !== -1 && maxD > tol2) {
      keep[maxI] = true;
      stack.push([a, maxI]);
      stack.push([maxI, b]);
    }
  }

  const out: Vec2[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]!);
  return out;
}

function perpDist2(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return dist2(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  const cx = a.x + tc * dx;
  const cy = a.y + tc * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

/** Even-odd point-in-polygon test (single ring). */
export function pointInPolygon(p: Vec2, ring: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 1e-12) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Polygon centroid (area-weighted). Falls back to vertex average for degenerate rings. */
export function centroid(ring: Vec2[]): Vec2 {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const p of ring) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / ring.length, y: sy / ring.length };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}
