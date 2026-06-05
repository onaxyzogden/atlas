# 2026-05-23 — Sector observations table lists computed climate layers

**Branch.** `feat/atlas-permaculture` · commit `1d46f8f9` · 3 files, +148/-3.

## What

The steward reported sectors visible in the Sector Compass diagram that had
no matching row in the "Sector observations" table on the
[SectorCompassDetail](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDetail.tsx)
page (Observe → Sectors & Zones → Sector Compass).

## Diagnosis (not a data-loss bug)

The compass
([SectorCompassDiagram](../../apps/web/src/v3/observe/modules/sectors-zones/SectorCompassDiagram.tsx))
draws **three** layers around the centroid: auto wind-rose petals
(`computeWindSectors`), auto solar arcs (`computeSolarSectors`), and the
steward's **manual** sector arrows from `externalForcesStore`. The table
rendered only the manual arrows — layers 1 & 2 are auto-derived climate
context (kept deliberately per the
[2026-05-21 SectorCompass HUD decision](../decisions/2026-05-21-atlas-observe-sector-compass-hud.md))
and were never tabulated. So the table was correct; it just under-represented
what the compass showed.

## Resolution (steward-chosen)

List the computed layers as **read-only rows** so the table mirrors the
compass 1:1. New tested pure helper `computedSectorRows(centroid)` in
[derivations.ts](../../apps/web/src/v3/observe/modules/sectors-zones/derivations.ts)
maps the wind rose (8 directions, sorted frequency-desc) and solar arcs
(3 sweeps) into rows, reusing the diagram's own guards (wind needs a
centroid; solar needs lat in [-90, 90]) so table and compass stay in
lockstep. The detail page renders them under a muted
"Computed climate layers · auto-derived, read-only" divider, with no inputs
or remove buttons. Editable manual rows are untouched.

## Verification

- vitest: 21 pass (6 new `computedSectorRows` cases).
- typecheck: clean for the changed files.
- Browser (Observe → Sectors & Zones → Sector Compass): DOM extraction
  confirmed header + divider + 8 wind rows (W 27% → E 5%, freq-sorted) +
  3 solar arc rows; computed rows carry 0 inputs/selects/buttons; the
  "+ Add sector" control remains. Screenshot tool timed out on the WebGL
  map canvas behind the modal — page stayed responsive to DOM queries, so
  proof is the extracted table contents rather than an image.

## References

- Plan: `~/.claude/plans/not-all-sector-compass-silly-thimble.md`
- Decision context: [[2026-05-21-atlas-observe-sector-compass-hud]]
