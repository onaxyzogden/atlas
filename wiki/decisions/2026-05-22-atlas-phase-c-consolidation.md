# 2026-05-22 — Phase C consolidation: Plan-stage authoring is PDC-complete (C1–C6)

**Status.** Accepted. Closes Phase C of the "make Atlas the only tool a
student uses to produce an OSU PDC portfolio" roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`). Umbrella ADR
tying together C1–C5; C6 is this consolidation + the end-to-end verification.

**Branch.** `feat/atlas-permaculture`

**Commits.** `cf6fcbfc` (C1 paths) · `f2607703` (C2 utility points) ·
`15612b75` (C3 landDesign no-sync) · `b498fe8a` (C4 canonical ownership +
utility-point tool) · `5ad3c3b4` (C5 edit parity + orientation indicator) ·
this commit (C6 wiki/ADR/roadmap).

## Why this ADR exists

C1–C5 each landed with its own ADR/log, but Phase C as a whole had no single
page declaring it complete and naming the four patterns it established. A
future session (or a steward auditing PDC coverage) should be able to read
**one** page and understand what "finish Plan-stage authoring" actually
delivered, why it was narrower than the roadmap's "P2 emerging, finish drawing"
premise, and what verification remains deferred (and why).

## The premise correction (the load-bearing reframe)

The roadmap scoped Phase C as "bring P2 'emerging' Plan modules to a usable
baseline — zone/structure/access/utility drawing is mid-build." **Exploration
(2026-05-22) overturned that:** all four PDC feature types *already* drew →
labelled → persisted → reloaded → appeared in the Phase A master-plan capture.
The genuine remaining gaps were narrower and more precise:

1. Access paths + utility points persisted as opaque `versioned-blob`s — they
   reloaded cross-device but were **not server-queryable** and **never appeared
   in the master-plan PDF feature-roster table** (only inside the captured
   image). → **C1/C2.**
2. A latent **silent no-sync bug**: `landDesign` was classified
   `typed-design-feature` with no transport wired → localStorage-only. → **C3.**
3. **Overlapping authoring** — a steward could draw "a road" or "a well" three
   different ways with no canonical owner; and the C2 utility-point promotion
   was **unreachable** (no Plan draw tool, no v3 render layer). → **C4.**
4. **Thin v3 authoring surface** — utility points rendered but couldn't be
   selected or edited in v3; a structure's `rotationDeg` was invisible unless
   its edit form was open. → **C5.**

So Phase C was not "finish drawing." It was **make the already-drawable
features queryable, rosterable, syncable, canonically-owned, and editable in
v3** — the difference between "a student can draw it" and "a student's drawing
becomes a gradeable, durable, editable portfolio artifact."

## Four patterns Phase C established

### 1. Canonical-ownership matrix (C4)

A single canonical owner per concern, **enforced by what each tool offers**
(an authoring-surface convention), **not** by a schema change or a data
migration:

| Concept | Canonical store | Plan tool |
|---|---|---|
| Designed **access** (path/road kinds as typed paths) | `pathStore` (`ogden-paths`) | `plan.zone-circulation.path` |
| Designed **utility points** (the 11 non-BE types) | `utilityStore` (`ogden-utilities`) | `plan.structures-subsystems.utility-point` |
| Existing/proposed **infra** (well, septic, power, tank, pump, solar, fence, gate, driveway) | `builtEnvironmentStoreV2` | `plan.structures-subsystems.be.*` |
| Utility **connector lines** | `utilityRunStore` (`ogden-utility-runs`, blob) | `plan.structures-subsystems.utility-run` |
| Freeform sketch (pond/swale/paddock/road kinds) | `landDesignStore` (blob, C3) | `elementCatalog` kinds |

### 2. Typed-promotion pattern (C1/C2)

Promoting a blob-backed store onto the typed `design_features` table is a pure
**web-side** mirror of the zone/structure precedent — and needs **zero** API
and **zero** PDF-template change (the API's `DesignFeatureType` already
includes `'path'`/`'point'`; `masterPlan.ts` counts every `feature_type`). The
recipe: a mapper pair in `featureMapping.ts` + a `serverId?` field on the store
record + `syncX{Create,Update,Delete}` + a `subscribeToX` + a fetch-merge-push
block in `mergeDesignFeatures` + the queued-op case + a one-line `syncManifest`
**reclassify out of** the blob loop (so exactly one transport owns each store).
C3 is the inverse safety lesson: a store classified `typed-design-feature` with
**no** transport wired syncs **nothing** — the correct minimal fix for a
freeform-sketch store with no clean feature_type is a `versioned-blob`
reclassify, not a typed promotion.

### 3. Authoring-surface type-split (C4)

When two stores model overlapping concepts (`utilityStore`'s 15 types vs BE
V2's `utility`/`infrastructure` kinds, 4 exact duplicates), resolve the
duplication at the **authoring surface** — a pure, derived
`UTILITY_POINT_TYPES = Object.keys(UTILITY_TYPE_CONFIG) − BE_OWNED` partition
(pinned by a test that fails if a new `UtilityType` is added unclassified) — so
the new tool offers only the non-overlapping kinds and the duplicates are
authored via the canonical `be.*` tools. **No persisted data moves**
(stewardship sovereignty), and a new type auto-buckets.

### 4. v3 edit-parity surface (C5)

Every PDC feature type a steward draws is now click-to-edit on the v3 canvas
with a field set that matches its draw form: **paths**
(`buildPathEditSchema`), **structures** (the inline edit form +
`createFootprintPolygon` regeneration + the new selected-structure orientation
chevron), and **utility points** (the new `buildUtilityPointEditSchema` +
dedicated click-to-edit listener). The orientation indicator is the smallest
viable "see what you authored" affordance: a single facing chevron on the
**selected** structure only, rebuilt in `apply()` like `selectedGuildId`
styling, rotated by the stored `rotationDeg` (negated — `text-rotate` is
CW-from-north while `createFootprintPolygon` rotates CCW in metric space).

## C5 detail (the slice with no prior ADR)

`5ad3c3b4` (5 files, +325). Two authoring-polish gaps:

- **Utility-point edit parity.** New `'utility-point'` `PlanSelectionKind`
  (distinct from `'utility'`, the connector-run kind);
  `buildUtilityPointEditSchema` (mirrors the C4 draw form —
  type/name/demandKwhPerDay/capacityGal + the caller-supplied phase field;
  demand/cap kept only if finite > 0; type-change name fallback to the new
  type's label; **never writes `color`** — render derives it, `Utility` has
  none); a **dedicated** editable click-to-edit listener on the
  `${LAYER_PREFIX}point` layer (separate from the fertility/water drag handler
  because `utilityStore` has **no zundo/temporal** middleware → no
  `beginDragUndoWindow`; selection writes are idempotent with the read-only
  KIND_MAP listener); `'utility-point'` added to the read-only `KIND_MAP` (so
  it selects in Observe/Act) and to `PlanSelectionFloater`'s `KIND_LABEL`
  (the exhaustive `Record<PlanSelectionKind, string>` — a missing key fails
  the build, which is what surfaced it).
- **Selected-structure orientation indicator.** A facing chevron (`▲`) at the
  structure's `turf.centroid`, built in `apply()` from `selectedStructureId`,
  empty when nothing (or a non-structure) is selected; `text-keep-upright:
  false` so it turns (flow-arrow precedent), `text-rotate` negated.

## Tests / verification (C6 end-to-end)

**Unit (web vitest), all green:**

- C1 `featureMappingPath` 4/4 · C2 `featureMappingUtility` 5/5 (typed-promotion
  mappers).
- C3 `syncManifest` 10/10 + `syncManifestRoundTrip` 67/67 = 77 (blob-loop
  enumerates design-elements).
- C4 `utilityPointTypes` 5/5 (BE_OWNED = the 4, UTILITY_POINT_TYPES = the 11,
  15-way partition, never-offers-BE, option validity).
- C5 `utilityPointEditSchema` 7/7 (fields/initial/onSave sanitization/type-name
  fallback/no-color).

**Typecheck (web, 8 GB node script `node --max-old-space-size=8192
../../node_modules/typescript/bin/tsc --noEmit` from `apps/web`):** only the
**3 known pre-existing unrelated** errors remain — `StepBoundary.tsx`,
`HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`. The foreign
`WasteVectorDashboardView.tsx` / `ZoneSomSidebar*` / `EconomicsPanel*` /
`capitalPartner*` WIP in the working tree is excluded from every by-name
commit.

**Live DOM-level (Claude Preview, web dev server :5200, C6):** the seeded
`/v3/project/mtc/plan` route loads with a live MapLibre canvas
(`hasCanvas:true`, `canvasCount:1`, body ~136 KB) **after** the C5 changes, and
the console shows **no error from C5 code** — only the expected `[SYNC]
:3001 ECONNREFUSED` (API down, irrelevant here, same as C4). This is a real
regression gate: the new edit-click `useEffect` and the `orient` symbol layer
do **not** crash the Plan render.

## Verification deferrals (stated, not claimed — per project CLAUDE.md)

- **The orientation chevron *drawing* on a selected structure** and the
  **utility-point edit form *opening on a map-feature click*** require the full
  stack — a running web server **+** an authenticated session **+** the seeded
  typed `design_features` (structures / utility points, which load via initial
  sync from the API that is **down** at `:3001`) **+** headless WebGL **+** a
  MapTiler tile key — and `preview_screenshot` hangs on this WebGL/backgrounded
  canvas. MapLibre canvas clicks also can't be synthesized via DOM eval. **No
  visual success is claimed.** The chevron glyph/sign/offset math is reasoned
  against `createFootprintPolygon` (CCW metric → negated CW `text-rotate`) but
  is **visually unverified**; the final nudge is preview-gated.
- **Live cross-device round-trip** (draw a path/utility point → reload → POST
  `/design-features` with `featureType` `path`/`point` → master-plan PDF
  feature-roster) sits behind the same auth + seeded-project + headless-WebGL +
  MapTiler wall as Phase A/A5/B. Covered meanwhile by the C1–C5 unit tests +
  typecheck.

This is the durable verification posture for the whole permaculture authoring
surface in this environment: unit tests + typecheck are authoritative; the live
WebGL round-trip is a manual/hardware-WebGL slice.

## Covenant + IA

No public-facing capital framing touched — "capital partners & allies" per
[[fiqh-csra-erased-2026-05-04]] untouched; no CSRA / *bayʿ mā laysa ʿindak* /
salam reintroduced. 3-item Observe/Plan/Act IA unchanged. **No persisted data
migrated across all of Phase C** — every promotion is a transport/authoring
change; stewardship sovereignty preserved. Each slice committed immediately on
verify (branch rebased out-of-band), staged by name with foreign WIP preserved
per [[feedback-no-deletion]] / [[feedback-commit-immediately-on-rebased-branches]].

## What Phase C means for the PDC goal

With Phase A (master-plan/base/zone map export), Phase B (planting-plan
export), and Phase C (Plan-stage authoring: queryable + rosterable + syncable +
canonically-owned + v3-editable for all four PDC feature types), the three
roadmap gaps that blocked Atlas from producing a *complete* OSU PDC portfolio
are closed. The remaining boundary is intentional and out of scope: Canvas +
the peer-review blog are the course LMS, not an Atlas concern.

## Related

- Log: [[log/2026-05-22-c6-phase-c-consolidation]]
- C5 log: [[log/2026-05-22-c5-structure-orientation-utility-edit-parity]]
- C4 ADR: [[decisions/2026-05-22-atlas-canonical-feature-ownership-c4]]
- C1–C2 ADR: [[decisions/2026-05-22-atlas-typed-promotion-access-utility]]
- C3 log: [[log/2026-05-22-landdesign-no-sync-fix-pdc-phase-c3]]
- Phase B ADR: [[decisions/2026-05-22-atlas-planting-plan-merged-schedule]]
- Phase A ADR: [[decisions/2026-05-21-atlas-master-plan-map-export]]
- Entity: [[entities/pdf-export-service]]
