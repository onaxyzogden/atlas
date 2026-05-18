# ADR: Report becomes a standalone sidebar destination; ObserveModuleBar de-nested

- **Date:** 2026-05-18
- **Status:** Accepted (design — implementation pending)
- **Context source:** Follow-up to 2026-05-18 cyclical-navigator change
  (`report` removed from `V3LevelNavBridge` `LEVELS`); user-confirmed via
  AskUserQuestion.

## Context

The header stage navigator was made a cyclical 3-stage carousel
(`Observe → Plan → Act`) and `report` was dropped from the `LEVELS`
array. That left the existing, working `/v3/project/$projectId/report`
route (rendered by `ReportPage.tsx`) with **no entry point** in the v3
UI. The deferred question — where should Report live now — is resolved
here, together with a pre-existing DOM-nesting warning in
`ObserveModuleBar` that the cyclical change doubled (the module bar now
mounts twice: `bottomTray` + slide-up `topBar`).

## Decision 1 — Report placement

**Report becomes a standalone top-level destination in the left
expandable sidebar (`V3LifecycleSidebar`), a sibling of "Project Home",
placed directly below it and above the Observe/Plan/Act stage groups.**
The existing `/report` route and `ReportPage.tsx` are reused unchanged.

Rejected: making Report an Act (or other-stage) module-card. Rationale:

- Report is a **project-wide synthesis & export deliverable** (verdict,
  six scores, blockers, next actions, Markdown/PDF/publish) that cuts
  across all three stages — it is not semantically an Act operation.
- It is a **single-canvas `StageShell` page**, not a multi-card surface;
  the module pattern (per-stage `types.ts`, `*_MODULE_CARDS` map, a
  `*ModuleBar`, slide-up tabbed cards) is a structural mismatch and
  high-cost for zero functional gain.
- The sidebar already hosts a standalone non-stage destination
  ("Project Home") and footer utilities — Report fits that shape exactly.

Wiring already supports this: `V3ProjectLayout.activeFromPath` maps the
`report` path segment to `stage: "report"` (`LifecycleStage` includes
`"report"`), which is passed to `V3LifecycleSidebar` as `activeStage`,
so an active-highlight via `data-active={activeStage === 'report'}`
works with no plumbing changes.

`parseV3Route` / `handleLevelChange` report branches and the `/report`
route stay as-is. Full absorption of Report *content* into other stages
remains explicitly out of scope.

## Decision 2 — ObserveModuleBar button-nesting fix

**Full sibling restructure** (chosen over the minimal span-swap):

Current tree (invalid — `<button>` inside `<button>`):

```
<button .tile onClick=handleCardClick>
  <div .cardProgress aria-hidden>
    <button .subseg onClick=task />      ← nested
  </div>
  <span .tileLabel>label</span>
</button>
```

Target tree (no nested interactives; both click behaviors preserved):

```
<div .tile (+ .tileActive)>                       ← presentational wrapper
  <button .tileHit aria-pressed onClick=handleCardClick
          aria-label={moduleLabel} />             ← absolute inset:0, z-index 1
  <div .cardProgress aria-hidden>                 ← position:relative, z-index 2
    <button .subseg onClick=task />               ← real button, now a SIBLING
  </div>
  <span .tileLabel>label</span>                   ← pointer-events:none
</div>
```

- `.tile` becomes a non-interactive `<div>` (keeps border/hover/active
  styling; add `position: relative`).
- New `.tileHit` `<button>` absolutely fills the tile (`inset:0`,
  transparent, `z-index:1`), carrying `aria-pressed`, the `onClick`
  handler, and an `aria-label` of the module label (replacing the lost
  implicit label from the old outer button text).
- `.cardProgress` gets `position:relative; z-index:2` so the pip buttons
  sit above `.tileHit` and receive their own clicks. Pips remain real
  `<button>`s but are now **siblings** of `.tileHit`, not descendants —
  the validateDOMNesting warning is eliminated.
- `.tileLabel` gets `pointer-events:none` so clicks over the label fall
  through to `.tileHit`, preserving "click anywhere on the tile selects
  the module".
- `e.stopPropagation()` on the pip handler is retained (harmless;
  defensive).

Net behavior is unchanged: click tile background/label → select/toggle
module; click a pip → task navigation. Accessibility improves (no
interactive-in-interactive; explicit `aria-label` on the hit target;
pip row stays `aria-hidden` decorative).

## Consequences

- One new sidebar link; `ReportPage` and `/report` untouched.
- `ObserveModuleBar.tsx` JSX restructured + ~4 CSS rule additions in
  `ObserveModuleBar.module.css`. Existing `V3LifecycleSidebar` render
  smoke test should still pass; add a focused assertion for the Report
  link. No new module-system scaffolding.

## Out of scope

- Absorbing Report *content* into Observe/Plan/Act.
- Any change to `ReportPage.tsx` internals or the `/report` route.
- Touching the cyclical navigator (already shipped).
