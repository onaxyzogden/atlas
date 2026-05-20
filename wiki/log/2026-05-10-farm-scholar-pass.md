# 2026-05-10 — Farm-Scholar pass


Adjudicated the last unconverted Plan-stage module (Livestock & Subdivision,
Yeomans rank 9) against Chris Newman's *First Generation Farming* via the
Farm Scholar NotebookLM (`b0597846-3d6d-439c-b86d-441ae080a41e`). Verdict:
BUILD_FRESH with three orthodoxy violations and one missing concept. ADR at
`wiki/decisions/2026-05-10-atlas-plan-module6-livestock-farm-scholar.md`.

Changes:

- **Cheesecake-farm advisory** — `MultiSpeciesPlannerCard.tsx` retitled
  "Specialization"; renders an informational advisory when the species list
  exceeds two, citing Newman's 1–2-product-line rule. Non-blocking.
- **Agritourism unmount** — `GuestSafeBufferAuditCard` removed from the
  livestock slide-up tab array (file preserved on disk per "no deletion in
  revamps"). Livestock now shows 7 tabs.
- **Strip-grazing fence-line tool** — new `FenceLineTool.tsx` (LineString,
  persist-first lifecycle mirroring `PaddockTool`); `FenceLine` type +
  slice in `livestockStore.ts` (`fenceType`, `mobility:
  'permanent' | 'temporary-strip'`, optional `paddockId`); icon entry in
  `PlanTools.tsx`; switch case in `PlanDrawHost.tsx`; map-tool union in
  `useMapToolStore.ts`; rendering in `PlanDataLayers.tsx` with
  `line-dasharray: [3, 2]` for temp-strip vs. solid permanent.
- **Carrying-capacity readout** — `PaddockCellDesignCard.tsx` gains a
  three-row "Eat a Third / Foul a Third / Leave a Third" block with an
  AU-capacity row (sustainable vs. declared) and an overstocked warning,
  reactive to paddock area and stocking density.

Deferred: Broiler Product Map / agribusiness layer (slaughter → butchery →
pack → freeze → rendering, market/distribution interface) — large enough to
warrant its own module pass. Tracked as next-session candidate.

Verification: `tsc --noEmit` clean. Pre-existing vitest failures
(V3LifecycleSidebar `useRouterState` mock; jsdom env) untouched and unrelated.
