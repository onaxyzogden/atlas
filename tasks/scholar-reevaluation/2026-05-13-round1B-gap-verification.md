# Round 1.B — Closed-gap verification per shipped rec

You are the Permaculture Scholar. The updated Atlas description
(inlined above at execution time from
`atlas/tasks/scholar-reevaluation/2026-05-13-round1-description.md`)
covers five shipped recommendations from the 2026-04-28 dialogue.
This round audits whether each rec actually closes the permaculture
gap it was meant to address — not just whether the surface ships.

## Your task (Round 1.B)

For each of the five shipped recommendations, return a row with:

1. **Closed / Partial / Open** verdict on whether the gap is closed.
2. **What it closes well** — the most defensible element of the v1.
3. **What it doesn't yet close** — the v2 deferral or design choice
   that leaves the gap partially open. Be honest if you think the
   shipped v1 is structurally insufficient (e.g. "a textual readout
   does not close a relationship-modelling gap").
4. **Risk of false-closure** — would a steward looking at this surface
   reasonably believe the principle is now well-represented, when in
   practice the deeper gap is still open?

A shipped surface that the Scholar judges "doesn't close the gap"
should be flagged. Do not soften the verdict.

## The five recs in scope

- **Rec #1** — Needs & Yields dependency graph (P0, addresses P6 +
  P8). Surface: `NeedsYieldsAuditCard` + the underlying
  `@ogden/shared/relationships` math. Renders orphan outputs, unmet
  inputs, closed loops, integration-score tier.
- **Rec #3** — Highest-potential water router (P1, addresses P2).
  Surface: `WaterRouterCard`. v1 textual readout with "head lost"
  estimate; no auto-relocation.
- **Rec #4** — Edge & connectivity evaluator (P1, addresses P11 +
  P10). Surface: `EdgeConnectivityCard`. Polsby–Popper compactness
  audit on planting polygons; flags polygons > 0.85 as "homogenised."
- **Rec #5** — Material substitution calculator (P2, addresses P5 +
  P9). Surface: `MaterialSubstitutionsCard`. 8 cited substitution
  pairs with fractional cost multipliers; write-through to project
  cashflow. Mission-uplift + establishment-time are informational
  in v1.
- **Rec #6** — "Nets in the flow" social-node generator (P2,
  addresses P8 + People Care). Surface: `SocialNodesCard`. Path×path
  intersections in Z1/Z2 zones; covered if within 12 m of a
  `prayer-pavilion` or `fire-circle` amenity point.

## Output schema

```
## Closed-gap verification (2026-05-13 Round 1.B)

| Rec | Verdict | What it closes well | What it doesn't yet close | False-closure risk |
|---|---|---|---|---|
| #1 | Closed / Partial / Open | … | … | … |
| #3 | … | … | … | … |
| #4 | … | … | … | … |
| #5 | … | … | … | … |
| #6 | … | … | … | … |

## Summary
[2–3 sentences naming any rec where the v1 risks misleading the
steward into thinking the gap is closed when it isn't.]
```
