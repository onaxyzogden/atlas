# 2026-06-06 -- Tier-0 Stakeholders surface (Phase C Part 3, sub-project 2 of 3: shared register + cultural Amanah item)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits `8f4b0bad`/`f676ba49`/`3849c8cd`/`e6e86c27`/`7f5ba370`/`684192de`/`f645ad45` for ST1-ST6, then mockup-reconciliation `6d7005d5`/`e6ee4984`/`4c076105`/`41ddc7da` for SR-A..SR-D; **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl.md` (Phase C Part 3, tasks ST1-ST8 + the SR-A..SR-D mockup refit).
- **Decision:** [[decisions/2026-06-06-atlas-tier0-stakeholders]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Phase C Part 3 sub-project 2 widens the Tier-0 workbench from `s1-vision` +
`s1-boundaries` to also cover **`s1-stakeholders`** ("A mapped picture of
stakeholders & community", 6 mandatory items c1-c6 in two groups), building the
capture from the operator mockup `olos_stakeholders_mixed_surface.html`. It is the
**second of three** sequential sub-projects (Boundaries [shipped] -> Stakeholders
-> Stewards); Stewards (RBAC/invite) is deferred to its own plan.

This is the **first Tier-0 surface whose authoritative state is a project-level
SHARED REGISTER, not per-item `FormValue`** -- items 1-4 build a register of
stakeholder records, items 5-6 annotate the same records. That departure drove the
core design choice (Option A, store-direct capture). It builds on / reuses the
Tier-0 workbench, working panel, the per-item completion/rationale/defer path, the
threaded `resolveOptions` prop, and the `DecisionList` `modeFor` badges established
in Phases B and C Parts 1-3-sub1.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-06-atlas-tier0-stakeholders]].)

- **Option A -- store-direct capture, panel keeps the completion marker.**
  `StakeholderCapture` subscribes to the new `stakeholderRegisterStore` directly
  and does register CRUD inline; the panel's per-item `FormValue` + `onRecord`
  degrade to a thin per-item completion MARKER that still flows through
  `actEvidenceStore` (`saveVisionFormData` + `setItemComplete`). Capture owns
  register I/O; panel owns completion + rationale + defer.
- **Zustand v5 stable-snapshot trap (the #1 risk), fixed by construction.**
  Reactive consumers (panel validity, workbench reg-strip count) select the STABLE
  raw object `s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID` (frozen constant)
  and derive the array/count via `useMemo` -- never a fresh-array `listForProject`
  selector (which would infinite-loop). Pure helpers take a register snapshot.
- **One shared `StakeholderRecord` register store**, NEW
  `apps/web/src/store/stakeholderRegisterStore.ts`, mirroring `proofRecordStore.ts`
  minus api/sync: `byProject[projectId][id]`, create/update/delete/list/get, a
  verbatim private `mutate`, persist `ogden-stakeholder-register` v2 + partialize
  byProject, frozen `EMPTY_STAKEHOLDERS_BY_ID`. Builder items create rows; annotate
  items update fields on existing rows; c3 "none ack" is a marker, not a row.
- **c3 mandatory NON-DEFERRABLE (Amanah).** `DecisionPanelTarget` gains
  `deferrable?: boolean`; `buildDecisionTarget` sets it `false` only for
  `s1-stakeholders-c3`; the footer hides defer when `deferrable === false`. c3 is
  ALWAYS valid and records a 5-status cultural model (`not-investigated` default,
  `enquiry-no-obligations`, `active-consultation`, `assessment-required`,
  `formal-protocol`) + notes in the marker -- silence is never completion.
- **Per-item modes + validity decoupled from completion.** `stakeholderModeFor`:
  c1 `mapContact`, c2 `contact`, c3 `cultural`, c4 `contact`, c5/c6 `annotate`.
  Post-mockup, only c1 (>=1 neighbour) and c2 (>=1 authority) can be invalid;
  c3/c4/c5/c6 always valid (the old "none toggle" escape-hatch logic was removed).
  `recorded` comes from the per-item marker, NOT row counts, so each item completes
  independently though all share one register; the capture is keyed on itemId so
  switching items never loses register state.
- **Workbench strips + badges + predicate.** Two strips render for
  `s1-stakeholders` only: a static map-strip ("2 overlays active on map") and a
  LIVE reg-strip (count via the stable-snapshot pattern, "stakeholders in
  register", ASCII note "Items 1-4 build the register - Items 5-6 annotate it").
  `DecisionList.MODE_LABELS` extended with the 4 stakeholder labels.
  `ActTierShell` adds `'s1-stakeholders'` to `TIER_ZERO_OBJECTIVE_IDS`.
- **Options via the already-threaded `resolveOptions` prop** -- `_base`-only
  stakeholder sets in `FIELD_OPTION_SETS`, content reconciled verbatim to the
  mockup (SR-A). No new resolver.

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

Initial architecture-first build (mockup not yet supplied; visual/copy REVIEW-flagged):

- **ST1 `8f4b0bad`** -- `feat(shared)`: stakeholder surface `_base`-only option
  sets + tests; shared tsc clean.
- **ST2 `f676ba49`** -- `feat(act-tier0)`: `stakeholderRegisterStore` project-level
  shared register (mirror proofRecordStore minus API) + tests.
- **ST3 `3849c8cd`** (+ tidy `e6e86c27`) -- `feat(act-tier0)`: `StakeholderCapture`
  store-direct capture + pure helpers (`stakeholderModeFor` / `isStakeholderValid`
  / `summariseStakeholder`) + tests; REVIEW-skeleton visual.
- **ST4 `7f5ba370`** -- `feat(act-tier0)`: wire the stakeholder arm + non-deferrable
  footer + reactive stable-snapshot rows + `projectId` prop into
  `DecisionWorkingPanel`.
- **ST5 `684192de`** -- `feat(act-tier0)`: `buildDecisionTarget` detection +
  `deferrable` + `DecisionList` mode badges.
- **ST6 `f645ad45`** -- `feat(act-tier0)`: widen the Tier-0 predicate to
  `s1-stakeholders` (tsc-only, per BT7 precedent).

Mockup-reconciliation refit (operator supplied `olos_stakeholders_mixed_surface.html`,
which IS the resolution of REVIEW flags R1-R8):

- **SR-A `6d7005d5`** -- `feat(shared)`: reconcile stakeholder option sets with the
  mockup (neighbour/community types, relationship tones incl. `tension`, comms
  channels, authority categories). (Store-side `RelationshipStatus` +`tension` /
  `commsChannels[]` + persist v2 migrate bundled into SR-B.)
- **SR-B `e6ee4984`** -- `feat(web)`: pixel-faithful `StakeholderCapture` rewrite
  (authority-category buttons, 5 verbatim cultural-status cards, relationship-tone
  + comms-channel pills, c3 marker-only + always valid); `commsChannel` ->
  `commsChannels: string[]`, `RelationshipStatus` +`tension`, persist v1 -> v2
  migrate. Removed all none/culturalNone toggle logic.
- **SR-C `4c076105`** -- `feat(web)`: align `DecisionList` badge labels
  (Map + contact / Contact entry / Cultural / Annotate register) + simplify the
  panel stakeholder gate-note copy to the only two reachable states (c1/c2); fixed
  the 4 tests that asserted pre-rewrite behaviour (55/55 pass).
- **SR-D `41ddc7da`** -- `feat(act-tier0)`: workbench map-strip + LIVE reg-strip
  (count via the stable-snapshot pattern; ASCII note); 34/34 workbench tests.

## Verification

- **Shared `tsc --noEmit`** clean; **web `tsc --noEmit`** EXIT 0 (8GB heap).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green: shared fieldOptions (stakeholder sets);
  web `stakeholderRegisterStore`, `StakeholderCapture` (modes/helpers/CRUD/cultural
  marker), `DecisionWorkingPanel` (stakeholder arm + non-deferrable + precedence +
  reactive validity, 55/55), `DecisionList` (mode badges), `ActTierZeroWorkbench`
  (detection + both strips + live reg-count, 34/34).
- **Two-stage SDD review** (spec then code-quality) PASSED per task; SR-B verified
  twice (controller Read + spec-compliance reviewer) before commit -- both
  confirmed full mockup compliance, c3 Amanah-correct, Zustand trap avoided.
- **Final whole-implementation review (ST8): READY TO MERGE.** A background
  code-reviewer read all 9 in-scope source files + 5 test files + the reference
  `proofRecordStore.ts` and consumer `ActTierShell.tsx`, and CONFIRMED all 7
  design decisions: (1) Option A store-direct capture with the panel marker
  flowing through `actEvidenceStore`; (2) the Zustand v5 stable-snapshot pattern
  in ALL THREE reactive consumers (`DecisionWorkingPanel`, `ActTierZeroWorkbench`,
  `StakeholderCapture`) -- no `listForProject` inside any selector; (3) c3
  non-deferrable + always-completable (Amanah safeguard genuine); (4) per-item
  modes via `stakeholderModeFor`; (5) completion decoupled from register row
  counts; (6) store mirrors proofRecordStore minus api/sync incl. v1->v2 migrate
  (`commsChannel` -> `commsChannels[]`); (7) `_base`-only option sets via the
  threaded `resolveOptions`. No Critical/Important issues; a few Minor/Nit notes
  (annotate row order is insertion-order not `createdAt`-sorted; c4 "Add another"
  yields generic duplicate community rows per the mockup; `getState()` action
  read at render is intentional). In-scope suites re-ran green: 152 web tests
  (StakeholderCapture 40, ActTierZeroWorkbench 34, DecisionWorkingPanel 39,
  DecisionList 16, stakeholderRegisterStore 23) + 33 shared (fieldOptions).
  ASCII-clean across all in-scope files. (Full-monorepo `tsc` OOM'd -- an
  environment memory limit, not a code error; the per-package web tsc passed
  EXIT 0 earlier under the 8GB heap.)
- **Live preview smoke (ST8): PASSED.** Driven against project
  `4adc26e9-55ab-426d-bd48-8d793ce18c30` (the running preview's project; the API
  was at 503 "Server unreachable" but the Tier-0 stakeholders workbench is
  self-contained -- local-persisted register, no map, no API -- so it renders and
  functions fully). Screenshot captured (no-screenshot-no-claim satisfied).
  Confirmed: non-map 3-pane workbench (0 canvases / 0 mapbox elements); both
  strips render ("2 overlays active on map" + live "stakeholders in register"
  count with the ASCII note); all 6 mode badges (Map + contact / Contact entry /
  Cultural / Contact entry / Annotate register / Annotate register); **c3 has NO
  defer button** (`deferPresent: false`) yet is recordable (default
  "not-investigated"; all 5 cultural-status cards render verbatim) -- the Amanah
  safeguard, verified live; c1 builder add -> "Add to register" -> reactive
  reg-strip count 1 (proves the stable-snapshot reactive path) + localStorage
  `ogden-stakeholder-register` row persisted -> Record -> tick ("1 / 6 decisions
  made"); c5 annotate wrote `relationshipStatus: "goodwill"` onto the SAME c1 row
  (update, not a new row), with all 5 relationship tones incl. `tension`
  rendering; register PRESERVED across c1 <-> c5 <-> c3 switches (count stays 1,
  row + completion intact); s1-vision and s1-boundaries still render their
  workbenches (0 canvases); a spatial S2 stratum objective still mounts the map
  shell (1 canvas, no workbench) -- the predicate widening is purely additive.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first bytes
verified non-BOM); `git diff --cached --name-only` / commit stat confirmed after
each commit; `git fetch` + divergence check before each; foreign WIP NEVER staged
or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]); not
pushed; ASCII-only. **Amanah:** data capture of stakeholder/community
relationships -- no sale, advance-purchase, financing, or CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean. c3
(Indigenous/cultural) is non-deferrable by design and recordable without forcing a
false positive (explicit "not investigated" / "no obligations" options) -- a
deliberate safeguard, documented in the ADR Amanah section.

## Deferred

- **Stewards surface** (sub-project 3): the `s1-vision-steward` RBAC/invite track
  (queued-invite UI; real invite + role enforcement is the known-deferred RBAC
  track). Own spec -> plan -> build.
- **Real map spatial capture + real contact I/O** for stakeholders (spatial
  affordances are rendered `disabled`, per the boundaries deferred-I/O precedent).
- No `planStratumStore` touch; no API/DB persistence (register is local-persisted).
