# 2026-05-22 — Plan/Observe follow-ups: maplibre line-width fix + URL-persist picked section

**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/the-sector-compass-in-memoized-sphinx.md`
**Sequel to:** [[2026-05-22-cross-rail-single-section-highlight]] (`fc0938b8`)

## What & why

Closed the two deferred follow-ups documented at the end of the cross-rail
single-section-highlight session:

1. **MapLibre `design-el-line.paint.line-width` error** — fired every frame
   (`Only one zoom-based "step" or "interpolate" subexpression may be used`).
2. **URL-persist the picked cross-rail section** — `activeSectionId` was
   `useState` per Layout, so a reload dropped the narrowed section and the rail
   fell back to the whole-family highlight.

## Part 1 — `design-el-line` line-width expression

**File:** `apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx`.

**Root cause.** MapLibre requires a zoom curve (`interpolate`/`step` on
`['zoom']`) to be the **outermost** expression of a paint property; it may not
be nested inside another expression, and only **one** zoom-based subexpression
is allowed. The old code wrapped the zoom-based `lineWidthExpr` inside a `case`
and referenced it **twice**:
`'line-width': ['case', selFlag, ['+', lineWidthExpr, 2], lineWidthExpr]` —
two nested zoom curves → the error, on every repaint.

**Fix.** Collapsed to a **single top-level** zoom `interpolate`, folding the
`selFlag` selection `+2px` delta into each stop's **output** (feature-state is
permitted in the *output* values of a zoom curve; only the *input* must be
`['zoom']`). The `widthM` coalesce/`max` floors are unchanged; the `case` wrap
on `'line-width'` is gone. Sibling `ObserveAnnotationLayers.tsx` already applied
`beLineWidthExpr` at top level and was never the offender.

## Part 2 — URL-persist `?section=<id>`

**Files:** `apps/web/src/v3/plan/PlanLayout.tsx`,
`apps/web/src/v3/observe/ObserveLayout.tsx`.

Moved the section discriminator from `useState` to a URL **search param** (URL
is now the single source of truth, mirroring how `$module` already is). Reuses
the existing section ids (`mod`, `be-${category}`, `be-from-map`) and the
existing `*SectionIdModule` reconcile verbatim. **No `validateSearch`** added —
matches the in-tree `ObserveDeepLinkFocus` convention and avoids stripping the
existing `focus*` deep-link params.

```ts
const search = useSearch({ strict: false }) as { section?: string };
const activeSectionId = search.section ?? null;
const effectiveSectionId =
  activeSectionId && planSectionIdModule(activeSectionId) === validModule
    ? activeSectionId
    : null;
```

Navigation collapsed into one primitive that writes the `$module` path param
**and** the `?section` search param atomically (`navigate`'s `search` *replaces*
the object, so it is passed explicitly every time):

```ts
const navigateModuleSection = (mod, sectionId) => {
  if (!params.projectId) return;
  setSlideUpOpen(false);
  if (mod === null) { navigate({ to: '…/plan', params, search: {} }); return; }
  navigate({ to: '…/plan/$module', params: { …, module: mod },
             search: sectionId ? { section: sectionId } : {} });
};
const handleSelectModule  = (mod) => navigateModuleSection(mod, null);
const handleSelectSection = (mod, sectionId) =>
  effectiveSectionId === sectionId
    ? navigateModuleSection(null, null)
    : navigateModuleSection(mod, sectionId);
```

PlanLayout's silvopasture-drilldown `useEffect` navigate also got `search: {}`
so a programmatic module-open deterministically clears the section (whole
family). ObserveLayout has no such extra site. The four rail components are
unchanged — they already consume `effectiveSectionId` + `onSelectSection`.

## Verification

- **typecheck** (`cd apps/web && npm run typecheck`) at the **3-error
  pre-existing baseline** (`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
  `HostUnionDrilldownCard.test.tsx`) — no new errors.
- **Part 1 — console (port 5200):** the full console buffer is **clean** of any
  `design-el-line` / `line-width` / maplibre paint error (it logged every frame
  before). Only unrelated API-sync warnings remain (port-3001 API not running).
- **Part 2 — live DOM/URL evals** (`.groupActive` counts + `location.search`):
  - **Plan:** cold-load `…/plan/structures-subsystems?section=be-agricultural`
    → 2 active (one per rail), survives full reload, no family flash; click a
    section → narrows + writes `?section`, 2 active; click the active section →
    deselects, drops module **and** `?section` (bare `/plan`), 0 active;
    cold-load module with **no** `?section` → whole family (10 active).
  - **Observe:** cold-load `…/observe/built-environment?section=be-building`
    → 2 active; `?section=be-from-map` → **1 active** (main rail only, the
    documented behavior — no matching `ObserveChecklistAside` card); no
    `?section` → whole family (13 active); live click → writes `?section`, 2.

## Screenshot blocker — root cause corrected

The prior session attributed the `preview_screenshot` 30 s timeout to the
per-frame line-width error. **That attribution was wrong.** With the error gone,
the screenshot **still** times out. Diagnosis: the preview tab is **backgrounded**
(`document.visibilityState === 'hidden'`, `document.hasFocus() === false`). A
hidden tab throttles `requestAnimationFrame`, so anything needing a paint frame
(the screenshot, an rAF-based Promise) hangs at 30 s, while **synchronous**
evals return instantly. A `preview_resize` did not foreground it. So the
screenshot blocker is an **environment condition** (preview pane not
focused/visible), not renderer saturation and not the line-width error. Per the
project preview-verification rule this is stated, not assumed; the synchronous
DOM/URL evals above are the authoritative confirmation. The line-width fix is
still correct and worth keeping — it removes a genuine every-frame console error.

## Scope guards

- Staged **only** the 3 files by explicit path (+ this wiki entry). The working
  tree carried concurrent-session foreign WIP (EconomicsPanel, capitalPartner,
  SectorCompassOverlay, ZoneSomSidebar, …) left untouched per
  [[feedback-no-deletion]].
- No `validateSearch` added (deliberate); no route-definition, section-map,
  rail-component, or `GuidanceCard.tsx` change.

## Follow-ups

- Restoring `preview_screenshot` requires the preview pane to be focused/visible
  — an environment fix, not a code change. Until then, screenshot-based preview
  verification of map stages remains blocked regardless of the line-width fix.
- The **Act stage** still has no multi-highlight rail — nothing to port.
