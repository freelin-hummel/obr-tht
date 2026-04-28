import OBR, { type Grid, type GridScale, type Vector2 } from "@owlbear-rodeo/sdk";
import type { GridInfo } from "../types";

export type ObrGridType = Grid["type"];
export type UtilityGridType = GridInfo["type"];

function normalizeGridType(type: unknown): UtilityGridType {
  if (
    type === "SQUARE" ||
    type === "HEX_VERTICAL" ||
    type === "HEX_HORIZONTAL" ||
    type === "ISOMETRIC" ||
    type === "GRIDLESS"
  ) {
    return type;
  }
  return "GRIDLESS";
}

export async function getGridScale(): Promise<GridScale | null> {
  return OBR.scene.grid.getScale().catch(() => null);
}

export async function readGridInfo(): Promise<GridInfo> {
  const [type, dpi, scale] = await Promise.all([
    OBR.scene.grid.getType().then(normalizeGridType).catch(() => "GRIDLESS" as const),
    OBR.scene.grid.getDpi().catch(() => 150),
    getGridScale(),
  ]);

  return {
    type,
    dpi,
    scale: scale?.parsed?.multiplier ?? 1,
    units: scale?.parsed?.unit ?? "",
  };
}

export function subscribeGridInfo(handler: (grid: GridInfo) => void): () => void {
  return OBR.scene.grid.onChange(async () => {
    handler(await readGridInfo());
  });
}

export function snapToGrid(position: Vector2): Promise<Vector2> {
  return OBR.scene.grid.snapPosition(position);
}

export class GridStateCache {
  #value: GridInfo | undefined;

  async init(): Promise<GridInfo> {
    const value = await readGridInfo();
    this.#value = value;
    return value;
  }

  subscribe(handler: (grid: GridInfo) => void): () => void {
    return subscribeGridInfo((grid) => {
      this.#value = grid;
      handler(grid);
    });
  }

  get current(): GridInfo {
    if (!this.#value) {
      throw new Error(
        "GridStateCache not initialized. Call init() and await its result before accessing current.",
      );
    }
    return this.#value;
  }
}
