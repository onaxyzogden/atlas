# 2026-05-21 — Region-adjusted stewardship costs + `*Source[]` citation UI

**Branch.** `feat/atlas-permaculture`. Closes two of the five deferred
items recorded on the [habitat-features unification ADR](../decisions/2026-05-21-atlas-habitat-features-unification.md)
index row after Slice 8-D — **region-specific cost data** and the
**`*Source[]` citation UI** — and corrects the stale "still deferred"
wording for the two items that already landed (`hostTreeFeatureId` inline
popover via Slices 8-B/8-E; richer ARIA-grade tooltip via Slice 8-F). D1
auto-edges for agroforestry remain explicitly out of scope (the host-tree
edge pattern does not transfer to line/polygon plantings).

**Feature A — region-adjusted cost (commit `8f69d13b`).** Threads an
optional `region?: CostRegion` through `computeStewardshipProgramsCashflow`:
a new `scaleBand` helper multiplies the four install-cost bands (cover-crop
/ habitat / agroforestry / tree-planting) by `getRegionMultiplier(region)`
before accumulation; **labor hours are left unscaled** (the multiplier is a
cost index, not a labor index). Default `mult = 1` ⇒ existing rollups
byte-identical. New `getRegionMultiplier` accessor exported over the private
`REGION_MULTIPLIERS` in `costDatabase.ts`; new pure
`deriveCostRegion(country, provinceState)` in `regionLocality.ts` (CA
provinces → `ca-ontario`/`ca-bc`/`ca-prairies`; US states bucketed into the
four Census regions; INTL/unknown → `us-midwest` neutral ×1.00 — documented
coarse approximation, the steward override being the precise control). New
persisted `stewardshipCostRegion: CostRegion | null` (+ setter, +
`partialize`) on `financialStore`.

**Feature B — `*Source[]` citation UI (commit `16c13941`).** New pure
`collectStewardshipCitations(...)` (`stewardshipCitations.ts`) mirrors the
rollup's join walk (WorkItem → DesignElement → catalog entry), normalizes
the three structurally-parallel source shapes (`HabitatSource` /
`AgroforestrySource` / `TreePlantingSource`) into one `Citation` form (NRCS
→ `label` = code; extension → `label` = org), and gathers the set deduped
by `kind + ref` — citing **only the kinds actually placed**. New
`CitationSection.tsx` + `.module.css` clone the `EvidenceSection` a11y idiom
(`aria-expanded`, ESC restores focus, `prefers-reduced-motion`;
`compactMode || empty ⇒ null` mobile guard) and render a collapsible
"Sources (N)" disclosure with NRCS-vs-extension pills. The
`StewardshipProgramsCashflowCard` gains a `RegionSelect` `<select>` (first
option `Auto — <derived label>`, then the seven regions; persists to
`financialStore`) feeding `effectiveRegion = stewardshipCostRegion ??
derivedRegion` into the rollup, a region-adjusted lede note (`×{mult}`), and
the `CitationSection` mount below the table. Cover-crop costs carry a flat
`citation` string (not a `*Source[]` array) and are intentionally out of
scope.

**Verification.** `apps/web` `tsc --noEmit` — only the three pre-existing
foreign errors (`StepBoundary.tsx`, `HostUnion*` test files); no new errors
on any Feature A/B surface. `vitest run` on the three new/extended files →
**24/24** (`regionLocality` 6, `stewardshipCitations` 4,
`stewardshipProgramsCashflow` 14 — incl. the new region-scales-cost /
labor-unchanged + ×1.00-identity cases). Covenant grep across all changed
files — zero hits outside in-file disclaimer docstrings.

**Mount discipline.** All new UI mounts into
`StewardshipProgramsCashflowCard.tsx`, never the foreign-owned
`EconomicsPanel.tsx`.

**Rebase-storm — merge over rebase to respect a foreign boundary.** A
concurrent session's persist-rehydrate instrumentation (`3a83ad4b` +
`9bd70700`, ~65 stores touched incl. `financialStore.ts`) landed on origin
mid-flight. The working tree carried unrelated foreign-WIP edits
(`capitalPartnerSummary.ts`, `EconomicsPanel.*`,
`CapitalPartnerSummaryExport.tsx`, `SectorCompassOverlay.tsx`,
`capitalPartner.ts`) that a rebase could not clear past without stashing —
and stashing another session's work crosses a boundary. So the two feature
commits were landed first (protecting the verified work per
[[feedback-commit-immediately-on-rebased-branches]]), then origin was
**merged** in: git auto-resolved `financialStore.ts` 3-way (the new
override field and the upstream `rehydrateWithLogging` import coexist), and
the merge touched zero foreign-WIP files (no overlap with the persist
changeset). ADR: [[decisions/2026-05-21-atlas-stewardship-region-cost-and-citations]].
