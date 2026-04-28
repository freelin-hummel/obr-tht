import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import {
  defaultPalette,
  genId,
  readRoom,
  subscribeRoom,
  writePalette,
  writeSettings,
} from "../../state/roomMeta";
import { openPopover, useActionResizer } from "../../obr";
import { readPrefs, subscribePrefs, writePrefs } from "../../state/userPrefs";
import type { RoomSettings, TerrainType, UserPrefs } from "../../types";
import { DEFAULT_COLORS } from "../../constants";

/**
 * Top-level popover UI opened from the OBR action button.
 * Shows the terrain palette (editable by GMs) and the user's view settings.
 */
export function ActionPanel() {
  const resizeRef = useActionResizer(220, 720);
  const [isGM, setIsGM] = useState(false);
  const [palette, setPalette] = useState<TerrainType[]>([]);
  const [settings, setSettings] = useState<RoomSettings>({
    showByDefault: true,
    heightUnits: "",
  });
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let stopRoom = () => {};
    let stopPrefs = () => {};
    let stopPlayer = () => {};
    (async () => {
      const role = (await OBR.player.getRole?.()) ?? "PLAYER";
      setIsGM(role === "GM");
      stopPlayer = OBR.player.onChange((p) => setIsGM(p.role === "GM"));
      const r = await readRoom();
      setPalette(r.palette.length > 0 ? r.palette : []);
      setSettings(r.settings);
      const p = await readPrefs();
      setPrefs(p);
      setSelectedId(p.lastTerrainId);
      stopRoom = subscribeRoom(({ palette: pal, settings: s }) => {
        setPalette(pal);
        setSettings(s);
      });
      stopPrefs = subscribePrefs(setPrefs);
    })();
    return () => {
      stopRoom();
      stopPrefs();
      stopPlayer();
    };
  }, []);

  async function updatePalette(next: TerrainType[]) {
    setPalette(next);
    await writePalette(next);
  }

  async function addTerrain() {
    const i = palette.length;
    const t: TerrainType = {
      id: genId(),
      name: `Terrain ${i + 1}`,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]!,
      opacity: 0.4,
      lineOpacity: 0.9,
      lineStyle: "solid",
      height: 5,
      elevation: 0,
      alwaysVisible: false,
    };
    await updatePalette([...palette, t]);
    setSelectedId(t.id);
    await writePrefs({ lastTerrainId: t.id });
  }

  async function resetPalette() {
    const dp = defaultPalette();
    await updatePalette(dp);
    setSelectedId(dp[0]?.id);
    await writePrefs({ lastTerrainId: dp[0]?.id });
  }

  async function removeTerrain(id: string) {
    await updatePalette(palette.filter((t) => t.id !== id));
  }

  function patch<K extends keyof TerrainType>(id: string, key: K, value: TerrainType[K]) {
    void updatePalette(palette.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  }

  async function selectTerrain(id: string) {
    setSelectedId(id);
    await writePrefs({ lastTerrainId: id });
  }

  async function exportPalette() {
    const blob = new Blob([JSON.stringify(palette, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "obr-tht-palette.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importPalette(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as TerrainType[];
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      await updatePalette(parsed);
    } catch (err) {
      await OBR.notification.show(`Import failed: ${(err as Error).message}`, "ERROR");
    }
  }

  async function openViewer() {
    await openPopover({
      id: "com.obr-tht/viewer",
      url: "/viewer.html",
      width: 320,
      height: 400,
    });
  }

  return (
    <div className="tht-panel" ref={resizeRef}>
      <h2>Terrain Height Tools</h2>

      {prefs && (
        <div className="tht-row">
          <label>
            <input
              type="checkbox"
              checked={prefs.showLayer}
              onChange={(e) => writePrefs({ showLayer: e.target.checked })}
            />
            Show terrain layer
          </label>
          <label>
            Radius
            <input
              type="number"
              min={0}
              value={prefs.visibilityRadius}
              onChange={(e) => writePrefs({ visibilityRadius: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      )}

      <h3>Palette</h3>
      {palette.length === 0 && (
        <div className="tht-muted">No terrain defined yet. {isGM ? "Add one below." : "Ask your GM to add terrain."}</div>
      )}
      {palette.map((t) => (
        <div
          key={t.id}
          className={"tht-row" + (t.id === selectedId ? " selected" : "")}
          onClick={() => selectTerrain(t.id)}
        >
          <span className="tht-swatch" style={{ background: t.color }} />
          {isGM ? (
            <>
              <input
                type="text"
                value={t.name}
                onChange={(e) => patch(t.id, "name", e.target.value)}
              />
              <input
                type="color"
                value={t.color}
                onChange={(e) => patch(t.id, "color", e.target.value)}
              />
              <label>
                H
                <input
                  type="number"
                  value={t.height}
                  onChange={(e) => patch(t.id, "height", Number(e.target.value) || 0)}
                />
              </label>
              <label>
                E
                <input
                  type="number"
                  value={t.elevation}
                  onChange={(e) => patch(t.id, "elevation", Number(e.target.value) || 0)}
                />
              </label>
              <label title="Always visible to players">
                <input
                  type="checkbox"
                  checked={t.alwaysVisible}
                  onChange={(e) => patch(t.id, "alwaysVisible", e.target.checked)}
                />
                A
              </label>
              <button className="tht-btn danger" onClick={() => removeTerrain(t.id)}>
                ×
              </button>
            </>
          ) : (
            <>
              <span>{t.name}</span>
              <span className="tht-muted">height {t.height}</span>
              <span className="tht-muted">elev {t.elevation}</span>
            </>
          )}
        </div>
      ))}

      <div className="tht-actions">
        {isGM && (
          <>
            <button className="tht-btn primary" onClick={addTerrain}>
              Add terrain
            </button>
            <button className="tht-btn" onClick={resetPalette}>
              Reset to defaults
            </button>
            <button className="tht-btn" onClick={exportPalette}>
              Export
            </button>
            <label className="tht-btn">
              Import
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importPalette(f);
                }}
              />
            </label>
          </>
        )}
        <button className="tht-btn" onClick={openViewer}>
          Open viewer
        </button>
      </div>

      {isGM && (
        <>
          <h3>Room settings</h3>
          <div className="tht-row">
            <label>
              <input
                type="checkbox"
                checked={settings.showByDefault}
                onChange={(e) => {
                  const next = { ...settings, showByDefault: e.target.checked };
                  setSettings(next);
                  void writeSettings(next);
                }}
              />
              Show layer by default
            </label>
            <label>
              Units
              <input
                type="text"
                value={settings.heightUnits}
                placeholder="ft"
                onChange={(e) => {
                  const next = { ...settings, heightUnits: e.target.value };
                  setSettings(next);
                  void writeSettings(next);
                }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
