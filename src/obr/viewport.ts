import OBR, { Math2, type BoundingBox, type Item, type Vector2 } from "@owlbear-rodeo/sdk";
import { getItemCenter, getItemsBounds } from "./items";

export async function getViewportBounds(): Promise<BoundingBox> {
  const [height, width, min] = await Promise.all([
    OBR.viewport.getHeight(),
    OBR.viewport.getWidth(),
    OBR.viewport.inverseTransformPoint({ x: 0, y: 0 }),
  ]);
  const max = await OBR.viewport.inverseTransformPoint({ x: width, y: height });
  return Math2.boundingBox([min, max]);
}

export function jumpToBounds(bounds: BoundingBox): Promise<void> {
  return OBR.viewport.animateToBounds(bounds);
}

export function resetViewport(): ReturnType<typeof OBR.viewport.reset> {
  return OBR.viewport.reset();
}

export async function centerViewportOnPoint(point: Vector2): Promise<void> {
  const [scale, width, height] = await Promise.all([
    OBR.viewport.getScale(),
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
  ]);

  const viewportCenter = {
    x: width / 2 / scale,
    y: height / 2 / scale,
  };

  await OBR.viewport.animateTo({
    position: {
      x: (point.x - viewportCenter.x) * scale * -1,
      y: (point.y - viewportCenter.y) * scale * -1,
    },
    scale,
  });
}

export function centerViewportOnItem(item: Item, sceneDpi = 150): Promise<void> {
  return centerViewportOnPoint(getItemCenter(item, sceneDpi));
}

export async function focusItems(items: readonly Item[], sceneDpi = 150): Promise<void> {
  const bounds = getItemsBounds(items, sceneDpi);
  if (!bounds) return;

  if (bounds.width === 0 && bounds.height === 0) {
    await centerViewportOnPoint(bounds.center);
    return;
  }

  await jumpToBounds(bounds);
}
