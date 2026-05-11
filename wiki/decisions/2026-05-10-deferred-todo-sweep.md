# 2026-05-10 — Deferred-TODO sweep (Phase 4.2)

## Status

Accepted. Five carry-forward items dispositioned: 1 closed (hydrology
stubs refactored), 4 promoted with explicit gates / cross-references.

## Context

Phase 4.2 of the 2026-05-09 pre-test friction audit
([2026-05-09-atlas-pre-test-audit.md]) called for a sweep of deferred
TODOs flagged across the codebase: promote to ADRs (or pre-existing
ADRs), or close as won't-do. The audit listed five items:

1. Guild centroid map tool (`centroidUv ≠ lat/lng`)
2. Succession timeline / temporal slider (proposed 2026-04-28)
3. GAEZ voice/RCP scenario picker (`GaezOverlay.tsx:442`)
4. Public-portal cache + rate-limit gaps (`apps/api/src/routes/portal/public.ts:7`)
5. Hydrology panel `buildLive()` / `buildMetrics()` stubs returning
   `null as unknown` (`HydrologyRightPanel.tsx:1020,1043`)

## Disposition

### 1. Guild centroid map tool — **Open / promoted**

`apps/web/src/v3/plan/draw/tools/GuildTool.tsx` derives `centroidUv`
(parcel-relative `[u, v]` in `0..1`) from current map bounds at draw
time. This is coarse — the resulting UV depends on viewport, not parcel
geometry. The proper fix is a dedicated guild-placement tool that
projects the click point into parcel-relative space via the parcel
boundary polygon, plus a drag-to-refine affordance on the existing
guild marker.

**Not a launch blocker** — the slide-up's `GuildSpatialBuilderCard`
exposes the centroid for manual refinement after placement, so the
operator can correct viewport drift. Tracked as a follow-up sprint
item; TODO comment in the file now cross-references this ADR.

### 2. Succession timeline / temporal slider — **Open / pre-existing ADR**

Already has its own design doc:
[2026-04-28-temporal-slider-succession-modeling.md]. No new disposition
needed — that ADR's status is the source of truth. The audit's mention
was redundant; closing this entry as "see existing ADR."

### 3. GAEZ scenario picker — **Open / promoted**

`apps/web/src/features/map/GaezOverlay.tsx:442` hardcodes the GAEZ
scenario to `baseline_1981_2010`. Backend accepts scenario as a path
segment per Sprint CD, so the API contract is ready — what's missing
is a UI control that surfaces `(baseline, rcp26, rcp45, rcp60, rcp85)`
options and threads the choice into `GaezSelection`.

**Not a launch blocker** — baseline is a sensible default for current
suitability work and the overlay carries the year range in its legend.
Tracked as a follow-up; comment updated to cross-reference this ADR.

### 4. Public-portal cache + rate-limit gaps — **Open / launch-gated**

`apps/api/src/routes/portal/public.ts` serves portal config by share
token with no caching and no rate limit. Already documented in
[2026-05-04-p4-public-portal-section27-consolidation.md] (D2 + D4) as
deferred to a launch-readiness sprint.

**Gate re-confirmed: "before first public URL."** As long as no portal
share token has been minted for a public audience, the gap is dormant.
The header comment in `public.ts` now cross-references this ADR to
make the gate explicit at the call-site, not just buried in the older
consolidation doc.

### 5. Hydrology `buildLive()` / `buildMetrics()` stubs — **Closed / refactored**

`apps/web/src/components/panels/HydrologyRightPanel.tsx` previously
declared two no-op helpers that returned `null as unknown as <shape>`
purely so `ReturnType<typeof buildLive>` would resolve for prop typing
on `RealtimePanel` and `DesignPanel`. This was confusing — the code
read like a runtime stub left for later wiring, not type scaffolding.

**Fix.** Extracted the inline shape into a named `type HydrologyLive`
and aliased `type HydrologyMetrics =
ReturnType<typeof computeHydrologyMetrics>`. The two stub functions
were deleted; both prop-type sites now reference the named types
directly. Zero runtime behavior change — the `useMemo` at line 228
still builds the `live` object inline.

Verification: `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` → exit 0.

## Consequences

**Pros.**

- Each remaining TODO now has a single canonical ADR pointer at the
  call-site comment, not a scattered "tracked somewhere" feeling.
- One read-trap removed (hydrology stubs no longer mis-read as
  abandoned runtime placeholders).
- Pre-test audit Phase 4 is closed end-to-end (4.1 + 4.2).

**Cons.**

- Items 1, 3, 4 remain unimplemented. They are intentional carry-
  forwards, not blockers, but should be addressed before:
  - Guild centroid → before parcel-spatial guild analytics ship.
  - GAEZ scenario picker → before publishing climate-change overlays
    as a feature (currently dev-internal).
  - Public-portal cache/rate-limit → before the first public share URL
    is minted.

## References

- [2026-05-09-atlas-pre-test-audit.md] — friction audit (Phase 4.2 item)
- [2026-04-28-temporal-slider-succession-modeling.md] — item 2 source ADR
- [2026-05-04-p4-public-portal-section27-consolidation.md] — item 4 source ADR
- `apps/web/src/v3/plan/draw/tools/GuildTool.tsx:73–78`
- `apps/web/src/features/map/GaezOverlay.tsx:442–445`
- `apps/api/src/routes/portal/public.ts:1–17`
- `apps/web/src/components/panels/HydrologyRightPanel.tsx` — `HydrologyLive`,
  `HydrologyMetrics` named types
