# 2026-06-10 -- PropagationInfraCapture (Phase 3d-i) built + wired + merged to main

**Objective:** Land Phase 3d-i: build and wire the advisory `PropagationInfraCapture` (`nur-sec-s1-propagation-infra-survey`, nursery NRS-S1.1, 5 items c1..c5) into the Tier-0 Act workbench third column. First capture of Phase 3d (soil & food / nursery systems); continues the advisory-capture line of ForageCapture / GrazingSystemCapture / LivestockIntentCapture / HusbandryCapture / BiosecurityCapture ([[log/2026-06-10-atlas-biosecurity-survey-merge]]). Pure ecological/agronomic + infrastructure surface -- no Amanah/finance concern (the p5 media-sourcing cost figures are ordinary input pricing, fiqh-clear).

## What landed

**PropagationInfraCapture (`nur-sec-s1-propagation-infra-survey`, NRS-S1.1, 5 modes)** -- an S1 nursery advisory capture answering "what propagation infrastructure and growing-media supply already exists on site, and what is its condition and capacity?". Modes c1..c5 (mockup pages p1..p5):

- `infraInventory` (c1) -- structure register: type chips (Glasshouse / Shade house / Polytunnel / Prop. bench / Mist unit / Cold frame / Hotbed) + name / area-m2 / year, with a live Structures / m2-total summary strip.
- `condition` (c2) -- per-structure condition (Excellent / Good / Fair / Poor) + usable-m2 + notes, with a capacity summary (usable area + structures-needing-attention).
- `mediaInputs` (c3) -- on-site media checklist (Compost / Woodchip / Leaf mould / Topsoil / Worm castings / Biochar / Sand-grit) with m3/yr quantities.
- `compostCapacity` (c4) -- a **live compost calculator**: `turnovers = floor(WEEKS_PER_YEAR / weeks)`, `annual = bays * bayVolume * turnovers`, compared against `COMPOST_NEED = 20 m3`; thresholds `>= COMPOST_NEED * SURPLUS_MULTIPLIER (1.1)` surplus / `>= COMPOST_NEED` adequate / else insufficient warning. Bays stepper 1..20, bay-volume default 1.4, weeks stepper step 2 range 4..52.
- `mediaSourcing` (c5) -- external sourcing register: Perlite ~$140/m3, Coir ~$80/m3, Sharp sand/grit ~$45/m3, Biochar (external) ~$320/m3, Bark fines "Low / free", Vermiculite ~$160/m3 (verbatim from the mockup), with tri-state availability (In stock / Seasonal / Order req.).

- **Advisory pure-FormValue contract**, mirroring BiosecurityCapture / CarryingCapacityCapture: **no `projectId`, no store adapter, no map filter, no `handleFormDataSave` branch**; the panel passes `siblingValues` (signature uniformity only). `decodePropagationInfra` is total/defensive; `encodePropagationInfra` its lossless inverse. Register rows are serialized as parallel column-wise `string[]` arrays (the Biosecurity precedent -- `FormFieldValue = string | string[]` forbids object arrays). Numeric fields stored as raw strings (preserve "0"). `isPropagationInfraValid(mode, value)` (2-arg); `summarisePropagationInfra(mode, value, siblingValues?)` (3-arg).

## 6-site workbench wiring (the established recipe)

`ActTierShell` `TIER_ZERO_OBJECTIVE_IDS` id (no save branch -- advisory); `ActTierZeroWorkbench` `isPropagationInfra = item.id.startsWith('nur-sec-s1-propagation-infra-survey-')` derivation + return field; `workbenchAffordances` MAP entry (advisory: no strips, `showGroups:true`, `pi-` namespaced `modeFor`); `DecisionWorkingPanel` import + `isPropagationInfra?` flag + mode decode + validity arm + summary arm + body arm (passes `siblingValues`, no `projectId`); `DecisionList` MODE_LABELS (5 `pi-*` entries); `ComponentsDebugPage` c1..c5 gallery sections (labels catalogue-verbatim from nursery.ts).

## MODE_LABELS namespacing (`pi-`)

Following the `li-` / `hb-` / `si-` / `bs-` precedent, the affordance layer namespaces every propagation-infra mode `pi-` (`workbenchAffordances.modeFor` returns `pi-${propagationInfraModeFor(itemId)}`; `DecisionList` carries five matching `pi-*` labels). `DecisionWorkingPanel` routes off its own un-namespaced `propagationInfraModeFor` independently.

## Two documented mockup-fidelity divergences (both accepted, both contract-driven)

1. **c2 capacity summary renders 2 of the mockup's 4 rows.** The omitted rows ("Total floor area", "Effective capacity") derive from c1's inventory -- a *sibling* item -- which the advisory no-cross-read contract forbids reading, and which the mockup's own c2 panel has no input for (the floor-area figure is inherited read-only text). Reproducing them would require either a forbidden cross-read or adding controls absent from the mockup. Accepted as a documented contract-driven divergence (same ethos as the SoilImprovementCapture omitted-page precedent).
2. **c1 summary "assessed" stat is a static `0`.** This faithfully mirrors the mockup (olos_propagation_infra.html:454), whose own JS never updates this counter either -- "assessed" is a c2 condition datum, again unreadable under the advisory contract. A clarifying code comment marks it intentional (not a forgotten TODO).

Neither is a defect; both are consequences of correctly honoring the advisory contract while matching the mockup.

## Verification

- Bounded vitest (`--pool=forks --testTimeout=15000`, [[feedback-vitest-bounded-runs]]) FROM the worktree's `apps/web`: **PropagationInfraCapture 32/32** (incl. defensive `computeCompost` cases: non-finite `weeks` stays finite, zero-weeks guard yields 0) + the wiring-site suites green.
- web `tsc` (`npm run lint`): exit 0, no output. ASCII-only throughout (all three new files + every added diff line: 0 non-ASCII bytes).
- Two-stage review (superpowers:subagent-driven-development): spec-review SPEC-COMPLIANT (2 [INFIDELITY] flags resolved as the documented divergences above); code-quality review APPROVED after a small polish pass (named `WEEKS_PER_YEAR` / `SURPLUS_MULTIPLIER` consts, dropped an orphaned doc-comment, added the two defensive compost tests, documented the static-`0` stat).
- Screenshot gate deferred (nursery captures are not in a map-bearing slice and the live workbench has a dead dev API + map canvas, [[project-screenshot-hang]]); the c1..c5 `/v3/components` gallery sections were added so a later batch screenshot can close it.

## Mounting / build-ahead

`nur-sec-s1-propagation-infra-survey` is a **secondary** nursery objective. The active slice is Homestead (primary) + Silvopasture (secondary); `resolveProjectObjectives` loads secondary objectives only when that secondary type is selected, so this capture mounts live only once **nursery** is added as a secondary -- build-ahead relative to the current slice, gallery-verified meanwhile.

## State

Worktree `claude/phase-3d` (commits `edbf797f` build+wiring, `e253e187` post-review polish) merged `--no-ff` into `main` as `1643ffc5` (11 files, 2163 insertions). A concurrent session's uncommitted WIP in the `main` checkout (`LabourInventoryCapture.*`, `packages/shared/.../fieldOptions.ts`, `.claude/launch.json`) was left untouched by the merge. **NOT pushed -- awaiting operator sign-off** ([[project-branch-rebase]]).

## Next

Phase 3d-ii PropagationWaterCapture (`nur-sec-s1-water-survey`, 5 modes), then 3d-iii/iv/v (propagation-strategy, growing-media, cultivar-rootstock), then 3d-vi FoodSystemCapture (`ev-s4-food-system`, 6 modes) -- which runs a **blocking Amanah copy-review + operator sign-off before any code is written** (communal-sale / contribution copy, ecovillage-primary). The food_system Amanah read-only review is already complete: no prohibited surface, 2 SCOPE-NOTE items to encode as visible Amanah flags (P4 "Sold -- proceeds to community fund" = sale of possessed surplus, not advance-sale; P2 "Financial contribution in lieu" = labour make-good levy, not riba). Entity [[entities/act-tier-shell]].
