# B3.1 Editable Rotation-Adherence Companion — Design Spec

## Context

B3 Rotation Adherence shipped as a strictly render-only audit
surface (commits `254ab499` → `290035bd` → `0a0d64e0` → `623ece42`
→ `5c2a28a5`, plus polish trio `4b17a535`; ADR
`wiki/decisions/2026-05-19-atlas-b3-rotation-adherence.md`).
The B3 ADR explicitly named an **editable companion** as
out-of-scope, with a load-bearing covenant: *"any later editable
companion would be a separate slice with its own brainstorm →
spec → plan cycle and would NOT introduce spine-status mutation
from inside the adherence engine."* This spec opens that cycle.

**Why now.** The polished read-only surface ranks drift but offers
no repair affordance. Stewards see the list and must context-switch
to the full `RotationPlanCard` to enact the fix. Per-row inline
editors collapse that loop without duplicating the canonical plan
editor.

**Intended outcome.** A new render-only `sectionId`
`plan-livestock-rotation-adherence-actions` mounting a sibling
card to the existing adherence audit. Each ranked recommendation
gets a focused inline editor matched to its `AdherenceKind`. Save
writes only to `rotationPlanStore`. A deep-link affordance to the
Plan Execution Tracker hands users off to log a corrective task
without this surface ever touching the D4 single-writer
`fulfilWorkItem` orchestrator or `WorkItem.status`.

---

## Resolved decisions (locked)

| Fork | Decision |
|---|---|
| Mounting | **Per-row inline editor.** Mirrors D2.1 `ResourcingEditor` on `TaskItem`. Closest to the drift signal. Companion mounts beside (not inside) the existing audit card. |
| Editable kinds (v1) | **Patch-only, 4 of 5 kinds editable.** `overgrazed` → reduce `targetGrazeDays`; `under-rested-reentry` & `short-rest` → increase `targetRestDays`; `unplanned-paddock` → "Fold into plan" form that calls `upsertCell` with a new cell. `early-move` → advisory only (no editor; the fix is operational logging, not planning). |
| Move-log edits | **Excluded forever.** `LivestockMoveEvent` log is immutable audit trail per D4 / move-log covenant. Corrections logged as new events only. |
| Save semantics | **Explicit Save / Cancel per inline editor.** D2.1 precedent. Local `useState` draft, single store write on Save, draft discarded on Cancel. |
| Corrective WorkItem affordance | **Deep-link to pre-filled tracker.** Each row gets a "Schedule make-good task" button that pushes a non-persisted draft into a new in-memory `useWorkItemDraftStore` slice (no `persist`, no `syncManifest`), then signals `PlanExecutionTrackerCard` to consume + clear on next mount. No spine write from this surface. |
| Empty state when light = ok | **Same on-track empty as the audit card.** Visual parity with sibling. |
| Light↔card relationship | **Independent renders from one engine result.** Both cards call `computeRotationAdherence()` from the same inputs and render fully independently. No shared state, no derived store. |

---

## Architecture

### File structure

```
apps/web/src/features/livestock/
├── RotationAdherenceCard.tsx               # (unchanged, render-only audit)
├── RotationAdherenceCard.module.css        # (unchanged)
├── RotationAdherenceActionsCard.tsx        # NEW — render-host with per-row inline editors
├── RotationAdherenceActionsCard.module.css # NEW — styles, mirror existing palette
├── editors/                                # NEW — one editor per AdherenceKind
│   ├── OvergrazedEditor.tsx                # patches cell.targetGrazeDays
│   ├── RestEditor.tsx                      # patches cell.targetRestDays
│   ├── UnplannedPaddockEditor.tsx          # adds a new cell via upsertCell
│   └── index.ts                            # barrel
├── rotationAdherence.ts                    # (unchanged engine)
└── __tests__/
    └── RotationAdherenceActionsCard.test.tsx  # NEW — happy-dom test suite

apps/web/src/store/
└── workItemDraftStore.ts                   # NEW — in-memory draft channel; NO persist, NO syncManifest

apps/web/src/v3/plan/
├── types.ts                                # MODIFY — append one row to MODULE_CARDS.livestock
├── PlanModuleSlideUp.tsx                   # MODIFY — lazy import + one render case
└── PlanExecutionTrackerCard.tsx            # MODIFY — consume + clear pending draft on mount (one useEffect)
```

### Data flow

```
RotationAdherence engine result
        │
        ├─→ RotationAdherenceCard          (read-only, ranked recs)
        │
        └─→ RotationAdherenceActionsCard   (NEW, parallel render)
                │ per recommendation row:
                │   - severity badge
                │   - message
                │   - [Edit] button         → opens kind-matched inline editor
                │   - [Schedule make-good]  → pushes WorkItemDraft
                │
                ├─ inline editor (Save) → rotationPlanStore.upsertCell()
                │                          (next render: engine reruns, drift may clear)
                │
                └─ Schedule make-good   → workItemDraftStore.setDraft({ … })
                                          PlanExecutionTrackerCard useEffect:
                                          if (draft) { open new-task form prefilled; clearDraft() }
```

### Covenant invariants

- **No `WorkItem.status` read or write** from anywhere under
  `apps/web/src/features/livestock/editors/` or
  `RotationAdherenceActionsCard.tsx`. Enforced by a test
  `not.toMatch` grep on each new source file.
- **No financing lexicon.** Existing covenant regex
  `/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`
  clean on every new file.
- **Writes only to `rotationPlanStore`** from this surface.
  `workItemDraftStore` is a *draft* channel — render-only payload
  passing, no spine write happens from the draft store itself.
- **No persist, no `syncManifest`.** `workItemDraftStore` is
  in-memory only and survives only the current tab lifetime.
- **No schema change** to `WorkItem`, `LivestockMoveEvent`, or
  `RotationPlanCell`.
- **No new `PlanModule`** member; no `Record<PlanModule, _>`
  reshape; one append to `MODULE_CARDS.livestock`.

---

## Critical files (read at implementation time)

Existing (do **not** modify except where called out):
- `apps/web/src/features/livestock/rotationAdherence.ts` — engine; `AdherenceRecommendation` carries `{ id, severity, kind, message, paddockId? }`. No `cellGroup` pointer; editors look cells up via `paddockId`.
- `apps/web/src/store/rotationPlanStore.ts` — write target. Actions: `setPlan`, `upsertCell`, `removeCell`, `setPlanOptions`, `clearPlan`. Cells keyed by `paddockId`.
- `apps/web/src/features/livestock/RotationAdherenceCard.tsx` — sibling read-only card.
- `apps/web/src/features/livestock/RotationPlanCard.tsx` — canonical full plan editor; companion must **complement** not duplicate.
- `apps/web/src/v3/plan/PlanExecutionTrackerCard.tsx` — D2.1 `ResourcingEditor` host; Save/Cancel state-machine reference.
- `apps/web/src/features/plan/ResourcingEditor.tsx` — inline editor UX precedent.
- `apps/web/src/v3/plan/types.ts` — `MODULE_CARDS.livestock` array.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — lazy-import + render case pattern.

---

## Out of scope (binding)

- Editing `LivestockMoveEvent` records — move log is immutable.
- Auto-creating `WorkItem`s from this surface — deep-link to tracker only; user clicks the tracker's own Save.
- Touching the move-log schema, work-item schema, `syncManifest`, or any persisted store version.
- Editing `early-move` recommendations — advisory only.
- Mutating `WorkItem.status` from anywhere under `features/livestock/` — enforced by automated grep.
- Visualising the rotation plan on the map — separate concern.

---

## Verification (end-to-end)

1. `pnpm --filter @ogden/web typecheck` → exit 0.
2. `pnpm --filter @ogden/web test` → all green (baseline 127 files / 1358 tests + new files).
3. Covenant grep + spine-status grep clean on all new files.
4. Visual: Plan stage → Livestock module → seed drift → open "Rotation adherence — actions" card → click `[Edit]` on a HIGH overgrazed row → reduce `targetGrazeDays` → Save → engine reruns → row severity drops or disappears. Then click `[Schedule make-good task]` on a remaining row → tracker section opens with title + notes prefilled.
5. ADR + log committed; wiki/index.md updated in the session-close commit only (not stapled to a task commit).

---

## Execution handoff

After this spec is approved, `superpowers:writing-plans` produces
the executable plan, then `superpowers:subagent-driven-development`
executes task-by-task with two-stage review per task.
