# 2026-05-25 — Plan Work Packages + Plan→Act Handoff (Plan-Operation Phase 3)

**Branch.** `feat/atlas-permaculture`. Implements the approved Phase 3 of the
Plan-Operation roadmap — the first slice where a Plan-Operation record produces
work the Act stage consumes.

## What shipped

An *accepted* `create-act-task` Decision now generates a durable, team-typed
**Act Work Package** (objective / detail / teamType / location / tools /
evidence-required / completion-criteria / status), surfaced in a new Plan-side
**Work Packages** queue (`/v3/project/$id/plan/work-packages`) and **consumed by
Act** in a new "Incoming packages" card under the Act Tracker module. Plan
authors + dispatches (draft → queued); Act advances (queued → in-progress →
done).

Architecture, trigger, and surface forks were operator-confirmed (authored store
+ queue, not spine-sync; explicit button on `create-act-task` only, idempotent;
both a Decision Log button and a dedicated route+sidebar entry). Full rationale +
file list in ADR [[decisions/2026-05-25-atlas-plan-work-packages-phase3]].

## Verification

- `npx vitest run src/v3/plan/work-packages/__tests__/planWorkPackage.test.ts
  src/lib/__tests__/syncManifest.test.ts` → **21/21 passing** (pure-helper tests +
  the persisted-store coverage guard).
- `tsc --noEmit` clean for the changeset; only the 4 documented pre-existing
  unrelated errors remain.
- **Browser visual check deferred** — the live preview's auth session was
  cleared mid-session and the token-restore workaround was correctly denied as an
  auth bypass; not pursued. Committed on operator instruction with the deferral
  stated. Screenshots of the WP page, the Decision Log bridge, and the Act card
  still want a logged-in operator session.

## Process

Phase 2 → Phase 3 continuation. Only the Phase 3 slice was staged (by file name) —
the working tree also carries unrelated foreign WIP (economics/map/financial
edits, ZoneSomSidebar, MapCoordinateReadout, materialSubstitution) which was left
untouched per [[feedback-no-deletion]]. Shared files (`syncManifest.ts`,
`routes/index.tsx`, `ActModuleSlideUp.tsx`, `act/types.ts`,
`V3LifecycleSidebar.tsx`, `PlanDecisionLogPage.tsx`+css) were diff-verified to
contain Phase-3-only hunks before staging. Committed the slice the moment it
verified, then divergence-checked before pushing per
[[feedback-commit-immediately-on-rebased-branches]]. Continues the Plan-Operation
roadmap thread (Phases 1–2). Updates entity [[entities/web-app]].
