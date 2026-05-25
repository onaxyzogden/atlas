# 2026-05-25 — Versioned-blob push: make the serverId-less skip observable in dev

**Branch.** `feat/atlas-permaculture`, commit `05096b06` (1 file, +17/−1).

Follow-up to the [[log/2026-05-25-syncmanifest-stage0-compass-backfill]] session.
That backfill registered seven project-scoped `ogden-` stores in
`syncManifest.ts`, but registration alone doesn't prove they *round-trip* for the
fixtures used in manual testing — and the prior log's "known issue" line said
`initialSync` 401s for non-UUID demo projects like `mtc`.

**Reframing — the original "mint UUID / relax server validation" premise was
inaccurate.** Investigation (plan mode) showed:

- The client never sends a non-UUID id to the server. `enqueueVersionedBlob`
  (`apps/web/src/lib/syncService.ts:1216`) resolves the active project and
  **silently returns** when it has no `serverId`
  (`if (!getProjectServerId(activeId)) return;`, was line 1222). The `mtc` demo
  has no `serverId`, so it's skipped *before* any request — there is no 401 to fix.
- `mtc` is a **builtin** project; RBAC collapses `is_builtin` → `'viewer'`
  (`apps/api/src/plugins/rbac.ts`) and blob PUT requires owner/designer, so even a
  UUID-backed `mtc` couldn't accept writes. Minting a UUID would not enable a
  round-trip.
- The whole versioned-blob loop is **default-off** behind
  `FLAGS.SYNC_STATE_BLOBS` (`packages/shared/src/constants/flags.ts:19`), so
  nothing syncs in a default dev session regardless of project.

So no server/DB/RBAC/validation change is warranted. The real gap is
**observability + test method**: a tester editing a serverId-less project sees
silence with no explanation.

**Change (1 file).** In `enqueueVersionedBlob`, the no-`serverId` skip now emits a
**dev-only, de-duped** `console.info` (guarded `import.meta.env.DEV`; module-level
`warnedNoServerId: Set<string>` so it fires once per project, not on every
debounced edit) naming the project id, explaining builtin/demo projects are
viewer-only, and pointing the reader to create/own a project. Production behaviour
byte-identical (the log is stripped). The `if (!activeId) return;` above stays
silent (a normal transient state, not a footgun).

**Dev usage (no code change needed).** The blob loop is enabled by an env var the
vite `define` block already wires (`vite.config.ts:170`, via `process.env`):
`$env:FEATURE_SYNC_STATE_BLOBS='true'; npm run dev`. The `flags.ts` default stays
off (phased-rollout ADR
[[decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch]]); the `define`
block was left untouched so `syncFlagWiring.test.ts` stays green.

**Verification.** `syncManifestRoundTrip.test.ts` **76/76** (table-driven
`it.each` over every versioned-blob descriptor — auto-covers the 7 new stores'
select↔apply round-trip + project isolation) and `syncManifest.test.ts` **10/10**;
combined **86 passed**. `tsc --noEmit` **exit 0** (run with
`--max-old-space-size=8192` — default heap OOMs). The change is a sync-queue
console log, not browser-observable; the **manual two-browser round-trip**
(create a real owned UUID project, edit the 7 stores, confirm in a second session;
then switch to `mtc` and confirm the dev log fires once) is a human step left to
the steward.

**Process.** Plan-mode task — plan written + approved
(`~/.claude/plans/resolve-the-non-uuid-demo-project-tidy-leaf.md`) before any edit.
Staged **only** `syncService.ts` by explicit path; the unrelated foreign WIP in
the tree (`financialStore`, `MapCanvas`, `PlanReviewsPage`, etc.) left untouched
per [[feedback-no-deletion]]. Committed immediately on green; fetch +
divergence-checked (0 behind / 1 ahead) per
[[feedback-commit-immediately-on-rebased-branches]] — note the first `git push`
was blocked by the auto-mode classifier (plan-mode boundary) and only sent after
the steward's explicit "push".

Updates entity [[entities/web-app]]. Continues the syncManifest coverage thread.
