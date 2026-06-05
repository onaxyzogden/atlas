# 2026-05-17 — Closed-loop model unification (#58/#59) + calendar jump-to-date


Took up the deferred #58/#59 unification. **Phase 0 (independent):**
`EventCalendarCard` gained a native `<input type="date">` jump-to-date
affordance (toolbar, between month label and nav) + `.dateJump` CSS —
closes the Run-5 "76 Next-month clicks to reach 2032" MINOR rec; pure
`setAnchor(startOfMonth(...))` reposition, no aggregator/filter coupling.

**Unification:** collapsed the two disjoint material-flow models
(`flowConnectorStore` canvas LineStrings w/ free-text endpoints +
`closedLoopStore` `WasteVector` w/ structured endpoints) into one
`MaterialFlow` model in the surviving `closedLoopStore`
(`ogden-closed-loop` schemaVersion 1→2). Two-mechanism migration
(builtEnvironmentStoreV2 precedent): same-key persist `migrate`
WasteVector→MaterialFlow (origin:'list'); foreign-key `onRehydrateStorage`
fold of dead `ogden-flow-connectors` (origin:'canvas', geometry kept,
fromName/toName→sourceLabel/sinkLabel, dead key deleted, temporal
cleared). `flowConnectorStore.ts` deleted; `syncManifest` line 339
schemaVersion 2 + slice rename, flow-connectors descriptor removed.
New shared `useFlowEndpointOptions` hook broadens the endpoint picker to
livestock paddocks / water earthworks+storage / guilds (the #59 ask);
`FlowConnectorTool` + `buildFlowConnectorEditSchema` gained structured
From/To pickers so canvas-drawn flows now earn closed-loop credit.
Repointed 8 consumers (WasteVectorTool, ClosedLoopGraphCard — now also
renders paddock/water/guild nodes, PlanDataLayers — geometry-less list
flows skipped, PlanSelectionFloater, SoilBuildingPlanCard, PlanHub,
WasteRoutingChecklistCard, inlineEditSchemas). Side benefit: closes the
pre-existing `PlanDataLayers → flowConnectorStore` build breakage logged
under the A1 entry above.

Gate: `tsc --noEmit` EXIT 0; full `apps/web` vitest **1096/1096** green
incl. 19 new (closedLoopStore migration ×4 — same-key, foreign-key fold,
idempotent, temporal-clear; useFlowEndpointOptions ×2; siteAnnotations
migrate ×13 unchanged) + syncManifest coverage guard green. Browser
verification **not run (disclosed, not faked):** the only running 5200
preview server is bound to a sibling session's worktree
(`elated-einstein-16895e`), not this working tree, and the
non-destructive mandate forbids disturbing it / wiping shared `ogden-*`.
Migration correctness + endpoint breadth + jump anchor math are
deterministic and unit-locked. No commit/push (not requested).
