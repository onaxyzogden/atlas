# 2026-05-21 — Phase E: Tier-2 Evidence + protocol re-run

## Summary

Closed the Apricot-Lane Validation Protocol. Phase E shipped the Tier-2
Evidence layer (typed selectors + shared disclosure components +
per-card retrofits across Observe, Plan, and the Capital Partner web
modal), seeded the canonical 200-acre degraded-citrus Apricot-Lane
fixture, and verified the four-row scorecard at 4/4 against the
fixture.

## Commits (on `feat/atlas-permaculture`)

- `6340941c` — **E.1** Apricot-Lane 200-acre degraded-citrus fixture
  (migration `032_builtin_apricot_lane_citrus.sql` + seeder + shared
  sentinel `APRICOT_LANE_PROJECT_ID`).
- `7b5d5c82` — **E.2** Evidence types (`EvidenceItem`, `EvidenceSource`,
  `EvidenceFragment`, `PanelKey`) + 8 pure selectors under
  `apps/web/src/lib/evidence/selectors/` + colocated tests.
- `e6940298` — **E.3** Shared `<EvidenceSection>` + `<DetailsDrawer>`
  with `compactMode` mobile guard + tests.
- `52493192` — **E.4** Observe panels retrofit: `LandVerdictCard`,
  `DecisionTriad` / `FlagCard`, `IntelligenceSummaryCard`,
  `SiteSummaryNarrativeSection`. Mobile shell passes `compactMode`
  through.
- `8e7a1622` — **E.5** Plan panels retrofit: `WaterStorageCard`,
  `ThreeEthicsRollupCard`, `WaterRouterCard`.
- `c81c34b9` — **E.6** Capital Partner web modal retrofit. The static
  PDF template stays unchanged.
- (this entry) — **E.7** Anti-GIS code-path verification + scorecard
  4/4 + wiki ADR + log + index.

## Scorecard

| Row | Phase | Status |
|---|---|---|
| Data Layering | E.2–E.6 | ✅ |
| Hydrology | B.2.swale + B.5 | ✅ |
| Enterprise Stacking | C.7 | ✅ |
| Natural Capital | A.2 + D.7 + E.6 | ✅ |

**4/4 — Atlas passes the Apricot-Lane Validation Protocol.**

## Verification

- Web tests green at every sub-phase boundary (1766/1766 throughout E).
- No new tsc diagnostics on touched files. Pre-existing foreign WIP
  errors unchanged.
- Mobile <30s glance code-path verified: `MobileProjectShell.tsx`
  passes `compactMode` to `LandVerdictCard` and `DecisionTriad`;
  `EvidenceSection` returns `null` when `compactMode` is true. Live
  Playwright screenshot deferred to a manual slice.
- `git fetch origin && git status -sb` clean at the E-phase boundary.

## Decisions filed

- `wiki/decisions/2026-05-21-atlas-phase-e-tier2-evidence-and-protocol-rerun.md`

## Next session

Push `feat/atlas-permaculture` to `origin` with `--force-with-lease`
(per the parallel-session coordination protocol). Resume planning at the
post-protocol stage; recommended next slice is the live Playwright
Anti-GIS screenshot pass against the seeded Apricot-Lane fixture +
optional `evidence_audit` persistence so Evidence fragments are
reproducibility-anchored.
