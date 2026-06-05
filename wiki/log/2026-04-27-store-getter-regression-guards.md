# 2026-04-27 — Store-getter regression guards


Swept all 29 Zustand stores for array-returning getters and audited call-sites
to confirm none of them are invoked inside selectors today. Added JSDoc
warnings on the three array-returning getters (`phaseStore.getProjectPhases`,
`versionStore.getProjectSnapshots`, `zoneStore.getProjectZones`) explaining
the anti-pattern and showing the correct subscribe-then-derive snippet.
Future contributors will see the warning on IDE hover.

Cross-references: [decisions/2026-04-26-zustand-selector-stability.md](decisions/2026-04-26-zustand-selector-stability.md)

Deferred: custom ESLint rule to flag `useStore((s) => s.getXxx(...))` at
authoring time.
