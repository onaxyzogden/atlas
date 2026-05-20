# 2026-04-30 — `ogden-site-annotations.archived-v3` rollback hatch closed


### Done

Closed the final deferred item from the morning's namespace-consolidation ADR. The legacy v3 blob's archive copy (`ogden-site-annotations.archived-v3`) was the manual-rollback hatch; with the migrator + 7 namespace stores + the resolver follow-up all landed clean and no steward escalation, the hatch is now obsolete.

**Implementation:**
- `apps/web/src/store/site-annotations-migrate.ts` — new `cleanupArchivedV3(storage = localStorage): boolean` export. Reuses the existing `ARCHIVE_KEY` constant. Returns `true` if removed, `false` if absent. Independent of `migrateLegacyBlob()` — both functions are pure localStorage operations.
- `apps/web/src/main.tsx` — `cleanupArchivedV3()` called immediately after `migrateLegacyBlob()` at boot. On the very first post-deploy boot, the migrator writes the archive and the cleanup removes it in one shot. On every subsequent boot both are no-ops.
- `apps/web/src/tests/siteAnnotationsMigrate.test.ts` — new `describe('cleanupArchivedV3', …)` block with 5 specs: removes-and-returns-true, no-op-returns-false, idempotency, does-not-touch-7-namespace-keys, does-not-touch-still-present-legacy-key (defensive).

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean; `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` 13/13 green (8 prior + 5 new). No vite build run — only tests + types changed; no consumer surfaces touched.

### Risks accepted
- No further localStorage rollback path for the namespace consolidation. Mitigation: git-revert path remains documented in the namespace ADR's "Rollback plan" section.

ADR: [`wiki/decisions/2026-04-30-archive-v3-blob-cleanup.md`](decisions/2026-04-30-archive-v3-blob-cleanup.md). Closes the final deferred item from [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
