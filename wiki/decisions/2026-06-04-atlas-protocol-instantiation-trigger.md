# ADR: §10.1 objective-approval → protocol-instantiation trigger (surface-for-review, exactly-once)

**Date:** 2026-06-04
**Status:** accepted

**Context:**
Protocol Mode resolves a typed project's full standing protocol set (universal +
per-type deltas), grouped S1→S7 ([[decisions/2026-06-04-olos-protocol-mode-resolver-wiring]]
if filed; resolver `resolveProjectProtocols`). Spec §10.1 calls for *approving a
gating objective* to instantiate that stratum's protocols. Before this change the
only path to instantiation was a hardcoded manual button on the legacy
`s6-yield-flows` objective (status `complete` + has `parameterGroup` +
`hasEligibleEnterprises`). There was no automatic trigger and no general gate.

Both objectives and protocols carry a `stratumId`; objectives additionally carry an
optional `parameterGroup`. The `ProtocolApprovalOverlay` already exists and, today,
still resolves enterprise templates via the **legacy livestock path**
(`templatesForEnterprises(enterprisesForProjectTypes(...))`), guarded by
`hasEligibleEnterprises` to avoid an empty overlay.

**Decisions (operator, this session):**

1. **Trigger UX = surface for review (not silent).** When a gating objective
   computes `complete`, the existing `ProtocolApprovalOverlay` auto-opens for
   human-in-the-loop review. We do NOT silently activate protocols. This honours
   the covenant lean "never mark done without verification" — a steward reviews and
   confirms before any protocol becomes active.

2. **Gate scope = any objective carrying a `parameterGroup`.** The prior hardcoded
   `objective.stratumId === 's6-integration-design'` gate is generalised to
   `Boolean(objective.parameterGroup) && hasEligibleEnterprises`. Any objective that
   declares a parameter group is a gating objective.

3. **Re-fire policy = never re-instantiate (marker).** A new persisted slice on
   `protocolStore`, `instantiatedObjectiveIds: Record<projectId, objectiveId[]>`,
   stamps a (project, objective) pair the first time its overlay is auto-surfaced.
   Subsequent completions / re-renders never re-open it. Deactivating a protocol
   does **not** clear the marker — a steward who reviews then deactivates is never
   re-nagged. A **manual re-instantiate affordance** (the retained legacy button)
   bypasses the marker for deliberate re-runs.

4. **No resolver migration this slice.** The overlay keeps its legacy livestock
   enterprise-template path; `hasEligibleEnterprises` stays as the empty-overlay
   guard. Migrating the overlay to the resolver is a separate deferred item.

**Implementation:**
- `protocolStore.ts` — `instantiatedObjectiveIds` slice + idempotent
  `markObjectiveInstantiated` / `clearObjectiveInstantiation`; persist `version: 4`
  with additive migration from v1/v2/v3 (each adds `instantiatedObjectiveIds: {}`);
  `selectObjectiveInstantiated` selector + `useObjectiveInstantiated` hook.
- `ObjectiveDetailPanel.tsx` — `gatesProtocolInstantiation = Boolean(parameterGroup)
  && hasEligibleEnterprises`; an effect opens the overlay + stamps the marker on the
  `complete` transition when not already instantiated; the manual button is regated
  to `gatesProtocolInstantiation && status === 'complete'` as the explicit
  re-instantiate affordance.

**Known limitation (deferred, pre-existing — NOT introduced here):**
The trigger mechanism is unit-proven but **not yet reachable end-to-end**.
`s6-yield-flows` is the only objective carrying a `parameterGroup`, and it exists
ONLY in the legacy static skeleton (`PLAN_STRATUM_OBJECTIVES`, used for null-type /
pre-slice projects). Typed projects — which alone have a `primaryTypeId` and thus
`hasEligibleEnterprises` — resolve objectives from per-type catalogues that carry no
`parameterGroup` objective. So the gate's two conditions (`parameterGroup` AND
`hasEligibleEnterprises`) are mutually exclusive in current data. The prior manual
button had the identical gate, so this change does not regress reachability. The
trigger fires the moment a livestock-bearing typed catalogue gains a `parameterGroup`
objective — which is the already-deferred "per-type parameterGroups + value-setting
tokens for the new catalogue" item.

**Amanah Gate:** instantiation of land-stewardship protocols on objective approval
is workflow orchestration — no sales channel, advance purchase, or financing
instrument. Verbatim Amanah scopeNotes on protocols are untouched. Clean, no
riba/gharar.

**Consequences:**
- §10.1 trigger mechanism ships with exactly-once, surface-for-review, never-refire
  semantics, unit-proven by 8 tests (incl. marker idempotency + no-refire after
  deactivate).
- Reachability is blocked on the deferred per-type-parameterGroup catalogue work;
  this is disclosed in the commit and log rather than claimed as working e2e.
- Overlay→resolver migration remains deferred.
