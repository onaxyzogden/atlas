# 2026-06-03 -- Act: remove shell toggle; relocate as-built form into the right rail

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `ce1bcad5`;
rebased out-of-band, divergence-checked, **not pushed**). Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`. Log-only close-out
(no ADR; the operator did not request the mode-switcher retirement be recorded
as a decision). Entity: [[entities/act-tier-shell]].

Two operator-requested UI changes to the Act tier-shell, landed together (both
touch `ActTierShell.tsx`, so a single commit avoided interactive hunk staging).

## Change 1 -- Act shell toggle removed (all layouts)

Dropped the floating `ActShellToggle` ("Tier shell / Field actions / Command
centre") from every **mounted** Act layout and pruned the now-dead
`shellMode` / `onShellModeChange` prop plumbing:

- [ActTierShell.tsx](apps/web/src/v3/act/tier-shell/ActTierShell.tsx) -- removed
  the `styles.toggleFloat` block + `ActShellToggle` import; dropped the `Props`
  interface; signature is now `export default function ActTierShell()`; removed
  the unused `type ActShellMode` from the `projectStore` import.
- [ActMapFirstLayout.tsx](apps/web/src/v3/act/field-action/ActMapFirstLayout.tsx)
  -- removed the toggle block + import + `Props`; prop-less signature; dropped
  `type ActShellMode`.
- [ActLayout.tsx](apps/web/src/v3/act/ActLayout.tsx) -- removed the inline
  command-centre `ActShellToggle` + import; `<ActTierShell />` and
  `<ActMapFirstLayout />` now prop-less; removed `handleActShellModeChange` and
  the `type ActShellMode` import. **Kept** `getActShellMode` (still drives the
  branch) and `updateProject` (still used by `handleBoundaryDrawn`).

Per [[feedback-no-deletion]] the legacy layout components (`ActMapFirstLayout`,
the unmounted `ActFieldActionLayout`, the command-centre `StageShell` branch)
and `getActShellMode` stay on disk. The toggle was the only writer of a
non-`tier-shell` mode, so no project can newly enter a legacy mode via UI;
existing projects persisted in a legacy mode still resolve through the kept
branches. `ActShellToggle.tsx` itself is left on disk (now import-less).

## Change 2 -- "Record as-built change" relocated into the right rail

[ActAsBuiltPopover.tsx](apps/web/src/v3/act/asBuilt/ActAsBuiltPopover.tsx) gained
a `variant?: 'floating' | 'panel'` prop (default `'floating'`) and an optional
`map`. The panel variant:

- skips the anchor->screen projection effect (guarded on `isFloating && map`),
  the click-outside `mousedown` effect, and the hide-while-drawing early return
  -- all floating-only (the rail has no `map` instance and does not overlay the
  canvas);
- early-returns require `screen` only in floating mode;
- renders its root with a new `css.panel` class (no `position`/`transform`/
  `data-flipped`/`ref`), reusing all inner markup (header/body/fields/shape
  section/note/btn row) and the `recordAsBuiltDeviation` save unchanged.

[ActAsBuiltPopover.module.css](apps/web/src/v3/act/asBuilt/ActAsBuiltPopover.module.css)
-- new `.panel` (flex column, `width: 100%`, no absolute positioning/shadow).

[ActTierShell.tsx](apps/web/src/v3/act/tier-shell/ActTierShell.tsx) -- reads
`const asBuiltActive = useActAsBuiltPopoverStore((s) => s.active != null);`.
While active, the `rightRail` slot replaces its body with
`<ActAsBuiltPopover variant="panel" projectId={id} />` and **hides** the
Dashboard/Objective tablist; clearing `active` (Record/Cancel) reverts to the
prior panel. The floating mount was removed from the canvas;
`ActFeatureClickHandler`, `ActStructurePopover` (its "Record as-built change"
hand-off still sets `active`), and `ActAsBuiltDrawHandler` (arms the on-map
redraw) remain on the canvas.

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -> EXIT 0 (no unused-symbol fallout
  from the pruned props/imports).
- **vitest** (bounded, `--pool=forks`): `src/v3/act/asBuilt` (34 tests) +
  `projectStore.shellModes.test.ts` (5 tests) green.
- **Live preview** (project "Baseline Test Homestead",
  `/v3/project/8a815400-.../act`; map/WebGL does not render in this headless
  preview, so the store was driven directly via a dynamic `import()` of
  `actAsBuiltPopoverStore.ts` -- map-feature clicks were not exercisable, but
  `ActAsBuiltDrawHandler`'s canvas mount is unchanged):
  - The "Act navigation shell" radiogroup is **gone** (only the left-rail "Rail
    view" radiogroup + "Act strata" / "Right rail mode" tablists remain); no
    `[class*="_popover_"]` floats over the canvas.
  - `open({kind:'zone', id:<Zone 1>})` -> a `[role="dialog"]` "Record as-built
    change" renders **inside** `[class*="_panel_"]` in the right rail (subtitle
    "Zone 1 -- Kitchen Garden", 4 fields, Record/Cancel); the "Right rail mode"
    toggle is hidden; still no floating popover.
  - `close()` -> dialog gone, "Right rail mode" toggle restored.

## Process / covenant

One explicit-path commit (`ce1bcad5`; staged exactly the 5 intended files by
name, never `git add -A`; `git diff --cached --name-only` verified against a
tree full of foreign WIP, left untouched). Message BOM-free UTF-8 via
`[System.IO.File]::WriteAllText` + `git commit -F`. Branch divergence-checked,
**not pushed** ([[project-branch-rebase]]). ASCII-only copy. No-deletion
respected ([[feedback-no-deletion]]); CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]). No new deferrals.
