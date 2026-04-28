/**
 * Scene-level state: which cells are painted with which terrain (+ freeform
 * regions for gridless maps). Persisted in scene metadata so that every
 * connected client sees the same terrain.
 */

import { META_KEY } from "../constants";
import { createMetadataStore, sceneMetadata } from "../obr";
import type { SceneTerrainData } from "../types";

const EMPTY: SceneTerrainData = { cells: {}, regions: [] };
const sceneStore = createMetadataStore(sceneMetadata, META_KEY.cells, EMPTY);

export async function readScene(): Promise<SceneTerrainData> {
  return sceneStore.read();
}

export async function writeScene(data: SceneTerrainData): Promise<void> {
  await sceneStore.write(data);
}

export function subscribeScene(
  handler: (d: SceneTerrainData) => void,
): () => void {
  return sceneStore.subscribe(handler);
}
