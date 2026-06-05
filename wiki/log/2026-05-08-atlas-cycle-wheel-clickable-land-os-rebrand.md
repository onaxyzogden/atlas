# 2026-05-08 — Atlas cycle wheel clickable + Land OS rebrand


### Completed
- **CycleWheel made interactive.** Extended `CycleSegment` type with
  `description`, `onClick`, and `disabled`; sectors now render with
  `role="button"`, keyboard support (Enter/Space), focus visible, and
  cursor-pointer when clickable. Added an HTML hover tooltip overlay
  (label + description + "Click to open →" CTA) centered in the wheel,
  with reduced-motion-safe fade-in. Files:
  - [apps/web/src/components/CycleWheel/CycleWheel.tsx](../apps/web/src/components/CycleWheel/CycleWheel.tsx)
  - [apps/web/src/components/CycleWheel/CycleWheel.css](../apps/web/src/components/CycleWheel/CycleWheel.css)
- **CyclePage wired to active project.** `/cycle` reads
  `activeProjectId` from `useProjectStore` and builds segment handlers
  routing to `/v3/project/$id/observe|plan|act`. When no active project
  is set, segments render disabled with a hint pointing to All Projects.
  Files:
  - [apps/web/src/pages/CyclePage.tsx](../apps/web/src/pages/CyclePage.tsx)
  - [apps/web/src/pages/CyclePage.module.css](../apps/web/src/pages/CyclePage.module.css)
- **V3ProjectLayout syncs `activeProjectId` from URL.** Adds a
  `useEffect` that calls `setActiveProject(params.projectId)` whenever
  the route param changes — without this, `/cycle` always saw a null
  active project and segments stayed disabled even after entering a
  project. File:
  - [apps/web/src/v3/V3ProjectLayout.tsx](../apps/web/src/v3/V3ProjectLayout.tsx)
- **Header rebrand + nav.** Logo subtitle "Land Design Atlas" → "Land
  OS"; logo `<Link>` now points to `/v3/project` so clicking either
  "OGDEN" or "Land OS" returns to the All Projects landing. File:
  - [apps/web/src/app/AppShell.tsx](../apps/web/src/app/AppShell.tsx)
- **ProjectsLandingPage scroll fix.** `/v3/project` is mounted directly
  under `<main>` (which has `overflow: hidden`), so the page couldn't
  scroll past the fold. Added a `.scrollHost` class
  (`height: 100%; overflow-y: auto`) composed onto the existing
  `css.page` wrapper. Files:
  - [apps/web/src/v3/pages/ProjectsLandingPage.tsx](../apps/web/src/v3/pages/ProjectsLandingPage.tsx)
  - [apps/web/src/v3/pages/ProjectsLandingPage.module.css](../apps/web/src/v3/pages/ProjectsLandingPage.module.css)
- **HomePage Continue Project → /cycle.** V3 HomeHero's "Continue
  Project" CTA navigates to the cycle wheel page; "Generate Brief"
  retained as no-op secondary. File:
  - [apps/web/src/v3/pages/HomePage.tsx](../apps/web/src/v3/pages/HomePage.tsx)

### Verification
- `/cycle` with active project: 3 sectors `is-clickable`, cursor pointer.
- Hover any sector → tooltip renders with label + description + CTA.
- Synthetic native click on `.cw-seg-current` of the Plan sector →
  navigated to `/v3/project/{id}/plan`. Act sector → `/act`.
- `/cycle` with no active project: 3 sectors `is-disabled`, cursor
  not-allowed; tooltip CTA reads "No project selected".
- Visiting `/v3/project/{id}/home` writes
  `state.activeProjectId = "{id}"` to localStorage via the new
  V3ProjectLayout effect.
- `/v3/project` page scrollTop reaches 600 with `overflow-y: auto`
  applied (clientHeight 884, scrollHeight 2392).

### Deferred
- "Generate Brief" CTA still no-op.
- Real-project fit scoring (placeholder cards remain "Not evaluated").
- `/plan` route crash on missing `livestock` guidance — unchanged.

### Commit

(see git log for hash) on `feat/atlas-permaculture`.

### Recommended next session

- Replace synthetic-event verification of CycleWheel clicks with an
  actual user-facing screenshot test (preview screenshot kept timing
  out this session).
- Consider whether `/cycle` should redirect to
  `/v3/project/$id/observe` directly when an active project exists,
  rather than rendering the wheel as an intermediary.
- Same as previous: fix `/plan` route crash
  (`PlanChecklistAside.tsx:148` missing `livestock` module guidance).
