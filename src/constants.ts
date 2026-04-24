/**
 * Shared constants — extension ID prefix, metadata keys, and default values.
 * The `EXT_ID` is used as the prefix for all room/scene metadata namespaces.
 */
export const EXT_ID = "com.obr-tht";

export const META_KEY = {
  palette: `${EXT_ID}/palette` as const,
  settings: `${EXT_ID}/settings` as const,
  cells: `${EXT_ID}/cells` as const,
  userPrefs: `${EXT_ID}/user` as const,
  tokenElevation: `${EXT_ID}/elevation` as const,
};

export const ITEM_TAG = {
  terrain: `${EXT_ID}:terrain` as const,
  label: `${EXT_ID}:label` as const,
  ruler: `${EXT_ID}:ruler` as const,
};

export const TOOL_ID = {
  paint: `${EXT_ID}/paint` as const,
  los: `${EXT_ID}/los` as const,
  tokenLos: `${EXT_ID}/token-los` as const,
};

export const DEFAULT_COLORS = [
  "#4caf50",
  "#2196f3",
  "#ff9800",
  "#9c27b0",
  "#f44336",
  "#795548",
  "#607d8b",
] as const;
