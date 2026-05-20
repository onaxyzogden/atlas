# 2026-04-22 — Feature Sections §§1-30 scaffolding pass complete


Eight-commit pass on `feat/shared-scoring` standing up the 30-section
feature manifest as the single source of truth for Atlas's in-scope
surface. Each section now has a mountable route stub, feature folder
with CONTEXT.md, Zod placeholder, and manifest entry carrying the full
feature list with phase tags and status.

**Framework (Batch 0, `87d1a56`):**
- `packages/shared/src/featureManifest.ts` — manifest + subpath export
  `@ogden/shared/manifest`.
- `apps/api/src/plugins/featureGate.ts` — `fastify.requirePhase(tag)`
  decorator gated by `ATLAS_PHASE_MAX` (P1 default), `ATLAS_MOONTRANCE`,
  `ATLAS_FUTURE`. Closed routes 404, not 403 (invisible rather than
  forbidden).
- `apps/api/scripts/scaffold-section.ts` — idempotent generator.
- `apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl` — template.
- §1 gap closure: migrations 012 (project metadata jsonb) + 013
  (project_templates), candidate-compare page, FUTURE phase tag
  added to `PhaseTag` union + `PHASE_ORDER` + generator validators.

**Scaffolded commits (§§2-29, batch-by-batch merge pass):**
- `522b6c9` Batch 1 — §§2, 3, 4, 26
- `e7f657d` Batch 2 — §§5, 6, 7, 13
- `ec8f622` scaffold-section.ts marker tolerance fix (mid-pass)
- `86f6156` Batch 3 — §§8, 9, 10, 12
- `08bc0cd` Batch 4 — §§11, 14, 15, 16
- `c71caa5` Batch 5 — §§17, 18, 21, 22
- `e7a764c` Batch 6 — §§19, 20, 23, 25
- `c02f75e` Batch 7 — §§24, 27, 28, 29 (FUTURE + MT rollup)

**Execution model.** Hybrid: parallel 4-agent batches using
`isolation: "worktree"`; main session performs sequential merge pass
on cross-cutting files (`featureManifest.ts`, `app.ts`). Agents
produce stubs only. Per-section agent brief lives in the plan file.

**Slug conventions locked:**
- §1 manifest slug `project-intake` is logical; actual §1 surface
  remains at legacy `apps/web/src/features/project/` +
  `apps/api/src/routes/projects/`. No stub folder under
  `project-intake`.
- §27 `public-portal` route import aliased to
  `publicPortalSectionRoutes` in `app.ts` to avoid symbol collision
  with the legacy `publicPortalRoutes` from
  `./routes/portal/public.js` (different surface at `/api/v1/portal`).

**Verification (all green, 2026-04-22):**
- 29 manifest sections; 28 scaffolded slug folders present
  (§1 legacy by design).
- `@ogden/shared` lint ✓, `apps/api` tsc ✓, `apps/web` tsc ✓.
- `apps/api/scripts/verify-scoring-parity.ts` passes — no scoring
  drift introduced.

**Wiki updates:**
- New concept page: [[feature-manifest]].
- New ADR: `wiki/decisions/2026-04-22-feature-manifest-scaffolding-pass.md`.
- Entity pages updated: [[api]] (scaffolded routes row), [[web-app]]
  (`features/<slug>/` row + `_templates/`).

**Deferred (explicit):**
- Real UI, map interactions, business logic for §§2-29 — consumer
  sessions pick up from manifest + CONTEXT.md.
- §28 FUTURE items beyond manifest presence.
- jsonb `metadata` promotion to dedicated columns (revisit after
  three sections ship).
