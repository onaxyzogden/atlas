# ADR: Normalize projectType (kebab -> snake) so project:create stops 422ing

**Date:** 2026-05-29
**Status:** accepted
**Context:**
The [[2026-05-25-sync-queue-oom-coalescing-fix]] bounded the sync queue so a
permanently-failing op could no longer grow it to ~250k and OOM the renderer,
but it deliberately left the *cause* of the validation failures unfixed and
unnamed -- the client discarded the server's structured error `details[]`, so
the give-up log showed only the opaque "Request validation failed" and never
said which field was rejected.

Live diagnosis on `feat/atlas-permaculture` named it. OLOS carries two parallel
project-type vocabularies: a kebab-case **archetype** (`regenerative-farm`,
authored in `v3/true-north/trueNorthConfig.ts`) and the snake_case server
**`projectType`** (`regenerative_farm`, the Zod `ProjectType` enum --
`regenerative_farm`, `retreat_center`, `homestead`, `educational_farm`,
`conservation`, `multi_enterprise`, `moontrance`). `createProject` stored
whatever value it was handed verbatim, so a kebab archetype could leak into
`projectType`. On sync, `project:create` failed Zod validation with a 422
`VALIDATION_ERROR`; the circuit breaker then dropped the op, leaving the project
unsyncable on-device.

The live offender was the **"Phase 4 Smoke"** dev project (`projectType` =
`regenerative-farm`). "Moontrance Creek" carries `projectType: null` (valid --
optional server-side). This corrects the 2026-05-25 ADR's provisional
attribution to "Moontrance Creek" / "Test Vision Project" (the latter a
transient Stage Zero vision-builder fixture, see
[[2026-05-25-atlas-stage-zero-vision-builder]]) -- that attribution was a
best guess made *before* the failing field was observable.

**Decision:**
- **`normalizeProjectType(value)`** (exported from `store/projectStore.ts`):
  passes through any value already valid against the `ProjectType` Zod enum;
  maps a known kebab archetype via `ARCHETYPE_TO_PROJECT_TYPE`
  (`trueNorthConfig.ts`); returns `null` for unknown/empty values (projectType
  is optional server-side, so null is syncable). One chokepoint, used on both
  write and migrate.
- **`createProject()` normalizes on write**, so the local store can never again
  persist an unsyncable kebab value.
- **`ogden-projects` persist migrate v4 -> v5** maps every existing record's
  `projectType` through `normalizeProjectType`, repairing records already on
  disk (e.g. "Phase 4 Smoke": `regenerative-farm` -> `regenerative_farm`).
- **`describeSyncError(err)`** (exported from `lib/syncQueue.ts`) folds a server
  `ApiError`'s `details: [{ path, message }]` into the op's `lastError` and the
  create-failure warn log, so the *next* 422 names the offending field instead
  of the opaque "Request validation failed". Duck-typed on `details` to keep
  `syncQueue` free of apiClient/UI imports; wired at the `flush()` retry
  write-back and in `syncService` project-create catch.

**Consequences:**
- `project:create` for archetype-seeded projects now validates; the queue stops
  accumulating a permanently-422ing op for them. Together with
  [[2026-05-25-sync-queue-oom-coalescing-fix]] the failure mode is closed from
  both ends -- the queue can no longer grow unbounded, and the op that was
  failing no longer fails.
- A future server-validation failure is now self-describing in the logs and in
  `op.lastError` (field path + message), closing the diagnosability gap that
  forced the 2026-05-25 root cause to be inferred from a "Syncing 254520
  changes..." screenshot rather than read from the error.
- `normalizeProjectType` nulls genuinely-unknown values rather than throwing or
  preserving them -- an unmapped legacy value becomes a syncable null, not a
  permanent 422. If a new archetype is ever added without a matching
  `ProjectType` entry, its projects sync as null (untyped) until the enum + map
  are extended; acceptable because projectType is optional and a null is
  recoverable while an invalid string is not.
- Verified: web `tsc --noEmit` clean; the live `ogden-projects` store migrated
  to version 5 with 0 schema offenders across 40 projects (typeCounts
  `{ "(null)": 4, homestead: 9, multi_enterprise: 16, regenerative_farm: 11 }`),
  clean projects untouched.
- Relates to [[2026-05-25-sync-queue-oom-coalescing-fix]] (bounds the queue;
  this fix removes the cause of the failures the queue was accumulating) and
  [[2026-05-25-atlas-sync-circuit-breaker]] (the breaker that dropped the
  422ing op).

Commit `fe367966` on `feat/atlas-permaculture`.
