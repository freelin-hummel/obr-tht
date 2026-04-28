import OBR from "@owlbear-rodeo/sdk";

export function runWhenReady(callback: () => void | Promise<void>): void {
  if (!OBR.isAvailable) {
    void callback();
    return;
  }
  if (OBR.isReady) {
    void callback();
    return;
  }
  OBR.onReady(() => {
    void callback();
  });
}

export function sceneReadyPromise(): Promise<void> {
  return new Promise<void>((resolve) => {
    runWhenReady(async () => {
      if (await OBR.scene.isReady()) {
        resolve();
        return;
      }
      const unsubscribe = OBR.scene.onReadyChange((ready) => {
        if (!ready) return;
        unsubscribe();
        resolve();
      });
    });
  });
}
