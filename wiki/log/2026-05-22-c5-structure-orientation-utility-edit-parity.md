# 2026-05-22 — Utility-point edit parity + selected-structure orientation indicator (PDC Phase C, C5)

**Branch.** `feat/atlas-permaculture`. Commit `5ad3c3b4` (5 files, +325).

Closes the C5 deferral from the C4 ADR — the last authoring-polish gaps in
Phase C's Plan stage. **Exploration corrected the roadmap's C5 premise:**
`rotationDeg` is **already fully wired** — `ProposedMetadata.rotationDeg`
(`packages/shared/src/builtEnvironment.ts:112`) → `ProjectedStructure.rotationDeg`
→ the StructureTool draw form **and** the PlanDataLayers click-to-edit form,
which already regenerates the footprint via `createFootprintPolygon` on save. So
the "add a rotation field" half was done; the two genuine gaps were narrower:
(1) a structure's rotation was **invisible** unless its edit form was open, and
(2) utility points **rendered but were neither selectable nor editable** in v3
(`kind:'utility-point'` was absent from the read-only `KIND_MAP` and from any
point-click edit path).

**Gap 1 — utility-point edit parity.** New `'utility-point'`
`PlanSelectionKind` (`planSelectionStore.ts`), distinct from `'utility'` (the
connector-**run** kind) so point vs. run selection never conflate. New
**`buildUtilityPointEditSchema`** (`inlineEditSchemas.ts`) mirrors the C4 draw
form exactly so edit matches create: fields type / name / demandKwhPerDay /
capacityGal + the **caller-supplied** phase field appended last (the builder is
a pure function, so the `usePhaseFieldSpec(projectId)` hook's field is passed in
by `PlanDataLayers`, the component); `initial` reflects the record (demand/cap
fall back to `''` when absent); `onSave` keeps a finite **positive** demand/cap
and drops it (→ `undefined`) when blank/zero/non-finite, and on a type change
with a blank name falls back to `UTILITY_TYPE_CONFIG[type].label`. **Never
writes `color`** — the render layer derives it from `UTILITY_TYPE_CONFIG`, and
`Utility` has no `color` field. Wiring in `PlanDataLayers.tsx`: a **dedicated**
editable `click` listener on the `${LAYER_PREFIX}point` layer (gated to
`editable` + `activeTool===null`, returns unless `f.properties.kind ===
'utility-point'`, looks up the record via `useUtilityStore.getState()`,
`setSelection([{kind:'utility-point',id}])`, then `openForm({
...buildUtilityPointEditSchema(r, updateUtility, utilPhaseField), anchor })`).
It is a **separate** listener — **not** folded into the fertility/water
point-drag handler — because `utilityStore` has **no zundo/temporal**
middleware, so it can't join `beginDragUndoWindow`; utility points are
therefore click-to-edit + selectable but not drag-translatable (a deferred
nicety). Selection writes are idempotent with the read-only KIND_MAP listener,
so the two co-existing in editable mode don't conflict. Also added
`'utility-point': 'utility-point'` to the read-only `KIND_MAP` (selects in
Observe/Act) and `'utility-point': 'Utility point'` to `PlanSelectionFloater`'s
`KIND_LABEL`.

**Gap 2 — selected-structure orientation indicator.** A single facing chevron
(`▲`) on the **selected structure only** (locked steward decision: zero
clutter, live while editing). Built in `apply()` (not the FC memo — selection
is an `apply()`-level concern, like `selectedGuildId` styling): when
`selectedStructureId` resolves to a structure in `structures` (matching
`projectId`), push **one** point feature at `turf.centroid(st.geometry)` with
props `{ id, rotationDeg: st.rotationDeg ?? 0 }` into an `orient` source;
otherwise empty (no arrow when nothing or a non-structure is selected). The
`${LAYER_PREFIX}orient` symbol layer uses `text-field:'▲'`,
`text-rotate: ['*', ['coalesce', ['get','rotationDeg'], 0], -1]`,
`text-rotation-alignment:'map'`, `text-keep-upright:false` (so it actually
turns — flow-arrow precedent), gold `#ffd166` on a dark halo.
`selectedStructureId` + `structures` + `projectId` added to the `apply` effect
deps.

**The rotation sign (reasoned, visually unverified).** `▲` points north at 0°.
MapLibre `text-rotate` is **clockwise** from north; `createFootprintPolygon`
(`features/structures/footprints.ts:148`) rotates **CCW** in metric space
(+y = north). So the stored `rotationDeg` is **negated** to keep the glyph
aligned with the footprint's "front." The math is reasoned against the
footprint code but the final glyph/sign/offset is **preview-gated** — flagged
explicitly, not claimed.

**Verification.** New `utilityPointEditSchema.test.ts` (happy-dom) **7/7** —
fields order `[type,name,demandKwhPerDay,capacityGal,phase]` with the passed-in
phase field as the exact last object; initial reflects the record (absent
demand/cap → `''`, present → numeric); `onSave` keeps finite positive
demand/cap and drops on `''`/0/-3/`'abc'`; type-change name fallback to the new
type's label; **never writes `color`**. Re-ran C4 `utilityPointTypes` **5/5**
(12/12 vitest total). Web tsc (8 GB node script) at the **3-error pre-existing
baseline** (`StepBoundary.tsx`, two `HostUnion*` tests). Adding
`'utility-point'` to the union surfaced one new tsc error —
`PlanSelectionFloater.tsx`'s exhaustive `Record<PlanSelectionKind, string>`
`KIND_LABEL` was missing the key — fixed by adding the label; grep confirmed it
was the only exhaustive map over the union. **Live DOM (Claude Preview :5200,
C6 step):** seeded `/v3/project/mtc/plan` loads with a live canvas
(`hasCanvas:true`) after the change, **zero C5-related console errors** (only
the expected `:3001` ECONNREFUSED, API down). The chevron *drawing* + the
edit-form *opening on click* stay **deferred** (stated, not claimed) behind the
auth + seeded-project (API down) + headless-WebGL + screenshot-hang wall —
MapLibre canvas clicks can't be synthesized via DOM eval, and
`preview_screenshot` hangs on this WebGL page.

**Branch hygiene.** Committed the verified slice immediately per
[[feedback-commit-immediately-on-rebased-branches]]; staged the 5 files by
explicit path, foreign WIP (`WasteVectorDashboardView.tsx`, `ZoneSomSidebar*`,
`EconomicsPanel*`, `capitalPartner*`, `launch.json`, …) left unstaged per
[[feedback-no-deletion]]. Covenant clean; "capital partners & allies" framing
per [[fiqh-csra-erased-2026-05-04]] untouched; 3-item Observe/Plan/Act IA
unchanged. ADR: [[decisions/2026-05-22-atlas-phase-c-consolidation]]. Continues
[[log/2026-05-22-canonical-feature-ownership-c4]].
