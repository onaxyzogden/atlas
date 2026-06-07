# ADR: Structured capture forms for objective tasks (Phase A: S1 Vision)

- **Date:** 2026-06-05
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `6ab0aff4` -> `687b16a5` -> `bcf0a647` -> `c080bf8d` -> `daeb51c8` -> `640b1a69`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-04-18-milos-grounding-two-axis]] (the answerSpec / optionSetId model this resolver sits beside); [[decisions/2026-06-03-olos-act-objective-coverage-audit]] (R2 deferred the s1 form-arm capture content that this engine now structures)
- **Log:** [[log/2026-06-05-atlas-structured-capture-forms]]

## Context

Every non-spatial objective checklist item was captured as ONE free-text
`<textarea>`. Render path: `ActTierShell` -> `VisionFormsTabsModal` (one tab per
`kind:'form'` tool), persisted as a single STRING per `formId` in
`actEvidenceStore.visionForms[projectId][formId]`. The operator asked for richer,
guided capture: Success Criteria as a repeatable min-3 / max-5 list, each entry a
predetermined option driven by the project's chosen type(s) OR free-form; Labour
Inventory as a multi-field form; and the pattern generalized to every text task.

Per operator decisions this session: **scope to S1 Objective 1** (the universal
`s1-vision` objective's seven form tools) and build the reusable engine, rolling
out later; **draft per-type option lists for review** (no invented content
shipped silently); **Success Criteria behaves as a repeatable list, min 3 /
max 5**.

## Decision

Add an **optional `fields` spec** to the `form` arm. A tool with `fields` renders
the structured engine; a tool without it falls back to today's textarea. The
design is additive and back-compatible across all three load-bearing seams.

### 1. Field-spec data model (app layer, `actToolCatalog.ts`)

`FormLeafField` = `text` (input/textarea) | `hybrid` (select + free-text
sentinel). `FormFieldSpec` = a leaf (`+ required?`) OR a `repeatable`
(`min`/`max`/`item` leaf, with a required `key`). The form arm gains
`fields?: readonly FormFieldSpec[]`. Stored value: `FormFieldValue = string |
string[]`; `FormValue = Record<key, FormFieldValue>`.

### 2. Pure shared options resolver (`packages/shared`)

`FIELD_OPTION_SETS` maps an `optionSetId` to per-`ProjectTypeId` (+ `_base`)
candidate lists; `resolveFieldOptions(optionSetId, primaryTypeId,
secondaryTypeIds[])` unions `_base` + primary + secondaries in order, deduped
first-seen; unknown id -> `[]`. **Starter content is drafted per type, headed by
a `// REVIEW: operator to confirm/extend` banner; an empty set resolves to `[]`
so the field still works as free-form-only.** The resolver is pure and unit-
tested independent of React/stores.

### 3. Persistence: structured slice + string mirror (`actEvidenceStore`)

NEW `visionFormData: Record<projectId, Record<formId, FormValue>>` +
`saveVisionFormData(projectId, formId, value, summaryText)`. The action writes the
structured value AND mirrors a human-readable `summaryText` into
`visionForms[projectId][formId]` -- so the tab "captured dot" and every existing
text reader keep working unchanged. Persist `version` 1->2 with a passthrough
`migrate` (a v1 blob has no `visionFormData`; the initializer backfills `{}`).

### 4. Recap precedence (the one behavior change)

When a tool defines `fields`, the structured form is **authoritative on this
surface and supersedes the read-only `answerSpec` recap** that
`VisionFormsTabsModal` would otherwise show for a wizard-answered item. To avoid
losing the wizard's choices, the form **pre-seeds** from the resolved `answerSpec`
value (mapping ids to labels via `labelForOption`; a single repeatable gets the
labels as its entries, capped at `max` / padded to `min`). Previously a
wizard-answered Success Criteria rendered read-only; now it renders as an editable
pre-filled form.

## Consequences

- A steward opening Success Criteria sees a min-3 / max-5 repeatable list, each
  row a dropdown of type-driven suggestions + "Other (type your own)"; save is
  blocked under 3 non-empty entries; saving mirrors a readable summary, marks the
  checklist item complete, and advances the progress bar; reopening rehydrates the
  structured entries. Labour Inventory renders a multi-field form. A tool without
  `fields` is byte-identical to today's textarea.
- Legacy string readers are unaffected (summary mirror); the structured slice is
  additive; the v2 passthrough migrate is safe for existing persisted blobs.
- Drafted option content is explicitly NON-authoritative (REVIEW banner; empty
  sets degrade to free-form), pending operator confirmation.

## Amanah

Structured capture of land-stewardship planning intent (success criteria, labour,
constraints, assumptions). No sales channel, advance purchase, or financing
instrument; no CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- Web `tsc --noEmit` EXIT 0 (8GB heap) per web task; shared `tsc` clean for the
  resolver. Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): shared `fieldOptions` resolver +
  `actEvidenceStore` (5) + `VisionFormFields` (14) + `VisionFormsTabsModal` (15)
  green.
- **SF6 `ActTierShell` wiring is tsc-only by design** -- the shell is a no-prop
  router/map/multi-store integration component never unit-tested today; the new
  `handleFormDataSave` is a verbatim structural mirror of the already-tested
  `handleFormSave`. Disclosed, not hand-waved.
- **Live preview smoke NOT YET RUN** -- the one remaining manual gate
  ([[project-screenshot-hang]]); behavior asserted via unit/component tests +
  render-path analysis until then.

## Alternatives considered

- **Encode `fields` in the shared catalogue layer rather than `actToolCatalog`:**
  rejected for this slice -- the form arm already lives in the app-layer
  `actToolCatalog`, and the options content (the part needing operator review)
  is the piece that belongs in `@ogden/shared`. Keeping the spec next to the arm
  avoids a cross-package round-trip for a UI-shape concern.
- **Replace the textarea path outright:** rejected -- ~200 other form tools rely
  on it; `fields` is opt-in so the migration is incremental and reversible.
- **Keep Success Criteria read-only when wizard-answered (no recap precedence):**
  rejected -- the operator wants to edit/extend criteria during stewardship;
  pre-seeding from the answerSpec preserves the wizard's choices without locking
  them.
