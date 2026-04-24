/**
 * Merge sets of same-terrain cells into joined outline polygons.
 *
 * We use `polygon-clipping` to union the per-cell polygons. For large cell
 * sets this is not the fastest possible approach (edge-tracing would be
 * O(n)), but it is robust for all five OBR grid types without per-type
 * specialisation and keeps the code surface small.
 */

import polygonClipping from "polygon-clipping";
import type { Vec2 } from "../types";
import type { GridInfo } from "../types";
import { cellPolygon, parseCellKey } from "./grid";

/** A merged region: an outer ring plus any number of hole rings. */
export interface MergedRegion {
  terrainId: string;
  rings: Vec2[][]; // [outer, ...holes]
}

/**
 * Merge all cells that share a terrain id into their joined outlines.
 *
 * @param cells - Map of cellKey ("q,r") → terrainId.
 * @param grid  - Grid information for converting cells to polygons.
 */
export function mergeCells(
  cells: Record<string, string>,
  grid: GridInfo,
): MergedRegion[] {
  if (grid.type === "GRIDLESS") return [];

  // Bucket cell keys by terrain.
  const byTerrain = new Map<string, string[]>();
  for (const [key, terrainId] of Object.entries(cells)) {
    const arr = byTerrain.get(terrainId);
    if (arr) arr.push(key);
    else byTerrain.set(terrainId, [key]);
  }

  const out: MergedRegion[] = [];
  for (const [terrainId, keys] of byTerrain) {
    // Build a MultiPolygon input where each cell is its own polygon.
    const multi: [number, number][][][] = [];
    for (const k of keys) {
      const { q, r } = parseCellKey(k);
      const poly = cellPolygon(q, r, grid);
      if (poly.length < 3) continue;
      const ring: [number, number][] = poly.map((p) => [p.x, p.y]);
      // Close the ring — polygon-clipping is tolerant either way, but be explicit.
      ring.push(ring[0]!);
      multi.push([ring]);
    }
    if (multi.length === 0) continue;

    const unioned = polygonClipping.union(multi as never);
    for (const poly of unioned) {
      const rings: Vec2[][] = poly.map((ring) =>
        ring.slice(0, ring.length - 1).map(([x, y]) => ({ x, y })),
      );
      out.push({ terrainId, rings });
    }
  }
  return out;
}
