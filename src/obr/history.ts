import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";

export function undoScene(): Promise<void> {
  return OBR.scene.history.undo();
}

export function redoScene(): Promise<void> {
  return OBR.scene.history.redo();
}

export function useUndoRedoHandler(): void {
  useEffect(() => {
    async function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "z" || (!event.ctrlKey && !event.metaKey)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        await redoScene();
      } else {
        await undoScene();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
