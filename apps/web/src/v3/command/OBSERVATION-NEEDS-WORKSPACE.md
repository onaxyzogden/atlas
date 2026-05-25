# Observation Needs Workspace — Observe Stage Spec

**Status:** spec / not yet implemented · **Date:** 2026-05-25
**Supersedes:** `OBJECTIVE-WORKSPACE.md` (same directory)

This document specifies the reframe of the Observe Command Centre from an
*objective-driven, assignment-flavoured workspace* into an **observation-needs
workspace**. It is the authoritative design for a future, separately-approved code
session. No code changes accompany this document.

---

## Why this exists

The Observe stage drifted into Act territory. Today's `FieldObjective` system is, in
substance, an **observation-capture** mechanism — a need completes by capturing
photos / notes / annotations + ticking a checklist + writing a summary. But it is
dressed in work-assignment language: "**Assigned Objectives**," `assignee`, `dueAt`,
"**Submit for review**," "**Mark complete**," reviewer "**Send back**".

That language pulls Observe into work-management. The real work-assignment machinery
already lives in **Act** (the `WorkItem` spine, `crewMember`, dependency edges in
[packages/shared/src/schemas/workItem.schema.ts](../../../../../packages/shared/src/schemas/workItem.schema.ts)
and [crewMember.schema.ts](../../../../../packages/shared/src/schemas/crewMember.schema.ts)).
So Observe's "assignment" is **language drift, not a duplicated system** — which makes
the correction mostly a reframe plus one genuinely new capability (generative needs).

---

## 1. The rule & the clean stage boundaries

> **Observe does two things only:** it manages recorded observations, and it expresses
> observation-related *needs*. It does **not** assign work.

```
Observe  →  records reality + names what still needs observing
Plan     →  decides what should happen in response to observed reality
Act      →  assigns and completes the work required to carry out the plan
```

**Observe owns:**

- observation records
- evidence (photos, notes, audio, annotations, measurements)
- map annotations
- domain coverage
- observation gaps
- open observation needs
- follow-up questions
- stale-data warnings
- **plan-impact flags**

**Observe does NOT own:**

- assigning people
- scheduling labour
- managing crews
- executing repairs
- moving livestock
- maintaining infrastructure
- completing physical work orders

Those belong to **Act**, after **Plan** decides the response.

### Developer Rule (verbatim — for code review)

```
The Observe Stage must not function as a task-management system.

Observe manages:
- recorded observations
- evidence
- observation gaps
- open observation needs
- plan impact flags

Observe may surface observation needs, but assignment, scheduling, and responsibility
management should be handled by Act after Plan determines the appropriate response.
```

### Product Sentence

> **Observe is where the system manages what has been seen, what still needs to be
> seen, and what may require the Plan to change.**

---

## 2. Terminology + code-rename map

Both the user-facing copy **and** the code identifiers change. The user chose to rename
at the code level, so the future session renames types, stores, hooks, and components —
not only copy.

| Old (UI) | New (UI) | Old (code) | New (code) |
| --- | --- | --- | --- |
| Assigned Objectives / Ongoing Observe Tasks | **Open Observation Needs** | `AssignedObjectivesPanel` | `OpenObservationNeedsPanel` |
| Objective | **Observation Need** | `FieldObjective` | `ObservationNeed` |
| Objective Focus Mode / Objective Workspace | **Observation Capture Workspace** | `Objective*` focus pieces | `Capture*` |
| Task Queue | **Observation Needs Queue** | — | — |
| Complete Task / Submit for review / Mark complete | **Record Observation** | `evaluateObjectiveCompletion` | `evaluateObservationRecorded` |
| Task Assignment | **Act Work Assignment** (lives in Act, not Observe) | — | Act `WorkItem` |

### Code targets (confirmed present today)

| Concern | Current path | Rename / change |
| --- | --- | --- |
| Type + helpers | [v3/objectives/fieldObjective.ts](../objectives/fieldObjective.ts) | `FieldObjective`→`ObservationNeed`, `ObjectiveStatus`→`ObservationNeedStatus`, `ObjectiveRun`→`ObservationNeedRun`, `CompletionRule`→`RecordingRule`, `evaluateObjectiveCompletion`→`evaluateObservationRecorded` |
| Seed catalog | [v3/objectives/seedObjectives.ts](../objectives/seedObjectives.ts) | `SEED_FIELD_OBJECTIVES`→`SEED_OBSERVATION_NEEDS`, file→`seedObservationNeeds.ts` |
| Run store | [store/fieldObjectiveStore.ts](../../store/fieldObjectiveStore.ts) | →`observationNeedStore.ts`, migrate persisted key |
| Join hook | [v3/objectives/useFieldObjectives.ts](../objectives/useFieldObjectives.ts) | →`useObservationNeeds.ts`, `FieldObjectiveView`→`ObservationNeedView` |
| Bottom panel | [command/AssignedObjectivesPanel.tsx](AssignedObjectivesPanel.tsx) | →`OpenObservationNeedsPanel.tsx`, copy "Assigned objectives"→"Open Observation Needs" |
| Command page | [command/ObserveCommandCentrePage.tsx](ObserveCommandCentrePage.tsx) | copy + wiring |
| Focus pieces (all `Objective*`, in `v3/observe/objective/` + `v3/command/`) | `ObjectiveExecutionAside`, `ObjectiveBanner`, `ObjectiveMapFocus`, `ObjectiveEvidenceCapture`, `ObjectiveAnnotationAutoCapture`, `ObjectiveMapMarkers` | →`Capture*` naming |
| Folders | `v3/objectives/`, `v3/observe/objective/` | →`v3/observation-needs/`, `v3/observe/capture/` |
| Deep link | `?objective=<id>` | →`?need=<id>` — **URL-contract change**; update every producer/consumer of the param |

---

## 3. Strip assignment from Observe

The user chose to remove assignment/review machinery from Observe entirely.

- **Remove `assignee` / `ObjectiveAssignee`** and the `User` chip in the panel. Who does
  the work is an Act concern.
- **Remove `dueAt` as a labour deadline.** Replace with an optional **re-observation
  trigger** — a *condition*, not a schedule (e.g. "recheck after next rainfall", per the
  slope-12A example). A trigger lives in the observation domain; a deadline implies
  scheduled labour, which is Act's.
- **Replace the review/assignment lifecycle.** Today:
  `not-started → in-progress → evidence-submitted → complete → needs-review`.
  New recording lifecycle:

  ```
  open → in-progress → recorded   (optionally → resolved)
  ```

  Drop reviewer "Send back" / "Mark complete" entirely — review is Plan/Act.
- **The terminal action is "Record observation."** It closes the need, emits a timeline
  event, and updates coverage. There is **no review gate inside Observe**. Whether the
  recorded reality warrants intervention is decided by Plan.

---

## 4. Command Centre reframe

Same three-panel awareness layout, corrected language and semantics.

- **Map** — observation points, domain layers, coverage gaps, recorded evidence, and
  **areas needing more observation**. Markers represent *needs*, not assignments. A
  recorded need's marker carries a ✓.
- **Right rail — Observation Timeline** — what has already been recorded
  (reverse-chron). Substance unchanged.

  ```
  Today — 10:42 AM
  Hydrology / Livestock
  Water point checked at North Paddock
  Evidence: 3 photos · 1 note · 1 mud-impact flag
  Plan Impact: Possible
  ```

- **Bottom — Open Observation Needs** — unresolved needs, **not** assigned work orders.
  Each card shows: domain, title, location, priority, status pill, and **why this need
  exists**. **No assignee. No due-date chip.**

  ```
  OPEN OBSERVATION NEEDS

  [Water point condition needs follow-up]
  North Paddock · Hydrology / Livestock · High

  [Recheck slope 12A after next rainfall]
  Topography / Hazards · Medium
  ```

- Clicking a need opens the **Observation Capture Workspace**, framed as:

  > "To resolve this observation need, capture the following evidence."

  Never: "You have been assigned this task."

---

## 5. Where Observation Needs come from (BOTH sources)

The user chose to support both a seeded catalog and generative needs.

### a. Seeded catalog
`SEED_OBSERVATION_NEEDS` (renamed `seedObjectives.ts`). Mechanism unchanged: static,
location-bound capture packages keyed to a module, with checklist + evidence specs.

### b. Generative — a recorded observation can raise a follow-up need
Extend the `ObservationNeed` entity:

```ts
origin: 'seed' | 'follow-up' | 'manual';
sourceObservationId?: string;   // back-link to the record that raised this need
reason: string;                 // why this need exists (shown on the card)
trigger?: string;               // optional re-observation condition (replaces dueAt)
```

From the Capture Workspace (or a recorded observation), the steward — or the system —
can **raise a follow-up observation need**. Example: a record showing low water level +
algae + trampling raises *"Water point condition needs follow-up"* with `reason` set and
`sourceObservationId` linking back.

### c. Candidate auto-source (note, NOT built in the first refactor)
Stale-data / coverage gaps from
[computeFieldVerification.ts](../../../../../packages/shared/src/fieldVerification/computeFieldVerification.ts)
time-decay weighting, plus the existing GapsPanel, could surface **system-generated**
needs (`origin: 'follow-up'` with no `sourceObservationId`, or a new `'auto'` origin).
Flagged as a follow-on; out of scope for the first refactor.

---

## 6. Plan-impact boundary

Observe **surfaces** a `planImpact` flag but never acts on it.

```ts
planImpact?: 'none' | 'possible' | 'likely';
```

- Carried on observation records and on needs.
- Shown in the timeline ("Plan Impact: Possible") and optionally on need cards.
- **Observe never creates recommendations, monitoring requirements, or work items.**
  Plan reviews the flag and decides the response; Act assigns and executes.

This is the single most important invariant: a `planImpact` flag is a *signal to Plan*,
not a trigger for work inside Observe.

---

## 7. Staged refactor checklist (future code session)

Ordered so the later session is mechanical. Watch the rebased branch
(`feat/atlas-permaculture`) — commit each slice the moment it builds.

1. **Types** — in `fieldObjective.ts`: rename type + helpers; strip
   `assignee`/`ObjectiveAssignee`/`dueAt` and the review states; add
   `origin`/`sourceObservationId`/`reason`/`trigger`/`planImpact`; collapse lifecycle to
   `open → in-progress → recorded` (+`resolved`).
2. **Store / hook / seed** — rename `fieldObjectiveStore`→`observationNeedStore` (migrate
   persisted key), `useFieldObjectives`→`useObservationNeeds`,
   `seedObjectives`→`seedObservationNeeds`.
3. **Bottom panel + page** — rename `AssignedObjectivesPanel`→`OpenObservationNeedsPanel`;
   update `ObserveCommandCentrePage` copy; remove assignee + due-date chips.
4. **Capture workspace** — rename focus pieces to `Capture*`; change deep-link
   `?objective=`→`?need=` across every producer/consumer.
5. **Generative path** — add a "Raise observation need" action (from the capture
   workspace / a recorded observation) that writes a `follow-up`/`manual` need.
6. **Folder + imports** — `v3/objectives/`→`v3/observation-needs/`; fix all imports; run
   `npm run build` + tests.
7. **Docs** — fold this spec's content into a rewritten `OBSERVATION-NEEDS-WORKSPACE.md`
   as the live reference; delete `OBJECTIVE-WORKSPACE.md` (or its superseded banner) once
   the rename lands.

---

## Out of scope for the first refactor
- Auto-generated needs from stale-data / coverage gaps (§5c).
- Backend persistence of evidence (still client-only data URLs).
- Layer actuation from a need's `requiredLayers` (still data-only).
