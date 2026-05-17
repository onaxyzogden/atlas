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
| A — shadow | _pending_ | |
| B — restore | _pending_ | |
| C — conflict | _pending_ | |
| D — skew | _pending_ | |
| E — bundle relabel | _pending_ | |

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
