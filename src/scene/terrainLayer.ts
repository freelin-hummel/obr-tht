/**
 * Render merged terrain regions as OBR local-scene items.
 *
 * Local items are chosen because:
 *  - They are the fastest to update (no scene-metadata round-trips).
 *  - They're view-only: every client derives them from the shared scene
 *    metadata, so there's no divergence risk.
 */

import OBR, { buildLabel, buildPath, Command, PathCommand } from "@owlbear-rodeo/sdk";
import { ITEM_TAG } from "../constants";
import type { GridInfo, TerrainType } from "../types";
import { mergeCells, type MergedRegion } from "../geometry/merge";
import { cellCenter, parseCellKey } from "../geometry/grid";

const TAG_META_KEY = "tag";

function ringToPathCommands(ring: { x: number; y: number }[]): PathCommand[] {
  if (ring.length === 0) return [];
  const cmds: PathCommand[] = [];
  cmds.push([Command.MOVE, ring[0]!.x, ring[0]!.y]);
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i]!;
    cmds.push([Command.LINE, p.x, p.y]);
  }
  cmds.push([Command.CLOSE]);
  return cmds;
}

function regionToPath(region: MergedRegion, palette: TerrainType[], layerVisible: boolean) {
  const terrain = palette.find((t) => t.id === region.terrainId);
  if (!terrain) return null;
  const cmds: PathCommand[] = [];
  for (const ring of region.rings) cmds.push(...ringToPathCommands(ring));
  const path = buildPath()
    .commands(cmds)
    .fillColor(terrain.color)
    .fillOpacity(layerVisible || terrain.alwaysVisible ? terrain.opacity : 0)
    .strokeColor(terrain.lineColor ?? terrain.color)
    .strokeOpacity(layerVisible || terrain.alwaysVisible ? terrain.lineOpacity : 0)
    .strokeWidth(4)
    .strokeDash(terrain.lineStyle === "dashed" ? [12, 8] : [])
    .layer("DRAWING")
    .disableHit(true)
    .locked(true)
    .metadata({ [TAG_META_KEY]: ITEM_TAG.terrain })
    .build();
  return path;
}

/**
 * Rebuild the local-layer items for the current terrain state.
 *
 * @param cells         Painted cells map.
 * @param grid          Current grid info.
 * @param palette       Room terrain palette.
 * @param layerVisible  Whether the layer is enabled for this user.
 * @param unitsLabel    Units suffix to append to height labels.
 */
export async function renderTerrainLayer(
  cells: Record<string, string>,
  grid: GridInfo,
  palette: TerrainType[],
  layerVisible: boolean,
  unitsLabel: string,
): Promise<void> {
  const regions = mergeCells(cells, grid);

  const paths = regions
    .map((r) => regionToPath(r, palette, layerVisible))
    .filter((p): p is NonNullable<ReturnType<typeof regionToPath>> => p !== null);

  const labels = Object.entries(cells).flatMap(([key, terrainId]) => {
    const terrain = palette.find((t) => t.id === terrainId);
    if (!terrain) return [];
    if (!(layerVisible || terrain.alwaysVisible)) return [];
    if (terrain.height === 0 && !terrain.label) return [];
    const { q, r } = parseCellKey(key);
    const c = cellCenter(q, r, grid);
    const text = terrain.label ?? `${terrain.height}${unitsLabel ? unitsLabel : ""}`;
    return [
      buildLabel()
        .position(c)
        .plainText(text)
        .fillColor("#ffffff")
        .backgroundColor("#00000088")
        .backgroundOpacity(0.5)
        .pointerHeight(0)
        .disableHit(true)
        .locked(true)
        .metadata({ [TAG_META_KEY]: ITEM_TAG.label })
        .build(),
    ];
  });

  // Replace existing items tagged as terrain / label.
  const existing = await OBR.scene.local.getItems(
    (item) =>
      item.metadata?.[TAG_META_KEY] === ITEM_TAG.terrain ||
      item.metadata?.[TAG_META_KEY] === ITEM_TAG.label,
  );
  if (existing.length > 0) {
    await OBR.scene.local.deleteItems(existing.map((i) => i.id));
  }
  if (paths.length > 0 || labels.length > 0) {
    await OBR.scene.local.addItems([...paths, ...labels]);
  }
}

/** Remove every item rendered by this extension. */
export async function clearTerrainLayer(): Promise<void> {
  const existing = await OBR.scene.local.getItems(
    (item) =>
      item.metadata?.[TAG_META_KEY] === ITEM_TAG.terrain ||
      item.metadata?.[TAG_META_KEY] === ITEM_TAG.label,
  );
  if (existing.length > 0) await OBR.scene.local.deleteItems(existing.map((i) => i.id));
}
