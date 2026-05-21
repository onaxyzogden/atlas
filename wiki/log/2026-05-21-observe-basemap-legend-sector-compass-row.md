# 2026-05-21 — BaseMapCard: consolidate sector overlay rows into single "Sector compass"

**Branch.** `feat/atlas-permaculture` (commit `cba7a651`). Direct
follow-up to [2026-05-21 — Observe SectorCompass HUD replaces wedges](2026-05-21-observe-sector-compass-hud-replaces-wedges.md)
(commit `7f036f5a`) and its
[ADR](../decisions/2026-05-21-atlas-observe-sector-compass-hud.md).

**What changed.**

[apps/web/src/v3/plan/canvas/BaseMapCard.tsx](../../apps/web/src/v3/plan/canvas/BaseMapCard.tsx) —
the `DEFAULT_OVERLAYS` legend list collapsed four sector-related rows
(`sectors` "Solar sectors", `wind` "Wind sectors", `hazards` "Hazards",
`views` "Views") into a single row:

```
{ key: 'sectors', label: 'Sector compass (solar · wind · hazards · views)', swatch: '#c4a265' }
```

The `sectors` key now gates the unified `SectorCompassOverlay` HUD that
bundles wind petals + solar arcs + manual sector arrows into a single
rose at the bottom-right of every Observe / Plan / Act map.

**Why.**

After 7f036f5a the four MapLibre sector wedge layer groups were
deleted; the new HUD listens to `sectors` only. Surfacing four
checkboxes (three of which no longer gate anything on Observe / Plan /
Act) made the legend lie about what those toggles did. Collapsing to
one row removes the orphan affordances and makes the legend match the
underlying single-rose semantics.

**Side-effects.**

- `wind` / `hazards` / `views` matrix keys remain in
  [matrixTogglesStore](../../apps/web/src/store/matrixTogglesStore.ts)
  for back-compat. The legacy v3
  [DiagnosePage](../../apps/web/src/v3/pages/DiagnosePage.tsx) still
  mounts `WindSectorsOverlay` and `SectorsOverlay` and reads those keys
  directly; the canonical Overlays legend on BaseMapCard simply no
  longer surfaces them. Store-level consolidation deferred until
  DiagnosePage is retired.
- The `windVisible` / `hazardsVisible` / `viewsVisible` subscriptions
  inside [ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)
  remain (no annotation spec uses these as `toggleKey`, so they are
  inert — cleanup deferred to avoid touching a regularly-rebased file
  for no functional gain).

**Verification.**

`npm run typecheck` against `apps/web` — zero new errors from the diff;
same 6 pre-existing baseline errors carry over (`StepBoundary.tsx`,
pasture-fence `turf.polygonToLine` / `buffer` overload at
`ObserveAnnotationLayers.tsx:674,679`, `vegetationResolver.ts`, two
`HostUnion*` test files). Visual verification still blocked by the
unrelated `apps/web/src/showcase/scenes/_shared/y8-projected.mdx`
parse error (TypeScript `!` non-null assertion inside JSX).

**Out of scope.** Removing `wind` / `hazards` / `views` from
`matrixTogglesStore`; retiring the legacy v3 DiagnosePage and its
overlays; trimming inert `*Visible` subscriptions in
`ObserveAnnotationLayers.tsx`.
