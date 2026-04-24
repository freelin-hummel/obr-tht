/**
 * Line of sight ruler — drag tool that draws a coloured ruler between two
 * points and reports whether the 3D ray is blocked by any painted terrain.
 */

import OBR, {
  buildLabel,
  buildRuler,
  Command,
  buildPath,
  type ToolContext,
  type ToolEvent,
  type PathCommand,
} from "@owlbear-rodeo/sdk";
import { TOOL_ID, ITEM_TAG } from "../constants";
import { gridUnitsToPixels, pixelsToGridUnits } from "../geometry/grid";
import { computeLos, type Prism, type LosSegment } from "../geometry/los";
import { mergeCells } from "../geometry/merge";
import { readScene } from "../state/sceneMeta";
import { readGrid } from "../state/gridInfo";
import { readRoom } from "../state/roomMeta";
import { readPrefs } from "../state/userPrefs";
import type { TerrainType } from "../types";

const TAG_KEY = "tag";

async function buildPrisms(): Promise<{ prisms: Prism[]; palette: TerrainType[] }> {
  const grid = await readGrid();
  const scene = await readScene();
  const { palette } = await readRoom();
  const regions = mergeCells(scene.cells, grid);
  const prisms: Prism[] = regions.flatMap((region) => {
    const t = palette.find((p) => p.id === region.terrainId);
    if (!t) return [];
    return [
      {
        terrainId: region.terrainId,
        rings: region.rings,
        zBottom: gridUnitsToPixels(t.elevation, grid),
        zTop: gridUnitsToPixels(t.elevation + t.height, grid),
      },
    ];
  });
  return { prisms, palette };
}

function segmentsToPaths(
  a: { x: number; y: number },
  b: { x: number; y: number },
  segments: LosSegment[],
  palette: TerrainType[],
) {
  const out: ReturnType<typeof buildPath>[] = [];
  for (const seg of segments) {
    const p0 = {
      x: a.x + seg.t0 * (b.x - a.x),
      y: a.y + seg.t0 * (b.y - a.y),
    };
    const p1 = {
      x: a.x + seg.t1 * (b.x - a.x),
      y: a.y + seg.t1 * (b.y - a.y),
    };
    const colour =
      seg.state === "clear"
        ? "#ffffff"
        : palette.find((t) => t.id === seg.terrainId)?.color ?? "#ff5555";
    const cmds: PathCommand[] = [
      [Command.MOVE, p0.x, p0.y],
      [Command.LINE, p1.x, p1.y],
    ];
    const b2 = buildPath()
      .commands(cmds)
      .strokeColor(colour)
      .strokeOpacity(1)
      .strokeWidth(6)
      .strokeDash(seg.state === "intersect" ? [12, 8] : [])
      .fillOpacity(0)
      .layer("RULER")
      .disableHit(true)
      .locked(true)
      .metadata({ [TAG_KEY]: ITEM_TAG.ruler });
    out.push(b2);
  }
  return out.map((bd) => bd.build());
}

async function clearRulerItems(): Promise<void> {
  const existing = await OBR.scene.local.getItems(
    (i) => i.metadata?.[TAG_KEY] === ITEM_TAG.ruler,
  );
  if (existing.length > 0)
    await OBR.scene.local.deleteItems(existing.map((i) => i.id));
}

async function drawRuler(
  a: { x: number; y: number },
  b: { x: number; y: number },
  startElev: number,
  endElev: number,
): Promise<void> {
  await clearRulerItems();
  const grid = await readGrid();
  const { prisms, palette } = await buildPrisms();
  const zA = gridUnitsToPixels(startElev, grid);
  const zB = gridUnitsToPixels(endElev, grid);
  const segments = computeLos({ a, b, zA, zB }, prisms);
  const items = segmentsToPaths(a, b, segments, palette);

  // Distance label at the midpoint.
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist2D = pixelsToGridUnits(Math.hypot(dx, dy), grid);
  const dist3D = Math.sqrt(
    dist2D * dist2D + (endElev - startElev) * (endElev - startElev),
  );
  const label = buildLabel()
    .position(midpoint)
    .plainText(
      `${dist3D.toFixed(1)}${grid.units ? grid.units : ""}  (${startElev}→${endElev})`,
    )
    .fillColor("#ffffff")
    .backgroundColor("#00000099")
    .pointerHeight(0)
    .disableHit(true)
    .locked(true)
    .metadata({ [TAG_KEY]: ITEM_TAG.ruler })
    .build();

  await OBR.scene.local.addItems([...items, label]);
}

export function registerLosTool(): void {
  OBR.tool.create({
    id: TOOL_ID.los,
    icons: [{ icon: "/logo.svg", label: "Line of Sight Ruler" }],
    shortcut: "L",
  });

  OBR.tool.createAction({
    id: `${TOOL_ID.los}/settings`,
    icons: [
      {
        icon: "/logo.svg",
        label: "Elevation settings…",
        filter: { activeTools: [TOOL_ID.los] },
      },
    ],
    async onClick() {
      await OBR.popover.open({
        id: `${TOOL_ID.los}/popover`,
        url: "/tool.html?tool=los",
        width: 260,
        height: 200,
      });
    },
  });

  OBR.tool.createMode({
    id: `${TOOL_ID.los}/default`,
    icons: [{ icon: "/logo.svg", label: "Measure LoS", filter: { activeTools: [TOOL_ID.los] } }],
    async onToolDragStart(_context: ToolContext, event: ToolEvent) {
      const prefs = await readPrefs();
      await drawRuler(
        event.pointerPosition,
        event.pointerPosition,
        prefs.losStartElevation,
        prefs.losEndElevation,
      );
    },
    async onToolDragMove(context: ToolContext, event: ToolEvent) {
      const prefs = await readPrefs();
      const start = (context.metadata?.["start"] as { x: number; y: number } | undefined) ??
        event.pointerPosition;
      await drawRuler(start, event.pointerPosition, prefs.losStartElevation, prefs.losEndElevation);
    },
    async onToolDragEnd(_context: ToolContext, _event: ToolEvent) {
      // Keep the ruler visible until the next drag start.
    },
    async onToolDragCancel() {
      await clearRulerItems();
    },
  });
}

export const __losInternal = { buildPrisms, drawRuler };

// Avoid an unused import warning when buildRuler is unavailable on older SDKs.
void buildRuler;
