# Ecosystem Farm Template
**Type:** project template (public, system-owned, deep-snapshot)
**Status:** shipped (Phase 4, 2026-05-21)
**Path:** `apps/api/src/db/migrations/034_template_slug_and_public.sql`, `apps/api/src/db/migrations/035_ecosystem_farm_template.sql`, `scripts/snapshot-ecosystem-farm-template.ts`, `apps/api/src/routes/templates/index.ts` (public route + deep replay), `apps/web/src/features/project/wizard/StepTemplate.tsx`, `apps/web/src/pages/RegisterPage.tsx`, `apps/web/src/dev/seedThreeStreamsFarm.ts`

## Purpose

A reusable, public, system-owned **`ProjectTemplate`** extracted from
the Three Streams Farm canon ([[entities/three-streams-farm]]) that
lets any visitor — arriving through the Three Streams showcase portal
or starting a project directly — instantiate a pre-loaded
Apricot-Lane-style ecosystem-farm project tuned to their own parcel
boundary. Closes the program-plan Artifact C contract: portal CTAs no
longer terminate at Calendly; they terminate at registration +
template instantiation.

## Architecture

1. **Schema** — `slug` (`text`) and `public` (`boolean`) columns added
   to `project_templates` in migration 034. The deep `snapshot` JSONB
   on the same table carries:
   - **Scalars** (existing): `name`, `description`, `projectType`,
     `country`, `provinceState`, `units`, owner-zoning-access-water
     notes, `parcelBoundaryGeojson`, `metadata`.
   - **Deep extensions** (new): `designFeatures[]` with
     centroid-normalized **relative geometry**;
     `regenerationEvents[]` with **relative dates** (offset days from
     Y0); `projectRelationships[]` with name-keyed edges
     (resolved to ids at replay time).
2. **Bootstrap row** — Migration 035 idempotently inserts one row:
   `id = '00000000-0000-0000-0000-0000ec05fa12'`,
   `owner_id = SYSTEM_USER_ID`, `slug = 'ecosystem-farm'`,
   `public = true`. The snapshot JSONB is materialized by
   `scripts/snapshot-ecosystem-farm-template.ts` from the live Three
   Streams substrate (project sentinel
   `00000000-0000-0000-0000-000000357320`).
3. **Public instantiate route** —
   `POST /api/v1/templates/public/:slug/instantiate`. Still requires
   authentication (the route's `preHandler` is `[authenticate, p2]`);
   the owner check is the only thing relaxed vs. the existing
   `/templates/:id/instantiate`. 404 on missing slug or
   `public = false`; 401 unauthenticated.
4. **Server-side deep replay** — Both instantiate handlers, after the
   vanilla project + boundary insert, replay the deep snapshot:
   - `design_features` insert with `ST_Translate(rel, vcx, vcy)`
     translating relative geometry into the visitor's centroid frame.
   - `regeneration_events` insert with `event_date = new_project.created_at + (relativeDate * interval '1 day')`.
   - `project_relationships` insert resolving feature *names* → newly
     inserted ids via a name→id map from the design_features RETURNING.
   - `project_layers` and `site_assessments` are **not** replayed;
     the existing `enqueueTier1Fetch(projectId)` already populates
     them from live adapters against the visitor's actual boundary.
5. **Client-side seeder auto-fire** — Generalized
   `seedThreeStreamsFarm.ts` exports
   `seedFromEcosystemFarmTemplate(projectId)` and an auto-fire hook
   on `projectStore.subscribe` that fires on any project whose
   `metadata.instantiatedFromTemplate === 'ecosystem-farm'` (in
   addition to the canonical Three Streams sentinel for back-compat).
   Idempotency: `ecosystem-farm-seeded@v1:<projectId>` localStorage
   key. Populates phaseStore (canon-named 4-phase scaffold) +
   workItemStore (~60 items via `seedGoalCompassPlan`) + nurseryStore
   (6 propagation batches) + siteProfileStore (Y2 facets) +
   ecologyStore (project-level `'mid'` succession stage).
6. **`/register` sibling route + RegisterPage** — Public route owns
   the post-registration handoff. Search params route by tier:
   - no flag → Dreaming: instant-instantiate empty boundary →
     `/v3/project/$projectId`.
   - `drawFirst=true` → Transitioning:
     `/new?prefillTemplate=ecosystem-farm&drawFirst=true` with
     boundary-drawing as first wizard step.
   - `fullSetup=true` → Stewarding:
     `/new?prefillTemplate=ecosystem-farm&fullSetup=true` with the
     org-setup prelude (followup, currently routes via the same
     wizard with the prefill).
7. **NewProjectPage StepTemplate** — New optional Step 0 in the
   wizard offers "Start blank" vs. "Ecosystem Farm
   (Apricot-Lane-style)". Auto-skipped when the URL carries
   `?prefillTemplate=` (the ContactCTA + RegisterPage thread it
   through). `StepNotes.handleCreate` branches on `data.templateSlug`:
   slug set → call `api.templates.instantiatePublic`; slug unset →
   vanilla project creation. `metadata.instantiatedFromTemplate` is
   stamped on both the local Zustand copy and the server payload.
8. **ContactCTA wiring** — Each tier's PRIMARY action is a
   `/register?next=instantiate&template=ecosystem-farm[&flag]` deep
   link; Calendly / contact-form remain as the SECONDARY action.

## Public Surface

- 1 new API route: `POST /api/v1/templates/public/:slug/instantiate`
  (auth-gated; only owner check relaxed).
- 1 new app route: `/register` (public sibling of `/login`).
- 1 new wizard step: `StepTemplate` (optional, auto-skipped when
  URL carries `?prefillTemplate=`).
- 1 new public template record (`slug='ecosystem-farm'`) discoverable
  via the existing `GET /api/v1/templates` (currently
  owner-scoped; client filters `public && slug` in `StepTemplate`).

## Locked Decisions (verbatim)

Three Phase 4 decisions are binding and must not drift:

1. **NEW `/register` sibling route** — not a `/login` tab overload.
   Owns the post-registration handoff for the showcase ContactCTA
   deep links. Existing `/login` tab toggle is unchanged.
2. **`ecologyStore` succession seeding ADDED** — project-level `'mid'`
   succession stage on Y2 instantiated projects.
3. **Both UX paths supported, routed by tier** — Dreaming →
   instant-instantiate empty boundary; Transitioning →
   `drawFirst=true`; Stewarding → `fullSetup=true`.

## Reused Substrate

- P2 template machinery (`POST /templates`, `GET /templates`,
  `POST /templates/:id/instantiate`) — extended, not replaced.
- `extractPolygonalGeometry` from `@ogden/shared/lib/geojsonGeometry`
  — reused for boundary handling in deep replay.
- `enqueueTier1Fetch(projectId)` — handles layers + site_assessments
  from live adapters; the deep replay does NOT duplicate.
- `seedGoalCompassPlan` — WorkItem distribution unchanged; called
  from the generalized seeder.
- TanStack Router public-sibling pattern (`/login`, `/landing`,
  `/showcase/*`, now `/register`).
- 4-phase scaffold in `phaseStore` (`ensureDefaults`).
- Existing wizard step pattern (`features/project/wizard/Step*.tsx`).
- `requirePhase('P2')` middleware.

## Open Followups

1. ~~**Fully-fledged org-creation prelude**~~ — **closed (Phase 4.5,
   2026-05-21)**. `/register?fullSetup=true` now routes Stewarding
   visitors to `/organizations/new` (progressive-disclosure form with
   member invites + jurisdiction + registry_id), which threads the
   chosen `orgId` into the new-project wizard handoff. Returning users
   with multiple workspaces hitting `/new` see an
   `OrganizationSwitcherModal`. See [[entities/organization]] and
   [[decisions/2026-05-21-atlas-org-creation-prelude]].
2. **Region-aware fallback** — non-Ontario visitors today receive a
   one-time warning banner; the canon's Halton-specific palette
   lands regardless. Generic Holmgren-grounded defaults for
   out-of-region boundaries are a Phase 4.5 followup.
3. **Multi-template gallery** — only the `ecosystem-farm` template
   ships in Phase 4. `StepTemplate` is already shaped to enumerate
   any `public && slug` template.
4. **User-owned public templates** — `/templates/public/:slug/instantiate`
   currently serves system-owned templates only by convention; the
   `public` flag is the technical gate. A future workflow could let
   users mark their own templates public after review.

## Covenant Framing

No CSRA / salam / advance-purchase / yield-share / investor / ROI
framing anywhere in the template surface. "Capital partners & allies"
is the only permitted capital framing if capital ever surfaces in
template-instantiation copy (currently absent). The Apricot Lane
attribution appears in `StepTemplate` card copy ("inspired by farms
like Apricot Lane Farms") and continues to render verbatim in the
showcase `AttributionFooter`. Covenant ratchet at
`apps/web/src/showcase/__tests__/covenant.test.ts` remains green.

## Notes

**Idempotency key change.** Pre-Phase-4, the auto-fire hook in
`seedThreeStreamsFarm.ts` keyed on `three-streams-seeded@v1`
(single global flag, fires only against the canonical sentinel
project). Phase 4 generalized to per-project keys
`ecosystem-farm-seeded@v1:<projectId>` so each instantiated project
seeds independently. Backwards compatibility: the canonical Three
Streams project also fires under the new keying scheme via the same
`metadata.instantiatedFromTemplate === 'ecosystem-farm'` check.

**ADR back-links.**
- Phase 4 ADR:
  [[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]].
- Phase 4 session log:
  [[log/2026-05-21-atlas-phase-4-ecosystem-farm-template]].
- Canon source: [[entities/three-streams-farm]].
- Portal surface that deep-links into this template:
  [[entities/showcase-portal]].
- Covenant boundary: [[decisions/2026-05-09-atlas-csra-erasure]].
- Spec the design ratifies:
  [`docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`](../../docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md)
  (Phase 3 spec; Phase 4 plan resides inline at
  `~/.claude/plans/let-s-work-together-to-flickering-thacker.md`).
