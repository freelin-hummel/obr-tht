/**
 * Paint tool — registers the "Terrain Paint" tool in the OBR toolbar and
 * handles cell painting/erasing. GMs only (other players can't write scene
 * metadata the way we need).
 *
 * Modes (exposed as tool modes):
 *   - paint  : click / drag paints the currently selected terrain id
 *   - erase  : click / drag removes terrain
 *   - fill   : flood-fill contiguous cells of the same terrain id
 */

import OBR, { type ToolContext, type ToolEvent } from "@owlbear-rodeo/sdk";
import { TOOL_ID } from "../constants";
import { cellKey, cellNeighbours, worldToCell } from "../geometry/grid";
import { readScene, writeScene } from "../state/sceneMeta";
import { readGrid } from "../state/gridInfo";
import { readPrefs, writePrefs } from "../state/userPrefs";

async function applyAtPoint(
  point: { x: number; y: number },
  mode: "paint" | "erase",
  terrainId: string | undefined,
): Promise<void> {
  if (mode === "paint" && !terrainId) return;
  const grid = await readGrid();
  if (grid.type === "GRIDLESS") return; // gridless uses freeform regions; see below
  const { q, r } = worldToCell(point, grid);
  const key = cellKey(q, r);
  const data = await readScene();
  const next = { ...data, cells: { ...data.cells } };
  if (mode === "paint") next.cells[key] = terrainId!;
  else delete next.cells[key];
  await writeScene(next);
}

async function floodFill(
  point: { x: number; y: number },
  terrainId: string,
): Promise<void> {
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

export function registerPaintTool(): void {
  OBR.tool.create({
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

  for (const mode of ["paint", "erase", "fill"] as const) {
    const id = `${TOOL_ID.paint}/${mode}`;
    OBR.tool.createMode({
      id,
      icons: [
        {
          icon: "/logo.svg",
          label: mode === "paint" ? "Paint" : mode === "erase" ? "Erase" : "Fill",
          filter: { activeTools: [TOOL_ID.paint] },
        },
      ],
      async onToolClick(_context: ToolContext, event: ToolEvent) {
        const terrainId = await currentTerrain();
        if (mode === "fill") {
          if (terrainId) await floodFill(event.pointerPosition, terrainId);
        } else {
          await applyAtPoint(event.pointerPosition, mode, terrainId);
        }
      },
      async onToolDragMove(_context: ToolContext, event: ToolEvent) {
        if (mode === "fill") return;
        const terrainId = await currentTerrain();
        await applyAtPoint(event.pointerPosition, mode, terrainId);
      },
    });
  }
}

export const __paintInternal = { rememberTerrain, applyAtPoint, floodFill };
