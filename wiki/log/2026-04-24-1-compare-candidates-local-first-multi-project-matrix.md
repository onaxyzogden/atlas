# 2026-04-24 — §1 compare-candidates: local-first multi-project matrix


Surfaces the dormant `/projects/compare` route with an end-to-end
selection flow so a steward can put two or more projects side-by-side
without crafting a URL.

### Shipped (commit `b0ebf83`)
- `apps/web/src/features/project/compare/CompareCandidatesPage.tsx` —
  rewritten to resolve ids against `useProjectStore` first (by `id` or
  `serverId`) and synthesise per-project counts from structures /
  zones / paths / utilities / crops / paddocks / phases stores. Falls
  back to `api.projects.get` for ids the local store doesn't know,
  and best-effort `api.projects.assessment` for server scores when
  available. Sections: Identity, Land basis, Design load, Assessment
  scores (server). Notice banner when the API is unreachable.
- `apps/web/src/features/project/compare/CompareCandidatesPage.module.css`
  (new) — proper page chrome (sticky first column, section dividers,
  numeric cells); replaces the previous inline styles.
- `apps/web/src/pages/HomePage.tsx` + `.module.css` —
  - "Compare" header button (visible when ≥ 2 projects exist) enters
    selection mode.
  - In selection mode each card renders as a `<button aria-pressed>`
    with a leading checkbox; the Duplicate overlay and the `<Link>`
    are suppressed so a click only toggles selection.
  - Sticky `compareBar` at viewport bottom shows running count + Cancel
    + Compare (disabled until 2+).
- `packages/shared/src/featureManifest.ts` — `compare-candidates`
  flipped from `planned` → `done`.

### Verification
`tsc --noEmit` exits clean (zero errors). No new shared-package math,
no zustand schema changes, no router changes — the route was already
defined; only the page's source-priority and the HomePage entry point
moved.
