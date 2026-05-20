# 2026-05-17 — Seeded-zones overlay show/hide toggle


Steward request: "Seeded zones need an overlay show/hide button."
Clarified (questions): control in the **BaseMapCard "Overlays" legend**
(top-left matrix legend); hide removes the **entire** seeded zone (fill +
solid line + dashed seed-line + label); default **visible** (no
regression). Plan approved, executed autonomously.

Implementation — maplibre `setFilter` on the *shared* polygon/label
layers (not visibility flips; mirrors the `fence-temp-line` /
`poly-seed-line` filtered-sub-layer precedent), since ring-seed zones
ride `plan-data-poly-fill`/`poly-line`/`label` with every other polygon:

- `matrixTogglesStore.ts` — `'seededZones'` added to `MatrixToggleKey` +
  `MatrixTogglesState` (doc comment), initial `true`, `setAll` extended;
  persist `version` 11→12 + v12 comment; `migrate`
  `seededZones: prev.seededZones ?? true` — **defaults ON** (unlike the
  off-by-default overlays) so existing stewards keep prior always-visible
  behavior; persisted stores self-heal.
- `BaseMapCard.tsx` — new `DEFAULT_OVERLAYS` row ("Seeded zones (ring-seed
  provisional drafts)", swatch `#7a9a4a`) by the zone rows; `seededZones`
  added to `STAGE_HIDDEN.observe` + `STAGE_HIDDEN.act` (stage-scoped, same
  as `zoneRings`/`sunPath` — layers only mounted by `PlanDataLayers`).
- `PlanDataLayers.tsx` — reads `useMatrixTogglesStore(s=>s.seededZones)`;
  `hideSeedFilter = ['!=',['coalesce',['get','seedProvenance'],'manual'],
  'ring-seed']` (non-zone features coalesce to `'manual'` ⇒ always pass —
  **only ring-seed ever dropped**); `seedLineFilter` match-everything-ring
  when on / match-nothing `['==',['literal',0],1]` when off. Applied at
  first-mount `ensureLayer` (`poly-fill`/`poly-line`/`label` carry the
  filter when hidden; `poly-seed-line` uses the seed-line filter) **and**
  re-`setFilter`d in the toggle-time re-apply `try` block (all four,
  `map.getLayer`-guarded). `seededZonesVisible` added to `apply` deps.
- `ObserveAnnotationLayers.tsx` — typecheck-only: `'seededZones'` added
  to the three `Exclude<MatrixToggleKey,…>` unions (`toggleKey?`,
  `GROUP_TOGGLE`, `subToggles`) so the new key isn't a sector sub-toggle.

No existing layer/behavior deleted (no-deletion-in-revamps convention).
`tsc --noEmit` (8 GiB heap) exit 0; `lint` (= `tsc` default heap) OOM
exit 134 — environment memory limit, not a code defect. E2E verified by
injecting a test `ring-seed` zone into `localStorage` on the Current
Land canvas tab (where `plan-data-*` mounts — not Vision Layout's
`design-el-*`): seed render count 2 → 0 (off) → 2 (on), 78 non-seed
features unaffected, filter expressions confirmed exact; test data
cleaned up. Live WebGL screenshot unobtainable offline (black frames) —
disclosed, not faked. New ADR
`decisions/2026-05-17-atlas-seeded-zones-overlay-toggle.md` + index
pointer + this entry + `entities/web-app.md` Current State. Pre-existing
unrelated `DesignElementLayers` crash (ec5ed028 / a4d04c74) observed in
a different component — not caused here, flagged separately.
