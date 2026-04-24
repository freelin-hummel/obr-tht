import { describe, it, expect } from "vitest";
import { simplify, pointInPolygon, centroid } from "../../src/geometry/freeform";

describe("simplify (RDP)", () => {
  it("keeps endpoints and a sharp middle vertex", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 50 },
      { x: 15, y: 0 },
      { x: 20, y: 0 },
    ];
    const out = simplify(pts, 1);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 20, y: 0 });
    expect(out.some((p) => p.x === 10 && p.y === 50)).toBe(true);
  });
  it("collapses near-collinear points", () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i, y: 0.0001 * i }));
    const out = simplify(pts, 0.1);
    expect(out.length).toBeLessThanOrEqual(2);
  });
  it("returns the input unchanged when fewer than 3 points", () => {
    expect(simplify([{ x: 0, y: 0 }], 1)).toEqual([{ x: 0, y: 0 }]);
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it("returns true inside", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });
  it("returns false outside", () => {
    expect(pointInPolygon({ x: 20, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, y: 5 }, square)).toBe(false);
  });
});

describe("centroid", () => {
  it("matches the geometric centre of a square", () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });
  it("falls back to vertex average for a degenerate ring", () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 }, // duplicate makes signed area ~0
    ]);
    expect(Number.isFinite(c.x)).toBe(true);
    expect(Number.isFinite(c.y)).toBe(true);
  });
});
