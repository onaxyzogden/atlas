# 2026-04-25 — §19 EducationCoverageCard shipped (commit `c58dbfb`)


Feature → educational-mode coverage matrix mounted on `EducationalAtlasDashboard`
between the rationale-index card and `GatheringRetreatCard`. The dashboard
already exposes six interpretive modes (ecology / water / livestock /
agroforestry / regeneration / spiritual) but a steward couldn't see, at a
glance, which modes had material to draw from — a "spiritual" mode is
hollow without a prayer space, a "livestock" mode is hollow without
paddocks. This card surfaces that signal directly.

**Files:**
- `apps/web/src/features/education/EducationCoverageCard.tsx` (~280 lines)
- `apps/web/src/features/education/EducationCoverageCard.module.css` (~210 lines)
- `apps/web/src/features/dashboard/pages/EducationalAtlasDashboard.tsx` —
  import + mount
- `packages/shared/src/featureManifest.ts` — `clickable-hotspots-side-panel`
  (§19) `partial` → `done`

**Logic:**
- Inline `MODES` catalog mirrors the six dashboard modes; each mode declares
  the structure types, zone categories, utility types, path types, and crop
  types it interprets, plus whether paddocks count. Mappings are intentionally
  inclusive (food-production zones feed both ecology and agroforestry).
- For each mode: tally matched features across all six entity types and
  classify as `rich` (≥ 3), `light` (1–2), or `orphan` (0).
- KPIs: rich count, light count, orphan count, feature coverage % (share
  of placed features that ride at least one mode).
- Orphan callout lists hollow modes inline with a "seed hint" per mode
  describing what to add (e.g. "Add a prayer-space structure or designate
  a spiritual zone").
- Per-mode row: icon, label + dominant feature breakdown, count, tag.
- Empty-state branch when project has zero features.

**Manifest target rationale:** `clickable-hotspots-side-panel` (§19, P3)
specifies "clickable hotspots, side panel explanations". The card is the
data-side index those side-panels would render from — the matrix that
links each placed feature to the modes that should illuminate when it's
clicked. Three modes (`rationale-cards-purpose-meaning`,
`ecology-water-livestock-agroforestry-modes`, `spiritual-symbolism-regeneration-modes`)
remain at MT phase as planned for content-rich expansion.

**Coordination note:** parallel session had flipped `punch-list-site-verification`
(§24) from `planned` → `partial` between manifest reads. Reverted that line
on disk before committing to keep the §19 commit clean and let the §24
ship land in its own commit.

Type-check clean (`tsc --noEmit` exit 0).
