/**
 * Read OBR's grid API and expose it in the shape our geometry helpers expect.
 */

import { readGridInfo, subscribeGridInfo } from "../obr";
import type { GridInfo } from "../types";

export async function readGrid(): Promise<GridInfo> {
  return readGridInfo();
}

export function subscribeGrid(handler: (g: GridInfo) => void): () => void {
  return subscribeGridInfo(handler);
}
