/**
 * Room-level state: terrain palette + global settings.
 *
 * Persisted via `OBR.room.setMetadata`. The palette is authored by GMs and
 * read by every client.
 */

import OBR from "@owlbear-rodeo/sdk";
import { DEFAULT_COLORS, META_KEY } from "../constants";
import type { RoomSettings, TerrainType } from "../types";

const DEFAULT_SETTINGS: RoomSettings = {
  showByDefault: true,
  heightUnits: "",
};

function genId(): string {
  return crypto.randomUUID?.() ?? `t_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultPalette(): TerrainType[] {
  return [
    {
      id: genId(),
      name: "Difficult terrain",
      color: DEFAULT_COLORS[0],
      opacity: 0.35,
      lineOpacity: 0.8,
      lineStyle: "solid",
      height: 0,
      elevation: 0,
      alwaysVisible: false,
    },
    {
      id: genId(),
      name: "Low wall",
      color: DEFAULT_COLORS[5],
      opacity: 0.45,
      lineOpacity: 0.9,
      lineStyle: "solid",
      height: 3,
      elevation: 0,
      alwaysVisible: false,
    },
    {
      id: genId(),
      name: "Wall",
      color: DEFAULT_COLORS[6],
      opacity: 0.5,
      lineOpacity: 1,
      lineStyle: "solid",
      height: 10,
      elevation: 0,
      alwaysVisible: false,
    },
  ];
}

export interface RoomState {
  palette: TerrainType[];
  settings: RoomSettings;
}

export async function readRoom(): Promise<RoomState> {
  const meta = await OBR.room.getMetadata();
  const palette = (meta[META_KEY.palette] as TerrainType[] | undefined) ?? [];
  const settings =
    (meta[META_KEY.settings] as RoomSettings | undefined) ?? DEFAULT_SETTINGS;
  return { palette, settings };
}

export async function writePalette(palette: TerrainType[]): Promise<void> {
  await OBR.room.setMetadata({ [META_KEY.palette]: palette });
}

export async function writeSettings(settings: RoomSettings): Promise<void> {
  await OBR.room.setMetadata({ [META_KEY.settings]: settings });
}

export function subscribeRoom(handler: (s: RoomState) => void): () => void {
  return OBR.room.onMetadataChange((meta) => {
    const palette = (meta[META_KEY.palette] as TerrainType[] | undefined) ?? [];
    const settings =
      (meta[META_KEY.settings] as RoomSettings | undefined) ?? DEFAULT_SETTINGS;
    handler({ palette, settings });
  });
}

export { genId };
