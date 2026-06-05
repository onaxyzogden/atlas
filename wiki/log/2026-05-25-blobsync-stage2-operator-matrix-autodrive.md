# 2026-05-25 — Blob-sync ramp Stage 2: operator A–E matrix, best-effort auto-drive

**Branch.** `feat/atlas-permaculture`. Build under test: `e6b48857`-inclusive (the
two Stage-1 marshalling fixes). No product code changed; the only repo edit is the
`.claude/launch.json` `web-sync` env-propagation fix (below) plus wiki recording.

Executes **Stage 2** of the approved phased-ramp plan for `FLAGS.SYNC_STATE_BLOBS`
(`~/.claude/plans/resolve-the-non-uuid-demo-project-tidy-leaf.md`) in **best-effort
auto-drive** mode: bring up a migrated DB + API + a genuinely flag-on web build, then
drive the Phase 5 ADR §5.7 matrix steps **A/B/C/E** through the live preview browser,
simulating a second device for the conflict step via an out-of-band write. The
**final two-physical-device sign-off and D-skew remain the operator's**.

**Environment.** Throwaway Postgres `ogden-pg-s2` (`postgis/postgis:16-3.4`, port
**5433**, fresh volume → auto-migrate incl. 027 + 036); API on 3001; flag-on web
preview on 5205. Probe user `s2-probe-…@example.test`; an **owned** project "S2
Matrix" (serverId `66b2ea9c-ae4c-4c96-8a71-34df64dfdd0c`) — owned, not builtin, so
RBAC grants `owner` and PUTs are allowed (builtins are viewer-only → 403, the
serverId-less / demo skip from [[log/2026-05-25-versioned-blob-skip-dev-observability]]).

## The central blocker — launch.json flag never reached the browser

The first "flag-on" build came up **flag-off** (`FLAGS.SYNC_STATE_BLOBS: false`;
ProjectBundleBar read "Not saved to an account"). Root cause: the preview launcher
spawns `cmd /c "<runtimeArgs>"`, and the original `web-sync` entry used
`set "FEATURE_SYNC_STATE_BLOBS=true" && …` — the **inner double-quotes break under
the spawn's Windows command-line quoting**, so the env var was silently dropped. The
dot-vs-bracket `process.env` access (`flags.ts` bracket, `vite.config.ts` define
dot) and the vite `define` were both already correct; this was purely **env
delivery**. Fixed to the quote-free, no-trailing-space form:

```
set FEATURE_SYNC_STATE_BLOBS=true&& cd apps\web&& node ../../node_modules/vite/bin/vite.js --port 5205 --strictPort
```

After the fix, runtime read `FLAGS.SYNC_STATE_BLOBS: true`. **Forward rule: any
flag-on browser session via the launcher must use the quote-free form.** (This also
means the prior session's pre-fix A-shadow attempts were on a flag-off build and were
redone here.)

## Matrix results (auto-drive)

| Step | Result | Evidence |
|---|---|---|
| **A — shadow** | **PASS** | Edited three blob stores spanning the `byProject` (`ogden-site-profiles`) + `projectId-tagged` (`ogden-vision`, `ogden-swot`) serializer scopes. Verified the full browser path: store edit → 800 ms-debounced `subscribeVersionedBlobs` → `api.projectState.put` → **200**; a direct `SELECT` confirms physical rows under the right `(project_id, store_key)` with `jsonb_typeof = object` (the Stage-1 double-encode fix holding). Final state for `66b2ea9c`: site-profiles **rev 2** / swot **rev 4** / vision **rev 2**, all `object`. |
| **B — restore** | **PASS** (single-project hydration) | Cleared local state + reloaded same account → `hydrateProjectStateBlobs` applied all persisted slices, seeding `blobBaseRev` from server revs. Cross-project **read isolation** is the one facet not browser-surfaceable here (one live project) and is already proven against real Postgres by Stage 1 case B (`GET /project/P1` returns exactly P1's blobs, P2 absent). |
| **C — conflict** | **PASS** (genuine 409) | Induced a real cross-device conflict: an out-of-band `curl` PUT (the "second device") bumped `ogden-vision`'s server rev, then a stale browser edit → **409 `{serverRev, serverPayload}`**. Client surface fired: `addConflictedStore` → Connectivity-panel conflict chip + `toast.warning`; the **local copy was not clobbered** and the server copy was unchanged on a follow-up GET; a recovery edit at the correct baseRev bumped rev. **Surface note:** the visible UI is the Connectivity-panel chip + toast — the same `OfflineBanner` `conflictedStores.length > 0` danger branch — not a standalone red bar at rest. |
| **D — skew** | **NOT RUN** (operator-only) | Needs a second build with a higher store `schemaVersion`; cannot be exercised from one build. |
| **E — bundle relabel** | **PASS** | Flag-on → ProjectBundleBar shows "syncs to your account"; "Not saved to an account" absent. `Export bundle` / `Import bundle` present + **enabled**; invoking `buildBundle` + `serializeBundle` produced a valid ~**332 KB** bundle (top keys `schema/version/exportedAt/appVersion/entries`); `parseBundle` present for import. Export "still works" under flag-on confirmed. |

**Verification caveat.** `preview_screenshot` was not used (MapLibre WebGL canvas
times out — the standing documented hazard); evidence is browser-eval / console /
network reads + direct DB `SELECT`s, **stated not claimed**.

## Ramp impact

Stage 2's auto-drivable core (A/B/C/E) is **green** on an `e6b48857`-inclusive build.
What still gates the flip: the genuine **two-physical-device** confirmation (visual
B-restore across real devices; the at-rest conflict bar on a second profile) and
**D-skew** (second higher-schema build). **Stages 3 (tester soak) and 4 (the code
flip) remain gated and unexecuted** per the plan — `flags.ts` / `vite.config.ts`
untouched, flag still default-off.

## Process

Plan-mode ramp, Stage 2 only. The `.claude/launch.json` edit touched **only** the
`web-sync` entry's `runtimeArgs` (other foreign-WIP launch entries left intact per
[[feedback-no-deletion]]). DB torn down after recording (`docker rm -f ogden-pg-s2`).
No commit of the launch.json edit without a divergence check first per
[[feedback-commit-immediately-on-rebased-branches]].

Records results into ADR [[decisions/2026-05-17-atlas-syncservice-coverage-phase5]]
(§5.7 "Stage 2 addendum"). Updates entity [[entities/web-app]]. Continues the
blob-sync ramp thread; follows
[[log/2026-05-25-blobsync-stage1-validation-two-latent-bugs]].
