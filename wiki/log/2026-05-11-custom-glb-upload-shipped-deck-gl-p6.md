# 2026-05-11 — Custom GLB upload shipped (deck.gl P6)


**Motive.** The deck.gl ScenegraphLayer migration deferred custom user
uploads as P6 of the ADR. Closing it makes the 3D pipeline open-ended:
stewards can drop in authored art for any feature the registry doesn't
ship out-of-the-box.

**Change.** New IndexedDB-backed `customModelStore` (blobs in IDB,
catalog in localStorage, blob URLs regenerated on hydrate);
`customModelValidator` (magic-byte + KHR allowlist + ≤10 MB +
SHA-256); floating `CustomModelPalette` in `VisionLayoutCanvas`.
Single canonical `custom-glb` kind in `BUILT_ENVIRONMENT_KINDS`;
per-instance `proposed.customModelId` rides on the entity. Palette
tile click arms the kind's BE tool and stashes the modelId in a
transient `customDrawSelectionStore`; `BeV2ExistingTool` reads the
stash at draw-complete and stamps it on the new entity;
`DesignElementScenegraphLayer` swaps `spec.glbUrl` for the per-instance
blob URL at render. `custom-glb` is filtered out of `BE_TOOL_ITEMS` so
it never surfaces as a bare rail button.

**Verification.** `tsc --noEmit` clean. Vision Layout view at
`/v3/project/mtc/plan` mounts the palette bottom-right; no console
errors; `custom-glb` absent from the Built Environment rail.

**Verification addendum (2026-05-11 follow-up).** End-to-end preview
run drove upload → persist → reload → rehydrate via `preview_eval`
on commit `2278c4b`:

- *Phase 1 (upload + persist).* Synthesised a `File` from
  `/models/structures/yurt.glb` (6 652 bytes), assigned to the palette's
  hidden file input via `DataTransfer`, dispatched `change`. Within
  ~500 ms the catalog row appeared in `localStorage` under
  `ogden:custom-models:catalog` (1 entry, `label: "test-yurt"`,
  `sha256: 2d6447…fee`) and the IDB blob landed in
  `ogden-custom-models/blobs` keyed by the same UUID. Palette tile
  rendered. ✅
- *Phase 2 (arm/toggle).* Tile-click cycled `data-active` false → true
  → false → true exactly as the `activeTool === CUSTOM_GLB_TOOL_ID &&
  activeCustomModelId === entry.id` derivation predicts. ✅
- *Phase 3 (reload + rehydrate).* After `location.reload()` the tile
  re-appeared with the same UUID; arming it post-reload set
  `data-active=true` without a console error. Direct IDB read +
  fresh `URL.createObjectURL` confirmed the blob survived (magic
  `0x46546c67` = "glTF", 6 652 bytes unchanged). Transient
  `customDrawSelectionStore` correctly did **not** persist
  (`tileActive=false` immediately after reload). ✅
- *Phase 4 (map placement).* Deferred to manual — MapboxDraw point
  click cannot be cleanly synthesised from `preview_eval` (canvas
  pixel → lng/lat projection is internal to MapLibre pointer handlers).
  Screenshot captured of armed tile state. Operator-driven
  click → render → reload → re-render smoke remains a manual gate.
- *Phase 5 (cleanup).* Trash button on the tile cleared both
  `localStorage` catalog (→ `[]`) and IDB `blobs` (→ no keys); palette
  reverted to the empty-state message. ✅
- *Issue surfaced (non-blocking).* React `validateDOMNesting` warning:
  `<button>` cannot appear as a descendant of `<button>` —
  `CustomModelPalette` nests the trash button inside the tile button.
  Functional today; logged as a follow-up.

**Reference.** [wiki/decisions/2026-05-11-atlas-deckgl-scenegraph-migration.md](decisions/2026-05-11-atlas-deckgl-scenegraph-migration.md) — P6 section.
