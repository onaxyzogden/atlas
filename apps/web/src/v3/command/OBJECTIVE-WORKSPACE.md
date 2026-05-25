# Objective-Driven Workspace — Observe Command Centre

> **Superseded by `OBSERVATION-NEEDS-WORKSPACE.md`** (Observe reframe, 2026-05-25).
> Retained for history until the rename lands.


The Observe stage is run as an **objective-driven workspace**. A steward never
hunts for the right screen, layer, or tool: the *assignment itself* is the entry
point. Launching an assigned objective loads a purpose-built task environment —
the map centred on the area, the objective's tools in the rail, its checklist and
evidence requirements, and the completion logic.

There are two modes and three screens.

- **Command Centre (awareness)** — stage health, the site map, the observation
  timeline, and the list of assigned objectives.
- **Objective Focus Mode (execution)** — the focused workspace launched from an
  objective, ending in completion / review.

---

## Naming

Three "objective" notions already exist in the codebase; this feature adds a
fourth, deliberately named to avoid collision:

| Type | What it is | Where |
| --- | --- | --- |
| `ObserveObjective` | pure predicates over store counts (module-level) | `v3/observe/progress/objectives.ts` |
| `CompassObjective` | compass-wheel nodes | `v3/compass/observeCompassConfig.ts` |
| **`FieldObjective`** | **discrete, location-bound, assignable field-work package** | `v3/objectives/fieldObjective.ts` |

User-facing label for a `FieldObjective` is simply **"Objective"**. Cards live
under "Assigned Objectives".

---

## Screen 1 — Command Centre Overview (ungated)

Route: `/v3/project/$projectId/observe/command-centre`
(`v3/command/ObserveCommandCentrePage.tsx`). The legacy 100%-complete lock was
removed; the overview is always available.

- **Header** — stage label, a one-line readiness summary, and a link to the
  Stage Compass.
- **Full site map** (`SiteMapPanel`) — the parcel with an **objective marker**
  plotted at each objective's `target.center`, coloured by module
  (`OBSERVE_MODULE_DOT`). A completed objective's marker carries a ✓ badge.
  Clicking a marker selects/launches the matching objective.
- **Observation timeline** (`ObservationTimelinePanel`) — reverse-chron feed
  derived from the run store: every captured evidence item and every completion
  surfaces as an event. No separate event log is persisted.
- **Assigned Objectives** (`AssignedObjectivesPanel`) — the launch surface. Each
  card shows the module dot, title, description, location, due date, assignee,
  priority, and a status pill. Clicking a card launches Focus Mode.

**Transition:** clicking a card or its map marker navigates to
`/v3/project/$projectId/observe/$module?objective=<id>` (module taken from
`objective.module`).

---

## Screen 2 — Objective Focus Mode (execution)

Reuses `ObserveLayout`, driven by the `?objective=<id>` search param. On entry:

1. **Map** flies to `objective.target.center` / `zoom` and drops a pulsing
   highlight ring at the target (`ObjectiveMapFocus`).
2. **Left tool rail** narrows to exactly `objective.requiredTools`
   (`ObserveTools` `restrictToTools` prop). Groups with no allowed tool are
   hidden.
3. **Right rail** swaps from module guidance to the **Objective Execution Aside**
   (`ObjectiveExecutionAside`): objective title + description, a readiness
   progress bar + status pill, the checklist, and the evidence requirements.
4. **Banner** (`ObjectiveBanner`) overlays the top of the map — module, title,
   status, and a "← Command Centre" button back to the overview.

The steward works with the exact tools. Ticking checklist items and capturing
evidence advance completion.

### Evidence capture (`ObjectiveEvidenceCapture`)

Capture UI varies by `EvidenceSpec.kind`:

- **photo** — file picker → data URL per file, with a thumbnail strip + remove.
- **annotation** — manual "Mark captured" record (v1; auto-detection of placed
  features is deferred).
- **confirmation** — a single Confirm ↔ Confirmed toggle.
- **note** — a single editable textarea. **A note doubles as the run summary**:
  saving mirrors the text into `run.summary`, so one textarea satisfies both the
  evidence gate and the `requireSummary` gate.

All steward input persists to `fieldObjectiveStore` (per-project, per-objective).

---

## Screen 3 — Completion / Review

Gated by the pure `evaluateObjectiveCompletion(objective, run)` helper, which
checks the objective's `completionRule`:

- `requireAllRequiredChecklist` — every required checklist item ticked.
- `requireAllRequiredEvidence` — every required evidence spec at its `min` count.
- `requireSummary` — `run.summary` is non-empty.

The aside footer reflects status:

- **In progress / needs-review** → **Submit for review** (enabled only when
  `canSubmit`). Submitting sets status `evidence-submitted` and returns to the
  overview.
- **evidence-submitted** → reviewer actions: **Mark complete** (→ `complete`,
  returns to overview) or **Send back** (→ `needs-review`).
- **complete** → a completion confirmation + "Back to Command Centre".

Returning to the overview, the card and map marker reflect the new status and the
timeline gains a completion event (derived from `run.status === 'complete'` +
`updatedAt`).

---

## Architecture

### Data (static catalog / mutable run split)

- `v3/objectives/fieldObjective.ts` — the `FieldObjective` type, the run + evidence
  types, and the pure `evaluateObjectiveCompletion` helper.
- `v3/objectives/seedObjectives.ts` — `SEED_FIELD_OBJECTIVES`: 8 objectives across
  modules at coordinates inside the `mtc` parcel. Wires `module → requiredTools`
  and `requiredLayers`.
- `store/fieldObjectiveStore.ts` — persisted Zustand store keyed
  `byProject[projectId][objectiveId]`. Owns only the mutable run state
  (`checkedChecklist`, `evidence`, `summary`, `status`, `updatedAt`); the catalog
  is never persisted.
- `v3/objectives/useFieldObjectives.ts` — joins catalog + run + completion eval
  into `FieldObjectiveView[]` for every consumer.

### Focus orchestration

- `ObjectiveMapFocus` — flies the camera and renders the highlight marker
  (child of `DiagnoseMap`).
- `ObserveTools` `restrictToTools` — narrows the rail to the objective's tools.
- Layer actuation is intentionally **deferred**: Observe overlays mount
  unconditionally and `requiredLayers` is data-only for v1.

### Evidence is client-only

Photos are stored as data URLs in the persisted run store; there is no upload
backend.
