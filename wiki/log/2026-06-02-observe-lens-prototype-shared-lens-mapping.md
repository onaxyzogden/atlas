# 2026-06-02 — Observe "observational lens" concept: faithful mock prototype + shared 6-lens mapping

**Branch.** `feat/atlas-permaculture` · commit `60616aa2` (8 files, +2457).

## Context
The operator shared a 2,244-line self-contained React concept (`olos_observe_dashboard.jsx`)
that reframes the Observe stage as a single **map-centric, lens-organized** workspace, and
asked us to *consider it for the Observe stage page*. Exploration confirmed the repo already
holds the data substrate (`ObserveDataPoint`: cycles, supersession, divergence, freshness,
proof items; 16 universal domains; four built dashboard surfaces). The genuinely new ideas:
a **6-lens grouping** over the 16 domains, a **spatial unified view**, a **cycle spiral**
situational-awareness widget, and **lens-specialised visualizations** (wind rose,
infiltration/pH bars, capacity bars, consent table).

## Decision (confirmed with operator, 3 AskUserQuestion gates)
1. **Adoption scope = faithful prototype first** — pixel-faithful, route-mounted, mock-backed;
   the existing four Observe surfaces are *not* touched.
2. **Lens layer = formal shared mapping** — a canonical 6-lens → 16-domain mapping added to
   `@ogden/shared` (real, reusable concept), not a local literal.
3. **Viz fidelity = include all, mock-backed** — every visualization ported, fed by mock data.

Honours the HTML/design→React rule: match the concept pixel-for-pixel; do not reinterpret.

## What landed
- **`packages/shared/src/constants/observe/lenses.ts`** (new, +116): `ObserveLensId`
  (`foundation | climate | water | living | human | infrastructure`), `OBSERVE_LENSES`
  (ordered, each `{ id, label, icon, color, colorDim, mapColor, domains: UniversalDomain[] }`),
  `DOMAIN_TO_LENS`, `getLensForDomain()`, `getObserveLens()`. All 16 domains covered exactly
  once. Hex values are byte-identical to the prototype's `C` tokens, so sourcing identity from
  shared yields **zero** visual divergence. Re-exported from `packages/shared/src/index.ts`.
  - **Mapping:** foundation = `topography`, `land-base` · climate = `climate`,
    `energy-resources` · water = `hydrology` · living = `soil`, `ecology`, `plants-food`,
    `animals-livestock` · human = `vision-intent`, `people-governance`, `economics-capacity`,
    `risk-compliance` · infrastructure = `built-infrastructure`, `access-circulation`,
    `monitoring-records`.
- **`apps/web/src/v3/observe/prototype/`** (new, deletable, header-marked prototype-only):
  `tokens.ts` (`C`/`F` verbatim), `types.ts` (typed spine for the mock shapes),
  `mockData.ts` (`DOMAIN_DETAIL`, `LENS_DISPLAY`, `LENSES`, `MOCK_OBSERVATIONS`, `PROJECT`,
  `FRESHNESS`, `TYPE_ICON`, `CYCLE`), `components.tsx` (all presentational components),
  `ObserveLensPrototype.tsx` (root, renamed from `App`).
  - **`LENSES = OBSERVE_LENSES.map(...)`** is the proof the shared concept is live: identity,
    order, and `domains` come from `@ogden/shared`; only display values (observations, summary,
    keyData, freshness, divergence/planTrigger) stay local mock fixtures.
- **Route:** `observeLensPrototypeRoute` at `/v3/prototype/observe-lens` under `appShellRoute`
  (no project context — mirrors the `/v3/components` debug-route precedent).

## Verification
- `tsc --noEmit` on `@ogden/web` (8 GB heap) → **exit 0** after one fix: `noUncheckedIndexedAccess`
  flagged `pts[0]`/`pts[last]` in `TemporalView`; hoisted to guarded `first`/`last` consts
  (output identical — fixtures always non-empty).
- Live DOM verification at `/v3/prototype/observe-lens` (mock-driven, no API needed): all 6
  lenses render in the canonical shared order; TopBar / cycle spiral bar (CYCLE 1, Day 138/180,
  13d-to-review) / LensBar / DomainsRail (6 lenses + summaries) / PseudoMap (33-data-point
  overlay) / IntelligencePanel (Land State tab, Plan Review banner with both triggers, 33/8/3/5
  stats) all present. Water Domain-Detail slide-up opens with the hydrology specialised charts,
  all four sub-domain groups, the Divergence Records section, the filter bar, and the domain
  mini-map. No console errors from the prototype (only pre-existing AI-config/sync warnings).
- **`preview_screenshot` was unresponsive** (3 timeouts on a fully-settled `readyState:complete`
  page — the known transient hang, [[project_screenshot_hang]]). Per the project rule, visual
  parity was therefore evidenced structurally via DOM inspection, **not** claimed from a
  screenshot. A pixel-parity screenshot pass remains outstanding.
- Commit scope is exactly the 8 intended files; **no diffs touch `v3/observe/dashboard`** —
  existing Observe surfaces untouched.

## Deferred (explicitly not in scope)
Wiring to real `ObserveDataPoint`/`useDomainSnapshot`/live MapLibre; making this a real
`observeShellMode` or replacing the four surfaces; reskinning to `tokens.css`; lens-level
freshness rollup in the live dashboard; **the pixel-parity screenshot pass** (blocked on the
screenshot tool).

## Next session
Capture pixel-parity screenshots once the screenshot tool is responsive; then operator review
of the concept to decide whether/how it graduates from prototype to integrated surface.
