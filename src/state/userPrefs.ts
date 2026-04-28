/**
 * Per-user preferences, persisted on the OBR Player metadata so they follow
 * the user between sessions in the same room.
 */

import { META_KEY } from "../constants";
import { createObjectMetadataStore, playerMetadata } from "../obr";
import type { UserPrefs } from "../types";

export const DEFAULT_PREFS: UserPrefs = {
  showLayer: true,
  visibilityRadius: 0,
  losStartElevation: 0,
  losEndElevation: 0,
};

const prefsStore = createObjectMetadataStore(playerMetadata, META_KEY.userPrefs, DEFAULT_PREFS);

export async function readPrefs(): Promise<UserPrefs> {
  return { ...DEFAULT_PREFS, ...(await prefsStore.read()) };
}

export async function writePrefs(prefs: Partial<UserPrefs>): Promise<void> {
  await prefsStore.patch(prefs);
}

export function subscribePrefs(handler: (p: UserPrefs) => void): () => void {
  return prefsStore.subscribe((prefs) => {
    handler({ ...DEFAULT_PREFS, ...prefs });
  });
}
