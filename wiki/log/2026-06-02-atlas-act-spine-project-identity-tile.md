# 2026-06-02 -- Act strata spine: project identity tile

**Branch.** `feat/atlas-permaculture` (rebases out-of-band; surgical single-slice
commit `ff0bbd9f`, 3 files +90/-4; **not pushed at commit time**). Amanah gate clean
(internal land-management UI; no riba/gharar, no capital-channel or Islamic-framing
strings touched).

## Scope

The Act tier-shell horizontal **strata spine** (the `S1`-`S7` tab strip,
`role="tablist"` aria-label "Act strata") carried no project identity -- nothing told
the steward *which* project they were acting on or its types. The Plan stage already
surfaces this via its stratum-spine header (`planHeaderProjectTypeLabel`, introduced
[[log/2026-05-31-act-protocol-rail-plan-header]]). Operator request, verbatim: "Add
tile in this section for Project title and types."

Added a leading **project identity tile** to the Act spine mirroring the Plan header:
the project **name** + its **type label** (primary first, " . "-joined).

## Steward decisions (AskUserQuestion)

- **Interactivity:** *static info tile* -- non-interactive; identity/context only. The
  `S1`-`S7` tabs stay the only navigation.
- **No-types case:** *show placeholder* -- a muted "Types not set" on the types line
  when no primary type is set. Intentionally diverges from the Plan header (which
  renders nothing) for shape consistency in the spine.
- **Scroll behavior:** *pinned at left* -- the tile is `position: sticky; left: 0` so
  identity stays visible while the tabs scroll horizontally underneath.

## What shipped (3 files)

- `ActTierSpine.tsx` -- new props `projectTitle: string` + `projectTypeLabel: string |
  null`; the return is wrapped in a `.spineRow` containing a leading `.projectTile`
  **then** the existing tablist. The tile is a **sibling** of the `role="tablist"`
  div, never inside it, so the tablist a11y semantics stay pure (an info tile is not a
  tab). `data-empty='true'` on the types span drives the placeholder styling.
- `ActTierShell.tsx` -- imports `planHeaderProjectTypeLabel` from
  `../../plan/strata/planHeaderLabel.js` (NO new label logic), derives
  `projectTypeLabel` next to the existing `primaryTypeId`/`secondaryTypeIds` lookup,
  and passes `projectTitle={project.name}` + `projectTypeLabel` into `ActTierSpine`.
- `ActTierShell.module.css` -- new `.spineRow` (took over the old `.spine` layout box:
  flex + padding + `overflow-x:auto` scroll container), slimmed `.spine` to an inner
  flex region, and added `.projectTile` (sticky, gold left accent
  `var(--color-gold-brand)`, surface bg, `min-width:132px`/`max-width:220px`),
  `.projectTileTitle` (13px/600, ellipsis), `.projectTileTypes` (10px uppercase muted),
  + `.projectTileTypes[data-empty='true']` (italic, opacity 0.7).

## Verification

- **Typecheck:** `corepack pnpm -C "apps/web" run typecheck` EXIT 0 (no errors).
- **Typed case (Halton Hills):** tile shows "Halton Hills" + "Regenerative Farm .
  Orchard / Food Forest . Silvopasture . Residential / Live-In"; 7 tabs; tile is a
  sibling of the tablist (tablist has 0 non-tab children -- a11y clean). DOM +
  `reactProps` + a clean **dark** screenshot.
- **Placeholder case (null-type, "Phase 4 Smoke"):** `reactProps.projectTypeLabel:
  null` -> renders "TYPES NOT SET", computed styles `font-style:italic`, `opacity:0.7`,
  `text-transform:uppercase`, `font-size:10px`, muted colour. DOM + `preview_inspect`.
- **Sticky pin:** `position:sticky`, `left:0`, `z-index:1`, `min-width:132px`,
  `max-width:220px`, gold left border `rgb(212,175,95)` -- confirmed via inspect.

**Disclosed limits (no false "works" claim, [[project-screenshot-hang]]):**
- **Light-theme contrast NOT visually confirmed** -- the screenshot tool hung on the
  map view throughout the attempt; the app themes via a `data-theme` attribute (not
  `prefers-color-scheme`), so emulation did not switch it and the manual attribute set
  did not yield a captured frame. The tile reuses the exact theme tokens of the
  existing tabs, so it is theme-consistent by construction, but a light frame was not
  taken.
- **Narrow-width horizontal-scroll sticky behaviour** confirmed via CSS only, not a
  screenshot.

## Commit shape (honest record)

Surgical staging was required: `ActTierShell.module.css` was entangled with a parallel
session's uncommitted **Act Protocol Layer** work (a `.railProtocolFramed` hunk).
`ActTierSpine.tsx` + `ActTierShell.tsx` were staged whole (pure tile changes); the CSS
was staged hunks-only via a trimmed `git apply --cached` patch that EXCLUDED
`.railProtocolFramed`, which stays uncommitted in the working tree. **Rebase-race:** a
first commit attempt was wiped when an out-of-band rebase ([[project-branch-rebase]])
cleared the index mid-operation (ahead 48 -> 50 from peer commits `bc892e09`,
`c7d58ca2`); the working-tree edits survived, were re-staged identically, and committed
as `ff0bbd9f`. Message ends `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

Foreign WIP untouched ([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]);
CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Entity [[entities/act-tier-shell]] (entity-page fold-in deferred -- that page is
mid-edit by a parallel session, so registration is left to its owning session per the
parallel-session convention); reuses [[log/2026-05-31-act-protocol-rail-plan-header]].
