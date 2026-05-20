# 2026-05-17 — Full `syncService` coverage: Phase 3 (typed tables: vegetation + succession)


**Branch.** `feat/atlas-permaculture`.

Closed the last deferred item of the full `syncService` coverage plan.
`ogden-vegetation` + `ogden-act-succession` now have real Postgres tables
(migration `028`, `id text`), shared Zod schemas (optional client-minted
id — `machinery_items` idiom), `design-features`-shaped Fastify routes
(owner-only delete, `logActivity`, `requireRole`), a dedicated client
write-through (**client-supplied id, no serverId/no writeback** so
vegetation's `temporal()` undo is not polluted; API failure → typed
`'vegetation'`/`'succession'` retry op, never dropped), and
`hydrateTypedTables` device-B restore (mirrors `mergeDesignFeatures`:
server-wins per id, local-only pushed up, no cross-project clobber).
Coverage guard pins both `typed-table` (verified failing on a flipped
classification) so the versioned-blob loop can never double-write them.
Same default-off `FLAGS.SYNC_STATE_BLOBS` gate. Shared mock-DB gained
`.unsafe`/`.json` (additive `Object.assign`); the embedded-`db\`now()\``
trap (shifts the mock queue, corrupts row ordering) was replaced with
`COALESCE(${createdAt ?? null}, now())`. Commits P3-c1…c5 + a tsc fix.
Gate: `pnpm typecheck` 3/3 exit 0; web Vitest **1073/1073** (86 files,
+`syncServiceTyped`, `syncServiceTypedHydrate`; `syncManifest` 10/10);
shared 213/213; api `vegetationSuccession` 8/8 (incl. 3.3 no-double-write
guard) + 549 passing. The 9 api failures
(boundary/smoke/telemetry/siteAssessmentsPipeline) are a pre-existing
branch baseline confirmed by stash before P3, unrelated to this work.
Full plan (Phases 1–5 + P3) now complete; only the Phase 5.7 manual
multi-device matrix (flag-on, operator action) remains.
