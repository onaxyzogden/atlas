---
title: Plan-Soil reads Observe conventional-crop heritage
date: 2026-05-14
status: accepted
stage: plan
module: soil-fertility
---

# Plan-Soil reads Observe conventional-crop heritage

## Context

The same-day `conventionalCrop` Observe annotation captures the practice
history of inherited cropland — compaction, input regime, tillage,
irrigation, primary crop. Plan-stage Soil cards (`SoilBaselineCard`,
`SoilBuildingPlanCard`) diagnose today's soil state via jar/perc/pH
tests but had no read surface for *yesterday's causes*. A steward
entering a soil baseline saw the chemistry but not the practice that
produced it; the soil-building plan named limiting factors but not the
upstream tillage / synthetic-input legacy driving them.

Wiring the two stages closes the loop: Observe authors heritage,
Plan-Soil reads it alongside the live diagnosis so restoration design
names what to *undo* before what to *add*.

## Decision

New pure helper `conventionalCropHeritage.ts` co-located with the
Soil-fertility cards. `deriveHeritageHints(c)` maps compaction / inputs
/ tillage / irrigation values to severity-tagged restoration moves:

- **Severe compaction** → Keyline subsoiling + daikon / tillage-radish
- **Moderate compaction** → Deep-rooted cover crops, no wet-soil traffic
- **Synthetic inputs** → Biology rebuild via compost tea + cover-crop
  diversity; 2–3 yr transition
- **Mixed inputs** → Phase synthetic share down over 2–3 seasons
- **Intensive tillage** → No-till transition; SOM rebound 3–5 yr
- **Conventional tillage** → Reduced-till / roller-crimper retention
- **Flood irrigation** → Drip / subsurface; check salinity
- **Sprinkler irrigation** → Drip retrofit; evaporative + disease wins

Two consumer surfaces:

1. **`SoilBaselineCard`** — new "Conventional-crop heritage (from
   Observe) — N" section between Saved readings and Reading details.
   Per-polygon row: title (label / primaryCrop / kind), inline practice
   line, severity-coloured hint list. Hidden when no polygons exist.
2. **`SoilBuildingPlanCard`** — new "0 · Inherited practice (from
   Observe)" prelude before step 1 (Diagnose now). Same data, framed as
   yesterday's causes feeding into today's limiting factors. Joins the
   `empty` predicate so the empty-state still triggers when neither
   tests nor heritage exist.

### Why a shared helper file

Both cards re-derive on the same axes. Co-locating the helper avoids
the read-only duplication trap that `SoilBaselineCard.deriveLimits` /
`SoilBuildingPlanCard.deriveLimits` fell into for jar-test limits.
Single source of truth for the hint copy.

### Why read-only

Observe owns polygon authoring (`ConventionalCropTool` +
`conventionalCropStore`). Plan-Soil only subscribes. Stage separation
per 2026-05-08 ADR preserved — Plan designs, Observe notes existing.

### Why not also derive limiting factors

`SoilBaselineCard.deriveLimits` operates on jar-test numerics
(sand/silt/clay/perc/pH). Heritage is a parallel axis — compaction
*history* may not match clay-content *today* if the steward has been
covering for years. Keeping the two derivations parallel avoids
double-counting moves and lets the steward read each row at face value.

## Files

**New:**
- `apps/web/src/v3/plan/cards/soil-fertility/conventionalCropHeritage.ts`

**Edits:**
- `apps/web/src/v3/plan/cards/soil-fertility/SoilBaselineCard.tsx` —
  store subscription, heritage section JSX, severity-colour map.
- `apps/web/src/v3/plan/cards/soil-fertility/SoilBuildingPlanCard.tsx`
  — store subscription, "0 · Inherited practice" section, `empty`
  predicate includes `heritagePolygons.length`.

## Out of scope

- Per-zone matching (heritage polygons aren't `zoneId`-keyed; spatial
  intersection against soil-test zones is a follow-up).
- Write-back from Plan to Observe (would violate stage separation).
- Pulling heritage into other Plan modules (Water, Plant Systems,
  Phasing). Each has its own design surface; wire as those surfaces
  surface a clear need.
- Vibe-coding the polygon onto the Plan-Soil card map preview.

## Verification

- `tsc --noEmit` from `apps/web` — clean (8GB heap).
- `npm run lint` — exit 0.
- Browser preview at `/v3/project/mtc/plan` → Soil module, against a
  seeded `cc-test-*` polygon (annual-row · severe compaction ·
  synthetic inputs · intensive tillage · sprinkler):
  - Baseline tab: "Conventional-crop heritage (from Observe) — 1"
    section renders; all four hints (Severe compaction · Synthetic
    input legacy · Intensive tillage history · Sprinkler-irrigation
    legacy) present.
  - Soil-building plan tab: "0 · Inherited practice (from Observe)"
    prelude renders before "1 · Diagnose now"; same four hints.
  - Section hidden when no polygons exist for the project.
- No console errors. Seed cleaned up.
