# 2026-04-22 — fuzzyMCDM lifted to `@ogden/shared/scoring`

**Status:** Accepted
**Audit item:** §6.9 — "Integrate fuzzyMCDM into computeAssessmentScores."

## Context

`apps/web/src/lib/fuzzyMCDM.ts` (Zadeh fuzzy membership + Saaty AHP weight
derivation, 224 LOC) lived in the web app only. The web panel
(`FuzzyFaoSection`, `AhpWeightsSection`) computed memberships at render
time. The API-side `SiteAssessmentWriter` — which writes the authoritative
`site_assessments` rows — produced only crisp S1–N2 classes; the fuzzy
vector was never persisted and never reached a PDF export or a remote
observer.

Audit §6.9 required the fuzzy path to be callable from the shared scoring
module that both the web and API use, so the server can emit fuzzy
memberships whenever a consumer asks for them.

## Decision

**Lift, shim, and opt in — additive only.**

1. Copy `apps/web/src/lib/fuzzyMCDM.ts` → `packages/shared/src/scoring/fuzzyMCDM.ts`
   (no edits; identity lift).
2. Re-export from `packages/shared/src/scoring/index.ts`.
3. `apps/web/src/lib/fuzzyMCDM.ts` → thin shim `export * from '@ogden/shared/scoring';`
   (same pattern already used for `computeScores.ts`). Keeps every existing
   import path working; no rename cascade.
4. Extend `ScoredResult` with **optional** `fuzzyFAO?: FuzzyFAOResult`.
5. Extend `computeAssessmentScores` signature with an **optional**
   `opts?: { scoringMode?: 'crisp' | 'fuzzy' }` fifth argument. Default
   `'crisp'` → unchanged behavior, zero-risk for the 20+ existing callers.
   When `'fuzzy'`, pluck pH / rooting depth / slope / AWC / EC / CEC /
   GDD / drainage from `soils` + `climate` + `elevation` layer summaries,
   call `computeFuzzyFAOMembership`, and attach the result to the
   `FAO Land Suitability` entry only. Crisp scores are untouched.

## Consequences

- Fuzzy logic is now a first-class shared primitive. API routes (e.g. PDF
  export) can request `scoringMode: 'fuzzy'` to emit bar charts of S1–N2
  memberships beside the crisp label.
- Web callers pass nothing → crisp stays default. No existing test broke.
- `FuzzyFaoSection` in the panel still computes locally for interactivity;
  the shared path is a supplementary server-side emitter, not a replacement.

## Tests

- `packages/shared/src/tests/fuzzyMCDM.test.ts` — 10 tests:
  S1-dominance on optimal inputs, N1/N2 on extreme inputs, membership sum
  ≈ 1, AHP weight sum to 1, CR ≤ 0.10 on the default Atlas matrix,
  `defaultAtlasWeights` length, non-square matrix rejection,
  `scoringMode: 'crisp'` does not attach `fuzzyFAO`, `'fuzzy'` does,
  crisp vs fuzzy score parity (`fuzzyFAO` is purely additive).

## Alternatives considered

- **Always-on fuzzy output** — rejected; payload bloat, changes observed
  `ScoredResult[]` shape for consumers that don't want it.
- **Separate `computeFuzzyAssessment` function** — rejected; duplicates
  the 200-line plumbing that already extracts layers. One function + opts
  flag is cleaner.
- **Write fuzzy into `score_breakdown` as components** — rejected;
  memberships aren't "scores" in the 0-100 sense and would poison existing
  `ScoreComponent` consumers.
