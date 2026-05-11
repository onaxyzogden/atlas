---
title: "Plan-stage earthwork utility-conflict veto"
date: 2026-05-10
status: accepted
tags: [plan, observe, safety, built-environment]
---

# Plan-stage earthwork utility-conflict veto

## Context

OBSERVE's Built Environment module (ADDENDUM 9, 2026-05-08) lets stewards
trace buried utilities — water mains, gas, fibre, sewer — as LineString
annotations. The MODULE_GUIDANCE for the module frames buried lines as
the binding constraint on the design ("buried lines bind the design
more than visible structures"). Until now that framing was advisory:
nothing in Plan checked a swale-trace against the recorded utilities.

A steward digging a 60 cm-deep swale on contour across a 60 cm-buried
gas main is a real safety event. Even when the utility is approximately
located, the worst-case cost of being wrong is high enough to warrant
forcing a conscious acknowledgment before persisting the conflict.

## Decision

Block Plan-stage earthworks at `onComplete` when their geometry
intersects (or comes within 3 m of) a `BuriedUtility` recorded for the
same project, **and** the tool declares `earthworkDepthCm > 30`. The
block is a soft veto with override: a modal lists the conflicting
utilities and requires a free-text acknowledgment ("I have located and
confirmed the utility depth") before persistence. On confirm, the record
persists with `utilityConflicts: [{id, kind}]` and
`utilityAcknowledgment: string` fields. On cancel, the in-progress
geometry is discarded.

Conflict surface:

- **Buffer:** 3 m around the utility line, applied uniformly across all
  utility kinds. Matches typical permaculture excavation buffer.
- **Trigger threshold:** `earthworkDepthCm > 30`. Declared per Plan tool
  in `elementCatalog.ts`; tools without the field skip the check.
- **Initial coverage:** WaterSwaleTool (60 cm), WaterStorageTool (pond
  branch, 200 cm), WaterSinkTool (60 cm). Cisterns above grade and
  catchment-polygon tools have no excavation depth.

## Architecture

| Component | Responsibility |
|---|---|
| `plan/utils/utilityConflicts.ts` | Pure helper. Reads `useBuiltEnvironmentStore.getState().buriedUtilities`, buffers each by 3 m via turf, returns conflicts for the candidate geometry. |
| `plan/draw/utilityConflictStore.ts` | Zustand singleton. `open(conflicts, onConfirm, onCancel)` / `close()`. Mirrors `inlineFormStore`. |
| `plan/draw/UtilityConflictDialog.tsx` | Slide-up popover. Lists conflicts, text-capture field (3+ chars to enable Confirm), Confirm / Cancel buttons. |
| `plan/canvas/elementCatalog.ts` | `DesignElementSpec.earthworkDepthCm?: number` added. |
| Affected tools | Call the helper in `onComplete` before the existing persist+form flow. If conflict + depth > 30, open the dialog; only on confirm do they proceed with `addWaterNode` (now patched with conflict fields). |
| `waterSystemsStore.WaterNode` | New optional fields `utilityConflicts?` + `utilityAcknowledgment?`. No migration — fields default `undefined` on existing nodes. |
| `plan/layers/PlanDataLayers.tsx` | New `plan-data-utility-conflict` line layer renders a `#c4422a` 4 px halo around nodes with non-empty `utilityConflicts`. |

## Alternatives considered

- **Hard block** without override — too brittle; OBSERVE traces are
  approximate and stewards know their land better than a sketch.
- **Annotate-only** with red hazard halo — too quiet for an action that
  can kill someone digging into a gas line.
- **Per-kind buffers** (gas 3 m, water 2 m, fibre 1 m) — technically
  more correct but adds a config surface stewards won't tune; 3 m flat
  is conservative and covers worst case.
- **Pre-check before persist** vs. **post-check after persist with
  rollback** — chose pre-check (synchronous), then persist only on
  confirmation. Matches the persist-on-confirm semantics of the
  inline-form Cancel path while avoiding the visual flicker of
  persisting-then-removing on cancel.

## Out of scope

- Per-utility-kind buffer tuning.
- Including building footings, terraces, driveways in the check (those
  belong to a structural-setbacks check that should also consider zoning
  + ROW + neighbour distance — different problem).
- Cross-project conflict detection.
- Veto on edit (drag-handle moves an existing earthwork onto a utility).
  Out of scope for the initial pass; the persisted `utilityConflicts`
  field is computed at create time only.
- Migration for existing earthworks (re-check on read). Existing nodes
  remain untagged until edited.
