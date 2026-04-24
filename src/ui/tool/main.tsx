import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { createRoot } from "react-dom/client";
import { readPrefs, subscribePrefs, writePrefs } from "../../state/userPrefs";

/**
 * Small tool-options popover. Currently used by the LoS ruler to edit the
 * default start / end elevations.
 */
function ToolOptions() {
  const [prefs, setPrefs] = useState<Awaited<ReturnType<typeof readPrefs>> | null>(null);
  useEffect(() => {
    let stop = () => {};
    (async () => {
      setPrefs(await readPrefs());
      stop = subscribePrefs(setPrefs);
    })();
    return () => stop();
  }, []);
  if (!prefs) return null;
  return (
    <div className="tht-panel">
      <h2>Line of sight</h2>
      <div className="tht-row">
        <label>
          Start elevation
          <input
            type="number"
            value={prefs.losStartElevation}
            onChange={(e) =>
              writePrefs({ losStartElevation: Number(e.target.value) || 0 })
            }
          />
        </label>
      </div>
      <div className="tht-row">
        <label>
          End elevation
          <input
            type="number"
            value={prefs.losEndElevation}
            onChange={(e) =>
              writePrefs({ losEndElevation: Number(e.target.value) || 0 })
            }
          />
        </label>
      </div>
      <div className="tht-muted">
        Elevation values are in grid units (e.g. feet). Height is measured from
        the map ground plane.
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
if (typeof OBR?.onReady === "function") OBR.onReady(() => root.render(<ToolOptions />));
else root.render(<ToolOptions />);
