# 2026-05-31 -- Act Tier Shell follow-ups: mode-aware ViewA back-nav + real per-objective marker geometry (hide-until-real)

**Branch.** `feat/atlas-permaculture` (two explicit-path slice commits `76da8688` Task 1 -> `d0f22547` Task 2, interleaved by the out-of-band rebase with two foreign commits `aa2243cd` / `203b5d39`; branch 4 ahead of origin, **not pushed**).

Closed the two seams the 2026-05-30 tier-shell promotion ([[log/2026-05-30-act-tier-shell-promotion]], ADR [[decisions/2026-05-30-atlas-act-tier-shell-promotion]]) explicitly left open in its "Out of scope" section. Both deferrals are now resolved.

## Task 1 -- Mode-aware ViewA back-nav (`76da8688`)

`ViewAObjectiveExecution`'s "Back to all tasks" used to route unconditionally to `act/field-action`, silently ejecting a user who reached ViewA *from the tier shell* into a different Act shell. Now it returns the user to whichever Act shell is active.

**One-file change** ([apps/web/src/v3/act/field-action/ViewAObjectiveExecution.tsx](apps/web/src/v3/act/field-action/ViewAObjectiveExecution.tsx)) -- the mode is resolved **inside ViewA** via a primitive-returning `useProjectStore` selector + `getActShellMode`, rather than threading a new prop through the three parents (`ActTierShell`, `ActMapFirstLayout`, `ActFieldActionLayout`), two of which carry foreign WIP on the rebased branch -- so the slice stays a clean by-name commit. Mirrors how `ActLayout.tsx` itself resolves the mode; lookup uses the store's own `p.id === id || p.serverId === id` pattern; unresolved project defaults to `'tier-shell'` (consistent with `getActShellMode`'s post-promotion default).

```typescript
const shellMode = useProjectStore((s) => {
  const p = s.projects.find((proj) => proj.id === projectId || proj.serverId === projectId);
  return p ? getActShellMode(p) : 'tier-shell';
});
const handleBack = useCallback(() => {
  navigate(
    shellMode === 'tier-shell'
      ? { to: '/v3/project/$projectId/act/tier-shell', params: { projectId } }
      : { to: '/v3/project/$projectId/act/field-action', params: { projectId } },
  );
}, [navigate, projectId, shellMode]);
```

`handleBack` already feeds **both** back triggers -- the "Objective not found" early-return button and `ActObjectiveHeader onBack` -- so the single change covers both, no parent edits. `command-centre` does not mount ViewA, so the binary tier-shell / else branch is complete. TanStack Router's typed `navigate({to})` means an invalid route path is a compile error, so a clean tsc proves the `act/tier-shell` route resolves.

## Task 2 -- Real per-objective marker geometry, hide-until-real (`d0f22547`)

`ActTierMapMarkers` placed each objective pin at a deterministic centroid-offset (copied from the prototype's `objectiveOffset`) because `PlanStratumObjective` carries no geometry -- a synthetic dot is visually indistinguishable from a surveyed location, which is misleading on a map. Pins now sit on **real ground**: the centroid of the objective's field-action locations.

**Operator decision (AskUserQuestion): _hide until real_** -- objectives with no logged field-action geometry render **no pin at all**; there is no synthetic fallback dot.

The only data linking geometry to an objective is **`FieldAction`** (`planObjectiveId` + nullable `locationGeometry`: `Point | LineString | Polygon`). Crops/zones/structures have geometry but no objective link, so they are unusable here.

- **New pure helper** [apps/web/src/v3/act/tier-shell/objectiveMarkerGeometry.ts](apps/web/src/v3/act/tier-shell/objectiveMarkerGeometry.ts) (store-free, sibling to `objectiveProgress.ts`, which it mirrors for the `planObjectiveId` grouping):
  - `representativePoint(geometry): [lng, lat] | null` -- Point -> coords directly (both finite, else null); LineString -> vertex average of valid pairs; Polygon -> reuse `polygonCentroid` from [lib/geo.ts](apps/web/src/lib/geo.ts); anything else / malformed coords -> null (runtime-guarded against NaN).
  - `computeObjectiveMarkerPositions(objectives, actions): Record<string, [lng, lat]>` -- groups actions by `planObjectiveId` in one pass, averages each objective's non-null representative points, and **emits an entry ONLY when at least one valid point exists**. No fallback/index argument.
- **[ActTierMapMarkers.tsx](apps/web/src/v3/act/tier-shell/ActTierMapMarkers.tsx)** -- removed `objectiveOffset` + the `centroid` prop; added `positionByObjective: Readonly<Record<string, [number, number]>>`. The marker effect skips any objective absent from `positionByObjective` (`if (!pos) return;`), which also tears down a stale marker by leaving it out of `seen`. `STATE_COLOR` unchanged (complete `#5dd39e`, active `#c4a265`, available `#5b8aa8`); header comment rewritten to drop the "deterministic offset / non-real" caveat.
- **[ActTierShell.tsx](apps/web/src/v3/act/tier-shell/ActTierShell.tsx)** -- added `positionByObjective = useMemo(() => computeObjectiveMarkerPositions(stratumObjectives, actions), [stratumObjectives, actions])` beside the existing `progressByObjective` memo; the `<ActTierMapMarkers>` render swaps `centroid={baseCentroid}` for `positionByObjective={positionByObjective}`. `baseCentroid` stays for `<DiagnoseMap>` map-centering. Keyed on `stratumObjectives` (not all objectives) so the computation scopes to what the selected stratum renders.

`tier-prototype/` left untouched per [[feedback-no-deletion]] (its `protoSeed` offset is unrelated).

## Verification

- **tsc:** my four files are clean. tsc exits 2, but every error in the output is **pre-existing foreign WIP** -- an incomplete `'deferred'` `PlanStratumState` migration in `ActObjectiveHeader.tsx`, `NextUpCard.tsx`, `ObjectiveCard.tsx`, `ObjectiveHeader.tsx` (each missing the `deferred` key on a `Record<PlanStratumState, string>`), plus a transient `EMPTY_DEFERRED` error in `stratumObjectiveStatus.ts` that came and went as the foreign session mutated. **None of my files appear in the error list.** Gate reframed to "no NEW errors in my files" -- confirmed empty.
- **Unit tests:** new [objectiveMarkerGeometry.test.ts](apps/web/src/v3/act/tier-shell/__tests__/objectiveMarkerGeometry.test.ts) -- **11/11 pass** (Point, LineString average, Polygon centroid, mixed Point+Polygon, multi-Point average, null geometry omitted, no-actions omitted, malformed coords rejected, "emits entries only for objectives with real geometry").
- **Preview NOT run (disclosed, not assumed).** No `launch.json`; the foreign WIP is type-broken and actively rebasing; dead API on :3001; the documented [[project-screenshot-hang]] -- any crash would be foreign-attributable and uninformative. Task 1 verification rests on tsc + TanStack typed-route compile-safety; Task 2 on tsc + 11 unit tests. MTC's curated seed sets no `locationGeometry`, so a live MTC preview would correctly show **zero** objective pins (hide-until-real) -- the positive real-centroid path is proven by the unit tests, not preview. A live back-nav preview is deferred until the foreign `'deferred'` migration settles.

## Process / covenant

Two explicit-path slice commits (own files by name, never `git add -A`; each committed the moment it verified per [[feedback-commit-immediately-on-rebased-branches]]) plus this `docs(wiki)` commit. Commit messages were written to a temp file and applied via `git commit -F` after a PowerShell here-string mangled the embedded `"Back to all tasks"` double-quotes into git pathspecs. Foreign WIP left out per [[feedback-no-deletion]]; not pushed (out-of-band rebase, [[project-branch-rebase]]); CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

ADR for the hide-until-real decision: [[decisions/2026-05-31-atlas-act-objective-marker-geometry]]. Closes both deferrals from [[log/2026-05-30-act-tier-shell-promotion]].
