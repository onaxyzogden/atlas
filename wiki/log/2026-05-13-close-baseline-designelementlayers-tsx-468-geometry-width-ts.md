# 2026-05-13 — Close baseline `DesignElementLayers.tsx:468` Geometry-width TS error


**Closed.** Every recent ADR (temporal slider, polygon-fill stamp,
status gate, deep-link halo) recorded `tsc --noEmit` as "clean except
this". Root cause was a one-line type-annotation widening, not a
missing case: `DragState.origGeom` at
[`DesignElementLayers.tsx:401`](../apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx)
was typed `GeoJSON.Geometry`, widening the value sourced from
`el.geometry` (which is the narrow union `Point | LineString |
Polygon` per `DesignElement.geometry`). `translateByDelta`'s generic
return-type then carried the widening through to the patch handed to
`updateDesignElement`, which fails the `Partial<DesignElement>` shape
with `MultiPoint` cited as the first widening member.

**Fix.** Narrowed the local type:
```ts
- origGeom: GeoJSON.Geometry;
+ origGeom: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
```
Zero behavioural change — `down.origGeom` is only ever assigned from
`el.geometry`, which already carries the narrow union.
`translateByDelta` stays unchanged (its generic `<G extends
GeoJSON.Geometry>` is correct; the bug was the caller, not the
utility).

**Verified.** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc
--noEmit -p .` from `apps/web` exits 0 for the first time in
recent memory. Preview reload at
`/v3/project/<id>/plan/principle-verification` clean — chip + audit
mount, no error boundary.

**Follow-up sweep.** Stripped the now-stale "tsc clean except
`DesignElementLayers.tsx` …" caveat from the three same-day ADRs
that carried it: `2026-05-13-atlas-temporal-slider.md`,
`2026-05-13-atlas-needs-yields-status-gate.md`,
`2026-05-13-atlas-plan-tree-spacing-snap.md`. Log entries left
intact as session-historical records.
