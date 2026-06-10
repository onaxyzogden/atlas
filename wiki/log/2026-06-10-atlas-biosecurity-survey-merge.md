# 2026-06-10 -- BiosecurityCapture (Phase 3c-iv) built + wired; husbandry superseded by main

**Objective:** Land Phase 3c-iv: build and wire the advisory `BiosecurityCapture` (`nur-sec-s2-biosecurity-survey`, nursery NUR-S2, 5 items c1..c5) into the Tier-0 Act workbench. Continues the advisory-capture line of ForageCapture / GrazingSystemCapture / LivestockIntentCapture / HusbandryCapture ([[log/2026-06-10-atlas-husbandry-capture]]). Pure ecological/agronomic surface -- no Amanah/finance concern.

## Supersede note (why this branch is biosecurity-only)

Phase 3c-iv was originally scoped as **husbandry + biosecurity** on a shared branch. Mid-flight, `main` advanced ~12 commits and **independently built, wired, and Amanah-cleared its own `HusbandryCapture`** (a superset of the duplicate on the abandoned branch) -- see [[log/2026-06-10-atlas-husbandry-capture]]. Per operator decision (2026-06-10): **drop the duplicate husbandry** (component + wiring discarded, main's canonical copy untouched) and **re-wire only biosecurity fresh onto current `main`**. This mirrors the livestock/silvopasture supersede precedent ([[project-structured-capture-on-main]]). The earlier session's draft abattoir-deferral ADR and the combined husbandry+biosecurity merge log were also dropped (they lived on the abandoned branch and do not carry forward); main's husbandry log is the sole husbandry record, and that log already captures the abattoir-pathway deferral (its Amanah Delta B + the deferred commercial-abattoir block).

## What landed

**BiosecurityCapture (`nur-sec-s2-biosecurity-survey`, NUR-S2, 5 modes)** -- an S2 nursery advisory capture answering "what biosecurity risks threaten the proposed propagation areas, and what is the sanitation baseline?". Modes c1..c5: `soilDisease` (site risk factors + per-pathogen disease risk, e.g. Phytophthora / damping-off) / `insectPest` (propagation environment + per-pest presence, e.g. fungus gnats / aphids / scale) / `weedMedia` (potting-mix sources + weed/contamination risk) / `ingress` (existing plant-material ingress pathways + quarantine/exclusion protocol) / `sanitation` (hygiene baseline -- the ONLY gating mode).

- **Advisory pure-FormValue contract**, mirroring CarryingCapacityCapture / GrazingSystemCapture: **no `projectId`, no store adapter, no map filter**; the panel passes `siblingValues` (`void`-ed in `summariseBiosecurity`, signature uniformity only). `decodeBiosecurity` is total/defensive; `encodeBiosecurity` its lossless inverse. `isBiosecurityValid(mode, value)` (2-arg) gates on `sanitation` alone -- valid only when `bsEntry` + `bsTools` + `bsContainer` are all set; the other 4 modes are always-valid advisory inputs. `summariseBiosecurity(mode, value, siblingValues?)` (3-arg).
- **6-site workbench wiring (the established recipe):** `ActTierShell` `TIER_ZERO_OBJECTIVE_IDS` id; `ActTierZeroWorkbench` `isBiosecurity = item.id.startsWith('nur-sec-s2-biosecurity-survey-')` derivation + return field; `workbenchAffordances` MAP entry (advisory: no strips, `showGroups:true`); `DecisionWorkingPanel` import + `isBiosecurity?` interface flag + mode decode + validity arm + summary arm + body arm (passes `siblingValues`, no `projectId`); `DecisionList` MODE_LABELS (5 `bs-*` entries); `ComponentsDebugPage` c1..c5 gallery.

## MODE_LABELS namespacing (`bs-`)

Following the `li-` (livestock) / `hb-` (husbandry) / `si-` (soil) precedent, the affordance layer **namespaces** every biosecurity mode `bs-`: `workbenchAffordances.modeFor` returns `bs-${biosecurityModeFor(itemId)}`, and `DecisionList` carries five matching `bs-soilDisease` / `bs-insectPest` / `bs-weedMedia` / `bs-ingress` / `bs-sanitation` labels. Applied pre-emptively so the generic mode names never clash with the global label map. The component is untouched; `DecisionWorkingPanel` routes off its own `biosecurityModeFor` independently.

## Verification

- Bounded vitest (`--pool=forks --testTimeout=15000`, [[feedback-vitest-bounded-runs]]) FROM the worktree's `apps/web`: **BiosecurityCapture 24/24** + the four wiring-site suites green -- **155/155 total** across `BiosecurityCapture` + `ActTierZeroWorkbench` (38) + `DecisionWorkingPanel` (57) + `DecisionList` + `workbenchAffordances` (13). The `useRouter must be used inside a <RouterProvider>` lines are pre-existing stderr noise, not failures. ASCII-only throughout (biosecurity files + every added diff line scanned clean).
- web `tsc` (`npm run lint`): **the only error is foreign and pre-existing on `main`** -- `ObserveAnnotationLayers.tsx(253)` is missing `placedZones` in its `subToggles` record after a concurrent session's v15 `placedZones` layer toggle (committed 2026-06-10 to `matrixTogglesStore.ts` + the `LayerSpec['toggleKey']` union) without the matching default-record update. None of the 9 biosecurity files reference layer toggles; the biosecurity code introduces **zero** tsc errors. The foreign red is the concurrent layer-toggle workstream's to close ([[project-structured-capture-on-main]]); not touched here ([[feedback-no-deletion]]).

## State

Worktree `claude/biosecurity-only` based on current `main` (`f85787ef`). Commit `91befb8d`: BiosecurityCapture (`.tsx` + `.module.css` + `.test.tsx`) + the 6 wiring sites (9 files, 2131 insertions). This wiki log committed separately. **NOT pushed -- awaiting operator sign-off** ([[project-branch-rebase]]). Screenshot gate deferred (silvopasture/nursery captures are not in the `/v3/components` map-free harness and the live workbench has a dead dev API + map canvas, [[project-screenshot-hang]]); the c1..c5 gallery sections were added so a later batch screenshot can close it.

## Next session

Phase 3d soil/food (note `SoilImprovementCapture` is already on main), 3e water/energy/settlement, 3f finance (Amanah-screened at kickoff). The abattoir / pre-stun commercial-slaughter pathway remains deferred to Scholar Council review. Entity [[entities/act-tier-shell]].
