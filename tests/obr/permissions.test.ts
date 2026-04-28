import type { Item, Permission, Player } from "@owlbear-rodeo/sdk";
import { describe, expect, test } from "vitest";
import { getPermissionsForItem, hasPermission, itemHasPermission } from "../../src/obr/permissions";

function makeItem(partial: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "item-1",
    locked: false,
    visible: true,
    rotation: 0,
    scale: { x: 1, y: 1 },
    position: { x: 0, y: 0 },
    layer: "CHARACTER",
    metadata: {},
    createdUserId: "owner-1",
    lastModifiedUserId: "owner-1",
    lastModified: 1,
    disableAttachmentBehavior: false,
    ...partial,
  } as Item;
}

describe("OBR permission utilities", () => {
  test("returns layer permissions for character items", () => {
    expect(getPermissionsForItem(makeItem())).toEqual({
      create: "CHARACTER_CREATE",
      update: "CHARACTER_UPDATE",
      delete: "CHARACTER_DELETE",
    });
  });

  test("allows GMs automatically", () => {
    expect(hasPermission("CHARACTER_UPDATE", [], "GM")).toBe(true);
  });

  test("respects owner-only updates for players", () => {
    const permissions: Permission[] = ["CHARACTER_UPDATE", "CHARACTER_OWNER_ONLY"];
    const role: Player["role"] = "PLAYER";

    expect(itemHasPermission(makeItem(), "UPDATE", permissions, role, "owner-1")).toBe(true);
    expect(itemHasPermission(makeItem(), "UPDATE", permissions, role, "other-user")).toBe(false);
  });
});
