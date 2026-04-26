# ADR: LayerSummary as a Discriminated Union with a Boundary Coercer

**Date:** 2026-04-21
**Status:** Accepted
**Scope:** `@ogden/shared/scoring`, `apps/web/src/lib/layerFetcher.ts`,
downstream consumers (scoring engine, rule engine, dashboards, panels).

---

## Context

`MockLayerResult.summary` in `packages/shared/src/scoring/types.ts` was
typed as `Record<string, unknown>` — an untyped blob. `layerFetcher.ts`
(~8,200 LOC) writes ~88 summary literals into this blob across 41 layer
variants; 18 downstream files read keys out of it with zero type check.
The graphify rebuild of 2026-04-21 surfaced that this is the structural
root cause of audit issue 5.6: the `wetlands.wetland_pct.toFixed is not a
function` runtime crash in `EcologicalDashboard`, patched locally with a
`formatPct(value: unknown)` guard. The fix patched the symptom; the
contract stayed loose. Every dashboard that reads summary keys had to
either trust the shape blindly or add its own defensive coercers.

## Decision

1. **Lift `LayerSummary` into `@ogden/shared/scoring/layerSummary.ts`** as
   a discriminated union keyed by `layerType`:
   ```ts
   type LayerSummaryMap = { [K in LayerType]: *Summary };
   type LayerSummary = LayerSummaryMap[LayerType];
   ```
   One variant interface per `LayerType` (41 variants). Numeric fields are
   `number | null` — **never** `number | string | null` unless the upstream
   source genuinely returns narrative text (rare; explicitly called out in
   `NUMERIC_KEYS` exclusion).

2. **Coerce at the fetch boundary.** `toNum(v)` and `toStr(v)` drop sentinel
   strings (`'Unknown'`, `'N/A'`, `''`, `'null'`, `'undefined'`, mixed case)
   to `null` once, at the adapter. Consumers can then trust
   `typeof === 'number'` without per-site guards. `normalizeSummary(layerType, raw)`
   walks the `NUMERIC_KEYS` / `STRING_KEYS_WITH_SENTINELS` registries per
   variant for use at any untyped boundary (e.g. a JSONB DB read).

3. **Use `LayerSummaryMap[K] & Record<string, unknown>` for `summary`** on
   the `MockLayerResult` discriminated union. TypeScript's known-field-type-wins
   rule preserves the narrowing (`layer.summary.wetland_pct` is `number | null`),
   while the intersection leaves an escape hatch for internal cache-strip
   fields (`_monthly_normals`, `_wind_rose`) and for bulk JSONB round-trips.

## Alternatives Considered

- **Per-consumer local `Summary` interfaces (status quo).** 28+ duplicated
  interfaces across web; each dashboard re-declares its own slice. Rejected:
  no single source of truth, drift guaranteed.
- **Runtime Zod schema per variant.** Would catch more errors but adds a
  deserialization cost on every fetcher call and duplicates the type
  information. Rejected for MVP; reserve for the API-side write path if
  we ever want server-side validation.
- **Strict `number | null` everywhere, including narrative fields.**
  Rejected: `wetlands_flood.riparian_buffer_m` and `regulated_area_pct`
  genuinely come back as text like *"Contact local Conservation Authority"*
  from provincial sources; coercing that to `null` loses information the
  dashboard displays verbatim.

## Consequences

**Positive.**
- 41-variant narrowing across all downstream consumers. `formatPct` could
  be deleted; future `.toFixed` calls on summary numerics are type-safe.
- 28+ duplicated local `Summary` interfaces can be replaced with imports
  from `@ogden/shared/scoring` (follow-up sweep; lint-driven, not blocking).
- `normalizeSummary` gives the API side a safe JSONB→TS boundary when we
  ever tighten the read path in `SiteAssessmentWriter`.

**Negative.**
- Adding a new `LayerType` variant now requires adding a `*Summary` interface
  and wiring it into `LayerSummaryMap`. This is the correct cost — it forces
  the fetcher author to think about the shape — but it is a new ritual.
- The `& Record<string, unknown>` escape hatch means you can still write
  unknown keys into `summary` and TS won't warn. Acceptable for now:
  removing it would require typing every cache-strip field. Revisit if drift
  becomes a problem.

## Rollout

Shipped 2026-04-21 late as a single session. `tsc --noEmit` clean in
`apps/web`, `apps/api`, `packages/shared`. `formatPct` deleted; 2 call
sites migrated to direct narrowed access with `!= null` fallback. Audit
§5.6 RESOLVED.

## Related

- `ATLAS_DEEP_AUDIT_2026-04-21.md` §5.6 (resolution paragraph)
- `wiki/log.md` 2026-04-21 (late) entry
- `wiki/entities/shared-package.md` — new `layerSummary.ts` module
