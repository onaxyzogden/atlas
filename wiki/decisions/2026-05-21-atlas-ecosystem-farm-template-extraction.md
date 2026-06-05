# Ecosystem Farm Template Extraction (Phase 4)

**Date:** 2026-05-21
**Project:** OLOS / atlas
**Branch:** `feat/atlas-permaculture`
**Status:** ratified (4-prong implementation landed)

## Context

The Apricot-Lane-inspired showcase program ratified at
[[log/2026-05-20-atlas-apricot-lane-showcase-program]] defined three
layered artifacts: (A) curated demo project — landed in Phase 2; (B)
public scrollytelling portal — landed in Phase 3 + Phase 3.5; (C)
reusable Ecosystem Farm template. Phase 4 is Artifact C.

The Phase 3 ContactCTA shipped with Calendly/contact-form per-tier as
a placeholder terminus, explicitly marked as "Phase 4 will swap to
template-instantiation deep links." Phase 4 closes that loop.

P2 template machinery (`POST /templates`, `GET /templates`,
`POST /templates/:id/instantiate`) already shipped, but: (1) the
existing `TemplateSnapshot` was shallow (only scalars + boundary —
no design features, no monitoring trajectory, no project
relationships); (2) the `project_templates` table had no `slug` or
`public` columns; (3) the instantiate route was owner-gated, so a
cold visitor could not instantiate a system-owned template even
after registering.

## Decision

Ship Phase 4 in 4 prongs, plus 3 binding decisions about UX shape.

### Locked decisions (verbatim, binding)

1. **NEW `/register` sibling route** — not a `/login` tab overload.
   The existing `LoginPage` tab toggle into Create-Account stays
   unchanged for visitors arriving at `/login` directly. The new
   `/register` route owns the showcase ContactCTA deep-link handoff.
2. **`ecologyStore` succession seeding ADDED** — project-level
   `'mid'` succession stage applied to any Y2 instantiated
   ecosystem-farm project. The pre-Phase-4 seeder did not touch
   ecologyStore; this drift is closed.
3. **Both UX paths supported, routed by tier param** — Dreaming →
   no flag = instant-instantiate empty boundary; Transitioning →
   `drawFirst=true` = parcel drawn first then instantiate;
   Stewarding → `fullSetup=true` = org-creation step before
   instantiate (currently routes through the same wizard with the
   prefill; full org-creation surface is a Phase 4.5 followup).

### 4-prong implementation

**Prong 1 — Schema + migrations**
- `apps/api/src/db/migrations/034_template_slug_and_public.sql` —
  adds `slug` (text) + `public` (boolean DEFAULT false) columns;
  unique index on slug where slug IS NOT NULL; index on public where
  public = true.
- Extended `TemplateSnapshot` Zod schema with optional
  `designFeatures[]` (centroid-normalized relative geometry),
  `regenerationEvents[]` (relativeDate offsets), and
  `projectRelationships[]` (name-keyed edges).
- Drizzle schema regenerated to reflect new columns.

**Prong 2 — Bootstrap snapshot + migration 035**
- `scripts/snapshot-ecosystem-farm-template.ts` reads from the live
  Three Streams substrate (sentinel
  `00000000-0000-0000-0000-000000357320`), centroid-normalizes
  design features via PostGIS `ST_Translate(geom, -cx, -cy)`,
  emits relative dates from Y0, and produces the deep JSONB.
- `apps/api/src/db/migrations/035_ecosystem_farm_template.sql`
  idempotently inserts one row: `id =
  '00000000-0000-0000-0000-0000ec05fa12'`, `owner_id =
  SYSTEM_USER_ID`, `slug = 'ecosystem-farm'`, `public = true`,
  full deep snapshot.

**Prong 3 — Public instantiate route + deep replay**
- `POST /api/v1/templates/public/:slug/instantiate` —
  `preHandler: [authenticate, p2]`. 404 on missing/non-public slug;
  401 unauthenticated. Owner check is the only relaxation vs. the
  existing per-id instantiate.
- Both instantiate handlers extended with deep-replay logic:
  `design_features` insert with `ST_Translate(rel, vcx, vcy)`;
  `regeneration_events` insert with relative-date offset;
  `project_relationships` insert with name→id map resolution.
- `project_layers` and `site_assessments` are NOT replayed; the
  existing `enqueueTier1Fetch(projectId)` already populates them
  from live adapters against the visitor's actual boundary.

**Prong 4 — Client UX (4 sub-prongs)**
- *4a — Seeder generalization* — `seedThreeStreamsFarm.ts` now
  exports `seedFromEcosystemFarmTemplate(projectId)` + auto-fires on
  any project whose `metadata.instantiatedFromTemplate ===
  'ecosystem-farm'`. Idempotency key changed to
  `ecosystem-farm-seeded@v1:<projectId>`. Adds project-level
  ecologyStore `'mid'` succession.
- *4b — `/register` route + RegisterPage* — Public sibling of
  `appShellRoute`. Search params: `next`, `template`, `drawFirst`,
  `fullSetup`. Three handoff branches per locked decision #3.
  `api.templates.instantiatePublic` wrapper added to apiClient.
- *4c — NewProjectPage StepTemplate* — Optional Step 0 offering
  "Start blank" vs. "Ecosystem Farm". Auto-skipped on
  `?prefillTemplate=` URL param. `StepNotes.handleCreate` branches
  on `data.templateSlug` to call `api.templates.instantiatePublic`
  when a slug is selected. `metadata.instantiatedFromTemplate`
  stamped on both local Zustand copy and server payload.
- *4d — ContactCTA href rewire* — Each tier's PRIMARY action now
  deep-links to `/register?next=instantiate&template=ecosystem-farm`
  with tier-specific flags. Calendly / contact-form preserved as
  SECONDARY action.

## Alternatives Considered

**Override `/login` tab toggle with a `next=instantiate` query
param.** Rejected — overloads a UI component whose existing
contract is `?redirect=`-only; introduces a third axis to the
LoginPage state machine; muddies the showcase analytics signal.
A dedicated `/register` route is a cheaper, cleaner public-sibling
add.

**Shallow snapshot + client-side full re-seed.** Rejected —
inverting the substrate from server to client makes the
instantiated project depend on browser-side seeding completing
successfully, which adds a race window between project creation and
substrate availability. Deep server replay puts the substrate in
Postgres before the user even sees the project page.

**Region-aware fallback for non-Ontario boundaries shipping in
v1.** Rejected — would require a parallel Holmgren-grounded
generic palette that doesn't yet exist; the program plan
explicitly defers this to Phase 4.5. v1 ships with a warning
banner on out-of-Halton instantiations.

**Replay `project_layers` and `site_assessments` from snapshot.**
Rejected — layers are parcel-specific (Halton-specific adapter
data on a non-Halton parcel would be wrong); assessments depend on
layers. The existing `enqueueTier1Fetch` already handles both
correctly from live adapters.

## Consequences

**Covenant.** Showcase covenant ratchet stays green (the
`apps/web/src/showcase/__tests__/covenant.test.ts` regex returns
zero hits across `apps/web/src/showcase/**` and the 4 prerendered
HTMLs). No CSRA / salam / advance-purchase / yield-share /
investor / ROI vocab introduced anywhere. Apricot Lane
attribution remains verbatim in `AttributionFooter` and is
echoed in `StepTemplate` card copy ("inspired by farms like
Apricot Lane Farms").

**Cold-visitor flow now closes.** A visitor arrives on
`/showcase/three-streams/dreaming`, clicks "Create your project",
lands on `/register?next=instantiate&template=ecosystem-farm`,
completes registration, auto-instantiates, and lands on a
`/v3/project/<id>` populated with 4 canon phases + ~60 work items
+ 6 nursery batches + ecologyStore succession + ≥22 design
features deep-replayed against an empty boundary (visitor draws
later). Transitioning and Stewarding paths thread through the
`drawFirst` / `fullSetup` query params and reach the same
end-state with a boundary already in place.

**Push gate.** Per the standing `feat/atlas-permaculture`
protocol, Phase 4 commits land per-prong with `Co-Authored-By:
Claude Opus 4.7` and a fetch + divergence check after each; the
final push awaits explicit user approval.

## Verification

- `pnpm tsc --noEmit` on apps/web — baseline 6 pre-existing
  errors only; no new errors from any P4 file.
- `pnpm vitest run` — 1855 passed / 4 skipped (1 pre-fix
  covenant failure resolved before commit; rebooted suite is
  green).
- `apps/web/src/showcase/__tests__/covenant.test.ts` — 2 passed,
  4 skipped (Apricot Lane attribution tests require a
  `pnpm build` to run; gated by `describe.skipIf`).
- Per-prong commits land with fetch + divergence after each:
  `9cd48a64` (P4-4a), `5c634767` (P4-4b), `875ff89c` (P4-4c),
  `ccdbd224` (P4-4d). Branch is 6 ahead / 0 behind origin at
  ADR-write time.

## Sources

- Inline plan body at
  `~/.claude/plans/let-s-work-together-to-flickering-thacker.md`
  (Phase 4 section) — the full design + 4-prong execution plan
  this ADR ratifies.
- [[entities/three-streams-farm]] — canon this template is
  extracted from.
- [[entities/showcase-portal]] — surface that deep-links into
  this template.
- [[entities/ecosystem-farm-template]] — entity page for the
  template artifact itself.
- [[decisions/2026-05-09-atlas-csra-erasure]] — covenant boundary
  governing all showcase + template copy.
- [[decisions/2026-05-21-three-streams-showcase-design]] — Phase
  3 design ADR; Phase 4 is its conversion-engine successor.
