/** Domain types shared across the extension. */

export type Vec2 = { x: number; y: number };

/** A single terrain type defined in the room palette. */
export interface TerrainType {
  /** Stable identifier. */
  id: string;
  /** Display name shown in the palette and viewer. */
  name: string;
  /** Fill colour (#RRGGBB). Line colour defaults to this if `lineColor` is absent. */
  color: string;
  /** Fill opacity 0..1. */
  opacity: number;
  /** Line colour override (#RRGGBB). */
  lineColor?: string;
  /** Line opacity 0..1. */
  lineOpacity: number;
  /** Line dash style. */
  lineStyle: "solid" | "dashed";
  /** Height of the terrain prism in grid units. */
  height: number;
  /** Bottom elevation of the prism in grid units (0 = ground). */
  elevation: number;
  /** When true, terrain is visible to all players regardless of layer toggle / radius. */
  alwaysVisible: boolean;
  /** Optional short label rendered on each cell (defaults to the numeric height). */
  label?: string;
}

/**
 * Painted terrain data per scene.
 *
 * Square/hex/isometric grids store a sparse map of cell keys → terrain id.
 * Gridless maps store a list of freeform polygons (world coordinates).
 */
export interface SceneTerrainData {
  /** Sparse map of cell-key → terrainId for grid-based maps. Key format: "q,r". */
  cells: Record<string, string>;
  /** Freeform regions for gridless maps. */
  regions: Array<{
    id: string;
    terrainId: string;
    /** Polygon in world coordinates (OBR pixels). */
    points: Vec2[];
  }>;
}

/** Room-level settings. */
export interface RoomSettings {
  /** When true, newly opened scenes show terrain by default. */
  showByDefault: boolean;
  /** Units label displayed after heights ("ft", "m", ""). */
  heightUnits: string;
}

/** Per-user preferences. */
export interface UserPrefs {
  /** Terrain layer visible for this user. */
  showLayer: boolean;
  /** Visibility radius in grid units; 0 = always full map. */
  visibilityRadius: number;
  /** Last-used terrain id in the paint tool. */
  lastTerrainId?: string;
  /** Default start elevation for the LoS ruler (grid units). */
  losStartElevation: number;
  /** Default end elevation for the LoS ruler (grid units). */
  losEndElevation: number;
}

/** Snapshot of all state needed to render the terrain layer. */
export interface TerrainSnapshot {
  palette: TerrainType[];
  terrain: SceneTerrainData;
  roomSettings: RoomSettings;
}

/** Grid information exposed via OBR's scene.grid API, re-shaped for our use. */
export interface GridInfo {
  /** One of OBR's grid types. */
  type: "SQUARE" | "HEX_VERTICAL" | "HEX_HORIZONTAL" | "ISOMETRIC" | "GRIDLESS";
  /** Distance between cell centres in world (pixel) units. */
  dpi: number;
  /** Grid-units-per-cell scale (e.g. 5 ft per cell). */
  scale: number;
  /** Units label ("ft", "m", ""). */
  units: string;
}
