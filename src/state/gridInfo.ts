/**
 * Read OBR's grid API and expose it in the shape our geometry helpers expect.
 */

import OBR from "@owlbear-rodeo/sdk";
import type { GridInfo } from "../types";

type ObrGridType = "SQUARE" | "HEX_VERTICAL" | "HEX_HORIZONTAL" | "ISOMETRIC";

export async function readGrid(): Promise<GridInfo> {
  // `OBR.scene.grid.getType()` returns "SQUARE" | "HEX_VERTICAL" |
  // "HEX_HORIZONTAL" | "ISOMETRIC". Newer SDK versions also expose
  // `GRIDLESS`; when `getType` rejects, we fall back to GRIDLESS.
  let type: GridInfo["type"];
  try {
    type = (await OBR.scene.grid.getType()) as ObrGridType;
  } catch {
    type = "GRIDLESS";
  }
  const dpi = await OBR.scene.grid.getDpi().catch(() => 150);
  const scale = await OBR.scene.grid
    .getScale()
    .then((s) => s.parsed?.multiplier ?? 1)
    .catch(() => 1);
  const units = await OBR.scene.grid
    .getScale()
    .then((s) => s.parsed?.unit ?? "")
    .catch(() => "");
  return { type, dpi, scale, units };
}

export function subscribeGrid(handler: (g: GridInfo) => void): () => void {
  return OBR.scene.grid.onChange(async () => {
    handler(await readGrid());
  });
}
