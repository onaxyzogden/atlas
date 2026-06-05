# 2026-06-03 -- Observe lens polish: project type, cool palette, cycle-rail trim

**Branch:** `feat/atlas-permaculture` (explicit-path commits `de054364`,
`44f84255`; **not pushed**). Follow-up tweaks after the spine split
[[log/2026-06-03-atlas-observe-spine-split-filter-chips-detail-rail]].

## What

Four operator-driven UI tweaks on the `module-bar` observational lens, delivered
across two commits. All mock-backed; the `dashboard` Observe shell is byte-
untouched.

### `de054364` -- project type subtitle + de-browned palette

- **Identity tile subtitle = project type(s).** `ObserveLensSpine` gained a
  `projectType` prop, fed `PROJECT.type` ("Regen Farm + Silvopasture") from the
  dashboard; the `.projectTileTypes` line renders it in place of the static
  "Observe . Lens" label. (Files: `ObserveLensSpine.tsx`,
  `ObserveLensDashboard.tsx`.)
- **De-browned palette.** Operator flagged the left/right rails as "brownish".
  Root cause: the lens prototype's `tokens.ts` `C` grayscale ladder
  (`bg`/`bg2`/`bg3`/`bg4`/`border`/`borderLight`) was the source concept's WARM
  olive grays (`#0F0F0D`/`#161613`/`#2A2A25` ...), while the rest of the app's
  dark theme is COOL slate. Retuned the six grayscale tokens to mirror the app's
  `dark-mode.css` surface ladder: `bg #0B0D10`, `bg2 #14191F` (== `--color-surface`),
  `bg3 #1A2027` (== `--color-surface-alt`), `bg4 #1C232B` (== `--color-surface-raised`),
  `border #242F3D` (== `--color-border`), `borderLight #33404E`. Accent hues
  (blue/green/amber/teal/red/gold/sage/water/earth/violet + their `*Dim`) and the
  fonts are unchanged. (File: `tokens.ts`.)
  - This is a deliberate reversal of the old tokens.ts "kept verbatim for pixel
    fidelity; reskin later" header note. Because every lens panel (canvas + cards
    + rails) reads from `C`, cooling the ladder recolors the WHOLE lens surface,
    not just the two rails the operator pointed at -- chosen for internal
    consistency with the cool app shell and the spine/detail-rail (which already
    use `var(--color-surface)`). The tokens.ts header was rewritten to document
    the decision.

### `44f84255` -- cycle-rail trim (`components.tsx`, `CycleTimelineBar`)

- **Drop the Plan/Act/Observe phase chips** from the VERTICAL cycle header (the
  spiral already encodes phase position). The `phases` array stays -- the spiral
  consumes it. The HORIZONTAL expanded panel keeps its own chip row (untouched).
- **Enlarge the cycle spiral 60%.** New `SPIRAL_SCALE = 1.6` applied to the SVG's
  rendered box only -- `height` 140 -> 224, `style.maxWidth` 160 -> 256. The
  `viewBox` stays `0 0 160 140`, so geometry is unchanged and the spiral scales
  uniformly. The ~240px rail column still bounds the on-screen size. Note
  `spiralDiagram` is shared with the horizontal expanded panel, so it scales there
  too (that panel is not in the live module-bar route).

## Verified

- **Typecheck:** `tsc --noEmit` from `apps/web` -> EXIT 0 after each commit.
- **Live DOM (real Vite :5200), module-bar `/v3/project/<id>/observe`:**
  `getComputedStyle`/`getBoundingClientRect` proof --
  - tile subtitle text = "Regen Farm + Silvopasture";
  - left + right rail `background` = `rgb(20,25,31)` (== `#14191F`, cool; was the
    warm `rgb(22,22,19)`);
  - cycle SVG `height="224"`, `maxWidth: 256px`, rendered `232x224` (was ~160x140);
  - 0 Plan/Act/Observe phase chips in the left rail.
- **Screenshot:** `preview_screenshot` hung again (the known transient
  [[project-screenshot-hang]]; the preview tab had also drifted to the `:3001` API
  origin and was re-navigated to `:5200`). Disclosed -- proof is DOM measurement,
  no visual-success claim.

## Note on a stale dev-server artifact

During live checks the running :5200 dev server rendered the `ObserveLensDetailRail`
WITH a leading "All lenses" card (7 cards). The COMMITTED code (HEAD and `7725cf94`)
is the **6-card, detail-only** rail -- its header comment states "this rail is
detail-only (no 'All lenses' card)", matching
[[log/2026-06-03-atlas-observe-spine-split-filter-chips-detail-rail]]. The 7-card
render was a stale loaded module (or external-rebase drift), not the source of
truth. An entity-note "correction" toward 7 cards was drafted and then reverted
after `git show` confirmed the committed rail has no All-lenses card. The wiki
reflects the committed 6-card rail.

## Discipline

Explicit-path commits on the externally-rebased branch (foreign WIP untouched; not
pushed -- [[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]);
`DomainsView`/`DomainsRail`/`LensBar`/`TopBar` retained exported (no-deletion,
[[feedback-no-deletion]]); mock-backed scope held; CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only. No ADR -- UI affordance + token
retune, no architectural change.

Entity [[entities/observe-dashboard]]; predecessor
[[log/2026-06-03-atlas-observe-spine-split-filter-chips-detail-rail]].
