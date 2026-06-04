# ADR: OLOS Act completion fork — wire the formal proof/verification backend, replace the lightweight path

**Date:** 2026-06-04
**Status:** accepted

**Context:**
The 2026-06-03 Act objective-coverage audit ([[decisions/2026-06-03-olos-act-objective-coverage-audit]],
`scripts/audit-out/act-coverage-findings.md` Section 5) flagged a deliberate
architecture fork awaiting a decision. Two completion paths exist for an Act-stage
task:

1. **Lightweight (live today).** Completion runs entirely through the
   `ObserveDataPoint` path (`useObserveDataPointStore.recordDataPoint`, a
   `manual_observation` data point). It records *that* something happened but
   carries no structured proof artifact and no separate-party sign-off. It is
   local-first and sits outside `syncService`'s 4-slice server coverage.
2. **Formal (built, unwired).** A full proof/verification layer exists across all
   five layers but is not connected to the live Act UI:
   - **DB:** `apps/api/src/db/migrations/043_olos_foundation.sql` —
     `olos_proof_records` (proofType photo/measurement/note/receipt/inspection/
     test/signature/before-after/video/document; fileUri, note, measurement,
     geotag, capturedAt, submittedBy, verificationStatus) and
     `olos_verification_records` (verifierId, outcome pass/fail/partial/
     needs-rework, criteriaChecked, notes, requiredReworkIds, proofRecordIds),
     both FK to `olos_act_tasks ON DELETE CASCADE`.
   - **Shared:** `packages/shared/src/schemas/olos/proofRecord.schema.ts`,
     `verificationRecord.schema.ts`.
   - **API:** `apps/api/src/routes/olos/proofs.ts`, `verifications.ts` (Fastify
     CRUD + RBAC + activity log).
   - **Client:** `apps/web/src/store/olos/proofRecordStore.ts`,
     `verificationRecordStore.ts` + `api.olos.proofs` / `api.olos.verifications`
     bindings.

Exploration corrected the audit's "deferred epic = unbuilt backend" framing: the
backend is substantially built; the gap is **UI wiring**. `proofRecordStore` is
dead (no call sites); `verificationRecordStore` is read only for a count in
`ActProgressBar.tsx`; the Phase 2.4 sync verbs have zero call sites. Two of those
verbs (`pullForTask`, `pushOne`) also carry the same serverId/dedup bug that the
2026-05-29 assignment-substrate work already fixed for `actTaskStore`
([[entities/act-tier-shell]]).

**Decision:**
1. **Fork direction — wire formal, replace lightweight.** The end-state is that
   all Act-stage completion flows through `olos_proof_records` + a separate-party
   `olos_verification_records` sign-off; the `ObserveDataPoint` self-record path
   for task completion is retired. The replacement migration is multi-session.
2. **Verifier model — two-party.** The proof submitter (owner/designer) captures
   one or more `ProofRecord`s; a *separate* reviewer signs off via a
   `VerificationRecord`, reusing the existing reviewer RBAC. Proof create =
   owner/designer; verification create = owner/designer/reviewer (mirrors the
   API route gates in `verifications.ts` / `proofs.ts`).
3. **This session — ADR + one vertical slice behind a feature flag.** Wire ONE
   task's proof capture + verification end-to-end to the server and back, gated
   by `OLOS_FORMAL_PROOF_ENABLED` so nothing changes for existing users until
   enabled. `ObserveDataPoint` is NOT removed yet — the slice is additive.

**Key constraints honoured by the slice:**
- **Proof-before-verification ordering.** `VerificationCreateInput.proofRecordIds`
  is `z.array(z.string())` referencing server proof ids; proofs must be
  server-saved (UUID) before a verification cites them. Flow: capture proof →
  `pushOne` (returns UUID) → reviewer creates verification citing that UUID →
  `pushOne`.
- **No auto-transition (two-write).** The verification API never transitions the
  task. A `pass` verification must be followed by an explicit `actTaskStore`
  status write to `verified-complete`; `fail`/`needs-rework` → `needs-rework`
  with `requiredReworkIds`. The slice owns both writes (mutate local → `pushOne`),
  mirroring the assignment-substrate two-write pattern.
- **Real ActTask FK.** Proofs/verifications hang off a real `olos_act_tasks` row;
  the mount surface is `ActFeedbackLoop.tsx`, which already lists synced ActTasks
  per objective and resolves serverId + member roster.
- **serverId discipline.** The store is keyed by LOCAL projectId; only the API
  speaks serverId. `pullForTask` / `pushOne` are threaded with serverId,
  normalise each record's projectId back to local on write, and drop the local-id
  draft on create — the exact fix `actTaskStore` already carries.

**Migration path (multi-session, roadmap):**
- **Now:** formal path behind the flag for the vertical slice (Homestead +
  Silvopasture slice tasks).
- **Next:** expand formal capture per objective type; build proof-type-specific
  capture affordances (measurement vs inspection vs photo).
- **Then:** flip the flag on by default; migrate existing `ObserveDataPoint`
  completion reads to the formal records; retire `recordDataPoint` task-completion
  writes. The `ObserveDataPoint` store remains for genuine observation logging,
  not task completion.

**Amanah Gate:** proof/verification of completed land-stewardship work is evidence
capture (photos, measurements, inspection notes, separate-party sign-off). No
sales channel, advance purchase, or financing instrument — clean, no riba/gharar.
No covenant content is re-encoded at this layer.

**Consequences:**
- Act-stage completion gains a structured, server-synced, two-party-verified audit
  trail instead of a single self-recorded local data point.
- The proof/verification stores stop being dead code; their Phase 2.4 sync bug is
  fixed in passing (same pattern as `actTaskStore`).
- A flag-gated slice means zero behaviour change for existing users until the flag
  is enabled; the `ObserveDataPoint` path keeps working through the migration.
- Out of scope for the slice: `ObserveDataPoint` retirement migration, binary
  file/photo upload (only `fileUri` string today), per-objective verification
  criteria templates, and wiring proof/verify into surfaces other than
  `ActFeedbackLoop`.

Builds on the assignment-substrate sync precedent
([[decisions]], `docs/superpowers/plans/2026-05-29-atlas-assignment-substrate.md`).

---

## Phase 1 — unify Act completion onto one surface (2026-06-04)

**Status:** implemented (behind `OLOS_FORMAL_PROOF_ENABLED`, still default-off).

The kickoff slice (above) wired the formal path but mounted it **only in
`ActFeedbackLoop`** inside the OLOS ObjectiveWorkspace — a different surface
from where stewards actually complete work (the Act **tier-shell** right rail,
`ActTierExecutionPanel`). Phase 1 surfaces the formal panel inside the tier-shell
completion surface so the two completion models converge on one place, additive
and behind the same default-off flag. The lightweight `ObserveDataPoint`
"Record observation" path is **kept as the permanent offline fallback**, not
removed.

### The obstacle: two id spaces

The two completion models live in different route trees with **non-matching
identifier spaces**:

| | Lightweight (live, default) | Formal (flag-gated) |
|---|---|---|
| Unit of work | `PlanStratumObjective` (per-project) | `ActTask` (`olos_act_tasks`) |
| Objective id | `ObserveDataPoint.sourceObjectiveId` = `PlanStratumObjective.id` | `ActTask.objectiveId` = **universal catalogue** Act objective id (`${domain}--act`) |
| Existence | every stratum objective | sparse — only after an approved Plan→Act handoff |

### The domain-bridge contract

The seam between them is the **domain**, never id-equality:

```
getPrimaryDomainForObjective(planStratumObjective)
  → getObjective('act', domain)?.id            // universal Act catalogue id
  → actTaskStore.listForObjective(projectId, thatId)
```

- **Pure core:** `resolveActObjectiveId(objective): string | null`
  (`packages/shared/src/relationships/actObjectiveTaskBridge.ts`) — objective →
  domain → universal Act catalogue objective id (null when the domain or its Act
  objective is absent).
- **Store-aware hook:** `useActObjectiveTaskBridge(projectId, serverId, objective)`
  (`apps/web/src/v3/act/tier-shell/`) returns
  `{ status: 'offline' | 'no-domain' | 'no-task' | 'ready', actObjectiveId, tasks }`.
  **Read-only** — it never writes a store and never seeds a task.

**Never** match `ObserveDataPoint.sourceObjectiveId` against `ActTask.objectiveId`;
they are different id spaces and would silently mis-link.

### No auto-seed

When synced but no handoff-seeded `ActTask` exists for the domain, the tier-shell
surfaces a **"No formal task yet" hint** and does nothing else. Auto-seeding is
forbidden: tier-shell objectives carry no `ActHandoffPackage`, and
`ActTaskSchema` requires `handoffPackageId` (min 1) — fabricating one would
pollute the assignment list with a synthetic package. The bridge stays
read-only; tasks arrive only via an approved Plan→Act handoff.

### Tier-shell-only `task_verification` emission

On a formal **PASS** sign-off, the tier-shell adapter emits a
`task_verification` `ObserveDataPoint` so the formal completion still lands in
the existing Observe dashboard / rollup / Plan reconciliation:

```
recordDataPoint({
  domainId: getPrimaryDomainForObjective(objective),  // same key as lightweight
  sourceType: 'task_verification',
  sourceActionId: task.id,                             // the verified ActTask
  sourceObjectiveId: objective.id,                     // PlanStratumObjective id space
  statusOutput: 'clear',
  measurementValue: { label: objective.title, note: verification.notes ?? null },
  capturedBy: 'act-tier-formal',
  // remaining fields → schema defaults
})
```

This is emitted **only from the tier-shell**, where the `PlanStratumObjective`
is in hand so `domainId` + `sourceObjectiveId` match the lightweight path
exactly. The OLOS-workspace `ActFeedbackLoop` mount leaves `onVerifiedPass`
unset — it lacks the objective and would mis-key Observe. `needs-rework` emits
nothing. The mechanism is a new optional `onVerifiedPass?(verification)` callback
on `TaskProofPanel`, fired inside `onSignOff` after the two-write succeeds and
only when `outcome === 'pass'`.

### Restyle

`TaskProofPanel` moved from the shared `HandoffSection.module.css` to a dedicated
`TaskProofPanel.module.css`. Every rule reads a panel-scoped `--tpp-*` token
resolved on `.packet` from a host-variable fallback chain (tier-shell `--color-*`
→ OLOS `--bg-*`/`--text-*`/`--accent-*` → dark default), so the panel inherits
its host palette (warm/gold in the tier-shell, cool/blue in OLOS) instead of
hardcoding one theme.

### Invariants

- **Flag-off byte-identical.** All new tier-shell JSX is gated on
  `isOlosFormalProofEnabled()`; the bridge hook is pure-read (no DOM, no writes),
  so a flag-off render is unchanged.
- **Offline = lightweight.** No `serverId` ⇒ bridge `'offline'` ⇒ the formal
  section never mounts; "Record observation" is the sole completion path.
- **No schema change, no new API, no auto-seed, no route change.** Reuses
  `actTaskStore` / `proofRecordStore` / `verificationRecordStore` and the existing
  proofs/verifications/tasks APIs and hooks as-is.

### Files

- `packages/shared/src/relationships/actObjectiveTaskBridge.ts` (+ index export)
- `apps/web/src/v3/act/tier-shell/useActObjectiveTaskBridge.ts`
- `apps/web/src/v3/act/tier-shell/ActTierShell.tsx` (serverId/member/role
  resolution + `useActTaskSync`, threaded as optional props)
- `apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx` (flag-gated
  "Verification" section + `task_verification` emission)
- `apps/web/src/v3/olos/handoff/TaskProofPanel.tsx` (`onVerifiedPass` +
  module swap) + `TaskProofPanel.module.css`
- Tests beside each surface (bridge core, bridge hook, panel callback, formal
  section + emission).

### Still deferred (later phases)

Retiring `recordDataPoint` for completion, flipping the flag default, per-type
capture affordances, `task_verification` emission from the OLOS-workspace mount,
and a live e2e smoke against native pg 5432.
