---
title: Atlas Plan — Module 7 Broiler Product Map (post-farm-gate value chain)
date: 2026-05-10
status: accepted
tags: [atlas, plan, agribusiness, broiler, slaughter, cold-chain, market, newman, yeomans-10]
---

# Module 7 — Broiler Product Map

## Context

The [2026-05-10 Farm-Scholar Module 6 verdict](2026-05-10-atlas-plan-module6-livestock-farm-scholar.md)
explicitly named the **agribusiness layer** — slaughter → butchery →
pack → freeze → rendering → market/distribution — as out-of-scope for
the Livestock pass and tracked it as the next-session candidate.
Newman, *First Generation Farming*: a farm designed in isolation from
the agribusiness interface is *"a ticking timebomb."*

This ADR establishes the new Plan-stage module that closes that gap.

## Decision — add Module 7 "Broiler Product Map" at Yeomans rank 10

- **Placement:** between `livestock` (rank 9) and `plant-systems` in
  `PLAN_MODULES`. Yeomans' Scale of Permanence treats subdivision (9)
  as the floor of *land* design; post-farm-gate value-chain
  infrastructure sits one tick further toward malleability (rank 10,
  Atlas-specific extension — Yeomans himself stopped at 8/soil).
- **Short label:** `Broiler Map`. **Full label:** `Broiler Product Map`.
- **Module slug:** `broiler-product-map`.
- **Scope:** Spatial **and** diagnostic. Three Point draw tools, three
  non-spatial diagnostic cards.

## Surface

### Three Point draw tools (spatial)

| Tool | Geometry | Popover fields | Render |
|---|---|---|---|
| **Slaughter Point** | `Point` | `name`, `kind` (mobile / on-farm / shared / contract), `capacityBirdsPerDay` | red dot on `plan-data-point` |
| **Cold-Chain Unit** | `Point` | `name`, `kind` (freezer / chiller / blast / reefer), `capacityM3` | blue dot |
| **Market Node** | `Point` | `name`, `kind` (farmstand / wholesale / restaurant / csa-dropoff), `weeklyDemandKg` | green dot |

All three follow the **persist-first lifecycle** proven in
`FenceLineTool` and `PaddockTool` (skeleton on `draw.create`, patch on
Save, remove on Cancel/ESC).

### Three diagnostic cards (non-spatial)

| Card | Readout |
|---|---|
| **SlaughterThroughputCard** | Heads/yr × dressed-weight × line-rate → required stations vs. configured `slaughterPoints[]` |
| **ColdChainCoverageCard** | Sum `coldChainUnits[].capacityM3` vs. peak-week pack volume from throughput card → coverage % |
| **MarketDistributionCard** | `marketNodes[]` count, weekly demand vs. throughput, drive-time rollup |

Cards reuse the `MultiSpeciesPlannerCard` pattern: `{ projectId }`
prop, Zustand selector, `useMemo`-derived rollups, companion
`.module.css`.

## Why a separate `agribusinessStore`

Newman frames the value chain as a *distinct domain* from the
on-farm livestock decisions. The rank-9 / rank-10 split is real:

- `livestockStore` answers *"what animals on what land?"*
- `agribusinessStore` answers *"how does the product leave the gate?"*

Keeping the slices separate (a) preserves the Module 6 schema
untouched, (b) makes future Halal-certification overlays
(slaughter-point-specific) easy to layer on without polluting
livestock, and (c) matches the Farm-Scholar's framing.

## Schema

```ts
type SlaughterKind = 'mobile' | 'on-farm' | 'shared' | 'contract';
type ColdChainKind = 'freezer' | 'chiller' | 'blast' | 'reefer';
type MarketKind = 'farmstand' | 'wholesale' | 'restaurant' | 'csa-dropoff';

interface SlaughterPoint {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: SlaughterKind;
  capacityBirdsPerDay: number;
  phase: PhaseTag;
}

interface ColdChainUnit {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: ColdChainKind;
  capacityM3: number;
  phase: PhaseTag;
}

interface MarketNode {
  id: string;
  name: string;
  geometry: GeoJSON.Point;
  kind: MarketKind;
  weeklyDemandKg: number;
  phase: PhaseTag;
}
```

CRUD: `add/update/remove` per slice. All defaults `[]` so existing
canvases stay unaffected.

## Out of scope (deferred)

- **Rendering / by-product capture** as its own visual layer — folded
  into `MarketDistributionCard`'s by-product line item only. Full
  rendering module is post-MVP.
- **Mobile-Processing-Unit (MPU) routing** — Newman's later chapters
  treat MPU logistics; out of v1.
- **Halal certification overlay** on slaughter points — flagged for a
  Scholar Council review pass before any UI claim. The `kind`
  enumeration leaves room (e.g. future `kind: 'halal-certified'`)
  without committing.
- **Three-sisters / new species additions** to `plantDatabase.ts` —
  still deferred from the Livestock pass.

## Files touched

- `apps/web/src/store/agribusinessStore.ts` — new slice.
- `apps/web/src/v3/plan/draw/tools/SlaughterPointTool.tsx`
- `apps/web/src/v3/plan/draw/tools/ColdChainUnitTool.tsx`
- `apps/web/src/v3/plan/draw/tools/MarketNodeTool.tsx`
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — three switch cases.
- `apps/web/src/v3/plan/PlanTools.tsx` — `broiler-product-map` group.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — render the three
  kinds on `plan-data-point` (colour-coded).
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` —
  `MapToolId` union extended.
- `apps/web/src/v3/plan/types.ts` — `PlanModule` union + `PLAN_MODULES`
  + both label maps + `MODULE_CARDS`.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — three sectionId cases.
- `apps/web/src/features/agribusiness/SlaughterThroughputCard.tsx`
- `apps/web/src/features/agribusiness/ColdChainCoverageCard.tsx`
- `apps/web/src/features/agribusiness/MarketDistributionCard.tsx`
- Companion `*.module.css` for each card.

## Related

- [2026-05-10 atlas-plan-module6-livestock-farm-scholar](2026-05-10-atlas-plan-module6-livestock-farm-scholar.md)
  — names the agribusiness gap and tracks this module as the next
  candidate.

---

## 2026-05-10 addendum — fold-in to Livestock, species-agnostic rename

Same-day refinement. The steward's complaint: framing the module as
"Broiler" presumes every operator runs a chicken-for-meat enterprise.
The post-farm-gate value chain is species-agnostic — cattle, sheep,
goats, rabbits all need slaughter → cold chain → market. A top-level
peer module hard-codes a single enterprise type alongside Livestock
instead of expressing one application *of* livestock.

### Refinement

- **Drop `broiler-product-map` from the `PlanModule` union.** Plan
  modules go 12 → 11.
- **Fold the 3 diagnostic cards into Livestock** as a visually-separated
  *Product Chain* sub-group. `MODULE_CARDS` card shape gains an optional
  `group?: string`; `PlanModuleSlideUp` renders a small group-label
  divider in the tab row when a card's group differs from the previous
  card's group. Existing tab CSS reused; one extra class
  (`.tabGroupLabel`) plus `.tabSlot` for slot grouping.
- **Section IDs rename** `plan-broiler-*` → `plan-product-*`.
- **Tool IDs rename** `plan.broiler-product-map.*` →
  `plan.livestock.*`. Livestock's tool group grows from 2 (paddock,
  fence-line) to 5 (paddock, fence-line, slaughter, cold-chain, market).
- **What does *not* change.** `agribusinessStore` keeps its name, its
  interfaces (`SlaughterPoint`, `ColdChainUnit`, `MarketNode`), and its
  file location — the data layer is already species-neutral and
  renaming it would be churn for no user benefit. Card files stay in
  `apps/web/src/features/agribusiness/` as a logical grouping
  ("agribusiness" = post-farm-gate; still accurate).
- **Yeomans-rank distinction preserved conceptually** (livestock = 9,
  agribusiness = 10) via the group-label divider rather than a
  separate top-level tile. ADR's original rationale section above
  still holds; this addendum simply reasons that the UI does not need
  to materialise the rank-9-vs-10 distinction as two tiles when stewards
  effectively never use the post-farm-gate cards without livestock
  cards alongside.

### Verification

- `tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npx vitest run`: clean.
- Preview smoke (accessibility tree): PlanModuleBar shows 11 tiles
  (no Broiler Map); Livestock slide-up exposes 10 tabs in two groups
  with the "Product Chain" divider before the 8th tab; all three
  Product Chain cards mount; Livestock draw-tools rail shows 5 tools.
- Screenshot proof: unavailable — `preview_screenshot` timed out
  twice. eval-based verification stands in.

### Out of scope (carried forward)

- Renaming `agribusinessStore` / its interfaces.
- Species-aware fields on the cards (e.g. cattle slaughter weight).
- A separate Dairy-chain or Egg-chain sub-group. Defer until a steward
  requests it.

### 2026-05-10 follow-up — divider polish

Same-day visual polish on the group divider in `PlanModuleSlideUp`.
Steward picked the "gold accent ribbon" treatment over a two-row
sub-header, pill enclosure, or stronger inline vertical rule.

- Each grouped `<button>` gains a `css.tabGrouped` class alongside
  `css.tab` (and `css.tabActive` when current).
- New CSS rule
  `.tabGrouped { border-bottom-color: rgba(var(--color-gold-rgb), 0.35); }`
  gives the three Product Chain tabs a persistent faint-gold underline;
  `.tabGrouped:hover` bumps to `0.6`. `.tabActive` (declared later)
  still wins with full `var(--color-gold-brand)`, so the active grouped
  tab reads as full gold.
- Eyebrow `.tabGroupLabel` loses its redundant `border-left` rule
  (the underline ribbon now carries the grouping work) and tightens
  margins.

Verified via eval over the accessibility tree:
- 3 Product Chain tabs flagged `tabGrouped`; inactive
  `border-bottom-color` reads `rgba(212, 175, 95, 0.35)`.
- 7 livestock tabs unflagged; inactive `border-bottom-color` is
  `rgba(0, 0, 0, 0)`.
- Clicking a Product Chain tab promotes it to
  `border-bottom-color: rgb(212, 175, 95)` — full gold.

`preview_screenshot` was unresponsive again (third timeout this
sprint) — no visual proof captured.

### 2026-05-10 follow-up — shared per-project sizing slice

Same-day audit pass on the three Product Chain diagnostic cards.
Original implementation held annual head, dressed weight, processing
days, pack density, detour multiplier, and avg speed as card-local
`useState`. Two real problems fell out of that:

1. **Ephemerality.** Every input reset to default the moment the
   slide-up closed. Nothing the steward tuned persisted to the project.
2. **Cards disagreed about op size.** `SlaughterThroughputCard` derived
   peak-week pack from `(annualHead × dressedKg) ÷ (days/5)`, but
   `ColdChainCoverageCard` and `MarketDistributionCard` each held their
   own `peakWeekKg` / `weeklyProductKg` input defaulting to 720 — only
   accidentally correct for the 2,000-bird / 1.8-kg / 40-day baseline.
   Bumping head count in card 1 left cards 2 and 3 silently stale.

### Refinement

- New `AgribusinessSizing` interface in `agribusinessStore.ts`:
  `annualHead`, `dressedKg`, `processingDays`, `packDensityKgPerM3`,
  `detourMultiplier`, `avgSpeedKmh`. Exported alongside `DEFAULT_SIZING`
  (the 2,000-bird viability-floor numbers from the original ADR).
- Store gains `sizingByProject: Record<string, AgribusinessSizing>`,
  `getSizing(projectId)`, and `setSizing(projectId, patch)`. Same
  `persist` + `temporal` boundary as the entity slices, so sizing
  participates in undo and survives reloads.
- Persist version bumped 1 → 2.
- `SlaughterThroughputCard`: editable fields wire to `setSizing`.
- `ColdChainCoverageCard`: peak-week pack becomes a read-only derived
  field (`"<n> (from sizing)"`); pack density is the only editable knob
  and writes through to `sizing.packDensityKgPerM3`.
- `MarketDistributionCard`: weekly product becomes read-only derived;
  detour multiplier and avg speed write through to sizing.

### Verification

- `npm run typecheck` (apps/web) — clean.
- Preview eval round-trip: set Annual head = 5000 in the Slaughter
  throughput card; Cold-chain peak-week pack reads `1125 (from sizing)`,
  Market weekly product reads `1125 (from sizing)`. Derivation matches
  `5000 × 1.8 ÷ (40/5) = 1125`. Cross-card propagation confirmed.

### 2026-05-11 follow-up — unit lock on the peak-week formula

The arithmetic `(annualHead × dressedKg) ÷ max(processingDays/5, 1)` is
duplicated across `ColdChainCoverageCard` and `MarketDistributionCard`
(both derive their headline figure from it). Drift between the two
copies would silently desynchronise Module 7's downstream rollups from
the throughput card. To pin the formula:

- New pure module `apps/web/src/store/agribusinessSizing.ts` exports
  `AgribusinessSizing`, `DEFAULT_SIZING`, and `computePeakWeekKg(sizing)`.
  No zustand dependency, so vitest can import without crashing on
  `persist.rehydrate()` under node env (no localStorage).
- New `apps/web/src/store/__tests__/agribusinessStore.test.ts` — 6
  tests: ADR baseline (2,000-bird floor → 450 kg/wk), linear scaling
  with `annualHead` and `dressedKg`, 5-day-per-week processing-cadence
  treatment, divide-by-zero clamp at `processingDays < 5`, and the
  live verification round-trip (head=5000 → 1125 kg/wk).
- Cards continue to inline the same arithmetic by design — the helper
  is the documented lock, the cards are the runtime path. If the cards
  ever import `computePeakWeekKg` directly the test also locks the
  cards; until then it locks the documented formula.

### Out of scope (carried forward)

- Surfacing `phase` / `notes` fields on the three tool popovers.
- Tests on the throughput / coverage / concentration math (covered
  for peak-week-pack only; coverage/concentration still open).
- Species-aware sizing fields (cattle dress-out %, lamb hanging weight).
- Re-threading `computePeakWeekKg` into the two card components so
  the runtime path matches the tested function.
