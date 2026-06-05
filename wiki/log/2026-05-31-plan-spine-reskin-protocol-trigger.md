# 2026-05-31 -- Plan Spine Live Reskin + §10.1 Protocol Trigger (6 commits)

**Branch.** `feat/atlas-permaculture` (6 explicit-path commits `87959dc2` A -> `ceb61a45` B -> `834ae189` C1 -> `6be14f3e` C2 -> `8bfbbfd4` C3 -> `58b1d341` C4; not pushed).

**Objective.** Bring the live Plan stratum page (`/v3/project/$id/plan/...`) to full production fidelity across three dimensions: (1) spine circle label display, (2) read-only checklist re-skin matching the prototype's DecisionGroupCard format, and (3) the full §10.1 S6 Integration derivation pipeline — steward-entered operating thresholds flow through to protocol token substitution and activation. Amanah gate cleared; no fabrication constraint: unfilled tokens always render verbatim brackets.

---

## Phase A -- StratumSpineCircle labels (`87959dc2`)

**File:** `apps/web/src/v3/plan/strata/StratumSpineCircle.tsx`

Changed the non-complete circle glyph from `{n}` to `` `S${n}` `` (e.g. `S1`...`S7`). The complete branch (`checkmark`) was left untouched. Bold title line changed from `Stratum {n}` to `{stratum.title}` (e.g. "Project Foundation"). Duplicate subtitle div (which also rendered `{stratum.title}`) removed entirely, together with the now-empty spacing wrapper. Progress count (`{done}/{total}`) retained on non-locked strata.

**Result:** Each circle now reads `S1`--`S7` (or `✓` when complete) with the full stratum title in bold and no subtitle. Verified by web tsc (clean) and vitest (existing strata tests green).

---

## Phase B -- DecisionChecklist faithful read-only re-skin (`ceb61a45`)

**File:** `apps/web/src/v3/plan/strata/DecisionChecklist.tsx` (full rewrite of the render surface).

Replaced the interactive checkbox list with a faithful read-only DecisionGroupCard format using inline spine tokens (`C`/`F`/`CA` from `spine/tokens.ts`). Each `objective.decisionGroups` entry renders as an outer card: gold-bordered left accent, tappable header with a 22px bubble (group index+1, or `✓` when all items complete), label (line-through when done), amber "Added by \<SecondaryType\>" badge when `sourceSecondaryId` is set, and a chevron. Objectives with no `decisionGroups` fall back to a single implicit group over `objective.checklist`.

Expanded items render: a read-only banner ("⌒ Read-only preview — decisions are worked through in Act"); striped alternating rows; a **non-interactive 14px `<div>` checkbox** (checkmark when item id is in `completedItemIds`, hollow otherwise); item text with line-through when done; per-item `feedsInto` chips, `optional` / `isMethodology` tags, `expandedBySecondaryId` badge ("Expanded by"), and Stage-Zero `derivedEvidence` badge ("From Stage Zero Vision"). Footer: "Open in Act →" CTA + "→ feeds \{feedsInto\}" collapsed adornment + item count.

**Plan-side toggling removed.** `onToggleItem`/`onToggleChecklistItem` prop removed from the component and unmounted in `ObjectiveDetailPanel.tsx`. Completion state is display-only (read from `completedItemIds`, which is still written by Act-side evidence capture via `planStratumStore.toggleItem`).

Verified by web tsc + updated unit tests (assertions changed from toggling to read-only rendering).

---

## Phase C1 -- Shared parameter schema + seed + derive helper (`834ae189`)

**Files:**
- `packages/shared/src/schemas/plan/planStratumObjective.schema.ts`: Added `ParameterItemSchema` (`id`, `token`, `label`, `unit?`, `placeholder?`) and an optional `parameterGroup` (`id`, `label`, `items[1+]`) on `PlanStratumObjectiveSchema`. All existing objectives validate unchanged.
- `packages/shared/src/constants/plan/stratumObjectives.ts`: `s6-yield-flows` seeded with `parameterGroup` containing 5 items, one per standard-template token: `approved threshold` (Paddock rotation cover trigger, kg DM/ha), `approved day limit` (Maximum grazing days, days), `approved recovery target` (Minimum recovery target, kg DM/ha), `configured window` (Monitoring window, days), `emergency threshold` (Emergency destock threshold, kg DM/ha). Labels and units are descriptive UI copy -- no fabricated agronomic values.
- `packages/shared/src/constants/protocol/protocolOutputs.ts` (new): pure `buildProtocolOutputs(parameterGroup, valuesById)` -- maps each parameter item with a non-empty trimmed value to its `token`. Omits blank/whitespace. Barrel-exported from `packages/shared/src/index.ts`.
- Tests (`__tests__/protocolOutputs.test.ts`): filled-token maps, empty-token omits, undefined group returns `{}`. Drift-guard test: every standard-template token matches a parameter item in the S6 seed.

Verified by `pnpm --filter @ogden/shared exec tsc --noEmit` (clean) and shared vitest (all green, including drift guard).

---

## Phase C2 -- Web stores: values slice + deactivateProtocol (`6be14f3e`)

**`apps/web/src/store/planStratumStore.ts`:**
- Added `valuesByProject: Record<string, ValuesByObjective>` parallel slice (never touches `byProject`/`toProgressMap`/status engine).
- Actions: `setParameterValue(projectId, objectiveId, itemId, value)` (immutable spread), `getParameterValues(projectId, objectiveId)`.
- Stable exported selector `selectParameterValues(state, projectId, objectiveId)` -- returns the stored object reference or frozen `EMPTY_VALUES` constant (safe as an inline Zustand v5 selector; never mints a new object).
- Persist version bumped 4 → 5; `migrate` extended with purely additive v4→v5 step (`valuesByProject: {}`); `valuesByProject` added to `partialize`.

**`apps/web/src/store/protocolStore.ts`:**
- Added `deactivateProtocol(projectId, templateId)` -- filters out the matching record. Inverse of `activateProtocol`.

**Tests (`__tests__/planStratumStore.values.test.ts`):** 9 tests covering set/get round-trip, merge+overwrite, clear-to-blank, project/objective isolation, stable frozen empty default, selector stable identity, completion path unchanged when writing values, v4→v5 backfill, v5 preserved, rehydrate v4 blob.

**Tests (`__tests__/protocolStore.test.ts`):** 4 tests: activate→deactivate removes record; deactivate removes ONLY matching; idempotent no-op on missing; re-activate after deactivate creates fresh record.

Verified by web tsc (clean for changed files; one pre-existing unrelated error in `routeToDataPoint.test.ts` is foreign WIP, not a regression) and vitest.

---

## Phase C3 -- ParameterGroup input UI (`8bfbbfd4`)

**`apps/web/src/v3/plan/strata/ParameterGroup.tsx` (new):**
- Props: `{ projectId, objective }`.
- Reads `typeRecord` from `useProjectStore`; derives `hasEligibleEnterprises` via `enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds).length > 0`.
- Returns `null` if `!objective.parameterGroup || !hasEligibleEnterprises`.
- Renders `<section data-testid="plan-parameter-group">` with gold "PLAN DECIDES" eyebrow, group label, per-item rows: `<label>`, `<input type="text" inputMode="decimal">` bound to `values[item.id] ?? ''`, onChange → `setParameterValue`, gold border when filled, unit span if present.
- Footer: "Values entered here are used as the thresholds in your activated protocols."
- Values persist on keystroke via `setParameterValue`.

**`apps/web/src/v3/plan/strata/ObjectiveDetailPanel.tsx`:**
- Mounted `<ParameterGroup>` after `<DecisionChecklist>`.

Gated correctly: the parameter group is invisible for non-livestock projects (no eligible enterprises) and for objectives without a `parameterGroup` seed.

---

## Phase C4 -- §10.1 approval flow + ProtocolLayerPanel derived outputs (`58b1d341`)

**`apps/web/src/v3/plan/strata/ProtocolApprovalOverlay.tsx` (new):**
- Full-screen modal (`zIndex: 1200`, backdrop click closes) wrapping `spine/ProtocolConfirmationFlow` with real store data.
- Templates: `templatesForEnterprises(enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds))`.
- Outputs: `buildProtocolOutputs(objective.parameterGroup, values)` -- NO FABRICATION; unfilled tokens render brackets verbatim.
- Decisions: local `useState<Record<string, ProposalDecision>>` initialized from `protocolStore.records` (pre-activated → `'activated'`, else `'pending'`).
- `handleActivate` → `activateProtocol + 'activated'`; `handleSkip` → `'skipped'` (UI-only, no persist slot); `handleUndo` → `deactivateProtocol + 'pending'`; `handleEditCommit(id, tokenValues)` → finds parameter item by token → `setParameterValue` for each (single source of truth write-back) → `activateProtocol + 'activated'`.
- Passed `editedValues={{}}` and `isEdited={() => false}` to `ProtocolConfirmationFlow` (parameter store is the single source; no in-flight draft to track; "Edited" badge correctly stays hidden).
- `ProtocolConfirmationFlow.tsx` imported read-only; not edited.

**`apps/web/src/v3/plan/strata/ObjectiveDetailPanel.tsx`:**
- Added "Approve & instantiate protocols →" gold button, gated on `objective.stratumId === 's6-integration-design'` AND `Boolean(objective.parameterGroup)` AND `status === 'complete'` AND `hasEligibleEnterprises`. Opens `ProtocolApprovalOverlay` via `approvalOverlayOpen` state.

**`apps/web/src/v3/plan/strata/ProtocolLayerPanel.tsx`:**
- Added `usePlanStratumProgressStore` / `selectParameterValues` / `buildProtocolOutputs` / `findPlanStratumObjective` imports.
- Subscribes to S6 values: `usePlanStratumProgressStore(s => selectParameterValues(s, projectId, 's6-yield-flows'))`.
- Derives `derivedOutputs` via `buildProtocolOutputs(findPlanStratumObjective('s6-yield-flows')?.parameterGroup, s6Values)`.
- Passes `outputs={derivedOutputs}` to each `ProtocolLibraryCard` (replaced former `outputs={{}}`).
- Zustand v5-safe: `records` selected as stable reference, status map derived in `useMemo`.

**Tests (`__tests__/ProtocolApprovalOverlay.test.tsx`):** 6 tests: renders eligible templates, Activate calls `activateProtocol`, Undo calls `deactivateProtocol` and reverts, pre-activated templates initialize as activated, Close calls `onClose`, Edit-First commit writes to `planStratumStore`.

---

## Verification

- **384 web tests passing** as of this session.
- **web tsc exit 0** for all changed files. One pre-existing error in `routeToDataPoint.test.ts` (foreign WIP, TS2532 narrow miss) is not a regression from this session.
- **Spine prototype files untouched:** `spine/PlanSpinePrototype.tsx`, `mockData.ts`, `mockProtocols.ts`, `DesignDetailPanel.tsx`, `ProtocolConfirmationFlow.tsx` were import-only throughout.
- `preview_screenshot` unavailable on this Windows setup (MapLibre render loop hang); DOM-exercise verification via `preview_eval`/`preview_snapshot` used and disclosed.

---

## Key design decisions

| Decision | Rationale |
|---|---|
| Separate `valuesByProject` slice in `planStratumStore` (not a new store) | Keeps `toProgressMap`/status engine untouched; additive v4→v5 persist migration is purely safe. |
| `selectParameterValues` returns frozen `EMPTY_VALUES` | Stable object identity under Zustand v5; never mints a new reference per render. |
| `editedValues={{}} + isEdited={() => false` in overlay | Parameter store is the single source of truth; `handleEditCommit` writes back before activating. "Edited" badge is correctly hidden. |
| `ProtocolLayerPanel` derives outputs from S6 values | Activated conditions show the entered thresholds; unfilled tokens render verbatim brackets. |
| Plan-side toggling removed (Phase B) | "Decisions are worked through in Act" — completion state is display-only in Plan; Act-side evidence capture remains the write path via `planStratumStore.toggleItem`. |

Continues [[log/2026-05-31-protocol-layer-act-stage-surface]] (prior session that built `protocolStore` and the Act display surface). ADR: [[decisions/2026-05-31-atlas-plan-spine-live-reskin]]. Entity: [[entities/atlas-platform]].
