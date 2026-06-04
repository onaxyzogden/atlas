# 2026-06-04 -- OLOS formal proof Phase 2: per-type capture affordances (additive, flag-off)

Tags: #olos #proof #verification #act #schema #flag-gated
ADR: [[decisions/2026-06-04-olos-proof-verification-fork]] (Phase 2 flip-readiness section)
Builds on: [[log/2026-06-04-olos-act-completion-unification-phase1]], [[log/2026-06-04-olos-proof-verification-slice]]
Entity: [[entities/act-tier-shell]]

## Why

Phase 1 unified the two Act-completion surfaces (formal panel surfaced in the
tier-shell right rail as well as the OLOS workspace) but the formal
`TaskProofPanel` still captured only a free-text note plus an optional file URI
string -- the same lowest-common-denominator capture for every `ProofType`.
The 2026-06-04 fork ADR's end-state ("wire formal & replace lightweight") needs
the formal path to be at least as expressive as the work being proven before
the default flag can ever flip. Phase 2 adds the first structured, per-type
capture affordances behind the same default-off `isOlosFormalProofEnabled()`
flag, additively, with the lightweight note+fileUri capture kept as the
universal fallback.

## What changed (P2.1 -> P2.7)

- **P2.1 -- shared schema (`bd92b9cc`).** Added a `ProofDetailsSchema`
  discriminated union (`z.discriminatedUnion('kind', [...])`) to
  `packages/shared/src/schemas/olos/proofRecord.schema.ts`. Only the
  `inspection` variant is implemented (`{ kind: 'inspection', items:
  ProofInspectionItem[] }`, each item `{ label, status: pass|fail|na, note? }`);
  `signature` and `test` are reserved as comments for additive extension. Added
  a safe reader `parseProofDetails(value): ProofDetails | null` (mirrors the
  existing `parseLensMeasurement`) and `details: ProofDetailsSchema.optional()`
  on `ProofRecordSchema`. Re-exported via the existing `export *`. 5 schema
  tests (valid union, parse-null cases, invalid status, ProofRecord with/without
  details for back-compat).

- **P2.2 -- API round-trip (`67af7733`).** Migration
  `052_olos_proof_details.sql` adds a nullable `details jsonb` column to
  `olos_proof_records`, applied to the native pg 5432 via the project migration
  runner. `apps/api/src/routes/olos/proofs.ts` threads `details` exactly
  parallel to the existing `geotag`: `ProofDetailsSchema.nullish()` on create
  input (patch derives via `.partial()`), `mapRow` returns `row.details ?? null`,
  INSERT/UPDATE use `db.json(...)` with the same undefined/null/value tri-state
  the geotag column uses.

- **P2.4 -- upload helper (`598b9b92` + `eb6dbade`).** New
  `apps/web/src/v3/olos/handoff/uploadProofFile.ts` wraps the existing
  `api.files.upload(serverId, file)` (reuses the project-files multipart route
  -> storage + EXIF/geo) and returns the `storageUrl` for `ProofRecord.fileUri`.
  Correctness fact discovered in review: `api.files.upload` REJECTS (throws
  ApiError) on failure -- it does not return an error envelope -- so the
  `env.error` guard is forward-defensive (documented inline); the reachable
  guard is the empty-storageUrl throw. 3 tests.

- **P2.5 -- per-type affordances + fallback (`b617513e` + `1d8b06d1`).**
  `TaskProofPanel.tsx` gains a 4-way capture form switched on `proofType`:
  measurement (value/unit, kept verbatim from P1.4), inspection (checklist rows
  -> `details = { kind: 'inspection', items }`), photo (`<input type=file
  accept=image/*>` -> `uploadProofFile` -> `fileUri`), and a generic note +
  File-URI fallback preserved for every other type. `onCapture` catches upload
  failures into a `captureError` chip (`role="alert"`) instead of an unhandled
  rejection, and creates NO proof on failure. Proofs list shows an inspection
  pass-count summary. 11 tests (6 prior P1.4 + 5 new incl. rejecting-upload).

- **P2.6 -- flip-readiness probe + ADR criteria (`b5b01549` + `974f39ef`).**
  `proofAffordanceCoverage.test.ts` is the machine-checkable slice of the
  flip-readiness gate: every bespoke key (`measurement`/`inspection`/`photo`) is
  a real `ProofType.options` member, and `ProofDetailsSchema` parses the
  implemented `inspection` discriminant while rejecting the reserved
  `signature`/`test` ones (locking the additive-extension contract). The ADR
  gained a "Phase 2 -- flip-readiness gate" section: a 6-item checklist (1
  manual e2e smoke, 2 automated, 3 manual) that must be green before the default
  flag flips. The flag stays OFF.

- **P2.7 -- verification sweep + docs (this entry).**

## Invariants honoured

- **Flag default OFF.** `isOlosFormalProofEnabled()` unchanged; no flip in this
  phase. With the flag off the render path is unchanged and the lightweight
  `ObserveDataPoint` completion path is untouched.
- **Additive schema.** `details` is optional on `ProofRecordSchema` and a
  nullable column; every pre-Phase-2 ProofRecord still validates and round-trips
  (back-compat test + nullable migration).
- **No deletion.** The generic note + File-URI capture is preserved as the
  universal fallback for the 7 not-yet-bespoke types; the lightweight path
  stays as the offline fallback. ([[feedback-no-deletion]])
- **Reserved-by-comment extension.** `signature`/`test` discriminants are
  reserved but unimplemented; a negative test asserts they do NOT parse, so
  adding them later is a deliberate, tested change.
- **serverId discipline.** Photo upload addresses the SERVER project id;
  unchanged store/API split.

## Verification results

Bounded vitest (Windows: `--pool=forks --testTimeout=20000`):
- shared `proofRecord.schema.test.ts` -- 5/5 green.
- web `src/v3/olos/handoff/__tests__/` -- 21/21 green across 4 files
  (`TaskProofPanel` 11, `ActFeedbackLoop` 4, `uploadProofFile` 3,
  `proofAffordanceCoverage` 2).

Typecheck:
- shared `tsc --noEmit` -- exit 0.
- web `tsc --noEmit` (8GB heap) -- no new errors outside the pre-existing
  foreign `src/compost/*` WIP.

Incidental fix during the sweep: `ActFeedbackLoop.test.tsx` had a stale fixture
-- the assignment-picker test seeded `myRoles: {}` after the Phase-1 base commit
`4ba372b4` switched role resolution to the project-scoped `myRoles[serverId]`
map, so the owner role no longer resolved and the picker test failed. Seeded
`myRoles: { 'srv-1': 'owner' }` in `beforeEach` and `{ 'srv-1': 'viewer' }` in
the viewer test to match the project-scoped contract. This is a fixture the
RBAC refactor should have updated; it is independent of P2.1-P2.6.

**Live e2e smoke NOT YET RUN** -- remains the first (manual) item of the
flip-readiness gate; the flag stays off until it passes.

## Commit chain

`bd92b9cc` (P2.1) -> `67af7733` (P2.2) -> `598b9b92`+`eb6dbade` (P2.4) ->
`b617513e`+`1d8b06d1` (P2.5) -> `b5b01549`+`974f39ef` (P2.6) -> docs (P2.7).
Stage-by-explicit-pathspec throughout (branch `feat/atlas-permaculture` is
rebased externally -- [[project-branch-rebase]]); not pushed; ASCII-only.

## Deferred

- The 7 other capture affordances beyond the slice trio (receipt, note, test,
  signature, before-after, video, document) -- still fall through to the
  generic note+fileUri fallback.
- Before/after (BD) timing + provenance capture.
- Certification / proof-bundle export.
- Flipping the `isOlosFormalProofEnabled()` default (gated on the ADR's
  flip-readiness checklist, incl. the live e2e smoke).
- OLOS-workspace `task_verification` emission (Phase 1 deferral, unchanged).

## Amanah

Evidence capture only -- structured measurements, inspection checklists, and
photos proving completed land-stewardship work, plus separate-party sign-off.
No sales channel, advance purchase, or financing instrument; no CSRA/salam
framing ([[fiqh-csra-erased-2026-05-04]]). Clean -- no riba/gharar.
