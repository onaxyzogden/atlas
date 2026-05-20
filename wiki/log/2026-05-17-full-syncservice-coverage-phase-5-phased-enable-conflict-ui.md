# 2026-05-17 — Full `syncService` coverage: Phase 5 (phased enable + conflict UI + bundle relabel)


**Branch.** `feat/atlas-permaculture`.

**What.** Executed Phase 5 of the approved plan — made
`FLAGS.SYNC_STATE_BLOBS` browser-functional and closed the build half
of P0-1. Strict TDD, one commit per item. **c1** (`44821315`): the
flag was permanently `false` in the browser because `vite.config.ts`
`define:` lacked `FEATURE_SYNC_STATE_BLOBS` (also `FEATURE_RELATIONSHIPS`);
added both + `syncFlagWiring.test.ts` (text-asserts every `flags.ts`
`FEATURE_*` has a `define` entry — kills the class). **c2**
(`4b673f0f`): `syncManifestRoundTrip.test.ts` — `it.each` over the
exact production `versioned-blob` filter (all 61), proves
`select`↔`apply` survives a JSON wire hop + other-project isolation,
black-box vs a handle shim. **c3** (`d899880e`): `OfflineBanner` new
highest-priority danger branch above offline — dismissible per-store
chips → `clearConflictedStore`, copy matched to the `syncService`
toast, inline SVG (no `lucide-react`). **c4**: `ProjectBundleBar`
flag-aware (calm "syncs to your account" when on; destructive
replace-confirm + Export/Import unchanged; not deleted). **c5**
(`59db6d0b`): `projectState.test.ts` pinned cold-start
(`baseRev:0`→200 `rev 1`) + designer write-role 200 — the plan said
"editor" but the route is `requireRole('owner','designer')`, so the
role string is `designer`. **tsc-gate fix** (`47fccb1d`): Phase-1
`subscribeVersionedBlobs` lost `desc.store` narrowing across
`const d = desc` (TS18048) — surfaced only at the full-monorepo
typecheck; read the narrowed `desc.store` into a local.

**Decisions.** Single module-level boolean (no per-store gating map);
"shadow" = device-A-only operationally (no suppression constant);
Phase 3 (typed tables veg/succession) deferred — already pinned
`typed-table`, excluded from blob loops by construction; bundle
relabelled, not deleted.

**Test infra (reusable).** Store-bound component tests hit the
dual-React hazard (zustand/`lucide-react` nested React, externalized
deps bypass `resolve.alias`). Fixed `apps/web/vitest.config.ts`: pin
`react`/`react-dom` aliases + `dedupe` + `server.deps.inline:['zustand']`;
mock `lucide-react` in icon-only tests. Global change → full web
suite re-run as the regression check.

**Verification.** `pnpm typecheck` exit 0 (after the tsc-gate fix);
web `pnpm test` **1061/1061** (84 files); shared **201/201**; api
`projectState` **6/6**. 11 api failures across 5 unrelated files
(`projects`/`boundary`/`smoke`/`telemetry`/`siteAssessmentsPipeline.integration`)
are pre-existing/environmental — need live Postgres/PostGIS/network
(HTTP 500 / ECONNREFUSED) absent in this sandbox; last touched by
unrelated earlier commits; Phase 5 touched only `projectState.test.ts`
in api.

**Remaining.** Phase 3 typed tables (veg/succession), independent of
the blob path. 5.7 manual two-device A→B matrix is an operator action
— result table in the Phase 5 ADR awaits a real run before enabling
the flag for testers.

**ADR.** `decisions/2026-05-17-atlas-syncservice-coverage-phase5.md`.
