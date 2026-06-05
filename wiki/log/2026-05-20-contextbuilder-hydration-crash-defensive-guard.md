# 2026-05-20 — ContextBuilder hydration crash defensive guard (walkthrough gap #2)

**Branch.** `feat/atlas-permaculture`. Closes gap #2 from
[[2026-05-20-olos-new-user-journey-walkthrough]] — the AI-enrichment
crash that broke every boot for any non-empty paddock/crop store. No
commit; staged for steward review.

## Root cause

The walkthrough cited `ContextBuilder.ts:69`; the actual throwing sites
are [`apps/web/src/features/ai/ContextBuilder.ts:84`](../../apps/web/src/features/ai/ContextBuilder.ts)
(`const speciesNames = p.species.map(...)`) and `:95`
(`c.species.join(', ')`). Both fields can be `undefined` on a paddock or
crop persisted under an older schema:

- `livestockStore` is `name: 'ogden-livestock', version: 1, migrate: (p) => p as never` — a no-op migrator. Any v0 paddock that lacked `species` hydrates unchanged.
- `cropStore` (`version: 3`) handles undefined inside its v1→v2 migrator via `(c.species ?? []).map(...)`, but v0 rows never run through that path.

Trigger: `siteDataStore.fetchForProject` / `refreshProject` →
`enrichProject` (fire-and-forget on `status === 'complete'`) →
`aiEnrichment.ts` (`generateSiteNarrative` / `generateDesignRecommendation`
/ `enrichAssessmentFlags`) → `buildProjectContext` → throw on `.map`/`.join`.

## What changed

[`apps/web/src/features/ai/ContextBuilder.ts`](../../apps/web/src/features/ai/ContextBuilder.ts):

- Line 84: `p.species.map(...)` → `(p.species ?? []).map(...)`.
- Line 95: `c.species.join(', ')` → `(c.species ?? []).join(', ')`.

Two-line surgical guard. Matches the `?? []` precedent already used in
[`cropStore.ts:110`](../../apps/web/src/store/cropStore.ts).

## Verification

`preview_eval` seeded a degraded paddock (`id: repro-paddock-current`)
and a degraded crop (`id: repro-crop-current`) on the active project
`78ccf2bf-5e1d-44b8-94f4-c2c58666d242`, both with `species` omitted.
Reloaded `/v3/project/{uuid}/observe`. Console scan
(`preview_console_logs`):

- All three `aiEnrichment` paths reached the server API and failed only
  with the expected `ApiError: AI features are not configured. Set
  ANTHROPIC_API_KEY`. Pre-fix, `buildProjectContext` would have thrown
  synchronously and the request would never have been issued.
- No `Cannot read properties of undefined (reading 'map')` or
  `(reading 'join')` exceptions anywhere.
- A separate `PlanDataLayers` warning (`reading 'type'`, from
  `geom.type` on the malformed seed geometries) appeared — caused by
  the test seed lacking geometry; unrelated to this fix.

Cleaned up the repro rows; no regression on normal-shape data (the
`?? []` is a no-op when `species` is defined).

## Why not bump the livestock store version?

Defensible but broader. A real migration backfilling `species: []`
would touch every paddock-consuming surface — Plan-stage rotation
adherence, biodiversity sampler, livestock dashboards — and each has
its own brittleness. Out of scope here. Tracked as a deferred
follow-up; flagged in the walkthrough ADR footer.

## Touched files

- `apps/web/src/features/ai/ContextBuilder.ts`
- `wiki/decisions/2026-05-20-olos-new-user-journey-walkthrough.md` (footer)
