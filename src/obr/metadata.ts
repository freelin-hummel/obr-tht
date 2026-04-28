import OBR, { type Metadata } from "@owlbear-rodeo/sdk";

export type MetadataApi = Pick<
  typeof OBR.scene,
  "getMetadata" | "setMetadata" | "onMetadataChange"
>;

function cloneMetadataValue<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function readMetadataValue<T>(
  api: MetadataApi,
  key: string,
  fallback: T,
): Promise<T> {
  return api
    .getMetadata()
    .then((metadata) => (metadata[key] as T | undefined) ?? cloneMetadataValue(fallback));
}

export function writeMetadataValue<T>(
  api: MetadataApi,
  key: string,
  value: T,
): Promise<void> {
  return api.setMetadata({ [key]: value } as Metadata);
}

export async function patchMetadataValue<T extends object>(
  api: MetadataApi,
  key: string,
  patch: Partial<T>,
  fallback: T,
): Promise<T> {
  const current = await readMetadataValue(api, key, fallback);
  const next = { ...current, ...patch } as T;
  await writeMetadataValue(api, key, next);
  return next;
}

export function subscribeMetadataValue<T>(
  api: MetadataApi,
  key: string,
  fallback: T,
  handler: (value: T) => void,
): () => void {
  return api.onMetadataChange((metadata) => {
    handler((metadata[key] as T | undefined) ?? cloneMetadataValue(fallback));
  });
}

export function createMetadataStore<T>(
  api: MetadataApi,
  key: string,
  fallback: T,
) {
  return {
    key,
    read: () => readMetadataValue(api, key, fallback),
    write: (value: T) => writeMetadataValue(api, key, value),
    subscribe: (handler: (value: T) => void) =>
      subscribeMetadataValue(api, key, fallback, handler),
  };
}

export function createObjectMetadataStore<T extends object>(
  api: MetadataApi,
  key: string,
  fallback: T,
) {
  const store = createMetadataStore(api, key, fallback);
  return {
    ...store,
    patch: (patch: Partial<T>) => patchMetadataValue(api, key, patch, fallback),
  };
}

export const playerMetadata: MetadataApi = {
  getMetadata: () => OBR.player.getMetadata(),
  setMetadata: (update) => OBR.player.setMetadata(update),
  onMetadataChange: (callback) => OBR.player.onChange((player) => callback(player.metadata)),
};
export const roomMetadata = OBR.room satisfies MetadataApi;
export const sceneMetadata = OBR.scene satisfies MetadataApi;
