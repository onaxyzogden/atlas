# 2026-06-04 -- Act: restore floating MapToolbar on the tier-shell map

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `011d4037`;
rebased out-of-band, divergence-checked `185 ahead / 0 behind`, **not pushed**).
Plan: `~/.claude/plans/elements-of-this-concept-toasty-ember.md`. Log-only
close-out (parity restoration, no ADR). Entity: [[entities/act-tier-shell]].

## Change

The Act stage map carried no floating map control bar after the shell-toggle
removal made `ActTierShell` the only reachable Act layout -- `MapToolbar` (the
docked basemap + measurement bar Plan/Observe have) was mounted only in the
legacy command-centre `ActLayout` branch. Brought it back on the tier-shell
canvas, mirroring the command-centre mount:

- [ActTierShell.tsx](apps/web/src/v3/act/tier-shell/ActTierShell.tsx) -- one
  import (`MapToolbar` from `../../observe/components/MapToolbar.js`) + one mount
  inside the `DiagnoseMap` `{({ map }) => ...}` closure, just after
  `BaseMapCard`:
  ```jsx
  <MapToolbar map={map} projectId={params.projectId ?? null}
              boundary={safeBoundary ?? null} showBoundary={false} />
  ```

`showBoundary={false}` suppresses the draw/import-boundary buttons, so no
geometry-authoring control renders -- Act executes against existing features, it
does not author geometry. No new component, no `MapToolbar` prop change, no CSS
(the bar floats via its own `.dock` -> bottom-left). `getActShellMode` and the
legacy branches untouched ([[feedback-no-deletion]]).

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -> EXIT 0.
- **vitest** (bounded, `--pool=forks --testTimeout=20000`): `src/v3/act/asBuilt`
  (34) + `projectStore.shellModes` (5) -> 39 passed.
- **Live preview** (project "Baseline Test Homestead",
  `/v3/project/8a815400-.../act`; map canvas rendered this session): the `.dock`
  toolbar is present bottom-left with exactly 5 controls -- Basemap, Measure
  distance, Measure elevation, Measure area, Return to property; **no**
  draw/import-boundary buttons (the only "boundary" string in the dock is the
  disabled Return-to-property tooltip "Draw a property boundary first").
  `preview_screenshot` hung ([[project-screenshot-hang]]); relied on
  `preview_eval` DOM proof + parity with the live Plan/Observe/command-centre
  mounts.

## Process / covenant

One explicit-path commit (`011d4037`; staged only `ActTierShell.tsx` by name,
never `git add -A`; `git diff --cached --name-only` verified against a tree full
of foreign WIP, left untouched). Message BOM-free UTF-8 via
`[System.IO.File]::WriteAllText` + `git commit -F`. Branch fetched +
divergence-checked, **not pushed** ([[project-branch-rebase]]). ASCII-only copy.
No-deletion respected; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
No new deferrals.
