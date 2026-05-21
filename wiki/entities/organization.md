# Organization
**Type:** domain entity (multi-tenant workspace)
**Status:** shipped (Phase 4.5, 2026-05-21)
**Path:** `apps/api/src/db/migrations/001_initial.sql` (base schema), `apps/api/src/db/migrations/036_org_id_required_on_projects.sql`, `apps/api/src/db/migrations/037_organization_jurisdiction_registry.sql`, `apps/api/src/routes/organizations/index.ts`, `apps/api/src/routes/auth/index.ts` (auto-org tx), `apps/web/src/pages/OrganizationCreatePage.tsx`, `apps/web/src/features/organizations/OrganizationForm.tsx`, `apps/web/src/features/organizations/OrganizationSwitcherModal.tsx`

## Purpose

The `Organization` is OLOS's multi-tenant workspace primitive — the
container that owns projects, gathers members under a role model, and
anchors institutional identity (jurisdiction, registry_id, plan). Every
user has at least one personal default org auto-created at register-time
(`${displayName}'s Workspace`, plan `'free'`, role `owner`); every project
attaches to exactly one org via `projects.org_id NOT NULL`. The
Phase 4.5 org-creation prelude makes orgs first-class in the cold-visitor
flow: Stewarding-tier visitors customize their auto-created workspace
(jurisdiction, registry_id, member invites) before instantiating the
Ecosystem Farm template ([[entities/ecosystem-farm-template]]).

## Schema

**`organizations`** (migration 001 + 037):

| column | type | notes |
|---|---|---|
| `id` | `uuid` | primary key |
| `name` | `text` | required; default `${displayName}'s Workspace` from auto-org |
| `plan` | `text` | default `'free'` |
| `jurisdiction` | `text` | nullable (added migration 037) — institutional org legal jurisdiction |
| `registry_id` | `text` | nullable (added migration 037) — institutional registry/charity number |
| `created_at` | `timestamptz` | default `NOW()` |

**`organization_members`** (migration 001):

| column | type | notes |
|---|---|---|
| `org_id` | `uuid` | FK organizations(id) ON DELETE CASCADE |
| `user_id` | `uuid` | FK users(id) ON DELETE CASCADE |
| `role` | `text` | one of `owner` \| `admin` \| `editor` \| `viewer`; default `'viewer'` |
| `joined_at` | `timestamptz` | default `NOW()` |

PRIMARY KEY `(org_id, user_id)`.

**`projects.org_id`** (migration 036): now `NOT NULL` with index
`projects_org_id_idx`. Backfill walks pre-Phase-4.5 NULL rows: creates a
personal workspace for any user lacking one, attaches owner role, then
updates `projects.org_id` to the owner's oldest owner-role org_id. The
SYSTEM_USER_ID builtins (351 House, Three Streams, MTC) attach to an
"OLOS System Workspace" auto-created by the same migration.

## Role Model

- **`owner`** — full CRUD on the org, can transfer ownership, can
  invite/remove members of any role. Last owner cannot be removed
  (existing handler guard in `organizations/index.ts`).
- **`admin`** — invite/remove members below owner; cannot delete the org.
- **`editor`** — read/write project content within the org.
- **`viewer`** — read-only.

## API Surface

All routes under `/api/v1/organizations`:

- `POST /` — create org; caller becomes owner.
- `GET /` — list caller's orgs (returns role per org).
- `GET /:id` — org detail (auth required; membership-gated).
- `PATCH /:id` — update name / plan / jurisdiction / registry_id
  (owner-only).
- `POST /:id/members` — invite member by user_id + role (owner/admin).
- `DELETE /:id/members/:userId` — remove member (owner/admin; last-owner
  guard).
- `GET /:id/members` — list members + roles.

## Register-time Auto-org

`POST /api/v1/auth/register` wraps user INSERT + org INSERT + member
INSERT in a single transaction:

1. INSERT user → returns `userId`.
2. INSERT `organizations` with `name = '${displayName}'s Workspace'`,
   `plan = 'free'` → returns `defaultOrgId`.
3. INSERT `organization_members` with `(defaultOrgId, userId, 'owner',
   NOW())`.
4. Return JWT + `{ user, defaultOrgId }`.

Any failure rolls the whole tx back — no orphaned users, no orphaned
orgs. `/auth/me` returns `defaultOrgId` so existing sessions rehydrate
the value.

## Project Attachment Invariant

Post-migration 036, every project row has `org_id NOT NULL`. The POST
`/api/v1/projects` handler:

1. If `body.orgId` provided → membership check (caller must be a member
   of that org); 403 on mismatch.
2. Else → SELECT oldest `owner`-role membership for caller; use that
   `org_id`.
3. INSERT project with resolved `org_id`.

Same `resolveOrgForCaller` helper used by both template-instantiation
routes (`POST /templates/:id/instantiate` + `POST /templates/public/:slug/instantiate`).

## Cold-Visitor Flow Integration

Three tier branches landing through `RegisterPage`:

- **Dreaming** (no `fullSetup`) → register creates default org → instant
  instantiate template against default org → `/v3/project/<id>`.
- **Transitioning** (`drawFirst=true`) → register creates default org →
  `/new?prefillTemplate=ecosystem-farm&drawFirst=true` → wizard
  instantiates against default org.
- **Stewarding** (`fullSetup=true`) → register creates default org →
  `/organizations/new?next=instantiate&template=ecosystem-farm` →
  visitor customizes name / jurisdiction / registry_id / invites →
  `/new?prefillTemplate=ecosystem-farm&orgId=<id>` → wizard instantiates
  against customized org.

Returning users with multiple orgs hitting `/new` see the
`OrganizationSwitcherModal` — pick existing org or create a new one
inline (via the shared `OrganizationForm` subcomponent).

## Reused Substrate

- `organizations` + `organization_members` tables (migration 001) —
  shape unchanged; one additive migration (037) adds jurisdiction +
  registry_id.
- Existing org CRUD handlers in `apps/api/src/routes/organizations/index.ts`
  — extended with one new PATCH handler.
- `apiClient.organizations.*` wrappers in `apps/web/src/lib/apiClient.ts`
  — added `.update` to the existing surface.
- TanStack Router public-sibling pattern — `/organizations/new` follows
  `/login`, `/register`, `/showcase/*` precedent (auth-gated, not
  public).
- `OrganizationForm` shared between `OrganizationCreatePage` (full route)
  and `OrganizationSwitcherModal` (inline create) — single source of
  truth for the progressive-disclosure shape.

## Open Followups

1. **Transactional email for invites** — `POST /:id/members` currently
   creates the membership row directly; SMTP delivery of the invite
   notification is a Phase 5 followup.
2. **Multi-org switcher in global app shell** — the Phase 4.5 modal only
   fires from `/new`; a top-bar workspace switcher across the authed app
   is a separate slice.
3. **Org-level billing tiers** — `plan` column accepts any string today;
   paid-tier wiring deferred until/if monetization surfaces.
4. **SSO / SAML org identity** — institutional-tier future ask; not in
   v1.

## Covenant Framing

The `OrganizationCreatePage` and `OrganizationSwitcherModal` copy never
uses "investor" / "member" in isolation, "yield share", "ROI", "CSRA",
or salam-style advance-purchase language. The progressive-disclosure
fields (name, jurisdiction, registry_id, member invites) describe
stewardship infrastructure, not capital. "Capital partners & allies" is
the only permitted capital framing if capital ever surfaces in org
copy (currently absent). Covenant ratchet in
`apps/web/src/showcase/__tests__/covenant.test.ts` extends to scan the
new org surfaces.

## Notes

**ADR back-links.**
- Phase 4.5 ADR:
  [[decisions/2026-05-21-atlas-org-creation-prelude]].
- Phase 4.5 session log:
  [[log/2026-05-21-atlas-phase-4.5-org-creation-prelude]].
- Phase 4 dependency:
  [[entities/ecosystem-farm-template]] (Open Followup #1 closed by this
  slice).
- Covenant boundary:
  [[decisions/2026-05-09-atlas-csra-erasure]].
- Showcase handoff:
  [[entities/showcase-portal]] (Stewarding-tier prelude integration).
