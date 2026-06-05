# 2026-05-18 — Biodiversity Outcome Monitoring (Sub-project A3)


Re-skinned A1's longitudinal trajectory spine for a biodiversity metric
family — the ecological-response complement to A2's habitat allocation.
Added a `MetricDomain` discriminator + `domain` field to
`regenerationMetrics.ts`, 4 biodiversity keys (native cover, invasive
pressure [lower-is-better], species count, predator index [trend-only]),
and `metricKeysForDomain()`. Parameterized `buildTrajectories(…, domain?)`
(all-keys back-compat default) and `SampleEntryForm` with a `domain` prop;
the existing `RegenerationMonitorCard` now passes `'regeneration'`
explicitly (regression fix for the all-keys coupling). New
`biodiversity-outcomes` goal-tree sub-goal (`bio-native-cover` 60%/yr7,
`bio-invasive-pressure` 5%/yr5, `bio-species-richness` 45/yr9). Cloned
`BiodiversityMonitorCard`; wired the 15th PlanModule
`biodiversity-monitor` through all 6 exhaustive touchpoints.

Covenant: strictly ecological outcome tracking — no valuation / credit /
offset / payment framing (that economics is the covenant-bounded
Sub-project C). No DB migration, no new endpoint.

Gate: shared + web tsc clean (only a pre-existing unrelated
`useFlowEndpointOptions.test.ts` Paddock drift remains); vitest 16/16
(new `biodiversity.aggregate.test.ts` proves domain isolation both ways;
existing `aggregate.test.ts` registry-size constant 6→10); `vite build`
succeeds. Live DOM-verified both directions (bio form = 4 bio metrics
only; regen form = 6 regen metrics only); screenshot tool unresponsive
(2×30s MapLibre/WebGL hang, disclosed not faked) — sample-trajectory
rendering needs the backend the frontend-only preview doesn't serve, so
it's covered by the unit tests. Committed `bfb689fe` (14 A3 files only;
branch divergence checked 0/0; unrelated `docs/ux-walkthrough-*` excluded).
ADR: `decisions/2026-05-18-atlas-biodiversity-outcome-monitoring-a3.md`
+ index pointer. The A-series A track (A1+A2+A3) is now complete.
