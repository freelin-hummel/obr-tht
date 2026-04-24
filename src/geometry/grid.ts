/**
 * Grid geometry helpers.
 *
 * Supports all four Owlbear Rodeo grid types:
 *  - SQUARE              — axis-aligned square cells
 *  - HEX_VERTICAL        — pointy-top hex cells (rows stagger horizontally)
 *  - HEX_HORIZONTAL      — flat-top hex cells (columns stagger vertically)
 *  - ISOMETRIC           — rhombus cells, 2:1 aspect (the standard OBR iso grid)
 *  - GRIDLESS            — no cells; paint tools emit freeform polygons instead
 *
 * All `*Cell*` helpers take integer axial coordinates `(q, r)` and return
 * world coordinates in OBR pixels. The conventions:
 *  - SQUARE          (q, r) = (col, row); cell size = `dpi`.
 *  - HEX_VERTICAL    pointy-top hex; `(q, r)` are axial.
 *  - HEX_HORIZONTAL  flat-top hex; `(q, r)` are axial.
 *  - ISOMETRIC       rhombus with width = dpi, height = dpi / 2; `(q, r)` are
 *                    the axes along the two diamond edges.
 */

import type { GridInfo, Vec2 } from "../types";

/** Stringify a cell coordinate for map keys. */
export const cellKey = (q: number, r: number): string => `${q},${r}`;

/** Parse a cell key back to `{q, r}`. */
export function parseCellKey(k: string): { q: number; r: number } {
  const [q, r] = k.split(",").map((n) => Number.parseInt(n, 10));
  return { q: q ?? 0, r: r ?? 0 };
}

/** Convert a world point to its containing cell. Throws for GRIDLESS. */
export function worldToCell(p: Vec2, grid: GridInfo): { q: number; r: number } {
  const s = grid.dpi;
  switch (grid.type) {
    case "SQUARE":
      return { q: Math.floor(p.x / s), r: Math.floor(p.y / s) };
    case "HEX_VERTICAL":
      return pointyHexRound(p.x / s, p.y / s);
    case "HEX_HORIZONTAL":
      return flatHexRound(p.x / s, p.y / s);
    case "ISOMETRIC": {
      // With cellCenter(q,r) = ((q - r)*s/2 + s/2, (q + r)*s/4 + s/4), invert:
      //   q = x/s + 2y/s - 1
      //   r = 2y/s - x/s
      const u = p.x / s + (2 * p.y) / s - 1;
      const v = (2 * p.y) / s - p.x / s;
      return { q: Math.floor(u + 0.5), r: Math.floor(v + 0.5) };
    }
    case "GRIDLESS":
      throw new Error("worldToCell is not supported on gridless maps");
  }
}

/** Centre of a cell in world coordinates. */
export function cellCenter(q: number, r: number, grid: GridInfo): Vec2 {
  const s = grid.dpi;
  switch (grid.type) {
    case "SQUARE":
      return { x: (q + 0.5) * s, y: (r + 0.5) * s };
    case "HEX_VERTICAL": {
      // Pointy-top axial -> pixel. Cell "size" (centre-to-corner) = s / sqrt(3).
      const size = s / Math.sqrt(3);
      const x = size * Math.sqrt(3) * (q + r / 2);
      const y = size * 1.5 * r;
      return { x, y };
    }
    case "HEX_HORIZONTAL": {
      // Flat-top axial -> pixel.
      const size = s / Math.sqrt(3);
      const x = size * 1.5 * q;
      const y = size * Math.sqrt(3) * (r + q / 2);
      return { x, y };
    }
    case "ISOMETRIC":
      // Centre of the rhombus spanned by the q and r edges.
      return { x: (q - r) * (s / 2) + s / 2, y: ((q + r) * s) / 4 + s / 4 };
    case "GRIDLESS":
      return { x: 0, y: 0 };
  }
}

/** Polygon (closed ring) for a single cell, in world coordinates. */
export function cellPolygon(q: number, r: number, grid: GridInfo): Vec2[] {
  const s = grid.dpi;
  const c = cellCenter(q, r, grid);
  switch (grid.type) {
    case "SQUARE": {
      const x0 = q * s,
        y0 = r * s;
      return [
        { x: x0, y: y0 },
        { x: x0 + s, y: y0 },
        { x: x0 + s, y: y0 + s },
        { x: x0, y: y0 + s },
      ];
    }
    case "HEX_VERTICAL": {
      const size = s / Math.sqrt(3);
      const pts: Vec2[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30); // pointy-top
        pts.push({ x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) });
      }
      return pts;
    }
    case "HEX_HORIZONTAL": {
      const size = s / Math.sqrt(3);
      const pts: Vec2[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * 60 * i; // flat-top
        pts.push({ x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) });
      }
      return pts;
    }
    case "ISOMETRIC": {
      // Rhombus: top, right, bottom, left.
      const hx = s / 2;
      const hy = s / 4;
      return [
        { x: c.x, y: c.y - hy },
        { x: c.x + hx, y: c.y },
        { x: c.x, y: c.y + hy },
        { x: c.x - hx, y: c.y },
      ];
    }
    case "GRIDLESS":
      return [];
  }
}

/** Neighbours of a cell (used for edge-tracing / merging). */
export function cellNeighbours(q: number, r: number, grid: GridInfo["type"]): Array<{ q: number; r: number }> {
  switch (grid) {
    case "SQUARE":
    case "ISOMETRIC":
      return [
        { q: q + 1, r },
        { q: q - 1, r },
        { q, r: r + 1 },
        { q, r: r - 1 },
      ];
    case "HEX_VERTICAL":
      return [
        { q: q + 1, r },
        { q: q - 1, r },
        { q, r: r + 1 },
        { q, r: r - 1 },
        { q: q + 1, r: r - 1 },
        { q: q - 1, r: r + 1 },
      ];
    case "HEX_HORIZONTAL":
      return [
        { q: q + 1, r },
        { q: q - 1, r },
        { q, r: r + 1 },
        { q, r: r - 1 },
        { q: q + 1, r: r - 1 },
        { q: q - 1, r: r + 1 },
      ];
    case "GRIDLESS":
      return [];
  }
}

// --- hex rounding helpers --------------------------------------------------

function axialRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

function pointyHexRound(px: number, py: number): { q: number; r: number } {
  // `px`, `py` are already divided by s = dpi. Invert the pointy-top mapping.
  const size = 1 / Math.sqrt(3);
  const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / size;
  const r = ((2 / 3) * py) / size;
  return axialRound(q, r);
}

function flatHexRound(px: number, py: number): { q: number; r: number } {
  const size = 1 / Math.sqrt(3);
  const q = ((2 / 3) * px) / size;
  const r = (-(1 / 3) * px + (Math.sqrt(3) / 3) * py) / size;
  return axialRound(q, r);
}

/** Euclidean distance in world (pixel) units between two points. */
export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Convert grid units (e.g. feet) to world pixels using the grid info. */
export function gridUnitsToPixels(units: number, grid: GridInfo): number {
  return (units / grid.scale) * grid.dpi;
}

/** Convert world pixel distance to grid units. */
export function pixelsToGridUnits(pixels: number, grid: GridInfo): number {
  return (pixels / grid.dpi) * grid.scale;
}
