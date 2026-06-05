# 2026-05-31 -- Act tier-shell: Record-observation flow, contained exec header, rail checklist progress

**Branch.** `feat/atlas-permaculture` (three explicit-path slice commits
`6e5ff3bc` Slice 1 -> `63c23ce8` Slice 2 -> `79c8c05f` Slice 3; rebased
out-of-band, divergence-checked 0 behind / N ahead, **not pushed**). Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`. ADR:
[[decisions/2026-05-31-atlas-act-record-observation-emits-datapoint]].

Three operator requests on the production Act tier-shell right-rail execution
panel ([[entities/act-tier-shell]]), each an independent slice.

## Slice 1 -- Arm the Record-observation button (`6e5ff3bc`)

The `recordBtn` was a disabled stub (gated only on `total > 0 && done === total`,
checklist completion). Operator wanted it to (a) write a real `ObserveDataPoint`
on click and (b) enable only once BOTH the checklist AND every REQUIRED evidence
item are satisfied -- realizing the stage reframe ("Act executes and collects;
Observe synthesizes read-only"): completing an objective emits a persisted
observation into the Observe substrate.

[ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx)
only (1 file):
- New imports `useState`/`useEffect`; type `ObserveDataPoint` + value
  `getPrimaryDomainForObjective` from `@ogden/shared`; `useObserveDataPointStore`;
  `type EvidenceCapture` from `actEvidenceStore`.
- Module-level pure `isEvidenceSatisfied(descriptor, capture)` -- photo count >=
  target / confirm true / note saved.
- `domainId = useMemo(getPrimaryDomainForObjective(objective))` (returns
  `UniversalDomain | null`, exactly `ObserveDataPoint.domainId`'s type -- TS-safe,
  schema-valid). `evidenceReady = evidence.filter(required).every(isEvidenceSatisfied)`;
  `ready = checklistReady && evidenceReady && domainId !== null`. The progress BAR
  stays checklist-only ("{done}/{total} steps").
- Session-local `recorded` flag, reset on `objective.id` change.
- `handleRecord()` builds the point (`crypto.randomUUID()`,
  `sourceType: 'manual_observation'`, `statusOutput: 'clear'`,
  `locationGeometry: null`, `cycleId: 0`, `measurementValue` = objective title +
  joined saved notes, `capturedAt: new Date().toISOString()` [event handler, the
  `Date.now()` ban is store-`set`-only], `capturedBy: 'act-tier'`), calls
  `recordDataPoint`, sets `recorded`.
- Button: `disabled={!ready || recorded}` + `onClick` + label flips to
  "Observation recorded".

**Accepted scope cut (named):** `ObserveDataPoint` links by `domainId`, not
`objectiveId`, so the "This need's activity / No observations recorded" section
cannot be filtered to THIS objective; left as-is. Post-record feedback is the
local `recorded` relabel only; full activity-feed wiring deferred.

## Slice 2 -- Contained exec-panel header (`63c23ce8`)

Mirror `ActTierObjectiveRail`'s `.railPanel` / `.railHeader`: the header block
(eyebrow/title/status/desc) + the progress bar are bundled into one bordered
region with a `border-bottom` divider above the body.

- [ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx)
  -- wrapped `.execHeader` + `.execProgress` in a new `.execHeaderBox`; wrapped
  the three sections + record button in a new `.execBody`. No content change.
- [ActTierExecutionPanel.module.css](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.module.css)
  -- `.execPanel` drops `padding`/`gap` (-> 0) and adds `overflow: hidden` so the
  inner divider meets the rounded corners; new `.execHeaderBox` (flex col, 12px
  gap, `14px 14px 12px` padding, `border-bottom`); new `.execBody` (flex col, 14px
  gap, 14px padding -- restores the spacing the old flat `.execPanel` provided).

## Slice 3 -- Rail reflects the checklist, not field actions (`79c8c05f`)

`ActTierObjectiveCard` read "No tasks yet" whenever `progress.total === 0`. Root
cause: the rail consumed `computeObjectiveProgress(objectives, actions)` (counts
FIELD ACTIONS by `planObjectiveId`), while the objective's actual checklist lives
in `objective.checklist` + `planStratumStore`. An objective with a full checklist
but zero logged field actions read `total: 0` -> "No tasks yet" even though the
panel correctly showed "2/7 steps".

- [objectiveProgress.ts](apps/web/src/v3/act/tier-shell/objectiveProgress.ts) --
  new pure `computeChecklistProgress(objectives, completedByObjective)`: counts
  completed checklist items per objective against `checklist.length`;
  `state` complete/active/available; `verified` carries the done-count (reuses the
  shared `ObjectiveProgress` shape). Import widened to `PlanStratumObjective`.
- [ActTierShell.tsx](apps/web/src/v3/act/tier-shell/ActTierShell.tsx) --
  `checklistProgressByObjective = useMemo(computeChecklistProgress(objectives,
  planProgress))`; passed to `ActTierObjectiveRail` ONLY. `ActTierMapMarkers`
  keeps the field-action `progressByObjective` (markers legitimately track logged
  work -- unchanged semantics).
- [ActTierObjectiveCard.tsx](apps/web/src/v3/act/tier-shell/ActTierObjectiveCard.tsx)
  -- label `${progress.verified}/${progress.total} done` (was "verified");
  "No tasks yet" now only for a genuinely empty checklist; header comment updated.

## Verification

- **tsc:** `apps/web` -- my five slice files clean; the only errors (4) were in
  untracked **foreign WIP** (`ProtocolLayerPanel.tsx` + its test), not touched.
- **Live preview** (typed project "Baseline Test Homestead",
  `/v3/project/8a815400-80c3-4413-93a4-0a0030f372d3/act`), DOM via `preview_eval`
  + `preview_inspect` + two `preview_screenshot`s:
  - Slice 3: the six rail cards read "1/5 done" / "0/6 done" / "0/5 done" / ... ,
    NOT "No tasks yet"; chip updates as items complete.
  - Slice 2: `.execHeaderBox` confirmed `border-bottom: 1px solid` framing the
    header + "100% ready / 5/5 steps" progress above the CHECKLIST divider.
  - Slice 1: button disabled at checklist 1/5; after completing all 5 items +
    Checkpoint photos 3/3 + summary note, it enabled. Click wrote exactly one
    `ObserveDataPoint` (`byProject[PID]` 0 -> 1) with
    `sourceType:'manual_observation'`, `statusOutput:'clear'`,
    `capturedBy:'act-tier'`, matching `projectId`, `domainId:'climate'` (the
    primary domain resolved for `s2-terrain`), `label:'Survey terrain &
    topography'`; button relabeled to "Observation recorded" and re-disabled.
  - A transient Vite HMR full-reload burst (commits normalizing CRLF touched file
    mtimes) bounced the page to the foreign-WIP default `/plan?planMode=protocol`
    mid-flow; settled after a few seconds, then the single-eval flow completed.
    `preview_screenshot` worked this session (no WebGL hang).

## Process / covenant

Three explicit-path slice commits (own files by name, never `git add -A`;
`git diff --cached --name-only` before each; committed the moment each verified
per [[feedback-commit-immediately-on-rebased-branches]]). Commit messages written
BOM-free via bash heredoc (UTF-8, no BOM) + `git commit -F`. Branch fetched +
divergence-checked before the work (0 behind). Foreign WIP untouched
([[feedback-no-deletion]]); CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy.

**Deferred (named):** filter the "This need's activity" feed to the objective's
own observations (blocked on `ObserveDataPoint` linking by `domainId` not
`objectiveId`); persist the `recorded` feedback flag beyond the page session.
