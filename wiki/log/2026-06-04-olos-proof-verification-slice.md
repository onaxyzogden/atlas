# 2026-06-04 — OLOS proof/verification backend: ADR + first vertical slice

**Project:** OLOS / Atlas · branch `feat/atlas-permaculture`
**Arm:** Kickoff of the deferred `olos_*` proof/verification epic — the last out-of-scope item from the 2026-06-03 Act objective-coverage audit. ADR + one end-to-end slice behind a feature flag.

## What

Opened the formal proof/verification path for Act completion. The backend (DB migration 043, shared Zod schemas, Fastify CRUD+RBAC routes, client stores, `api.olos.proofs`/`verifications` bindings) was already **built** — the gap was **UI wiring**, plus a latent serverId/dedup bug in two store sync verbs. This slice wires one task end-to-end behind `OLOS_FORMAL_PROOF`, off by default. The lightweight `ObserveDataPoint` completion path is untouched; retiring it is the multi-session replacement migration the ADR roadmaps.

Two-party model: a submitter (owner/designer) captures structured `ProofRecord`s; a separate reviewer (owner/designer/reviewer) signs off with a `VerificationRecord` that drives the `ActTask` to `verified-complete` / `needs-rework`.

## Decisions (operator, this session)

- **Fork direction:** wire formal & replace lightweight (end-state = all Act completion through `olos_proof_records` + verification). This slice is additive-behind-a-flag; rip-out is multi-session.
- **Deliverable:** ADR + one vertical slice behind a feature flag.
- **Verifier model:** two-party (submitter captures, separate reviewer signs off; existing reviewer RBAC).

ADR: [[decisions/2026-06-04-olos-proof-verification-fork]].

## Key constraints honoured

1. **Proof-before-verification ordering** — `VerificationCreateInput.proofRecordIds` is `uuid[]`, so proofs must be server-saved (UUID returned) before a verification can cite them. Sign-off is disabled until ≥1 proof has a UUID.
2. **No auto-transition** — the verifications API never moves the task; sign-off owns a **second write** (set ActTask status → push), mirroring the assignment-substrate two-write pattern.
3. **serverId / local-id discipline** — stores keyed by LOCAL projectId, API addressed by serverId. Fixed `pullForTask`/`pushOne` on both proof + verification stores to take serverId, normalise each record's `projectId` back to local on write, and drop the local-id draft on create (dedup). Same fix actTaskStore got on 2026-05-29.
4. **RBAC mirror** — proof create = owner/designer; verification create = owner/designer/reviewer; both require a serverId (synced capability).
5. **Flag-gated** — `apps/web/src/config/olosFlags.ts` `isOlosFormalProofEnabled()`: localStorage override (`ogden-flag-olos-formal-proof`) wins, else `VITE_OLOS_FORMAL_PROOF_ENABLED`, default false. Mirrors the telemetry-flag convention.

## Files

- `apps/web/src/store/olos/proofRecordStore.ts` + `verificationRecordStore.ts` — serverId threading + normalise + dedup (+ colocated tests).
- `apps/web/src/hooks/useTaskProofSync.ts` — pulls a task's proofs + verifications by serverId on mount; no-op offline (+ test).
- `apps/web/src/config/olosFlags.ts` — the feature flag (+ test).
- `apps/web/src/v3/olos/handoff/TaskProofPanel.tsx` — per-task capture form + proof list + reviewer sign-off (two-write); reuses `HandoffSection.module.css` (+ test).
- `apps/web/src/v3/olos/handoff/ActFeedbackLoop.tsx` — mounts `<TaskProofPanel>` per task behind the flag, threading serverId; existing assignment/escalation behaviour + copy byte-identical (+ test extended with flag-off-absent / flag-on-present pins).

## Grounding / Amanah

Proof/verification of completed land-stewardship work is evidence capture (photos, measurements, inspection notes, sign-off). No sales channel, advance purchase, or financing instrument — clean, no riba/gharar. No covenant content re-encoded at this layer.

## Verification

- **Web `tsc --noEmit`** (from `apps/web`, 8 GB heap) → no errors outside the pre-existing `src/compost/` foreign WIP (42 errors, not mine; plan/spine `enterpriseScope` lines are committed code I never touched). My slice adds **zero** type errors.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`) over all six slice files → **21/21 green**: olosFlags 3, proofRecordStore 3, verificationRecordStore 3, useTaskProofSync 3, TaskProofPanel 4, ActFeedbackLoop 5 (incl. 2 new flag pins). The `act(...)` stderr line on ActFeedbackLoop is a pre-existing benign warning from the members effect, not a failure.
- **Shared `tsc`** — not run; shared schemas untouched this slice.
- **End-to-end live smoke** — **NOT YET RUN.** Requires the full stack up (API on native `postgresql-x64-17` :5432 + web + flag on) and a screenshot/DB assertion. Per "no screenshot = no working claim," this is left as the recommended next manual verification: on a synced project, flag on, capture a proof (assert a UUID row in `olos_proof_records`), sign off pass as reviewer (assert an `olos_verification_records` row + task `verified-complete`).
- **No regression** — flag OFF leaves `ActFeedbackLoop` behaviour byte-identical (pinned by the flag-off test); assignment + escalation tests stay green.

## Commits (not pushed)

- `d7634624` ADR — proof/verification fork decision
- `2b03d7d5` proofRecordStore serverId fix (+ test)
- `7e0a5b70` verificationRecordStore serverId fix (+ test)
- `badaaa54` useTaskProofSync hook (+ test)
- `bd980b4c` OLOS_FORMAL_PROOF feature flag (+ test)
- `c923b132` TaskProofPanel component (+ test)
- `bcd9f5ff` mount TaskProofPanel in ActFeedbackLoop behind the flag (+ test)
- (this entry) docs

## Notes / carried items

- Commit `239f4835` (an earlier verificationRecordStore attempt) swept in 4 foreign `src/compost/*` WIP files because `git commit -F` commits the whole index. Fixed by operator-authorised soft-reset + clean recommit (`7e0a5b70`). **Lesson:** always `git diff --cached --name-only` and commit with an explicit pathspec before each commit — the index can carry pre-staged foreign files.
- Out of scope (roadmapped): retiring `ObserveDataPoint`; multipart file/photo upload (only `fileUri` stored today); per-objective verification-criteria templates, batch verify, attestation, analytics; wiring proof/verify into surfaces other than `ActFeedbackLoop`.

## Status

Epic **kickoff complete**: ADR filed, the formal path is wired end-to-end for one task behind a default-off flag, all unit/component tests green. Live e2e smoke + the `ObserveDataPoint` replacement migration are the next sessions.
