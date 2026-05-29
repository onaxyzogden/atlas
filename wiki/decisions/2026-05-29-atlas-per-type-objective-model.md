# ADR: Per-type 3-layer objective model (taxonomy + resolution engine + wizard Step 2)

**Date:** 2026-05-29
**Status:** accepted
**Context:**
The operator attached 18 OLOS specification documents (Wizard Spec v1.1,
Project-Type + Secondary-Layer Spec v1.2, Catalogue Authoring Standards v1.4,
Decision Tree v1.0, Field Actions Center v1.1, and 13 objective catalogues,
~580 objectives total) and asked that **project creation be updated** against
them. This is, in effect, **Phase 2** of the OLOS UX plan whose **Phase 1**
already shipped on `feat/atlas-permaculture` -- the Plan Tier Shell
([[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]): a fixed 7-tier vertical
spine (T0 Project Foundation -> T6 Phasing & Resourcing) where **every project
rendered the same fixed ~16-objective skeleton** (`PLAN_TIER_OBJECTIVES`).

The specs replace that skeleton with a **per-type, 3-layer objective model**:
**19 Universal** objectives present in every project, plus **Primary-type**
objectives, plus **Secondary-type** objectives that are either *additive* (whole
new objectives) or *modifying* (inject checklist items into existing objectives
via **patch records**). Project type moves from an optional Step-1 chip to a
**required Step-2 selection** with an optional compatible-secondary picker and an
advisory design-tension acknowledgement.

The decision here was to **prove the whole pipeline end-to-end on one vertical
slice first** (one primary + one secondary catalogue, wizard -> resolution ->
Plan spine -> persistence), then fan out the remaining 11 catalogues as pure
data. Encoded slice: **Regenerative Farm** (primary) + **Residential / Live-In**
(secondary-only).

**Decision:**

- **Taxonomy as data.** A 13-entry `PROJECT_TYPES` table in `packages/shared`
  (`constants/plan/projectTypes.ts`) carries `{id, label, ordinal, canBePrimary,
  canBeSecondary, description}`; `findProjectType(id)` resolves a definition. The
  Zod `ProjectType` enum holds **14** strings (13 taxonomy + the `moontrance`
  sentinel, retained so existing Moontrance projects validate but never offered
  -- the wizard reads the table, not the enum). Enum body renamed/extended;
  migration 046 backfills retired values server-side
  (`educational_farm -> education`, `multi_enterprise -> regenerative_farm`,
  `retreat_center -> agritourism`) and a follow-on `ogden-projects` persist
  migration (`c1830618`) mirrors the same remap client-side. **This composes
  with, and does not contradict,**
  [[decisions/2026-05-29-atlas-projecttype-normalization-422-fix]]: that fix
  repaired kebab-archetype leakage (`normalizeProjectType` +
  `ARCHETYPE_TO_PROJECT_TYPE`, persist v4 -> v5); this slice changes the enum
  *vocabulary* the normalizer targets and backfills the 3 retired values in a
  later migration. Both hold; they run in sequence.

- **Additive objective + patch schema** (`schemas/plan/planTierObjective.schema.ts`).
  New optional/defaulted fields on `PlanTierObjectiveSchema` (`source`,
  `sourceTypeId`, `secondaryClass`, `ref`, `completionGate`, `actHandoff`,
  `scopeNotes`) and on the checklist item (`isMethodology`,
  `expandedBySecondaryId`), plus a new `PatchRecordSchema`
  (`secondaryTypeId`, `targetObjectiveId`, `injectedItems`,
  `completionGateAmendment`, `scopeNote`) and `ProjectTypeRecord` /
  `TensionAck` / `ProjectTypeVersion`. All additive, so the existing static
  seed keeps validating.

- **Pure resolution engine** `resolveProjectObjectives({primaryTypeId,
  secondaryTypeIds})` (`relationships/resolveProjectObjectives.ts`): 19 Universal
  (deep-copied) + primary objectives + secondary-additive objectives
  (deduped by id) + **modifying patches applied AFTER the additives**, with
  design-tension detection. Each injected checklist item is stamped
  `expandedBySecondaryId` so the UI can render "Expanded by: <Type>". A missing
  patch target is **skipped and recorded, never thrown**; gate amendments
  **concatenate** onto `completionGate`, never replace. The pair-relationship
  matrix (`getPairRelation`, `getActiveTensions`, `RelationCell` 'M'|'A'|'X'|'NA')
  and the 10 named design tensions live in `constants/plan/relationshipMatrix.ts`.

- **On-the-fly resolution, NOT a persisted resolved set (deviation from plan).**
  The plan recommended a new `projectObjectiveStore` persisting each project's
  resolved set. Sub-slice D instead resolves **at render** via
  `useProjectObjectives(projectId)` (a 4-tier fallback: `metadata.projectTypeRecord`
  -> bare `project.projectType` -> static `PLAN_TIER_OBJECTIVES`), with no new
  persistence. Provenance (`expandedBySecondaryId`) survives because it is
  recomputed deterministically every render; reload re-derives the identical set.
  Rationale: zero new persist store / migration, no resolved-set staleness vs
  later catalogue edits, smaller blast radius. The "persist the resolved set"
  recommendation is **explicitly superseded.** Completion (`WizardStep3Team.finish`)
  therefore only stamps a `versionHistory` entry (idempotent) rather than writing
  a resolved snapshot.

- **Wizard Step 2 Section A** (`WizardProjectTypeGrid` required 12-card
  radiogroup + `WizardSecondaryPicker` compatible-only, N/A hidden +
  `WizardTensionPanel` amber/advisory). The tension panel records a timestamped
  `TensionAck` on "I understand, continue" and **never blocks Next** (advisory
  only). Selections write **directly to `metadata.projectTypeRecord`** (deviation:
  not to `visionProfile.primaryType/secondaryTypes` as planned) -- consistent with
  on-the-fly resolution reading that record, so there is **one source of truth.**

- **Covenant.** The 2026-05-29 Amanah Gate override ("encode verbatim, no
  gating") is **moot for this slice** -- Regenerative Farm + Residential carry no
  economic objectives. It governs the later economic-catalogue fan-out
  (Ecovillage / Agritourism / Wellness), where `completionGate` / `actHandoff`
  are stored as plain data. The CSRA prohibition ([[fiqh-csra-erased-2026-05-04]])
  is untouched.

**Consequences:**

- The pipeline is proven end-to-end on Regenerative Farm + Residential; the other
  **11 catalogues fan out as pure data** in follow-on slices (selectable today,
  resolving universal-only until encoded).
- **Demo pair corrected (deviation):** the encoded MODIFYING pair is
  `regenerative_farm` + `residential`, **not** the plan doc's "Homestead +
  Residential" -- `residential.homestead = 'NA'` (incompatible), so "Homestead"
  was a stale label throughout the plan. The matrix cell
  `residential.regenerative_farm = 'M'` is the real modifying pair.
- **Residential has 5 patch records, not 4 (deviation).** For
  `regenerative_farm` + `residential` **all 5 land, 0 skipped, 14 injected items
  total** -- better coverage than the plan's assumption. P0 targets the
  regenFarm **primary** objective `rf-t1-landscape-context` (not a Universal), so
  the plan's premise "Residential patches target Universal objectives, so they
  always land regardless of primary" was wrong for P0: under a different primary
  P0 would skip (recorded, not thrown).
- Resolution math (verified): **38 objectives** = 19 Universal + 13
  regenFarm-primary + 6 Residential-additive, across 7 tiers (T0=5, T1=6, T2=5,
  T3=6, T4=6, T5=4, T6=6).
- Existing projects (MTC `projectType: null`, untyped/pre-slice projects) fall
  through to the static skeleton -- **unaffected.**
- The `DecisionChecklist` "Expanded by: <Type>" provenance chip was **missed in
  Sub-slice D** (the engine stamped the data but the UI never read it) and added
  in Sub-slice E.
- The `planTierStore.toProgressMap` global-id-uniqueness invariant is preserved:
  injected patch item ids are namespaced and a catalogue test asserts global
  uniqueness incl. patch items.
- **Sub-slice F deferred** (mid-project secondary add/remove + named reopen modal
  when a patch targets an already-complete objective).

Commits on `feat/atlas-permaculture` (explicit-path, interleaved with foreign
parallel-session commits): **A** `43983e5f` (v1.2 taxonomy + enum + migration
046) + `c1830618` (client backfill); **B** `528c70c8` (additive objective +
patch schema); **C** `e35aa9a8` (resolution engine + regen-farm/residential
catalogues); **D** `695b9ff8` (per-project resolution, 14-consumer switch); **E**
`5ea5b791` (wizard Step 2 + completion seeding). Verified: web `tsc --noEmit`
(8GB heap) EXIT 0; shared tests green; preview MCP end-to-end -- pick
regen_farm + residential, acknowledge tension on a tension pair, finish; Plan
spine renders the 38 objectives with injected items tagged "Expanded by:
Residential / Live-In"; record + tension acks persist across reload. CSRA model
untouched; ASCII-only copy; no-deletion (legacy wizard chip, static seed,
goalTreeTemplates, ProjectArchetype all preserved). Log:
[[log/2026-05-29-atlas-per-type-objective-model-slice]].
