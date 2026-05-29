# 2026-05-29 -- projectType normalization: stop project:create 422ing on sync

**Branch.** `feat/atlas-permaculture`

## Synthesis

A continuation of the [[2026-05-25-sync-queue-oom-coalescing-fix]] thread. That
fix bounded the IndexedDB sync queue (coalescing key + cursor batches +
drop-exhausted) so a permanently-failing op could no longer grow it to ~250k and
OOM the renderer -- but it deliberately left the *cause* of the validation
failures unfixed, and could not even name the failing field because the client
discarded the server's structured `details[]`.

This session root-caused and fixed that cause. OLOS carries two project-type
vocabularies: kebab-case **archetype** (`regenerative-farm`, from
`v3/true-north/trueNorthConfig.ts`) and the snake_case server **`projectType`**
(`regenerative_farm`, the Zod `ProjectType` enum). `createProject` persisted
whatever string it was handed, so a kebab archetype could leak into
`projectType`; on sync, `project:create` failed Zod validation with a 422
`VALIDATION_ERROR`, and the circuit breaker dropped the op -- the project was
unsyncable on-device, invisibly.

Live diagnosis identified the offender as the **"Phase 4 Smoke"** dev project
(`projectType` = `regenerative-farm`). This corrects the 2026-05-25 ADR's
provisional attribution to "Moontrance Creek" / "Test Vision Project" -- made
before the failing field was observable. Moontrance Creek actually carries
`projectType: null` (valid); "Test Vision Project" was a transient Stage Zero
vision-builder fixture ([[2026-05-25-atlas-stage-zero-vision-builder]]). A dated
`> [!warning] Correction` callout was added to
[[2026-05-25-sync-queue-oom-coalescing-fix]] preserving the original record.

Three-tier fix (repair + prevent + diagnose):
- **Repair** -- `ogden-projects` persist `migrate` v4 -> v5 maps every existing
  record's `projectType` through the new `normalizeProjectType`, fixing records
  already on disk.
- **Prevent** -- `createProject` normalizes on write, so the store can never
  again persist an unsyncable kebab value.
- **Diagnose** -- `describeSyncError` folds the server `ApiError`'s
  `details: [{ path, message }]` into `op.lastError` and the create-failure log,
  so the next 422 names the offending field. This closes the diagnosability gap
  that forced the 2026-05-25 root cause to be inferred from a "Syncing 254520
  changes..." screenshot rather than read from the error.

## Commits

- `fe367966` -- `fix(sync): normalize projectType kebab->snake so project:create stops 422ing`
  (3 files: `store/projectStore.ts`, `lib/syncQueue.ts`, `lib/syncService.ts`)

## Files of note

**Modified**
- `apps/web/src/store/projectStore.ts` -- `normalizeProjectType()` export +
  `ARCHETYPE_TO_PROJECT_TYPE` import; `createProject` normalizes on write;
  persist `version: 5` + `migrate` v4 -> v5 record repair.
- `apps/web/src/lib/syncQueue.ts` -- `describeSyncError()` export (duck-typed on
  `details`); wired into the `flush()` retry write-back (`lastError`).
- `apps/web/src/lib/syncService.ts` -- import `describeSyncError`; project-create
  catch logs the field-level message.

## Verification

- `npx tsc --noEmit` (apps/web) -- clean.
- Live `ogden-projects` IndexedDB store migrated to `version: 5` on rehydrate;
  post-migrate audit: 0 schema offenders across 40 projects, typeCounts
  `{ "(null)": 4, homestead: 9, multi_enterprise: 16, regenerative_farm: 11 }`.
  Pre-fix, the sole violator was "Phase 4 Smoke" (`regenerative-farm`); clean
  projects were untouched by the migration.
- `git diff --cached --name-only` confirmed only the 3 source files staged (no
  foreign WIP from the working tree's unrelated modifications).

## Smoke test

- "Phase 4 Smoke" (kebab `regenerative-farm`) -> migrate -> `regenerative_farm`
  (valid against the enum). Moontrance Creek (`null`) -> unchanged. A
  `multi_enterprise` / `homestead` / `regenerative_farm` project -> unchanged
  (pass-through). An unknown value -> `null` (syncable), not retained.

## Carry-over

- The [[2026-05-25-sync-queue-oom-coalescing-fix]] **Deferred** item still
  stands: the ~14 executor handlers in `syncService.ts` swallow API errors and
  re-enqueue, so `MAX_RETRIES` never counts up. `describeSyncError` now makes a
  swallowed failure *legible* in the log, but the handlers still do not propagate
  it for retry-counting / circuit-breaking -- left as the same separate refactor.
- Not pushed this session (out-of-band rebase rule -- commit locally, push under
  divergence check).

## Branch state at session close

`feat/atlas-permaculture`, commit `fe367966` (source fix) local. Wiki update
(this entry + ADR + correction callout + index/log pointers) committed
separately as a `docs(wiki):` commit. Neither pushed.
