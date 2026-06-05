# 2026-04-24 — Web tsc tightening to zero errors


**Symptom.** `apps/web` `tsc --noEmit` carried 9 errors across 3 sites, all from concurrent sprints that had landed references without their implementations:

1. `<Link to="/home">` in [`AppShell.tsx`](apps/web/src/app/AppShell.tsx) (\u00d72) and [`IconSidebar.tsx`](apps/web/src/components/IconSidebar.tsx) referenced a route the registry never declared.
2. [`SiteIntelligencePanel.tsx`](apps/web/src/components/panels/SiteIntelligencePanel.tsx) imported `SynthesisSummarySection` from `./sections/SynthesisSummarySection.js`, but the section file wasn't in HEAD. Working-tree copy also referenced a non-existent `.title` field on `AssessmentFlag`.
3. [`SolarClimateDashboard.tsx`](apps/web/src/features/climate/SolarClimateDashboard.tsx) imported `deriveInfrastructureCost` / `formatCostShort` / `estimateStructureHeightM` from `features/structures/footprints.ts` \u2014 none of those exports existed.

**Fix.**

- Routes: `/home` \u2192 `/` (the registered home path) in three Link sites.
- Synthesis section: added [`SynthesisSummarySection.tsx`](apps/web/src/components/panels/sections/SynthesisSummarySection.tsx) (\u00a74 Risk/Opportunity/Limitation TL;DR component) and dropped the dead `.title ??` fallbacks \u2014 `AssessmentFlag` exposes only `message`.
- Cost helpers: implemented in [`footprints.ts`](apps/web/src/features/structures/footprints.ts):
  - `estimateStructureHeightM(type)` \u2014 per-type ridge/eave height table (placeholder; should come off Structure once a height field is exposed).
  - `deriveInfrastructureCost(st)` \u2014 user-set `costEstimate` \u00b115% when present, otherwise type-template `costRange` scaled by placed/nominal area (clamped 0.5x..2x). Returns `{ low, mid, high, source, infraReqs }`.
  - `formatCostShort(value)` \u2014 short money formatter (`$25k` / `$1.2M` / `$850`).

**Verification.** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from `apps/web` now exits 0 with no output. Shared package typecheck unchanged (still clean). Scoring parity untouched.

### Deferred

- Real per-structure height (off `Structure.heightM` field) instead of the by-type lookup. Requires schema + UI work to capture height at placement time.
- Infrastructure cost: replace the area-scaled template band with a true bill-of-materials estimator once a structure-spec library exists. Current scaling is intentionally crude (0.5x..2x clamp).
