# Phase 4 — Ecosystem Farm Template Extraction

**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`
**Commits:** P4-1/2/3 (prior session) + `9cd48a64` (P4-4a) + `5c634767`
(P4-4b) + `875ff89c` (P4-4c) + `ccdbd224` (P4-4d). 6 ahead / 0 behind
origin at session-close (push gate pending user approval).

## Goal

Close program-plan Artifact C — the reusable Apricot-Lane-inspired
Ecosystem Farm template — so the Phase 3 showcase portal's ContactCTA
can deep-link to template instantiation instead of terminating at
Calendly. See [[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]].

## Locked Decisions (verbatim, set this session)

1. **NEW `/register` sibling route** — not a `/login` tab overload.
2. **`ecologyStore` succession seeding ADDED** — `'mid'` at Y2.
3. **Both UX paths supported, routed by tier param** — Dreaming /
   Transitioning (`drawFirst`) / Stewarding (`fullSetup`).

## What Landed

### P4-1 — Schema + migration 034
- Extended `TemplateSnapshot` Zod schema with optional
  `designFeatures[]`, `regenerationEvents[]`,
  `projectRelationships[]`.
- `apps/api/src/db/migrations/034_template_slug_and_public.sql` —
  `slug` + `public` columns + unique/partial indexes.
- Drizzle schema regenerated.

### P4-2 — Bootstrap snapshot + migration 035
- `scripts/snapshot-ecosystem-farm-template.ts` — reads Three Streams
  substrate, centroid-normalizes feature geometry, emits deep JSONB.
- `apps/api/src/db/migrations/035_ecosystem_farm_template.sql` —
  idempotent INSERT of the public template row.

### P4-3 — Public route + deep replay
- New `POST /api/v1/templates/public/:slug/instantiate` (auth-gated;
  owner check relaxed).
- Both instantiate handlers replay `design_features`,
  `regeneration_events`, and `project_relationships` from the deep
  snapshot using PostGIS `ST_Translate` + name→id resolution.
- `project_layers` + `site_assessments` continue to come from the
  existing `enqueueTier1Fetch` against live adapters.

### P4-4a — Generalized seeder (commit `9cd48a64`)
- `apps/web/src/dev/seedThreeStreamsFarm.ts` now exports
  `seedFromEcosystemFarmTemplate(projectId)` + auto-fires on
  `metadata.instantiatedFromTemplate === 'ecosystem-farm'`.
- Idempotency key per-project: `ecosystem-farm-seeded@v1:<projectId>`.
- ecologyStore project-level `'mid'` succession added per locked
  decision #2.

### P4-4b — `/register` route + RegisterPage (commit `5c634767`)
- New `RegisterPage` at `apps/web/src/pages/RegisterPage.tsx` with
  three handoff branches keyed off search params (`next`, `template`,
  `drawFirst`, `fullSetup`).
- `registerRoute` added to TanStack Router as a root-level public
  sibling of `/login`, `/landing`, `/portal/$slug`, `/showcase/*`.
- `api.templates.instantiatePublic(slug, body)` wrapper added to
  `apps/web/src/lib/apiClient.ts`.

### P4-4c — NewProjectPage StepTemplate (commit `875ff89c`)
- New `apps/web/src/features/project/wizard/StepTemplate.tsx` — Step
  0 with "Start blank" vs. "Ecosystem Farm" cards; calls
  `api.templates.list()` and filters `public && slug`.
- `apps/web/src/pages/NewProjectPage.tsx` rewritten to read
  `useSearch({ strict: false })`, extend `WizardData` with
  `templateSlug`/`drawFirst`/`fullSetup`, and conditionally prepend
  StepTemplate when no `prefillTemplate` URL param is present.
- `apps/web/src/features/project/wizard/StepNotes.tsx`
  `handleCreate` branches: `data.templateSlug` set → call
  `api.templates.instantiatePublic(slug, { name, parcelBoundaryGeojson })`;
  unset → vanilla path unchanged.
  `metadata.instantiatedFromTemplate` stamped on local Zustand copy
  and server payload.

### P4-4d — ContactCTA href rewire (commit `ccdbd224`)
- Each tier's PRIMARY action now deep-links to
  `/register?next=instantiate&template=ecosystem-farm[&drawFirst=true|&fullSetup=true]`.
- Calendly / contact-form remain as SECONDARY action.
- Header comment rewritten to keep the covenant ratchet green
  without inline forbidden vocab.

## Verification

- **tsc.** `pnpm --filter @ogden/web tsc --noEmit` returns only the
  6 pre-existing baseline errors (`StepBoundary.tsx`,
  `ObserveAnnotationLayers.tsx` ×2, `vegetationResolver.ts`, two
  `__tests__` files). No new errors from any P4 file. Required
  `$env:NODE_OPTIONS="--max-old-space-size=8192"` to avoid Node
  heap OOM on the default 3.8 GB ceiling.
- **vitest.** Full suite green after the covenant header-comment
  fix (1855 passed / 4 skipped; the 4 skips are Apricot Lane
  attribution tests gated on `dist/` existing). Pre-fix one
  failure in `covenant.test.ts` flagged the literal word
  "investor" in the ContactCTA header comment; resolved by
  rephrasing the covenant note to point at the wiki decisions
  index rather than name forbidden vocab inline.
- **Covenant grep.** Manual + automated ratchet zero across
  `apps/web/src/showcase/**` and the 4 prerendered HTMLs.
- **Branch hygiene.** `git fetch && git status -sb` after every
  commit: 2 → 3 → 4 → 5 → 6 ahead, 0 behind throughout.

## Files Touched This Session (P4-4)

- `apps/web/src/dev/seedThreeStreamsFarm.ts` (P4-4a)
- `apps/web/src/lib/apiClient.ts` (P4-4b)
- `apps/web/src/routes/index.tsx` (P4-4b)
- `apps/web/src/pages/RegisterPage.tsx` (P4-4b, NEW)
- `apps/web/src/features/project/wizard/StepTemplate.tsx` (P4-4c, NEW)
- `apps/web/src/pages/NewProjectPage.tsx` (P4-4c)
- `apps/web/src/features/project/wizard/StepNotes.tsx` (P4-4c)
- `apps/web/src/showcase/components/ContactCTA.tsx` (P4-4d)

## Followups Filed

- Org-creation prelude for Stewarding `fullSetup=true` — currently
  routes through the same wizard with the prefill flag; a
  dedicated org-creation surface is Phase 4.5.
- Region-aware fallback for non-Ontario boundaries — warning
  banner only in v1; full Holmgren-grounded generic palette is
  Phase 4.5.
- Multi-template gallery — `StepTemplate` already enumerates
  `public && slug`; only one public template currently ships.
- User-owned public templates — gated by `public=true` convention.

## Pending Out-of-Scope (per program plan)

- Cold-visitor live E2E across all 3 tiers — requires running
  Postgres + Redis + api + web preview; not run this session.
  Substrate-level verification covered via tsc + vitest + covenant
  ratchet.
- Push to `origin/feat/atlas-permaculture` — awaiting explicit
  user approval per `feedback_commit_immediately_on_rebased_branches`
  + `project_branch_rebase` protocols.

## Session Debrief

**Completed.** Phase 4 fully landed: 4 prongs across server schema,
migrations, public route + deep replay, and 4 client UX sub-prongs.
Covenant + tsc + vitest all green at baseline. Wiki absorption
complete (entity edits + new entity + ADR + log + index updates).

**Deferred.** Cold-visitor live E2E (env-dependent); Phase 4.5
followups (org prelude, region-aware fallback, gallery); final
`git push` (awaits explicit user approval).

**Recommended Next Session.** Push gate + live E2E walkthrough
against `/showcase/three-streams/dreaming` → `/register` →
`/v3/project/<id>` once the local stack is bootable. Alternatively,
open Phase 4.5 brainstorm for the org-creation prelude.
