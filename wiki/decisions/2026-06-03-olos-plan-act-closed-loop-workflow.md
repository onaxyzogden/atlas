# ADR -- Plan->Act closed-loop / waste-vector workflow (epic)

**Date:** 2026-06-03
**Status:** Accepted (epic in progress -- Phase A, Slice A0 shipped)
**Branch:** `feat/atlas-permaculture`
**Context source:** operator-attached prototype `olos-waste-vector-v2.jsx`

## Context

The operator attached a self-contained React prototype of a closed-loop
material-flow **Plan -> Approval -> Act** workflow and asked "where could it fit?"
Research established it is NOT a drop-in component:

- Its **Plan half** is an ENRICHMENT of an already-real feature -- the
  `closedLoopStore` (`MaterialFlow[]`) + `WasteVectorTool` + `ClosedLoopGraphCard`
  + `useClosedLoopValidation`. The prototype only LOOKED flow-less because it used
  an inline mock (`NODES`/`INIT_FLOWS`), not the store.
- Its **Act half** -- a "Stewardship Routines" command center -- is the missing UI
  for an existing-but-dormant schema. Correction surfaced during design: the routine
  STORE already exists and is full-featured (`stewardshipRoutineStore.ts`,
  per-project CRUD, persist `ogden-olos-stewardship-routines`, API sync). So the Act
  half is "extend schema + build UI", not "build from scratch".

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## Decisions

1. **Realize the prototype as an enrichment, not a new component.** The Plan half
   extends the existing closed-loop surfaces; the Act half builds UI over the
   existing routine store.

2. **Sequencing: Plan-side first** (operator choice). Lowest risk (enriches existing
   surfaces) and it DEFINES the data contract the Act half consumes. Phase A is the
   immediate, fully-sliced work (A0-A4); Phases B (handoff generation) and C (Act
   command center) are scoped and re-detailed when Phase A completes.

3. **Act surface = a dedicated, full-surface three-panel "Resource Flows command
   center"** (operator chose "best UX option"), launched from the Act tier-shell as a
   rail tool / tile -- NOT folded into the 260px right rail. Rationale: the
   prototype's value (the "layout and details" the operator liked) IS its three-panel
   command center, which the narrow rail cannot host. Trade-off recorded vs. the
   rail-mode alternative (smallest IA-consistent change, worse fit); revisit at the
   start of Phase C.

4. **Shared data-model contract via OPTIONAL, back-compat fields on `MaterialFlow`**
   (mirrors the existing optional throughput-fields precedent -- no sibling record;
   runtime reality stays in the existing `WasteVectorRun`):
   `operationalStatus` / `cadence` / `transformationNodeIds` (via-nodes) /
   `activeMonths`. Plus exported config maps `FLOW_OPERATIONAL_STATUS_CONFIG`
   (label/dash/tone; `dash` drives SVG `strokeDasharray`) and `FLOW_CADENCE_CONFIG`.
   These symbols + the later `buildLoopActPayload` are the PUBLIC contract; the Act
   half must NOT redefine the status/cadence enums.

5. **Pure-helper-first discipline** (mirrors `flowCreditStatus.ts` /
   `geometryDiff.ts` / `applyAsBuiltDiff.ts`): every slice ships a tested `.ts`
   helper before any SVG/UI edit.

## Consequences

- Persist `version` bumps use a pass-through `migrate` to preserve undo timelines;
  no rehydrate console error (verified on MTC for v2->v3).
- The Act-half contract is now fixed by Phase A; Phase B's handoff generation maps
  loop data onto the EXISTING `ActHandoffPackageSchema` with NO schema change.
- SVG status rendering will use CSS `@keyframes` (not SMIL) and clamped edge widths.

## Slice status

- **A0 (shipped, `71336025`):** 4 optional `MaterialFlow` fields +
  `FlowOperationalStatus`/`FlowCadence` enums + the two config maps + version 2->3
  pass-through migrate; new pure `flowStatusModel.ts`
  (resolveOperationalStatus / dashForStatus / dashForFlow / cadenceLabel /
  flowIsActiveInMonth) + 9 tests.
- A1-A4: pending (loop design score; per-flow detail editor + integrity; flow-map
  rendering upgrade; approval gate + handoff preview + trigger).
- Phases B, C: scoped, re-detailed when Phase A completes.

## Links

- Detail: [[log/2026-06-03-atlas-closed-loop-slice-a0]]
- Entity: [[entities/closed-loop-workflow]]
- Will consume: [[entities/act-tier-shell]] (Phase C command center)
