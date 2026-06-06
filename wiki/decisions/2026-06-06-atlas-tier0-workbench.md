# ADR: Tier-0 Decision Workbench (Phase B: inline non-map capture)

- **Date:** 2026-06-06
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `ab577853` -> `98015fdc` -> `2178325f` -> `1fe3b64d` -> `ba033e21` -> `439b00a6` -> `2b1beb6c` -> `724f8f43` -> `5ad5ec8b`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the structured-capture engine this phase reuses, not rebuilds)
- **Log:** [[log/2026-06-06-atlas-tier0-workbench]]

## Context

Phase A ([[decisions/2026-06-05-atlas-structured-capture-forms]]) shipped a
reusable, validated structured-form engine and proved it on the universal
`s1-vision` objective, but it captured those forms in a **popover modal**
(`VisionFormsTabsModal`) layered over the map-centric Act shell. The operator
then supplied a polished interactive mockup
(`olos_act_tier0_prescribed_options.html`) for the **Act Tier-0** capture
experience that diverges from Phase A on three axes, and chose to converge the
product onto the mockup:

1. **Layout** -- Tier-0 (the non-spatial `s1-vision` planning objective) is a
   **non-map, 3-pane inline workbench** (left = Objectives, center = the active
   objective's Decisions, right = the active decision's working surface), not a
   modal over the MapboxGL canvas. It is explicitly *Tier 0* ("Unlocks Tier 1 --
   Land Reading") and has no map.
2. **Success Criteria interaction** -- a **chip-to-seed** pattern: domain-tagged
   suggestion chips (Ecological / Economic / Stewardship) that spawn editable
   free-text criterion rows; min-3 / max-5 gate with a live footer.
3. **Decision framing** -- a per-decision **"Why these?" rationale** field and a
   lightweight **"Not ready -- needs more observation" defer** action.

**Operator decisions (this session):**
- **Scope = full inline re-layout** for the Tier-0 objective only (`s1-vision`).
  The Act shell swaps the MapboxGL canvas for the inline workbench when the
  active objective is `s1-vision`; the map-centric layout is **untouched** for
  spatial tiers (Land Reading onward).
- **Domain tags = yes** -- typed `domain` metadata on the success-criteria
  options (REVIEW-flagged), single source of truth, derived back to plain
  strings for the legacy dropdown fallback.
- **Rationale = persist; defer = lightweight per-decision annotation** in
  `actEvidenceStore` (additive; **does NOT touch** the progress / dependency-gate
  engine in `planStratumStore` -- display-only re: gating, with a TODO for true
  per-item status).

## Decision

Introduce a **Tier-0 workbench** as a new inline layout mode inside the Act
shell, reusing the Phase A engine and all existing data hooks. New components are
additive; **no deletion** of the map shell or the modal (both remain for
non-Tier-0 objectives and as fallback -- [[feedback-no-deletion]]).

### 1. Domain-tagged success-criteria options (`packages/shared`)

NEW single domain-aware source `SUCCESS_CRITERIA_OPTIONS`
(`Partial<Record<ProjectTypeId | '_base', readonly CriterionOption[]>>`, where
`CriterionOption = { text; domain: 'ecological' | 'economic' | 'stewardship' }`,
REVIEW-flagged) + `resolveSuccessCriteriaOptions(primary, secondaries[])` (union
`_base` + primary + secondaries, dedup by `text`, order-stable). The existing
`resolveFieldOptions('successCriteriaByType', ...)` now derives its string list
from `resolveSuccessCriteriaOptions(...).map(o => o.text)` -- ONE source of truth,
so the Phase A `<select>` dropdown fallback is byte-equivalent. Both exported from
the `@ogden/shared` barrel.

### 2. Rationale + defer persistence (`actEvidenceStore`, additive)

NEW `decisionRationale: Record<projectId, Record<itemId, string>>` +
`saveDecisionRationale(projectId, itemId, text)`; NEW
`deferredDecisions: Record<projectId, Record<itemId, true>>` +
`setDecisionDeferred(projectId, itemId, deferred)`. Persist `version` 2->3 with a
passthrough `migrate`, `partialize` extended. Keyed by `itemId` (== `formId`;
success-criteria is `s1-vision-c2`). **Does not touch `planStratumStore`** -- the
defer flag is a display-only annotation, not a gating status.

### 3. Four additive components (`apps/web/src/v3/act/tier-shell/`)

- **`SuccessCriteriaCapture.tsx`** -- the mockup's prescribed-options UX: domain
  suggestion chips (first 2 visible + "Show N more" toggle; click seeds a filled
  criterion row + marks the chip used/check), editable numbered criteria rows
  (check on filled, hover delete, "Write your own criterion" add-row capped at
  `max` 5, min-3 gate note). An **alternative renderer over the SAME
  `{ criteria: string[] }` FormValue** Phase A produces -- `onChange` emits that
  shape, so persistence + the legacy summary mirror are unchanged. "Used" is
  derived from presence (stateless / rehydration-friendly), a documented
  divergence from the mockup's permanent DOM flag.
- **`DecisionList.tsx`** (center) -- renders the active objective's `checklist`
  items as selectable rows with done state (from effective progress), feed
  annotation, and `optional` badge; selecting fires a callback.
- **`DecisionWorkingPanel.tsx`** (right) -- header + body router + footer. **Body
  router:** `isSuccessCriteria` -> `SuccessCriteriaCapture`; else a tool with
  `fields` -> `VisionFormFields` (Phase A engine, reused); else a `<textarea>`
  fallback. **Footer:** a "Feeds ..." callout, the optional "Why these?"
  rationale textarea (persisted onBlur), a "Record this decision" button
  (disabled until valid via `isFormValueValid`), and the defer toggle. Owns only
  the working draft + rationale draft, re-seeded on `itemId` change; all
  persistence is lifted to the parent.
- **`ActTierZeroWorkbench.tsx`** -- the 3-pane container. Owns only the
  active-decision selection state (re-seeded when the active objective changes)
  and the pure `buildDecisionTarget(item)` derivation (joins a checklist item to
  its form tool via `arm.formId === item.id`, detects success-criteria via a
  repeatable hybrid `optionSetId === 'successCriteriaByType'`, resolves feed
  labels). Left rail lists objectives with per-objective decision counts + a
  "Completes Tier 0 / Unlocks Tier 1 -- Land Reading" next-box. All store
  reads/writes are lifted to the parent (PB7); option resolution is pure and done
  inline from the type-id props (no `useMemo` -- `secondaryTypeIds ?? []` mints a
  fresh array each render, so a memo would not stabilise; computing inline keeps
  code and intent aligned).

### 4. Layout swap (`ActTierShell.tsx`)

A module-level predicate `isTierZeroObjective(objective)` (matches `s1-vision` by
id; designed to widen later, e.g. a foundation-stratum check). When the selected
objective satisfies it, the shell renders `<ActTierZeroWorkbench>` **in place of**
`<StageShell>` (keeping `<ActTierSpine>` on top) and suppresses the trailing
`<VisionFormsTabsModal>`; otherwise the existing map shell renders unchanged. The
rail receives the whole foundation stratum's objectives (`stratumObjectives`) for
a mockup-faithful multi-item list + real next-box counts; clicking a non-Tier-0
foundation objective navigates and renders the normal map shell (intended Phase-B
"bounce" -- only `s1-vision` is converted this phase). New stable frozen-empty
fallbacks (`EMPTY_RATIONALES`, `EMPTY_DEFERRED`) guard the new selectors against
the Zustand v5 fresh-object-literal re-render hazard.

## Consequences

- A steward opening the Tier-0 (`s1-vision`) objective sees a non-map 3-pane
  workbench; the success-criteria decision shows domain-grouped chips that seed
  editable rows under a min-3 / max-5 gate; recording mirrors a readable summary,
  marks the checklist item complete, and advances progress; reopening rehydrates
  rows + rationale; a non-success-criteria decision (e.g. Labour inventory)
  renders the existing multi-field form in the same panel. Spatial objectives are
  byte-identical to today's map shell.
- Defer is a **display-only annotation** -- it does NOT lock or gate any decision
  this phase (TODO: true per-item defer status in `planStratumStore`).
- Domain content ships REVIEW-flagged (empty sets degrade to free-form-only),
  pending operator confirmation. ONE source of truth -> the Phase A dropdown
  fallback stays in sync automatically.
- The map shell, the modal, and the Phase A engine are untouched and remain in
  use for every non-Tier-0 objective.

## Amanah

Structured capture of land-stewardship planning intent (success criteria,
rationale). No sales channel, advance purchase, or financing instrument; no
CSRA/salam framing; no riba/gharar surface ([[fiqh-csra-erased-2026-05-04]],
[[feedback-csa-in-catalogues]]). Clean.

## Verification

- Shared `tsc --noEmit` clean (PB1); web `tsc --noEmit` EXIT 0 (8GB heap) after
  each web task.
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): shared `resolveSuccessCriteriaOptions` +
  `resolveFieldOptions` string parity; web `actEvidenceStore` (rationale + defer +
  v3 migrate), `SuccessCriteriaCapture`, `DecisionList` (12), `DecisionWorkingPanel`,
  `ActTierZeroWorkbench` (10) green.
- **PB7 `ActTierShell` wiring is tsc-only by design** -- the shell is a no-prop
  router/map/multi-store integration component never unit-tested today (Phase A
  precedent); `handleFormDataSave` reused verbatim as `onRecord`. Disclosed, not
  hand-waved.
- **Live preview smoke NOT YET RUN** -- the one remaining manual gate
  ([[project-screenshot-hang]]); behavior asserted via unit/component tests +
  render-path analysis until then.

## Alternatives considered

- **Replace the map shell / modal outright:** rejected -- the map shell serves
  every spatial tier and the modal serves every non-Tier-0 form tool; the swap is
  a scoped additive branch ([[feedback-no-deletion]]).
- **True per-item defer status in `planStratumStore`:** rejected for this phase --
  a moderate cross-surface refactor of the progress / dependency-gate engine;
  defer ships as a display-only annotation in `actEvidenceStore` with a TODO.
- **Reuse Phase A's `<select>` repeatable for success criteria:** rejected -- the
  operator's mockup is a chip-to-seed UX; `SuccessCriteriaCapture` is an
  alternative renderer over the identical FormValue, so persistence is unchanged
  while the interaction matches the mockup.
- **Encode domain tags on the legacy string list:** rejected -- a string cannot
  carry a domain; the domain-aware `CriterionOption[]` is the single source of
  truth and the string list is derived from it.
