import { describe, it, expect } from "vitest";
import { computeLos, pointInRegion, type Prism } from "../../src/geometry/los";

function square(x: number, y: number, s = 100) {
  return [
    [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ],
  ];
}

describe("pointInRegion", () => {
  it("detects inside / outside a simple square", () => {
    const rings = square(0, 0);
    expect(pointInRegion({ x: 50, y: 50 }, rings)).toBe(true);
    expect(pointInRegion({ x: 150, y: 50 }, rings)).toBe(false);
  });
});

describe("computeLos", () => {
  it("returns a single clear segment when no prisms are in the way", () => {
    const segs = computeLos(
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, zA: 0, zB: 0 },
      [],
    );
    expect(segs).toHaveLength(1);
    expect(segs[0]!.state).toBe("clear");
  });
  it("marks a ray passing through a tall prism as intersect", () => {
    const prism: Prism = {
      terrainId: "wall",
      rings: square(40, -50),
      zBottom: 0,
      zTop: 100,
    };
    const segs = computeLos(
      { a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, zA: 20, zB: 20 },
      [prism],
    );
    expect(segs.length).toBeGreaterThanOrEqual(3);
    const states = segs.map((s) => s.state);
    expect(states).toContain("clear");
    expect(states).toContain("intersect");
    const inside = segs.find((s) => s.state === "intersect")!;
    expect(inside.terrainId).toBe("wall");
  });
  it("marks a ray flying over a short prism as clear", () => {
    const prism: Prism = {
      terrainId: "low",
      rings: square(40, -50),
      zBottom: 0,
      zTop: 10,
    };
    const segs = computeLos(
      { a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, zA: 100, zB: 100 },
      [prism],
    );
    expect(segs.every((s) => s.state === "clear")).toBe(true);
  });
  it("marks a ray grazing the top of a prism as grazing", () => {
    const prism: Prism = {
      terrainId: "flat",
      rings: square(40, -50),
      zBottom: 0,
      zTop: 50,
    };
    const segs = computeLos(
      { a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, zA: 50, zB: 50 },
      [prism],
    );
    const hit = segs.find((s) => s.state !== "clear");
    expect(hit?.state).toBe("grazing");
    expect(hit?.terrainId).toBe("flat");
  });
});
