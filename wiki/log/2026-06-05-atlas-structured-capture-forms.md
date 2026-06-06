# 2026-06-05 -- Structured Capture Forms for objective tasks (Phase A: S1 Vision)

- **Branch:** `feat/structured-capture-forms` (six clean explicit-path commits, **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl` ("Structured Capture Forms for Objective Tasks -- Phase A: S1 Vision (pattern-builder)").
- **Decision:** [[decisions/2026-06-05-atlas-structured-capture-forms]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Operator request: in Stratum 1 / Objective 1, the **Success Criteria** capture
should let the steward enter up to 5 entries (at least 3 required), each chosen
from predetermined options driven by the project's chosen type(s) OR typed
free-form; the **Labour Inventory** tab should load a multi-field form instead of
a single textarea; and the same "form instead of textarea" treatment should
generalize to every objective task requiring text input.

Until now every non-spatial objective checklist item was captured as ONE
free-text `<textarea>`. Render path: `ActTierShell` ->
`VisionFormsTabsModal` (one tab per `kind:'form'` tool in a category),
persisted as a single STRING per `formId` in
`actEvidenceStore.visionForms[projectId][formId]`.

Scope of this slice (operator-confirmed): build the reusable field engine and
prove it on S1 Objective 1's seven `s1-vision` form tools; roll out to other
strata/types in follow-up sessions. Draft per-type option lists ship
REVIEW-flagged (no silently-invented authoritative content).

## Architecture (additive, back-compatible)

An optional `fields` spec on the `form` arm. When a tool defines `fields`, the
modal renders the structured engine; when absent (every other form tool), it
falls back to today's textarea -- fully back-compat. Options resolve from a
pure shared resolver keyed by `optionSetId x project type`. The structured value
is stored in a NEW slice and a human-readable summary is mirrored into the
legacy string map so all existing "captured" / text readers keep working.

## Commits (SDD: implementer per task, controller review + explicit-path commit)

- **SF1 `6ab0aff4`** -- `feat(shared): add fieldOptions resolver + draft per-type option lists`.
  NEW `packages/shared/src/constants/plan/fieldOptions.ts`: `FIELD_OPTION_SETS`
  (`Record<optionSetId, Partial<Record<ProjectTypeId | '_base', readonly string[]>>>`,
  draft starter lists headed by a `// REVIEW: operator to confirm/extend` banner)
  + pure `resolveFieldOptions(optionSetId, primaryTypeId, secondaryTypeIds[])`
  -- unions `_base` + primary + each secondary in order, dedup first-seen;
  unknown id -> `[]`. Exported from the `@ogden/shared` barrel. Test
  `__tests__/fieldOptions.test.ts` (union order / dedup / unknown id / no-primary
  / base-only).
- **SF2 `687b16a5`** -- `feat(act): add structured field specs to s1-vision form tools`.
  `actToolCatalog.ts`: NEW `FormLeafField` (text/hybrid, `key?` optional),
  `FormFieldSpec` (leaf+required OR repeatable with required `key`), and
  `fields?: readonly FormFieldSpec[]` on the form arm. Authored `fields` for all
  seven `s1-vision` tools: `purpose-statement` (single text), `success-criteria`
  (repeatable `criteria` min3/max5, hybrid `successCriteriaByType`),
  `capital-budget` (text fields), `labour-inventory` (hoursPerWeek text +
  `laborSeasonality` hybrid + `skills` repeatable hybrid min0/max6 + notes),
  `constraints` (repeatable `constraintsByType` min1/max8), `vision-classify`
  (two repeatables committed/aspirational), `assumptions` (repeatable min1/max8).
- **SF3 `bcf0a647`** -- `feat(act): add structured visionFormData slice to actEvidenceStore`.
  Added `FormFieldValue`/`FormValue` types to `actToolCatalog.ts`; store gains
  `visionFormData: Record<projectId, Record<formId, FormValue>>` + action
  `saveVisionFormData(projectId, formId, value, summaryText)` (writes structured
  AND mirrors summary into `visionForms`); persist `version` 1->2 with passthrough
  `migrate`, `partialize` extended. Existing `saveVisionForm` untouched. Test
  (structured write, summary mirror, two-formId coexistence, back-compat, v1->v2
  rehydration yields `{}`).
- **SF4 `c080bf8d`** -- `feat(act): add VisionFormFields structured field engine`.
  NEW `VisionFormFields.tsx` + `.module.css` + test. Controlled engine
  (`fields`, `value`, `onChange`, `resolveOptions`): text leaf (input/textarea),
  hybrid leaf (`<select>` of resolved options + `__free__` "Other (type your own)"
  sentinel revealing a free-text input; free mode auto-detected for off-list
  values), repeatable (row per entry, Add disabled at max, per-row Remove with
  index-aligned free-mode compaction). Exported pure helpers `initialFormValue`,
  `summariseFormValue`, `isFormValueValid`. 14/14.
- **SF5 `daeb51c8`** -- `feat(act): render structured form engine in VisionFormsTabsModal`.
  Added optional `initialData?` + `onSaveData?` props; `resolveOptions` wired to
  `resolveFieldOptions` via `metadata.projectTypeRecord`; `dataDrafts` seeded on
  closed->open (priority 1 = `initialData[formId]`; priority 2 =
  `initialFormValue` + pre-seed from a resolved `answerSpec` value via
  `labelForOption`); `handleSave`/`canSave` branch on `activeFields`
  (`isFormValueValid` / `onSaveData(...summariseFormValue...)`); render
  `fields ? <VisionFormFields> : isRecap ? <recap> : <textarea>` -- **recap
  precedence** (the structured form supersedes the read-only answerSpec recap when
  `fields` is present, pre-seeding from the prior answer so no data is lost).
  15/15.
- **SF6 `640b1a69`** -- `feat(act): wire ActTierShell to structured vision-form capture`.
  Added a stable `EMPTY_FORM_DATA` frozen record (mirrors `EMPTY_FORMS`); selector
  `visionFormData = useActEvidenceStore(s => s.visionFormData[id] ?? EMPTY_FORM_DATA)`;
  `handleFormDataSave(formId, value, summary)` -> `saveVisionFormData(id, ...)` +
  `setItemComplete(id, objectiveId, formId)` (a verbatim structural mirror of the
  existing `handleFormSave`, no popup close); passed `initialData={visionFormData}`
  + `onSaveData={handleFormDataSave}` to the modal mount. Legacy
  `initialValues`/`onSave` textarea path untouched. 1 file, +28.

## Verification

- **Web `tsc --noEmit`** EXIT 0 (8GB heap) after each web task; foreign
  `src/compost/*` WIP errors do not surface in the `@ogden/web` filtered check.
- **Shared `tsc`** clean for SF1.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]): shared `fieldOptions` resolver green; web
  `actEvidenceStore` (5), `VisionFormFields` (14), `VisionFormsTabsModal` (15)
  green.
- **SF6 test path: documented tsc-only.** `ActTierShell` takes no props, pulls
  ~20 Zustand stores + TanStack router hooks + a full MapboxGL map stack, and is
  NOT unit-tested today (every sibling tier-shell test renders a small leaf via
  direct props). A full-shell render test would be disproportionate and brittle;
  `handleFormDataSave` is a verbatim structural mirror of the already-tested
  `handleFormSave` (same `setItemComplete`), differing only in the store action
  (both unit-tested). Coverage rests on tsc + the manual smoke.
- **Live preview smoke: NOT YET RUN** -- remains the one manual gate (open a
  project's Act tier-shell s1-vision objective; confirm Success Criteria shows the
  min-3/max-5 repeatable hybrid with type-driven suggestions + "Other (type)";
  save blocked under 3 entries; saving ticks the checklist + advances progress;
  reopen rehydrates; Labour Inventory renders the multi-field form; a non-converted
  tool still shows the textarea fallback). Disclosed, not claimed
  ([[project-screenshot-hang]]).

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (here-string avoided where the message
carried quote+paren content); foreign WIP (`LoginPage`/`RegisterPage`/
`authoring.ts`/`catalogues/index.ts`/`WizardStep2Vision.tsx`/`act-tier-shell.md`
+ untracked `spineGate.conformance.test.ts`) NEVER staged or touched
([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]],
[[feedback-no-deletion]]); `git diff --cached --name-only` verified before each
commit; not pushed; ASCII-only. **Amanah:** structured capture of
land-stewardship planning intent (success criteria, labour, constraints,
assumptions) -- no sales channel, advance purchase, or financing instrument; no
CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).

## Deferred

- Rolling the engine to other strata / the per-type s1 form tools (same engine).
- Finalizing option-list content (ships REVIEW-flagged; operator confirms/extends).
- Nested repeatable groups (Labour is flat fields + one repeatable skills list).
- API/DB persistence of structured capture (stays in the local persisted store).
- The live preview smoke (the one remaining manual verification gate).
