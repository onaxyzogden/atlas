# ADR: Observe/Plan/Act spine moves into the global top header

**Date:** 2026-05-24
**Status:** accepted

**Context:**
Two competing stage navigators existed in the chrome. The clean **StageSpine**
(Observe / Plan / Act pills with an icon, label, and percent) lived *only* inside
the Stage Compass page's own local header (`StageCompassView`'s `.top` row), so it
was visible on `/compass` but nowhere else. The persistent global **AppShell**
header (`apps/web/src/app/AppShell.tsx`, rendered on `/v3/project/...` because the
`!isProjectPage` guard keys on `/project/`, not `/v3/project/`) instead showed a
different navigator — **`LevelNavigatorBar`**, a prev/current-title/next carousel
whose center title also opened the Land Assessment slide-up.

The steward selected the three spine pills and directed: *"Move these to the top
header and replace the other stage navigator."* So the spine becomes the single,
persistent stage navigator across the app, and the carousel is unmounted.

A mid-task out-of-band rebase had already refactored the compass system into a
stage-agnostic shape — `StageSpine` took `activeStage` + a single `progress` +
an `onNavigateStage` callback, and one shared `StageCompassView` served all three
stages (Observe/Plan/Act each via a thin page wrapper + its own data hook). The
plan was adapted to that reality at execution time rather than the pre-refactor
shape it was written against.

**Decision (steward-locked choices):**

1. **Percent readout:** Observe shows its **real verified %** (the
   `useCompassData(projectId).stage` aggregate). Plan and Act show an **em dash
   (`'—'`)** — a header progress source for them is deferred. *(Plan and Act
   now each have their own compass + data hook, so a real % is technically
   available; the dash is retained per the steward's explicit choice and revisited
   below.)*
2. **Observe destination by progress:** clicking Observe routes to the **Compass**
   (`/v3/project/$id/compass`) while Observe is incomplete; once every Observe
   objective is verified (`pct === 100`) it routes to the **Command Centre**
   (`/v3/project/$id/observe/command-centre`) — the same center-unlock precedent
   as [[decisions/2026-05-24-atlas-observe-command-centre]].
3. **Land Assessment slide-up trigger dropped for now:** the carousel was its only
   entry point; it can be re-added via another affordance later.

**Architecture:**

- **`StageSpine`** stays purely presentational. New props:
  `activeStage: Stage | null` (null = Report route — spine shown, none
  highlighted), `observeProgress: ObjectiveProgress` (only the Observe segment
  renders a %; Plan/Act read the em dash), and the existing `onNavigateStage`
  callback. Each segment gains `data-stage` for testability and keeps
  `data-active` + `aria-current='step'`. Route literals stay **out** of the spine
  (the refactor's philosophy).
- **`HeaderStageSpine`** (new, `apps/web/src/v3/HeaderStageSpine.tsx`) — the
  route-aware wrapper that owns the typed router. It parses the pathname
  (`/^\/v3\/project\/([^/]+)\/(compass|observe|plan|act|report)(?:\/|$)/`), maps
  section→activeStage (`compass`/`observe`→`observe`, `plan`→`plan`, `act`→`act`,
  `report`→`null`), calls `useCompassData` **unconditionally** (rules of hooks)
  for the Observe aggregate, returns `null` off the recognised routes, and
  implements the navigation decisions (Observe-by-progress; Plan/Act no-op when
  already active, else navigate). Mounted in the AppShell header's `.headerCenter`
  slot in place of `LevelNavigatorBar`.
- **`StageCompassView`** no longer renders its own `.top` spine (it would now
  duplicate the header). The `onNavigateStage` prop + the per-wrapper
  `navigateStage` functions (Observe/Plan/Act pages) were removed; cross-stage
  navigation lives in the header. `.page` grid collapsed from `auto 1fr` to a
  single `1fr` body row; the unused `.top` CSS rule was deleted.

**Preservation (no-deletion-in-revamps):**
`LevelNavigatorBar` and `LandAssessmentSlideUp` are **unmounted, not deleted** —
both stay on disk and exported, and `V3LevelNavBridge` + its provider remain so
the in-page `LevelNavigatorSegments` (inside `ObserveLayout`) keep working. Only
the AppShell header import + the one center-slot mount changed.

**Covenant constraints (held):**
Pure presentation/navigation change — no schema, store action, data model,
`MODULE_CARDS`, or migration. Covenant grep over the new/edited files is clean
(no riba/gharar/CSRA/salam/investor/financing/yield/ROI framing).

**Consequences:**
- The Observe/Plan/Act spine is now the single persistent stage navigator; it
  follows the active route's stage and disappears off non-stage routes (home,
  project list). The compass body shows no second spine.
- Plan/Act reading `'—'` is a **known divergence** from the now-available
  real progress; flagged for the steward as a quick follow-up (swap the dash for
  `usePlanCompassData` / `useActCompassData` aggregates) if desired.
- Dropping the Land Assessment entry point leaves it without a trigger until a
  new affordance is added.

**Verification:**
`StageSpine.test.tsx` (6) + `HeaderStageSpine.test.tsx` (8) green; full apps/web
vitest sweep green; `tsc --noEmit` at the 3-error pre-existing baseline
(`StepBoundary.tsx` `ReactNode`; two `HostUnion*` test types). Live preview
follows the screenshot-honesty rule. Commits on `feat/atlas-permaculture`,
explicit-path staging, divergence-checked before push.
