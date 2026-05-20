# 2026-05-13 — Plan → Observe deep-link Phase 3: flyTo + pulse


**Why.** Phase 2 opened the read-only detail panel on landing, but
the underlying Observe map stayed wherever the camera was last set —
the steward could read the record's details but couldn't visually
locate it on the map. Phase 3 carries the popover's anchor coords
through the handoff and flies the Observe camera to the feature
with a short pulse ring for draw-the-eye.

**What.** Popover now passes `focusLng` / `focusLat` from
`active.anchor` alongside the existing `focusKind` / `focusId`.
ObserveLayout no longer consumes the search params at layout scope —
that effect moved into a new `ObserveDeepLinkFocus` component
mounted inside the `DiagnoseMap` render-prop so the live `map`
instance is in scope. The new component opens the detail panel,
calls `map.flyTo({ center, zoom: 17, essential: true })` (mirrors
the legacy DiagnosePage "Open on map" pattern), mounts a
short-lived `<SpotlightPulse>` (auto-removes at 2.5 s) keyed by
`Date.now()`, then strips the search params via `replace: true` so
refresh / back-nav don't re-fire.

**Verified.** `npx tsc --noEmit` clean for the three changed files
(only pre-existing `DesignElementLayers.tsx:468` MultiPoint error
remains; not in scope). Live preview at `/v3/project/mtc/plan`:
soil-sample deep-link routes to
`/observe/earth-water-ecology`, the Observe camera flies to
`[-79.7046, 43.5054]`, `_pulse_…` marker mounts for ~2.5 s, the
`<AnnotationDetailPanel>` opens with title + notes + created stamp.
Refresh leaves the URL clean.
