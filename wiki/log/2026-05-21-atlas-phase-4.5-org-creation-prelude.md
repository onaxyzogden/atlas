# Atlas — Phase 4.5: Org-Creation Prelude
**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Commits:**
- `f007b8f2` feat(api): P4.5 server — org-creation prelude + orgId acceptance
- `52c91f1d` feat(web): P4.5 client — /register + /organizations/new + workspace modal
- *(this wiki commit)* docs(wiki): P4.5 absorption — org-creation prelude ADR + entity + log

## Objective

Close the Stewarding-tier gap from Phase 4 ([[entities/ecosystem-farm-template]] Open Followup #1) and make `Organization` first-class across all three showcase tier flows. Three locked decisions from the plan ratified verbatim:

1. Single prelude with progressive disclosure (one `/organizations/new` route serving solo → small body → institutional).
2. Hybrid placement (route for first-time, modal on `/new` for returning).
3. Register-time auto-org for ALL tiers (`projects.org_id NOT NULL` invariant).

## Work Landed

### Prong 1 — Server foundation
- **Migration 036** — `apps/api/src/db/migrations/036_org_id_required_on_projects.sql`. Backfill walks pre-Phase-4.5 NULL `projects.org_id` rows: creates personal `${displayName}'s Workspace` if missing, attaches owner membership, updates `projects.org_id` to the owner's oldest owner-role org. SYSTEM_USER_ID builtins attach to "OLOS System Workspace". Final ALTER NOT NULL + `projects_org_id_idx` only after backfill.
- **Migration 037** — `apps/api/src/db/migrations/037_organization_jurisdiction_registry.sql`. Additive columns `jurisdiction` + `registry_id` on `organizations`.
- **Register tx** — `apps/api/src/routes/auth/index.ts` wraps user INSERT + org INSERT + member INSERT in single tx; returns `{ user, defaultOrgId }`. `/auth/me` also returns `defaultOrgId`.
- **Org PATCH** — `apps/api/src/routes/organizations/index.ts` gets new `PATCH /:id` handler (owner-only, updates name/plan/jurisdiction/registry_id).
- **Project + template orgId acceptance** — `apps/api/src/routes/projects/index.ts` and `apps/api/src/routes/templates/index.ts` accept optional `orgId` in body. Shared `resolveOrgForCaller` helper: if `body.orgId` provided → membership-check (403 on mismatch); else SELECT caller's oldest owner-role membership. Same semantics across both routes.
- **Schemas** — `packages/shared/src/schemas/project.schema.ts` + `template.schema.ts` add `orgId: z.string().uuid().optional()` to Create/Instantiate inputs.

### Prong 2 — Client `/organizations/new` route
- **`OrganizationCreatePage.tsx`** — progressive-disclosure form. Required: org name (pre-filled from `authStore.user.displayName + "'s Workspace"`, editable). "More options" disclosure: plan select, jurisdiction text, registry_id text, member invite list (email + role per row). On submit: PATCH the auto-created org if name/fields differ, POST `/organizations/:id/members` for each invite, then route to `/new?prefillTemplate=<template>&orgId=<id>&fullSetup=true` per `next`/`template` search params.
- **`OrganizationForm.tsx`** — shared subcomponent backing both the full route and the switcher modal.
- **`RegisterPage.tsx`** — `fullSetup=true` branch now routes to `/organizations/new?next=instantiate&template=ecosystem-farm` instead of straight to `/new`.
- **Route wiring** — `apps/web/src/routes/index.tsx` registers `organizationCreateRoute` as rootRoute child with `validateSearch` for `next` + `template`.
- **API client** — `apps/web/src/lib/apiClient.ts` gains `organizations.update(id, body)` and threads `defaultOrgId` on register/login/me responses.
- **authStore** — `User` shape extended with `defaultOrgId: string`; persisted across session lifecycle.

### Prong 3 — Switcher modal + wizard orgId threading
- **`OrganizationSwitcherModal.tsx`** — modal triggered from `NewProjectPage` mount when (a) `fullSetup=true && !orgId` OR (b) user has multiple orgs. Lists existing orgs from `apiClient.organizations.list()`; inline create via shared `OrganizationForm`.
- **`NewProjectPage.tsx`** — reads `orgId` from `useSearch({ strict: false })`; defaults to `authStore.user.defaultOrgId`; mounts switcher modal under the trigger condition.
- **`StepNotes.tsx`** — `handleCreate` includes `orgId` in both the instantiate-public payload and the vanilla create payload.

## Verification

- **API vitest:** 16/16 pass. Two test files needed the default-org SELECT enqueued before the project INSERT:
  - `apps/api/src/tests/projects.test.ts`
  - `apps/api/src/tests/smoke.test.ts`
- **API tsc:** clean.
- **Web covenant ratchet** (`apps/web/src/showcase/__tests__/covenant.test.ts`): 2/2 pass + 4 skipped (unchanged); org pages added to the scan glob — zero new hits on `CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b`.
- **Web tsc:** baseline OOM (pre-existing, background task `bq4pcz8da`, not Phase-4.5-introduced) — not blocking.
- **E2E cold-visitor flows:** verified at the SQL/route-contract level for all three tiers. Live preview verification deferred to a follow-up session (no running stack in this env).
- **Branch divergence pre-wiki-commit:** 2 ahead / 0 behind origin.

## External Rebase Resilience

Per the `commit_immediately_on_rebased_branches` memory, work landed in two cohesive slices (server + client) the moment each verified, instead of accumulating. One rebase event during this session wiped earlier unsaved Phase 4 client + Phase 4.5 in-progress work — re-derived and re-committed. Foreign WIP (ObserveAnnotationLayers + 3 builtEnvironment files) remains untouched and unstaged per `feedback_no_deletion`.

## Closes / Cross-links

- Closes: [[entities/ecosystem-farm-template]] Open Followup #1.
- ADR: [[decisions/2026-05-21-atlas-org-creation-prelude]].
- New entity: [[entities/organization]].
- Touches: [[entities/showcase-portal]] (Stewarding handoff now threads through `/organizations/new`).
- Phase 4 substrate: [[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]].
- Plan source: `~/.claude/plans/let-s-work-together-to-flickering-thacker.md` § Phase 4.5.

## Followups

1. Transactional email for `POST /:id/members` invites (Phase 5 candidate).
2. Multi-org switcher in global app shell (currently modal-only on `/new`).
3. Org-level paid billing tiers if monetization surfaces.
4. SSO / SAML identity for institutional orgs.
5. Live E2E preview verification across all three tier flows (deferred from this session).
