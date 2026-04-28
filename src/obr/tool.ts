import OBR, { type Metadata } from "@owlbear-rodeo/sdk";

export type ToolDefinition = Parameters<typeof OBR.tool.create>[0];
export type ToolModeDefinition = Parameters<typeof OBR.tool.createMode>[0];
export type ToolActionDefinition = Parameters<typeof OBR.tool.createAction>[0];
export type ContextMenuDefinition = Parameters<typeof OBR.contextMenu.create>[0];
export type PopoverOpenOptions = Parameters<typeof OBR.popover.open>[0];

export function createTool(definition: ToolDefinition): Promise<void> {
  return OBR.tool.create(definition);
}

export function createToolMode(definition: ToolModeDefinition): Promise<void> {
  return OBR.tool.createMode(definition);
}

export function createToolAction(definition: ToolActionDefinition): Promise<void> {
  return OBR.tool.createAction(definition);
}

export function setToolMetadata(toolId: string, update: Partial<Metadata>): Promise<void> {
  return OBR.tool.setMetadata(toolId, update);
}

export function activateTool(toolId: string): Promise<void> {
  return OBR.tool.activateTool(toolId);
}

export function createContextMenu(definition: ContextMenuDefinition): Promise<void> {
  return OBR.contextMenu.create(definition);
}

export function removeContextMenu(id: string): Promise<void> {
  return OBR.contextMenu.remove(id);
}

export function openPopover(
  options: PopoverOpenOptions,
): ReturnType<typeof OBR.popover.open> {
  return OBR.popover.open(options);
}
