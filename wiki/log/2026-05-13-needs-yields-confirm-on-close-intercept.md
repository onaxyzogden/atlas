# 2026-05-13 — Needs & Yields: confirm-on-close intercept


**Why.** Companion to the earlier same-day commit. The status-gate
slice landed without a dismiss guard: a steward could open the audit
card, see N unrouted outputs, and close the panel without ever
acknowledging them. That undercuts the gate — the next CTA click
would be a surprise.

**What.** `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` now wraps
`onClose`. When `module === 'principle-verification'`,
`getAllowOrphanOutputs(project) === false`, and `orphanOutputs(
entities, edges).length > 0`, the wrapper opens an inline
`role="dialog"` confirm modal — *"N unrouted output(s). Close anyway,
or stay and route them through the audit card?"* — with "Stay in
audit" / "Close anyway" actions. Re-uses the same `orphanOutputs`
reader as the card so the numbers cannot drift. Lifecycle-safe:
`useAllPlacedEntities` / `useRelationshipsStore` subscribe
unconditionally, the count is short-circuited to 0 when the active
module is not the audit. Wraps the `renderCard`-passed close fn too,
so the audit card's own dismiss buttons run through the intercept.

**Reference.** Decision
[`2026-05-13-atlas-needs-yields-status-gate.md`](decisions/2026-05-13-atlas-needs-yields-status-gate.md)
treats this as the fourth slice of the same Rec #1 closeout.
