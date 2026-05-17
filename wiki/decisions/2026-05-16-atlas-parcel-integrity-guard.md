# 2026-05-16 — Parcel-area integrity guard + Water-balance honesty (no confident zeros)

**Status:** Accepted · `feat/atlas-permaculture`
**Scope:** new [apps/web/src/v3/data/parcelIntegrity.ts](apps/web/src/v3/data/parcelIntegrity.ts) · [apps/web/src/v3/data/adaptLocalProject.ts](apps/web/src/v3/data/adaptLocalProject.ts) · [apps/web/src/v3/types.ts](apps/web/src/v3/types.ts) · [apps/web/src/v3/pages/ReportPage.tsx](apps/web/src/v3/pages/ReportPage.tsx) · HomePage/ProvePage · [apps/web/src/v3/data/generateProjectReport.ts](apps/web/src/v3/data/generateProjectReport.ts) · generateProveBrief.ts · [apps/web/src/v3/plan/cards/water-management/waterMath.ts](apps/web/src/v3/plan/cards/water-management/waterMath.ts) · WaterNetworkCard.tsx · WaterCatchmentsCard.tsx · [apps/web/src/lib/geo.ts](apps/web/src/lib/geo.ts)
**Builds on:** [[2026-05-16-atlas-v3-in-canvas-acreage-recompute]] (that ADR makes a *drawn* boundary persist acreage; this one governs the case where acreage is *still* missing/zero)
**Driven by:** `docs/ux-walkthrough-regen-farm-run2-2026-05-16.md` findings #77/#78

## Context

The run-2 regen-farm UX walkthrough found a naive user completing a full
design and being shown a confident **"ON, CA · 0 ha · Supported · 67/100 ·
0 blocking issues"** Report. Two *independent* root causes:

1. **False-confidence Report.** Acreage is computed correctly client-side
   (geodesic `turf.area` via `parcelAcreage`, both wizard and v3 redraw
   paths — untouched). But when no usable area exists,
   `adaptLocalProject.ts` silently coerced `null → 0` (`p.acreage ?? 0`),
   hardcoded `blockers: []`, and let the verdict fall through to a
   derived/placeholder **"Supported"**. An unknown area was rendered as a
   confident zero *with a support verdict asserted on top of it*.
2. **Water balance silently reading 0** (a *separate* root cause — the
   walkthrough's "0-ha is the root of the Water balance" premise was
   wrong, surfaced honestly to the user). `catchmentYieldM3` reads each
   node's *manually-entered* `areaM2`; an unset area yields `0 m³` and
   collapses the whole balance to a confident `0` with no warning.

User-approved scope (AskUserQuestion): (1) include the Water fix; (2)
**hard-degrade** the verdict — a null/0-area project must read
"Insufficient Data — cannot assess", not merely wear a badge.

**Amanah Gate:** Passed — data-integrity/honesty fix for a halal
land-stewardship tool; no riba/gharar.

## Decision

**Single guard seam + UI-level honesty, no new area math.**

- **`v3/data/parcelIntegrity.ts`** (new — the one integrity-decision
  module): `isParcelAreaValid(p)` = `typeof a==='number' &&
  Number.isFinite(a) && a>0` (null/0/neg/NaN/Infinity all invalid);
  `formatLocationArea(loc)` → `"Area not set"` when `areaKnown===false`,
  else `"${acreage} ${unit}"`; explicit constants `INTEGRITY_BLOCKER`
  (severity `blocking`) and `INSUFFICIENT_DATA_VERDICT` (`status:'blocked',
  score:0`) — **not** routed through `adaptVerdict`/`VERDICT_TABLE` so a
  future scoring-table edit can't silently soften it.
- **`adaptLocalProject.ts`** is the sole seam every non-`mtc` project
  flows through: `const areaValid = isParcelAreaValid(p)` →
  `acreage: areaValid ? p.acreage : 0`, `location.areaKnown: areaValid`,
  `verdict: !areaValid ? INSUFFICIENT_DATA_VERDICT : (derived ? … :
  PLACEHOLDER_VERDICT)`, `blockers: areaValid ? [] : [INTEGRITY_BLOCKER]`.
  The scorer input line (`p.acreage ?? null`) is **left unchanged** —
  already passes `null`; the verdict override supersedes it and touching
  it risks scorer regressions.
- **`types.ts`** — `ProjectLocation` gains optional `areaKnown?: boolean`
  (optional ⇒ no fixture / `mtc` breakage; absence = known).
- **Five display surfaces** (Report/Home/Prove pages + the Markdown report
  & Prove-brief generators) route through the shared `formatLocationArea`
  helper rather than each re-implementing the ternary.
- **Water (`waterMath.ts`)** — added `DEFAULT_AREA_M2` (roof 80 / gravel
  150 / pasture·forest 1000 — flagged product-review placeholders),
  `GROUND_SURFACES` (roofs excluded — parcel area must never auto-apply to
  a roof), `isCatchmentAreaInvalid`, `incompleteCatchments`. The existing
  `catchmentYieldM3` numeric guard is **kept** as the safety net.
- **`lib/geo.ts`** — added `parcelAreaM2(geo)` (raw geodesic m²,
  best-effort `try/catch→null`) beside `parcelAcreage` (which stays the
  canonical rounded ha/ac source, untouched). All area math stays in
  `geo.ts`.
- **WaterNetworkCard / WaterCatchmentsCard** — when any catchment is
  invalid: yield/retained/lost/peak read **"incomplete: N catchment(s)
  have no area"** in the warn colour (never a silent `0.0 m³`); the
  Validation pane lists each incomplete node and the "✓" empty-state
  requires `incomplete.length===0`. Catchments ledger rows show
  "⚠ No area set — excluded from balance"; new catchments pre-fill a
  surface-aware non-zero default; ground-surface catchments offer a
  one-click "Use parcel area (≈ N m²)" (add-form + per-row legacy repair).
  No `waterSystemsStore` migration (field already optional; invalidity
  caught at render).

## Why

- **One seam, not N call sites.** `adaptLocalProjectToV3` is the single
  point every non-`mtc` project (wizard-created, Observe-redrawn,
  siteData-incomplete offline) passes through; guarding here covers all
  entry paths with one decision.
- **Explicit verdict constant, not table-routed.** The honest "blocked"
  must be immune to future `VERDICT_TABLE` softening — so it is a literal
  constant, deliberately bypassing `adaptVerdict`.
- **Persist-consistent with the prior ADR.** [[2026-05-16-atlas-v3-in-canvas-acreage-recompute]]
  makes a drawn boundary persist real acreage; this ADR is the honest
  fallback for when none exists — the two compose, they don't overlap.
- **Water is UI-gated, not store-migrated.** A partial design must still
  show its valid per-row yields; only the *aggregate* is gated, with a
  named reason — never destroy data to enforce honesty.

## How to apply

Any new surface that displays parcel area must use `formatLocationArea`
(never raw `location.acreage`). Any new verdict/scoring path must respect
that `!isParcelAreaValid` ⇒ `INSUFFICIENT_DATA_VERDICT` — do not introduce
a code path that asserts site fit on an unknown area. Any new water-yield
surface must gate its aggregate on `incompleteCatchments(...)` rather than
presenting a guard-zeroed sum as a result.

## Consequences

- A project with missing/zero parcel area can **never** present as
  "0 ha · Supported": Report shows "Area not set", verdict
  "blocked / Insufficient Data — cannot assess" (score 0), and ≥1 blocking
  issue. A valid-area project is byte-for-byte unchanged.
- The Water balance can never silently read `0.0 m³` from an unset
  catchment area; new catchments default non-zero; ground catchments offer
  one-click parcel-area.
- `DEFAULT_AREA_M2` numbers are product-sensitive placeholders flagged for
  review.

## Out of scope (deferred)

- Backend `ST_GeomFromGeoJSON(FeatureCollection)` → server acreage 0, and
  `applyServerAcreage` ([apps/web/src/lib/syncService.ts](apps/web/src/lib/syncService.ts):190-200,227,291)
  overwriting a good local acreage with that 0. Online-only; backend down
  in the offline target. Tracked as a guarded follow-up.

## Verification

- `corepack pnpm --filter @ogden/web typecheck` (8 GB heap) — `tsc
  --noEmit` exit 0. `lint` = `tsc --noEmit` (identical compile; only OOMs
  at default heap — equivalence covered by the passing typecheck).
- **Offline, real Vite modules → store → adapter → live pages** (DOM-text
  asserts; `preview_screenshot` timed out twice on the WebGL map canvas —
  disclosed not faked, per project convention; the precise numeric/string
  assertions are strictly stronger than a screenshot):
  - **Case A** (acreage `null`, no boundary): header "US · Area not set",
    verdict "0 · Insufficient Data — cannot assess", "Blocking Issues (1)"
    (the integrity blocker), all six scores "Insufficient Data".
  - **Case B** (acreage `0`): identical correct degrade.
  - **Case C** (valid 12 ha control): unchanged — "ON, CA · 12 ha",
    "49 Conditional", "Blocking Issues (0)". The guard does not regress
    valid projects.
  - **Water**: zero-area catchment → "⚠ No area set — excluded from
    balance"; ledger total → "incomplete: 1 catchment has no area"; Network
    card gates yield/retained/lost/peak ("Lost off-site — 1 catchment has
    no area set, so the balance cannot be computed"); surface-aware
    defaults (metal_roof→80, pasture→1000); "Use parcel area
    (≈ 112939 m²)" appears for pasture, absent for roof; all-valid
    regression computes real "82.6 m³ · 82.6 kL" with no incomplete
    gating.
- Injected localStorage test fixtures removed afterward; baseline
  walkthrough docs left byte-for-byte unmodified; no commits (not
  requested).
