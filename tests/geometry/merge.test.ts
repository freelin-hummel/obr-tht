import { describe, it, expect } from "vitest";
import { mergeCells } from "../../src/geometry/merge";
import type { GridInfo } from "../../src/types";

const sq: GridInfo = { type: "SQUARE", dpi: 100, scale: 5, units: "ft" };

describe("mergeCells (square)", () => {
  it("merges two adjacent cells into one 6-vertex outline", () => {
    const regions = mergeCells({ "0,0": "t1", "1,0": "t1" }, sq);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.terrainId).toBe("t1");
    expect(regions[0]!.rings).toHaveLength(1);
    // A 2-cell rectangle is simplified to its 4 corners (collinear edges merged).
    expect(regions[0]!.rings[0]!.length).toBe(4);
  });
  it("keeps disjoint cells as separate regions", () => {
    const regions = mergeCells({ "0,0": "t1", "5,5": "t1" }, sq);
    expect(regions).toHaveLength(2);
  });
  it("keeps different terrains separate even when adjacent", () => {
    const regions = mergeCells({ "0,0": "t1", "1,0": "t2" }, sq);
    expect(regions).toHaveLength(2);
    expect(new Set(regions.map((r) => r.terrainId))).toEqual(new Set(["t1", "t2"]));
  });
  it("produces an outer ring and a hole for a doughnut of cells", () => {
    const cells: Record<string, string> = {};
    // Fill a 3x3 ring (leave centre hollow).
    for (let q = 0; q < 3; q++) {
      for (let r = 0; r < 3; r++) {
        if (q === 1 && r === 1) continue;
        cells[`${q},${r}`] = "t1";
      }
    }
    const regions = mergeCells(cells, sq);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.rings.length).toBeGreaterThanOrEqual(2);
  });
});
