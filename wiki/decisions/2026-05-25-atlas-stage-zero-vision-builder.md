# 2026-05-25 — Stage Zero Vision Builder (name-only intake → questionnaire → Vision Profile)

**Status.** Accepted. Shipped in four phases over one session.

**Branch.** `feat/atlas-permaculture`.

## Context

Project creation used a five-step property wizard (template → name →
location → boundary → notes) that conflated three concerns: *who/where*
(intake), *what land* (boundary), and *what for* (vision). The
`OLOS Stage Zero Vision Builder.md` spec reframes the entrance to the
app as a structured **questionnaire** that produces a machine-readable
"Vision Profile" — a declaration of intent (project archetype, primary
outcomes, systems in scope, residential intent, time/effort, capital
posture, etc.) that downstream stages can read to configure themselves.

A polished dark/gold mockup was provided: top stage spine
(STAGE ZERO VISION BUILDER → OBSERVE → PLAN → ACT), "Question N of M" +
progress bar, a large question heading, a grid of selectable option
cards, an "Allow multiple selections" toggle, collapsible upcoming
questions, a right-side live "Vision Profile Summary" sidebar, and a
bottom "What this will activate in the Plan Stage" strip.

This is distinct from but complementary to the 2026-05-24 True North /
Fit Gate ([[decisions/2026-05-24-atlas-true-north-fit-gate-stage-0]]):
that gate screens *property fit* before Observe; the Vision Builder
captures *design intent* at project birth. They share the "Stage Zero"
framing but own different artifacts (fit decision vs. Vision Profile).

## Decisions (steward-confirmed)

### 1. Boundary / map → OBSERVE (Vision Builder is a pure questionnaire)

Project creation now captures **only a name**. The parcel boundary and
all site context move out of intake: the boundary is drawn or imported
in OBSERVE, and the vision is gathered in the questionnaire. Rejected:
keeping a "draw boundary" step in the intake flow — it forced a
land-first mental model before the steward had even declared what they
wanted the land *for*.

### 2. Module activation → preview-only (MVP)

The bottom activation strip shows *what the profile would turn on* in
the Plan stage, but does **not** yet gate which Plan/Act modules render.
Real gating is deferred. Rationale: ship the questionnaire + live
profile + persisted intent first; wiring the profile into actual module
visibility is a larger, separately-verifiable change and risks
destabilising the already-shipped Plan v3 module set
([[2026-05-07-atlas-plan-modules-scholar-iteration]]).

### 3. Full question set (with conditionals)

All ~15 steps from the spec, including conditional sections: livestock
questions appear only when an animal system is in scope
(`hasLivestockInScope`); residential-form questions only when the
steward intends to live on the land (`willLiveOnLand`). Rejected: a
trimmed MVP subset — the conditional branches are the spec's substance,
and the engine had to support `visibleWhen` regardless.

## Architecture

### Vision Profile persistence

The profile lives on `project.metadata.visionProfile` (the
`ProjectMetadata` zod schema is `.passthrough()`, so no schema migration
was required to carry it). Local-first: persisted in the `projectStore`
under localStorage key **`ogden-projects`** (not `ogden-project-store`).

### Questionnaire engine (config-driven)

- `apps/web/src/v3/stage-zero/data/visionBuilderQuestions.ts` — the
  question catalog. Each entry carries `eyebrow`, `title`, a `kind`
  (`single` | `multi`), a `profilePath` (dotted path into the Vision
  Profile the answer writes to), and an optional `visibleWhen` predicate
  for conditionals.
- `apps/web/src/v3/stage-zero/useVisionBuilder.ts` — the hook owning
  cursor + answers, deriving the visible-question list (so conditionals
  expand/collapse the total live) and progress.
- `apps/web/src/v3/stage-zero/lib/deriveActivatedModules.ts` — pure
  mapping from a Vision Profile to the set of modules the activation
  strip previews.

### UI (self-contained dark theme)

`StageZeroVisionPage.tsx` + `.module.css` use a self-contained
`--vb-*` dark/gold palette so the page matches the mockup regardless of
the app's light/dark theme. The page is a full-screen takeover
(`.page { position: fixed; inset: 0; z-index: 600 }`) so it sits above
the AppShell header/sync banner (z 501) and shows only its own stage
spine. Components: `VisionStageHeader`, `VisionQuestionCard`,
`VisionUpcomingQuestions`, `VisionProfileSidebar`,
`VisionActivationStrip`.

### Flow integration

- `NewProjectPage.tsx` rewritten to a name-only form that creates the
  project locally (always, so the flow works offline/unauth) and —
  when signed in — mirrors it to the server, honouring `?prefillTemplate`
  (public template instantiation), `?orgId`, and `?fullSetup` (org
  picker modal). It then routes to
  `/v3/project/$projectId/stage-zero`.
- The legacy `features/project/wizard/Step*` components are **preserved
  on disk** (no deletion — they may be reused in later stages). The
  `WizardData` interface they depend on, which used to live in
  `NewProjectPage`, was relocated into the wizard's own
  `features/project/wizard/types.ts` so the wizard compiles standalone.
- OBSERVE `MapToolbar.tsx` gained a KML/KMZ/GeoJSON **import** button
  (`parseGeoFile` → `onBoundaryImported` → `updateProject` persists the
  FeatureCollection + `parcelAcreage`), the OBSERVE-side home of the
  boundary capture removed from intake.

## Typecheck repair (`520a9f9b`)

The Phase-4 page rewrite introduced two type regressions caught by
`apps/web` typecheck:

1. The legacy wizard's `types.ts` imported `WizardData` from the
   rewritten `NewProjectPage`, which no longer exported it. Fixed by
   relocating the interface into the wizard package (decision above).
2. `createProject` / `api.projects.create` were called without
   `country`/`units`. `CreateProjectInput` derives these from
   `z.infer`, which treats `.default()` fields as **required** in the
   output type. Fixed by seeding the schema's `US`/`metric` defaults at
   create time — location is captured later in OBSERVE, and these are
   editable in project settings.

## Files

| File | Change |
|---|---|
| `apps/web/src/v3/stage-zero/data/visionBuilderQuestions.ts` (NEW) | Question catalog (single/multi, profilePath, visibleWhen). |
| `apps/web/src/v3/stage-zero/useVisionBuilder.ts` (NEW) | Cursor + answers + derived visible-list/progress. |
| `apps/web/src/v3/stage-zero/lib/deriveActivatedModules.ts` (NEW) | Vision Profile → activated-module preview. |
| `apps/web/src/v3/stage-zero/StageZeroVisionPage.tsx` + `.module.css` (NEW) | Full-screen dark/gold builder shell. |
| `apps/web/src/v3/stage-zero/components/{VisionStageHeader,VisionQuestionCard,VisionUpcomingQuestions,VisionProfileSidebar,VisionActivationStrip}.tsx` + `.module.css` (NEW) | Mockup-parity UI pieces. |
| `apps/web/src/v3/stage-zero/__tests__/visionBuilder.test.ts` (NEW) | Engine/profile unit tests. |
| `apps/web/src/routes/index.tsx` | `v3StageZeroRoute` (path `stage-zero`, parent `v3ProjectLayoutRoute`). |
| `apps/web/src/pages/NewProjectPage.tsx` | Rewritten to name-only intake → stage-zero (preserves prefillTemplate/orgId/fullSetup). |
| `apps/web/src/v3/observe/components/MapToolbar.tsx` | KML/KMZ/GeoJSON boundary import button + handler. |
| `apps/web/src/v3/observe/ObserveLayout.tsx` | Wires `onBoundaryImported` → `updateProject` (FC + acreage). |
| `apps/web/src/features/project/wizard/types.ts` | `WizardData` relocated here from the rewritten page. |

## Verification

- **Phase 3 browser pass:** selecting "Regenerative Farm" populated the
  live sidebar + activation strip; selecting "Goats" grew the total
  28→32 (conditional livestock questions revealed) and added "Livestock
  & Subdivision" to the activation strip; localStorage `ogden-projects`
  persisted the `visionProfile`; reload resumed the cursor with
  rehydrated state. Screenshot confirmed mockup parity.
- **Phase 4 end-to-end:** create "Test Vision Project" → routed to its
  stage-zero (Question 1 of 28); OBSERVE import button/input render with
  the correct `accept`; import persists the FeatureCollection + acreage
  (792.13 ha) on a **non-builtin** project. (Builtin `mtc` carves out
  everything except `parcelBoundaryGeojson`/`hasParcelBoundary`/
  `metadata` in `updateProject` by design, so acreage does not persist
  there — not a bug.)
- `apps/web` `npm run typecheck` exit 0 (must use the 8 GB-heap node
  `tsc` script; plain `tsc` OOMs).

## Out of scope (by design)

- **Real module gating** from the Vision Profile (MVP is preview-only).
- **Server-side Vision Profile schema** — rides `metadata` jsonb
  passthrough; no dedicated column/migration.
- **Editing the profile after Stage Zero** — re-entry/edit UX deferred.
- **Removing the legacy wizard** — preserved on disk for later reuse.

## Commits

- `2d200759` — Phase 1 (schema + persistence) + Phase 2 (engine + config).
- `50bead8b` — Phase 3 (UI mockup parity, 13 files).
- `e256fd22` — Phase 4 (name-only intake → stage-zero + OBSERVE import).
- `520a9f9b` — typecheck repair (WizardData relocation + country/units defaults).
