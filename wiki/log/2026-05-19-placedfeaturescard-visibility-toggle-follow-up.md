# 2026-05-19 — PlacedFeaturesCard visibility toggle (follow-up)


**Branch.** `feat/atlas-permaculture`. Per-row hide/show affordance for
the placed-features card, closing the deferred-from-day-one follow-up.

Schema (additive, no migrations): `hidden?: boolean` added to
`BuiltEnvironmentEntity` (shared Zod schema), `DesignElement`, and
`LandZone`. `builtEnvironmentStoreV2` gained a dedicated
`setHidden(id, hidden)` action (root-level field, not `metadata`, so it
survives the `existing`/`proposed` state axis); `landDesignStore.update`
and `zoneStore.updateZone` already accept the patch shape so no new
actions there. `usePlacedFeatures` threads `hidden` onto every
`PlacedFeatureRow` and exposes three source-discriminated setters.

UI: `PlacedFeaturesCard` row now has an Eye / EyeOff button (lucide,
12px) before Focus, with `aria-pressed` + dynamic title. Row gains
`data-hidden` when hidden — CSS dims the swatch/main and strikes through
the label. The eye button defies the hover-fade on `.actions` (via
`:not(.actionBtnEye)`) so a hidden row is always immediately
un-hideable.

Canvas: three one-liners skip hidden entities in their projection loops
— `BeV2GenericLayer` (`if (e.hidden) continue;`), `DesignElementLayers`
(`.filter((el) => !el.hidden)` first in the visible chain), and
`PlanDataLayers` (`.filter((z) => !z.hidden)` on `orderedZones`).

Tests. 14/14 vitest cases passing — added two cases covering hidden
plumbing through each source and the explicit decision to keep hidden
rows in the list (dimmed, not filtered out).

Verification. DOM preview confirmed bidirectional toggle on Plan stage
(Paddock A row): clicking the eye flipped `data-hidden` → `"true"`,
swapped Eye → EyeOff, flipped `aria-pressed`, and changed the title to
"Show on map"; clicking again restored all three.

Files. Schema/stores: `packages/shared/src/builtEnvironment.ts`,
`apps/web/src/store/builtEnvironmentStoreV2.ts`,
`apps/web/src/store/designElementsStore.ts`,
`apps/web/src/store/zoneStore.ts`. Hook + UI:
`apps/web/src/features/shared/placedFeatures/{usePlacedFeatures.ts,
usePlacedFeatures.test.ts, PlacedFeaturesCard.tsx,
PlacedFeaturesCard.module.css, CONTEXT.md}`. Layers:
`apps/web/src/v3/builtEnvironment/layers/BeV2GenericLayer.tsx`,
`apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx`,
`apps/web/src/v3/plan/layers/PlanDataLayers.tsx`.
