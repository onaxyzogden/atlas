# 2026-05-20 — Phase B.5: Design Map generator wired to API + web

**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase B.5
**ADR:** [[2026-05-20-atlas-phase-b5-design-map-wiring]]

## Commits

- `1b028056` — `feat(designMap): B.5.1 — POST /design-map/project/:projectId/generate`
- `c24b970d` — `feat(designMap): B.5.2 — web apiClient + DesignMapGeneratorModal`
- `3002fa89` — `feat(designMap): B.5.2 — toolbar + Next Best Action triggers + bulk WS handler`
- `51f6ed06` — `fix(designMap): remove unused @ts-expect-error in B.5.1 test mock`

## Summary

End-to-end wiring of the Phase B `generateDesignMap` service. Backend
route reads parcel + watershed + terrain inputs, calls the generator,
optionally persists features in a transaction and broadcasts
`features_bulk_created`. Web client offers a two-step dry-run → save
modal launched from two surfaces: the `DomainFloatingToolbar` Sparkles
button (rendered across all domains incl. `default`) and the Observe
`NextBestActionsPanel` queue entry. New WS dispatcher fans bulk events
to the existing per-feature handler so the project layer stores hydrate
without a manual refresh.

## Gate

- API tsc clean.
- API test suite: **631 passed / 3 skipped (634)**.
- Web tsc: no B.5-introduced errors. Three residual errors
  (`StepBoundary.tsx:365`, `ArchivePage.tsx:35,36`) are pre-existing /
  from unrelated foreign WIP.
- Manual 200-acre fixture smoke deferred (Assumption A2 — fixture not
  yet seeded).

## Next

- Phase C.6 — `agentRegistry.ts` + `POST /ai/agent-chat` + tests.
- Phase C.7 — `rotationEngine.ts` + `livestockRevenue.ts` + UI
  integration + tests.
