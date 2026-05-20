# 2026-05-12 — Paddock edit popover: floater label → inline-edit, with area-based stocking recommendation


**Motive.** When a single paddock was selected on the Plan map, the
`PlanSelectionFloater` showed a plain `Paddock` label with no click handler
— stewards had to redraw a paddock to fix a typo or change its pasture
quality. Also, the inline-edit field order ran name → species → fencing →
**stocking (head/ha)** → pasture quality, which is backwards from the
order a farmer actually reasons in (look at pasture quality first, then
decide head count).

**Changes** (landed inside parallel commit `83073fa4`).

- [`PlanSelectionFloater.tsx`](../apps/web/src/v3/plan/PlanSelectionFloater.tsx)
  — when `single.kind === 'paddock'`, the count label becomes a `<button>`
  that opens the inline-edit popover anchored at the paddock centroid via
  `useInlineFormStore` + `buildPaddockEditSchema`. Non-paddock kinds keep
  the static span.
- [`inlineEditSchemas.ts` `buildPaddockEditSchema`](../apps/web/src/v3/plan/layers/inlineEditSchemas.ts)
  — reordered fields to name → species → fencing → **pasture quality** →
  **recommended for this paddock** (new) → stocking (head/ha). New row is
  readonly text formatted as `"{total} {unit} ({perHa}/ha)"` so the
  steward sees both the absolute target and the density it implies.
- Reactivity: added an `onValuesChange` patch that recomputes the
  recommendation when species or pasture-quality changes — no need to
  reopen the form. Uses the existing reactive hook on `InlineFormPayload`
  (`inlineFormStore.ts:75`).

**Formula reuse.** The recommendation calls
[`computePaddockRecommendedStocking`](../apps/web/src/features/livestock/livestockAnalysis.ts)
— the same canonical helper that powers `LivestockMoveCard`,
`GrazingDashboard`, and `CarryingCapacityCard`. head/ha =
`LIVESTOCK_SPECIES[species].typicalStocking × PASTURE_QUALITY_MULTIPLIER[pq]`,
then multiplied by `areaM2 / 10_000` for the total head count. No parallel
formula introduced.

**Verification.** `apps/web` tsc clean (only pre-existing parallel-agent
errors in `Plan3DSelectionHandler.tsx`, since fixed in `1cee21ed`).
