# 2026-06-04 — OLOS Act completion unification (Phase 1): formal panel into the tier-shell

**Project:** OLOS / Atlas · branch `feat/atlas-permaculture`
**Arm:** First shippable step of the multi-session `ObserveDataPoint` replacement migration ([[decisions/2026-06-04-olos-proof-verification-fork]]). Surface the formal proof/verification panel inside the **tier-shell** completion surface, bridge the two id spaces, and project formal passes back into Observe — additive, behind the same default-off flag.

## Why

The kickoff slice wired the formal path but mounted it **only in `ActFeedbackLoop`** (OLOS ObjectiveWorkspace) — a different surface from where stewards complete work (the Act tier-shell right rail, `ActTierExecutionPanel`). The two completion models also live in **different id spaces**: lightweight keys `ObserveDataPoint.sourceObjectiveId` to the per-project `PlanStratumObjective.id`; formal keys `ActTask.objectiveId` to the **universal catalogue** Act objective id (`${domain}--act`). They link by **domain only**, never id-equality.

## What

Behind `isOlosFormalProofEnabled()` (still default-off), the tier-shell right rail now surfaces the formal "Verification" section, unifying the two surfaces onto one. Lightweight "Record observation" stays as the permanent offline fallback.

- **Domain-bridge contract.** Pure `resolveActObjectiveId(objective)` (`packages/shared/src/relationships/actObjectiveTaskBridge.ts`): objective → `getPrimaryDomainForObjective` → `getObjective('act', domain)?.id`. Store-aware read-only `useActObjectiveTaskBridge(projectId, serverId, objective)` → `{ status: 'offline'|'no-domain'|'no-task'|'ready', actObjectiveId, tasks }`. No writes, no auto-seed.
- **No auto-seed.** Synced-but-no-task → a "No formal task yet" hint; tier-shell objectives carry no `ActHandoffPackage` and `ActTaskSchema` requires `handoffPackageId` (min 1), so seeding would fabricate a synthetic package. Tasks arrive only via an approved Plan→Act handoff.
- **Tier-shell-only `task_verification` emission.** On a formal PASS, the tier-shell adapter emits a `task_verification` `ObserveDataPoint` (`domainId` = `getPrimaryDomainForObjective(objective)`, `sourceObjectiveId` = `objective.id`, `sourceActionId` = task.id, `capturedBy` 'act-tier-formal'). Emitted ONLY here, where the `PlanStratumObjective` is in hand so the keys match the lightweight path exactly. `needs-rework` emits nothing. Mechanism: a new optional `onVerifiedPass?(verification)` callback on `TaskProofPanel`, fired inside `onSignOff` after the two-write, only when `outcome === 'pass'`. The OLOS-workspace mount leaves it unset (it lacks the objective).
- **Restyle.** `TaskProofPanel` moved to a dedicated `TaskProofPanel.module.css` whose rules read panel-scoped `--tpp-*` tokens resolved from a host-variable fallback chain (tier-shell `--color-*` → OLOS `--bg-*`/`--text-*`/`--accent-*` → dark default), so it inherits its host palette (warm/gold tier-shell, cool/blue OLOS).

## Invariants honoured

- **Flag-off byte-identical** — all new tier-shell JSX is flag-gated; the bridge hook is pure-read.
- **Offline = lightweight** — no `serverId` ⇒ bridge `'offline'` ⇒ formal section never mounts.
- **No schema change, no new API, no auto-seed, no route change** — reuses existing stores/APIs/hooks as-is.

## Verification

Bounded vitest (`--pool=forks --testTimeout=20000`):
- shared `actObjectiveTaskBridge` 4/4; web `useActObjectiveTaskBridge` 6/6; `TaskProofPanel` 6/6; `ActTierExecutionPanel.formal` 5/5 ((a) flag-off → no section; (b) flag-on+synced+seeded → section + panel; (b2) flag-on+no-task → hint; (c) flag-on+offline → no section; (d) PASS → a `task_verification` point keyed to the objective's `domainId` + `sourceObjectiveId`).
- Full tier-shell dir 78 pass; the 5 failures in `ActTierExecutionPanel.protocols.test.tsx` are **PRE-EXISTING** (a trigger-recognition regression, same count as baseline HEAD — flagged for separate triage, unrelated to this default-off addition).
- Web `tsc` clean outside the pre-existing `src/compost/` foreign WIP.
- **Live e2e smoke NOT YET RUN** (recommended next manual verification: flag on, synced project, tier-shell objective whose domain has a handoff-seeded ActTask → capture proof + reviewer pass → ActTask `verified-complete` AND the pass shows in the Observe dashboard for that domain/objective; flag off → tier-shell identical).

## Commits (explicit-path, not pushed — [[project-branch-rebase]])

`b960f159` (P1.1 shared resolver) → `339284a3` (P1.2 hook) → `18538b55` (P1.3 ActTierShell plumbing) → `ff6a3c16` (P1.4 TaskProofPanel callback + CSS) → `fb818a80` (P1.5 formal section + emission) → docs (P1.6, this entry). HEAD moved externally several times mid-session (rebase); used pathspec commits (`git commit -F <msg> -- <paths>`) throughout to immunise against the index race.

Amanah: evidence capture only — no sales/finance instrument — clean. CSRA untouched ([[fiqh-csra-erased-2026-05-04]]). ASCII-only.

ADR: [[decisions/2026-06-04-olos-proof-verification-fork]] (Phase 1 section). Entity: [[entities/act-tier-shell]].
