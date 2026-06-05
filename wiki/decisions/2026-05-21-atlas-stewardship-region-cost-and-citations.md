# ADR — Atlas: Region-Adjusted Stewardship-Program Costs + `*Source[]` Citation UI

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Sub-project:** Stewardship-program cashflow — closing two unification-ADR deferrals
**Status:** Accepted — shipped in commits `8f69d13b` (Feature A) and
`16c13941` (Feature B), plus this ADR.
**Related:** [[2026-05-21-atlas-habitat-features-unification]],
[[2026-05-21-atlas-habitatfeaturestore-retirement]]

---

## Context

The 2026-05-21 habitat-features unification
([[2026-05-21-atlas-habitat-features-unification]]) shipped the full
stewardship-program cashflow stack (cover-crop + habitat + agroforestry +
tree-planting rollup, the `StewardshipProgramsCashflowCard`, and structured
`*Source[]` citation arrays in every catalog). Its index row recorded five
items still deferred after Slice 8-D. Two of those are closed here; the
other three are already done or explicitly out of scope:

- **Feature A — Region-specific cost data.** The cashflow rollup reported
  raw national-average catalog costs with no regional adjustment, even
  though the financial engine already carries a 7-region multiplier table
  (`REGION_MULTIPLIERS` in `costDatabase.ts`). **Closed here.**
- **Feature B — `*Source[]` citation UI.** Each catalog entry (habitat /
  agroforestry / tree-planting) carries a structured `sources` array (NRCS
  practice codes + extension orgs), but these rendered **nowhere**.
  **Closed here.**
- **`hostTreeFeatureId` inline popover — already done.** Landed in Slice
  8-B / 8-E. The index "still deferred" wording was stale; corrected as
  part of this change.
- **Richer ARIA-grade tooltip — already done.** Closed by Slice 8-F (the
  design-system `Tooltip` primitive replaced the native `title`).
- **D1 auto-edges for agroforestry — skipped.** The unification ADR itself
  doubts the `hostTreeFeatureId` host-tree edge pattern transfers cleanly
  to line / polygon plantings; deferred until a concrete steward need
  exists.

## Decision

1. **Derive the cost region from the project's location, with a manual
   steward override.** A new pure `deriveCostRegion(country, provinceState)`
   maps the project location to one of the seven `CostRegion` buckets; the
   `StewardshipProgramsCashflowCard` defaults to that derived region and
   exposes a `<select>` whose first option is `Auto — <derived label>`. The
   override persists in `financialStore.stewardshipCostRegion`
   (`null` = auto).
2. **Surface the catalog `*Source[]` arrays via a disclosure modeled on
   `EvidenceSection`.** A new pure `collectStewardshipCitations(...)`
   normalizes the three structurally-parallel source shapes into one
   `Citation` form and gathers the deduped set for the kinds actually
   placed; a new `CitationSection` component discloses them as a
   collapsible "Sources (N)" panel below the cashflow table.

## Posture

- **Covenant-grounded, additive.** No riba / gharar / CSRA / salam /
  investor / financing / cost-of-capital framing. The region multiplier is
  a **cost index** applied only to the four install-cost bands; **labor
  hours are never scaled**. Citations are pure provenance disclosure.
- **Stewardship sovereignty preserved.** The derived region is a *default*,
  always visibly overridable — the steward sees and controls it. The system
  never silently invents a region. Citations cite only the programs the
  steward has actually placed (an empty agroforestry program contributes no
  agroforestry citation).
- **Coarse-by-design region mapping.** `deriveCostRegion` is documented as
  an approximation (CA provinces and US Census buckets); the override is the
  precise control. Unknown / INTL locations fall back to `us-midwest`
  (neutral ×1.00).

## Scope decisions

| Decision | Choice |
|---|---|
| Region cost source | **Derive from project country + provinceState, steward-overridable** — not a free-form number entry |
| What the multiplier scales | **The four install-cost bands only** — cover-crop, habitat, agroforestry, tree-planting; labor hrs stay unscaled (cost index, not labor index) |
| Override persistence | `financialStore.stewardshipCostRegion: CostRegion \| null` (`null` = auto), in `partialize` |
| Default behaviour | `region` omitted ⇒ `mult = 1` ⇒ existing rollups byte-identical (tests unchanged) |
| Citation scope | **Only catalogs that placed an element are cited**; deduped by `kind + ref`. Cover-crop costs carry a flat `citation` string, not a `*Source[]` array, so they are intentionally out of scope |
| Citation UI pattern | **Cloned from `EvidenceSection`** (aria-expanded, ESC restores focus, prefers-reduced-motion); `compactMode \|\| empty ⇒ null` (mobile guard) |
| Mount site | **`StewardshipProgramsCashflowCard.tsx` only** — never the foreign-owned `EconomicsPanel.tsx` |
| `hostTreeFeatureId` popover / ARIA tooltip | **Out — already landed** (Slices 8-B/8-E and 8-F); index wording corrected |
| D1 agroforestry auto-edges | **Out — skipped**; host-tree edge pattern doesn't transfer to line/polygon plantings |

## Files

**Feature A — region-adjusted cost (commit `8f69d13b`):**
- `apps/web/src/features/financial/engine/costDatabase.ts` — exported
  `getRegionMultiplier(region)` over the private `REGION_MULTIPLIERS`.
- `apps/web/src/features/financial/engine/regionLocality.ts` — **new**
  pure `deriveCostRegion(country, provinceState)` (CA-province +
  US-Census-bucket maps; INTL/unknown → `us-midwest`).
- `apps/web/src/features/economics/stewardshipProgramsCashflow.ts` —
  optional `region?: CostRegion` arg; `scaleBand` helper scales the four
  cost bands by `getRegionMultiplier(region)`; labor untouched.
- `apps/web/src/store/financialStore.ts` — persisted
  `stewardshipCostRegion` field + `setStewardshipCostRegion` action.
- `apps/web/src/features/financial/engine/__tests__/regionLocality.test.ts`
  — **new** (6 bucket cases).
- `apps/web/src/features/economics/__tests__/stewardshipProgramsCashflow.test.ts`
  — extended (region scales cost ×1.20, labor unchanged; omitted region is
  the ×1.00 identity).

**Feature B — citation UI (commit `16c13941`):**
- `apps/web/src/features/economics/stewardshipCitations.ts` — **new** pure
  `collectStewardshipCitations(...)` + `normalizeSource` + `Citation` type.
- `apps/web/src/components/evidence/CitationSection.tsx` +
  `CitationSection.module.css` — **new** disclosure modeled on
  `EvidenceSection`.
- `apps/web/src/features/economics/__tests__/stewardshipCitations.test.ts`
  — **new** (normalize, dedupe, present-kind filter, ignore
  cross-project/wrong-source/orphan).
- `apps/web/src/features/economics/StewardshipProgramsCashflowCard.tsx` —
  region `<select>` (`RegionSelect`) feeding the rollup, region-adjusted
  lede note, and the `CitationSection` mount below the table.

## Verification

1. **Typecheck:** `cd apps/web && tsc --noEmit` (8 GB heap) — only the
   pre-existing foreign errors remain (`StepBoundary.tsx`,
   `HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`); no
   new errors on any Feature A/B surface.
2. **Tests green:** `vitest run` on the three new/extended files →
   24/24 (regionLocality 6 + stewardshipCitations 4 +
   stewardshipProgramsCashflow 14).
3. **Covenant grep** across all changed files — zero hits for
   `riba|gharar|csra|salam|investor|financing|cost-of-capital` outside the
   in-file disclaimer docstrings.

## Consequences

- **Closes two unification-ADR deferrals.** The region-specific-cost and
  `*Source[]` citation-UI items on the
  [[2026-05-21-atlas-habitat-features-unification]] index row are struck.
- **Costs are now region-aware; labor is not.** The cashflow card's lede
  states the active multiplier; the rollup default (`mult = 1`) keeps every
  existing consumer and test unchanged.
- **Provenance is now visible.** Stewards can see exactly which NRCS
  practices and extension-org references back each placed program's costs.
- **Merge over rebase to respect a foreign boundary.** A concurrent
  session's persist-rehydrate instrumentation (two commits touching ~65
  stores, including `financialStore.ts`) landed on origin mid-flight. The
  working tree carried unrelated foreign-WIP edits a rebase could not be
  cleared past without disturbing them, so the two feature commits were
  landed first, then origin was **merged** in (auto-resolved
  `financialStore.ts` 3-way — my override field + the upstream
  `rehydrateWithLogging` import coexist), per
  `~/.claude/memory/feedback_commit_immediately_on_rebased_branches.md`.
