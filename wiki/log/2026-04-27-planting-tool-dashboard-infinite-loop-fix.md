# 2026-04-27 — Planting Tool dashboard infinite-loop fix


`ClimateShiftScenarioCard` crashed the Planting Tool dashboard with
"Maximum update depth exceeded". Root cause: the card called
`.filter()` inside the Zustand selector
(`useCropStore((s) => s.cropAreas.filter(...))`), so the selector
returned a fresh array every render. Zustand's default reference-
equality comparison saw new state on every read and re-triggered the
component, looping until React bailed out.

Fix: subscribe to the stable `s.cropAreas` reference and derive the
filtered list with `useMemo`, matching the pattern used by every
other crop card (`CanopyMaturityCard`, `OrchardGuildSuggestionsCard`,
etc.). Exactly the anti-pattern called out by the JSDoc warnings
added in `df6a5f7` — this card pre-dated the sweep.

Verified live at port 5200: Planting Tool now renders 8 cards with
no React error and no new console warnings. Typecheck has 5
pre-existing errors in `features/access/QuietCirculationRouteCard.tsx`
(out of scope, unrelated).

Files: [features/crops/ClimateShiftScenarioCard.tsx](../apps/web/src/features/crops/ClimateShiftScenarioCard.tsx)
