# 2026-05-07 — Atlas Act stage page (StageShell sibling of Observe / Plan)


**Branch:** `feat/atlas-permaculture` · **Type:** feature

Built `apps/web/src/v3/act/` as a 1:1 structural sibling of `v3/plan/`,
hosting the 13 existing Act cards from `apps/web/src/features/act/`
under 5 modules (build/maintain/harvest/review/network). URL routing
follows the **Observe** pattern (`/act` and `/act/$module`
deep-linkable) — chosen over Plan's local-state pattern. The Act
StageShell reuses `DiagnoseMap` + `MapToolbar` +
`ObserveAnnotationLayers` (read-only — no draw tools).

Files created (12): `act/types.ts`, `ActTools.tsx` + `.module.css`,
`ActModuleBar.tsx` + `.module.css`, `ActChecklistAside.tsx` +
`.module.css` (with `ACT_MODULE_GUIDANCE` grounded in execution
discipline / Holmgren P3·P4·P8·P10), `ActModuleSlideUp.tsx` +
`.module.css` (lazy-loads all 13 act cards, dispatches by `sectionId`),
`ActLayout.tsx`.

Files modified: `routes/index.tsx` (Act route swap +
`v3ActModuleRoute`); `v3/components/DecisionRail.tsx` and
`v3/V3ProjectLayout.tsx` (`'act'` added to `SELF_RAILED_STAGES`).
`ActPlaceholderPage` retained behind a `void` reference per
`feedback_no_deletion.md`.

Also fixed a pre-existing `OperatePage` infinite-render bug
(`useFieldTaskStore` selector returned a fresh array each render —
hoisted the raw `s.tasks` selector and filtered via `useMemo`).

### Verification

- `cd apps/web && npx tsc --noEmit` clean (exit 0).
- `/v3/project/mtc/act` → 3 asides (Lifecycle nav + Act tools + Act
  checklist); 5 module tiles render; outer rail collapses correctly.
- `/v3/project/mtc/act/maintain` deep-link: Maintain tile,
  MAINTENANCE & OPERATIONS group, and Maintain guidance card all
  active in one render.
- Regression: Observe (6 asides), Plan (4 asides w/ outer rail),
  Operate (2 asides) — no topology change.
- Screenshot of `/act/maintain` confirmed bento groups, map canvas,
  bottom tile bar, and active-card highlighting all render correctly.

**ADR.** [`wiki/decisions/2026-05-07-atlas-act-stage-page.md`](decisions/2026-05-07-atlas-act-stage-page.md).

### Deferred

- Migrating Plan to URL-driven module routing (Plan stays local-state
  for now).
- Removing legacy `ActPlaceholderPage` and `ActHub`.
- Designing per-module Act map tools (sliding into the canvas later
  once the Act stage has authoring needs).

### Recommended next session

- Plan stage URL-routing migration (mirror Act's `/$module` pattern)
  to align Observe / Plan / Act on one routing convention.
- Or land the first batch of Act-stage authoring tools (e.g. pilot
  plot pin drop) on the canvas.
