# 2026-06-03 -- OLOS thermophilic composting as a distinct lightweight vertical

**Status:** Accepted (Phases 1-3 shipped; Phase 4 deferred)
**Branch:** `feat/atlas-permaculture`
**Commits:** `bf9e7853` (P1 data foundation) -> `e26d6550` (P2 Site/Pile/Reading API)
-> `c7ec380f` (P3 frontend vertical)
**Spec:** `C:\Users\MY OWN AXIS\Downloads\compost_olos.jsx` (prototype)
**Supersedes nothing.** Related but distinct from the B2.1 Plan-side compost-cycle
card (`ccde141e`), which lives inside the land-use project Plan tier and is NOT
this standalone vertical.

## Context

A community of city composters runs thermophilic (hot) compost piles, often at
far-away sites they cannot visit often enough for manual temperature readings.
They need a dedicated OLOS surface to plan a pile, track its thermal lifecycle,
and prove pathogen-kill -- and, later, to receive readings from remote sensors.

The pivotal finding: a compost pile is a **batch / time-series instrument**, a
fundamentally different shape from OLOS's 14 **land-parcel** project types. The
prototype reuses the Plan / Act / Observe *language* but NOT the taxonomy ->
catalogue -> 7-strata -> parcel-map machinery the land-use types run on.

Amanah gate: composting serves the Environment maqsad (hifz al-bi'a). No
riba/gharar. No CSRA/advance-purchase framing involved ([[fiqh-csra-erased-2026-05-04]]).

## Decision

Build compost as a **distinct lightweight vertical**, not a 15th `ProjectTypeId`.

- It gets its **own entity family** (`compost_sites`, `compost_piles`,
  `compost_readings`, and -- Phase 4 -- `compost_devices`), modelled on the
  `olos_proof_records` time-series shape, NOT on the parcel-centric `projects`
  row. This keeps `parcel_boundary` / acreage / taxonomy semantics out.
- It is **NOT** added to `ProjectTypeId` / `PROJECT_TYPE_IDS`, gets **no**
  objective catalogue, **no** relationship-matrix row, **no** strata resolver,
  **no** parcel map. The taxonomy files
  (`packages/shared/src/constants/plan/projectTypes.ts`,
  `.../catalogues/*`, `projectTypeTaxonomy.schema.ts`) stay untouched -- the
  proof we did not leak into the land-use machinery.
- It **reuses** the existing auth / org / RBAC / persistence plumbing: JWT auth,
  `organization_members`, the `{ data, error, meta }` route envelope, and the
  Zustand + localStorage client-store pattern.
- **Audience:** community group -- multi-user, org-scoped (a pile belongs to an
  org/owner, shareable via the existing membership model), with a
  single-operator *feel* in the UI.
- **Sensor path:** vendor-agnostic device-token ingestion (Phase 4, deferred) --
  a separate ingest plugin authenticated by hashed device tokens, NOT user JWT.
  This is the only new auth surface, deliberately isolated.

## Frontend (Phase 3, this slice)

A new route family at `/compost`, mounted top-level under `appShellRoute`
(auth-gated) -- NOT under `v3ProjectLayoutRoute`, because a pile has no
`projectId` and must not load the land-use project shell. Stage switching is
internal component state (Plan / Act / Observe pills), mirroring the
self-contained prototype, so the global AppShell header stays the only chrome
above it.

Files (`apps/web/src/compost/`):
- `model.ts` -- shared palette `C`, fonts `F`, types, textbook seed data
  (`PLAN_RECIPE`, `READINGS`, `ACT_TASKS`, `PHASE_COMPARISON`), and helpers
  (`getPhase`, `getPhaseMeta`, `daysAbovePasteurisation`, `fToC`/`fToCStr`).
  Temperatures stored internally in degrees F, displayed in degrees C.
- `useCompostStore.ts` -- `zustand` + `persist` slice (`ogden-compost-pile`,
  `version: 1`); holds the pile's readings; `logReading(tempC, note)` converts
  operator Celsius -> Fahrenheit and appends.
- `PlanStage` / `ActStage` / `ObserveStage` -- TS ports of the prototype,
  pixel-matched (inline `C`/`F` styling retained for fidelity rather than full
  CSS-module extraction; only the global reset is scoped via
  `CompostWorkspace.module.css`). Act's log form writes to the store; Observe
  (Unified State + Temperature Curve + Phase Analysis) reads the same store, so
  a manually logged reading flows straight into the curve, phase detection, and
  pathogen-kill surfaces.

### Phase thresholds (encoded in `model.ts`)
- < 113 F mesophilic; 113-160 F thermophilic; > 160 F danger.
- Pasteurisation >= 131 F (>= 55 C); pathogen-kill needs >= 3 consecutive days
  >= 131 F (USDA standard; surfaced as "Pathogen Kill Status" in Observe).

## Consequences

- The vertical cannot drift into the land-use catalogue resolver -- enforced by
  dedicated tables + dedicated routes + this record.
- Observe reads `compost_readings` uniformly whether `source = manual | sensor`,
  so the Phase 4 sensor path needs no Observe rework -- only a freshness/source
  badge.
- Tradeoff accepted: the prototype's inline-style palette is kept verbatim (not
  fully ported to CSS-module tokens) to honour the pixel-match rule; `C`/`F` in
  `model.ts` is the de-facto token set for this dark vertical, kept in sync with
  `CompostWorkspace.module.css` by hand.

## Status of phases

- **P1 (data foundation):** shipped `bf9e7853`.
- **P2 (Site/Pile/Reading API):** shipped `e26d6550`.
- **P3 (frontend vertical):** shipped `c7ec380f`. Gate verified by screenshot
  (logged 64 C in Act -> stored 147 F -> Observe Current Temp 63.9 C, Days
  Pasteurising 12, Pathogen Kill CONFIRMED, curve reflects the new reading).
- **P4 (remote sensor ingestion):** deferred. `compost_devices` + provisioning
  UI + hashed device tokens + isolated `POST /api/v1/compost/ingest`
  (device-token auth, idempotent, rate-limited) + Observe source badge.
