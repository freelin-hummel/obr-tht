/**
 * Paint tool — registers the "Terrain Paint" tool in the OBR toolbar and
 * handles cell painting/erasing plus freeform region painting. GMs only.
 *
 * Modes (exposed as tool modes):
 *   - paint        : click / drag paints the currently selected terrain id (cell-based)
 *   - erase        : click / drag removes terrain (cell-based)
 *   - fill         : flood-fill contiguous cells of the same terrain id
 *   - region       : drag to trace a freeform polygon and store it as a region
 *   - region-erase : click inside a region to delete it
 *
 * The freeform modes are the only painting mechanism on GRIDLESS maps, but
 * are also available on grid maps for irregular shapes (e.g. rooms whose
 * walls don't align to cells).
 */

import { type ToolContext, type ToolEvent } from "@owlbear-rodeo/sdk";
import { TOOL_ID } from "../constants";
import { cellKey, cellNeighbours, worldToCell } from "../geometry/grid";
import { simplify, pointInPolygon } from "../geometry/freeform";
import { createTool, createToolMode } from "../obr";
import { readScene, writeScene } from "../state/sceneMeta";
import { readGrid } from "../state/gridInfo";
import { readPrefs, writePrefs } from "../state/userPrefs";
import type { SceneTerrainData, Vec2 } from "../types";

/** Pixel tolerance used by RDP simplification of drag-traced polylines. */
const FREEFORM_SIMPLIFY_TOLERANCE = 4;
/** Minimum number of vertices a region must have after simplification. */
const FREEFORM_MIN_VERTICES = 3;

async function applyAtPoint(
  point: Vec2,
  mode: "paint" | "erase",
  terrainId: string | undefined,
): Promise<void> {
  if (mode === "paint" && !terrainId) return;
  const grid = await readGrid();
  if (grid.type === "GRIDLESS") return; // gridless uses freeform regions
  const { q, r } = worldToCell(point, grid);
  const key = cellKey(q, r);
  const data = await readScene();
  const next = { ...data, cells: { ...data.cells } };
  if (mode === "paint") next.cells[key] = terrainId!;
  else delete next.cells[key];
  await writeScene(next);
}

async function floodFill(point: Vec2, terrainId: string): Promise<void> {
  const grid = await readGrid();
  if (grid.type === "GRIDLESS") return;
  const data = await readScene();
  const start = worldToCell(point, grid);
  const startKey = cellKey(start.q, start.r);
  const original = data.cells[startKey] ?? null;
  if (original === terrainId) return;

  const visited = new Set<string>();
  const queue: Array<{ q: number; r: number }> = [start];
  const next = { ...data, cells: { ...data.cells } };
  const MAX = 50_000; // runaway guard
  let count = 0;
  while (queue.length > 0 && count < MAX) {
    const c = queue.shift()!;
    const k = cellKey(c.q, c.r);
    if (visited.has(k)) continue;
    visited.add(k);
    const here = next.cells[k] ?? null;
    if (here !== original) continue;
    next.cells[k] = terrainId;
    count++;
    for (const n of cellNeighbours(c.q, c.r, grid.type)) queue.push(n);
  }
  await writeScene(next);
}

async function commitRegion(points: Vec2[], terrainId: string): Promise<void> {
  const simplified = simplify(points, FREEFORM_SIMPLIFY_TOLERANCE);
  if (simplified.length < FREEFORM_MIN_VERTICES) return;
  const data = await readScene();
  const next: SceneTerrainData = {
    ...data,
    regions: [
      ...(data.regions ?? []),
      {
        id: crypto.randomUUID?.() ?? `r_${Math.random().toString(36).slice(2, 10)}`,
        terrainId,
        points: simplified,
      },
    ],
  };
  await writeScene(next);
}

async function eraseRegionAt(point: Vec2): Promise<boolean> {
  const data = await readScene();
  const regions = data.regions ?? [];
  // Iterate in reverse so the most-recently-painted region wins overlap ties.
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i]!;
    if (pointInPolygon(point, r.points)) {
      const next: SceneTerrainData = {
        ...data,
        regions: regions.filter((_, j) => j !== i),
      };
      await writeScene(next);
      return true;
    }
  }
  return false;
}

async function currentTerrain(context?: ToolContext): Promise<string | undefined> {
  const fromContext = (context?.metadata?.["terrainId"] as string | undefined) ?? undefined;
  if (fromContext) return fromContext;
  const prefs = await readPrefs();
  return prefs.lastTerrainId;
}

/** Selected terrain id is broadcast via player metadata so the tool popover UI can keep it in sync. */
async function rememberTerrain(id: string): Promise<void> {
  await writePrefs({ lastTerrainId: id });
}

/** In-flight freeform stroke. Module-scoped because OBR drag callbacks are stateless. */
const activeStrokes = new Map<string, Vec2[]>();

export function registerPaintTool(): void {
  void createTool({
    id: TOOL_ID.paint,
    icons: [
      {
        icon: "/logo.svg",
        label: "Terrain paint",
        filter: { roles: ["GM"] },
      },
    ],
    shortcut: "T",
    defaultMode: `${TOOL_ID.paint}/paint`,
  });

  const modeLabel = (m: string) =>
    m === "paint"
      ? "Paint"
      : m === "erase"
        ? "Erase"
        : m === "fill"
          ? "Fill"
          : m === "region"
            ? "Freeform region"
            : "Erase region";

  for (const mode of ["paint", "erase", "fill", "region", "region-erase"] as const) {
    const id = `${TOOL_ID.paint}/${mode}`;
    void createToolMode({
      id,
      icons: [
        {
          icon: "/logo.svg",
          label: modeLabel(mode),
          filter: { activeTools: [TOOL_ID.paint] },
        },
      ],
      async onToolClick(_context: ToolContext, event: ToolEvent) {
        const terrainId = await currentTerrain();
        if (mode === "fill") {
          if (terrainId) await floodFill(event.pointerPosition, terrainId);
        } else if (mode === "region-erase") {
          await eraseRegionAt(event.pointerPosition);
        } else if (mode === "paint" || mode === "erase") {
          await applyAtPoint(event.pointerPosition, mode, terrainId);
        }
      },
      async onToolDragStart(_context: ToolContext, event: ToolEvent) {
        if (mode === "region") {
          activeStrokes.set(id, [event.pointerPosition]);
        }
      },
      async onToolDragMove(_context: ToolContext, event: ToolEvent) {
        if (mode === "region") {
          const stroke = activeStrokes.get(id);
          if (stroke) stroke.push(event.pointerPosition);
          return;
        }
        if (mode === "fill" || mode === "region-erase") return;
        const terrainId = await currentTerrain();
        await applyAtPoint(event.pointerPosition, mode, terrainId);
      },
      async onToolDragEnd(_context: ToolContext, event: ToolEvent) {
        if (mode !== "region") return;
        const stroke = activeStrokes.get(id);
        activeStrokes.delete(id);
        if (!stroke) return;
        stroke.push(event.pointerPosition);
        const terrainId = await currentTerrain();
        if (terrainId) await commitRegion(stroke, terrainId);
      },
      async onToolDragCancel() {
        if (mode === "region") activeStrokes.delete(id);
      },
    });
  }
}

export const __paintInternal = {
  rememberTerrain,
  applyAtPoint,
  floodFill,
  commitRegion,
  eraseRegionAt,
};
