/**
 * Scene-level state: which cells are painted with which terrain (+ freeform
 * regions for gridless maps). Persisted in scene metadata so that every
 * connected client sees the same terrain.
 */

import OBR from "@owlbear-rodeo/sdk";
import { META_KEY } from "../constants";
import type { SceneTerrainData } from "../types";

const EMPTY: SceneTerrainData = { cells: {}, regions: [] };

export async function readScene(): Promise<SceneTerrainData> {
  const meta = await OBR.scene.getMetadata();
  return (meta[META_KEY.cells] as SceneTerrainData | undefined) ?? EMPTY;
}

export async function writeScene(data: SceneTerrainData): Promise<void> {
  await OBR.scene.setMetadata({ [META_KEY.cells]: data });
}

export function subscribeScene(
  handler: (d: SceneTerrainData) => void,
): () => void {
  return OBR.scene.onMetadataChange((meta) => {
    handler((meta[META_KEY.cells] as SceneTerrainData | undefined) ?? EMPTY);
  });
}
