# 2026-06-02 — Legacy bare projectType treated as selected primary in the wizard + persist record backfill

**Branch.** `feat/atlas-permaculture` (explicit-path commit `eb84fafb`, 4 files
+278/-23; **not pushed**).

**Problem.** `WizardStep2Vision` read the selected primary ONLY from
`metadata.projectTypeRecord.primaryTypeId`. A legacy/seeded project with a valid
bare `projectType` string (e.g. `homestead`, `regenerative_farm`) but no record
therefore rendered the primary grid with nothing selected, hid the
"Secondary layers (optional)" picker (gated on `{primaryTypeId && …}`), and
`handleToggleSecondary` early-returned on `!existing` — so the steward could not
add a secondary layer (Orchard/Food-Forest, Silvopasture, …) without first
re-picking the primary, the action that finally wrote a record. The resolution
engine's Level-2 string fallback already kept the Plan spine correct; only the
wizard read the record directly.

**Fix (one helper, two call sites, one migrate).**
- `recordFromBareProjectType(projectType)` — new pure export in `projectStore.ts`:
  `normalizeProjectType` → `findProjectType` → require `canBePrimary` →
  materialize the same record `setPrimaryType` writes (empty arrays, no
  `versionHistory`). `null` for empty/unknown/`residential`.
- Wizard derives an effective primary from the bare string when no record exists
  and lazily materializes the record on first select/toggle/acknowledge
  (`existing ?? derivedRecord`) — no write-on-mount.
- persist `migrate` v7 → v8 backfills a record for any project (builtins
  included, per operator call) with a valid bare type but no record; idempotent.
  `version` 7 → 8.

**Verified.** 20 new tests (helper unit, migrate matrix + idempotency + version,
legacy-bare-string → can-add-secondary via `addSecondaryType`); 45 sibling
`projectStore`/`projectBundle` tests still green; two `tsc --noEmit` runs exit 0;
all under bounded `pool:'forks'` ([[feedback-vitest-bounded-runs]]). Not
browser-verified — disclosed ([[project-screenshot-hang]]).

Files: `apps/web/src/store/projectStore.ts`,
`apps/web/src/v3/project-wizard/WizardStep2Vision.tsx`,
`apps/web/src/store/__tests__/projectStore.migrate.test.ts`,
`apps/web/src/store/__tests__/projectStore.setPrimaryType.test.ts`.

Foreign WIP untouched ([[feedback-no-deletion]]); own fetch+divergence-checked
slice ([[feedback-commit-immediately-on-rebased-branches]]); not pushed
([[project-branch-rebase]]); CSRA untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only. ADR:
[[decisions/2026-06-02-atlas-legacy-bare-projecttype-record-backfill]]; builds on
[[decisions/2026-05-29-atlas-per-type-objective-model]] +
[[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]].
