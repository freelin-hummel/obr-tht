import { describe, it, expect } from "vitest";
import {
  cellCenter,
  cellKey,
  cellPolygon,
  parseCellKey,
  worldToCell,
  gridUnitsToPixels,
  pixelsToGridUnits,
} from "../../src/geometry/grid";
import type { GridInfo } from "../../src/types";

const sq: GridInfo = { type: "SQUARE", dpi: 100, scale: 5, units: "ft" };
const hexV: GridInfo = { type: "HEX_VERTICAL", dpi: 100, scale: 5, units: "ft" };
const hexH: GridInfo = { type: "HEX_HORIZONTAL", dpi: 100, scale: 5, units: "ft" };
const iso: GridInfo = { type: "ISOMETRIC", dpi: 100, scale: 5, units: "ft" };

describe("cellKey", () => {
  it("round-trips", () => {
    const k = cellKey(3, -2);
    expect(parseCellKey(k)).toEqual({ q: 3, r: -2 });
  });
});

describe("square grid", () => {
  it("centre is at (q+0.5, r+0.5)*dpi", () => {
    expect(cellCenter(2, 3, sq)).toEqual({ x: 250, y: 350 });
  });
  it("worldToCell floors into the correct cell", () => {
    expect(worldToCell({ x: 249, y: 300 }, sq)).toEqual({ q: 2, r: 3 });
    expect(worldToCell({ x: 250, y: 300 }, sq)).toEqual({ q: 2, r: 3 });
    expect(worldToCell({ x: 250.5, y: 300 }, sq)).toEqual({ q: 2, r: 3 });
  });
  it("polygon has 4 corners", () => {
    const p = cellPolygon(0, 0, sq);
    expect(p).toHaveLength(4);
    expect(p[0]).toEqual({ x: 0, y: 0 });
    expect(p[2]).toEqual({ x: 100, y: 100 });
  });
});

describe("hex grids", () => {
  it("pointy-top polygon is a 6-gon of roughly correct radius", () => {
    const p = cellPolygon(0, 0, hexV);
    expect(p).toHaveLength(6);
    // Radius (centre-to-vertex) = dpi / sqrt(3).
    const expected = 100 / Math.sqrt(3);
    for (const v of p) {
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(expected, 4);
    }
  });
  it("flat-top polygon is a 6-gon of roughly correct radius", () => {
    const p = cellPolygon(0, 0, hexH);
    expect(p).toHaveLength(6);
    const expected = 100 / Math.sqrt(3);
    for (const v of p) expect(Math.hypot(v.x, v.y)).toBeCloseTo(expected, 4);
  });
  it("worldToCell at the centre returns (0,0)", () => {
    expect(worldToCell({ x: 0, y: 0 }, hexV)).toEqual({ q: 0, r: 0 });
    expect(worldToCell({ x: 0, y: 0 }, hexH)).toEqual({ q: 0, r: 0 });
  });
  it("worldToCell at a neighbour's centre returns that neighbour", () => {
    const n = cellCenter(1, 0, hexV);
    expect(worldToCell(n, hexV)).toEqual({ q: 1, r: 0 });
    const m = cellCenter(0, 1, hexH);
    expect(worldToCell(m, hexH)).toEqual({ q: 0, r: 1 });
  });
});

describe("isometric grid", () => {
  it("polygon is a rhombus (4 points)", () => {
    const p = cellPolygon(0, 0, iso);
    expect(p).toHaveLength(4);
  });
  it("worldToCell at cell centre returns that cell", () => {
    for (const [q, r] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 2],
      [3, -1],
    ] as Array<[number, number]>) {
      const c = cellCenter(q, r, iso);
      expect(worldToCell(c, iso)).toEqual({ q, r });
    }
  });
});

describe("unit conversions", () => {
  it("grid units round-trip through pixels", () => {
    const px = gridUnitsToPixels(5, sq); // 5 ft / 5 ft-per-cell * 100 px = 100
    expect(px).toBe(100);
    expect(pixelsToGridUnits(px, sq)).toBe(5);
  });
});
