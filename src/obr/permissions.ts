import { type Item, type Permission, type Player } from "@owlbear-rodeo/sdk";

export function hasPermission(
  permission: Permission,
  permissions: readonly Permission[],
  role: Player["role"],
): boolean {
  return role === "GM" || permissions.includes(permission);
}

export function getPermissionsForItem(item: Item):
  | {
      create: Permission;
      update: Permission;
      delete: Permission;
    }
  | undefined {
  switch (item.layer) {
    case "MAP":
      return { create: "MAP_CREATE", update: "MAP_UPDATE", delete: "MAP_DELETE" };
    case "PROP":
      return { create: "PROP_CREATE", update: "PROP_UPDATE", delete: "PROP_DELETE" };
    case "MOUNT":
      return { create: "MOUNT_CREATE", update: "MOUNT_UPDATE", delete: "MOUNT_DELETE" };
    case "CHARACTER":
      return {
        create: "CHARACTER_CREATE",
        update: "CHARACTER_UPDATE",
        delete: "CHARACTER_DELETE",
      };
    case "ATTACHMENT":
      return {
        create: "ATTACHMENT_CREATE",
        update: "ATTACHMENT_UPDATE",
        delete: "ATTACHMENT_DELETE",
      };
    case "NOTE":
      return { create: "NOTE_CREATE", update: "NOTE_UPDATE", delete: "NOTE_DELETE" };
    case "RULER":
      return { create: "RULER_CREATE", update: "RULER_UPDATE", delete: "RULER_DELETE" };
    case "POINTER":
      return {
        create: "POINTER_CREATE",
        update: "POINTER_UPDATE",
        delete: "POINTER_DELETE",
      };
    case "TEXT":
      return { create: "TEXT_CREATE", update: "TEXT_UPDATE", delete: "TEXT_DELETE" };
    case "FOG":
      return { create: "FOG_CREATE", update: "FOG_UPDATE", delete: "FOG_DELETE" };
    case "DRAWING":
      return {
        create: "DRAWING_CREATE",
        update: "DRAWING_UPDATE",
        delete: "DRAWING_DELETE",
      };
    default:
      return undefined;
  }
}

export function itemHasOwnerOnlyPermission(
  item: Item,
  permissions: readonly Permission[],
): boolean {
  return item.layer === "CHARACTER" && permissions.includes("CHARACTER_OWNER_ONLY");
}

export function itemHasPermission(
  item: Item,
  type: "CREATE" | "UPDATE" | "DELETE",
  permissions: readonly Permission[],
  role: Player["role"],
  playerId: string,
): boolean {
  if (role === "GM") return true;
  const layerPermissions = getPermissionsForItem(item);
  if (!layerPermissions) return false;

  const permission =
    type === "CREATE"
      ? layerPermissions.create
      : type === "UPDATE"
        ? layerPermissions.update
        : layerPermissions.delete;

  const allowed = hasPermission(permission, permissions, role);
  if (!allowed) return false;

  if ((type === "UPDATE" || type === "DELETE") && itemHasOwnerOnlyPermission(item, permissions)) {
    return item.createdUserId === playerId;
  }

  return true;
}
