# 2026-06-10 -- AdaptiveManagementCapture built + wired into Tier-0 Act workbench

**Objective:** Build the advisory `AdaptiveManagementCapture` (`ev-s7-adaptive-management`, ecovillage EV-S7.9, 5 items c1..c5) and wire it into the Tier-0 Act workbench so the EV-S7 adaptive-management decisions render the designed decision-workbench body (mockup `olos_adaptive_management_act.html` panels p1..p5) instead of the generic checklist/text Act surface. The objective was **already fully authored in the Plan catalogue** ([[entities/act-tier-shell]]; `packages/shared/src/constants/plan/catalogues/ecovillage.ts` EV-S7.9) but resolved to the generic surface -- this task supplies the missing bespoke Act capture, continuing the advisory-capture line (ForageCapture / GrazingSystemCapture / LivestockIntentCapture / HusbandryCapture / BiosecurityCapture / PropagationInfraCapture, [[log/2026-06-10-atlas-propagation-infra-survey-merge]]). Pure governance/ecology/process surface -- no Amanah/finance concern: the p2 capital-reserve trigger and the financial dropdowns are **monitoring thresholds, not advance-sale instruments** (no riba/gharar, no CSA/salam framing).

## What landed

**AdaptiveManagementCapture (`ev-s7-adaptive-management`, EV-S7.9, 5 modes)** -- an S7 ecovillage advisory capture answering "what is a sound adaptive-management protocol for this phase?". Modes c1..c5 (mockup pages p1..p5):

- `review` (c1) -- annual-review setup: timing / duration / facilitator dropdowns + a 7-row agenda toggle-list (each row carries an `ai-source` AI-provenance tag).
- `triggers` (c2) -- 4 decision-trigger cards (ecological / ecological / social / financial), each with verbatim threshold text + per-row response dropdown(s). The financial card is a monitoring threshold only.
- `escalation` (c3) -- 2 escalation tiers (ecological / community), per-row dropdowns + a "filed in" dropdown.
- `documentation` (c4) -- a 6-row "what gets documented" toggle-list + 3 dropdowns (filed in / effective from / notified).
- `fiveyear` (c5) -- review-structure (4 dropdowns) + a 6-row "scope" toggle-list.

- **Advisory pure-FormValue contract**, mirroring PropagationInfraCapture / BiosecurityCapture: **no `projectId`, no store adapter, no map filter, no `handleFormDataSave` branch**; the panel passes `siblingValues` for signature uniformity only. `decodeAdaptiveManagement(mode, value)` is total/defensive (never throws, never fabricates the mockup's UI demo defaults -- empty `FormValue` decodes to all-toggles-off / selects-""); `encodeAdaptiveManagement` is its lossless inverse. Toggle-lists serialize as `string[]` name-subsets; per-row dropdowns as fixed-length positional `string[]` arrays; numeric/selection fields as raw strings. `isAdaptiveManagementValid(mode, value)` (2-arg, sees own value only); `summariseAdaptiveManagement(mode, value, siblingValues?)` (3-arg, defensive on empty).

## 6-site workbench wiring (the established recipe) -- incl. a discovered gap-close

`ActTierShell` `TIER_ZERO_OBJECTIVE_IDS` id (no save branch -- advisory); `ActTierZeroWorkbench` `isAdaptiveManagement = item.id.startsWith('ev-s7-adaptive-management-')` derivation + return field; `workbenchAffordances` MAP entry (advisory: `mapStrips:[]`, `registerStrip:null`, `showGroups:true`, `am-` namespaced `modeFor`); `DecisionWorkingPanel` import + `isAdaptiveManagement?` flag + mode decode + validity arm + summary arm + body-router arm (passes `siblingValues`, no `projectId`); `DecisionList` MODE_LABELS (5 `am-*` entries); `ComponentsDebugPage` c1..c5 gallery sections.

**Gap discovered + closed:** when resuming, three of the six wiring sites were absent -- `ev-s7-adaptive-management` was missing from `TIER_ZERO_OBJECTIVE_IDS`, from `workbenchAffordances` (import + MAP entry), and from `DecisionList` MODE_LABELS. Without them the capture rendered only in the `/v3/components` gallery and never mounted in the live workbench, silently failing the plan's stated outcome. All three were completed (additions placed adjacent to TRACKED/HEAD lines so the surgical `git apply --cached` staging stays clean of foreign WIP).

## MODE_LABELS namespacing (`am-`)

Following the `pi-` / `li-` / `hb-` / `si-` / `bs-` precedent, the affordance layer namespaces every adaptive-management mode `am-` (`workbenchAffordances.modeFor` returns `am-${adaptiveManagementModeFor(itemId)}`, prefix-guarded; `DecisionList` carries five matching `am-*` labels: Annual review / Decision triggers / Escalation / Documentation / 5-year review). `DecisionWorkingPanel` routes off its own un-namespaced `adaptiveManagementModeFor` independently.

## Verification

- Bounded vitest (`--pool=forks --no-file-parallelism --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) over the capture suite + the wiring-site suites: **104/105 passing**. The full AdaptiveManagementCapture suite (round-trip per mode, no-fabrication defensiveness, validity thresholds, summarise-on-empty), `workbenchAffordances`, and `DecisionList` are all green. The single failure (`ActTierZeroWorkbench.test.tsx:499` "does NOT render ... any mode badge for s1-vision") is **foreign**: it finds `mode-badge-s1-vision-labour`, a badge from the concurrent s1-vision labour-grouping feature (commit `91f52d3f`), not from this slice.
- web `tsc`: my component + all six wiring files + the test file are clean (the test file's `noUncheckedIndexedAccess` index-access errors were resolved with `[i]!` assertions matching the sibling-suite idiom). The package-wide tsc gate stays red only on **foreign** terrain WIP (`slopeSurveyStore.ts`, `SlopeSurveyPanel.tsx`, `SlopeSurveySummary.tsx`) which belongs to a parallel session and was left untouched.
- ASCII-only throughout (component, CSS module, test, every added diff line).
- Screenshot gate deferred ([[project-screenshot-hang]]: the `/act` route wedges the MapboxGL renderer + dead dev API; `preview_screenshot`/`preview_snapshot` hang in this session). The c1..c5 `/v3/components` gallery sections were added so a later batch screenshot can close it.

## Mounting / build-ahead

`ev-s7-adaptive-management` is an **ecovillage S7** objective; it mounts live in the Tier-0 workbench once an Ecovillage-type project reaches Stratum 7. The active vertical slice is Homestead (primary) + Silvopasture (secondary), so this is build-ahead relative to the current slice, gallery-verified meanwhile.

## State

Committed on `main` (canonical line, [[project-structured-capture-on-main]]). Surgical commit of this slice ONLY -- the three new files (`AdaptiveManagementCapture.tsx` / `.module.css` / `__tests__/AdaptiveManagementCapture.test.ts`) + `DecisionList.tsx` added whole; my hunks in the five entangled files (`ActTierShell`, `ActTierZeroWorkbench`, `DecisionWorkingPanel`, `workbenchAffordances`, `ComponentsDebugPage`) staged via `git apply --cached` HEAD-context patches, leaving all concurrent-session WIP (ExitSuccession, Ecology/VegetationSurvey, terrain/SlopeSurvey) unstaged and untouched. **NOT pushed -- awaiting operator sign-off** ([[project-branch-rebase]]).

## Next

The sibling `ExitSuccessionCapture` (`ev-s7-exit-succession`) is already in flight in a concurrent session (untracked files present). Continue the advisory-capture line per the Phase 3d roadmap; the EV-S7 ecovillage captures (adaptive-management now done, exit-succession in progress) round out Stratum 7. Entity [[entities/act-tier-shell]].
