# ADR: Legacy bare `projectType` treated as selected primary in the wizard + persist record backfill

**Date:** 2026-06-02
**Status:** accepted
**Branch:** `feat/atlas-permaculture` (explicit-path commit `eb84fafb`, 4 files +278/-23; **not pushed**)

## Context

OLOS carries two layers of project-type truth: the durable structured
`metadata.projectTypeRecord` (written by the wizard / `setPrimaryType` /
`addSecondaryType`) and the legacy bare `projectType` string on the project row
(e.g. `homestead`, `regenerative_farm`). The resolution engine
[[decisions/2026-05-29-atlas-per-type-objective-model]]
(`useProjectObjectives`) already tolerates a record-less project via its Level-2
string fallback, so the **Plan spine** renders correct objectives for a
legacy/seeded project.

But **`WizardStep2Vision`** derived its selected primary ONLY from
`metadata.projectTypeRecord.primaryTypeId`. For a project carrying a valid bare
`projectType` but NO record, this meant: (1) the primary-type grid rendered with
nothing selected; (2) the "Secondary layers (optional)" picker was hidden
(gated on `{primaryTypeId && …}`); (3) `handleToggleSecondary` early-returned on
`!existing`. Net: a steward on a legacy bare-string project could not add a
secondary layer (Orchard/Food-Forest, Silvopasture, …) until they manually
re-picked the primary — the one action that finally wrote a record. The "351
House" homestead sample and any project created before the wizard wrote records
were affected.

## Decision

One shared pure helper, two call sites, and a persist backfill:

- **`recordFromBareProjectType(projectType)`** (new export in `projectStore.ts`):
  normalizes via `normalizeProjectType`
  ([[decisions/2026-05-29-atlas-projecttype-normalization-422-fix]]), looks up
  `findProjectType`, requires `canBePrimary`, and materializes the SAME record
  `setPrimaryType` writes (empty secondary / tension-ack / version / reopening
  arrays, **no `versionHistory` entry** — the taxonomy has no `primary-set`
  action). Returns `null` for empty / unknown / secondary-only (`residential`)
  strings, so callers leave the project untouched (it keeps falling through to
  the static skeleton).
- **Wizard**: derives an *effective* primary from the bare string when no record
  exists (`typeRecord?.primaryTypeId ?? derivedRecord?.primaryTypeId ?? null`),
  driving grid selection, the secondary-picker gate, `nextDisabled`, hint, and
  active tensions off it. `handleSelectPrimary` / `handleToggleSecondary` /
  `handleAcknowledgeTensions` base on `existing ?? derivedRecord`, so the record
  is **lazily materialized on the first steward action** — no write-on-mount
  side effect (chosen over the alternative of materializing on mount, to avoid
  marking an untouched project dirty just by viewing Step 2).
- **persist `migrate` v7 → v8**: backfills a `projectTypeRecord` for any project
  (builtins included, per operator call) holding a valid bare `projectType` but
  no record, so resolution becomes uniformly `source:'record'`. Idempotent
  (projects already holding a record, or whose string is empty / unknown /
  secondary-only, pass through). `version` bumped `7 → 8`.

The wizard fix and the migrate are complementary: migrate cleans up persisted
projects on next load; the wizard's derive path covers in-memory / builtin
projects seeded post-hydrate that never pass through `migrate`.

## Consequences

- A legacy bare-string project now opens Step 2 with its type preselected, the
  secondary picker visible, and secondaries toggleable without a forced re-pick.
- After one reload, every such project resolves via `source:'record'` — the
  string-level Level-2 fallback becomes a safety net rather than the live path.
- `recordFromBareProjectType` is the single source of truth for the bare → record
  materialization, shared by the wizard and the migrate (no logic drift).
- `setPrimaryType` is unchanged and still owns the "set a first primary when none
  exists" path; this work only adds the bare-string-derived equivalent for
  display + lazy write, and the bulk backfill.

## Verification

- `recordFromBareProjectType` unit coverage (bare primary → record; kebab
  archetype normalized; `residential` / unknown / null → null).
- Migrate backfill matrix (bare / archetype / already-has-record /
  `residential` / unknown / null) + array-order/`activeProjectId` preservation +
  idempotency (re-run at v8 is a no-op) + `version === 8` assertion.
- Legacy-bare-string → can-add-secondary path: `addSecondaryType` refused on a
  record-less project, then succeeded once the materialized record was written
  (`orchard_food_forest` compatible with `homestead`).
- **20 new tests pass; 45 sibling `projectStore` / `projectBundle` tests still
  green** (version bump regression check); two independent `tsc --noEmit` runs
  exit 0. All under bounded `pool:'forks'` ([[feedback-vitest-bounded-runs]]).
- Verified via the test suite + typecheck, **not** the browser preview
  (a live wizard check needs a legacy bare-string project loaded and the
  map/preview path is currently flaky against the dead API,
  [[project-screenshot-hang]]) — disclosed, not claimed.

Foreign working-tree WIP untouched ([[feedback-no-deletion]]); committed as its
own fetch+divergence-checked slice
([[feedback-commit-immediately-on-rebased-branches]]); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy. Builds on
[[decisions/2026-05-29-atlas-per-type-objective-model]] and the section-9
secondary-add flow [[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]].
Log: [[log/2026-06-02-atlas-legacy-bare-projecttype-wizard-fix]].
