# 2026-04-24 — lab + biological-activity card


Closes `manual-soil-test-entry` (featureManifest §7 Soil, Ecology &
Regeneration Diagnostics) — the remaining free-text soil gap above the
SSURGO / SoilGrids canonical layers.

### Shipped
- **`soilSampleStore.ts`** (new, 155 lines) — zustand + localStorage
  persist (`ogden-soil-samples` v1, mirrors `nurseryStore` shape).
  `SoilSample` captures date, label, optional point location, depth
  band (aligned to SoilGrids slices: `surface` / `0_5cm` / `5_15cm` /
  `15_30cm` / `30_60cm` / `60_100cm` / `100_200cm`), numeric lab
  fields (`ph`, `organicMatterPct`, `cecMeq100g`, `ecDsM`,
  `bulkDensityGCm3`), free-text `npkPpm`, 13-way USDA `texture`
  enum, 5-way `biologicalActivity` enum, `lab` source, and `notes`.
  Exports `TEXTURE_LABELS` / `DEPTH_LABELS` / `BIO_ACTIVITY_LABELS`
  vocabularies for downstream UI parity.
- **`features/soil-samples/SoilSamplesCard.tsx`** (new, ~410 lines) —
  card + inline disclosure form + row renderer. "Use boundary centre"
  button reuses the `boundaryCentroid` min/max-x/min/max-y helper
  pattern from `LogEventForm` (points can also be site-wide). Row
  shows a date header, depth + bio-activity chips (bio chip color-
  coded high/moderate/low/none/unknown), a metric grid of whichever
  numeric fields the steward entered, and the free-text notes.
- **`features/soil-samples/SoilSamples.module.css`** (new, ~260 lines)
  — visual language aligned with `RegenerationTimeline.module.css` so
  the two observation surfaces feel like one family on the dashboard.
- **`EcologicalDashboard.tsx`** — mounts `<SoilSamplesCard>` in both
  the env-data-loading skeleton state (so stewards can log during
  third-party API roundtrips) and the full dashboard (directly above
  `<RegenerationTimelineCard>`, below the EcologicalInterventions
  card).
- **`cascadeDelete.ts`** — `soilSamples` branch filters samples by
  `projectId` on project deletion. Samples are intentionally NOT
  cloned by `duplicateProject` — they are observations of the physical
  site, not design intent (mirrors how comments / fieldwork are
  excluded from `cascadeClone`).
- **`packages/shared/src/featureManifest.ts`** — `manual-soil-test-entry`
  planned → done (P2, §7).

### Verified
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
  --noEmit` — exit 0, zero diagnostics.
- Pre-existing triage errors previously listed under §7 / §1 batches
  remain resolved (no new diagnostics introduced by this change).

### Commit
- `1307caa` feat(soil): manual soil sample entry — lab + biological-
  activity card (6 files, +960 / -4)

### Scope discipline
- **Presentation-layer only.** No shared-package math added; no new
  server endpoints; no API schemas; no `computeScores.ts` inputs.
  `@ogden/shared` touched only for the manifest status flip.
- **Map overlay deferred.** The original proposal included sample pin
  overlays on the Mapbox canvas, but the manifest label is data-entry
  focused ("Manual soil test entry, biological activity notes") and
  the overlay scope would have tripled the change surface. Deferred
  to a follow-on §7 polish task; sample `location` already persists
  as `[lng, lat]` so the overlay can consume it directly later.
- **Clone exclusion rationale.** The clone/no-clone line for this
  card matches the one already codified in `cascadeClone.ts` comments:
  "design-intent data" is cloned (zones, structures, paths, utilities,
  crops, paddocks, phases); "project-specific runtime state" is not
  (comments, fieldwork, portal, scenarios, versions, regeneration
  events — now also soil samples).

### Not in scope
- Server-side persistence / sync (samples live in localStorage only).
- Edit flow for existing samples (add + delete only; deliberate v1
  minimum — no update UI yet).
- Map overlay classed circles keyed on pH or biological-activity
  band (see Scope discipline above).
- Export to the fieldwork PDF / CSV surfaces (follow-on).
- Trend plots across sample dates (needs ≥2 samples per location, no
  UI surface yet).
- Photo attachment on samples (`LogEventForm` media pattern is shipped
  but would require a storage path — deferred until samples earn a
  server table).
