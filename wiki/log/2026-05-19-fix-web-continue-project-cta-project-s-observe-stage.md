# 2026-05-19 — fix(web): "Continue Project" CTA → project's Observe stage


One-line navigation bug fix. The **"Continue Project"** primary CTA on
the Project Command Home (`apps/web/src/v3/pages/HomePage.tsx`,
`HomeHero` action) navigated to the legacy `/cycle` route, whose
unconditional `beforeLoad` throws `redirect({ to: '/v3/project' })`
(the projects landing **list**) and carries **no** `projectId` — so
clicking "Continue Project" ejected the user out of their project onto
the project list. Fixed the single incorrect caller to navigate
`{ to: '/v3/project/$projectId/observe', params: { projectId: project.id } }`
(`project` is the non-null early-return guard's value; `Project.id` is
`string` per `v3/types.ts:370`). Destination confirmed with the user
(Observe stage) and matches the existing legacy `/project/$projectId`
redirect and the Command Palette's project-open action. Legacy `/cycle`
route and its other caller `pages/CyclePage.tsx` left untouched
(`feedback_no_deletion.md`); only the one wrong caller changed.
Verified: web `tsc --noEmit` exit 0 (typed `to`/`params` correct against
the generated route tree); live preview (server `web`, project `mtc`) —
`/v3/project/mtc/home` → click "Continue Project" → URL becomes
`/v3/project/mtc/observe`, Observe module grid renders (Human Context,
Built Environment, … SWOT Synthesis), screenshot captured as proof, not
the projects list. No ADR — bug fix, no architectural decision.
