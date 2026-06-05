# 2026-05-22 — Canonical access/utility ownership + reach the C2 utility-point promotion (PDC Phase C, C4)

**Branch.** `feat/atlas-permaculture`. Commit `b498fe8a` (8 files, +316/−1).

Closes the C4 deferral from the C1–C2 ADR. Two problems: (1) overlapping
authoring — a steward could not tell which store owns a "path" or a "well";
(2) **the C2 utility-point promotion was unreachable** — `utilityStore`
(typed `point` design_features, syncable, rosterable) had **no Plan draw
tool** (`MapToolId` union lacked `utility-point`, `PlanDrawHost` had no case)
and **no v3 render layer** (`PlanDataLayers` never imported `useUtilityStore`),
so a utility point could be neither drawn nor seen even though C2 made it
round-trip through sync.

**Two utility concepts, deliberately split — not merged.** `builtEnvironmentStoreV2`
(BE V2) owns `utility` {well/septic/water-tank/water-pump-house/solar-array}
+ `infrastructure` {power-line/buried-utility/fence/gate/driveway}, keyed by
`state`. `utilityStore` has 15 types — **4 exact-duplicate BE kinds**
(solar_panel↔solar-array, water_tank↔water-tank, well_pump↔well,
septic↔septic) and **11 with no BE equivalent** (battery_room, generator,
greywater, rain_catchment, lighting, firewood_storage, waste_sorting,
compost, biochar, tool_storage, laundry_station).

**Locked steward decisions:** (1) C4 = clarity + wire the missing tool, **not
a destructive migration** (no data moves); (2) **BE V2 is canonical** for
well/septic/power/tank/pump/solar (per the 2026-05-10 BE-unification ADR); (3)
the new Plan utility-point tool offers **only the 11 non-BE types** — the 4
overlapping kinds are authored via the existing `be.*` tools, removing the
duplication at the **authoring surface** with zero schema change.

**Implementation (the type-split is the load-bearing mechanism):** A new pure
module `apps/web/src/v3/plan/draw/tools/utilityPointTypes.ts` (**no
React/maplibre deps**, so it unit-tests in isolation) holds
`BE_OWNED_UTILITY_TYPES` (the 4) + `UTILITY_POINT_TYPES` = `Object.keys(UTILITY_TYPE_CONFIG)`
**minus** that set (derived, not hand-listed — a new `UtilityType` auto-lands
in one bucket and the partition test catches an unclassified one) +
`UTILITY_POINT_TYPE_OPTIONS`. New `UtilityPointTool.tsx` mirrors
`WaterStorageTool` (`useMapboxDrawTool<GeoJSON.Point>` `draw_point` →
`addUtility(full Utility)` → `openForm`); fields type/name/demandKwhPerDay/
capacityGal/phase (**no `enterprise`** — `Utility` has none); type-change
autofills the name only while it's still the prior default label; `onSave` →
`updateUtility` (demand/cap kept only if finite>0); `onCancel`/form-cancel →
`deleteUtility(id)` to undo the placed node. **Wiring:** `utility-point` added
to the `MapToolId` union (`useMapToolStore.ts`); `PlanDrawHost.tsx` case added
to the **dedicated-store switch** (not the `PLAN_BE_PREFIX` branch → mounts on
**both Current and Vision** canvases, parity with `utility-run`);
`PlanTools.tsx` appends the tool item **for the `utility` category** after the
`BE_TOOL_GROUPS` map (so it keeps its non-BE toolId rather than the `be.`
prefix), `Zap` icon; `PlanDataLayers.tsx` reads `utilities`, pushes each
`center` to the shared `plan-data-point` source + label (props
`{id, kind:'utility-point', color, label, yeomansRank:6, enterprise:''}` from
`UTILITY_TYPE_CONFIG`), `utilities` added to the `useMemo` deps — the
point-click handler returns early on unknown `kind` (no throw), so full edit
stays with the legacy `UtilityPanel`. `elementCatalog.ts` got a **clarity
comment only** (no delete — removing kinds is a data risk) noting BE V2 owns
tank/well/solar/septic and the typed tool covers the 11.

**Verification:** new `utilityPointTypes.test.ts` (happy-dom) 5/5 — pins
BE_OWNED=the 4, UTILITY_POINT_TYPES=the 11, the 15-way partition (each type in
exactly one bucket — **fails if a new `UtilityType` is added unclassified**),
never-offers-BE, and option/label validity. Web tsc at the 3-error
pre-existing baseline (`StepBoundary.tsx`, two `HostUnion*` tests); the new
`WasteVectorDashboardView.tsx` tsc errors are foreign WIP, excluded from the
by-name commit. **Live DOM-level (Claude Preview, :5200)** beyond the usual
auth wall: app loaded with seeded sample projects, `/v3/project/mtc/plan`
`hasCanvas:true`, the **"Utility point" button renders** in the Utilities BE
category and clicking it **mounts `UtilityPointTool`** (dialog
`aria-label="Utility point tool"` + draw hint); API down (`:3001`
ECONNREFUSED) expected/irrelevant. `preview_screenshot` timed out (known
WebGL/backgrounded-tab hang) — **no visual claimed** per CLAUDE.md; DOM evals
authoritative. Live cross-device draw→reload→roster e2e **deferred** (stated,
not claimed) behind the same Phase A/B/C wall.

**Branch hygiene:** committed the verified slice immediately (external rebase
moved the foreign-WIP set mid-session per [[project-branch-rebase]]); staged
the 8 files by explicit path, foreign WIP (`WasteVectorDashboardView.tsx`,
`ZoneSomSidebar*`, `EconomicsPanel*`, `capitalPartner*`, …) left unstaged per
[[feedback-no-deletion]]. Covenant clean; "capital partners & allies" framing
per [[fiqh-csra-erased-2026-05-04]] untouched; 3-item Observe/Plan/Act IA
unchanged. **Deferred:** C5 (structure `rotationDeg` + orientation indicator),
C6 (full e2e + consolidation ADR). ADR:
[[decisions/2026-05-22-atlas-canonical-feature-ownership-c4]]. Continues
[[log/2026-05-22-landdesign-no-sync-fix-pdc-phase-c3]].
