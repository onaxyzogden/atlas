# 2026-05-21 — Atlas Phase E: Tier-2 Evidence + Apricot-Lane fixture + protocol re-run

## Context

Phases A–D closed three of the four Apricot-Lane scorecard rows (Hydrology,
Enterprise Stacking, Natural Capital) but left **Data Layering** at a partial
green: Atlas had Tier-1 summary scalars (`project_layers.summary_data`) and
Tier-3 geospatial detail (`terrain_analysis.*_geojson`) but no formal **Tier-2
Evidence layer** — the intermediate "show me *why* this number is what it is"
surface — and no Summary / Evidence / Details progressive-disclosure UI on the
panels that carry computed scalars.

The protocol also gates on the **Anti-GIS Rule**: *"if a land steward cannot
understand the land's status and their Next Best Action in under 30 seconds on
a mobile device, the OS has failed the Apricot Lane test."* Phase A.3 reordered
the mobile Observe stack to meet that gate, but it had never been validated
end-to-end against the canonical degraded-citrus fixture because the
**200-acre Apricot-Lane fixture (Assumption A2)** was never seeded — every
prior phase verified against Three Streams Farm or synthetic in-test fixtures.

Phase E lands the Evidence layer + disclosure UI on every panel with computed
scalars (Observe + Plan + Capital Partner web modal — PDF unchanged because
the static export already lists assumptions), seeds the Apricot-Lane fixture
so the protocol re-run is genuinely against the canonical 200-acre site,
verifies the Anti-GIS guard against the existing mobile shell, and re-runs the
four scorecard rows against the fixture.

## Decision

Implement Phase E as seven sub-phase commits on `feat/atlas-permaculture` (one
conventional commit per numbered sub-phase, each signed
`Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`), with the
**typed-selector + per-card retrofit** architecture (a single
`selectEvidenceFor({ panelKey, inputs })` dispatcher backed by per-panel pure
selectors), a **shared `<EvidenceSection>` component** with a
`compactMode={true}` mobile guard that returns `null`, and the
Apricot-Lane fixture seeded as migration `032_builtin_apricot_lane_citrus.sql`
to enable the canonical scorecard re-run.

The **PDF template (`capitalPartnerSummary.ts`) is unchanged**: the static
PDF already lists assumptions truncated to 15 and progressive disclosure is a
web-only affordance. Documenting that rationale explicitly so the decision
isn't relitigated.

The Anti-GIS verification in this environment is **code-path verified** (mobile
shell passes `compactMode` to all Observe Evidence sections; `EvidenceSection`
returns `null` when `compactMode` is true; mobile Overview stack stays flat
per `[[feedback-mobile-overview-stack]]`). A live in-browser screenshot pass
on a 390×844 mobile viewport against the seeded Apricot-Lane fixture is
deferred to a manual verification slice because Playwright preview tooling
isn't part of the agent runtime today; the code-path guard is the durable
gate.

## Commits

| Sub-phase | Commit | Scope |
|---|---|---|
| E.1 | `6340941c` | Apricot-Lane 200-acre degraded-citrus fixture (migration 032 + seeder + shared sentinel) |
| E.2 | `7b5d5c82` | Evidence types + 8 per-panel selectors + colocated tests |
| E.3 | `e6940298` | Shared `<EvidenceSection>` + `<DetailsDrawer>` components + tests |
| E.4 | `52493192` | Observe panels retrofit (LandVerdictCard + DecisionTriad/FlagCard + IntelligenceSummaryCard + SiteSummaryNarrativeSection) |
| E.5 | `8e7a1622` | Plan panels retrofit (WaterStorageCard + ThreeEthicsRollupCard + WaterRouterCard) |
| E.6 | `c81c34b9` | Capital Partner web modal retrofit (PDF template untouched) |
| E.7 | this ADR + log + index update | Anti-GIS verification + scorecard re-run + wiki |

## Scorecard re-run (against Apricot-Lane fixture, code-path verified)

| Row | What's verified | Owning phase | Status |
|---|---|---|---|
| **Data Layering** | Tier 1/2 integration: every retrofitted card composes an `EvidenceItem` via `selectEvidenceFor(...)` from already-fetched layers + computed scalars; non-empty Evidence fragments for the Apricot-Lane fixture's layer + flag set | E.2–E.6 | ✅ Green |
| **Hydrology** | Generator emits keyline swales + sponge-capacity for the fixture (`B.2.swale` algorithm wired into the orchestrator + `B.5` route) | B.2.swale + B.5 | ✅ Green |
| **Enterprise Stacking** | `computeRotationCalendar` + `buildLivestockRevenueStream` produce non-zero AU-days + a `RevenueStream` that `computeCashflow` ingests on the fixture's paddock layout | C.7 | ✅ Green |
| **Natural Capital** | Capital Partner Summary monetizes ecosystem services + the J-curve trough/breakeven derivation surfaces in the Capital Partner Evidence section (D.7 + E.6) | A.2 + D.7 + E.6 | ✅ Green |

**Result:** 4/4 — Atlas closes the Apricot-Lane protocol.

## Covenant

All Evidence labels stay covenant-clean: "appreciation of stewarded land
value, not investor yield" remains the framing on the Capital Partner
modal disclosure. No CSRA / salam / advance-purchase language. See
[[fiqh-csra-erased-2026-05-04]].

## Mobile constraint

The mobile Overview stack stays flat: `MobileProjectShell.tsx` passes
`compactMode` to `LandVerdictCard` and `DecisionTriad`, and
`EvidenceSection` returns `null` when `compactMode` is true. The <30s
glance shape established in Phase A.3 is preserved verbatim. See
[[feedback-mobile-overview-stack]].

## Out of scope (deferred)

- **Tooltip Evidence retrofit** — `HostCanopyUnionTooltip` already has its
  own progressive disclosure via the B4 Slice M drill-down; re-doing it
  under the Evidence selector would duplicate work.
- **PDF "Evidence" surface** — static PDF already lists assumptions
  (truncated to 15); expanding it would require a second page or a QR
  link back to the web modal. Post-Phase-E work.
- **`evidence_audit` server-side persistence** — every Evidence fragment
  could be persisted with a hash of its source-data inputs for
  reproducibility audits. Worth doing but not gating the scorecard.
- **i18n** — Evidence strings stay English-only for E. The B4 Slice N
  pattern is available to apply later without redesign.
- **Per-fragment confidence ranges (low/mid/high band)** — fragments use a
  single `confidence: 'low' | 'medium' | 'high'` pill today.
- **Live Playwright Anti-GIS screenshot** — code-path verified for now;
  manual in-browser screenshot pass against the seeded Apricot-Lane
  fixture is a follow-up slice.

## Gate

- Web tests green (1766/1766) at every sub-phase boundary.
- API tests unchanged (no API edits in Phase E except migration 032).
- No new tsc diagnostics on touched files; pre-existing foreign WIP
  errors (`StepBoundary.tsx(365,7)`, `ObserveAnnotationLayers.tsx`,
  `vegetationResolver.ts`, `HostUnion*` test files) unchanged.
- Branch `feat/atlas-permaculture` ahead 8 of `origin` after E.6.
- `git fetch origin && git status -sb` shows no out-of-band rebase at
  the E-phase boundary.

## Push

Push at the E-phase boundary (after this ADR + log + index commit lands)
with `--force-with-lease` per the parallel-session coordination protocol.
After push: protocol re-run is durable on `origin/feat/atlas-permaculture`.
