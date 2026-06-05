# 2026-05-14 — JSDoc sweep: align Plan-card prose with year-scrubber Yeomans-cap model


Doc-only follow-up to the year-scrubber migration (commit af5a2fc4).
Ten files swept to retire stale `phase-1` / `phase-2` / "Year 1 / Year 5"
wording in JSDoc headers, inline comments, and lede prose, replacing
them with year-scrubber / `yeomansCapForYear(currentYear)` framing:
PlanPhaseTabs header (Five tabs → Three tabs + scrub toggle),
usePrincipleEvidenceVisibleIds, WaterStorageCard, WaterNetworkCard,
ThreeEthicsRollupCard (header + lede), PrincipleCoverageMatrixCard
(header + lede), FertilityColocationCard (cap-discipline block + lede),
ClosedLoopGraphCard, PlantEstablishmentSequenceCard (cap-discipline
block + lede), CanopySuccessionCard. Remaining matches in `types.ts`,
`PlanViewContext.tsx`, `DesignElementLayers.tsx`, and `PlanPhaseTabs.tsx`
are intentional historical references (each explicitly "retired" /
"former").

No logic touched. See: [2026-05-14-atlas-plan-year-scrubber-yeomans-cap.md](decisions/2026-05-14-atlas-plan-year-scrubber-yeomans-cap.md).
