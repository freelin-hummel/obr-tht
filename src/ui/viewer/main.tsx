import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { readRoom, subscribeRoom } from "../../state/roomMeta";
import type { TerrainType } from "../../types";
import { createRoot } from "react-dom/client";

function Viewer() {
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
    <div className="tht-panel">
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
if (typeof OBR?.onReady === "function") OBR.onReady(() => root.render(<Viewer />));
else root.render(<Viewer />);
