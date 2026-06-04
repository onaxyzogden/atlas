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
