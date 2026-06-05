# OLOS Formal Proof - Phase 2: Slice-Scoped Capture Affordances + Flip-Readiness Gate

**Date:** 2026-06-04
**Project:** OLOS / Atlas (`atlas/`, branch `feat/atlas-permaculture`)
**Status:** design / draft (awaiting operator review)
**Builds on:** [[decisions/2026-06-04-olos-proof-verification-fork]] (Phase 1 section), Phase 1 log `log/2026-06-04-olos-act-completion-unification-phase1.md`

---

## 1. Context

The fork ADR decided to wire the formal proof/verification path and retire the lightweight `ObserveDataPoint` self-record over a multi-session migration. Phase 1 unified the two Act-completion surfaces onto the tier-shell right rail behind the default-off `isOlosFormalProofEnabled()` flag, bridged the two id spaces by domain (`resolveActObjectiveId` + read-only `useActObjectiveTaskBridge`), and emits a `task_verification` ObserveDataPoint on a formal PASS.

**The load-bearing fact:** the formal round trip (capture -> server -> verify -> Observe) has **never run end to end**. Phase 1's own verification log records *"live e2e smoke NOT YET RUN."* Phase 2 therefore does NOT begin with breadth. It begins with proof.

`TaskProofPanel` today gives only `measurement` a bespoke affordance; the other nine proof types share a generic note + free-text `fileUri` string. A mature upload stack already exists (`StorageProvider` S3+local, `POST /projects/:id/files` with multipart + EXIF/geo parsing + owner/designer RBAC), so binary capture is a wiring problem, not a greenfield storage problem.

**Amanah Gate:** proof/verification is evidence capture (photos, measurements, inspection notes). No sales channel, advance purchase, or financing instrument - clean, no riba/gharar. CSRA untouched ([[fiqh-csra-erased-2026-05-04]]). No covenant content re-encoded at this layer.

---

## 2. Phase 1.5 - e2e smoke gate (HARD PREREQUISITE, blocks Phase 2)

Before any Phase 2 code, exercise the Phase 1 path once, for real, against native postgresql-x64-17 on localhost:5432 (NOT docker `ogden-postgres`):

1. `localStorage['ogden-flag-olos-formal-proof'] = 'true'`; open a **synced** project's tier-shell objective whose domain has a handoff-seeded `ActTask`.
2. Capture a proof; reviewer signs off PASS.
3. Assert: `ActTask` -> `verified-complete`, AND a `task_verification` ObserveDataPoint appears in the Observe dashboard for that domain/objective (correct `domainId` + `sourceObjectiveId`).
4. Flip the flag off -> tier-shell is identical to today.

**Gate:** Phase 2 does not start until this round trip is observed (screenshot or DOM-proof; no screenshot = no "working" claim - and `preview_screenshot` hangs are transient, [[project-screenshot-hang]]). If it fails, fixing it IS the next work, not Phase 2 breadth. This guards against building affordances on an unvalidated core.

---

## 3. Operator decisions (this scoping)

- **Affordance scope - build for the slice, not the enum.** Phase 2 builds bespoke affordances for **three** proof types only: `photo`, `measurement`, `inspection` - the types the Homestead + Silvopasture vertical slice actually needs. The other seven (`note` already trivial, `receipt`, `test`, `signature`, `before-after`, `video`, `document`) keep the existing generic note + `fileUri` fallback and are expanded later from real operator evidence. **No deletion** of the generic path (it remains the working capture for the deferred types and the offline story).
- **Upload wiring - reuse `POST /projects/:id/files`.** Binary capture uploads via the existing project-files endpoint (storage + EXIF/geo parsing + owner/designer RBAC for free), then writes the returned `storage_url` into `ProofRecord.fileUri`. No new upload route, no new storage, no presign.
- **Structured model - typed discriminated `details` union (migration).** Add an optional `details` discriminated union to `ProofRecordSchema`, persisted as a `jsonb` column. Phase 2 implements **only the `inspection` variant**; the union is shaped so `signature` and `test` variants can be added later additively without breaking. `measurement` keeps its existing `measurementValue`/`measurementUnit` fields (no churn).
- **Flip - define criteria + readiness probe; default stays OFF.** Phase 2 writes a testable flip-readiness checklist into the ADR and adds a small automated readiness probe asserting the machine-checkable subset. It does NOT flip `isOlosFormalProofEnabled()`.

---

## 4. Design considerations (domain - explicit; mostly forward-looking)

These are recorded so the Phase 2 model does not foreclose them. Most are NOT built in Phase 2; the additive-schema posture (optional fields, a `jsonb details` column) keeps them cheap to add later.

1. **Verification-as-observation for living systems.** Pass/fail two-party sign-off fits earthworks, water infrastructure, fencing, and input application well; it fits living-system *establishment* (food forest, guild, pasture) poorly - those are seasonal trajectories, not moments. The `task_verification` ObserveDataPoint Phase 1 emits is already the seed of the right answer: a PASS should be able to *open an observation thread*, not only close a task. Phase 2 keeps the binary `outcome`, but names the mismatch and records enough (`capturedAt`, domain/objective keys) that a future `established / under-observation` outcome can layer on without a model rewrite.
2. **Ecological measurement is structured and longitudinal, not scalar.** Real measurement is a time series (infiltration across storms), directional (wind rose), or a qualitative indicator (% ground cover, dung-beetle presence, first-frost date). The Observe layer already learned this (the 2026-06-03 `lensMeasurement` binding with structured per-viz payloads). Phase 2's `measurement` affordance stays `value + unit` for the slice, but **future measurement detail must align with the `lensMeasurement` binding model rather than growing a parallel flat scalar.**
3. **Biodynamic timing and input provenance.** For BD/Demeter work, the verification question is not only "did it happen" but "was it done at the right time, with what input, from where." This implies a future `performedAt` distinct from `capturedAt` (intended-vs-actual timing against a calendar) and an input chain-of-custody note. **Not built in Phase 2** - documented so the `details` union and additive-schema path leave room.
4. **Certification readiness / audit export.** Demeter, organic, and regenerative certifications ARE a separate-party proof + verification audit trail. Keeping the model audit-compatible (timestamped, separate-party, provenance-bearing, exportable) turns this layer from internal completion hygiene into a willingness-to-pay capability ("Atlas keeps your certification audit trail as you work"). Phase 2 does **not** build export; it commits only to not precluding it (no destructive transforms, preserve `submittedBy`/`verifierId`/timestamps).

---

## 5. Architecture, components, data flow

**A. Shared schema (`packages/shared`)**
- New `ProofDetails` discriminated union. Phase 2 ships `{ kind: 'inspection', items: { label: string; status: 'pass'|'fail'|'na'; note?: string }[] }`. Reserve `signature` / `test` discriminants in the type design (commented, not implemented) so later additions are additive.
- Add optional `details?: ProofDetails` to `ProofRecordSchema`.
- Export a `parseProofDetails` safe-reader + type guards (mirrors `parseLensMeasurement`).

**B. API (`apps/api`)**
- Migration: add nullable `details jsonb` to `olos_proof_records`.
- `routes/olos/proofs.ts`: persist + return `details` (camel/snake mappers); no new endpoint; reuse `POST /projects/:id/files` for binary.

**C. Client store (`apps/web`)**
- `proofRecordStore`: thread `details` through `createProof` / `pushOne` / `pullForTask` with snake<->camel mapping. serverId discipline unchanged.

**D. Web upload helper (`apps/web`)**
- Locate/add the web api-client binding for `POST /projects/:id/files`. Capture flow for binary types: pick file -> upload -> `storage_url` -> `createProof({ proofType, fileUri: storage_url })`. Surface filename/thumbnail in the captured list.

**E. Capture UI (`TaskProofPanel`)**
- Replace the single generic form body with a per-`proofType` affordance switch:
  - `measurement` -> existing value + unit (kept);
  - `inspection` -> dynamic checklist rows (add/remove; per-row label + pass/fail/na + note) -> serialized into `details`;
  - `photo` -> file picker -> upload -> `fileUri` + thumbnail;
  - **all other types -> the existing generic note + `fileUri` field (preserved, not deleted).**
- Captured-proof list renders a richer per-type summary (inspection: pass/fail counts; photo: thumbnail/filename; measurement: value+unit as today).

**F. Flip-readiness gate**
- ADR: a testable flip-readiness checklist (Phase 1.5 smoke green; the three slice affordances shipped + tested; `details` inspection round-trips; upload round-trip verified on native pg 5432; OLOS + tier-shell parity; no open Sev-1).
- Readiness probe: a bounded test/script asserting the machine-checkable subset (every `ProofType` has a capture branch and a render branch - bespoke or generic; `ProofDetails` discriminants are exhaustively handled) and explicitly listing the manual criteria (e2e smoke) as human-gated. Must be green before any future flip.

---

## 6. Invariants

- **Flag default OFF; flag-off render byte-identical.** All new UI gated; no behavior change for existing users.
- **No deletion in revamps.** The generic note + `fileUri` capture remains for the seven deferred types.
- **Reuse storage + RBAC.** No new upload route, no presign, no large-video streaming. owner/designer for capture, owner/designer/reviewer for verify (unchanged).
- **serverId discipline** preserved (stores keyed by local projectId; API by serverId).
- **Windows-bounded vitest** `--pool=forks --testTimeout=20000`. Web `tsc` via PowerShell, filter `src/compost` (pre-existing foreign WIP).
- **Branch hygiene:** `git fetch` + divergence check before each commit; stage by explicit name / pathspec commit (NEVER `git add -A`); commit each task on green; no `--amend`; do not push; ASCII-only; end messages `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## 7. Testing

- **shared:** `ProofDetails` parse + guards; inspection round-trips; unknown/old records without `details` still parse (back-compat).
- **api:** migration applies; proofs route `details` round-trip (create -> read echoes `details`); bounded, forks.
- **store:** `proofRecordStore` carries `details` through create/push/pull with correct snake/camel.
- **web upload-wiring:** mocked files API -> `fileUri` set from `storage_url`.
- **`TaskProofPanel`:** three bespoke affordances render + capture; a deferred type (e.g. `document`) still renders the generic fallback and captures; flag-off byte-identical.
- **readiness probe:** green; asserts every `ProofType` has a branch and `ProofDetails` is exhaustive.
- Web `tsc` clean outside `src/compost/`.

---

## 8. Task decomposition (TDD, commit-per-task, pathspec, no push)

- **P1.5** e2e smoke gate (manual, evidence-backed) - **blocks all of Phase 2.**
- **P2.1** shared `ProofDetails` union (inspection) + `parseProofDetails` + guards + tests; shared `tsc`.
- **P2.2** DB migration (`details jsonb`) + `proofs.ts` round-trip mappers + bounded api test.
- **P2.3** `proofRecordStore` `details` plumbing (create/push/pull, snake/camel) + test.
- **P2.4** web upload-wiring helper (files endpoint -> `fileUri`) + test.
- **P2.5** `TaskProofPanel` per-type affordance switch (measurement/inspection/photo) + preserved generic fallback + tests (largest task).
- **P2.6** flip-readiness criteria (ADR section) + readiness probe + test.
- **P2.7** docs (wiki log + index) + full verification sweep.

---

## 9. Out of scope (Phase 2)

- Bespoke affordances for the seven deferred types (`receipt`, `test`, `signature`, `before-after`, `video`, `document`, rich `note`).
- Flipping the `isOlosFormalProofEnabled()` default.
- `task_verification` emission from the OLOS-workspace `ActFeedbackLoop` mount.
- Presigned client-direct upload / large-video streaming.
- Certification audit export (design-considered only).
- `performedAt` / input provenance fields (design-considered only).
- A `verification-as-observation` outcome (named, not built).
- Retiring `recordDataPoint` for completion.

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 1 round trip is actually broken | Med | High | Phase 1.5 smoke gate runs FIRST; fixing it preempts Phase 2 |
| Building affordances no operator needs | Med | Med | Build-for-slice (3 types); expand from evidence, not from the enum |
| `details` shape wrong on first real use | Med | Med | jsonb column + additive union; only `inspection` shipped; iterate before adding signature/test |
| Flag-off render drifts | Med | High | All new UI flag-gated; byte-identical test |
| Upload RBAC/route mismatch vs proof-create gate | Low | Med | Reuse files endpoint (owner/designer) - same gate as proof create |
| External rebase wipes uncommitted work | High | Med | Commit each task on green; fetch + divergence check first; pathspec commits |
