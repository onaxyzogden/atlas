# 2026-04-26 — Sweep: hoist 59 in-selector `.filter()` calls into `useMemo` (commit `68b6811`)


Follow-up to the EnterpriseRevenueMixCard fix below. A multiline
grep across `apps/web/src/features/` revealed the same anti-pattern
in 15 additional files — Zustand selectors returning a fresh
`.filter()` array per call, all latent infinite-loop hazards.

**Files (15):** `stewardship/PunchListCard`, `portal/InternalVsPublicViewCard`,
`fieldwork/WalkChecklistCard`, `economics/RevenueRampProjectionCard`,
`economics/OverbuiltForRevenueWarningCard`, `crops/ClimateShiftScenarioCard`,
and 9 cards under `ai-design-support/` (WhyHerePanels, PhasedBuildStrategy,
NeedsSiteVisit, FeaturePlacementSuggestions, EducationalExplainer,
EcologicalRiskWarnings, DesignBriefPitch, AssumptionGapDetector,
AlternativeLayoutRationale).

**Approach.** One-shot codemod at
[`scripts/fix-store-filter-loops.mjs`](scripts/fix-store-filter-loops.mjs)
— regex-driven hoist of `useXStore((s) => s.field.filter(...))` into
`const allField = useXStore((s) => s.field); const name = useMemo(() => allField.filter(...), [allField, owner])`.
59 sites rewritten across 15 files; all 15 already imported `useMemo`
so no import edits needed.

**Codemod gotcha (preserved as a comment in the script).** Initial
regex used `^(\s*)` with `gm` flag. With CRLF line endings, JS regex
`^` can position itself between `\r` and `\n`, letting `\s*` consume
the `\n` and re-emit it inside the indent capture — corrupting line
structure. Switched indent capture to `(?<=^|\r?\n)([ \t]*)` (strict
horizontal whitespace, lookbehind for line start). Worth remembering
for any future codemod against this CRLF codebase.

**Verification.** `apps/web` `tsc --noEmit` reports zero new errors
in the 15 touched files (pre-existing breakage in
`AiSiteSynthesisCard.tsx` and `components/panels/*` is unrelated and
predates this branch). Preview reload — console clean of "Maximum
update depth"; only pre-existing axe-core a11y warnings and a
zustand "no migrate function" notice remain.

**Pattern note.** Codebase still has no `useShallow` / `zustand/shallow`
adoption. Established convention is now firmly "select primitive arrays,
filter via `useMemo`" — applies to any future card that needs a
project-scoped slice. Consider adding an ESLint rule that flags
`use\w+Store\(\(\w+\)\s*=>[^)]*\.filter` to prevent regressions.
