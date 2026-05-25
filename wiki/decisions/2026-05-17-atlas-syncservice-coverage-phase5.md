# 2026-05-17 — Full `syncService` coverage: Phase 5 (phased enable + conflict UI + bundle relabel)

**Status:** Accepted · **Branch:** `feat/atlas-permaculture`
**Supersedes nothing; closes the build half of** the Full `syncService`
Coverage plan. Phase 3 (typed tables for vegetation/succession) is the
only remaining piece and is explicitly **deferred** to a follow-up.

## Context

Phases 1–4 shipped the full versioned-blob path (registry +
push-only shadow + hydration/version-skew/conflict-record) entirely
behind the default-off `FLAGS.SYNC_STATE_BLOBS`. Phase 5 makes that
flag *actually functional in the browser*, surfaces conflicts in the
UI, proves the end-to-end A→B restore + conflict path, and relabels
the manual project-bundle as an offline backup rather than the
data-loss escape hatch it was while sync was partial.

## Decisions

1. **Single module-level boolean — no per-store gating map.** Testers
   receive one fresh build; per-store flags add config surface with
   zero extra loss protection. `FLAGS.SYNC_STATE_BLOBS` remains the
   single gate (already wired at hydrate + subscribe). "5 at a time"
   in the plan is a manual-matrix sequencing instruction, not code.
   Confirmed with the operator this session.

2. **"Shadow" = device-A-only, operationally.** There is no
   hydrate-suppression constant. The rollout operator brings up
   **device A only** and verifies rows land in `project_state_blobs`
   (a DB query) before bringing up device B. Recorded here so the
   rollout operator knows the definition.

3. **Phase 3 (typed tables veg/succession) is DEFERRED.**
   `vegetationStore` and succession are already pinned `typed-table`
   in `syncManifest.ts` and excluded from the blob loops by
   construction, so Phase 5 is complete without them. Confirmed with
   the operator.

4. **Bundle is relabelled, not deleted.** `ProjectBundleBar` stays
   mounted (offline mode still needs it). When `SYNC_STATE_BLOBS` is
   on it shows "Your work syncs to your account across devices. Export
   an offline backup if you want a local copy." with calm styling and
   no warn/status role. The destructive replace-confirm dialog is
   unchanged.

## What shipped (commits c1–c5 + a tsc-gate fix)

- **c1 — vite define fix.** `flags.ts` read
  `process.env['FEATURE_SYNC_STATE_BLOBS']` but the key was absent
  from the `define:` block in `vite.config.ts`, so the flag was
  permanently `false` in the browser regardless of env. Added the
  `define` entry (and the equally-missing `FEATURE_RELATIONSHIPS`).
  Guard test `syncFlagWiring.test.ts` reads both files as text and
  asserts every `FEATURE_*` referenced in `flags.ts` has a matching
  `define` entry — kills the whole bug class.
- **c2 — table-driven round-trip.** `syncManifestRoundTrip.test.ts`
  (`it.each` over the exact production `versioned-blob` filter, all
  61 stores) proves `select`↔`apply` survives a JSON wire hop and the
  other-project-isolation invariant, black-box against a handle shim.
- **c3 — conflict UI.** `OfflineBanner` gained a new highest-priority
  branch (above offline): when `conflictedStores.length > 0` it
  renders a danger bar (inline SVG, no `lucide-react`), one dismissible
  chip per store calling `clearConflictedStore`, `role="alert"`
  `aria-live="assertive"`. Copy matches the `syncService` toast.
- **c4 — bundle relabel.** `ProjectBundleBar` is flag-aware per
  decision 4.
- **c5 — two API specs.** `projectState.test.ts` pinned cold-start
  (brand-new `(project,storeKey)` at `baseRev:0` → 200, `rev===1`) and
  the **designer** write-role PUT → 200 (the plan said "editor"; the
  route is `requireRole('owner','designer')`, so the role string is
  `designer`).
- **tsc-gate fix.** The Phase 1–2 `subscribeVersionedBlobs` loop
  tripped TS18048 (`!desc.store` narrows `desc.store`, but
  `const d = desc` rebinds to the un-narrowed type). Read the narrowed
  `desc.store` into a local before `.subscribe`. Surfaced only at the
  full-monorepo typecheck gate.

### Test-infra note (reusable)

Store-bound component tests (`OfflineBanner`, `ProjectBundleBar`) hit
the dual-React hazard: zustand and `lucide-react` resolve nested React
copies, and externalized deps bypass `resolve.alias`. Fixed in
`apps/web/vitest.config.ts`: pin `react`/`react-dom` aliases +
`dedupe` + `server.deps.inline: ['zustand']`; mock `lucide-react` in
the icon-only tests. This config change is global — the full web suite
was re-run as the regression check.

## Verification gate (result)

- `pnpm typecheck` (8 GB tsc, all 3 packages) — **exit 0** after the
  tsc-gate fix.
- web `pnpm test` — **1061/1061 passed** (84 files) incl. all new
  Phase 5 tests; no regression from the global vitest.config change.
- shared `pnpm test` — **201/201 passed**.
- api `pnpm test` — `projectState.test.ts` **6/6 passed**.
  **Pre-existing/environmental:** 11 failures across 5 unrelated files
  (`projects`, `boundary`, `smoke`, `telemetry`,
  `siteAssessmentsPipeline.integration`) — they need live
  Postgres/PostGIS/outbound network (HTTP 500 / ECONNREFUSED) absent
  in this sandbox; last touched by unrelated earlier commits, **not**
  by Phase 5 (which touched only `projectState.test.ts` in api).

## 5.7 — Manual multi-device A→B matrix (operator action, not executed here)

One fresh build with `FEATURE_SYNC_STATE_BLOBS=true`,
`project_state_blobs` migrated, two browser profiles:

- **A (shadow):** B1 signs in, edits ~5 stores spanning all scopes
  (`ogden-hazards`/`ogden-paths`/`ogden-vision`/`ogden-financial`/
  `ogden-agribusiness`); verify PUT 200 + DB rows; zero user-visible
  change.
- **B (restore):** B2 clean profile, same account → hydrate runs →
  all edits present on B2, no cross-project leak, undo does not revert
  the hydrated slice.
- **C (conflict):** B1 edits `ogden-vision` (rev bumps); stale B2
  edits same → B2 sees 409 + OfflineBanner conflict bar + one toast +
  local copy intact; Dismiss clears the chip; other stores still sync.
- **D (skew, if a higher-schema build exists):** older build shows the
  once-per-session "newer version of Atlas" toast; stale slice not
  pushed back.
- **E:** flag on → ProjectBundleBar shows "syncs to your account";
  Export/Import still work.

Record pass/fail per step below when run.

| Step | Result | Notes |
|---|---|---|
| A — shadow | automated harness added & passing where a live DB exists; **blocked here** | `blobSync.integration.test.ts` proves PUT baseRev:0 → 200 rev 1 + a direct `SELECT` confirms the row physically persisted under `(project_id, store_key)`. Not run in this sandbox: `docker: command not found` (no Docker/Postgres), so the spec **auto-skipped cleanly** (3 skipped, mock-DB unit gate unaffected). |
| B — restore | automated harness added & passing where a live DB exists; **blocked here** | Same spec: two store keys under P1 + one under P2 (same owner) → `GET /project/P1` returns exactly P1's two blobs, P2's absent (the P0-1 cross-project read invariant). Blocked here for the same no-Docker reason. |
| C — conflict | automated harness added & passing where a live DB exists; **blocked here** | Same spec: stale `baseRev` → 409 `{serverRev, serverPayload}`; follow-up `GET` proves the server copy unchanged (no clobber); a PUT at the correct `baseRev` then bumps rev (recovery). Blocked here for the same no-Docker reason. |
| D — skew | operator-only | Needs a second build with a higher store `schemaVersion` — cannot be exercised from one build/sandbox. Manual two-device step. |
| E — bundle relabel | operator-only (copy unit-locked) | The flag-on ProjectBundleBar copy is already regression-locked by `apps/web/src/v3/components/__tests__/ProjectBundleBar.test.tsx`; the visual two-device confirmation stays a manual step. |

### 5.7 addendum — automatable subset coverage

The *mechanical core* of A/B/C (route → real Postgres round-trip,
cross-project isolation, the `ON CONFLICT` rev gate + 409 no-clobber +
recovery) is now covered by a real-Postgres integration spec,
`apps/api/src/tests/blobSync.integration.test.ts`. It mirrors the
auto-skip-without-DB convention so it never breaks the mock-DB unit
gate: with a live DB (`INTEGRATION_DATABASE_URL`, default the
`infrastructure/docker-compose.yml` dev DB) it runs A/B/C for real;
without one it skips with a `console.warn` pointing at the bring-up
command. Verified in this session: spec auto-skips cleanly (3 skipped),
`pnpm --filter @ogden/api test` = 549 passing (the 9 failures across
boundary/smoke/telemetry/siteAssessmentsPipeline are the unchanged
pre-existing branch/env baseline, **not** a regression), `pnpm
typecheck` 3/3 exit 0; no web/shared product code touched. The FIFO
mock-DB harness (`helpers/testApp.ts`) ignores SQL params and cannot
assert a `(project_id, store_key)→payload` round-trip — this spec is
the only thing in the suite that proves real persistence.

A real two-device A–E run by a human operator is still required before
the flag is enabled for testers (steps D and E are operator-only).

### 5.7 Stage 2 addendum — best-effort auto-drive run (2026-05-25)

Executes **Stage 2** of the phased-ramp plan
(`~/.claude/plans/resolve-the-non-uuid-demo-project-tidy-leaf.md`) on an
**`e6b48857`-inclusive build** (the two Stage-1 marshalling fixes), driving the
A/B/C/E steps through the live preview browser against a real flag-on build and a
migrated throwaway Postgres (`postgis/postgis:16-3.4`, port 5433). A genuine
second device was simulated for the C-conflict step by an out-of-band write. The
**final two-physical-device sign-off and D-skew remain the operator's** — see the
deferral note below.

| Step | Result | Evidence |
|---|---|---|
| A — shadow | **PASS** (auto-drive) | Edited three blob stores spanning the `byProject` (`ogden-site-profiles`) and `projectId-tagged` (`ogden-vision`, `ogden-swot`) serializer scopes. Verified the full browser path: store edit → 800 ms debounced `subscribeVersionedBlobs` → `api.projectState.put` → **200**, and a direct `SELECT` confirms physical rows under the correct `(project_id, store_key)` with `jsonb_typeof = object` (the Stage-1 double-encode fix holding). Final state for project `66b2ea9c`: site-profiles rev 2 / swot rev 4 / vision rev 2, all `object` payloads. |
| B — restore | **PASS** (auto-drive, single-project hydration) | Cleared local state + reloaded on the same account → `hydrateProjectStateBlobs` applied all persisted slices and seeded `blobBaseRev` from server revs. Cross-project **read isolation** is the one facet not surfaceable in-browser here (only one live project), and is already proven against real Postgres by Stage 1 case B (`GET /project/P1` returns exactly P1's blobs, P2 absent). |
| C — conflict | **PASS** (auto-drive, genuine 409) | Induced a real cross-device conflict: an out-of-band `curl` PUT (the "second device") bumped `ogden-vision`'s server rev, then a stale browser edit → **409 `{serverRev, serverPayload}`**. Client surface fired: `addConflictedStore` → Connectivity-panel conflict chip + `toast.warning`; the local copy was **not** clobbered and the server copy was unchanged on a follow-up GET; a recovery edit at the correct baseRev bumped rev. **Note on surface:** the visible conflict UI is the Connectivity-panel chip + toast (the same `OfflineBanner` `conflictedStores.length > 0` danger branch), not a standalone red bar at rest. |
| D — skew | **NOT RUN** (operator-only) | Needs a second build with a higher store `schemaVersion`; cannot be exercised from one build. Unchanged from the original matrix. |
| E — bundle relabel | **PASS** (auto-drive) | Flag-on → ProjectBundleBar shows "syncs to your account"; "Not saved to an account" absent. `Export bundle` / `Import bundle` controls present and **enabled**; invoking `buildBundle` + `serializeBundle` produced a valid ~332 KB bundle (top keys `schema/version/exportedAt/appVersion/entries`); `parseBundle` present for the import side. Export "still works" under flag-on confirmed. |

**Finding — launch.json flag propagation (fixed this session).** The preview
launcher spawns `cmd /c "<runtimeArgs string>"`. The original `web-sync` entry used
`set "FEATURE_SYNC_STATE_BLOBS=true" && …`; the **inner double-quotes break under
the spawn's Windows command-line quoting**, so the env var was silently dropped and
the build came up **flag-off** (`FLAGS.SYNC_STATE_BLOBS: false`) despite the
"flag-on" label — the bundle bar read "Not saved to an account". Fixed to the
quote-free `set FEATURE_SYNC_STATE_BLOBS=true&& cd apps\web&& …` form (no inner
quotes, no space before `&&`). **Any future flag-on browser session via the
launcher must use the quote-free form**; the dot-vs-bracket `process.env` access
and the vite `define` were both correct — this was purely env delivery.

**Operator residual.** Stage 2's auto-drivable core (A/B/C/E) is **green** on an
`e6b48857`-inclusive build. What still gates the flip: the genuine
**two-physical-device** confirmation (the visual B-restore-across-real-devices and
the at-rest conflict bar on a second profile) and **D-skew** (second higher-schema
build). Stages 3 (tester soak) and 4 (the code flip) remain gated and unexecuted.

### Follow-up (gated)

Enabling `FEATURE_SYNC_STATE_BLOBS` for testers is **deferred**. No edit
was made to `packages/shared/src/constants/flags.ts` or
`apps/web/vite.config.ts`; the flag remains default-off. The flag-flip
is gated on a real two-device A–E matrix pass (run
`blobSync.integration.test.ts` against a live DB for the A/B/C
mechanical core first, then the operator D/E steps).

## Consequences

- The full versioned-blob sync path is browser-functional behind one
  env-settable flag; conflicts are visible and dismissible.
- The manual bundle is now correctly framed as an offline backup, not
  a data-loss net, whenever sync is on.
- P0-1's durable fix is code-complete for the blob remainder; only
  Phase 3 typed tables (veg/succession) remain — independent of the
  blob path, no testing-window blocker.
- Rollout is gated on the manual A→B matrix (5.7) being run on a real
  two-device build before the flag is enabled for testers.
