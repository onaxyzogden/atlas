# 2026-05-31 — Portfolio Home P4: climate-context derivation (shared)

**Backfilled 2026-05-31 from commit history** (commit `0b8c8ef7`) — code-committed in a prior session but never logged at the time; reconstructed from the commit body + `--stat` for epic-record completeness.

**Branch.** `feat/atlas-permaculture` (commit `0b8c8ef7`, 3 files +199; not pushed). Phase 4 of the OLOS Portfolio Home epic — the pure derivation P6's cross-project Observe comparison depends on. Builds on P3 ([[log/2026-05-31-portfolio-home-p3-stage-colouring-mobile]]).

**What shipped.** Given a latitude and a calendar date, classify hemisphere, coarse latitude band, and hemisphere-aware astronomical season — so readings from projects at different latitudes/hemispheres are read in seasonal context (June = summer north, winter south).

- **`climate/climateContext.ts`** — `deriveClimateContext(lat, date) => { hemisphere, latitudeBand, season }`. Reuses the `Season` vocabulary + `SEASON_DATES` (equinox/solstice) from `astronomy/sunPath` rather than redefining seasons. Bands split at the Tropic (23.5) and Polar Circle (66.5); season derived from UTC month/day (timezone-stable) and inverted for the southern hemisphere. **No Köppen `climateZone`** — lat+date alone can't derive one, and a lat-proxy would just duplicate `latitudeBand` (a disclosed amendment to the plan's original `{ …, climateZone, … }` signature, carried through to P6's badge).
- **`index.ts`** — re-export from the `@ogden/shared` barrel alongside the other `climate/*` modules.
- **`tests/climateContext.test.ts`** — 31 cases: hemisphere incl. equator; latitude band incl. negative lats and the 23.5/66.5 boundaries; northern season at each solstice/equinox + mid-season + year-end wrap; and N-vs-S inversion.

**Verified.** `pnpm --filter @ogden/shared test` green (43 files, 802 tests); shared package `tsc` clean.

**Discipline.** Append-only commit on the rebased branch ([[project-branch-rebase]]); not pushed. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Continues [[log/2026-05-31-portfolio-home-p3-stage-colouring-mobile]]; ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entities [[entities/shared-package]] + [[entities/web-app]].
