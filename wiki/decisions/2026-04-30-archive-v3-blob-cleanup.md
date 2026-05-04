# ADR: Remove the `ogden-site-annotations.archived-v3` rollback hatch

**Date:** 2026-04-30
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Predecessors:**
- [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
  — created the archive blob; deferred its removal to "a follow-up plan
  after one stable release cycle."
- [`2026-04-30-transect-vertical-ref-resolver.md`](2026-04-30-transect-vertical-ref-resolver.md)
  — first follow-up against the new namespace shape; landed clean
  (tsc + vite build green) without surfacing any regression that would
  call for rollback.

## Context

The 2026-04-30 namespace consolidation archived the legacy v3 blob as
`ogden-site-annotations.archived-v3` (rather than deleting it) so a
steward could roll back manually if a regression slipped through. That
rollback hatch served its purpose:

- The migrator + 7 new namespace stores shipped clean (`tsc` ×2,
  `vite build` 22.68 s, vitest 8/8 on the migrator spec).
- The follow-up resolver ADR landed without regressions
  (`tsc` clean, `vite build` 24.58 s).
- No steward escalation requesting rollback.

With the namespace shape stable and the resolver ADR exercising the new
schema end-to-end, the archive entry is now dead weight — it occupies
localStorage indefinitely on every browser that ran the boot migrator.

## Decision

Add a new `cleanupArchivedV3()` export to
`apps/web/src/store/site-annotations-migrate.ts` and call it from
`apps/web/src/main.tsx` immediately after `migrateLegacyBlob()`.
Idempotent — a no-op once the archive is gone.

```ts
export function cleanupArchivedV3(storage: Storage = localStorage): boolean {
  if (storage.getItem(ARCHIVE_KEY) === null) return false;
  storage.removeItem(ARCHIVE_KEY);
  return true;
}
```

Boot wiring:

```ts
import { migrateLegacyBlob, cleanupArchivedV3 } from './store/site-annotations-migrate.js';
migrateLegacyBlob();
cleanupArchivedV3();
```

The `ARCHIVE_KEY` constant is already defined in the migrator file
(`'ogden-site-annotations.archived-v3'`) — reused, not duplicated. No
changes to `migrateLegacyBlob()` itself; the two functions are
independent and the order matters only on the very first boot
post-deploy of the namespace ADR (where `migrateLegacyBlob` writes the
archive and `cleanupArchivedV3` immediately removes it). On any
subsequent boot, `migrateLegacyBlob` is a no-op (legacy key already
gone) and `cleanupArchivedV3` removes the archive once and is a no-op
thereafter.

### "First boot" behavior (defensive note)

A steward whose browser somehow still has only the legacy v3 blob (no
prior boot through the migrator) will, on this deploy, run the migrator
+ cleanup in one shot. The migrator writes the archive, the cleanup
removes it. Net effect: legacy → 7 namespace keys, no archive. The
rollback hatch is implicitly closed for them at the same moment as for
everyone else, which matches the "one release cycle" cadence — they
joined late but exit at the same time.

If a regression were to surface mid-deploy, the rollback path is now
purely git-revert (revert the consumer-import landing PR + restore
`siteAnnotationsStore.ts`). No localStorage restore is possible from
this build forward. This is the explicit and intended consequence of
this ADR.

## Consequences

**Positive**
- localStorage no longer carries the legacy blob indefinitely. Even at
  the high end (a steward with a fully populated v3 family list), the
  archive was on the order of ~50 KB; removing it is housekeeping, not
  a quota fix, but it prevents the leak from compounding if some future
  schema bump introduces a second archive entry.
- The 2026-04-30 namespace ADR's "Out of scope" deferral list shrinks
  by one — the only items left are out-of-scope by design (backend
  persistence; splitting `phaseStore`).
- DevTools → Application → Local Storage on a freshly-migrated browser
  now shows exactly the 7 `ogden-*` namespace keys + the rest of the
  app's keys, with no leftover migration debris. Easier diagnosis if a
  future migration is needed.

**Risks accepted**
- No further localStorage rollback path for the namespace consolidation.
  Mitigation: git-revert the consumer-import PR + restore
  `siteAnnotationsStore.ts` from history (the same path the namespace
  ADR's "Rollback plan" already documents).
- A steward whose browser cached the previous build *and* has not
  yet booted into this deploy will hold the archive for one more
  session; on next boot it disappears. No data loss in either case
  — the archive is read-only debris.
- A vanishingly-rare scenario where both `ogden-site-annotations` and
  `ogden-site-annotations.archived-v3` are present (e.g. a partial
  manual rollback by hand): `cleanupArchivedV3()` removes only the
  archive and leaves the legacy key alone. On the next boot,
  `migrateLegacyBlob()` re-runs against the legacy key and re-creates
  the archive, which is then removed again. Vitest covers this via
  the "does not touch a still-present legacy key" spec.

**Out of scope**
- Telemetry on whether anyone actually exercised the archive between
  ADR landing and this cleanup — Atlas has no analytics layer; would
  add for its own sake.
- Scheduled / time-bound auto-removal (e.g. "remove after 30 days").
  Boot-time idempotent removal is simpler and equivalent in effect.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean.
- `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` — 13/13
  green (8 prior migrator tests + 5 new cleanup tests):
  - removes the archive blob and reports `true`
  - is a no-op when the archive is absent (returns `false`)
  - is idempotent — second call returns `false`
  - does not touch the 7 namespace keys
  - does not touch a still-present legacy key (defensive)

## Files touched

**Modified (3):**
- `apps/web/src/store/site-annotations-migrate.ts` — added
  `cleanupArchivedV3(storage = localStorage)`.
- `apps/web/src/main.tsx` — boot-time call to `cleanupArchivedV3()`
  immediately after `migrateLegacyBlob()`.
- `apps/web/src/tests/siteAnnotationsMigrate.test.ts` — 5 new specs in
  a `describe('cleanupArchivedV3', …)` block; existing 8 specs
  unchanged.

**Wiki:**
- `wiki/decisions/2026-04-30-archive-v3-blob-cleanup.md` — this ADR.
- `wiki/index.md` — ADR row added.
- `wiki/log.md` — session entry filed.
- `wiki/decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md` —
  "Out of scope" archive-removal line annotated as landed.

## Rollback plan

If `cleanupArchivedV3()` itself misfires (it can't — the function is
two `localStorage` calls and a vitest-verified return-value contract),
revert this commit. The archive will be re-written on the next migrator
run only if the legacy `ogden-site-annotations` key is present, which
on a post-namespace-ADR build it never is. So the practical rollback
path is: git-revert this commit; the archive does not return.
