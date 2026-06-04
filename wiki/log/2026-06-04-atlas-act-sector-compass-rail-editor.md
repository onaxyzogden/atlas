# 2026-06-04 -- Act: click SectorCompass HUD to edit sectors in the right rail

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `d914473c`;
rebased out-of-band -- a rebase landed mid-session and reset the index, but my
working-tree edits survived; re-staged + committed, **not pushed**).
Plan: `~/.claude/plans/elements-of-this-concept-toasty-ember.md`. Log + entity
update, no ADR (feature reusing the existing sectors data layer). Entity:
[[entities/act-tier-shell]].

## Change

The floating `SectorCompassOverlay` HUD on the Act map was read-only. Made the
whole compass card a click target that takes the right rail over with a
full-CRUD sectors editor, mirroring the as-built rail-takeover pattern. New
`apps/web/src/v3/act/sectors/`:

- `actSectorsEditorStore.ts` -- `active`/`open`/`close` singleton (as-built
  store template, no payload/capture).
- `SectorsEditorPanel.tsx` + `.module.css` -- rail-width editor reusing the
  shared `useExternalForcesStore` CRUD + `newAnnotationId('sec')` +
  `computedSectorRows`/`polygonCentroid`. Manual sectors editable (bearing /
  type / **arc** / intensity / add / remove); computed wind/solar layers listed
  read-only. **Done** button closes the takeover. No new persistence -- edits
  write to the same store the compass reads, so the HUD updates live.
- `__tests__/actSectorsEditorStore.test.ts` -- open/close + default-inactive.

Edits (2):

- `observe/components/overlays/SectorCompassOverlay.tsx` -- opt-in
  `onOpenEditor?: () => void` prop; when supplied the card renders as a
  `<button aria-label="Edit sectors">`, else stays the read-only Observe HUD.
  The overlay never imports an Act store (decoupled by callback).
- `act/tier-shell/ActTierShell.tsx` -- read `sectorsEditorActive`; pass the
  opener (closes any as-built session first -- the two takeovers are mutually
  exclusive); third rail branch
  `asBuiltActive ? asBuilt : sectorsEditorActive ? <SectorsEditorPanel> : normal`
  (as-built keeps precedence; Dashboard/Objective toggle hides while active).

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -> EXIT 0.
- **vitest** (bounded, `--pool=forks --testTimeout=20000`):
  `src/v3/act/sectors` + `src/v3/act/asBuilt` + `projectStore.shellModes` -> 41
  passed (incl. the new store test).
- **Live preview** (project "Baseline Test Homestead",
  `/v3/project/8a815400-.../act`): with the matrix `sectors` toggle on + one
  seeded sector, the HUD rendered as `button[aria-label="Edit sectors"]` with the
  SVG inside; clicking it swapped the rail to the `SectorsEditorPanel` (header
  "Sectors 1", table, Add + Done) and hid the Dashboard/Objective toggle. DOM
  proof exercised Add / edit-bearing / Remove and confirmed **Done** reverted the
  rail (`actSectorsEditorStore.active === false`, toggle restored, panel gone).
  `preview_screenshot` hung ([[project-screenshot-hang]]); relied on
  `preview_eval` DOM proof + store-driven import().

## Process / covenant

One explicit-path commit (`d914473c`; staged the 4 new + 2 edited files by name,
`git diff --cached --name-only` verified against a tree full of foreign WIP, left
untouched). Message BOM-free UTF-8 via `[System.IO.File]::WriteAllText` (temp
file) + `git commit -F`. An **external rebase** moved HEAD to `1c72d8ea` and
reset the index between staging and the first commit attempt; diffed both edited
files against the new HEAD to confirm only my changes were present, then
re-staged + committed. Branch fetched + divergence-checked (`0` behind), **not
pushed** ([[project-branch-rebase]]). ASCII-only copy. No-deletion respected;
CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).

## Deferred / flagged

- **Build-break flagged (spawn_task):** `apps/web/src/v3/olos/handoff/
  TaskProofPanel.module.css:11` has a stray `*/` inside its opening block comment
  (`(--bg-*/--text-*/--accent-*)`) that prematurely closes the comment -- PostCSS
  then fails (`Unknown word --text-*/--accent-*`), taking down the **entire** web
  dev server (and a prod build). Pre-existing, committed today (P1.4), unrelated
  to this task. Verification was unblocked by a temporary local comment reword,
  which was **reverted** before commit so this commit stays scoped. Spun off as a
  separate one-line fix.
