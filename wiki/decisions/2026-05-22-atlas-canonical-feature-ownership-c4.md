# 2026-05-22 — Canonical access/utility ownership + reach the C2 utility-point promotion (PDC Phase C, C4)

**Status.** Accepted. Phase C of the "make Atlas the only tool a student
uses to produce an OSU PDC portfolio" roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`).

**Branch.** `feat/atlas-permaculture`

**Commit.** `b498fe8a`

## Context

C1/C2 promoted access paths (`ogden-paths`) and utility points
(`ogden-utilities`) onto the typed `design_features` table, making them
server-queryable and roster-eligible. C3 fixed the `landDesign` silent
no-sync. With all four Plan feature stores now syncing, the next real
friction was **overlapping authoring** — a steward could not tell which store
owns a "path" or a "well" — and, critically, **the C2 utility-point
promotion was unreachable**:

- `utilityStore` (typed `point` design_features, syncable, rosterable) had
  **no Plan draw tool** and **no v3 render layer**. The `MapToolId` union had
  `utility-run` but no `utility-point`; `PlanDrawHost`'s switch had no
  utility-point case; `PlanDataLayers` never imported `useUtilityStore`. So
  the C2 work round-tripped through sync, but a student could neither draw a
  utility point nor see one on the map.

- There are **two** utility concepts. `builtEnvironmentStoreV2` (BE V2) owns a
  `utility` category (well / septic / water-tank / water-pump-house /
  solar-array) + `infrastructure` (power-line / buried-utility / fence / gate
  / driveway), keyed by `state`. `utilityStore` has **15** types, **4 of
  which exact-duplicate BE V2 kinds** (solar_panel ↔ solar-array, water_tank ↔
  water-tank, well_pump ↔ well, septic ↔ septic) and **11 of which have no BE
  equivalent** (battery_room, generator, greywater, rain_catchment, lighting,
  firewood_storage, waste_sorting, compost, biochar, tool_storage,
  laundry_station).

## Decisions (locked with the steward)

1. **C4 scope = clarity + wire the missing tool, NOT a destructive
   migration.** No persisted data moves.
2. **BE V2 is canonical** for well / septic / power / water-tank / pump /
   solar — consistent with the 2026-05-10 BE-unification ADR.
3. **Add the Plan utility-point tool in C4**, and the new tool offers **only
   the 11 non-BE types**; the 4 BE-overlapping kinds are authored via the
   existing `be.*` tools. This removes the duplication at the **authoring
   surface** without touching any persisted data.

## Canonical ownership matrix (the clarity deliverable)

| Concept | Canonical store | Plan tool |
|---|---|---|
| Designed **access** (path/road kinds as typed paths) | `pathStore` (`ogden-paths`) | `plan.zone-circulation.path` |
| Designed **utility points** (the 11 non-BE types) | `utilityStore` (`ogden-utilities`) | **NEW** `plan.structures-subsystems.utility-point` |
| Existing/proposed **infra** (well, septic, power, tank, pump, solar, fence, gate, driveway) | `builtEnvironmentStoreV2` | `plan.structures-subsystems.be.*` |
| Utility **connector lines** | `utilityRunStore` (`ogden-utility-runs`, blob) | `plan.structures-subsystems.utility-run` |
| Freeform sketch (pond/swale/paddock/road kinds) | `landDesignStore` (blob, C3) | `elementCatalog` kinds |

No data moves. The matrix is enforced going forward by **what each tool
offers** — the type-split is the load-bearing mechanism, not a schema change.

## Implementation (`b498fe8a` — 8 files, +316/−1)

### The pure type-split module (the testable core)

`apps/web/src/v3/plan/draw/tools/utilityPointTypes.ts` (**new**) holds the
canonical split with **no React / maplibre deps**, so the unit test imports
it in isolation:

- `BE_OWNED_UTILITY_TYPES = ['solar_panel','water_tank','well_pump','septic']
  as const satisfies readonly UtilityType[]` — the 4 BE-owned duplicates.
- `UTILITY_POINT_TYPES` = `Object.keys(UTILITY_TYPE_CONFIG)` **minus** that
  set (derived, not hand-listed, so a new `UtilityType` lands in one bucket
  automatically and the test catches an unclassified addition).
- `UTILITY_POINT_TYPE_OPTIONS` = ready-to-render `{value,label}[]` for the
  inline select.

### The tool

`apps/web/src/v3/plan/draw/tools/UtilityPointTool.tsx` (**new**) mirrors
`WaterStorageTool` (the point-placement template):
`useMapboxDrawTool<GeoJSON.Point>({ mode:'draw_point', onComplete })` →
`addUtility(draft)` (a full `Utility` with `crypto.randomUUID()`, `center`,
phase default, timestamps) → `openForm({ fields, initial, onSave, onCancel })`.
Fields: type (select over the 11), name, demandKwhPerDay, capacityGal, phase.
**No `enterprise` field** (`Utility` has none). `onValuesChange` autofills the
name on type change only while the name is still the prior type's default
label. `onSave` → `updateUtility` (demand/cap kept only if finite > 0);
`onCancel` → `deleteUtility(id)` to undo the just-placed node.

### Wiring (so the tool is reachable + visible)

- `useMapToolStore.ts` — added
  `'plan.structures-subsystems.utility-point'` to the `MapToolId` union.
- `PlanDrawHost.tsx` — imported `UtilityPointTool`; added its case to the
  **dedicated-store switch** (alongside `utility-run`). The toolId does
  **not** start with `PLAN_BE_PREFIX`, so it bypasses the variant-gated BE
  branch → the tool mounts on **both Current and Vision** canvases (parity
  with `utility-run`).
- `PlanTools.tsx` — imported `Zap`; after the `BE_TOOL_GROUPS` map builds
  `groupItems`, appended the utility-point item **for the `utility`
  category** so it keeps its non-BE toolId (rather than getting the `be.`
  prefix the map applies).
- `PlanDataLayers.tsx` — imported `useUtilityStore` + `UTILITY_TYPE_CONFIG`;
  read `utilities`; added a point loop pushing each `center` to the shared
  `plan-data-point` source + a label, props
  `{ id, kind:'utility-point', color, label, yeomansRank:6, enterprise:'' }`
  (color/label from `UTILITY_TYPE_CONFIG`); added `utilities` to the `useMemo`
  deps. The existing point-click handler returns early on an unknown `kind`
  (no throw), so the layer renders without crashing — full edit stays with
  the legacy `UtilityPanel`.

### Clarity comment (no delete — removing kinds is a data risk)

- `elementCatalog.ts` — comment above the water group noting that
  tanks/wells/solar/septic are authored via BE V2 (`be.*`) and the typed
  utility-point tool covers the 11 non-BE types, pointing at this ADR.

### Test

`__tests__/utilityPointTypes.test.ts` (**new**, happy-dom) pins the split:
`BE_OWNED` = exactly the 4; `UTILITY_POINT_TYPES` = exactly the 11
(EXPECTED_NON_BE list); **partition** (15 total, each in exactly one bucket —
fails if a new `UtilityType` is added and left unclassified); never offers a
BE-owned type; every option is a valid `UTILITY_TYPE_CONFIG` key with a
matching label. **5/5 green.**

## Tests / verification

- **web vitest** — `utilityPointTypes` 5/5.
- **web tsc** (8 GB node script) — only the 3 known pre-existing unrelated
  errors (`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
  `HostUnionDrilldownCard.test.tsx`). The new `WasteVectorDashboardView.tsx`
  errors in the working tree are foreign WIP, excluded from the by-name
  commit.
- **Live DOM-level (Claude Preview, :5200)** — beyond the usual Phase A/B/C
  auth wall: the dev app loaded with seeded sample projects, navigated to
  `/v3/project/mtc/plan`, confirmed `hasCanvas:true`, the **"Utility point"
  button renders in the Utilities BE category**, and clicking it **mounts
  `UtilityPointTool`** (dialog `aria-label="Utility point tool"` + draw hint).
  API server down (`ECONNREFUSED :3001`) is expected/irrelevant here.

## Verification deferrals

- **`preview_screenshot`** timed out (known WebGL-canvas / backgrounded-tab
  hang in this environment) — per project CLAUDE.md, no visual is claimed;
  the DOM-level evals above are authoritative.
- **Live cross-device round-trip** (draw a utility point → reload → POST
  `/design-features` → master-plan PDF roster) sits behind the same auth +
  seeded-project + headless-WebGL + MapTiler wall as Phase A/B/C. Stated, not
  claimed; covered meanwhile by the type-split unit test + typecheck +
  C2's mapper tests.

## Phase C remainder

- **C5** — properties-panel polish. **DONE (commit `5ad3c3b4`,
  2026-05-22).** `ProposedMetadata.rotationDeg` was already wired through both
  the draw and edit forms, so C5 added the missing halves: a **selected-only
  orientation chevron** (rotation was invisible unless the edit form was open)
  and **utility-point v3 edit parity** — a `'utility-point'`
  `PlanSelectionKind`, `buildUtilityPointEditSchema` (mirrors the C4 draw form,
  no `color` write), and a dedicated click-to-edit listener (utilityStore has
  no temporal store, so it's a separate listener from the fertility/water
  drag path). Log:
  [[log/2026-05-22-c5-structure-orientation-utility-edit-parity]].
- **C6** — full e2e verify + the consolidation ADR. **DONE (2026-05-22).**
  Phase C unit surface green + web tsc baseline + a live DOM regression check
  (no C5 console errors on the seeded Plan view); live-WebGL visual deferred
  (stated, not claimed). ADR:
  [[decisions/2026-05-22-atlas-phase-c-consolidation]]; log:
  [[log/2026-05-22-c6-phase-c-consolidation]]. **Phase C complete.**

## Covenant + IA

No public-facing capital framing touched; "capital partners & allies" per
[[fiqh-csra-erased-2026-05-04]] untouched. 3-item Observe/Plan/Act IA
unchanged. No persisted data migrated — stewardship sovereignty preserved
(the split is an authoring-surface convention, not a silent data rewrite).

## Related

- Log: [[log/2026-05-22-canonical-feature-ownership-c4]]
- C1–C2 ADR: [[decisions/2026-05-22-atlas-typed-promotion-access-utility]]
- C3 log: [[log/2026-05-22-landdesign-no-sync-fix-pdc-phase-c3]]
- Phase B ADR: [[decisions/2026-05-22-atlas-planting-plan-merged-schedule]]
