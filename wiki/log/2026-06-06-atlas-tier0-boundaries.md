# 2026-06-06 -- Tier-0 Boundaries surface (Phase C Part 3, sub-project 1 of 3: multi-mode legal capture)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits `381a7455`/`32294fd5`/`4ef2eee3`/`5ea7a3b6`/`78f5de69`/`f97503f2`/`8bd0fc4c`; **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl.md` (Phase C Part 3, tasks BT1-BT8).
- **Decision:** [[decisions/2026-06-06-atlas-tier0-boundaries]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Phase C Part 3 widens the Tier-0 workbench from the `s1-vision` objective to also
cover **`s1-boundaries`** ("Settled site boundaries & legal constraints", 7
checklist items c1-c7), building the structured legal-constraint capture from the
operator mockup `olos_boundaries_legal_mixed_surface.html`. Unlike `s1-vision`
-- where one renderer maps to one decision -- the boundaries mockup routes **each
decision item to a different right-panel body keyed by a MODE badge**. This is the
**first of three** sequential sub-projects (Boundaries -> Stakeholders ->
Stewards); Stakeholders and Stewards are deferred to their own plans.

It **builds on / reuses (does NOT rebuild)** the Tier-0 workbench, working panel,
`actEvidenceStore.visionFormData` persistence, and the threaded `resolveOptions`
prop established in Phases B and C Parts 1-2. Scope = the boundaries objective
only; every other decision and objective renders exactly as the prior phases left
them.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-06-atlas-tier0-boundaries]].)

- **One mode-routing bespoke component, not 6 arms.** Rather than add six booleans
  + six arms to `DecisionWorkingPanel`, the panel adds ONE flag (`isBoundary`) + ONE
  body-router arm delegating to a self-routing `BoundaryCapture` that switches on
  `itemId` internally (mirrors how vision-classify/labour each add exactly one
  arm). The four modes (doc / map / mapEntry / decision) and seven ids are
  co-located in one component.
- **Capture data now, defer rich I/O.** Operator decision: map pin/draw is a
  **static decorative inline SVG** + a **disabled "Open map -- coming soon"**
  affordance (no MapboxGL in the workbench, no navigation); file upload is a
  **metadata-only stub** (`onChange` sets a placeholder `docName`; no file is read
  or stored). Real spatial + file I/O are a later track. Every "Open map" / "Pin
  easement" / "Draw ROW line" control is rendered `disabled`.
- **All seven items persist through the UNCHANGED flat `FormValue`.** The mode map:
  c1 Title/deed -> **doc** (`{docName?, docStatus?, notes?}`, valid when docStatus
  set); c2 Map boundaries -> **map** (`{acknowledged?, notes?}`, valid when
  acknowledged); c3 Easements -> **mapEntry** (`{easements[], implications[]}`,
  valid when >=1 easement OR implications includes 'No implications'); c4 Zoning ->
  **decision** (`{zoning?, permittedUses[], reviewFlag?, notes?}`, valid when zoning
  && reviewFlag set); c5 Water -> **decision** (`{sources[], entitlement?, unit?,
  status?}`, valid when >=1 source && status set); c6 Covenant -> **doc**
  (`{obligationTypes[], docName?}`, valid when >=1 obligation); c7 Permits ->
  **decision** (`{activities[], notes?}`, ALWAYS valid -- zero permits is a valid
  answer). All values are `string | string[]`; the only non-string field
  (`acknowledged: boolean`) is encoded `'true' | ''`. **No store change** -- reuses
  the same `actEvidenceStore.visionFormData[itemId]` slice vision-classify/labour use.
- **Pure, total exports drive both panel and badges.** `BoundaryCapture` exports
  `boundaryModeFor(itemId)`, `decodeBoundary(itemId, value)` (total -- a safe map
  default only for genuinely unknown ids), `isBoundaryValid(itemId, model)`,
  `summariseBoundary(itemId, model)`, and the default component. The panel derives
  `boundaryModel` once and reuses it across validity / gate-note / record-summary /
  body (mirrors the labour `labourModel` derive-once pattern); the body-router arm
  is placed **before** the generic `hasFields` arm.
- **Detection + badges + map strip.** `buildDecisionTarget` sets
  `isBoundary = item.id.startsWith('s1-boundaries-')`. `DecisionList` gains an
  optional `modeFor` prop; when present it renders a humanised mode badge per row
  (Document / Map / Map + entry / Decision) -- absent for `s1-vision` (no badges,
  unchanged). The workbench renders a static **map-activation strip** ("2 overlays
  will activate on the map: Risk / Compliance, Site Boundary") above the list only
  for `s1-boundaries`.
- **Predicate widened incrementally.** `ActTierShell` replaces the single
  `TIER_ZERO_OBJECTIVE_ID = 's1-vision'` with a membership Set
  `TIER_ZERO_OBJECTIVE_IDS = {'s1-vision','s1-boundaries'}`; both predicates
  (`isTierZeroObjective`, `isTierZeroObjectiveId`) test set membership. Because rich
  map I/O is deferred, the workbench is fully self-contained for `s1-boundaries` --
  the map shell simply stops mounting for that objective, exactly as it already does
  for `s1-vision` (no map-shell coexistence problem).

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **BT1 `381a7455`** -- `feat`: add 10 `_base`-only boundary option sets to
  `FIELD_OPTION_SETS` (REVIEW-flagged, content verbatim from the mockup):
  `boundaryDocStatus`, `boundaryZoning` (7), `boundaryPermittedUses`,
  `boundaryZoningReview`, `boundaryWaterSources`, `boundaryWaterUnit` (ML/kL/m3),
  `boundaryWaterStatus`, `boundaryEasementImplications`, `boundaryCovenantTypes`,
  `boundaryPermitActivities`; 26 fieldOptions tests; shared tsc clean.
- **BT2 `32294fd5`** -- `feat(web)`: NEW `BoundaryCapture.tsx` (+css+test) -- doc
  (c1 titleDeed, c6 covenant) + map (c2) modes; `boundaryModeFor` covers all 7 ids;
  doc-status buttons, metadata-stub upload, disabled "Open map", acknowledge toggle.
- **BT3 `4ef2eee3`** -- `feat(web)`: mapEntry mode (c3) -- editable easement rows
  (add/remove) + implication flag multi-toggle; valid when >=1 easement OR 'No
  implications'; decorative map preview + disabled affordances.
- **BT4 `5ea7a3b6`** -- `feat(act-tier0)`: decision modes (c4 zoning, c5 water, c7
  permits) -- zoning select + permitted-use checkboxes + review flag; water source
  checkboxes + entitlement number (stored as string) + unit select + status; permit
  activity checkboxes + amber advisory callout; removes the temporary default map
  fallback for c4/c5/c7; 57 capture tests.
- **BT5 `78f5de69`** -- `feat(act-tier0)`: wire the `isBoundary` arm into
  `DecisionWorkingPanel` -- derive `boundaryModel` once, validity via
  `isBoundaryValid`, record summary via `summariseBoundary`, mode-derived gate note,
  body-router arm before `hasFields`, keyed on itemId; 34 panel tests.
- **BT6 `f97503f2`** -- `feat(act-tier0)`: detection (`buildDecisionTarget` sets
  `isBoundary`), `DecisionList` optional `modeFor` mode badges, workbench
  map-activation strip (s1-boundaries only); 39 tests (DecisionList 15, Workbench 24).
- **BT7 `8bd0fc4c`** -- `feat(act-tier0)`: widen the Tier-0 predicate to a
  membership Set including `s1-boundaries`; both predicates test `.has(...)`;
  tsc-only (per Phase-A/B precedent for the shell integration component).
- **BT8 `<pending>`** -- this docs entry + the ADR + index/log updates + the final
  whole-implementation review + live smoke (explicit-pathspec wiki commit).

## Verification

- **Shared `tsc --noEmit`** clean; **web `tsc --noEmit`** EXIT 0 (8GB heap).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green: shared fieldOptions (26); web
  `BoundaryCapture` (57), `DecisionWorkingPanel` (34), `DecisionList` (15),
  `ActTierZeroWorkbench` (24) -- 130 web + 26 shared all passing in a single
  bounded run.
- **Two-stage SDD review** (spec then code-quality) **PASSED** for BT4-BT6; BT7 is a
  tsc-only mechanical predicate change.
- **Final whole-implementation review (BT1-BT7):** **READY TO MERGE** -- no
  Critical/Important defects. Mode routing complete (all 7 ids; isBoundary arm
  precedes hasFields); decode/encode inverses for every mode; nothing persists a
  non-string value; validity/gate consistent with the table; predicate widening
  purely additive (no stale constant remains); deferred-IO honest (Open-map
  disabled, upload a metadata stub); ASCII-only / project tokens with hex fallback;
  sibling-consistent controlled-component pattern. Two Minor cosmetic notes raised:
  the BT2-era header comment was stale (FIXED in BT8 -- now lists all 7 ids/4
  modes); the decision-mode gate note is generic ("Complete the required fields")
  vs the more specific doc/map/mapEntry notes (left as-is, coherent, c7 never shows
  a note). Option content + validity heuristics ship REVIEW-flagged for operator
  confirmation.
- **Live smoke:** <pending -- recorded on completion>.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first bytes
verified non-BOM); `git diff --cached --name-only` confirmed before each commit;
foreign WIP NEVER staged or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]); not
pushed; ASCII-only. **Amanah:** structured capture of legal/regulatory land
constraints (title, easements, zoning, water entitlements, covenants, permits) --
no sale, advance-purchase, financing instrument, or CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Deferred

- **Stakeholders surface** (sub-project 2): a cross-decision shared stakeholder
  register + a mandatory non-deferrable Indigenous/cultural item + contact/cultural/
  annotate modes. Own spec -> plan -> build.
- **Stewards surface** (sub-project 3): the `s1-vision-steward` RBAC/invite track.
- **Real map spatial capture + real file upload/storage** for boundaries (the
  deferred rich-I/O track; current map/upload are decorative/metadata stubs).
- Finalizing the **REVIEW-flagged boundary option content + validity heuristics**
  (operator confirm/extend).
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence.
