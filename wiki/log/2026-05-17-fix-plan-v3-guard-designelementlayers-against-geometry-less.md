# 2026-05-17 — fix(plan/v3): guard DesignElementLayers against geometry-less rows


Pre-existing crash: opening the Plan-stage map canvas threw an uncaught
"Cannot read properties of undefined (reading 'type')" caught by
`GlobalErrorBoundary` (repro projects `ec5ed028…`, `a4d04c74…` — latter
after the "Current Land" tab switch). Root cause: `DesignElementLayers`'
feature-building loop does `el.geometry.type` with no guard at
`apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx` line ~121.
`DesignElement.geometry` is typed as required (`designElementsStore.ts`),
but a synced/draft row arrives with `geometry === undefined`.
`DesignElementLayers` is the **only** consumer that opts into
`includeDrafts: true`, so the malformed row surfaces here and nowhere
else (acreage rollups / audits / exports drop drafts via
`excludeDrafts`). Fix: a two-line skip-on-malformed guard at loop entry
(`if (!geom || typeof geom.type !== 'string') continue;`), mirroring the
existing `turf.centroid` try/catch (same file) and PlanDataLayers'
`acresOf` geometry-type guard — happy path provably unaffected, only
geometry-less rows are skipped. Stash `phase5-unrelated-blockers`
inspected and ruled out (hover-cursor plumbing, already merged; no
geometry guard). No ADR — defensive null-guard, not an architectural
decision. Verified: `tsc --noEmit` clean for the edited file (the ~40
other tsc errors are pre-existing, unrelated `lib/computeScores` /
`hydrologyMetrics` stale sibling-build). **Not** browser-verified:
live repro on the two project IDs needs the full atlas stack (web +
Fastify API + PostGIS) with the seeded DB holding the malformed row —
recommend a manual smoke before merge.
