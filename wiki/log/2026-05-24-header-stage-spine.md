# Move the Observe/Plan/Act StageSpine into the global top header

**Date:** 2026-05-24
**Branch:** `feat/atlas-permaculture`

## What

The clean Observe/Plan/Act **StageSpine** (icon + label + percent pills) lived
*only* inside the Stage Compass page's local header, so it appeared on `/compass`
and nowhere else. The persistent global **AppShell** header (which renders on
`/v3/project/...` because the `!isProjectPage` guard keys on `/project/`, not
`/v3/project/`) instead showed **`LevelNavigatorBar`** — a prev/title/next
carousel whose center title also opened the Land Assessment slide-up. The steward
selected the three spine pills and directed: *"Move these to the top header and
replace the other stage navigator."* So the spine becomes the single persistent
stage navigator across the app, and the carousel is unmounted.

A mid-task out-of-band rebase had already refactored the compass into a
stage-agnostic shape (`StageSpine` took `activeStage` + a single `progress` +
`onNavigateStage`; one shared `StageCompassView` for all three stages). The plan
was adapted to that reality at execution time.

## Locked steward decisions

1. **Percent readout:** Observe shows its real verified % (the
   `useCompassData(projectId).stage` aggregate); Plan and Act show an **em dash
   (`—`)** — a header progress source for them is deferred. (Plan/Act now each
   have a real data hook, so a real % is technically available; the dash is
   retained per the steward's explicit choice and flagged as a follow-up.)
2. **Observe destination by progress:** Observe routes to the **Compass**
   (`/v3/project/$id/compass`) while incomplete; once `pct === 100` it routes to
   the **Command Centre** (`/v3/project/$id/observe/command-centre`) — same
   center-unlock precedent as the Observe Command Centre decision.
3. **Land Assessment slide-up trigger dropped for now** — the carousel was its
   only entry point; re-addable via another affordance later.

## How

- **`StageSpine`** stays purely presentational. New props: `activeStage: Stage |
  null` (null = Report route — spine shown, none highlighted), `observeProgress:
  ObjectiveProgress` (only Observe renders a %; Plan/Act read the em dash), and
  the existing `onNavigateStage` callback. Each segment has `data-stage`,
  `data-active`, and `aria-current='step'`. Route literals stay out of the spine
  (the refactor's philosophy).
- **`HeaderStageSpine`** (new, `apps/web/src/v3/HeaderStageSpine.tsx`) — the
  route-aware wrapper owning the typed router. Parses the pathname
  (`/^\/v3\/project\/([^/]+)\/(compass|observe|plan|act|report)(?:\/|$)/`), maps
  section→activeStage (`compass`/`observe`→`observe`, `plan`→`plan`, `act`→`act`,
  `report`→`null`), calls `useCompassData` **unconditionally** (rules of hooks),
  returns `null` off recognised routes, and implements the navigation decisions.
  Mounted in the AppShell header's `.headerCenter` slot in place of
  `LevelNavigatorBar`.
- **`StageCompassView`** no longer renders its own `.top` spine (it would
  duplicate the header). `onNavigateStage` + the per-wrapper `navigateStage`
  functions (Observe/Plan/Act pages) were removed; cross-stage navigation lives
  in the header. `.page` grid collapsed `auto 1fr` → `1fr`; the unused `.top` CSS
  rule deleted.

## Preservation (no-deletion-in-revamps)

`LevelNavigatorBar` and `LandAssessmentSlideUp` are **unmounted, not deleted** —
both stay on disk and exported; `V3LevelNavBridge` + its provider remain so the
in-page `LevelNavigatorSegments` (inside `ObserveLayout`) keep working. Only the
AppShell header import + the one center-slot mount changed.

## Covenant

Pure presentation/navigation change — no schema, store action, data model,
`MODULE_CARDS`, or migration. Covenant grep over the new/edited files is clean
(no riba/gharar/CSRA/salam/investor/financing/yield/ROI framing).

## Verification

`StageSpine.test.tsx` (6) + `HeaderStageSpine.test.tsx` (8) green; full apps/web
vitest sweep green; `tsc --noEmit` at the 3-error pre-existing baseline
(`StepBoundary.tsx` `ReactNode`; two `HostUnion*` test types). Live preview
follows the screenshot-honesty rule. Explicit-path staging on
`feat/atlas-permaculture`, divergence-checked before push.

ADR: [[decisions/2026-05-24-atlas-header-stage-spine]].
