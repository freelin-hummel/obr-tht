import OBR, {
  Math2,
  MathM,
  isCurve,
  isImage,
  isLine,
  isPath,
  isRuler,
  isShape,
  type BoundingBox,
  type Image,
  type Item,
  type Line,
  type Path,
  type Ruler,
  type Shape,
  type Vector2,
} from "@owlbear-rodeo/sdk";

export type ItemMap<ItemType extends Item = Item> = Map<ItemType["id"], ItemType>;

export interface ItemDiff<ItemType extends Item = Item> {
  createdItems: ReadonlySet<ItemType>;
  deletedItems: ReadonlySet<ItemType["id"]>;
  updatedItems: readonly ItemType[];
}

function transformPoint(item: Item, point: Vector2): Vector2 {
  const transform = MathM.fromItem(item);
  return MathM.decompose(MathM.multiply(transform, MathM.fromPosition(point))).position;
}

function getImageLocalPoints(item: Image, sceneDpi: number): Vector2[] {
  const dpiScale = sceneDpi / item.grid.dpi;
  const width = item.image.width * dpiScale;
  const height = item.image.height * dpiScale;
  const offsetX = (item.grid.offset.x / item.image.width) * width;
  const offsetY = (item.grid.offset.y / item.image.height) * height;
  return [
    { x: -offsetX, y: -offsetY },
    { x: width - offsetX, y: -offsetY },
    { x: width - offsetX, y: height - offsetY },
    { x: -offsetX, y: height - offsetY },
  ];
}

function getLineLocalPoints(item: Line): Vector2[] {
  return [item.startPosition, item.endPosition];
}

function getRulerLocalPoints(item: Ruler): Vector2[] {
  return [item.startPosition, item.endPosition];
}

function getShapeLocalPoints(item: Shape): Vector2[] {
  return [
    { x: 0, y: 0 },
    { x: item.width, y: 0 },
    { x: item.width, y: item.height },
    { x: 0, y: item.height },
  ];
}

function getPathLocalPoints(item: Path): Vector2[] {
  const points: Vector2[] = [];
  for (const command of item.commands) {
    for (let index = 1; index + 1 < command.length; index += 2) {
      const x = command[index];
      const y = command[index + 1];
      if (typeof x === "number" && typeof y === "number") {
        points.push({ x, y });
      }
    }
  }
  return points;
}

export function getWorldPoints(item: Item, sceneDpi = 150): Vector2[] {
  if (isImage(item)) {
    return getImageLocalPoints(item, sceneDpi).map((point) => transformPoint(item, point));
  }
  if (isCurve(item)) {
    return item.points.map((point) => transformPoint(item, point));
  }
  if (isLine(item)) {
    return getLineLocalPoints(item).map((point) => transformPoint(item, point));
  }
  if (isPath(item)) {
    return getPathLocalPoints(item).map((point) => transformPoint(item, point));
  }
  if (isRuler(item)) {
    return getRulerLocalPoints(item).map((point) => transformPoint(item, point));
  }
  if (isShape(item)) {
    return getShapeLocalPoints(item).map((point) => transformPoint(item, point));
  }
  return [item.position];
}

export function getItemBounds(item: Item, sceneDpi = 150): BoundingBox {
  return Math2.boundingBox(getWorldPoints(item, sceneDpi));
}

export function getItemsBounds(items: readonly Item[], sceneDpi = 150): BoundingBox | null {
  if (items.length === 0) return null;
  const points = items.flatMap((item) => getWorldPoints(item, sceneDpi));
  return points.length > 0 ? Math2.boundingBox(points) : null;
}

export function getItemCenter(item: Item, sceneDpi = 150): Vector2 {
  const bounds = getItemBounds(item, sceneDpi);
  return bounds.center;
}

export function toItemMap<ItemType extends Item = Item>(
  items: readonly ItemType[],
): ItemMap<ItemType> {
  return new Map(items.map((item) => [item.id, item]));
}

export function getAllAttachments<ItemType extends Item>(
  items: ItemMap<ItemType>,
  root: Readonly<ItemType>,
): ItemType[] {
  const children = new Map<ItemType["id"], ItemType[]>();
  for (const item of items.values()) {
    if (!item.attachedTo) continue;
    const existing = children.get(item.attachedTo) ?? [];
    existing.push(item);
    children.set(item.attachedTo, existing);
  }

  const visited = new Set<ItemType["id"]>();
  const walk = (item: ItemType): ItemType[] => {
    if (visited.has(item.id)) return [];
    visited.add(item.id);
    return (children.get(item.id) ?? []).flatMap((child) => [child, ...walk(child)]);
  };

  return walk(root);
}

export function diffItems<ItemType extends Item = Item>(
  previousItems: ItemMap<ItemType>,
  nextItems: ItemMap<ItemType>,
): ItemDiff<ItemType> {
  const deletedItems = new Set(previousItems.keys());
  const createdItems = new Set(nextItems.values());
  const updatedItems: ItemType[] = [];

  for (const oldItem of previousItems.values()) {
    if (nextItems.has(oldItem.id)) {
      deletedItems.delete(oldItem.id);
    }
  }

  for (const nextItem of nextItems.values()) {
    const oldItem = previousItems.get(nextItem.id);
    if (!oldItem) continue;
    createdItems.delete(nextItem);
    if (oldItem.lastModified < nextItem.lastModified) {
      updatedItems.push(nextItem);
    }
  }

  return { createdItems, deletedItems, updatedItems };
}

export function remapAttachments<ItemType extends Item = Item>(
  items: readonly ItemType[],
  idMap: Record<string, string>,
): ItemType[] {
  return items.map((item) => ({
    ...item,
    id: idMap[item.id] ?? item.id,
    attachedTo: item.attachedTo ? (idMap[item.attachedTo] ?? item.attachedTo) : item.attachedTo,
  }));
}

export function cloneItemsWithOffset<ItemType extends Item = Item>(
  items: readonly ItemType[],
  offset: Vector2 = { x: 0, y: 0 },
): ItemType[] {
  const idMap: Record<string, string> = {};
  for (const item of items) {
    idMap[item.id] = crypto.randomUUID();
  }

  return remapAttachments(items, idMap).map((item) => ({
    ...item,
    position: Math2.add(item.position, offset),
  }));
}

export async function focusSelection(sceneDpi = 150): Promise<void> {
  const selection = await OBR.player.getSelection();
  if (!selection || selection.length === 0) return;
  const items = await OBR.scene.items.getItems(selection);
  const bounds = getItemsBounds(items, sceneDpi);
  if (!bounds) return;
  await OBR.viewport.animateToBounds(bounds);
}
