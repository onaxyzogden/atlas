# 2026-05-18 — branch reconciliation: rebase feat/atlas-permaculture onto remote + push


**Branch.** `feat/atlas-permaculture`. Pushed `80553503..249dad54`.

The local branch had diverged from the remote (local 10 ahead of merge-base
`20e40204`, remote 3 ahead via the external PR #35 merge `80553503` /
`objective-hopper`). The local stack carried a **duplicate** of the remote's
already-merged `45a87345` ("register 4 B-series stores in syncManifest") as
local `21f30db5` ("classify the 4 unclassified ogden- stores") — same four
stores, near-identical classification (remote uses `byKey('byProject',null,{})`
for rotation-plan/succession-path vs the local `null`; remote canonical).

Reconciled by `git rebase --onto origin/feat/atlas-permaculture 21f30db5`,
**dropping the duplicate `21f30db5`** (remote's `45a87345` is the canonical
registration) and replaying the 9 real commits (Report sidebar +
ObserveModuleBar de-nest + D2 resourcing + walkthrough + docs). Conflicts:
`wiki/log.md` twice — append-only, resolved by keeping every entry
(syncManifest-backfill + Report + the accurate committed-D2 entry) and
deleting the stale "uncommitted" D2 draft (superseded by the committed D2
entry). `syncManifest.ts` auto-merged correctly — remote's 4 B-series
classifications **and** D2's `ogden-crew-members` both present, no markers.
`wiki/entities/web-app.md` / `wiki/index.md` auto-merged.

Pre-push verification: `npm run typecheck` clean (zero errors — the 2
previously-disclosed `useFlowEndpointOptions` Paddock errors are fixed by a
commit incorporated from the remote side); targeted vitest **94/94**
(`syncManifest` 10, `syncManifestRoundTrip` 67, `V3LifecycleSidebar` 6,
`ObserveModuleBar` 3, `crewMemberStore` 2, `workItemStore.resources` 3,
`seedGoalCompassResources` 3; ECONNREFUSED = no local API, unrelated).
Post-push divergence `0 0`. Safety ref `backup/pre-rebase-2026-05-18`
(→ old `f4a863fb`) retained for rollback. D2 ADR
[[2026-05-18-atlas-d2-resourcing]] status corrected: no longer "uncommitted"
— committed `63313677` & pushed; the live regenerate-preservation exercise
remains explicitly deferred (construction- + hard-gate-unit-test-proven,
re-run green post-rebase; not fabricated as a live run).
