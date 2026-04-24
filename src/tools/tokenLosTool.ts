/**
 * Token-to-token line of sight tool. Adds context-menu entries on tokens
 * ("Set as LoS source" / "Set as LoS target") and draws three rays between
 * the selected pair (centre + two edges).
 */

import OBR, { type Image, type Item } from "@owlbear-rodeo/sdk";
import { EXT_ID, META_KEY } from "../constants";
import { __losInternal } from "./losRulerTool";
import { readPrefs } from "../state/userPrefs";

const CONTEXT_SOURCE = `${EXT_ID}/ctx/los-source`;
const CONTEXT_TARGET = `${EXT_ID}/ctx/los-target`;

interface SharedState {
  sourceId?: string;
  targetId?: string;
}

let state: SharedState = {};

function imageCenterAndRadius(item: Item): { c: { x: number; y: number }; r: number } {
  const img = item as Image;
  const c = { x: img.position.x, y: img.position.y };
  const w = (img.image?.width ?? 150) * (img.scale?.x ?? 1);
  const h = (img.image?.height ?? 150) * (img.scale?.y ?? 1);
  return { c, r: Math.min(w, h) / 2 };
}

async function tokenElevation(item: Item): Promise<number> {
  return (item.metadata?.[META_KEY.tokenElevation] as number | undefined) ?? 0;
}

async function redraw(): Promise<void> {
  if (!state.sourceId || !state.targetId) return;
  const items = await OBR.scene.items.getItems([state.sourceId, state.targetId]);
  if (items.length < 2) return;
  const a = items.find((i) => i.id === state.sourceId);
  const b = items.find((i) => i.id === state.targetId);
  if (!a || !b) return;
  const sa = imageCenterAndRadius(a);
  const sb = imageCenterAndRadius(b);
  const zA = await tokenElevation(a);
  const zB = await tokenElevation(b);
  const prefs = await readPrefs();
  const dx = sb.c.x - sa.c.x;
  const dy = sb.c.y - sa.c.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // Centre line plus two edge offsets by token radius.
  const rays: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
    [sa.c, sb.c],
    [
      { x: sa.c.x + nx * sa.r, y: sa.c.y + ny * sa.r },
      { x: sb.c.x + nx * sb.r, y: sb.c.y + ny * sb.r },
    ],
    [
      { x: sa.c.x - nx * sa.r, y: sa.c.y - ny * sa.r },
      { x: sb.c.x - nx * sb.r, y: sb.c.y - ny * sb.r },
    ],
  ];
  // Draw sequentially to keep behaviour predictable; small N.
  for (const [p0, p1] of rays) {
    await __losInternal.drawRuler(p0, p1, zA + prefs.losStartElevation, zB + prefs.losEndElevation);
  }
}

export function registerTokenLosTool(): void {
  OBR.contextMenu.create({
    id: CONTEXT_SOURCE,
    icons: [
      {
        icon: "/logo.svg",
        label: "THT: use as LoS source",
        filter: { every: [{ key: "layer", value: "CHARACTER" }], max: 1 },
      },
    ],
    async onClick(ctx) {
      state = { ...state, sourceId: ctx.items[0]?.id };
      await redraw();
    },
  });

  OBR.contextMenu.create({
    id: CONTEXT_TARGET,
    icons: [
      {
        icon: "/logo.svg",
        label: "THT: use as LoS target",
        filter: { every: [{ key: "layer", value: "CHARACTER" }], max: 1 },
      },
    ],
    async onClick(ctx) {
      state = { ...state, targetId: ctx.items[0]?.id };
      await redraw();
    },
  });
}

export const __tokenLosInternal = { redraw, state: () => state };
