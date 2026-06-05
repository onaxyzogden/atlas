# 2026-05-08 — Atlas V3 `/v3/project` projects landing + stage CTAs


### Summary

Made `/v3/project` (no `:projectId`) a graceful landing page rendered in
the Property Candidates card format, with two sections: "Your Projects"
(real projects from `useProjectStore`, shown as muted "Not evaluated"
cards) and "Sample Candidates" (the existing mock fixtures). Card click
opens a side drawer; for real projects the drawer's "Open project →"
navigates to `/v3/project/$id`, for mock candidates it shows
"Sample — cannot open" disabled. Wired the AppShell header's "All
Projects" link to `/v3/project` (was `/home`). Replaced V3 HomePage's
single "Continue Project" button with three stage-specific buttons —
Observe, Plan, Act — that navigate directly into each stage; "Generate
Brief" preserved as the fourth (no-op for now).

### Why

Previously `/v3/project` (no project ID) hit the 404 catch-all. The
Property Candidates board (`DiscoverPage`) had a polished card grid but
lived inside a project and only rendered mock data. Bringing real
projects + samples into a single landing closes the no-project gap
and gives the Property Candidates format double duty as the project
list. The stage buttons replace an opaque "Continue Project" CTA with
explicit navigation into Observe/Plan/Act.

### Decisions

- Real projects render same card layout with `—` placeholders (not
  hidden sections) for visual consistency in the grid.
- Real + mock shown sectioned ("Your Projects" / "Sample Candidates"),
  not mixed.
- Card click opens a detail drawer first; an explicit "Open project →"
  CTA navigates. Mocks have the CTA disabled.
- Local-candidate IDs namespaced with `local:` prefix to keep the
  selection store distinguishing real projects from mock entries.

### Files

**Created**
- `apps/web/src/v3/pages/ProjectsLandingPage.tsx` (+ module.css)
- `apps/web/src/v3/components/CandidateDetailDrawer.tsx` (+ module.css)
- `apps/web/src/v3/data/projectToCandidate.ts`

**Modified**
- `apps/web/src/v3/components/CandidateCard.tsx` — branches on
  `fitScore == null` for placeholder rendering
- `apps/web/src/v3/components/CandidateCard.module.css` — `.tone-muted`,
  `.placeholderText`
- `apps/web/src/routes/index.tsx` — registered
  `v3ProjectsLandingRoute` as sibling of `v3ProjectLayoutRoute`
- `apps/web/src/app/AppShell.tsx` — "All Projects" link → `/v3/project`;
  `isHome` includes `/v3/project`
- `apps/web/src/v3/pages/HomePage.tsx` — replaced "Continue Project"
  with Observe/Plan/Act buttons + Generate Brief retained

### Verification

- TypeScript: `npx tsc --noEmit` exit 0 (apps/web).
- Preview at `/v3/project`: both sections render; 2 real projects shown
  as muted "Not evaluated" cards, 6 mock candidates fully evaluated.
- Real-project drawer → "Open project →" enabled, navigates to
  `/v3/project/$id`.
- Mock-candidate drawer → "Sample — cannot open" disabled.
- "All Projects" header link → `/v3/project`, hidden while on landing.
- HomePage stage buttons confirmed: Observe → `/observe`, Plan →
  `/plan`, Act → `/act`.
- `/v3/project/mtc/observe` continues to render normally — no
  regression.

### Commit

(see git log for hash) on `feat/atlas-permaculture`.

### Recommended next session

- Wire "Generate Brief" CTA on the V3 HomeHero (currently no-op).
- Consider deriving a basic fit score for real projects so the
  placeholder cards become informative.
- Same as previous: fix `/plan` route crash (`PlanChecklistAside.tsx:148`
  missing `livestock` module guidance).
