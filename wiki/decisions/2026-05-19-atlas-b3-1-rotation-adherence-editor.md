# 2026-05-19 — B3.1: Editable rotation-adherence companion

**Status:** Implemented & verified (typecheck / vitest / covenant grep /
spine-status grep); committed as **explicit-path per-task commits** on
`feat/atlas-permaculture` (seven `feat(b3.1)` / `fix(b3.1)` per-task +
this `docs(b3.1)` close), **not pushed** (branch rebased out-of-band;
push is a separate explicit instruction).

**Context source.** The B3 ADR
([[2026-05-19-atlas-b3-rotation-adherence]]) shipped a strictly
render-only adherence surface and *explicitly* called out "Edit
affordances on the adherence surface … would be a separate slice with its
own brainstorm → spec → plan cycle." B3.1 is that cycle — a
full brainstorm → spec → plan → implementation sequence executed in a
subsequent session. B3.1 does not reopen or amend the B3 engine or
render-only card; it adds an *independent* sibling card that mounts the
edit affordances alongside the read-only surface.

## Resolved design forks

Five binding forks resolved at brainstorm / spec stage before any code:

1. **Mounting: per-row inline editor.** Each drift row in
   `RotationAdherenceActionsCard` renders its own editor inline,
   collapsing into view below the row header on "Edit" press — mirrors
   exactly the D2.1 `ResourcingEditor` pattern already established in the
   codebase.
2. **Editable kinds: patch-only, 4 of 5.** Only plan-cell attributes that
   the steward can legitimately correct are exposed:
   - `overgrazed` → graze days (`targetGrazeDays`)
   - `under-rested-reentry` + `short-rest` → rest days (`targetRestDays`)
   - `unplanned-paddock` → fold-in via `rotationPlanStore.upsertCell`
   - `early-move` → **advisory only**, no edit affordance (early exit is
     a management decision, not a plan calibration)
3. **Move-log immutable forever.** `LivestockMoveEvent` records are never
   edited or deleted by B3.1 (or any B-series slice). The actual-move
   history is the steward's field record; plan data absorbs corrections.
4. **Save semantics: explicit Save/Cancel per editor.** No auto-save, no
   global form. Matches D2.1 and the grounding principle that corrections
   to a rotation plan are intentional steward decisions.
5. **Corrective WorkItem: in-memory draft channel.** When an adherence
   issue warrants a corrective action, the card emits a `WorkItemDraft`
   via `workItemDraftStore` (Zustand, in-memory only — no `persist`, no
   `syncManifest`). A tracker banner consumes the draft and offers
   Create (calls existing `useWorkItemStore.addItem`, preserving the D4
   single-writer `fulfilWorkItem`/`unfulfilWorkItem` invariant) or
   Dismiss.

## Architecture

### Files delivered

| Path | Role |
|---|---|
| `apps/web/src/store/workItemDraftStore.ts` | In-memory Zustand draft channel — `setDraft` / `clearDraft`, no persist |
| `apps/web/src/features/livestock/editors/OvergrazedEditor.tsx` | Graze-days patch editor for `overgrazed` kind |
| `apps/web/src/features/livestock/editors/RestEditor.tsx` | Rest-days patch editor for `under-rested-reentry` + `short-rest` |
| `apps/web/src/features/livestock/editors/UnplannedPaddockEditor.tsx` | Fold-in editor for `unplanned-paddock` via `upsertCell` |
| `apps/web/src/features/livestock/editors/index.ts` | Barrel re-export |
| `apps/web/src/features/livestock/RotationAdherenceActionsCard.tsx` | Sibling render host: reads same engine result as `RotationAdherenceCard`, mounts per-row editors |
| `apps/web/src/features/livestock/RotationAdherenceActionsCard.module.css` | Flex-column layout; editor stacks below row header |

### Data-flow

```
rotationAdherence engine (pure, read-only)
        |
        v
RotationAdherenceActionsCard   (reads: rotationPlanStore, rotationAdherence result)
        |                      (writes: rotationPlanStore.upsertCell — plan cells only)
        |                      (emits: workItemDraftStore.setDraft — in-memory only)
        |
        v
tracker banner (outside features/livestock/)
        |
        +--> useWorkItemStore.addItem (Create)   ← existing D0 store, D4 single-writer
        +--> workItemDraftStore.clearDraft (Dismiss)
```

### Plan registration

`apps/web/src/v3/plan/types.ts` — new `sectionId`
`'plan-livestock-rotation-adherence-actions'` appended to the `livestock`
module, after `'plan-livestock-rotation-adherence'`. Append-only: no
existing entry reordered or mutated.

`apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — one lazy import +
one `case 'plan-livestock-rotation-adherence-actions'` render arm.

## Covenant attestations

- **Covenant lexicon grep** (`/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`)
  over all 7 new B3.1 source files: **ZERO matches** on every file.
  Strictly agronomic / ecological vocabulary throughout.
- **Spine-status invariant grep** (`/WorkItem\.status|useWorkItemStore/`)
  inside `features/livestock/` (ActionsCard + all three editors):
  **ZERO matches**. The tracker banner that calls `useWorkItemStore.addItem`
  lives *outside* `features/livestock/` — it is not in scope of this
  invariant, and it calls `addItem` (creation), never a status transition.
- **No schema change** to `WorkItem`, `LivestockMoveEvent`, or
  `RotationPlanCell`.
- **No `persist`** on `workItemDraftStore`; **no `syncManifest`** entry.
- **No financing lexicon** on any new file.
- **D4 single-writer invariant preserved:** `fulfilWorkItem` /
  `unfulfilWorkItem` are the only status-transition writers; the tracker
  banner's Create path calls `addItem` (a distinct creation action, not a
  transition), leaving the D4 invariant intact.

## Verification

- **Web test suite:** 137 files / 1 441 tests — all green. Net +14 test
  files and +83 tests vs the post-B3 polish baseline (127 files /
  1 358 tests): `workItemDraftStore.test.ts` (8), `OvergrazedEditor.test.tsx`
  (6 incl. covenant + cancel), `RestEditor.test.tsx` (6 incl. cancel),
  `UnplannedPaddockEditor.test.tsx` (6 incl. cancel),
  `RotationAdherenceActionsCard.test.tsx` (4 happy-dom).
  The `layerFetcher` ECONNREFUSED lines are the expected offline-fallback
  path (no API server in the test environment), not failures.
- **`@ogden/shared` typecheck:** exit 0, fully clean.
- **`@ogden/web` typecheck:** exit 0, fully clean.

## Commit ledger

| SHA | Task | Subject |
|---|---|---|
| `dad596d5` | T1 | `workItemDraftStore` in-memory draft channel + tests |
| `8bd0a7a6` | T2 (initial) | per-kind editors (Overgrazed / Rest / UnplannedPaddock) + barrel + tests |
| `f5dd723b` | T2 (review fixes) | Cancel tests for Rest + Unplanned + drop non-null assertions |
| `867a716b` | T3 (initial) | `RotationAdherenceActionsCard` render host + happy-dom test |
| `2ad5be64` | T3 (review fix) | CSS: stack editor below row header (`flex-direction: column` on `.recRow`) + comment header |
| `7f0d1ab0` | T4 | tracker draft-banner consumes `WorkItemDraft` (Create uses existing `addItem`; spine-status invariant preserved) |
| `7deff5c1` | T5 | append-only registration of `plan-livestock-rotation-adherence-actions` |

`wiki/index.md` deliberately **not modified** in this commit (handled as
a separate session-close step, per B3 / D5 ADR precedent).

## Out of scope (reaffirmed)

- `LivestockMoveEvent` log — **immutable forever**; no edit or delete
  affordance, now or in future B-series slices.
- `early-move` kind — advisory only; no edit button rendered.
- `WorkItem.status` mutation from inside `features/livestock/` — outside
  the D4 single-writer boundary; enforced by static-source grep above.
- Any schema bump to `WorkItem`, `LivestockMoveEvent`, or `RotationPlanCell`.
- `workItemDraftStore` persistence — channel is ephemeral by design;
  cleared on Dismiss and on unmount.
