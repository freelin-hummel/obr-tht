# OBR Terrain Height Tools

An [Owlbear Rodeo](https://owlbear.rodeo) extension that brings the core features of
[FoundryVTT Terrain Height Tools](https://github.com/Wibble199/FoundryVTT-Terrain-Height-Tools)
to OBR: paint terrain cells with a configurable palette, calculate 3D line of sight
between points or tokens, and share the results with your whole table.

> Licensed under MIT. This is a clean-room reimplementation; no code was taken from
> the original Foundry module. Credit and thanks to **Wibble199** for the excellent
> original design.

## Features

- **Palette-driven terrain painting** — GMs define terrain types (name, colour,
  height, bottom elevation, always-visible flag) and paint cells on any OBR
  grid type: square, hex (pointy & flat top), isometric, and gridless.
  - **Freeform regions** — drag-to-trace polygons on any map (the only
    paint mechanism on gridless maps; also useful for irregular shapes on
    grid maps). Click inside a region in *Erase region* mode to delete it.
- **Merged outlines** — adjacent cells of the same terrain are drawn as a single
  joined polygon with holes, matching the clean look of the Foundry module.
- **Per-cell height labels** with configurable units (ft, m, …).
- **Line of Sight ruler** — drag-to-measure tool that reports 3D LoS:
  - unbroken white line = no terrain in the way,
  - coloured solid line = ray grazes terrain (touches top/bottom/edge),
  - coloured dashed line = ray passes through terrain.
  - Configure start/end elevations per ruler.
- **Token line of sight** — right-click a token to mark it as LoS source or
  target; the extension then draws three rays (centre + two edges) between
  them using each token's stored elevation.
- **Per-user preferences** — toggle the terrain layer, set a visibility radius
  around the cursor, and adjust ruler elevation defaults.
- **Palette import/export** — share and reuse terrain palettes as JSON.

## Install

Paste this URL into OBR's **Add Extension** dialog once the project is deployed
to Cloudflare Workers:

```
https://<your-worker>.<your-subdomain>.workers.dev/manifest.json
```

(or your custom domain). See "Deployment" below for details.

## Development

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Scripts

```bash
npm install
npm run dev          # vite dev server on http://localhost:5173
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest
npm run build        # production build into dist/
npm run preview      # serve the built dist/
```

During development, run `npm run dev` and open OBR's _Add Extension_ dialog with
the manifest URL `http://localhost:5173/manifest.json`.

### Project layout

```
src/
  background/      # extension background entry — registers tools/action/context menu
  geometry/        # grid math, cell-outline merging, 3D LoS intersection
  scene/           # rendering merged terrain as OBR local-scene items
  state/           # room metadata, scene metadata, player prefs
  tools/           # paint, LoS ruler, token LoS tools
  ui/              # React UIs loaded inside OBR popovers
tests/             # vitest unit tests (grid math + LoS)
public/
  manifest.json    # OBR extension manifest
  logo.svg         # icon
  _headers         # Cloudflare static-asset CORS / cache headers
```

## Deployment — Cloudflare Workers

1. Create a Cloudflare Worker named `obr-tht` (or change the name in
   `wrangler.toml`, `.github/workflows/deploy.yml`, and `package.json`).
2. In GitHub, add two repository secrets:
   - `CLOUDFLARE_API_TOKEN` — a token with the **Edit Cloudflare Workers**
     permission.
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account id.
3. Push to `main`. The `deploy` workflow builds `dist/` and publishes it with
   `wrangler deploy`. Pushes to any other branch upload a **preview Worker
   version** with a sanitized preview alias so pull-request builds can be
   validated on `workers.dev` without replacing production.
4. The manifest URL becomes
   `https://<worker>.<your-subdomain>.workers.dev/manifest.json` (or your
   custom domain). Share that URL with your players.

The `public/_headers` file configures `Access-Control-Allow-Origin: *` so OBR
can load the extension from its cross-origin iframe.

## Roadmap

- [ ] Cursor-based visibility radius masking.
- [ ] Icon picker for terrain labels.
- [ ] Submit to the official OBR extension store.

## Credits

- **Wibble199** — author of the original
  [FoundryVTT Terrain Height Tools](https://github.com/Wibble199/FoundryVTT-Terrain-Height-Tools).
- **cirrahn** — author of
  [Political Map Overlay](https://github.com/cirrahn/foundry-polmap), the
  original inspiration for the painting model.
