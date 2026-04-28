import { useEffect, useState } from "react";
import { readRoom, subscribeRoom } from "../../state/roomMeta";
import type { TerrainType } from "../../types";
import { createRoot } from "react-dom/client";
import { runWhenReady, usePopoverResizer } from "../../obr";

function Viewer() {
  const resizeRef = usePopoverResizer("com.obr-tht/viewer", 180, 520, 260, 420);
  const [palette, setPalette] = useState<TerrainType[]>([]);
  useEffect(() => {
    let stop = () => {};
    (async () => {
      const { palette } = await readRoom();
      setPalette(palette);
      stop = subscribeRoom(({ palette }) => setPalette(palette));
    })();
    return () => stop();
  }, []);
  return (
    <div className="tht-panel" ref={resizeRef}>
      <h2>Terrain viewer</h2>
      {palette.length === 0 && <div className="tht-muted">No terrain defined.</div>}
      {palette.map((t) => (
        <div key={t.id} className="tht-row">
          <span className="tht-swatch" style={{ background: t.color }} />
          <strong>{t.name}</strong>
          <span className="tht-muted">height {t.height}</span>
          <span className="tht-muted">elev {t.elevation}</span>
          {t.alwaysVisible && <span className="tht-muted">always visible</span>}
        </div>
      ))}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
runWhenReady(() => root.render(<Viewer />));
