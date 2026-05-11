---
title: "Atlas Human Context report export (Observe export backlog closed)"
date: 2026-05-10
status: accepted
tags: [observe, exports, pdf, human-context, backlog-close]
supersedes: []
---

# Atlas Human Context report export (Observe export backlog closed)

## Context

After landing the Built Environment export (ADR
`2026-05-10-atlas-built-environment-export.md`) the only unshipped
Observe-stage PDF was Module 1 — Human Context. The locked 4-file
recipe established in the Topography ADR has now been exercised seven
times (Topography · EWE · Macroclimate · Sectors & Zones · Built
Environment · plus the three SWOT variants). Module 1 is the densest
"human" surface in the Observe rail — steward survey, indigenous &
regional context, vision detail, milestones — and not having a print
artefact for it was the visible asymmetry left in the rail.

## Decision

Ship the 8th Observe-stage PDF — `human_context_report` — following
the locked recipe.

## What shipped

### Schema (`packages/shared/src/schemas/export.schema.ts`)

- `'human_context_report'` appended to `ExportType` enum.
- New `HumanContextPayload`:
  - `steward` — full optional profile (name · age · occupation ·
    lifestyle · capacity hours · budget · skills · vision · core
    functions · experience goals · success metrics · principles ·
    guiding values · constraints · moodboard image **count**).
    Moodboard image data URLs deliberately omitted from payload —
    they're large base64 blobs and the print artefact only needs the
    count.
  - `regional` — indigenous names · cultural challenges · cultural
    strengths · local network (each entry: id · name · type ·
    contact).
  - `phaseNotes`, `milestones` — passed through verbatim from
    `visionStore`.
  - `archetype` — computed `{ name, blurb }` from `archetypeFor()`.
  - `totals` — pre-computed completeness percentages
    (`overallPct` · `stewardPct` · `regionalPct` · `visionPct`) +
    `totalHoursPerWeek` + counts. Templates don't recompute the
    derivations — same pattern as the EWE healthPct.
- `humanContext: HumanContextPayload.optional()` wired into
  `CreateExportInput.payload`.

### Template (`apps/api/src/services/pdf/templates/humanContextReport.ts`)

`renderHumanContextReport(data: ExportDataBag): string`. Structure:

- Gradient hero (Earth Green `#ECFDF5` → Harvest Gold `#FEF3C7`) with
  overall-health label (Strong / Forming / Sparse) and `overallPct`
  badge plus steward name/occupation + capacity hours.
- 4-column module-health KPI strip — People & Capacity · Place &
  Culture · Vision & Purpose · Milestones, each tone-coded by
  `healthTone(pct)`.
- Steward section — two-column grid: profile table (key/value rows
  for name · age · occupation · lifestyle · capacity hours · budget)
  + archetype card (Earth Green left border). Skills chip row below.
- Regional & indigenous section — chip rows for place-names / cultural
  strengths / cultural challenges, followed by a local-network table.
  Challenges chip-row label coloured crimson `#DC2626`; everything
  else stays Earth Green.
- Vision package — italic blockquote for the vision statement (gold
  left border), plus six chip rows for core functions / experience
  goals / success metrics / principles / guiding values / constraints.
- Phased intent table — three rows (Year 1 / Years 2–3 / Years 4+),
  each `<td>` falls back to `— not captured` when blank.
- Milestones table — note · phaseId · targetDate (fmt'd).
- Heuristic recommended actions — priority-coloured badges, covers
  survey gaps · network seeding · vision-statement gap · core-function
  gap · cultural-challenge mitigation · phased sketch · empty
  fall-through to "move to Macroclimate."
- `notAvailable()` empty state when `payload.humanContext` is absent.

### Registry (`apps/api/src/services/pdf/templates/index.ts`)

Imports `renderHumanContextReport` and registers
`human_context_report: renderHumanContextReport`.

### Dashboard handler (`apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx`)

- New imports: `useState`, `Download` (lucide), `api`, `pickTruthy`.
- `handleExport` async function:
  - Reads `steward`, `regional`, `phaseNotes`, `milestones` directly
    off the live `vision` object.
  - Derives all four completeness pcts + `totalHoursPerWeek` +
    archetype via the existing `derivations.ts` helpers — no logic
    duplication on the export path.
  - Builds the steward + regional payload slices with `pickTruthy`
    for string optionals and inline `!= null` spreads for numeric
    optionals (matching the EWE / Sectors precedent for
    zero-is-meaningful semantics).
  - Posts via `api.exports.generate(id, { exportType:
    'human_context_report', payload: { humanContext: {...} } })` and
    `window.open(data.storageUrl, '_blank')`.
- Export button injected into `HumanHero` directly under the
  description copy. Button is inline-styled (Earth-Green pill) since
  this dashboard never adopted a `.module-title-row` actions slot —
  same approach as Sectors. `HumanHero` props extended:
  `{ onExport, exporting }`.

## Verification

- `tsc --noEmit` exit 0 on `packages/shared` (background id
  `brikprwlq`).
- `tsc --noEmit` exit 0 on `apps/api` (background id `b2n9w8j9n`).
- `tsc --noEmit` exit 0 on `apps/web` (background id `by9ly15z8`).
- No DB migration — same precedent as every other Observe export.

## Observe export backlog: closed

All eight Observe modules now have a server-rendered PDF export.
Frontend Resources & Inputs + Boundaries surfaces still use
`window.print()`, but those live outside the Observe rail proper —
they're Plan-stage surfaces in the current build. Out of scope for
this backlog.

## Alternatives considered

- **Skip moodboard data URLs from the payload AND from the template
  (just the count).** Chosen. Sending base64 image blobs through
  the JSON payload would bloat the request and the template can't
  render arbitrary base64 inside Puppeteer reliably without a
  per-image asset upload. The hero counts the images, which is
  enough for the print artefact's purpose.
- **Pre-compute the heuristic recommended-actions on the frontend
  and ship them.** Rejected to match the convention — every other
  template runs its own action heuristic against the payload so the
  rule lives in one place.

## Risks & follow-ups

- The button styling is inline rather than driven by a shared class,
  matching the inconsistency Sectors already accepts. Worth a future
  pass that lifts `module-export-button` into the `_shared` surface
  card stylesheet.
- `archetypeFor()` outputs a four-class string; the template trusts
  the frontend to pass a labeled `name` + `blurb`. If the archetype
  taxonomy evolves, downstream readers stay opaque — payload schema
  is a free string for that field.
