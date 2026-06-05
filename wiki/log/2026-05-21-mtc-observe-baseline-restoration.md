# 2026-05-21 — MTC Observe baseline restoration

Follow-up to [2026-05-21-fill-remainder-field-test.md](./2026-05-21-fill-remainder-field-test.md).
During that test's Cleanup phase, a `mcp__Claude_Preview__preview_screenshot`
call timed out and the dev server dropped. On reconnect, the
`ogden-conventional-crops` and `ogden-pastures` `localStorage` keys for
project `mtc` rehydrated empty — the persist layer failed silently and
the pre-test baseline (2 conventional crops + 2 pastures + 0 buildings
+ 0 vegetation) was wiped.

## Restoration

Hand-authored a new dev seeder following the existing `__ogdenSeed*`
pattern:

- **File:** [apps/web/src/dev/seedMtcObserveBaseline.ts](../../apps/web/src/dev/seedMtcObserveBaseline.ts)
- **Wire-in:** [apps/web/src/app/bootAuthed.ts:31](../../apps/web/src/app/bootAuthed.ts)
  (sits next to `seedThreeStreamsFarm`, `seedApricotLane`, etc.)
- **Manual handle:** `window.__ogdenSeedMtcObserveBaseline()`
- **Idempotent:** refuses to seed if any crops or pastures already
  exist for `mtc`; pass `{ force: true }` to overwrite.

### Geometries

All polygons hand-projected inside the MTC mock boundary
`[-78.211, 44.4965] → [-78.189, 44.5035]` (see
[apps/web/src/v3/data/mockProject.ts:21-32](../../apps/web/src/v3/data/mockProject.ts)).

| ID | Type | Quadrant | Notes |
|---|---|---|---|
| `mtc-crop-north-west` | annual-row (soy) | NW | Burford sandy-loam band; conventional inputs, reduced till, rainfed |
| `mtc-crop-north-east` | annual-row (corn) | NE | Burford sandy-loam band; conventional till, 2-yr rotation w/ soy |
| `mtc-pasture-south-west` | open-pasture | SW | Guelph loam plateau; candidate for paddock subdivision in Plan |
| `mtc-pasture-south-east` | paddock | SE | Pre-existing fenced; awaits water-point per `pb1` blocker |

Crops sit on the north half (matching the Burford sandy-loam band
described in `diagnose.categoryDetails.soil`); pastures sit on the south
Guelph loam plateau (matching the rotational-grazing canon in
`diagnose.categoryDetails.terrain` + `pb1` water-point gap).

## Verification

Ran the seeder via dynamic import in the running Vite preview (auth
boot path skips on `/login`, so couldn't use the `window` handle
directly — used `import('/src/dev/seedMtcObserveBaseline.ts')` instead).

```js
useConventionalCropStore.getState().conventionalCrops.filter(c=>c.projectId==='mtc').length === 2  // ✓
usePastureStore.getState().pastures.filter(p=>p.projectId==='mtc').length === 2                     // ✓
localStorage.getItem('ogden-conventional-crops')  // populated
localStorage.getItem('ogden-pastures')            // populated
```

## Commit

`12b5a31e` — `fix(dev): restore MTC Observe baseline (2 crops + 2 pastures)`.
Pushed to `feat/atlas-permaculture` with `--force-with-lease` (branch is
externally rebased per memory note `project_branch_rebase`).

## Open thread

Unrelated concurrent edits had landed in this workspace during the
session (apiClient.ts, RegisterPage.tsx, routes/index.tsx, SelectionFloater.tsx,
ObserveAnnotationLayers.tsx, builtEnvironmentKinds.ts,
builtEnvironmentProjection.ts, plus untracked OrganizationCreatePage.tsx
and two API migrations). Pre-restoration WIP was stashed as
`wip-pre-mtc-restore`; `git stash pop` aborted on conflict with the
newer apiClient.ts edits. Stash is preserved and needs hand
reconciliation before it can be applied.

## Underlying bug (not addressed here)

The persist-rehydrate silent failure that wiped the keys in the first
place is not diagnosed. If it recurs after another screenshot-timeout
event, this is worth a deeper look — possible candidates: race between
`useConventionalCropStore.persist.rehydrate()` at module load
(conventionalCropStore.ts:83) and an HMR-triggered re-evaluation; or a
zustand-persist quota/serialization edge case. Out of scope for this
restoration; flagged for future investigation.
