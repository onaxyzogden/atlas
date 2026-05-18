# Land OS Positioning & Phase-2 Roadmap

## Summary

OGDEN Land OS (OLOS / atlas) is positioned as the full operating system for
regenerative land development — not a land-design app. Success is defined as
the ability to *independently run* a project at Apricot-Lane-Farms complexity
without external project-management tools or personnel. This page is the
ratified north star: the verbatim success definition, the 5-capability model,
a capability→current-state map, and the A/B/C/D track sequencing with
Sub-project D decomposed into an actionable D0–D5 backlog.

> **Ratified positioning statement (authoritative — do not paraphrase):**
>
> OGDEN Land OS is being built to serve as the full operating system for
> regenerative land development. Its success is measured by whether it can
> independently guide a project through observation, design, phased
> implementation, daily management, ecological monitoring, and adaptive
> stewardship at the complexity level of Apricot Lane Farms — without
> requiring external project management systems or personnel to hold the
> work together.

## How It Works

### The 5-capability model

The positioning resolves into five capabilities a land OS must hold end to
end. A project the size of Apricot Lane must be runnable inside OLOS alone:

1. **Observe the land deeply** — soil, water, topography, climate, existing
   biology, infrastructure; a living record that improves over time.
2. **Turn observation into a complete land plan** — zones, water strategy,
   planting systems, infrastructure, phasing logic grounded in the
   observed reality.
3. **Break the vision into phased implementation** — multi-year programmes
   sequenced by ecological and operational dependency, not arbitrary dates.
4. **Manage implementation without external PM tools** — the built-in
   command centre: task lists, timelines, dependencies, labour, materials,
   contractor scopes, budget tracking, equipment, maintenance, issue logs,
   inspections, photo documentation, completion proof, and daily/weekly
   operating dashboards.
5. **Adapt through feedback** — monitor living-system metrics over time and
   recommend adjustments as the land responds.

### Capability → current-state map

| # | Capability | OLOS state | Track |
|---|---|---|---|
| 1 | Observe the land deeply | **Substantially built** — 6 Observe modules + the A-series monitoring spine | — |
| 2 | Observation → complete land plan | **Built** — Plan stage, Goal Compass, auto-design pipeline | — |
| 3 | Phased implementation | **Built engine** — Goal Compass → `BuildPhase`/`PhaseTask` → Phasing & Budgeting | — |
| 4 | Manage implementation w/o external PM tools | **Largely unbuilt — the big gap** | **D** |
| 5 | Adapt through feedback | **Monitoring built** (A-series); "recommend adjustments" engine unbuilt | D5 (+A) |

Capabilities 1–3 exist as working engines. Capability 4 is the structural
gap — the operating loop that lets OLOS *run* and not merely *design* a
project. Capability 5 is half-built: the A-series gives the longitudinal
measurement spine; the adaptive-recommendation engine that reads it is the
closing slice of D.

### Track sequencing

The Apricot Lane replication initiative was decomposed on 2026-05-17
([[2026-05-17-atlas-regeneration-monitoring-a1]]) into four sub-projects on a
monitoring-first spine. Status and depth as ratified this session:

- **A — Ecological monitoring & habitat — ✅ COMPLETE.**
  A1 regeneration trajectories ([[2026-05-17-atlas-regeneration-monitoring-a1]]),
  A2 habitat allocation (`c0e12776`), A3 biodiversity outcomes
  ([[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]], `bfb689fe`). The
  ecological observe→measure spine is in place and is the substrate D5
  reads.

- **B — Biological systems engineering — *track-level only.***
  Soil-fertility engine (compost / vermicompost / compost-tea cycles),
  cover-crop & living-roots planning, animal-integration carrying-capacity,
  plant-diversity engineering. Depends on the A monitoring spine (it closes
  the biological observe→act feedback). No slice decomposition this session.

- **C — Transition economics — *intent only, covenant-bounded.***
  Scholar-Council-gated. Permitted capital channels per global covenant:
  charitable / restricted donation, qard ḥasan, in-kind contribution,
  sponsorship; a post-acquisition yield-share is contemplated *only* as a
  membership benefit, designed afresh under Scholar Council review.
  **CSRA / salam-style advance-purchase is explicitly excluded.** No
  riba/gharar framing in any C surface. No slices this session.

- **D — End-to-end operating loop (command centre) — decomposed below.**
  Capability #4 plus the closing of #5. Sequenced into D0–D5; each slice is
  a *future spec* — scope and dependency only, no architecture decided here.

### Sub-project D decomposition (D0–D5)

Sequenced by dependency. Mirrors the A-series proven pattern: additive only,
no DB migration, client-side-first, spine/monitoring-first.

- **D0 — Operating-loop spine & data model.** The connective backbone: a
  unified work-item model that wraps/supersedes ad-hoc + `PhaseTask` rows
  (status, dependency, assignee, dates, provenance); a client-first
  persisted store mirroring `regenerationEventStore` / A1; the
  command-centre shell/route. Foundation for D1–D5, the way A1 was the
  spine for A2/A3.

- **D1 — Task & dependency engine.** Task lists, timelines, a dependency
  DAG over work items, blocked / critical-path surfacing. Builds on D0 +
  the existing Goal Compass sequencing engine.

- **D2 — Resourcing.** Labour assignments, contractor scopes, equipment
  tracking, material lists / BOM — resource entities linked to work items.
  Builds on D0/D1.

- **D3 — Budget & cost tracking.** Budget-vs-actual per phase / work-item,
  reusing the existing client-side financial-modeling engine + regional
  cost dataset. **Covenant boundary:** project cost/budget tracking *only*.
  Capital formation and financing stay in Sub-project C. D3 must not
  accrete C concerns.

- **D4 — Field execution & proof.** Issue logs, inspection checkpoints,
  photo documentation, completion proof. Reuses the `regeneration_events`
  additive-JSONB pattern + the previously-deferred media upload; extends
  the Act stage. Builds on D0–D2.

- **D5 — Operating dashboards & adaptive recommendations.** Daily/weekly
  operating dashboards plus capability #5's "recommend adjustments" engine,
  reading A-series trajectories + D1–D4 execution state to surface drift
  (labour bottleneck, budget drift, lagging ecological metric, seasonal
  failure) and recommended adjustments. Closes the loop; depends on all
  prior D slices **and** the A track.

## Where It's Used

- **ADR:** [[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] — ratifies
  this positioning and the D0–D5 decomposition.
- **Decomposition origin:** [[2026-05-17-atlas-regeneration-monitoring-a1]]
  (A/B/C/D split); [[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]]
  (A track complete).
- **Entity:** `entities/atlas-platform.md` — "Strategic Direction (Phase 2)"
  points here.
- **MILOS root:** `wiki/entities/olos.md` — the "Phase 2 roadmap" open
  question resolves to this page.
- Reused substrate referenced by the D slices: `phaseStore`
  (`BuildPhase`/`PhaseTask`), Goal Compass sequencing engine, Phasing &
  Budgeting module, `regenerationEventStore` + `regeneration_events`,
  the client-side financial-modeling engine + regional cost dataset.

## Constraints

- **Positioning statement is byte-authoritative.** The blockquote above is
  the ratified success definition; reproduce it verbatim, never paraphrase.
- **Roadmap is capability/track-based, not lifecycle-based.** The 7-stage
  lifecycle is deprecated; do not re-derive the roadmap against it.
- **C-vs-D covenant boundary is load-bearing.** D3 and D5 are project
  cost/budget tracking and operating analytics only. Capital formation,
  financing, advance-purchase, investor/equity, yield-as-return framing
  belong to Sub-project C and are Scholar-Council-gated. No riba/gharar
  framing in any D surface, copy, or code.
- **D slices are scope + sequence only.** Each of D0–D5 is a *future spec*;
  no architecture is decided by this page. Each gets its own
  brainstorm → spec → plan → implementation cycle.
- **A-series pattern is the default for D.** Additive only, no DB migration,
  client-side-first, spine/monitoring-first — unless a slice's own spec
  justifies otherwise.
- **B stays track-level, C stays intent-only** until each is itself
  decomposed in a dedicated session.
