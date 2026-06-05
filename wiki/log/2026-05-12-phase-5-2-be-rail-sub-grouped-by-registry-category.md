# 2026-05-12 — Phase 5.2: BE rail sub-grouped by registry category


**Motive.** Phase 5.1 widened `defaultStates` to `['existing','proposed']`
for 23 holdout kinds, so the Observe + Plan rails now surface all 31 BE
kinds via the shared `BE_TOOL_ITEMS` derivation. But "all 31 in a flat
3-column grid" was the actual surfacing problem — stewards saw a wall of
buttons that scrolled. Phase 5.2 keeps the rail driven by the registry
but groups its buttons by `BuiltEnvironmentCategory` so the surface stays
scannable as new kinds are added.

**Changes.**

- [`builtEnvironmentTools.ts`](../apps/web/src/v3/_shared/builtEnvironmentTools.ts)
  — exports a new `BE_TOOL_GROUPS` array (and a `BE_CATEGORY_LABEL` map)
  derived from the registry. Categories appear in the order they first
  surface in `BUILT_ENVIRONMENT_KINDS`; items inside each category preserve
  registry order. Adding a kind to the shared registry auto-lands in its
  category sub-card with no rail-side maintenance.
- [`ObserveTools.tsx`](../apps/web/src/v3/observe/tools/ObserveTools.tsx)
  — when the rendered module is `'built-environment'`, the flat
  `<div className={css.itemGrid}>` is replaced with one `<details open>`
  per category. Native disclosure → no React state, no a11y wiring, free
  keyboard support. All sub-cards open by default; stewards collapse
  what they don't need.
- [`PlanTools.tsx`](../apps/web/src/v3/plan/PlanTools.tsx) — same
  pattern for the `'structures-subsystems'` module so the two rails stay
  parallel.
- Button-rendering extracted to `renderToolButton` / `renderPlanToolButton`
  so the flat case and the sub-grouped case share the exact same
  disabled / tooltip / active-state logic.
- CSS additions: `.subgroup`, `.subgroupHeader`, plus a chevron skin on
  `summary::before` that rotates on `[open]`. Added to both module CSS
  files (`ObserveTools.module.css`, `PlanTools.module.css`).

**Verification.** `apps/web` tsc exit 0. No new warnings.

**Phase 5 status.**
- **5.1** — registry widened to 31/31 dual-state. ✅ (shipped earlier)
- **5.2 (this entry)** — Observe + Plan rails sub-grouped by category. ✅
- **5.3** — Plan structure-type taxonomy mirror. Open.
- **5.4** — Dashboard derivations widen from 8 to 31 BE cards. Open.
