/**
 * 3D line-of-sight math.
 *
 * Each terrain region is a vertical prism: a 2D polygon (outer ring + holes)
 * extruded between `zBottom` and `zTop`. A LoS ray is a 3D line segment with
 * height that varies linearly between its two endpoints.
 *
 * Output: list of coloured segments describing how the ray interacts with
 * each terrain region in order along the ray's t parameter (0..1).
 *
 * Segment states mirror the Foundry module:
 *  - "clear"    — no terrain touched → solid white.
 *  - "grazing"  — ray touches prism top/bottom/edge within `EPS` → solid colour.
 *  - "intersect" — ray strictly enters the prism interior → dashed colour.
 *
 * Adjacent overlapping terrains pick the highest-priority state:
 *   intersect > grazing > clear.
 */

import type { Vec2 } from "../types";

export interface Prism {
  terrainId: string;
  /** Outer ring + any holes. World units (pixels). */
  rings: Vec2[][];
  /** Bottom elevation in world units. */
  zBottom: number;
  /** Top elevation in world units. */
  zTop: number;
}

export interface LosSegment {
  /** Start t-parameter along the ray (0..1). */
  t0: number;
  t1: number;
  state: "clear" | "grazing" | "intersect";
  terrainId?: string;
}

const EPS = 1e-6;

/** Sign/winding helper — positive if the ring is counter-clockwise. */
function ringArea(ring: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Point-in-polygon (with holes) using even-odd fill rule. */
export function pointInRegion(p: Vec2, rings: Vec2[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!;
      const b = ring[j]!;
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 1e-12) + a.x
      ) {
        c = !c;
      }
    }
    if (c) inside = !inside;
  }
  return inside;
}

/** All t-parameters where the 2D ray crosses an edge of any ring. */
function rayRingIntersections(a: Vec2, b: Vec2, rings: Vec2[][]): number[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ts: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!;
      const q = ring[(i + 1) % ring.length]!;
      const ex = q.x - p.x;
      const ey = q.y - p.y;
      const denom = dx * ey - dy * ex;
      if (Math.abs(denom) < EPS) continue; // parallel
      const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / denom;
      const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / denom;
      if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
        ts.push(Math.max(0, Math.min(1, t)));
      }
    }
  }
  return ts;
}

interface Ray3 {
  a: Vec2;
  b: Vec2;
  zA: number;
  zB: number;
}

/**
 * Given a 3D ray and a set of prisms, compute ordered LoS segments.
 */
export function computeLos(ray: Ray3, prisms: Prism[]): LosSegment[] {
  // Collect breakpoints per prism: in/out intervals where the ray is within
  // the 2D polygon AND within the z-range.
  interface Interval {
    t0: number;
    t1: number;
    terrainId: string;
    state: "grazing" | "intersect";
  }
  const intervals: Interval[] = [];

  for (const prism of prisms) {
    // 2D intersection intervals with the ring (even-odd winding).
    const crosses = rayRingIntersections(ray.a, ray.b, prism.rings).sort(
      (a, b) => a - b,
    );
    // Add ray start/end and test midpoints to determine inside/outside.
    const breaks = [0, ...crosses, 1];
    const insides: Array<[number, number]> = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      const t0 = breaks[i]!;
      const t1 = breaks[i + 1]!;
      if (t1 - t0 < EPS) continue;
      const tm = (t0 + t1) / 2;
      const mid = {
        x: ray.a.x + tm * (ray.b.x - ray.a.x),
        y: ray.a.y + tm * (ray.b.y - ray.a.y),
      };
      if (pointInRegion(mid, prism.rings)) insides.push([t0, t1]);
    }
    if (insides.length === 0) continue;

    // Now clip each 2D-inside interval against the z-range of the prism.
    for (const [t0, t1] of insides) {
      const zAt = (t: number) => ray.zA + t * (ray.zB - ray.zA);
      const zMin = prism.zBottom;
      const zMax = prism.zTop;
      // Find sub-intervals where z is in [zMin, zMax].
      const zt0 = zAt(t0);
      const zt1 = zAt(t1);
      const dz = zt1 - zt0;

      let cs: Array<[number, number]>;
      if (Math.abs(dz) < EPS) {
        // Flat z — either wholly inside, on boundary, or outside.
        if (zt0 < zMin - EPS || zt0 > zMax + EPS) continue;
        const grazing =
          Math.abs(zt0 - zMin) < EPS || Math.abs(zt0 - zMax) < EPS;
        intervals.push({ t0, t1, terrainId: prism.terrainId, state: grazing ? "grazing" : "intersect" });
        continue;
      } else {
        const tEnterZ = (zMin - zt0) / dz;
        const tExitZ = (zMax - zt0) / dz;
        const lo = Math.min(tEnterZ, tExitZ);
        const hi = Math.max(tEnterZ, tExitZ);
        const a = Math.max(0, lo);
        const b = Math.min(1, hi);
        if (b - a <= EPS) continue;
        // Map back to the full [t0, t1] range.
        const s0 = t0 + a * (t1 - t0);
        const s1 = t0 + b * (t1 - t0);
        cs = [[s0, s1]];
      }

      for (const [s0, s1] of cs) {
        // Grazing test: endpoints touch the top or bottom exactly.
        const zS0 = zAt(s0);
        const zS1 = zAt(s1);
        const touchesTop =
          Math.abs(zS0 - zMax) < EPS || Math.abs(zS1 - zMax) < EPS;
        const touchesBot =
          Math.abs(zS0 - zMin) < EPS || Math.abs(zS1 - zMin) < EPS;
        // "Intersect" when the ray spends non-zero length with z strictly
        // between zMin and zMax. We approximate by checking the midpoint.
        const mid = (zS0 + zS1) / 2;
        const strictlyInside = mid > zMin + EPS && mid < zMax - EPS;
        intervals.push({
          t0: s0,
          t1: s1,
          terrainId: prism.terrainId,
          state: strictlyInside ? "intersect" : (touchesTop || touchesBot ? "grazing" : "intersect"),
        });
      }
    }
  }

  // Merge into ordered coloured segments. Sort intervals by start.
  intervals.sort((a, b) => a.t0 - b.t0);
  const events: Array<{ t: number; kind: "open" | "close"; i: number }> = [];
  intervals.forEach((iv, i) => {
    events.push({ t: iv.t0, kind: "open", i });
    events.push({ t: iv.t1, kind: "close", i });
  });
  events.sort((a, b) =>
    a.t !== b.t ? a.t - b.t : a.kind === "open" ? -1 : 1,
  );

  const active = new Set<number>();
  const out: LosSegment[] = [];
  let cursor = 0;
  const pushSeg = (t0: number, t1: number) => {
    if (t1 - t0 <= EPS) return;
    if (active.size === 0) {
      out.push({ t0, t1, state: "clear" });
      return;
    }
    // Pick worst-case state + matching terrain id.
    let state: "grazing" | "intersect" = "grazing";
    let terrainId: string | undefined;
    for (const i of active) {
      const iv = intervals[i]!;
      if (iv.state === "intersect") {
        state = "intersect";
        terrainId = iv.terrainId;
        break;
      }
      terrainId = iv.terrainId;
    }
    out.push({ t0, t1, state, terrainId });
  };

  for (const ev of events) {
    if (ev.t > cursor) {
      pushSeg(cursor, ev.t);
      cursor = ev.t;
    }
    if (ev.kind === "open") active.add(ev.i);
    else active.delete(ev.i);
  }
  if (cursor < 1) pushSeg(cursor, 1);

  // Merge adjacent segments with the same state/terrain.
  const merged: LosSegment[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.state === s.state &&
      last.terrainId === s.terrainId &&
      Math.abs(last.t1 - s.t0) < EPS
    ) {
      last.t1 = s.t1;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

// Exposed for test inspection.
export const __internals = { ringArea };
