/**
 * Per-user preferences, persisted on the OBR Player metadata so they follow
 * the user between sessions in the same room.
 */

import OBR from "@owlbear-rodeo/sdk";
import { META_KEY } from "../constants";
import type { UserPrefs } from "../types";

export const DEFAULT_PREFS: UserPrefs = {
  showLayer: true,
  visibilityRadius: 0,
  losStartElevation: 0,
  losEndElevation: 0,
};

export async function readPrefs(): Promise<UserPrefs> {
  const meta = await OBR.player.getMetadata();
  return { ...DEFAULT_PREFS, ...(meta[META_KEY.userPrefs] as Partial<UserPrefs> | undefined) };
}

export async function writePrefs(prefs: Partial<UserPrefs>): Promise<void> {
  const current = await readPrefs();
  await OBR.player.setMetadata({ [META_KEY.userPrefs]: { ...current, ...prefs } });
}

export function subscribePrefs(handler: (p: UserPrefs) => void): () => void {
  return OBR.player.onChange((player) => {
    const merged = {
      ...DEFAULT_PREFS,
      ...((player.metadata[META_KEY.userPrefs] as Partial<UserPrefs> | undefined) ?? {}),
    };
    handler(merged);
  });
}
