# 2026-05-15 — Observe: Zones overlay decoupling + permaculture-zone anchor discoverability


**Branch.** `feat/atlas-permaculture`.

**Trigger.** Steward report: "fix zones overlay show/hide button in map
view" — Zones checkbox appeared to do nothing with rings drawn.

**Diagnosis (debugging-first, preview-reproduced).** Toggle *wiring* was
correct (`observe-anno-human-zones-fill`/`-line` flipped `visible`↔`none`),
but three compounding defects surfaced: (1) `ObserveAnnotationLayers`
AND-gated every toggled spec with the separate `observeAnnotations` master,
so a persisted `observeAnnotations: false` made independent rows like Zones
inert; (2) `PermacultureZone.anchorPoint` is a create-time snapshot — moving
the homestead pin correctly didn't move rings but nothing explained it; (3)
a zone anchored km from the auto-fitted parcel rendered rings + the gold/teal
edit markers off-screen with no way to reach them.

**Changes.**

- `ObserveAnnotationLayers.tsx` (in HEAD via work-tree): per-spec
  visibility `spec.toggleKey ? subToggles[spec.toggleKey] : visible` at
  both gating sites; comments updated.
- `BaseMapCard.tsx`: overlay-scoping comment now states toggled rows are
  independent of the `observeAnnotations` master (master governs only
  untoggled point/note specs).
- `PermacultureZoneTool.tsx`: `homesteadDrifted` (>1 m) detection →
  explanatory hint + "Re-anchor zones to homestead" button calling
  `updatePermacultureZone(id, { anchorPoint, anchorSource })`; plus an
  effect that `map.flyTo`s the anchor on tool-arm / anchor-change when it
  is outside the current viewport (scoped to active tool, never steals a
  pan). Snapshot semantics + `2026-05-13` residence-derivation ADR
  unchanged — steward elected to keep snapshot, fix discoverability.

**Verification.** `tsc --noEmit` exit 0 (re-run post-edit). `vitest run`
full suite green (815/815 at the toggle-fix point). Preview on mtc: master
OFF + zones ON → layers `visible` (pre-fix forced `none`); drift → button
shows, click re-anchors + clears notice; off-parcel anchor → map recenters,
gold + teal markers on-canvas (screenshot-confirmed). Original mtc data
restored.

**Scope discipline.** The work-tree carried a large unrelated in-flight
ecology/vegetation refactor (deleted `EcologyZoneTool`/`GroundCoverPaintTool`,
new `vegetationStore`/`VegetationTool`, many `M` files). Commit limited to
the two source files this session authored + the wiki — the refactor was
**not** bundled.

**Deferred.** Pre-existing `useEcologyStore.addEcologyZone/removeEcologyZone`
gap (caused 2 transient test failures + an HMR error boundary mid-session)
belongs to the in-flight ecology refactor; left to that work.
