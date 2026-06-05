# 2026-05-31 — Portfolio Home P5: cross-project relationships (full-stack)

**Backfilled 2026-05-31 from commit history** (commits `d1c9a7ff` backend + `e52c1b27` frontend) — code-committed in a prior session but never logged at the time; reconstructed from the commit bodies + `--stat` for epic-record completeness.

**Branch.** `feat/atlas-permaculture` (`d1c9a7ff` 5 files +311, then `e52c1b27` 8 files +807/−10; not pushed). Phase 5 of the OLOS Portfolio Home epic — Spec §5 relationships connecting two of a steward's projects. **Display/awareness metadata only — zero effect on Plan/Act/Observe logic** (§5.1, §9.4). Builds on P4 ([[log/2026-05-31-portfolio-home-p4-climate-context]]).

**Naming-collision guard.** Cross-project relationships are kept entirely distinct from the pre-existing **within-project** Needs & Yields resource-flow graph (route `/:id/relationships`, table `project_relationships` / migration 016, `@ogden/shared/relationships` EdgeSchema, `relationshipStore`). New names throughout: table `cross_project_relationships`, route `/:id/cross-project-relationships`, schema `crossRelationship.schema.ts`, apiClient `crossRelationships`, store `crossRelationshipStore`. The within-project code was not touched (no-deletion rule).

**Backend (`d1c9a7ff`).**
- Migration **`049_cross_project_relationships`** — five-type CHECK enum (`shared_watershed`, `adjacent_boundary`, `habitat_corridor`, `same_management_unit`, `shared_infrastructure`), canonical ordering (`project_a_id < project_b_id`) for symmetric dedupe, `UNIQUE (a, b, type)`, FK cascade.
- Shared **`crossRelationship.schema.ts`** + barrel export.
- Routes **`cross-project-relationships`** — GET (symmetric list with the other-project name), POST (owner of both projects, canonical-order normalise, 409 on dup), DELETE (owner, row must involve `:id`).

**Frontend (`e52c1b27`).**
- `apiClient.crossRelationships` `{list, create, delete}` namespace.
- **`crossRelationshipStore`** — API-synced (not persisted), `byProject`-keyed, symmetric re-fetch of both projects on create/delete.
- **`PortfolioMap`** — `portfolio-relationships` LineString source between project centroids; solid (`adjacent_boundary`, `same_management_unit`) + dashed (`shared_watershed`, `habitat_corridor`, `shared_infrastructure`) layers with data-driven per-type colour; off-by-default **Connections** toggle (disabled with the §7 "Add relationships to see connections" hint when none exist); two-pin creation flow (tap A → tap B → type+notes picker); line-click tooltip (type + notes).
- **`PortfolioMapPage`** — fetch-on-selection, wires the create handler.
- **`PortfolioAtAGlanceRail`** — replaced the P2 relationships stub with a relationships list (type label, other-project name, notes, colour dot); owner-only remove.
- **`tokens.css`** — `--rel-*` line colours for DOM parity (mirror the map's `REL_COLORS`; MapLibre can't read CSS vars, so the hexes are coupled).

**Verified.** web `tsc` clean; shared tests green. (End-to-end create/list/delete against the local API was the P5 gate; re-confirmed structurally at P8 — see [[log/2026-05-31-portfolio-home-p8-acceptance]].)

**Discipline.** Append-only commits on the rebased branch ([[project-branch-rebase]]); not pushed. Native Postgres on localhost:5432 for the migration ([[project-two-postgres-5432]]). CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Continues [[log/2026-05-31-portfolio-home-p4-climate-context]]; ADR [[decisions/2026-05-31-atlas-portfolio-home-p7]]; entities [[entities/web-app]] + [[entities/api]].
