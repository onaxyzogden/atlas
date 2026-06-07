# Act-stage objective->tool overrides — wellness (R1/R3) — Gap A CLOSED

**Date:** 2026-06-03
**Project:** [[entities/olos]] / Atlas (`atlas/`, repo `onaxyzogden/atlas`)
**Branch:** `feat/atlas-permaculture`
**Commit:** `1c737085` (code) + docs commit
**Follows:** [[log/2026-06-03-olos-act-education-overrides]] (education R1/R3)
**ADR:** [[decisions/2026-06-03-olos-act-objective-coverage-audit]]

## What happened

Eleventh -- and **final primary** -- per-type catalogue wired in the Act-stage
objective->tool coverage remediation, after homestead, regenerative_farm,
market_garden, orchard, livestock_operation, conservation, off_grid,
agritourism, ecovillage and education. Authored explicit
`OBJECTIVE_ACT_TOOLS_OVERRIDE` entries for all 32 wellness objectives in
[[entities/shared-package]]
(`packages/shared/src/relationships/objectiveActTools.ts`) — **27 `well-*`
primary + 5 `well-sec-*` secondary**. Wellness ships a standalone **additive
secondary overlay layer** (no patches), so this is a primary+secondary wiring,
and the [[entities/act-tier-shell]] conformance test
(`apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts`) gains a
primary+secondary **union** ratchet assertion (like silvopasture and orchard).

**This closes Gap A:** after wellness, every objective across all 14 encoded
catalogues (universal + 11 primary types + every secondary layer) carries an
explicit Act-stage tool mapping.

## Why it mattered

Before this, the wellness objectives fell through the coarse
`STRATUM_ACT_TOOLS_DEFAULT` with the familiar misfit:

- The **S2/S3 surveys** (sensory environment, retreat infrastructure, landscape
  context, privacy gradient, acoustic conditions, water features, healing-garden
  ecology) surfaced the **access-utilities** set instead of survey (soil/
  vegetation/spring/watercourse), structure (buildings/dwellings) and zoning
  (zone/buffer-ring) tools.
- The **S5 design block** (treatment spaces, healing-garden design, guest
  accommodation, privacy screening, dining) surfaced generic access tools rather
  than the structure (buildings/dwellings/barns), planting (beds/vegetation) and
  screening (buffer-ring/fencing) families the checklists call for.

## The 32 mappings

Grounded-candidate method — every tool id verified against a real wellness
checklist item AND confirmed present in `ACT_TOOL_CATALOG`:

| Objective | Tools |
|---|---|
| `well-s1-healing-philosophy` | `[]` — philosophy / design-gate decision |
| `well-s1-guest-intake` | `[]` — intake-policy decision |
| `well-s1-regulatory-standards` | `[]` — regulatory hard gate |
| `well-s1-privacy-policy` | `[]` — privacy-policy decision |
| `well-s2-sensory-environment` | zone, roads, neighbour-pin, note |
| `well-s2-retreat-infrastructure` | buildings, dwellings, note |
| `well-s2-landscape-context` | neighbour-pin, catchment, hazard-zone, high-point, note |
| `well-s2-privacy-gradient` | buffer-ring, vegetation, neighbour-pin, watercourse, note |
| `well-s3-acoustic-conditions` | zone, roads, neighbour-pin, note |
| `well-s3-water-features` | spring, watercourse, water, note |
| `well-s3-healing-garden-ecology` | vegetation, soil, sun-sector, note |
| `well-s4-sensory-design-standards` | `[]` — standards / design-gate decision |
| `well-s4-therapeutic-program` | `[]` — program / practitioner decision |
| `well-s4-privacy-zone-hierarchy` | zone, buffer-ring |
| `well-s4-healing-garden-strategy` | `[]` — strategy decision (design in S5) |
| `well-s4-safeguarding-protocol` | `[]` — safeguarding protocol (hard gate) |
| `well-s5-treatment-spaces` | buildings, zone |
| `well-s5-healing-garden-design` | beds, vegetation, watercourse, path, zone |
| `well-s5-guest-accommodation` | dwellings, zone |
| `well-s5-privacy-screening` | buffer-ring, vegetation, fencing |
| `well-s5-dining-nourishment` | buildings, barns |
| `well-s6-outcome-monitoring` | `[]` — monitoring protocol |
| `well-s6-sensory-monitoring` | `[]` — monitoring protocol |
| `well-s6-external-relations` | `[]` — admin / compliance protocol |
| `well-s7-program-launch` | `[]` — phasing hard gate |
| `well-s7-practitioner-onboarding` | `[]` — HR protocol |
| `well-s7-adaptive-management` | `[]` — review protocol |
| `well-sec-s1-healing-philosophy` | `[]` — overlay philosophy decision |
| `well-sec-s1-regulatory-standards` | `[]` — overlay regulatory hard gate |
| `well-sec-s4-sensory-standards` | `[]` — overlay standards decision |
| `well-sec-s4-therapeutic-program` | `[]` — overlay program decision |
| `well-sec-s4-safeguarding` | `[]` — overlay safeguarding protocol |

13 tool-bearing (all primary) - 19 intentional `[]` (14 primary + all 5
secondary).

## Amanah

Wellness is therapeutic land stewardship — guest healing, sensory design,
safeguarding, practitioner standards. There is **no sales channel, advance
purchase, or financing instrument**: WELL-S7.6 adaptive-management reviews
"financial data" but defines no money instrument, and the catalogue carries no
fee or booking objective. Nothing engages riba or gharar — clean throughout
([[fiqh-csra-erased-2026-05-04]]). No fiqh is re-encoded at the Act layer.

## Why the secondary layer is all `[]`

The 5 `well-sec-*` overlay objectives are the wellness concerns a host primary
would not already carry when wellness is layered on as a secondary type — they
are all **philosophy / regulatory / sensory-standards / program / safeguarding
decisions**, not new site surveys or design builds. The host primary already
carries the spatial S2/S3 survey and S5 design work, so the overlay adds only
decision substance, with no spatial or field-log act of its own. Every overlay
objective therefore maps to an intentional `[]`.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` — EXIT 0.
- Audit re-run: 316 objectives — Gap A **27 -> 0** (every objective across all
  14 types now explicitly wired), Gap B 0, Gap C 120 -> 130 (**130 intentional /
  0 default-driven** — no objective relies on the stratum default any longer).
- Bounded tests (`--pool=forks`, per-workspace):
  `actToolCoverage.test.ts` **16/16** · `objectiveObserveDomains.test.ts` **8/8**
  · `resolveProjectObjectives.test.ts` **25/25**.

## Note on the code commit

Clean capture — `1c737085` committed via `git commit -- <explicit pathspec>`,
so it took exactly the 3 intended files (`objectiveActTools.ts`,
`actToolCoverage.test.ts`, the regenerated `act-objective-coverage.md` matrix)
despite out-of-band working-tree changes. The commit-message body states the
correct **13 grounded / 19 intentional `[]`** split (double-checked against the
audit before committing — the ecovillage `71c4671f` miscount lesson applied).

## Remaining

**Gap A is 0.** R1 is complete across every primary type. R2 (form-arm tools
for the s1 vision objectives) stays deferred — it needs operator-designed
per-type form content, which must not be fabricated. The coarse
`STRATUM_ACT_TOOLS_DEFAULT` remains only as a safety net for any future
un-wired objective, which the ratchet would also catch.
