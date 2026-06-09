# 2026-06-09 -- ForageCapture (Phase 3b) merged to main; GrazingSystemCapture built + held

**Objective:** Close the OLOS-UI mockup-adoption session: land the completed Phase 3b ForageCapture work on the canonical `main` line and push to `origin`, while holding the partially-complete GrazingSystemCapture back on the feature branch.

## What landed

**ForageCapture (`silv-sec-s3-forage-survey`, SILV-S3.20)** -- the full Phase 3b vertical, merged into `main` via merge commit `1e3834ce` (`--no-ff` of the last forage commit `554aecde`, deliberately excluding the two grazing commits on top). Brings:

- `forageZoneSync.ts` adapter + `DSE_PRESETS` (13 verbatim mockup condition-class presets); `diffForagePaddocks` writes one `draft:true`, `forage:`-tagged `Paddock` per non-empty zone so the `carrying-capacity-seasonal` formula (c3) auto-satisfies. Forage drafts are filtered from the map at `PlanDataLayers.tsx` but still counted by capacity rollups.
- `ForageCapture.tsx` + 5 mode bodies (P1 zones / P2 seasonal / P3 capacity / P4 constraints / P5 toxic), mirroring the `CarryingCapacityCapture` multi-mode contract; toxic-plant Latin binomials transcribed verbatim.
- 11-site workbench wiring: `TIER_ZERO_OBJECTIVE_IDS`, `ActTierZeroWorkbench` `isForage`, `workbenchAffordances` MAP entry, `DecisionWorkingPanel` arm (passes `projectId`), `DecisionList` MODE_LABELS (zones/seasonal/capacity/constraints/toxic), `ComponentsDebugPage` gallery, Record-time store write in `ActTierShell.handleFormDataSave`.

## Merge reconciliation

The branch had diverged: 12 commits ahead of `main`; `main` carried the concurrent **OLOS copy-module** commit `83a66eee` ("central copy module + 10 mentor rewords"), which heavily rewrote `DecisionList.tsx` (541 lines) and touched `ActTierZeroWorkbench.tsx`. Two conflicts, both resolved keeping **both** sides:

- `ActTierZeroWorkbench.tsx` -- reordered so the `isForage` derivation precedes the steward `deferLabel` comment block (return object already carried `isForage` via auto-merge).
- `DecisionList.tsx` -- took HEAD's copy-module version wholesale (already had the carrying-capacity MODE_LABELS block + the landscape-block fix) and appended only forage's unique 6-line forage MODE_LABELS block. `DecisionWorkingPanel.tsx` auto-merged clean.

Verification on the merged tree: web `tsc` exit 0; bounded vitest (`--pool=forks --testTimeout=15000`) 78/78 green across forageZoneSync (36), forageReconcile (8), ForageCapture (11), DecisionList (23).

## Held back (NOT on main)

**GrazingSystemCapture (`silv-sec-s4-grazing-design`, SILV-S4.20, 6 modes)** -- built + unit-tested (27/27) and committed on `claude/forage-capture` (`0eb12c3f` + closing-review cleanup `44ad52fe`), but **intentionally not merged**: the component exists yet is **unwired** (no `TIER_ZERO_OBJECTIVE_IDS` entry, no `DecisionWorkingPanel` arm, no affordance, no screenshot gate). Per operator decision this session ("hold grazing back"), only the fully-wired Forage work landed. The two grazing commits remain on the branch for next session's wiring (Phase 3c-i resume).

The grazing capture is advisory-only (c6 `satisfiesWhenComputed:false`): it needs **no** store adapter and **no** `projectId` (the `paddock-stocking-density` formula reads forage-written paddocks independently) -- mirror `CarryingCapacityCapture`, not `ForageCapture`, when wiring.

## State

`main` pushed to `origin/main` (canonical line; the prior `feat/structured-capture` line was merged out-of-band earlier, [[project-structured-capture-on-main]]). Concurrent-session working-tree files (`.claude/launch.json`, untracked `wiki/log/2026-06-05-mapsheet-export-server-id-aware.md`) left untouched throughout; the foreign `exportDiagnoseBrief.test.ts.snap` was never staged ([[feedback-no-deletion]]).

**Amanah:** ecological/agronomic capture only -- pasture zones, seasonal forage, carrying capacity, grazeable-area constraints, weed/toxic-plant survey. No sale/advance-purchase/financing/CSRA/salam surface -- clean.

## Next session

Phase 3c-i resume: wire GrazingSystemCapture at its ~7 integration sites (no adapter/projectId/map-filter -- advisory), screenshot-verify `/v3/components` grazing sections vs `olos_grazing_system_design.html`, then merge. Then Phase 3c-ii LivestockIntentCapture, 3c-iii HusbandryCapture (Amanah copy-review gate first). Entity [[entities/act-tier-shell]].
