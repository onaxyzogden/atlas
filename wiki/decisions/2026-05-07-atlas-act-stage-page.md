# Atlas — Act stage page (StageShell sibling of Observe / Plan)

**Date:** 2026-05-07
**Status:** Adopted
**Scope:** Atlas web (`apps/web/src/v3/act/**`, route + rail wiring)

## Context

The atlas v3 lifecycle is collapsing into the 3-level Observe → Plan → Act
model. Observe and Plan both shipped a full StageShell-based page with
leftRail (tools), canvas (DiagnoseMap), rightRail (checklist), bottomTray
(module bar), and overlay (slide-up sheet). The Act route
(`/v3/project/$projectId/act`) was registered but pointed at
`ActPlaceholderPage` ("Coming in Phase C"), and the outer `DecisionRail`
returned a Phase-C placeholder for the Act stage. Meanwhile, 13 Act-stage
card components already existed under `apps/web/src/features/act/` — they
shipped via the legacy `ActHub` but had no v3 host.

## Decision

Build `apps/web/src/v3/act/` as a 1:1 structural sibling of
`apps/web/src/v3/plan/`, group the 13 existing Act cards into 5 modules,
and swap the Act route from `ActPlaceholderPage` to the new `ActLayout`.
URL routing follows **Observe's** pattern (`/act/$module` deep-linkable),
not Plan's local-state pattern. The map reuses
`ObserveAnnotationLayers` read-only — no draw tools — since the Act stage
is for execution, not authoring.

### Module → card mapping (13 cards across 5 modules)

| Module     | Full label                 | Cards (sectionId)                                                              |
|------------|----------------------------|-------------------------------------------------------------------------------|
| `build`    | Build & Construction       | `act-build-gantt`, `act-budget-actuals`, `act-pilot-plots`                    |
| `maintain` | Maintenance & Operations   | `act-maintenance`, `act-irrigation`, `act-waste-routing`                      |
| `harvest`  | Harvest & Succession       | `act-harvest-log`, `act-succession`                                           |
| `review`   | Review & Risk              | `act-ongoing-swot`, `act-hazard-plans`                                        |
| `network`  | Network & Community        | `act-network-crm`, `act-community-event`, `act-appropriate-tech`              |

### Files created

- `v3/act/types.ts` — `ActModule`, `ACT_MODULES`, `isActModule`,
  `ACT_MODULE_LABEL`, `ACT_MODULE_FULL_LABEL`, `MODULE_CARDS`.
- `v3/act/ActTools.tsx` + `.module.css` — bento left-rail with 5 module
  groups; module color dots: build #c4a265, maintain #5fc7d4, harvest
  #8bd16a, review #e88aa4, network #d68bd0.
- `v3/act/ActModuleBar.tsx` + `.module.css` — 5-tile bottom navigator.
  Click semantics: inactive→select; active+closed→open slide-up;
  active+open→close.
- `v3/act/ActChecklistAside.tsx` + `.module.css` — right guidance rail
  with `ACT_MODULE_GUIDANCE` (why + how steps grounded in execution
  discipline; Holmgren P3/P4/P8/P10 + Mollison Designer's Manual ch.14).
- `v3/act/ActModuleSlideUp.tsx` + `.module.css` — bottom sheet that
  lazy-loads all 13 act cards via `lazy(() => import(...))` and
  dispatches on `sectionId`. Tabs render only when the active module has
  >1 card. ESC + backdrop close.
- `v3/act/ActLayout.tsx` — composes the StageShell with Observe-style
  URL routing: `useParams.module` → `isActModule` → `validModule`;
  `handleSelectModule` calls `navigate({ to: '…/act' or '…/act/$module' })`.
  MTC_FALLBACK matches PlanLayout for dev parity.

### Files modified

- `routes/index.tsx` — `v3ActRoute.component`: `ActPlaceholderPage` →
  `ActLayout`; new `v3ActModuleRoute` (`act/$module`) added; both
  registered as children of `v3ProjectLayoutRoute`. `ActPlaceholderPage`
  import retained per `feedback_no_deletion.md` (parked behind a `void`
  reference).
- `v3/components/DecisionRail.tsx` — `'act'` added to
  `SELF_RAILED_STAGES`; the `'plan' | 'act'` placeholder branch in
  `StagePanel` shrinks to `'plan'` only.
- `v3/V3ProjectLayout.tsx` — `'act'` added to the `SELF_RAILED_STAGES`
  Set so the outer `LandOsShell` rail collapses on the Act route, exactly
  like design/prove/operate.

### Files NOT modified

- The 13 cards under `apps/web/src/features/act/*` — reused as-is via
  their existing `{ project: LocalProject; onSwitchToMap: () => void }`
  signature (slide-up supplies a no-op `onSwitchToMap`).
- `MapToolbar` and `ObserveAnnotationLayers` — reused unchanged from
  `v3/observe/components/`; Plan already imports them this way.
- Legacy `ActHub` and `ActPlaceholderPage` — left on disk per
  `feedback_no_deletion.md`.

## Consequences

- The Act route is now a first-class StageShell page. Steward UX is
  symmetric across Observe / Plan / Act: same 5-slot shell, same
  click-to-open module bar, same lazy-loaded module sheet.
- Deep-linkable Act modules: `/v3/project/$id/act/maintain` lands with
  the Maintain tile, MAINTENANCE & OPERATIONS group, and the Maintain
  guidance card all in active state in one render.
- Plan and Act diverge on URL semantics — Plan keeps local-state module
  selection while Act uses URL params. Migrating Plan to URL routing is
  a follow-up; out of scope here.
- Outer DecisionRail now collapses on four stages
  (design/prove/operate/act); Plan is the last stage still rendering a
  placeholder rail.

## Verification

- `npx tsc --noEmit` clean (exit 0).
- `/v3/project/mtc/act` renders 3 asides — Lifecycle navigation +
  Act tools + Act checklist — confirming the outer rail collapsed.
- `/v3/project/mtc/act/maintain` direct-link: Maintain tile,
  MAINTENANCE & OPERATIONS group, and Maintain guidance card all active
  on first render.
- Regression: Observe (6 asides), Plan (4 asides — outer rail still
  intact), Operate (2 asides — self-rail). No topology change on
  non-Act stages.

## Out of scope

- New Act card UIs — the 13 existing cards were reused unchanged.
- Migrating Plan to URL-driven module routing.
- Removing `ActPlaceholderPage`, `ActHub`, or any legacy Act module.
