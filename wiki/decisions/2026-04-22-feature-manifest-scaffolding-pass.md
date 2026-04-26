# ADR: Feature Sections §§1-30 Scaffolding Pass

**Date:** 2026-04-22
**Status:** accepted

## Context

Prior to this pass, Atlas's in-scope feature surface was scattered across
ad-hoc route folders, sprint notes, and the ATLAS_DEEP_AUDIT series. New
sessions had no single source of truth for *what sections exist*, *which
phase they belong to*, or *whether a landing surface is already mounted*.
The full 29-section spec (`OLOS Full Feature List.md`) was captured but
not operationalized in code.

The goal: stand up a durable manifest and a scaffolded stub for every
section so downstream implementation sessions can land directly on a
mountable surface, without discovery overhead and without drifting from
the approved phase-gating model.

## Decision

Ship a batched scaffolding pass across eight commits on
`feat/shared-scoring`:

**Framework (Batch 0, commit `87d1a56`):**
- Manifest at `packages/shared/src/featureManifest.ts` with subpath
  export `@ogden/shared/manifest`.
- Fastify phase-gate plugin at `apps/api/src/plugins/featureGate.ts`
  decorates `fastify.requirePhase('P1'|...|'MT'|'FUTURE')`. Gating
  driven by env `ATLAS_PHASE_MAX` (default P1), `ATLAS_MOONTRANCE`,
  `ATLAS_FUTURE`.
- Generator `apps/api/scripts/scaffold-section.ts` produces route +
  feature folder + Zod schema + manifest stub idempotently.
- CONTEXT.md template at `apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl`.
- §1 gap closure: migrations 012 (project metadata jsonb) + 013
  (project_templates), candidate-compare page, FUTURE phase tag added
  to `PhaseTag` union + `PHASE_ORDER` + generator validators.

**Scaffolded sections (Batches 1-7, 7 commits):**
- Batch 1 (`522b6c9`) — §§2, 3, 4, 26
- Batch 2 (`e7f657d`) — §§5, 6, 7, 13
- Batch 3 (`86f6156`) — §§8, 9, 10, 12
- Batch 4 (`08bc0cd`) — §§11, 14, 15, 16
- Batch 5 (`c71caa5`) — §§17, 18, 21, 22
- Batch 6 (`e7a764c`) — §§19, 20, 23, 25
- Batch 7 (`c02f75e`) — §§24, 27, 28, 29

**Execution model:** Hybrid. Main session dispatches 4-agent parallel
batches using `isolation: "worktree"`, then performs a sequential merge
pass resolving cross-cutting files (`featureManifest.ts`, `app.ts`).
Agents produce stubs only; no real UI or business logic.

**Slug collision convention:** Section 1 keeps its legacy paths
(`apps/web/src/features/project/`, `apps/api/src/routes/projects/`);
its manifest entry carries `slug: 'project-intake'` for consistency,
but no stub folder exists under that slug. Batch 7's §27 `public-portal`
import is aliased to `publicPortalSectionRoutes` in `app.ts` to avoid
collision with the legacy `publicPortalRoutes` from
`./routes/portal/public.js` (different surface, same symbol name).

## Consequences

- 29 sections now listed in manifest with full feature lists, phase
  tags, and per-item status (`stub` | `planned` | `partial` | `done`).
- Every §§2-29 section has a mountable route at `/api/v1/<slug>` gated
  by its lowest-phase feature item, and a React feature folder with a
  page stub + CONTEXT.md brief.
- `FUTURE` phase tag is live end-to-end (generator, manifest,
  plugin) — §28 is FUTURE-tagged across all 9 items.
- Downstream sessions start from `packages/shared/src/featureManifest.ts`
  and `apps/web/src/features/<slug>/CONTEXT.md`, not from cold code
  exploration.
- Scoring parity (`verify-scoring-parity.ts`) holds; shared lint,
  api tsc, and web tsc all green.
- Sections with pre-existing implementations (§§4, 5, 11, 15, 20, 23)
  get their manifest entries marked `partial` with status reflecting
  actual code state; their stub CONTEXT.md documents the legacy path
  redirect.
- Future scaffolding reuses the per-section agent brief embedded in
  the plan file (`feature-sections-1-30-the-stateless-lollipop.md`);
  the brief is reusable for standalone-session execution too.

## Notes

The pass explicitly defers:
- Real UI, map interactions, business logic for §§2-29.
- Promotion of jsonb `metadata` fields to dedicated columns — revisit
  once three sections have shipped and query patterns stabilize.
- §28 FUTURE items beyond manifest presence (no routes, components, or
  schemas created beyond the stub; just the manifest row).
