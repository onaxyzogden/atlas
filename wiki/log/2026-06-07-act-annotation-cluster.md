# 2026-06-07 — Act tier-shell was missing the Observe annotation form/select/edit cluster

**Closed.** Operator: "placed soil sample on map is not editable nor did it
present the form like it should."

Placing a soil sample (or any Observe point/line/polygon annotation) on the
**Act tier-shell** map dropped the pin but never slid up the lab-values form,
and the placed pin could not be selected, edited, or dragged — unlike the
identical tool on the Observe surface.

## Root cause — only half the Observe draw stack was mounted on Act

`SoilSampleTool` (and its siblings) finish a draw by writing a provisional stub
(`createWithDefaults`) and calling `annotationFormStore.open(...)`. The form is
rendered by a **single mounted `<AnnotationFormSlideUp>`** that reads that store;
selection is rendered by `<SelectionFloater>` reading `observeSelectionStore`.

`ObserveLayout` mounts `ObserveDrawHost` **next to** the full interaction
cluster — `AnnotationDragHandler`, `AnnotationVertexEditHandler`,
`AnnotationFormSlideUp`, `SelectionFloater`, `AnnotationDetailPanel`.

`ActTierShell` mounted only `ObserveAnnotationLayers` (pin render +
click-to-select) and `ObserveDrawHost` (the draw tool). The form host, selection
floater, drag/vertex handlers, and detail panel were **absent**. So on Act:
placement flipped `annotationFormStore.active` with nothing rendering the form,
and selection populated `observeSelectionStore` with nothing showing
Edit/Delete/Move or enabling drag — "not editable nor presented the form."

## Fix — mount the same five components ObserveLayout pairs with ObserveDrawHost

In `apps/web/src/v3/act/tier-shell/ActTierShell.tsx`, after `<ObserveDrawHost>`
in the `DiagnoseMap` children:

- `<AnnotationFormSlideUp />` — core: renders the create form on placement + the
  edit form (re-used verbatim, store-driven singleton).
- `<SelectionFloater projectId={id} />` — Edit / Move / Delete / Clear pills.
- `<AnnotationDragHandler map={map} />` — single-point drag-reposition.
- `<AnnotationVertexEditHandler map={map} />` — line/polygon vertex edit.
- `<AnnotationDetailPanel projectId={id} />` — read-only detail w/ Edit+Delete.

No new components, no prop changes, no Observe edits. All five are
store-/selection-driven singletons that portal out and bind **disjoint** layers
from the Act handlers (`ActFeatureClickHandler` binds only `plan-data-poly-fill`),
so they compose cleanly. They write to the **shared** Observe annotation stores —
Act-placed *execution* annotations, not Plan decisions; `PlanDataLayers` stays
`editable={false}` per the ADR-7 note already in the file ("Act adds, it does not
edit Plan decisions").

Commit `391bfb43` on `feat/structured-capture-forms` (branch switched
out-of-band mid-task), **not pushed**. 20 insertions, one file.

> External-rebase hazard hit live: the first application of this edit (plus a
> stale wiki log) was **wiped by an out-of-band rebase** that also restructured
> ActTierShell.tsx (JSX moved ~1022 → ~817). Re-applied against the new tree and
> committed immediately — consistent with the standing "commit immediately on
> rebased branches" memo.

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — clean on the rebased tree + this edit.
- Bounded vitest (`--pool=forks --testTimeout=20000`) over `src/v3/act` +
  `src/v3/observe/components` — **506 passed**. One **pre-existing, unrelated**
  failure (`actToolCoverage` — three silvopasture secondary objectives s5/s6/s7
  lack `OBJECTIVE_ACT_TOOLS_OVERRIDE` entries in `@ogden/shared`, a file this
  change does not touch; the test never imports `ActTierShell`). Left untouched.
- **Live DOM proof** on `/v3/project/mtc/act/tier-shell` (web 5200 + api 3001 up;
  `preview_eval`, since `preview_screenshot` hangs on the WebGL map): driving
  `annotationFormStore.open({kind:'soilSample', mode:'create'})` renders the
  `aria-label="Soil sample"` dialog with the full lab-values fields; selecting a
  created soil sample renders the `Selection actions` toolbar with
  `Edit | Move | Delete | Clear`. Both were absent on Act before this change.
  Test record + selection cleaned up after proof.

Entity: [[entities/act-tier-shell]] (Observe annotation interaction parity).
