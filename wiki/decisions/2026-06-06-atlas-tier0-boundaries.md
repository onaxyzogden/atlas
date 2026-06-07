# ADR: Tier-0 Boundaries surface (Phase C Part 3, sub-project 1 of 3: multi-mode legal capture)

- **Date:** 2026-06-06
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `381a7455` -> `32294fd5` -> `4ef2eee3` -> `5ea7a3b6` -> `78f5de69` -> `f97503f2` -> `8bd0fc4c`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-06-atlas-tier0-vision-classify]] (Phase C Part 2 -- the bespoke controlled-renderer routed-before-`hasFields` + detect-in-`buildDecisionTarget` pattern this part extends to four modes), [[decisions/2026-06-06-atlas-tier0-labour-surface]] (Phase C Part 1 -- the flat-`FormValue` encode/decode idiom), [[decisions/2026-06-06-atlas-tier0-workbench]] (Phase B -- the Tier-0 workbench + `isTierZeroObjective` predicate), and [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the `FormValue` contract)
- **Log:** [[log/2026-06-06-atlas-tier0-boundaries]]

## Context

Phases B / C-1 / C-2 established a per-decision capture pattern: a bespoke
controlled renderer over the unchanged `FormValue`, routed from
`DecisionWorkingPanel` ahead of the generic `hasFields` arm, with detection set in
`buildDecisionTarget`. Each prior surface mapped ONE renderer to ONE decision.

The operator then supplied three mockups (boundaries, stakeholders, stewards) and
chose to converge the Tier-0 workbench onto them, **sequenced Boundaries ->
Stakeholders -> Stewards as three separate sub-projects**, each with its own
spec -> plan -> build -> review cycle. This ADR covers **sub-project 1 (Boundaries)
only.**

The boundaries mockup (`olos_boundaries_legal_mixed_surface.html`) renders the
`s1-boundaries` objective ("Settled site boundaries & legal constraints", 7
checklist items c1-c7). Unlike the vision objective, it routes **each decision item
to a DIFFERENT right-panel body keyed by a MODE badge** -- four distinct legal-capture
shapes across seven items. Today `s1-boundaries` falls through to the MapboxGL map
shell (the Tier-0 predicate was hardcoded to `s1-vision`), so none of this
structured legal capture exists.

Two operator constraints shape the design: **capture data now but defer rich I/O**
(no real spatial map, no real file storage this pass), and **widen the Tier-0
predicate incrementally** to admit `s1-boundaries`.

## Decision

Widen the Tier-0 workbench to `s1-boundaries` and build the multi-mode capture as
ONE self-routing bespoke renderer (`BoundaryCapture`) over an **unchanged
`FormValue`**, routed through a single new panel arm. New code is additive; **no
deletion** ([[feedback-no-deletion]]).

### 1. One mode-routing component, not six arms

Seven items split across four modes (doc / map / mapEntry / decision). Rather than
add six booleans + six arms to `DecisionWorkingPanel`, the panel adds **ONE flag
(`isBoundary`) + ONE body-router arm** that delegates to `BoundaryCapture`, which
switches on `itemId` internally. This mirrors how vision-classify and labour each
add exactly one arm; the four modes and seven ids stay co-located in one component.

**Rationale:** keeps the panel's well-tested router minimal and the boundary modes
cohesive in one file. **Alternatives considered:** (a) **six panel arms** --
rejected: it would bloat the shared router with boundary-specific logic and six
derive-once models; (b) **one component per mode** -- rejected: four near-identical
controlled-renderer shells with duplicated decode/encode/onChange plumbing, when the
modes already share the `(itemId, value, onChange, resolveOptions)` contract.

### 2. Capture data now, defer rich I/O

Operator decision. Map pin/draw is a **static decorative inline SVG** plus a
**disabled "Open map -- coming soon"** affordance -- no MapboxGL in the workbench,
no navigation. File upload is a **metadata-only stub**: `onChange` records a
placeholder `docName`; no file is read or stored. Every "Open map" / "Pin easement"
/ "Draw ROW line" control renders `disabled`.

**Rationale:** the value of this pass is the structured legal data (title status,
easements, zoning, water entitlements, covenants, permits), which persists fully
through `FormValue` today; real spatial + file I/O is a heavier, separable track.
Rendering the deferred affordances `disabled` (not hidden) keeps the surface honest
about what is and is not wired. **Alternative considered:** wait and ship the whole
surface with real map + upload -- rejected: it blocks all structured capture behind
the slowest dependency.

### 3. All seven items persist through the UNCHANGED flat `FormValue`

`BoundaryCapture` reasons with a typed `BoundaryModel` (a discriminated union by
`kind`) but persists the **unchanged** `FormValue` (`Record<string, string |
string[]>`) on the **existing** `actEvidenceStore.visionFormData[itemId]` slice --
the SAME slice vision-classify/labour use. The mode map:

| Item | Mode | Valid when |
|---|---|---|
| c1 Title/deed | doc | `docStatus` set |
| c2 Map boundaries | map | `acknowledged` |
| c3 Easements/ROW | mapEntry | `>=1 easement` OR implications includes 'No implications' |
| c4 Zoning | decision | `zoning` && `reviewFlag` set |
| c5 Water rights | decision | `>=1 source` && `status` set |
| c6 Covenant/heritage | doc | `>=1 obligation` |
| c7 Required permits | decision | always (zero permits is a valid answer) |

The only non-string field (`acknowledged: boolean`) is encoded `'true' | ''`; the
water `entitlement` number is stored as its raw string. `encodeBoundary` /
`decodeBoundary` round-trip losslessly; `decodeBoundary` is TOTAL (coerces
missing/garbage to safe per-mode defaults; a genuinely unknown id falls back to the
`map` default).

**Rationale:** keeps the single-`FormValue` persistence contract and the store
unchanged -- no new slice, no migration. **Alternatives considered:** (a) **a new
rich `boundaryData` store slice** -- rejected: a second persistence shape + a persist
migration for one objective, breaking the single-`FormValue` contract; (b) **store
booleans/numbers natively** -- rejected: `FormValue` is `string | string[]` by
contract; encoding scalars as strings is the established labour idiom.

### 4. Options via the already-threaded `resolveOptions` prop -- no new resolver

The 10 boundary option lists are added as `_base`-only sets to `FIELD_OPTION_SETS`
in `@ogden/shared`, resolved through the **already-threaded** `resolveOptions(setId)`
prop (the same `resolveFieldOptions` path the workbench already passes the panel).
**No new resolver function** is needed -- unlike success-criteria / labour /
vision-classify, boundary options do not vary by project type, so a plain
`_base`-only entry per id suffices. Content ships REVIEW-flagged (verbatim from the
mockup) for operator confirmation.

**Rationale:** reuse the existing option-resolution channel; `_base`-only is the
minimal correct shape for type-invariant lists. **Alternative considered:** a
bespoke `resolveBoundaryOptions` -- rejected: pointless when `resolveFieldOptions`
already handles `_base`-only sets and is already threaded.

### 5. Bespoke validity + summary, derived once, routed before `hasFields`

`DecisionWorkingPanel` adds `isBoundary?: boolean` to `DecisionPanelTarget`, derives
`boundaryModel = decision.isBoundary ? decodeBoundary(decision.itemId, draft) : null`
**once**, and reuses it across the validity arm (`isBoundaryValid(itemId, model)`),
the gate-note arm (mode-derived message via `boundaryModeFor`), the record-summary
arm (`summariseBoundary(itemId, model)`), and the body arm -- mirroring the labour
`labourModel` derive-once pattern. The body-router arm is placed **before** the
generic `hasFields` arm. The helper signatures take `(itemId, model)` because the
model carries the `kind` discriminant; the `_itemId` params are intentionally
underscore-prefixed.

**Rationale:** boundary gate semantics (per-mode required fields; c7 always valid)
and the human-readable summary differ from generic required-field validity.
**Note on precedence:** unlike vision-classify (whose arm MUST be first because
`s1-vision-classify` matches a form tool), `s1-boundaries-c*` items have **no form
tool** in `actToolCatalog.ts`, so there is no `fields` collision -- the boundary arm
need only precede the textarea fallback. It is placed before `hasFields` for
consistency with the established arm order.

### 6. Detection via `item.id` prefix; badges + map strip; predicate widened to a Set

- **Detection:** `buildDecisionTarget` sets `isBoundary =
  item.id.startsWith('s1-boundaries-')` (all 7 items share the prefix; consistent
  with the literal-id detection idiom established in the same function).
- **Mode badges:** `DecisionList` gains an optional `modeFor?: (itemId) => string |
  null` prop; when present it renders a humanised mode badge per row (Document / Map
  / Map + entry / Decision). Absent for `s1-vision` -- no badges, unchanged.
- **Map-activation strip:** the workbench renders a static strip ("2 overlays will
  activate on the map: Risk / Compliance, Site Boundary", REVIEW-flagged copy) above
  the list **only** for `s1-boundaries`.
- **Predicate widened incrementally:** `ActTierShell` replaces the single
  `TIER_ZERO_OBJECTIVE_ID = 's1-vision'` with a membership Set
  `TIER_ZERO_OBJECTIVE_IDS = new Set(['s1-vision','s1-boundaries'])`; both predicates
  (`isTierZeroObjective`, `isTierZeroObjectiveId`) test `.has(...)`. The map shell +
  modal suppression already key off these predicates, so no other shell change is
  needed.

**Rationale:** the Set is purely additive -- the map render path is byte-unchanged,
and because rich map I/O is deferred the workbench is fully self-contained for
`s1-boundaries` (the map shell simply stops mounting for that objective, exactly as
it already does for `s1-vision` -- no map-shell coexistence problem).
**Alternative considered:** keep the single id and special-case `s1-boundaries`
inline -- rejected: a Set scales cleanly to the deferred Stakeholders/Stewards
objectives and reads as intent.

### 7. Deferred sub-projects + inherited status caveats

The **Stakeholders** (sub-project 2: a cross-decision shared register + a mandatory
non-deferrable Indigenous/cultural item + contact/cultural/annotate modes) and
**Stewards** (sub-project 3: the `s1-vision-steward` RBAC/invite track) surfaces are
**out of scope** here; each gets its own spec -> plan -> build. The display-only
status caveats inherited from Phase B still hold: defer remains a display-only
annotation and `planStratumStore` is untouched. Real map spatial capture + real file
upload/storage for boundaries are the deferred rich-I/O track.

## Consequences

- A steward opening the Tier-0 `s1-boundaries` objective sees the non-map 3-pane
  workbench with a map-activation strip and per-row mode badges; each of the 7
  decisions opens its mode-specific body (doc status buttons + metadata-stub upload;
  acknowledge toggle; editable easement rows + implication flags; zoning select +
  permitted-use checks + review flag; water sources + entitlement + unit + status;
  covenant obligations; permit activities + amber advisory). Record stays disabled
  until the mode's validity is met (c7 always valid), then records a readable summary,
  marks the item complete, and advances progress; reopening rehydrates losslessly
  from the flat `FormValue`. Every "Open map" affordance is visibly `disabled`.
- `s1-vision` and every other objective render exactly as the prior phases left them;
  a spatial objective still shows the map shell unchanged.
- Boundary option content + validity heuristics ship REVIEW-flagged; ONE source of
  truth (`FIELD_OPTION_SETS`) keeps any future `<select>` fallback in sync.
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence;
  no store-slice addition or migration.

## Amanah

Structured capture of legal/regulatory land constraints -- title & deed, mapped
boundaries, easements/ROW, zoning & permitted uses, water rights & entitlements,
covenant/heritage obligations, required permits. No sales channel, advance purchase,
financing instrument, or CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- Shared `tsc --noEmit` clean (BT1); web `tsc --noEmit` EXIT 0 (8GB heap, BT7).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): shared fieldOptions (26, incl. the
  `describe('boundary option sets')` block -- presence, non-empty, verbatim
  deep-equal of the 7-item `boundaryZoning` + the `['ML','kL','m3']`
  `boundaryWaterUnit`, unknown-id `[]`, base-only); web `BoundaryCapture` (57, all 4
  modes / 7 ids, controlled-component onChange-payload assertions),
  `DecisionWorkingPanel` (34, boundary arm + precedence + validity),
  `DecisionList` (15, mode badge present/absent), `ActTierZeroWorkbench` (24,
  detection + map strip). 130 web + 26 shared green in one bounded run.
- Two-stage SDD review (spec then code-quality) PASSED for BT2-BT6; BT7 is a
  tsc-only mechanical predicate change (Phase-A/B shell-integration precedent).
- Final whole-implementation review (BT1-BT7): **READY TO MERGE** -- no
  Critical/Important defects. Two Minor cosmetic notes: the BT2-era header comment
  was stale (FIXED -- now lists all 7 ids / 4 modes); the decision-mode gate note is
  generic vs the more specific doc/map/mapEntry notes (left as-is, coherent).
- Live smoke (2026-06-06): <recorded on completion>.

## Alternatives considered

- **Six panel arms instead of one mode-routing component:** rejected -- bloats the
  shared router with boundary-specific logic + six derive-once models.
- **One component per mode:** rejected -- four near-identical controlled-renderer
  shells duplicating decode/encode/onChange plumbing.
- **A new rich `boundaryData` store slice:** rejected -- a second persistence shape +
  a migration for one objective, breaking the single-`FormValue` contract.
- **Store booleans/numbers natively:** rejected -- `FormValue` is `string |
  string[]`; string-encoding scalars is the established labour idiom.
- **A bespoke `resolveBoundaryOptions`:** rejected -- `resolveFieldOptions` already
  handles `_base`-only sets and is already threaded.
- **Ship the whole surface with real map + upload:** rejected -- blocks all
  structured capture behind the slowest dependency; deferred I/O is honest via
  `disabled` affordances.
- **Keep the single Tier-0 id and special-case `s1-boundaries` inline:** rejected --
  a membership Set scales cleanly to the deferred Stakeholders/Stewards objectives.
