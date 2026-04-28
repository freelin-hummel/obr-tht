/**
 * Background entrypoint — loaded via the OBR manifest's `main` URL.
 *
 * Registers tools, the action button, and the context menu, and subscribes
 * to state changes to keep the terrain layer rendered.
 */

import OBR from "@owlbear-rodeo/sdk";
import { registerPaintTool } from "../tools/paintTool";
import { registerLosTool } from "../tools/losRulerTool";
import { registerTokenLosTool } from "../tools/tokenLosTool";
import { runWhenReady, sceneReadyPromise } from "../obr";
import { readScene, subscribeScene } from "../state/sceneMeta";
import { readRoom, subscribeRoom } from "../state/roomMeta";
import { readPrefs, subscribePrefs } from "../state/userPrefs";
import { readGrid, subscribeGrid } from "../state/gridInfo";
import { renderTerrainLayer, clearTerrainLayer } from "../scene/terrainLayer";
import type { GridInfo, RoomSettings, SceneTerrainData, TerrainType, UserPrefs } from "../types";

interface Snapshot {
  grid: GridInfo;
  scene: SceneTerrainData;
  palette: TerrainType[];
  settings: RoomSettings;
  prefs: UserPrefs;
}

const snapshot: Partial<Snapshot> = {};

async function rerender(): Promise<void> {
  if (
    !snapshot.grid ||
    !snapshot.scene ||
    !snapshot.palette ||
    !snapshot.prefs ||
    !snapshot.settings
  )
    return;
  await renderTerrainLayer(
    snapshot.scene,
    snapshot.grid,
    snapshot.palette,
    snapshot.prefs.showLayer,
    snapshot.settings.heightUnits || snapshot.grid.units || "",
  );
}

async function onSceneReady(ready: boolean): Promise<void> {
  if (!ready) {
    await clearTerrainLayer().catch(() => {});
    return;
  }
  const [grid, scene, room, prefs] = await Promise.all([
    readGrid(),
    readScene(),
    readRoom(),
    readPrefs(),
  ]);
  snapshot.grid = grid;
  snapshot.scene = scene;
  snapshot.palette = room.palette;
  snapshot.settings = room.settings;
  snapshot.prefs = prefs;
  await rerender();
}

runWhenReady(async () => {
  registerPaintTool();
  registerLosTool();
  registerTokenLosTool();

  // Subscribe first to avoid missing early events.
  subscribeScene((scene) => {
    snapshot.scene = scene;
    void rerender();
  });
  subscribeRoom(({ palette, settings }) => {
    snapshot.palette = palette;
    snapshot.settings = settings;
    void rerender();
  });
  subscribePrefs((prefs) => {
    snapshot.prefs = prefs;
    void rerender();
  });
  subscribeGrid((grid) => {
    snapshot.grid = grid;
    void rerender();
  });

  void sceneReadyPromise().then(() => onSceneReady(true));
  OBR.scene.onReadyChange((ready) => {
    void onSceneReady(ready);
  });
});
