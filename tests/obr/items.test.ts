import type { Item } from "@owlbear-rodeo/sdk";
import { describe, expect, test } from "vitest";
import { diffItems, getAllAttachments, toItemMap } from "../../src/obr/items";

function makeItem(id: string, partial: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    locked: false,
    visible: true,
    rotation: 0,
    scale: { x: 1, y: 1 },
    position: { x: 0, y: 0 },
    layer: "PROP",
    metadata: {},
    createdUserId: "user-1",
    lastModifiedUserId: "user-1",
    lastModified: 1,
    disableAttachmentBehavior: false,
    ...partial,
  } as Item;
}

describe("OBR item utilities", () => {
  test("creates an item map keyed by id", () => {
    const alpha = makeItem("alpha");
    const beta = makeItem("beta");

    expect(toItemMap([alpha, beta]).get("beta")).toBe(beta);
  });

  test("finds attachments recursively", () => {
    const root = makeItem("root");
    const child = makeItem("child", { attachedTo: "root" });
    const grandchild = makeItem("grandchild", { attachedTo: "child" });

    const items = toItemMap([root, child, grandchild]);
    expect(getAllAttachments(items, root).map((item) => item.id)).toEqual([
      "child",
      "grandchild",
    ]);
  });

  test("diffs created, updated, and deleted items", () => {
    const oldItem = makeItem("same", { lastModified: 1 as never });
    const updatedItem = makeItem("same", { lastModified: 2 as never });
    const deletedItem = makeItem("deleted");
    const createdItem = makeItem("created");

    const diff = diffItems(
      toItemMap([oldItem, deletedItem]),
      toItemMap([updatedItem, createdItem]),
    );

    expect([...diff.createdItems].map((item) => item.id)).toEqual(["created"]);
    expect([...diff.deletedItems]).toEqual(["deleted"]);
    expect(diff.updatedItems.map((item) => item.id)).toEqual(["same"]);
  });
});
