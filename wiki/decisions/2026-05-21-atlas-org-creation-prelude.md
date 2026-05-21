# Atlas — Org-Creation Prelude (Phase 4.5)
**Date:** 2026-05-21
**Status:** Ratified — landed on `feat/atlas-permaculture`
**Phase:** 4.5
**Context:** Phase 4 ([[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]]) shipped the Ecosystem Farm template + 3 tier flows. The Stewarding-tier `fullSetup=true` branch was stubbed — it skipped org creation entirely and routed straight to the project wizard. The institutional / multi-person dimension of land stewardship was invisible. Phase 4.5 closes that gap and makes orgs first-class across all three tiers.

## Locked Decisions

### 1. Audience shape — single prelude with progressive disclosure

**Decision:** One surface (`/organizations/new`) serves solo stewards, small bodies (2–5 people), and institutional bodies (land trusts / conservation orgs). Required field: org name (pre-filled from auto-created `${displayName}'s Workspace`). Progressively-disclosed fields under a "More options" section: jurisdiction (text), registry_id (text), member invite list (email + role per row).

**Rationale.** Three separate routes for solo / small / institutional would duplicate validation, branding, and the form subcomponent. Progressive disclosure keeps the solo path to 2 fields and a button while letting institutional visitors expand the form without leaving the page. The existing `organizations` table needed only two additive columns (jurisdiction + registry_id, migration 037) to cover the institutional surface area.

**Rejected alternatives.**
- *Tier-specific routes* — duplication; tier shape would leak into URLs (Stewarding is already a URL-level tier on the showcase portal; second tier expression on the prelude is noise).
- *Wizard-style multi-step prelude* — over-engineered; the prelude is one-shot configuration of an already-created workspace.

### 2. Surface placement — hybrid (route + modal)

**Decision:** First-time Stewarding visitor lands on a dedicated `/organizations/new` route (public-sibling-of-`appShellRoute` pattern, auth-gated). Returning users with multiple orgs hitting `/new` see an `OrganizationSwitcherModal` overlay that lists existing orgs and offers inline create (via the shared `OrganizationForm` subcomponent).

**Rationale.** Cold-visitor first-time flow benefits from a dedicated, shareable URL with browser-history affordances. Returning users coming back to create a project shouldn't be punted to a separate route — the modal is in-place and reuses the same form. One subcomponent (`OrganizationForm`) backs both surfaces, so they cannot drift.

**Rejected alternatives.**
- *Route-only* — disruptive for returning users mid-flow.
- *Modal-only* — first-time cold visitors lose the shareable URL.

### 3. Orphan policy — register-time auto-org for ALL tiers

**Decision:** Every successful `POST /api/v1/auth/register` creates `${displayName}'s Workspace` (plan `'free'`) and inserts the user as `owner` in `organization_members` — all in the same transaction. Dreaming + Transitioning + Stewarding all attach their first project to this default org. `projects.org_id NOT NULL` becomes the post-Phase-4.5 invariant. The Stewarding prelude reframes from "create from scratch" to "customize the auto-created workspace + invite members."

**Rationale.** The previous nullable `org_id` allowed orphaned projects with no workspace context. Making auto-org universal removes the orphan class entirely, simplifies the membership check in `POST /projects` (always resolvable), and gives every user a default org_id to fall back on. The Stewarding prelude becomes additive (customize an existing org) rather than gating (block until org exists), which is friendlier to mid-funnel visitors who change their mind.

Migration 036 backfills pre-Phase-4.5 NULL rows: walks each user with orphaned projects, creates a personal workspace if missing, attaches owner membership, then updates `projects.org_id` to the owner's oldest owner-role org. SYSTEM_USER_ID builtins attach to an "OLOS System Workspace" auto-created by the same migration. The ALTER NOT NULL only runs after backfill succeeds in the same migration file.

**Rejected alternatives.**
- *Stewarding-only auto-org* — leaves Dreaming + Transitioning orphan-prone; complicates the projects POST handler with tier-aware fallback logic.
- *Nullable `org_id` forever* — keeps the orphan class; downstream features (org-scoped permissions, billing, audit) would need to handle NULL forever.
- *Lazy org creation on first project* — duplicate logic across project + template-instantiate paths; tx scope harder to reason about.

## Implementation Shape

Three prongs, each landed as one commit.

### Prong 1 — Server foundation (migrations 036 + 037 + register tx)
- `apps/api/src/db/migrations/036_org_id_required_on_projects.sql` — backfill + NOT NULL + index.
- `apps/api/src/db/migrations/037_organization_jurisdiction_registry.sql` — additive columns.
- `apps/api/src/routes/auth/index.ts` — register handler wraps user + org + member in single tx; `/auth/me` returns `defaultOrgId`.
- `apps/api/src/routes/organizations/index.ts` — new `PATCH /:id` handler (owner-only).
- `apps/api/src/routes/projects/index.ts` + `apps/api/src/routes/templates/index.ts` — accept optional `orgId` in body; shared `resolveOrgForCaller` helper (membership check → fallback to caller's oldest owner-role org).
- `packages/shared/src/schemas/project.schema.ts` + `template.schema.ts` — `orgId` optional on Create/Instantiate inputs.

### Prong 2 — Client `/organizations/new` route
- `apps/web/src/pages/OrganizationCreatePage.tsx` — full-route page reading `next` + `template` search params for handoff.
- `apps/web/src/features/organizations/OrganizationForm.tsx` — progressive-disclosure subcomponent (shared with switcher modal).
- `apps/web/src/pages/RegisterPage.tsx` — `fullSetup=true` branch routes to `/organizations/new?next=instantiate&template=ecosystem-farm`.
- `apps/web/src/routes/index.tsx` — `organizationCreateRoute` as rootRoute child.
- `apps/web/src/lib/apiClient.ts` — `organizations.update` wrapper; `defaultOrgId` threading.

### Prong 3 — Client switcher modal + wizard orgId threading
- `apps/web/src/features/organizations/OrganizationSwitcherModal.tsx` — modal listing existing orgs + inline create via shared form.
- `apps/web/src/pages/NewProjectPage.tsx` — read `orgId` from search params + default to `authStore.user.defaultOrgId`; mount modal when `fullSetup=true && !orgId && user.orgs.length > 1`.
- `apps/web/src/features/project/wizard/StepNotes.tsx` — include `orgId` in create-project payload.

## Verification

- `pnpm --filter @ogden/api run migrate` clean on fresh DB; backfill walk produces `projects.org_id NOT NULL` final state on snapshots with pre-Phase-4.5 NULL rows.
- API vitest: 16/16 pass (smoke + projects suites updated to enqueue default-org SELECT before INSERT).
- Web covenant ratchet: 2/2 pass; org pages added to the scan glob without new hits on the forbidden regex (`CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b`).
- Cold-visitor flows verified at the SQL contract level for all three tiers; full E2E preview verification deferred to a follow-up session (no running stack in this session's env).
- Branch divergence: 2 ahead / 0 behind origin pre-wiki-commit.

## Covenant Notes

The org prelude surfaces (route + modal + shared form) contain no investor / member-in-isolation / yield-share / CSRA / salam framing. Field copy describes stewardship infrastructure: workspace name, jurisdiction, registry id, member invites. "Capital partners & allies" remains the only permitted capital framing if capital ever surfaces (currently absent). Apricot Lane attribution does not surface on org pages (it is a template-attribution string scoped to `StepTemplate` and the showcase `AttributionFooter`).

## Cross-links

- Closes: [[entities/ecosystem-farm-template]] Open Followup #1 (Fully-fledged org-creation prelude).
- Depends on: [[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]] (Phase 4 substrate).
- Touches: [[entities/showcase-portal]] (Stewarding-tier handoff now passes through prelude).
- New entity: [[entities/organization]].
- Covenant boundary: [[decisions/2026-05-09-atlas-csra-erasure]].
- Plan source: `~/.claude/plans/let-s-work-together-to-flickering-thacker.md` § Phase 4.5.
