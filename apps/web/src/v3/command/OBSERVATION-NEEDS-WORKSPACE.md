# Observation Needs Workspace — Observe Stage Reference

**Status:** live reference / implemented · **Date:** 2026-05-25
**Replaces:** `OBJECTIVE-WORKSPACE.md` (deleted when this rename landed)

This document is the live reference for the Observe Command Centre's
**observation-needs workspace** — the reframe away from an *objective-driven,
assignment-flavoured workspace*. The mechanical refactor (rename +
strip-assignment + lifecycle-collapse + `?need=` deep-link + folder moves) has
**landed**; the one remaining follow-on is the generative "Raise observation
need" action (§7).

---

## Why this exists

The Observe stage had drifted into Act territory. The original `FieldObjective` system
was, in substance, an **observation-capture** mechanism — a need completes by capturing
photos / notes / annotations + ticking a checklist + writing a summary. But it was
dressed in work-assignment language: "**Assigned Objectives**," `assignee`, `dueAt`,
"**Submit for review**," "**Mark complete**," reviewer "**Send back**". This reference
describes the corrected `ObservationNeed` system that replaced it.

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

### Code targets (current paths — rename landed)

| Concern | Current path | Key exports |
| --- | --- | --- |
| Type + helpers | [v3/observation-needs/observationNeed.ts](../observation-needs/observationNeed.ts) | `ObservationNeed`, `ObservationNeedStatus`, `ObservationNeedRun`, `RecordingRule`, `RecordingEvaluation`, `evaluateObservationRecorded`, `emptyObservationNeedRun` |
| Seed catalog | [v3/observation-needs/seedObservationNeeds.ts](../observation-needs/seedObservationNeeds.ts) | `SEED_OBSERVATION_NEEDS`, `seedObservationNeedsForProject` |
| Run store | [store/observationNeedStore.ts](../../store/observationNeedStore.ts) | `useObservationNeedStore` (persist key `ogden-observation-needs` v2) |
| Join hook | [v3/observation-needs/useObservationNeeds.ts](../observation-needs/useObservationNeeds.ts) | `useObservationNeeds`, `useObservationNeed`, `ObservationNeedView` |
| Bottom panel | [command/OpenObservationNeedsPanel.tsx](OpenObservationNeedsPanel.tsx) | "Open Observation Needs" — reason line + trigger chip, no assignee/due |
| Command page | [command/ObserveCommandCentrePage.tsx](ObserveCommandCentrePage.tsx) | launches Capture Workspace via `?need=` |
| Capture pieces | `v3/observe/capture/Capture*.tsx` + `command/CaptureMapMarkers.tsx` | `CaptureExecutionAside`, `CaptureBanner`, `CaptureMapFocus`, `CaptureEvidenceCapture`, `CaptureAnnotationAutoCapture`, `CaptureMapMarkers` |
| Deep link | `?need=<id>` | read loosely in `ObserveLayout` (route has no `validateSearch`) |

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
`SEED_OBSERVATION_NEEDS` in [seedObservationNeeds.ts](../observation-needs/seedObservationNeeds.ts):
static, location-bound capture packages keyed to a module, with checklist +
evidence specs. Each seed now carries `origin: 'seed'` + a `reason`; the
slope-12A seed carries a `trigger` ("Recheck after next rainfall") in place of
the old `dueAt`.

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

## 7. What landed, and the one remaining follow-on

The mechanical refactor shipped in three green commits on
`feat/atlas-permaculture`:

- **Types / store / seed / hook / panels / capture workspace renamed.** All
  identifiers moved to the `ObservationNeed` / `Capture*` names in the §2 table;
  assignment (`assignee`, `ObjectiveAssignee`, `dueAt`, review states) is stripped;
  the lifecycle is collapsed to `open → in-progress → recorded` (+`resolved`); the
  terminal action is a single **"Record observation"** button.
- **New fields** `origin` / `sourceObservationId?` / `reason` / `trigger?` /
  `planImpact?` are on the `ObservationNeed` entity and populated on every seed.
- **Deep link** is `?need=<id>` end to end (producer
  `ObserveCommandCentrePage`, consumer `ObserveLayout`).
- **Persist-key migration.** `observationNeedStore` persists under
  `ogden-observation-needs` at `version: 2`. Because the key itself changed, a
  module-load `portLegacyPersist()` reads the old `ogden-field-objectives` blob,
  remaps legacy statuses (`not-started`→`open`, `evidence-submitted`→`in-progress`,
  `complete`→`recorded`, `needs-review`→`in-progress`) and writes the new key, so
  in-progress field state survives the rename.

### Remaining follow-on (deferred)
**Generative path (was §7 step 5)** — a "Raise observation need" action from the
Capture Workspace / a recorded observation that writes a `follow-up` or `manual`
need with `reason` set and `sourceObservationId` linking back. The entity already
carries the fields (§5b); only the action UI is unbuilt.

---

## Out of scope
- The generative "Raise observation need" action above (deferred follow-on).
- Auto-generated needs from stale-data / coverage gaps (§5c).
- Backend persistence of evidence (still client-only data URLs).
- Layer actuation from a need's `requiredLayers` (still data-only).
