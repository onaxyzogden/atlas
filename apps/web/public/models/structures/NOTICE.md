# `models/structures/` — attribution

Per-kind GLB models for the Plan-stage `DesignElementGlbLayer`. Each
asset listed below ships with the Atlas web bundle.

| File | Author | Source | Licence | SHA-256 | Notes |
|---|---|---|---|---|---|
| `_generic_box.glb` | Atlas build script | `apps/web/scripts/gen-generic-box-glb.mjs` | CC0-1.0 | (regenerated on `pnpm gen:models`) | Procedural unit cube. Fallback geometry — every kind in `elementHeights.ts` resolves here until per-kind authored art lands. |

## Adding new per-kind models

1. Drop the GLB at `public/models/structures/<kind>.glb`.
2. Append a row above with author, source URL, licence, SHA-256, notes.
3. Update the kind's entry in
   `apps/web/src/v3/plan/canvas/elementHeights.ts` so its `glbUrl`
   points at the new file.

## Licensing rules

- Permitted: CC0, CC-BY (with attribution recorded above), MIT, Apache-2.0.
- Forbidden: anything restricting commercial use (CC-NC), share-alike
  copyleft on geometry (CC-BY-SA), or "free for personal use only"
  marketplace terms.
