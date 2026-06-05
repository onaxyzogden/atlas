# 2026-06-04 — Protocol Mode panel polish (Phase A) + §10.1 instantiation trigger (Phase B)

**Project:** OLOS / Atlas · branch `feat/atlas-permaculture`
**Arm:** Two-phase plan ([[~/.claude/plans/i-need-protocols-drafted-tranquil-wilkinson]]). Phase A — stratum-scope Protocol Mode + secondary-conflict banner + per-card source attribution. Phase B — wire the §10.1 objective-approval → protocol-instantiation trigger.

## Phase A — Protocol Mode panel polish (commit `b5fcd16c`)

Three follow-ups to the prior resolver-wiring slice ([[log/2026-06-04-olos-protocol-mode-resolver-wiring]]):

1. **Stratum-scope the list.** Protocol Mode rendered all 7 strata in one scroll; the Plan surface is navigated by stratum, so the steward should see only the open stratum's protocols. Added `stratumId` to `ProtocolTierGroup` and a pure `filterProtocolGroups(groups, activeStratumId)` helper (returns the matching group, or all when null). `PlanStratumShell` filters before passing to `ProtocolColumn`; selections clear on stratum change.
2. **Surface secondary-type conflicts.** `ProtocolColumn` mounts the existing `DesignTensionBanner` (read-only — no per-row navigation) when `tensions` are passed, highlighting tensions whose `resolutionStratumId === activeStratumId`. Reuses the amber banner CSS + `usePlanTensionBannerStore` as-is.
3. **Per-card source attribution.** New `getProtocolSourceTag(template)` mirrors the objective `sourceTag`; `ProtocolLibraryCard` renders a source badge (universal=blue / primary=green / secondary-<Type>=amber).

## Phase B — §10.1 instantiation trigger (commit `67c29e5d`)

Generalised the legacy hardcoded `s6-yield-flows` manual-button gate to **any objective carrying a `parameterGroup`**. When such an objective computes `complete`, the existing `ProtocolApprovalOverlay` auto-opens for human-in-the-loop review (surface-for-review, NOT silent activation). ADR: [[decisions/2026-06-04-atlas-protocol-instantiation-trigger]].

### Decisions (operator, Phase B kickoff)

- **Q1 trigger UX = surface overlay for review** — covenant lean "never mark done without verification"; the steward confirms before any protocol activates.
- **Q2 gate scope = only objectives with a `parameterGroup`** — generalises the prior stratum-hardcoded gate.
- **Q3 re-fire = never re-instantiate (marker)** + retain the manual button as an explicit re-instantiate affordance that bypasses the marker.
- **No resolver migration** — overlay keeps its legacy livestock enterprise-template path; `hasEligibleEnterprises` stays as the empty-overlay guard.

### Files

- `apps/web/src/store/protocolStore.ts` — new persisted slice `instantiatedObjectiveIds: Record<projectId, objectiveId[]>`; idempotent `markObjectiveInstantiated` / `clearObjectiveInstantiation`; persist `version: 4` with additive migration from v1/v2/v3 (each adds `instantiatedObjectiveIds: {}`, prior slices preserved); `selectObjectiveInstantiated` + `useObjectiveInstantiated` hook; added to `partialize`.
- `apps/web/src/v3/plan/strata/ObjectiveDetailPanel.tsx` — `gatesProtocolInstantiation = Boolean(objective.parameterGroup) && hasEligibleEnterprises`; effect opens the overlay + stamps the marker on the `complete` transition when not already instantiated; manual button regated to `gatesProtocolInstantiation && status === 'complete'` (now labelled a re-instantiate affordance).
- `apps/web/src/store/__tests__/protocolStore.instantiation.test.ts` (new) — 8 tests: mark+select readback; idempotency; cross-project/objective isolation; clear-only-named; clear no-op; deactivate does NOT clear marker (no re-fire); v3→v4 migration (preserves records/activations/expectations); v1→v4 migration (all newer slices initialised).

## Grounding / Amanah

Protocol instantiation on objective approval is workflow orchestration — no sales channel, advance purchase, or financing instrument. Verbatim Amanah scopeNotes on protocols untouched. Clean, no riba/gharar.

## Verification

- **Web `tsc --noEmit`** (`apps/web`, 8 GB heap — OOMs at default) → exit 0, clean.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`) → 52 tests pass across 8 files, incl. the new instantiation suite (exactly-once marker + no-refire-after-deactivate + v1/v3→v4 migration).
- **Live store-migration proof** — v4 migration ran live: `localStorage['ogden-protocols']` shows `version: 4` with the `instantiatedObjectiveIds: {}` slice present.
- **End-to-end in-app auto-open — NOT live-proven.** Blocked by the pre-existing catalogue gap below; disclosed honestly rather than claimed working.

## Carried items / deferred

1. **Trigger reachability blocker (per-type parameterGroups).** `s6-yield-flows` is the only objective with a `parameterGroup` and lives ONLY in the legacy static skeleton (null-type projects). Typed projects (which alone have `hasEligibleEnterprises`) resolve from per-type catalogues that carry no `parameterGroup` objective, so the gate's two conditions are mutually exclusive in current data. The prior manual button had the identical gate, so Phase B introduces no regression. **Next session:** author per-type `parameterGroup` objectives + value-setting tokens for the new catalogue so the §10.1 trigger becomes reachable end-to-end. (Also flagged in the Phase A plan as the deferred new-catalogue trigger-variable item.)
2. **Overlay → resolver migration.** The `ProtocolApprovalOverlay` still uses the legacy livestock `templatesForEnterprises(enterprisesForProjectTypes(...))` path; migrating it to `resolveProjectProtocols` (so it surfaces the resolved standing set, not just enterprise templates) is deferred.

## Commits (not pushed)

- `b5fcd16c` feat(plan/protocol): stratum-scope Protocol Mode + tension banner + source badges (Phase A)
- `67c29e5d` feat(plan): wire §10.1 objective-approval → protocol-instantiation trigger (Phase B)

## Status

Both phases **complete and committed locally** (not pushed). Phase A live-verified. Phase B trigger mechanism shipped + unit-proven; end-to-end firing pending the deferred per-type-parameterGroup catalogue work.
