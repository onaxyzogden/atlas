# 2026-05-29 -- Per-type 3-layer objective model: vertical slice A-E (taxonomy + schema + engine + 2 catalogues + wizard Step 2)

Built the first vertical slice of the OLOS per-type objective model end-to-end on
`feat/atlas-permaculture`, from 18 attached OLOS spec docs. This is **Phase 2** of
the OLOS UX plan ([[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] shipped
Phase 1). Architecture, locked decisions, and the four build-time deviations are
recorded in the ADR [[decisions/2026-05-29-atlas-per-type-objective-model]]; this
entry is the session arc. The old fixed ~16-objective skeleton
(`PLAN_TIER_OBJECTIVES`, same for every project) is replaced by a resolved
**19 Universal + Primary + Secondary (additive/modifying)** set. Encoded pair:
**Regenerative Farm** (primary) + **Residential / Live-In** (secondary-only).

## Sub-slice A -- taxonomy + enum + migration (`43983e5f` + `c1830618`)

13-entry `PROJECT_TYPES` table + `ProjectTypeId` / `SecondaryClass` / `TensionAck`
/ `ProjectTypeRecord` schema in `packages/shared`. Zod `ProjectType` enum renamed
to 14 values (13 taxonomy + `moontrance` sentinel). Migration 046 backfills the 3
retired values server-side (`educational_farm -> education`, `multi_enterprise ->
regenerative_farm`, `retreat_center -> agritourism`) with a pre-`ADD CONSTRAINT`
NULL guard + the first-ever NULL-tolerant CHECK; `c1830618` mirrors the same remap
in the `ogden-projects` client persist. Composes with the same-day
[[decisions/2026-05-29-atlas-projecttype-normalization-422-fix]] (that fix
repaired kebab leakage v4 -> v5; this remaps retired values after). Lockstep:
`trueNorthConfig.ts ARCHETYPE_TO_PROJECT_TYPE` RHS + `WizardStep1Site.tsx`
`PROJECT_TYPE_OPTIONS` repointed to valid ids (kept, not deleted).

## Sub-slice B -- additive objective + patch schema (`528c70c8`)

Extended `PlanTierObjectiveSchema` (`source`, `sourceTypeId`, `secondaryClass`,
`ref`, `completionGate`, `actHandoff`, `scopeNotes`) and the checklist item
(`isMethodology`, `expandedBySecondaryId`) -- all optional/defaulted, so the static
seed still validates. Added `PatchRecordSchema` + barrel exports. No behaviour
change.

## Sub-slice C -- resolution engine + 2 catalogues (`e35aa9a8`)

Pure `resolveProjectObjectives` + the relationship matrix (`getPairRelation`,
`getActiveTensions`, 10 named design tensions) + Universal-19 / Regenerative-Farm
/ Residential catalogues. Order: 19 Universal (deep-copied) -> primary -> secondary
additive (dedup by id) -> **patches applied last**, each injected item stamped
`expandedBySecondaryId`. Missing patch target skipped + recorded (never thrown);
gate amendments concatenate. **Residential = 6 additive + 5 patches** (not 4 as the
plan assumed); P0 targets the regenFarm **primary** objective
`rf-t1-landscape-context`. Id-namespacing rubric + global-uniqueness test guard the
`toProgressMap` flatten invariant.

## Sub-slice D -- per-project resolution, 14-consumer switch (`695b9ff8`)

**Deviation from plan:** resolve **on the fly**, no persisted `projectObjectiveStore`.
New `useProjectObjectives(projectId)` hook -- 4-tier fallback
(`metadata.projectTypeRecord` -> bare `projectType` -> static skeleton). All
consumers that read the static `PLAN_TIER_OBJECTIVES` / `findPlanTierObjective`
(PlanTierShell, WizardCompletionScreen, StageStatusRow, useProjectUrgency,
usePlanRevisionFlagSync, ViewAObjectiveExecution, cycleAdvance, DecisionChecklist,
useRevisionEvents, Act `getObjectiveTitle` global union lookup) route through the
resolved set or the catalogue-union lookup. MTC + untyped projects fall back to
the static skeleton, unchanged.

## Sub-slice E -- wizard Step 2 Section A + completion seeding (`5ea5b791`)

`WizardProjectTypeGrid` (required 12-card radiogroup) + `WizardSecondaryPicker`
(compatible-only, N/A hidden, relation hints A/M/X) + `WizardTensionPanel` (amber,
advisory; "I understand, continue" -> timestamped `TensionAck`; never blocks Next),
mounted above the vision form in `WizardStep2Vision`. Selections write **directly
to `metadata.projectTypeRecord`** (deviation: not `visionProfile`). `WizardStep3Team.finish`
stamps an idempotent "wizard completion" `versionHistory` entry (no resolved-set
write -- D resolves on the fly). The `DecisionChecklist` "Expanded by: <Type>"
provenance chip -- **missed in D**, the engine stamped the data but the UI never read
it -- was added here (2 extra files: `DecisionChecklist.tsx` + `.module.css`),
making this an 11-file commit.

## Deviations from the approved plan (surfaced per execution discipline)

1. **Demo pair = `regenerative_farm` + `residential`**, not "Homestead +
   Residential" -- `residential.homestead = 'NA'` (incompatible); "Homestead" was
   a stale label throughout the plan doc. `residential.regenerative_farm = 'M'` is
   the real modifying pair.
2. **On-the-fly resolution** instead of a persisted `projectObjectiveStore` (D).
3. **Section A writes to `metadata.projectTypeRecord`** instead of `visionProfile`
   (one source of truth with the resolver).
4. **Residential has 5 patches, not 4**; all 5 land for the demo pair (0 skipped,
   14 injected items).
5. The "Expanded by" label was deferred-by-omission in D and added in E.

## Out of scope (intentional)

- **Sub-slice F** (mid-project secondary add/remove + named reopen modal when a
  patch hits an already-complete objective) -- deferred to a follow-on slice.
- The other **11 catalogues** -- selectable now, resolving universal-only until
  encoded as pure data.
- Field Actions Center (creation hooks only: `actHandoff` + `completionGate`
  carried as data, panel not built).
- No legacy deletion ([[feedback-no-deletion]]): old Step-1 wizard chip, the
  static `PLAN_TIER_OBJECTIVES` seed, `goalTreeTemplates`, `ProjectArchetype` all
  preserved.

## Verification

Web `tsc --noEmit` (8GB heap -- plain `tsc` OOMs) **EXIT 0** after each sub-slice;
shared package typecheck + Vitest green (resolver cases: universal-only; primary;
primary + secondary = additive + injected with `expandedBySecondaryId`; dedup;
gate concatenation; N/A -> nothing; missing target skipped-not-thrown; catalogue
rubric incl. global id uniqueness + every patch target exists + the 5 bridge ids
present). Live preview MCP end-to-end: created a project, picked regen_farm +
residential, finished; Plan spine renders **38 objectives across 7 tiers**
(5/6/5/6/6/4/6); T2 shows the Residential additive `res-t2-water-quality` + the
`t2-hydrology` injected items, each tagged **"Expanded by: Residential / Live-In"**
(screenshot captured); reload re-derived the identical 38-objective set + the
persisted `projectTypeRecord`; completion screen shows correct Tier-0 totals.
Tension panel verified on a tension pair (Wellness + Residential = tension-10):
amber panel with the verbatim tension description renders, "I understand, continue"
records a timestamped `TensionAck` and flips the panel to "Acknowledged -- you can
continue." (button gone); Next never blocked (screenshots captured both states).

## Branch state

`feat/atlas-permaculture`. Six slice commits (`43983e5f`, `c1830618`, `528c70c8`,
`e35aa9a8`, `695b9ff8`, `5ea5b791`) interleaved with foreign parallel-session
commits (`78256b7c` hide-map-activation, the `11c9ecee`/`6bc75f64`/`08195310`
plan-card trio, `d2937cdf` Act cycleId ADR-7) -- each slice staged by explicit
path, `git diff --cached --name-only` confirmed before commit, per
[[feedback-commit-immediately-on-rebased-branches]]. This ADR + log entry + the
index/log pointers land in a separate `docs(wiki)` commit. Heavy foreign WIP from
parallel sessions (fieldActionStore, financialStore, capitalPartnerSummary,
DesignMap/DiagnoseMap/OperateMap, MaterialSubstitutions, graphify-out/*, the
ZoneSomSidebar files, scratch `_*_dump.txt` / `tsc_*.txt`) left uncommitted per
[[feedback-no-deletion]]. CSRA model untouched; ASCII-only copy.
