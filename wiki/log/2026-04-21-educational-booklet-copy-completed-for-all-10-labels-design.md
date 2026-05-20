# 2026-04-21 — Educational booklet copy completed for all 10 labels + Design Complexity orientation fix


Follow-up to the schema-lift sprint, clearing the top deferred item from that
ADR. `SCORE_EXPLANATIONS` in `apps/api/src/services/pdf/templates/educationalBooklet.ts`
gained plain-language copy for the six labels that previously rendered via
graceful-degradation fallback: Habitat Sensitivity, Stewardship Readiness,
Community Suitability, Design Complexity, FAO Land Suitability, USDA Land
Capability — plus a bonus `Canada Soil Capability` entry for CA sites.

**Design Complexity orientation fix.** DC is the only score where higher =
worse (high complexity = harder to design around). The render loop hard-coded
`s.value >= 60 ? good : poor` which would have surfaced "easy site" copy on a
high-complexity score. Added an optional `inverted?: boolean` field to the
`SCORE_EXPLANATIONS` type; DC sets `inverted: true`; the verdict picker now
reads `const goodThresholdMet = info.inverted ? s.value < 40 : s.value >= 60;`.
No other label is inverted today — the field is opt-in.

Verification: `pnpm --filter @ogden/api exec tsc --noEmit` clean;
`pnpm --filter @ogden/api exec vitest run` 39 files / **459/459** green.
