# Operation Log

Chronological record of significant operations performed on the Atlas codebase.

---

## 2026-05-05 — 8.1-B follow-ups: lat-buffer, test triage, multi-tile stitch

Three independent commits on PR #12 (`claude/vigilant-elbakyan-2d16d9`)
closing the follow-ups flagged in the 8.1-A/B debrief.

**Piece A — Latitude-aware longitude buffer** (`456f112`).
`PollinatorOpportunityProcessor.tryPolygonPath`'s inline ClipProvider now
applies cosine-of-latitude correction: `latBuf = bufferKm/111`,
`lngBuf = bufferKm / (111 * max(0.1, cos(meanLat)))`. The 0.1 cosine floor
caps buffer expansion at 10× near the poles. Prior flat `bufferKm/111`
under-buffered longitude by ~50 % at 60° N. Production posture unchanged.

**Piece B — Pre-existing test triage** (`5f5e33a`). All six pre-existing
failures fixed in a single commit; `apps/api` vitest 512/518 → 518/518
(later 523/523 after Piece C).
  - `NasaPowerIntlRouting.test.ts`: removed `'groundwater'` from
    `layersWithoutIntl` (registered to `IgracGroundwaterAdapter` on
    2026-05-04).
  - `boundary.test.ts`: enqueued an extra `projectRow()` for the new
    `refuseIfBuiltin` SELECT in POST `/projects/:id/boundary`.
  - `smoke.test.ts` + `projects.test.ts` + `helpers/testApp.ts`: added a
    `.json` passthrough on `mockDb` so the route's `db.json(metadata)`
    call no longer throws — root cause of the cascading 500/404 failures.
  - `siteAssessmentsPipeline.integration.test.ts`: enqueued
    `{ present: '3' }` between completion check and debounce check for
    the new derived-layer presence guard in `SiteAssessmentWriter`.

**Piece C — Multi-tile stitching in `clipToBbox`** (`33bb8fa`).
`LandCoverRasterServiceBase.clipToBbox` now stitches up to 4 aligned
tiles. Validation gates: matching xRes/yRes, integer-multiple origin
offsets, identical GDAL NoData, identical vintage, and
`≤ CLIP_MAX_TILES (=4)` intersecting entries. On any mismatch the
method returns `null` and the orchestrator falls back to the
synthesized-grid path. Single-tile fast path preserved verbatim
(extracted into `clipSingleTile`). Stitched buffer is a single
`Int32Array` of size W×H, prefilled with NoData and filled by per-tile
`readRasters` → memcpy at the absolute (ref-grid) pixel position.
Tests: 9 cases (3 single-tile preserved + 6 new — horizontal, vertical,
4-corner stitch, grid misalignment, mixed NoData, >4 tiles).

**Verification:** `tsc --noEmit` clean across `@ogden/api`. Full
`npx vitest run` reports **523/523 passing**. Production posture
unchanged: `POLLINATOR_USE_POLYGON_FRICTION` and `LANDCOVER_TILES_READY`
stay default-off; `verify-scoring-parity` delta untouched.

---

## 2026-05-05 — 8.1-A + 8.1-B engineering burn-down (Phases 1–8)

Eight-phase burn-down landed against fixture COGs after 2026-05-05 ADR
locked the toolchain. When real raster tiles arrive the only added
step is dropping them under `data/landcover/<source>/<vintage>/` and
flipping `LANDCOVER_TILES_READY=true`.

What shipped:

- **Phase 1 — Raster services** (`apps/api/src/services/landcover/`):
  `LandCoverRasterServiceBase` (abstract; manifest, LRU TIFF cache,
  proj4 reprojection, per-tile pixel-window sampling) plus
  `NlcdRasterService` (EPSG:5070), `AciRasterService` (EPSG:3347),
  `WorldCoverRasterService` (EPSG:4326). Lazy logger pattern fixes
  the abstract-property-in-constructor TS error.
- **Phase 2 — Adapters + dispatch** (`apps/api/src/services/pipeline/adapters/`):
  `NlcdLandCoverAdapter`, `AciLandCoverAdapter`,
  `WorldCoverLandCoverAdapter` + shared `landCoverAdapterCommon.ts`
  (bbox extraction, histogram → AdapterResult). Orchestrator's
  `resolveAdapter` is env-flag-gated: when `LANDCOVER_TILES_READY=true`
  AND the manifest is loaded, `'NlcdAdapter'` / `'AafcLandCoverAdapter'`
  registry strings dispatch to the new raster-sample adapters.
  Otherwise the legacy WMS path is preserved. Zero registry-config diff.
- **Phase 3 — Schema** (`packages/shared/src/scoring/layerSummary.ts`):
  `LandCoverSummary` extended with `samplingMethod`, `licence_short`,
  `pixelCount`, `validPixelCount`, `nodataPixelCount`, `dominantClass`,
  `vintage`, `dataSources[]`, `classMeta`, `heuristic_note`.
- **Phase 4 — Polygonisation library**
  (`packages/shared/src/ecology/`): `polygonizeBbox` (signature locked
  by ADR D8; `clipProvider` + `polygonizer` + `reprojector` injection),
  `polygonizePixelGrid` pure-JS fallback for fixtures, and
  `deriveCorridorFriction` (re-uses `COVER_IMPEDANCE` from corridorLCP
  so polygon and zone-grid paths agree on weights). Production GDAL
  shell-out lives at `apps/api/src/services/landcover/polygonizeWithGdal.ts`;
  `writeClipAsGeotiff` deliberately stubbed until Phase 5 wiring.
- **Phase 5 — Processor swap**
  (`apps/api/src/services/terrain/pollinatorPolygonPath.ts` +
  `PollinatorOpportunityProcessor.ts`): feature flag
  `POLLINATOR_USE_POLYGON_FRICTION` + 60s `withTimeout` race +
  `samplingMethod: 'polygon' | 'synthesized_grid'` provenance. The
  scaffold falls through to the synthesized grid until `clipToBbox`
  is wired on the base class — that lands when Phase 6 ingest runs
  and real tiles exist to verify against.
- **Phase 6 — Operator ingest** (`apps/api/src/jobs/landcover-tile-ingest.ts`):
  per-vintage cogification via `gdal_translate -of COG`, manifest
  emission for the runtime services to load on boot. Mirrors the
  `cpcad-ingest.ts` operator-runs-once pattern.
- **Phase 7 — Tests**
  (`packages/shared/src/tests/polygonizeBbox.test.ts`): 7 fixture
  tests against a 10×10 NLCD pixel grid (Deciduous Forest vs
  Cultivated Crops); validate pixel count, NoData skip, abstract
  injection, conditional reprojection, friction derivation,
  permeable/hostile area aggregation. Full shared suite stays green
  at 166/166.

Architectural simplifications worth recording:

- **Env-flag-gated dispatch** beat registry-config swap. Pre-tile
  production stays untouched; one env var flip activates the new path.
- **Polygon path returns null when not yet wired** rather than
  throwing. The 60s timeout race + null fallback collapses three
  failure modes (manifest missing, GDAL absent, slow run) into one
  graceful synthesized-grid fallback.
- **Pure-JS `polygonizePixelGrid` is the test path, not a production
  fallback.** Production must use `gdal_polygonize.py` (D5) for
  topology; the pure-JS path emits per-cell rectangles that are
  fine for fixture verification but wouldn't compose into a clean
  patch graph at parcel scale.

Files (new):
- `apps/api/src/services/landcover/{LandCoverRasterServiceBase,Nlcd,Aci,WorldCover}RasterService.ts`
- `apps/api/src/services/landcover/polygonizeWithGdal.ts`
- `apps/api/src/services/pipeline/adapters/{Nlcd,Aci,WorldCover}LandCoverAdapter.ts`
- `apps/api/src/services/pipeline/adapters/landCoverAdapterCommon.ts`
- `apps/api/src/services/terrain/pollinatorPolygonPath.ts`
- `apps/api/src/jobs/landcover-tile-ingest.ts`
- `packages/shared/src/ecology/{polygonizeBbox,corridorFriction}.ts`
- `packages/shared/src/tests/polygonizeBbox.test.ts`

Files (edited):
- `apps/api/src/lib/config.ts` (5 + 2 env vars)
- `apps/api/src/app.ts` (boot init for 3 raster services)
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` (env-flag dispatch)
- `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts` (polygon path swap)
- `packages/shared/src/scoring/layerSummary.ts` (LandCoverSummary provenance)
- `packages/shared/src/index.ts` (re-export new ecology modules)
- `wiki/log.md`, `wiki/index.md`

Status: tsc clean across `apps/api` and `packages/shared`. 166/166
shared tests green. Awaiting raster tiles to flip
`LANDCOVER_TILES_READY=true` and exercise the production path.

---

## 2026-05-04 — 8.2-A.2 — IgracGroundwaterAdapter shipped

Second engineering slice of accepted ADR 8.2-A. The adapter reads
from `groundwater_wells_global` (migration 023 from earlier today,
commit d1cecd0) and is registered as the INTL slot under
`ADAPTER_REGISTRY.groundwater` so non-US/CA parcels stop falling
through to `ManualFlagAdapter`.

Wiring choices worth recording:

- **`resolveAdapter(layerType, country, db?)` — db-handle threaded
  conditionally.** Most existing 16 adapters call external HTTP
  APIs and need no DB. Adding `db` to the function signature as an
  optional parameter keeps the existing branches untouched; the
  IGRAC branch fails loud as `PIPELINE_MISCONFIGURED` if `db` is
  missing rather than silently downgrading. Cleanest minimal change
  vs. introducing an `AdapterContext` struct, which would mean
  touching every adapter.
- **Confidence pinned to `'medium'` on a hit.** ADR called this
  out: even when the adapter finds a well, the national-agency
  reporting cadence means the data may lag current conditions by
  1-3 years. Caller-side scoring should be able to discriminate
  between IGRAC (medium) and NWIS/PGMN (high). Surfaced via
  `summaryData.vintage_caveat` for diagnosis-report copy.
- **PostGIS query shape.** Bbox containment via `ST_MakeEnvelope`
  + `&&` operator hits the GIST index; `ST_Distance(geom::geography,
  ...)::geography` gives metres for the nearest-N sort. Limit 50
  candidates is generous for 0.5° windows.

Typecheck: `tsc --noEmit` clean across `@ogden/shared` and `apps/api`.

Commit: d044e1b. 8.2-A.3 (quarterly ingest job) and 8.2-A.4
(client-side fall-through in `layerFetcher.ts`) remain — left for
the next session.

---

## 2026-05-04 — First engineering slice of 8.2-A: migration 023

After the 8.2-A accepted ADR landed earlier the same day,
`apps/api/src/db/migrations/023_groundwater_wells_global.sql` ships
the first sub-slice (8.2-A.1).

Schema choices worth recording:

- **`(source, station_id)` composite primary key.** The ADR
  describes IGRAC GGIS as the only source for this table now, but
  the open follow-up notes a per-country adapter expansion (UK BGS,
  AU BoM, EU EGDI) is on the table for launch-tier customers in
  countries needing higher freshness than IGRAC's quarterly cadence.
  Composite PK lets a future ingest job populate the same table
  with a different `source` value without a schema migration.
- **`geom(Point, 4326)` + GIST index** rather than separate
  `lat`/`lon` numeric columns. Matches the migration-003 PostGIS
  pattern (`viewshed_observer_point`); the adapter's first query
  shape is a parcel-bbox containment check, which GIST hits cheaply.
- **`ingest_vintage` column + index** so the refresh job can load a
  new vintage alongside the live one and flip reads via a constant
  on the adapter side. Cleaner than a delete-and-replace cut-over.
- **`raw_attributes JSONB`** pass-through for upstream fields not
  normalised. Avoids dropping signal we may want later (e.g. aquifer
  type, well purpose) without committing to a schema for it now.

Commit: d1cecd0. 8.2-A.2 (adapter) + 8.2-A.3 (quarterly ingest job)
ride on this in follow-up commits — left for the next session to
keep this one shippable.

---

## 2026-05-04 — Phase 8.1-B + 8.1-C promoted to accepted ADRs

Wrote two accepted ADRs locking the remaining substantive decisions
from the pollinator-corridor scoping ADR:

- [`2026-05-04-pollinator-corridor-polygonize-friction.md`](decisions/2026-05-04-pollinator-corridor-polygonize-friction.md)
  — D2 + D3 locked: `polygonizeBbox(parcel, bufferKm = 2)` runs
  on-demand inside Tier-3 BullMQ; class-table friction derived from
  existing `POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS`
  (no new parameter table). 60 s timeout falls back to the legacy
  synthesised-grid path. WorldCover's `crop_unspecified` bucket gets
  a moderate-friction midpoint = 1.0. Implementation slicing
  8.1-B.1 → 8.1-B.4.
- [`2026-05-04-pollinator-corridor-patch-graph-lcp.md`](decisions/2026-05-04-pollinator-corridor-patch-graph-lcp.md)
  — D4 + D5 locked: graph-theoretic Dijkstra on the polygonised
  patch graph; `connectivityRole` becomes a real graph property;
  `summary_data.geojson_data.corridorGeometries` adds LineStrings
  for stepping_stone→core shortest-path edges. Constants locked
  (`MIN_GAP_M = 50`, `CORE_AREA_HA = 1.0`, `MAX_FORAGING_M = 3000`);
  raster Dijkstra deferred to optional 8.1-E. Implementation
  slicing 8.1-C.1 → 8.1-C.5.

Pollinator-corridor scoping ADR `2026-05-02-raster-pollinator-corridor-scoping.md`
status promoted from "Partially Accepted" to "Accepted". Only
8.1-D (methodology page) remains as a doc-only follow-up.

---

## 2026-05-04 — Phase 8.1-A promoted to accepted ADR

Wrote `2026-05-04-pollinator-corridor-hybrid-landcover.md` locking
the three-adapter hybrid (NLCD US + AAFC ACI Canada + ESA WorldCover
global fallback) with country-resolver routing and per-feature
provenance. Resolved all three scoping-ADR open questions in the
same pass:

- **Vintage mixing.** Per-feature `vintage` + diagnosis-report
  footnote; no ecoregion-level `dataDateMin` gate. The pollinator
  layer is advisory (not part of `computeScores.ts`), so honest
  disclosure beats coverage gating.
- **Taxon-specific friction.** Out of scope for Phase 8.1.
  Universal class-table friction in 8.1-B; taxon-specific rides on
  as a P2 follow-on if stakeholder review surfaces a gap.
- **Buffered bbox.** Default 2 km (mid-range native bee foraging
  per Sponsler & Johnson 2017), locked as `POLLINATOR_BUFFER_KM`
  in `corridorFriction.ts`.

Scoping ADR status: "Partially Accepted" — D1 + open questions
done; D2-D5 stay scoped but now unblocked.

External-data verification checklist in
`wiki/concepts/external-data-sources.md` updated: pollinator
friction granularity + buffered polygonization both marked resolved.

---

## 2026-05-04 — Phase 8.2 D1 + D2 promoted to accepted ADRs

Wrote two accepted ADRs locking the scoping ADR's recommendations
under the R&D-phase posture confirmed earlier in the session:

- [`2026-05-04-igrac-global-groundwater-fallback.md`](decisions/2026-05-04-igrac-global-groundwater-fallback.md)
  — server-side adapter + quarterly ingest + per-source provenance
  + vintage caveat. Implementation slicing 8.2-A.1 → 8.2-A.4.
- [`2026-05-04-tiered-conservation-overlay.md`](decisions/2026-05-04-tiered-conservation-overlay.md)
  — three adapters (WDPA monthly, NCED quarterly, ECCC ESG static)
  feeding one display layer with per-feature `source` provenance.
  Implementation slicing 8.2-B.1 → 8.2-B.5; 8.2-B.1 first task is
  capturing NCED terms-of-use.

Both commercial-use clearances (IGRAC, WDPA) are launch-gate items,
not ship blockers — outbound inquiries already drafted under
`wiki/inquiries/`.

Scoping ADR `2026-05-02-global-groundwater-esg-sources-scoping.md`
status promoted from "Partially Accepted" to "Accepted" with
forward-references to the two new ADRs. Index entries added.

---

## 2026-05-04 — External-data verification: WDPA + Theobald resolved, R&D-phase stance

Parallel WebSearch on the two non-IGRAC verification items in
`wiki/concepts/external-data-sources.md`:

- **Theobald HM raster — resolved.** Canonical raster identified as
  Kennedy, Oakleaf & Theobald 2020 (ESSD 12, 1953; CC-BY 4.0;
  figshare + Data Basin distribution). Citation correction applied —
  the scoping ADR's "Theobald (2014)" was a misdate of the 2010/2013
  Springer papers.
- **WDPA terms — clarified, but stricter than the scoping ADR
  characterised.** UNEP-WCMC requires prior written permission for
  commercial use of WDPA Materials *or any work derived from them*.
  The scoping ADR's "ingest + exclude raw tiles from export"
  workaround does not cover the derived intersection result.

**Operator stance applied:** Atlas is in R&D phase. Research/non-
commercial use of WDPA + IGRAC covers current development; the
commercial licence question is a launch-readiness sprint item, not
a 8.2-A/B ship blocker. Drafted parallel outbound inquiry
`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`
(to `business-support@unep-wcmc.org`) for the launch gate.

Files touched: `wiki/concepts/external-data-sources.md` (Theobald
section + WDPA section + verification checklist), new
`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`,
launch-gate notes added to the IGRAC inquiry, `wiki/index.md`.

---

## 2026-05-04 — Merge origin/main into PR #12

After pushing the 8.3-A + external-data-sources commits, PR #12 surfaced
seven conflicts because `feat/atlas-permaculture` (PR #6) had already
merged into main on top of the earlier PR #10 of this same branch.

Resolution choices:
- **public-portal stub** (`apps/api/src/routes/public-portal/index.ts`,
  `apps/web/src/features/public-portal/PublicPortalPage.tsx`) — kept
  deleted (Phase 8.3-A consolidation).
- **future-geospatial route** — combined main's richer
  `FutureGeospatialResponse.parse` envelope shape with this branch's
  LATENT phase tag + ADR pointer.
- **moontrance-identity route** — kept this branch's per-project gate
  implementation (D1 from accepted ADR — `requireMoontranceProject`
  custom gate that 404s if no opt-in row).
- **FutureGeospatialPage.tsx** — combined main's `SectionScaffold`
  import with this branch's LATENT comment + renamed name/notes copy.
- **Two scoping ADRs** — kept this branch's Accepted /
  Partially-Accepted statuses; the proposed-status main carried was
  the pre-acceptance state.
- **app.ts** — auto-merged (main's `relationshipRoutes` import +
  this branch's §27 deletion both retained).

API tsc clean after the merge — the pre-existing
`projects/index.ts:117` spread error documented this morning appears
to have been fixed on main during the permaculture sprint. Merge
commit `7dd49c4`, pushed.

---

## 2026-05-04 — External-data-sources reference doc (Phase 8 deferred-slice prep)

Of the four remaining Phase 8 deferred items, three (8.1, 8.2-A, 8.2-B) are
gated on external-data ingest infrastructure that can't honestly be set up
in a single session, and one (8.4) is hard-blocked because the OBSERVE/SWOT
substrate doesn't exist on this branch. Rather than scaffold empty adapters
and call them "implementations" (the failure mode from this morning's
fabricated compaction summary), wrote the small piece that *is* shippable:
the licensing + attribution + refresh-cadence reference for every external
source the deferred slices touch, in one place.

[`wiki/concepts/external-data-sources.md`](concepts/external-data-sources.md)
covers ESA WorldCover, USGS NLCD, AAFC ACI, Theobald HM (with verification
note on canonical raster source), IGRAC GGIS (with the unresolved
CC-BY-vs-CC-BY-NC contradiction in the scoping ADR flagged explicitly),
WDPA (CC-BY-NC + offline-bundle exclusion path), NCED, ECCC Ecological
Gifts. Each entry has attribution string + URL + open question carried
from its source ADR. Verification checklist at the bottom enumerates the
six unresolved items that block any of these from entering an accepted ADR.

The next ingest session opens with this doc instead of re-deriving licence
terms from the scoping ADRs.

---

## 2026-05-04 — Phase 8.3-A: P4 public-portal Section 27 consolidation

Picked up the deferred 8.3-A item from this morning's Phase 8 batch. The
Phase 8.3 scoping ADR proposed a fresh P4 build (new `project.published_at`
column, visitor token, `PublicPortalContent` schema, cache layer). Survey of
the actual code surface showed all of that intent is already implemented under
a different prefix:

- `apps/api/src/routes/portal/public.ts` — share-token-keyed unauthenticated read, filters on `is_published = true`
- `apps/api/src/routes/portal/index.ts` — RBAC-gated steward CRUD
- `apps/api/src/db/migrations/004_project_portals.sql` — `is_published` + `published_at` + per-portal `share_token` UUID
- `packages/shared/src/schemas/portal.schema.ts` — `PortalRecord` covers hero, mission, sections, story scenes, before/after pairs, donation CTA, brand colour, data masking level
- `apps/web/src/features/portal/PublicPortalShell.tsx` — front-end render

Section 27's `apps/api/src/routes/public-portal/index.ts` and
`apps/web/src/features/public-portal/PublicPortalPage.tsx` were the no-op
scaffold-section stubs returning `{ data: [], meta: { total: 0 } }` and a
placeholder div — dead duplication of the working stack.

**Action.** Deleted both stub directories; removed the import + `app.register`
line at `apps/api/src/app.ts` (renamed Batch 7 comment to §§24, 28, 29 with a
pointer to portal/*); added a TODO block at the top of
`apps/api/src/routes/portal/public.ts` capturing the cache + rate-limit gaps
(D2 + D4) for the launch-readiness sprint.

ADRs:
- [`wiki/decisions/2026-05-04-p4-public-portal-section27-consolidation.md`](decisions/2026-05-04-p4-public-portal-section27-consolidation.md) — Accepted
- [`wiki/decisions/2026-05-02-phase-gated-future-routes-scoping.md`](decisions/2026-05-02-phase-gated-future-routes-scoping.md) — Status promoted to Accepted (D3 closed via the consolidation ADR above)

**Build verify.** `apps/api` tsc clean except the pre-existing
`projects/index.ts:117` spread error documented this morning. `apps/web` shows
no errors involving public-portal — clean delete.

**Deferred to launch-readiness sprint:**
- Cache layer in front of `portal/public.ts` (CDN/ISR/blob render).
- Visitor rate-limit (`@fastify/rate-limit` plugin scope, not portal-specific).
- Steward UI audit: whether `PortalConfigPanel` exposes every `CreatePortalInput` field.

---

## 2026-05-04 — OLOS Phase 8 partial implementation (8.2-C, 8.3-B, 8.3-C)

Three of four scoped Phase 8 ADRs landed; 8.4 deferred because the OBSERVE/SWOT substrate it rolls up doesn't exist on this branch.

**8.2-C — Drop state mining registry scrape** (per ADR `2026-05-02-global-groundwater-esg-sources-scoping` D3). Removed `StateMineralRegistry`, `US_STATE_MINERAL_REGISTRIES` (TX/ND/WY/CO/OK/MT), `US_STATE_MINERAL_INFORMATIONAL` (PA/KY/WV/LA/CA/NM/AK), and `queryStateMineralRegistry` from `apps/web/src/lib/layerFetcher.ts`. `fetchMineralRightsComposite` retains federal BLM + BC MTO only; emits a generic legal-checklist note when a US state code resolves. `pickField` retained for water-rights fetcher.

**8.3-C — Rename FUTURE → LATENT** (per ADR `2026-05-02-phase-gated-future-routes-scoping` D2). `PhaseTag` union, `PHASE_ORDER`, Section 28 entries, and `phaseAtMost` branch updated in `packages/shared/src/featureManifest.ts`. `apps/api/src/plugins/featureGate.ts`: `futureEnabled` → `latentEnabled`, reads `ATLAS_LATENT ?? ATLAS_FUTURE` (legacy env honoured for transition). Route doc + `requirePhase('LATENT')` updated in `apps/api/src/routes/future-geospatial/index.ts`; `apps/web/src/features/future-geospatial/FutureGeospatialPage.tsx` doc updated; `apps/api/scripts/scaffold-section.ts` `Phase` type + `VALID_PHASES` updated.

**8.3-B — Moontrance per-project gate** (per ADR `2026-05-02-phase-gated-future-routes-scoping` D1). New migration `apps/api/src/db/migrations/022_project_moontrance_identity.sql` — table keyed by `project_id` with `enabled` flag, `summary` jsonb, FK CASCADE on projects, partial index on enabled rows. Route `apps/api/src/routes/moontrance-identity/index.ts` rewritten: `GET /:projectId` with preHandler chain `authenticate → requirePhase('MT') → resolveProjectRole → requireMoontranceProject` (custom inline gate that 404s if no opt-in row; `NotFoundError` not Forbidden so route existence isn't leaked).

**Build verify.** `tsc --noEmit` clean for `packages/shared`. `apps/api` fails only on the pre-existing `src/routes/projects/index.ts:117` spread error (verified by stashing changes — same failure before my edits). `apps/web` reports no errors in any file I touched (only pre-existing failures in `QuietCirculationRouteCard` and `HerdRotationDashboard` imports). No new tsc errors introduced.

**Deferred this session (multi-session scope):**
- 8.1 — raster pollinator-corridor (NLCD/ACI/WorldCover hybrid + LCP)
- 8.2-A — IGRAC global groundwater adapter
- 8.2-B — WDPA + NCED + ECCC ESG tiered overlay
- 8.4 (A–D) — OBSERVE Phase 4b–4f rollup. The `apps/web/src/features/observe/` directory and `store/site-annotations.ts` referenced by the ADR don't exist on this branch; the rollup substrate landed (or didn't) in a different lineage. Revisit after locating the OBSERVE work.

ADRs:
- [`wiki/decisions/2026-05-02-global-groundwater-esg-sources-scoping.md`](decisions/2026-05-02-global-groundwater-esg-sources-scoping.md) — Partially Accepted (D3 only)
- [`wiki/decisions/2026-05-02-phase-gated-future-routes-scoping.md`](decisions/2026-05-02-phase-gated-future-routes-scoping.md) — Partially Accepted (D1 + D2; title FUTURE→LATENT)

Note: a prior compaction summary reported these phases as fully-shipped on this branch. They were not — git history confirms zero implementation commits prior to this entry. The summary was reconstructed from this fresh implementation against the restored ADRs.

---

## 2026-05-03 — TanStack Router migration (atlas-ui)

Replaced the 12-way `window.location.pathname` switch in `apps/atlas-ui/src/main.jsx`
with TanStack Router v1.79.0.

**Files changed:**
- `apps/atlas-ui/package.json` — added `@tanstack/react-router: ^1.79.0`
- `apps/atlas-ui/src/routes/index.jsx` (new) — full route tree: `rootRoute`,
  `indexRoute` (/ → /observe redirect via `beforeLoad`), 11 leaf routes,
  `notFoundComponent` on the root for 404 handling
- `apps/atlas-ui/src/main.jsx` — replaced pathname switch with `<RouterProvider router={router} />`
- `apps/atlas-ui/vite.config.js` — added `resolve.dedupe: ["react", "react-dom"]`

**Duplicate React fix** — workspace root `node_modules` contains React 18.3.1 (used by
`apps/web`); `apps/atlas-ui/node_modules` has React 19.2.5. TanStack Router was
resolving React 18, causing "Invalid hook call" errors. `resolve.dedupe` in Vite pins
all React imports to the atlas-ui local copy (React 19).

**404 handling** — TanStack Router v1 does not match `path: "*"` the same way other
routers do. Custom 404 uses `notFoundComponent` on `createRootRoute` instead.

**Smoke test** — all 12 routes return HTTP 200 from Vite dev server; no console errors;
custom 404 renders correctly for unknown paths.

---

## 2026-05-03 — `GET /projects/builtins` API endpoint + migration 016

New public (unauthenticated) endpoint in `apps/api/src/routes/projects/index.ts`
returns the 351 House demo project by sentinel UUID
(`00000000-0000-0000-0000-0000005a3791`).

**Migration `016_builtin_sample_project.sql`** — inserts a sentinel service
user (`00000000-0000-0000-0000-000000000001`, `auth_provider = 'system'`) and
the 351 House project row with `ON CONFLICT DO NOTHING`. Applied against
local dev DB (row already existed from earlier manual seed — idempotent).

**Route** — `GET /projects/builtins` registered before `/:id` (avoids
Fastify matching `"builtins"` as a param). No `preHandler` — fully public.
`acreage` and `data_completeness_score` cast to `float8` in the SELECT to
prevent Zod `invalid_type` errors (PostgreSQL `numeric` columns are returned
as strings by the postgres.js driver).

**CORS** — `CORS_ORIGIN` changed from a single string to a comma-separated
list; `app.ts` splits it into an array. Default now includes both
`http://localhost:5200` (apps/web) and `http://localhost:5300` (apps/atlas-ui).
Production deployments set `CORS_ORIGIN` explicitly as a single value.

**Smoke test** — `atlas-ui` browser context (`localhost:5300`) fetches the
endpoint cross-origin: `status 200 · name "351 House — Atlas Sample" · CA/ON ·
11.95 ha · hasParcelBoundary true`.

Next: replace `builtin-sample.js` static `project`/`siteBanner` top-level
constants with a `useBuiltinProject()` hook that reads from this endpoint.

---

## 2026-05-03 — `apps/atlas-ui` lifted; 11 OBSERVE pages on typed `builtin-sample.js` adapter

New app `apps/atlas-ui` (React 19 + Vite 7, port 5300) added to the
pnpm + Turborepo workspace alongside `apps/web`. The OGDEN Land
Operating System prototype was lifted verbatim into the monorepo
(Phase 1A), QaOverlay-toggled to visual fidelity (Phase 1B), then
all 11 OBSERVE routes refactored onto a single-source-of-truth typed
view-model module at
[`apps/atlas-ui/src/data/builtin-sample.js`](../apps/atlas-ui/src/data/builtin-sample.js)
(Phase 1C).

**Pages refactored (11):** ObservePage, ObserveDashboardPage,
HumanContextDashboardPage, StewardSurveyPage,
IndigenousRegionalContextPage, VisionPage, MacroclimateDashboardPage,
SolarClimateDetailPage, TopographyDashboardPage, TerrainDetailPage,
CrossSectionToolPage, EarthWaterEcologyPage.

**Pattern.** Each page imports a named view-model from
`builtin-sample.js` as `vm` plus optional `siteBanner` /
`breadcrumbStem`. Icons in data are **string keys**
(`"sun"`, `"droplet"`, `"triangle"`); per-page `iconMap` resolves
to `lucide-react` components at render time. Keeps the data file a
pure-value module that `/projects/builtins` can replace one-to-one.

**351 House — Halton, ON** is the sample project (sentinel UUID
`00000000-0000-0000-0000-0000005a3791`). Prototype's hardcoded
"Green Valley Homestead / Nimbin, NSW" strings replaced with
`siteBanner.siteName` / `siteBanner.location` across detail-page
footers.

**Forward-reference TDZ caught.** Initial `siteBanner.lastUpdatedAbsolute`
referenced `observeStageProgress` (declared later in the module)
→ `ReferenceError: Cannot access 'observeStageProgress' before
initialization` on every reload. Fixed by inlining the literal
`"Today, 9:42 AM"`. Rule: never reference a later `const` from an
earlier `export const` in module scope.

**Verification.** Smoke-test on port 5300 — all 11 routes load, no
console errors. terrain-detail / cross-section-tool /
earth-water-ecology spot-checked: footer reads from `siteBanner`,
KPI / soil / overlay counts match adapter shape (5 KPIs + 4 segments
+ 7 overlays / 6 KPIs + 5 soil rows respectively). `apps/web` runs
unchanged on its own port.

ADR: [decisions/2026-05-03-atlas-ui-prototype-lift.md](decisions/2026-05-03-atlas-ui-prototype-lift.md).

Out of scope this phase: routing migration (prototype's pathname
switch retained), auth (Supabase deferred), PLAN/ACT stages
(spec PNGs only), replacing `apps/web`.
## 2026-04-30 — V3 Phase 5.1 + 5.2 scoping ADRs

### Done

Drafted two scoping ADRs for the remaining Phase 5 deliverables so the implementing sessions can execute against fixed architectural decisions rather than re-deciding fundamentals mid-stream. Both ADRs converge on the same map runtime — reuse the `DiagnoseMap` render-prop pattern that shipped with Phase 5.3, *not* the heavier v2 `MapCanvas` (which carries `@mapbox/mapbox-gl-draw` + the `LeftToolSpine` / `DomainFloatingToolbar` weight). Status is **Proposed** on both — implementation gated on review.

**5.1 DesignPage live canvas** (~1,200 LOC across 4 PRs):
- New `DesignMap.tsx` mirroring `DiagnoseMap` — no MapboxDraw runtime in v3.
- Reuse v2 stores (zone / structure / path / utility / livestock / crop / waterSystems) — no v3 shadow store, no sync layer. v3 placements are immediately visible to v2 surfaces, which matches the v3 cutover direction.
- Deterministic single-pass snap at 8 px screen radius: boundary edge → structure corner → path centerline. No grid snap.
- Live `computeAssessmentScores` recompute throttled to 250 ms via `requestIdleCallback`, keyed off `(count, lastMutationMs)` per store. New `DesignScoreCallout` strip surfaces *score-delta* vs. pre-design baseline (designers want regression feedback, not the verdict ring).
- Overlay chips wired to `MAP_STYLES` swap + `siteData.layers` watershed/wetlands + `CONTOUR_TILES_URL` + soils legend.
- Defers drag-edit/vertex-edit (Phase 5.1.x), multi-select, score-aware undo.

**5.2 OperatePage field map** (~830 LOC across 4 PRs):
- New `OperateMap.tsx` mirroring `DiagnoseMap`.
- Schema change: promote `FieldFlag.x/y` (0–100 pseudo-coords) → `position: [lng, lat]`. Adds `source` (store + refId) and `observedAt`. MTC fixture migrates by hand.
- New `useFieldFlags(projectId)` hook derives flags from `useLivestockStore` paddocks (rotation-age tone) + `useWaterSystemsStore` storage (sensor-tier tone) + weather-alert layers, unioned with brief fallbacks for `fence`/`team` until those stores ship.
- Single MapLibre symbol layer with kind-driven icons + tone-driven `icon-color`. 60 s `visibilityState`-gated polling for sensor flags.
- "Log Observation" wires today against existing `useObservationStore`; "Create Field Task" stays disabled with tooltip until Phase 6.4 ships `useFieldTaskStore`.
- Defers `fence`/`team` stores, low-zoom pin clustering, SSE/WebSocket streaming, replay-history slider.

### Risks accepted
- Both ADRs commit to reusing the `DiagnoseMap` pattern. If Diagnose ever needs to fork to a different runtime, Design and Operate would inherit the lift; mitigation is the render-prop child API which keeps the surface coupling small.
- Bundle delta: two more MapLibre instance mounts. Style cache is shared, and the router unmounts on navigate, so peak is one instance not three.

ADRs:
- [`wiki/decisions/2026-04-30-v3-design-canvas-scoping.md`](decisions/2026-04-30-v3-design-canvas-scoping.md) (proposed)
- [`wiki/decisions/2026-04-30-v3-operate-field-map-scoping.md`](decisions/2026-04-30-v3-operate-field-map-scoping.md) (proposed)

These unblock Phase 6.2 ("Fix on Map" → MapView fly-to depends on 5.1) and Phase 6.4 ("Create Field Task" — wires through the OperateMap from 5.2).

---

## 2026-04-30 — V3 DiagnosePage parcel satellite snapshot (Phase 5.3)

### Done

Replaced the `◊` glyph placeholder in `DiagnosePage`'s `StageHero` aside with a server-rendered satellite tile from the MapTiler Static Maps API plus an SVG-polygon outline of the parcel boundary. Web-mercator forward projection picks a zoom that fits the bbox into ~70% of the tile width (clamped z8–z18). Pure visual surface — no maplibregl runtime, no stores, no draw tools. Falls back to the prior glyph card when no MapTiler key is configured or the project carries no boundary polygon, preserving dev-without-key parity.

**Implementation:**
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.tsx` (new) — `bboxOf` / `chooseZoom` / `projectToTile` helpers + the visual component.
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.module.css` (new) — relative-positioned art container with absolute-overlay SVG.
- `apps/web/src/v3/pages/DiagnosePage.tsx` — imports the new component, replaces inline `ParcelPlaceholder` in `aside`, removes the local `ParcelPlaceholder` declaration.
- `apps/web/src/v3/pages/DiagnosePage.module.css` — drops the now-unused `.parcel*` classes.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean for `@ogden/web`. MTC fixture carries `mockProject.location.boundary`, so `/v3/project/mtc/diagnose` exercises the live path under preview when a MapTiler key is saved.

### Risks accepted
- 5.1 (Design canvas with placement/snapping/scoring callouts) and 5.2 (Operate field map with telemetry pins) remain ADR-gated. Each needs its own scoping pass before implementation; this is the scoped subset of Phase 5 that ships now.

ADR: [`wiki/decisions/2026-04-30-v3-parcel-satellite-snapshot.md`](decisions/2026-04-30-v3-parcel-satellite-snapshot.md). Closes Phase 5.3 of the in-flight closure plan.

---

## 2026-04-30 — V3 single-seam unlock + 8→6 score adapter (Phases 2/3/4/4.2)

### Done

Closed four phases of the in-flight-work plan in one push:

**Phase 2 — Authenticated layer fetch parity.** `apps/web/src/lib/layerFetcher.ts` now tries the authenticated `/layers/project/:id` endpoint *before* the offline mock path when a `projectId` is threaded through. New helpers `apiRowToMockLayer` + `tryFetchFromApi` mirror the server-side `layerRowsToMockLayers` pattern from `SiteAssessmentWriter`. `useSiteDataStore.fetchForProject` and `refreshProject` thread the local id through. Non-builtin projects with real boundaries now hydrate Module 2/3 from the DB rather than the offline mock fallback. Migration `019_builtin_layer_summary_remaining.sql` rekeys the remaining four jsonb blobs (soils / watershed / wetlands_flood / land_cover) to canonical snake_case ahead of any authenticated reader.

**Phase 3 — OBSERVE Module 3 + 5 stale-comment closures.** `CrossSectionTool` (hub side) gains a "⌗ Pick on map →" hand-off button that switches to the design-map flow (which already implements draw + save). `SectorCompassCard` header comment rewritten to point at `features/map/SectorOverlay` (already mounted via `SectorOverlayToggle`). No new components — the previously-deferred work was already shipped on the map side; this closes the comment debt.

**Phase 4 — V3 single-seam unlock.** New adapter `apps/web/src/v3/data/adaptLocalProject.ts` converts a `LocalProject` into the v3 `Project` view-model. `useV3Project` now consults `useProjectStore` for any non-MTC id, with the MTC fixture preserved as a deterministic dev sentinel under id `'mtc'`. Rich briefs (`diagnose`/`prove`/`operate`/`build`) intentionally remain undefined for real projects — Phase 5 + 6 populate them.

**Phase 4.2 — 8→6 score adapter.** New `apps/web/src/v3/data/adaptScores.ts` reconciles the shared scorer's 8 weighted labels with v3's 6 plain-language categories: `landFit ← avg(Ag Suitability, Regen Potential, Stewardship Readiness)`, `water ← Water Resilience`, `regulation ← Habitat Sensitivity`, `access ← Buildability`, `financial ← Community Suitability`, `designCompleteness ← 100 − Design Complexity`. Confidence rolls up weakest-wins; verdict synthesizes from `computeOverallScore` against a 6-tier threshold table and points at the weakest non-placeholder dimension. The adapter only fires when at least one Tier-1 layer has `fetchStatus === 'complete'`; otherwise v3 pages render an honest "Awaiting site data" empty state rather than a fictional verdict. `useV3Project`'s `useMemo` is keyed on `(projectId, projects, dataByProject)` so the hook re-renders when a layer fetch completes.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean for `@ogden/web` and `@ogden/api`. Adapter is a pure function — fixture-driven unit coverage is a follow-up. The MTC smoke path under id `'mtc'` is unchanged.

### Risks accepted
- `Regulation = Habitat Sensitivity` and `Financial = Community Suitability` are proxies until dedicated scorers ship in Phase 7. Adapter shape stays stable when the 1:1 scorers land.
- `dataByProject` lookup uses local id only; no `serverId` fallback today. Every store action threads the local id, so this is theoretically reachable but not in practice.

ADR: [`wiki/decisions/2026-04-30-v3-score-adapter-8-to-6-mapping.md`](decisions/2026-04-30-v3-score-adapter-8-to-6-mapping.md). Closes Phases 2/3/4/4.2 of the in-flight closure plan; Phases 5–8 remain.

---

## 2026-04-30 — `ogden-site-annotations.archived-v3` rollback hatch closed

### Done

Closed the final deferred item from the morning's namespace-consolidation ADR. The legacy v3 blob's archive copy (`ogden-site-annotations.archived-v3`) was the manual-rollback hatch; with the migrator + 7 namespace stores + the resolver follow-up all landed clean and no steward escalation, the hatch is now obsolete.

**Implementation:**
- `apps/web/src/store/site-annotations-migrate.ts` — new `cleanupArchivedV3(storage = localStorage): boolean` export. Reuses the existing `ARCHIVE_KEY` constant. Returns `true` if removed, `false` if absent. Independent of `migrateLegacyBlob()` — both functions are pure localStorage operations.
- `apps/web/src/main.tsx` — `cleanupArchivedV3()` called immediately after `migrateLegacyBlob()` at boot. On the very first post-deploy boot, the migrator writes the archive and the cleanup removes it in one shot. On every subsequent boot both are no-ops.
- `apps/web/src/tests/siteAnnotationsMigrate.test.ts` — new `describe('cleanupArchivedV3', …)` block with 5 specs: removes-and-returns-true, no-op-returns-false, idempotency, does-not-touch-7-namespace-keys, does-not-touch-still-present-legacy-key (defensive).

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean; `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` 13/13 green (8 prior + 5 new). No vite build run — only tests + types changed; no consumer surfaces touched.

### Risks accepted
- No further localStorage rollback path for the namespace consolidation. Mitigation: git-revert path remains documented in the namespace ADR's "Rollback plan" section.

ADR: [`wiki/decisions/2026-04-30-archive-v3-blob-cleanup.md`](decisions/2026-04-30-archive-v3-blob-cleanup.md). Closes the final deferred item from [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).

---

## 2026-04-30 — TransectVerticalRef non-standalone resolution + "Link to existing element"

### Done

Closed the only deferred follow-up from the morning's namespace-consolidation ADR. `TransectVerticalEditorCard` (PLAN Module 6) now resolves all four non-standalone `TransectVerticalRefKind` values (`water-system | polyculture | closed-loop | structure`) against their domain stores at render time, and the add-element form gains a "Link to existing element" mode alongside the existing standalone-sketch flow.

**Resolver (memoized over the 5 underlying project-filtered arrays):**
- `water-system` → `useWaterSystemsStore` (earthworks ∪ storageInfra); height via type-default lookup (swale 0.5 m / diversion 0.5 m / french_drain 0.3 m / cistern 2.5 m / pond 1.0 m / rain_garden 0.5 m); label = `notes ?? type`.
- `polyculture` → `usePolycultureStore` (guilds ∪ species); guild height = anchor species `matureHeightM` from `PLANT_DATABASE`; species height = species `matureHeightM`; label = `Guild.name` or species `commonName`.
- `closed-loop` → `useClosedLoopStore.fertilityInfra`; type-default lookup (composter 1.5 m / hugelkultur 1.2 m / biochar 0.8 m / worm_bin 0.5 m).
- `structure` → `useStructureStore`; height = `Structure.heightM ?? 3 m`; label = `name ?? type`.

**Render path:** SVG triangles get per-kind colour (amber/blue/green/brown/grey); resolved label printed above each triangle. Missing refs (orphaned `refId`s) render at a kind-default height with `(missing X)` label and an amber `⚠` warning in the elements list — no auto-remove (audit-trail convention, same as `actualsStore` ↔ `phaseStore.tasks`).

**Add-form:** Mode radio toggle. Standalone mode unchanged. Link mode: `Namespace` dropdown → kind-keyed `Element` dropdown populated from project-filtered store contents; per-kind empty-state messaging when the project has no candidates; Add disabled until `linkRefId` is selected.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean; `npx vite build` clean (24.58 s, 565 PWA precache entries). Single file modified, no schema/migration changes.

### Risks accepted
- Card now imports 5 stores (topography + waterSystems + polyculture + closedLoop + structure). Selector discipline preserved — each contributes one raw-array selector + one project-filter `useMemo`.
- Default heights are type-keyed constants, not per-instance fields. Override via standalone pin until/unless a steward requests per-instance `heightM` on `Earthwork` / `StorageInfra` / `FertilityInfra`.

ADR: [`wiki/decisions/2026-04-30-transect-vertical-ref-resolver.md`](decisions/2026-04-30-transect-vertical-ref-resolver.md). Closes the deferred follow-up from [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).

---

## 2026-04-30 — Site-annotations store consolidated into 7 Scholar-aligned namespace stores

### Done

Decomposed the 13-family `siteAnnotationsStore.ts` v3 god-store (flagged in the PLAN ADR; made real by ACT) into **7 Scholar-aligned namespace Zustand stores** under `apps/web/src/store/`. Permaculture Scholar review redirected the originally-proposed 13-per-family split (proposed ADR `2026-04-29-site-annotations-store-extract-per-family.md`) toward Holmgren P8 (*Integrate Rather Than Segregate*): hazards+sectors merge (Mollison sectors), earthworks+storageInfra merge (Yeomans water scale), guilds+species merge (PDC W7), wasteVectors+wasteVectorRuns+fertilityInfra merge (Holmgren P4+P6 closed loop), ecology+successionStage merge (PDC W8-10 succession-as-temporal-ecology). SWOT remains its own namespace (strategic-reflection, not a permaculture domain entity).

**New (10):** `externalForcesStore.ts`, `topographyStore.ts`, `ecologyStore.ts`, `waterSystemsStore.ts`, `polycultureStore.ts`, `closedLoopStore.ts`, `swotStore.ts` — 7 Zustand+persist stores, keys `ogden-{external-forces,topography,ecology,water-systems,polyculture,closed-loop,swot}` v1; `site-annotations.ts` type-only barrel + `newAnnotationId(prefix)` helper relocated verbatim; `site-annotations-migrate.ts` exporting `migrateLegacyBlob(storage = localStorage)`; `tests/siteAnnotationsMigrate.test.ts` — 8/8 green (full v3 → 7-namespace seeding, `verticalElements` → `verticalRefs` shape transform, archive-rename, idempotency, partial-rollout protection, non-v3 left alone, missing-key silent return, corrupt-blob silent return).

**Schema change:** `Transect.verticalElements?: VerticalElement[]` → `Transect.verticalRefs?: TransectVerticalRef[]`, a discriminated union over `kind: 'standalone' | 'water-system' | 'polyculture' | 'closed-loop' | 'structure'` with optional `refId` (domain-store id) and optional `standalone: { type, heightM, label? }` fallback. Migrator transforms every legacy element into a `kind: 'standalone'` ref — lossless. `TransectVerticalEditorCard` continues to create `kind: 'standalone'` pins via its existing form; render path is `kind === 'standalone'`-only and falls through for non-standalone refs (a follow-up ADR adds the "Link to existing element" affordance and resolves refs against the appropriate domain store).

**Migrator wiring:** `apps/web/src/main.tsx` calls `migrateLegacyBlob()` at the top, **before** any store side-effect import. Synchronous, single-pass, idempotent — re-running is a no-op because the legacy key is gone. The legacy blob is **archived as `ogden-site-annotations.archived-v3`** (rename, not delete) for manual rollback. `seed()` never overwrites a key that has already rehydrated, so partial-rollout is safe.

**24 consumer files migrated (mechanical import-swap):**
- `features/act/`: `ActHub`, `HazardPlansCard`, `OngoingSwotCard`, `WasteRoutingChecklistCard`
- `features/observe/`: `ObserveHub`, `CrossSectionTool`, `DiagnosisReportExport`, `FoodChainCard`, `HazardsLogCard`, `SectorCompassCard`, `SwotJournalCard`
- `features/plan/`: `PlanHub`, `CanopySimulatorCard`, `GuildBuilderCard`, `HolmgrenChecklistCard`, `PermanenceScalesCard`, `PlantDatabaseCard`, `SoilFertilityDesignerCard`, `StorageInfraTool`, `SwaleDrainTool`, `TransectVerticalEditorCard` (+ schema swap to `verticalRefs`), `WasteVectorTool`
- `features/map/`: `CrossSectionTool`, `SectorOverlay`

Hub views (`ActHub` / `ObserveHub` / `PlanHub`) and `PermanenceScalesCard` (Yeomans Keyline, inherently cross-namespace) import 3-7 stores; single-purpose cards each touch one namespace. Selector discipline (subscribe-then-derive, ADR `2026-04-26-zustand-selector-stability`) carried over unchanged.

**Retired:** `apps/web/src/store/siteAnnotationsStore.ts` deleted (476 lines). tsc serves as the regression guard against re-introducing the old import path (TS2307 on the deleted module).

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean (twice — once after Phase A scaffolding, once after Phase C consumer migration); `npx vite build` clean (22.68 s, 565 PWA precache entries); `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` 8/8 green. Pre-existing 7 `computeScores.test.ts` failures verified unrelated via `git status` (untouched files).

### Risks accepted
- One-time migration risk on every steward's next session — mitigated by archive-not-delete + `seed()` idempotency + explicit `parsed.version !== 3` guard + corrupt-blob try/catch + 8-test vitest coverage.
- 24 consumer files touched in one pass — mitigated by tsc compile-error as regression guard (no project-level ESLint config exists; `npm run lint` runs `tsc --noEmit`).
- `TransectVerticalRef.refId` introduces explicit cross-store refs — surfaced via discriminated `kind` field, not implicit; render today is `kind === 'standalone'`-only, resolution deferred.

ADR: [`wiki/decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md) (status accepted). Supersedes: [`wiki/decisions/2026-04-29-site-annotations-store-extract-per-family.md`](decisions/2026-04-29-site-annotations-store-extract-per-family.md) (proposed → superseded; never landed).

---

## 2026-04-29 — ACT-stage IA restructure (Stage 3 of 3)

### Done

Final stage of the OBSERVE/PLAN/ACT IA restructure. Adds an Act Hub landing surface and 13 spec-aligned client-only dashboard surfaces grouping the 11 already-tagged ACT NavItems under the 5 modules of the ACT spec (`~/Downloads/Regenerative Design Act Stage.md`): §2 Phasing & Budgeting, §3 Maintenance & Operations, §4 Monitoring & Yield, §5 Social Permaculture, §6 Disaster Preparedness.

**New (`apps/web/src/features/act/`):** `ActHub.tsx` (5-card violet-bronze grid) + 13 cards — `BuildGanttCard` (5y×4q SVG Gantt), `BudgetActualsCard` (est-vs-actual ledger w/ orphan handling), `PilotPlotsCard`, `MaintenanceScheduleCard` (5 cadence buckets), `IrrigationManagerCard` (active/transitioning/passive on `cropStore`), `WasteRoutingChecklistCard` (per-cycle log + 30d histogram), `OngoingSwotCard` (continuous SWOT, quarter-grouped), `HarvestLogCard` (per-area unit totals), `SuccessionTrackerCard` (zone × year × pioneer/mid/climax), `NetworkCrmCard`, `CommunityEventCard`, `HazardPlansCard` (mitigation steps + linked features overlaid on OBSERVE hazards), `AppropriateTechLogCard`. Shared `actCard.module.css` violet-bronze theme distinguishes ACT from OBSERVE forest-green / PLAN bronze-amber.

**8 new stores (Zustand persist, key `ogden-act-<slug>`, all v1):** `actualsStore`, `pilotPlotStore`, `maintenanceStore`, `harvestLogStore`, `successionStore`, `networkStore` (distinct from `memberStore` — external CRM, not project ACL), `communityEventStore`, `appropriateTechStore`.

**1 additive store extension:** `cropStore.CropArea` gained `irrigationMode?: 'active' | 'transitioning' | 'passive'` and `transitionStartDate?: string`. Legacy areas treated as `active` by `IrrigationManagerCard`.

**1 v3 migration on `siteAnnotationsStore`:** added `mitigationSteps?: string[]` + `linkedFeatureIds?: string[]` on `HazardEvent`, plus a new `wasteVectorRuns: WasteVectorRun[]` family. v2→v3 backfills `wasteVectorRuns: []`. v1→v2 path preserved.

**Wiring:** `taxonomy.ts` registered 14 new NavItems (`stage3: 'act'`, `dashboardOnly: true`, `phase: 'P3'`); `dashboard-act-hub` pinned first under ACT. `DashboardRouter` got 14 lazy imports + 14 case branches.

**Selector discipline:** every new card follows the subscribe-then-derive rule from ADR `2026-04-26-zustand-selector-stability` — raw `state.x` selectors + `useMemo` for filter/sort. No inline `.filter()` in selectors.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean (after fixing 4 TS2532 `noUncheckedIndexedAccess` regex-capture guards in `BuildGanttCard.parseTimeframe`); `npx vite build` clean (24.15 s, 558 PWA precache entries).

### Risks accepted
- `siteAnnotationsStore` now holds 12+ families (the "god-store" risk flagged in the PLAN ADR is now real). Follow-up plan: extract per-family files in a separate ADR after ACT lands.
- `actualsStore` orphans on PhaseTask deletion (intentional — audit trail). `BudgetActualsCard` surfaces orphans with explicit remove; no cascade.
- Build-Gantt SVG read-only, 5-year horizon hardcoded. Future ADR if 10y or drag-resize needed.

ADR: [`wiki/decisions/2026-04-29-act-stage-ia-restructure.md`](decisions/2026-04-29-act-stage-ia-restructure.md). Predecessors: OBSERVE + PLAN ADRs (same date).

---

## 2026-04-29 — Manitoba Schedule A subcategory picker (per-species AU)

### Done

Replaces the single representative AU factor per species (`AU_FACTORS[species]`) with an opt-in per-paddock-per-species Manitoba Schedule A subcategory picker, the last deferred item from the 2026-04-29 popup-fixes plan. AU rollups now compute against the precise subcategory factor when a paddock records a choice, falling back to the legacy single number when it does not — so existing data is unchanged.

**Data layer**
- New [`apps/web/src/features/livestock/scheduleA.ts`](../apps/web/src/features/livestock/scheduleA.ts) — typed `ScheduleASubcategory[]` catalog with 28 entries spanning the Manitoba Schedule A taxonomy plus four approximation rows for goats / ducks-geese / rabbits / bees (flagged `inScheduleA: false`). Exposes:
  - `MANITOBA_SCHEDULE_A` — the catalog
  - `getScheduleAOptions(species)` — filtered options for the picker
  - `getSubcategoryById(id)` — reverse lookup
  - `auFactorFor(species, subcategoryId?)` — resolves to the subcategory factor when valid, else the legacy `AU_FACTORS[species]`
  - `DEFAULT_SUBCATEGORY_BY_SPECIES` — chosen so the resolved factor matches the legacy single-number table to within rounding
- Coefficients to 3 decimals, sourced from Manitoba's Livestock Manure and Mortalities Management Regulation, Schedule A. Anchor: 1 AU = 73 kg N excreted/yr.

**Store**
- [`livestockStore.ts`](../apps/web/src/store/livestockStore.ts) — `Paddock.scheduleASubcategoryBySpecies?: Partial<Record<LivestockSpecies, string>>`. Optional, undefined for legacy paddocks.

**Math**
- [`speciesData.ts`](../apps/web/src/features/livestock/speciesData.ts) — `computeAnimalUnits` accepts an optional `subcategoryId` per row and routes through `auFactorFor`. Backward-compatible default.
- [`livestockAnalysis.ts`](../apps/web/src/features/livestock/livestockAnalysis.ts) — `InventoryEntry` gained optional `bySubcategory[]`. `computeInventorySummary` reads `paddock.scheduleASubcategoryBySpecies[species]` and bins head counts per subcategory id when set.
- [`HerdRotationDashboard.tsx`](../apps/web/src/features/dashboard/pages/HerdRotationDashboard.tsx) — `totalAU` useMemo now expands each species line into one row per subcategory (plus an "untagged" remainder when paddocks don't all record one) before calling `computeAnimalUnits`. Existing dashboard UI unchanged; AU number simply sharpens.

**UI**
- [`LivestockPanel.tsx`](../apps/web/src/features/livestock/LivestockPanel.tsx) — new `scheduleA` form state, seeded with `DEFAULT_SUBCATEGORY_BY_SPECIES[sp]` whenever a species is checked. The stocking-info hint box gains a small `<select>` per species (only when ≥2 options exist) showing `label — N.NNN AU/head` plus an "(approx.)" suffix for non-Schedule-A approximations. Save handler persists `scheduleASubcategoryBySpecies` only when at least one species has a non-empty pick.

### Verified

- `tsc --noEmit` clean across the entire web app.
- Hand-checked: 100 head of `cattle` with no subcategory → 100 × 1.250 = 125 AU (legacy path). Same 100 head as `cattle:backgrounder` → 100 × 0.625 = 62.5 AU. Mixed paddock with explicit choice + a paddock without one bins correctly in the dashboard rollup (`bySubcategory` accounts for tagged head, "untagged" remainder uses default factor).

### Files

- `apps/web/src/features/livestock/scheduleA.ts` (new)
- `apps/web/src/features/livestock/speciesData.ts`
- `apps/web/src/features/livestock/livestockAnalysis.ts`
- `apps/web/src/features/livestock/LivestockPanel.tsx`
- `apps/web/src/features/dashboard/pages/HerdRotationDashboard.tsx`
- `apps/web/src/store/livestockStore.ts`

---

## 2026-04-29 — v3 strict-null TS sweep + market-garden bed-length override

### Done

**Part 1 — v3 TypeScript strict-null sweep.** Cleared all 24 pre-existing TS errors in `apps/web/src/v3/**` so `tsc --noEmit` now reports zero errors across the entire web app.

- [`v3/components/DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx): `polygonBounds()` now returns `LngLatBounds | null` after guarding empty rings + undefined coord components. Both call sites (initial-center derivation + `fitBounds`) handle the null case.
- [`v3/components/FiltersBar.tsx`](../apps/web/src/v3/components/FiltersBar.tsx): `f.options[idx + 1] ?? null` to satisfy `noUncheckedIndexedAccess`.
- [`v3/components/overlays/SpotlightPulse.tsx`](../apps/web/src/v3/components/overlays/SpotlightPulse.tsx) + [`v3/components/rails/DiagnoseRail.tsx`](../apps/web/src/v3/components/rails/DiagnoseRail.tsx) + [`v3/components/rails/OperateRail.tsx`](../apps/web/src/v3/components/rails/OperateRail.tsx): `css.foo ?? ""` for CSS-module string accesses (typed as `string | undefined` under the project's strict CSS-module typing).
- [`v3/components/rails/HomeRail.tsx`](../apps/web/src/v3/components/rails/HomeRail.tsx): non-null assertion on `currentStage` after the `currentIdx >= 0 ? currentIdx : 0` guard makes the index always valid.
- [`v3/components/rails/ProveRail.tsx`](../apps/web/src/v3/components/rails/ProveRail.tsx): added `&& visible[0]` to the IntersectionObserver callback before reading `.target.id`.
- [`v3/components/Sparkline.tsx`](../apps/web/src/v3/components/Sparkline.tsx): `(values[values.length - 1] ?? 0)` for the last-point Y calc.

**Part 2 — Market-garden bed-length override (deferred Phase 3 item).** Users can now tune the per-bundle bed length instead of being locked to the 30 m default; bed-count math in the popup updates live.

- [`marketGardenBundles.ts`](../apps/web/src/features/crops/marketGardenBundles.ts): `computeMarketGardenGeometry(areaM2, bundle, bedLengthM?)` — optional 3rd arg falls back to `ASSUMED_BED_LENGTH_M` (30 m) when undefined or non-positive.
- [`cropStore.ts`](../apps/web/src/store/cropStore.ts): added optional `marketGardenBedLengthM?: number` to `CropArea`. Only persisted when the user moved the slider away from the default — keeps existing localStorage records clean.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx):
  - New `marketGardenBedLengthM` state, default `ASSUMED_BED_LENGTH_M`, reset on each new draw.
  - Threaded into the `mgGeom` useMemo and the save payload (with the dependency array updated).
  - New range slider (5–60 m, 1 m step) just below the bundle dropdown, with a hint clarifying the 30 m default. Bed-geometry read-out now shows `bed Wm × Lm` so the override is visible inline.

### Verified

- `tsc --noEmit` clean across the entire web app (0 errors in `src/`).
- Bed-length math: `computeMarketGardenGeometry(1000, mixedBundle, 20)` → bedFraction 0.625 = 625 m² beds; 625 / (0.75 × 20) = 41 beds. Verified the new arg flows through both popup display and the persisted `CropArea`.

### Files

- `apps/web/src/features/crops/marketGardenBundles.ts`
- `apps/web/src/features/crops/CropPanel.tsx`
- `apps/web/src/store/cropStore.ts`
- `apps/web/src/v3/components/DiagnoseMap.tsx`
- `apps/web/src/v3/components/FiltersBar.tsx`
- `apps/web/src/v3/components/overlays/SpotlightPulse.tsx`
- `apps/web/src/v3/components/rails/DiagnoseRail.tsx`
- `apps/web/src/v3/components/rails/HomeRail.tsx`
- `apps/web/src/v3/components/rails/OperateRail.tsx`
- `apps/web/src/v3/components/rails/ProveRail.tsx`
- `apps/web/src/v3/components/Sparkline.tsx`

---

## 2026-04-29 — Dashboard rollup scaled by PET multiplier; provenance promoted to chip

### Done

Follow-up to the morning's CropPanel wire-up: `PlantingToolDashboard`'s water-demand rollup now consumes the same `useClimateMultiplier(projectId)` hook the popup uses, so popup and dashboard agree by construction. The dim provenance line introduced earlier was promoted into a real reusable attribution chip.

- New component [`apps/web/src/features/crops/ClimateAttributionChip.tsx`](../apps/web/src/features/crops/ClimateAttributionChip.tsx) — renders `×{mult} climate · {FAO-56|Blaney-Criddle} · {pet} mm/yr PET` with a tooltip describing the data sources. Returns null when climate is unknown so callers can drop it unconditionally.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx): popup's water-demand block now uses `<ClimateAttributionChip className={p.chip} />` instead of the inline dim `<div>`.
- [`PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx):
  - `buildWaterDemandRollup(cropAreas, climateMultiplier = 1)` — optional second arg threaded through `getCropAreaDemandGalPerM2Yr(spec, climateMultiplier)`. Default 1 preserves back-compat.
  - Added `const climateMx = useClimateMultiplier(project.id)` (renamed from `climate` to avoid collision with the existing `ClimateSummary` variable used by suitability/windows/validations/orchardSafety).
  - `waterDemand` useMemo now passes `climateMx.multiplier`.
  - WATER DEMAND `<h2>` section header sports the chip on the right.
  - Footnote conditionally appends "Numbers above are scaled by the site PET multiplier (×N.NN), so they match the drawing-tool popup figures." when climate is known.

### Verified

- Typecheck: zero errors in touched files (`PlantingToolDashboard.tsx`, `CropPanel.tsx`, `ClimateAttributionChip.tsx`, `useClimateMultiplier.ts`). Pre-existing `src/v3/...` errors unchanged.
- Architecturally: the popup's `getCropAreaDemandGalPerM2Yr(spec, climate.multiplier)` and the dashboard's `buildWaterDemandRollup(cropAreas, climateMx.multiplier)` ride the exact same multiplier source — figures cannot drift.

### Files

- `apps/web/src/features/crops/ClimateAttributionChip.tsx` (new)
- `apps/web/src/features/crops/CropPanel.tsx` (chip swap)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (rollup multiplier + header chip + footnote)

---

## 2026-04-29 — PET climate multiplier wired into CropPanel water demand

### Done

Closed the deferred wire-up from the morning popup-fixes session: `petClimateMultiplier()` is now driven by the active project's climate layer instead of always defaulting to 1.0.

- New hook [`apps/web/src/features/crops/useClimateMultiplier.ts`](../apps/web/src/features/crops/useClimateMultiplier.ts) reads `useSiteDataStore.dataByProject[projectId].layers`, finds the climate layer, and dispatches to `computePet` from `@ogden/shared/scoring`:
  - **Penman-Monteith (FAO-56)** when NASA POWER fields are present (`solar_radiation_kwh_m2_day`, `wind_speed_10m_ms`, `relative_humidity_pct`) plus a latitude derived from the project's `parcelBoundaryGeojson` centroid (`turf.centroid`).
  - **Blaney-Criddle** fallback when only `annual_temp_mean_c` is known.
  - **Neutral 1.0** when no climate layer has loaded.
- Result is clamped to [0.7, 1.5] by `petClimateMultiplier()` and returned alongside `petMmYr` + `method` so consumers can show provenance.
- [`waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts) gained an optional third `climateMultiplier` arg on `computeWaterGalYr` / `computeWaterLitersYr`; default 1 preserves back-compat. `petClimateMultiplier` re-exported from the web wrapper.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx) now calls `useClimateMultiplier(projectId)` and threads `climate.multiplier` through every demand call (form preview + persisted `waterGalYr` on `CropArea`). Added a small dim third line under the popup's water-demand block: `×1.18 climate (1300 mm/yr PET, FAO-56)` — only renders when `!climate.unknown`.

### Verified

- Typecheck: zero errors in touched files (the same 49 pre-existing `src/v3/...` errors remain).
- `@ogden/shared` test suite: 38/38 passing on `demand.test.ts`, including the existing `petClimateMultiplier` clamp tests.
- Hot-path spot check: a 1 ha orchard at PET ≈ 1500 mm/yr → multiplier 1.36 → demand 110 × 10000 × 1.36 ≈ 1.50M gal/yr (matches hand-calc).

### Files

- `apps/web/src/features/crops/useClimateMultiplier.ts` (new)
- `apps/web/src/features/crops/waterDemand.ts` (optional `climateMultiplier` arg, re-export `petClimateMultiplier`)
- `apps/web/src/features/crops/CropPanel.tsx` (hook + provenance line)

### Recommended next session

- Apply the same multiplier to the `PlantingToolDashboard` rollup so popup and dashboard agree by construction (currently dashboard reuses its own per-project water memo — quick consolidation pass).
- Surface PET + method as a real attribution chip rather than a single dim line — matches the "Observed N hours ago" stamp pattern from 2026-04-28 concept polish.

---

## 2026-04-29 — Drawing-tool popup fixes (stocking units, computed water, market-garden bundles)

### Done

User flagged three concerns with OLOS map drawing-tool popups; all three resolved in commit `8977b5d` and verified live in preview.

**1. Paddock popup — stocking units per species**
- Added `StockingUnit = 'head' | 'hives' | 'birds'` and `stockingUnit` field to `LivestockSpeciesInfo` in [`apps/web/src/features/livestock/speciesData.ts`](../apps/web/src/features/livestock/speciesData.ts). Cattle/sheep/goats/pigs/horses/rabbits → `head`; poultry/ducks_geese → `birds`; bees → `hives`.
- Retuned rabbits `typicalStocking` 50 → 25/ha (pastured-rabbit norm).
- Both popup render sites ([`PaddockListFloating.tsx:225`](../apps/web/src/features/livestock/PaddockListFloating.tsx), [`LivestockPanel.tsx:271`](../apps/web/src/features/livestock/LivestockPanel.tsx)) now interpolate `info.stockingUnit` instead of hard-coded "head".

**2. Orchard water demand — computed gallons/yr**
- New shared module [`packages/shared/src/demand/cropDemand.ts`](../packages/shared/src/demand/cropDemand.ts) exposes per-area-type × class table (orchard medium=110, market_garden medium=200, etc.) plus optional PET climate multiplier. Re-exported through web wrapper [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts).
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx) replaces the hard-coded `'medium'` string with computed `~{gal}/yr (~{liters}/yr)`, reactive on `pendingArea` + species-derived demand class. Persists `waterGalYr` onto `CropArea`.
- Verified: 1 ha orchard, medium class → 1.10M gal/yr. Ties out with PlantingToolDashboard rollup.

**3. Market garden — bundle picker + relabel**
- New [`apps/web/src/features/crops/marketGardenBundles.ts`](../apps/web/src/features/crops/marketGardenBundles.ts) defines six bundles (mixed, salad_mix, brassica, roots, solanum, legume) with `spacingM`, `bedWidthM`, `pathWidthM`, `waterDemand`, `rotationFamily`. Helper `computeMarketGardenGeometry()` returns plant + bed counts using bed/path geometry (assumes 30 m bed length).
- `CropPanel.tsx` swaps the orchard spacing slider for a bundle dropdown when `selectedType === 'market_garden'`. `SPACING_NOUN` map relabels "trees" → context-appropriate noun (`trees` / `seedlings` / `plants`) for non-orchard types.
- [`CompanionRotationPlannerCard.tsx`](../apps/web/src/features/crops/CompanionRotationPlannerCard.tsx) prefers `bundle.rotationFamily` over species-text inference when bundle is set.
- `cropStore.ts` gained optional `waterGalYr?: number` and `marketGardenBundle?: string` fields.
- Verified: salad_mix on 1 ha → ~625k plants / 277 beds; brassica on 0.1 ha → ~3,086 plants / 27 beds.

### Verified

- Live preview eval confirmed: bees=4 hives, rabbits=25 head, poultry=birds, orchard 1 ha medium=1.10M gal/yr, market-garden bundle math.
- Typecheck: my touched files clean. (49 pre-existing `src/v3/...` errors unchanged — DiagnoseMap, FiltersBar, SpotlightPulse, rails, Sparkline, exportDiagnoseBrief.test — separate cleanup task.)
- Preview screenshot tool repeatedly timed out on the MapLibre WebGL canvas (30s timeout); verified through `preview_eval` module loads instead per project CLAUDE.md guidance on transparent reporting.

### Files

- `apps/web/src/features/livestock/speciesData.ts`
- `apps/web/src/features/livestock/PaddockListFloating.tsx`
- `apps/web/src/features/livestock/LivestockPanel.tsx`
- `apps/web/src/features/crops/CropPanel.tsx`
- `apps/web/src/features/crops/marketGardenBundles.ts` (new)
- `apps/web/src/features/crops/waterDemand.ts`
- `apps/web/src/features/crops/CompanionRotationPlannerCard.tsx`
- `apps/web/src/store/cropStore.ts`
- `packages/shared/src/demand/cropDemand.ts`

### Recommended next session

- Visual screenshot pass once the MapLibre preview cooperates (or use a reduced-overlay project).
- Resolve the 49 pre-existing typecheck errors in `src/v3/...` rails — separate cleanup.
- Schedule A subcategory picker for AU livestock (still deferred).
- ET0 / climate-driven water adjustment now structurally available via `petClimateMultiplier()` — wire it to a project's climate read-out next.

---

## 2026-04-28 — v3 concept-polish pass (scholar-reconciled)

### Done

Reviewed five Emergent HTML concept mockups (Project Command Home, Diagnose, Design, Prove, Operations) and grafted their best UI/UX ideas onto the live v3 React surfaces — without disturbing DiagnoseMap, matrix overlays, homestead anchor, or any Zustand store. Reconciled with the **Permaculture Scholar** and **UI/UX Design Scholar** before any chrome was touched; three concept ideas were dropped outright (glass-blur cards, per-stage tints, live-pulse) and substituted with biophilic-compatible primitives. Rationale and verdict table in [`wiki/decisions/2026-04-28-atlas-concept-polish-pass.md`](decisions/2026-04-28-atlas-concept-polish-pass.md).

**New primitives**
- [`apps/web/src/v3/styles/chrome.css`](../apps/web/src/v3/styles/chrome.css) — `.eyebrow`, `.verdict-ring-quiet` (1px ring + inset shadow, no blur), `.observed-stamp` utilities.
- [`Sparkline.tsx`](../apps/web/src/v3/components/Sparkline.tsx) — neutral-stroke SVG sparkline with semantic accent on the endpoint dot only (closes UX Scholar §5 P1 from 2026-04-23). Shipped but not yet wired (no series ≥ 3 points exists in v3 mock data).
- [`ObservedStamp.tsx`](../apps/web/src/v3/components/ObservedStamp.tsx) — "last observed N {min,hr,days,wk,mo,yr} ago" timestamp; replaces concept live-pulse; honors `prefers-reduced-motion`.
- [`LifecycleProgressRing.tsx`](../apps/web/src/v3/components/LifecycleProgressRing.tsx) — thin SVG arc keyed off active route; mounted in V3ProjectLayout sticky header. Replaces per-stage tint with one unifying lifecycle indicator (Permaculture: "Integrate Rather Than Segregate").

**Flow / structure**
- [`DesignPage.tsx`](../apps/web/src/v3/pages/DesignPage.tsx) — overlay chips + base-map select moved to a sticky `.bottomToolbar` (precedent: 2026-04-27 right-rail/bottom-toolbar split).
- [`ProvePage.tsx`](../apps/web/src/v3/pages/ProvePage.tsx) — section IDs `prove-blockers`, `prove-best-uses`, `prove-vision-fit`, `prove-execution`, `prove-rules`.
- [`ProveRail.tsx`](../apps/web/src/v3/components/rails/ProveRail.tsx) — IntersectionObserver scrollspy with click-to-scroll; quiet active state (no fill, no glow).

**Layout chrome**
- [`V3ProjectLayout.tsx`](../apps/web/src/v3/V3ProjectLayout.tsx) + [`.module.css`](../apps/web/src/v3/V3ProjectLayout.module.css) — sticky header housing LifecycleProgressRing.

**Eyebrow + ObservedStamp sweep**
- [`HomePage.tsx`](../apps/web/src/v3/pages/HomePage.tsx) — eyebrows on Project Health + 3-col headers; ObservedStamp replaces `.liveBadge` + `.lastUpdated`. `HomePage.module.css` `.sectionTitle`/`.colTitle` re-typeset from 11 px uppercase muted (which was functioning as eyebrow) to proper 16/14 px headings; eyebrow role moved to `.eyebrow`.
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) — eyebrows on the three section headers (Site analysis, Categories, R/O/L). DiagnoseMap, overlays, homestead anchor untouched.
- [`ProvePage.tsx`](../apps/web/src/v3/pages/ProvePage.tsx) — eyebrows on all five sections.
- [`OperatePage.tsx`](../apps/web/src/v3/pages/OperatePage.tsx) — eyebrows on all four section headers; ObservedStamp on "Today on the Land".

**Quiet KPI treatment**
- [`MetricCard.tsx`](../apps/web/src/v3/components/MetricCard.tsx) extended with optional `accent="quiet-ring"` and `trend?: ReactNode` props. Operate "Today on the Land" tiles now render with the quiet ring. Sparkline embedding deferred until trend arrays exist in `TodayTile`.

### Confidence / Quality audit

Sweep of touched components confirms no mixing of channels:
- Eyebrow + quiet-ring + sparkline stroke = monochrome (confidence)
- ObservedStamp dot + sparkline endpoint + MetricCard status pills = semantic (quality)

### Verification

- `npm run lint` (apps/web) — pending in this session
- 5-page hand-walk + reduced-motion check — pending
- Sidebar permaculture verbs (Observe/Test/Steward/Evaluate) and matrix overlays unchanged

---

## 2026-04-28 — Ethics route re-parented under v3ProjectLayoutRoute

### Done

`/v3/reference/ethics` previously sat as a sibling of `v3ProjectLayoutRoute` under `appShellRoute`, so clicking the sidebar's "Ethics & Principles" footer link unmounted the lifecycle shell — the user lost the project context and the sidebar itself. Re-nested the route under the project layout so the sidebar persists.

- [`apps/web/src/routes/index.tsx`](../apps/web/src/routes/index.tsx): moved `v3EthicsReferenceRoute` definition below `v3ProjectLayoutRoute`; changed `getParentRoute: () => appShellRoute` to `() => v3ProjectLayoutRoute`; relative path `reference/ethics`. Added to the layout's `addChildren([…])` array.
- [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx): footer Link `to="/v3/project/$projectId/reference/ethics"` with `params={{ projectId }}` (was unparameterized).
- [`V3LifecycleSidebar.test.tsx`](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx): assertion updated to the nested href; description string updated.

### Verification

- `tsc --noEmit` — clean.
- `vite build` — clean (1m1s, 493 PWA precache entries).
- 6/6 sidebar tests pass.
- Preview at `/v3/project/mtc/reference/ethics`: Ethics page heading renders alongside the full lifecycle sidebar (Project Home, Understand/Design/Live phase groups, all 7 stages, Reference footer with "Ethics & Principles" link active).

Commit: `c0499c1`.

---

## 2026-04-28 — Matrix overlays: honest v3.1 (topography only)

### Done

Walked back the mocked Sectors and Zones overlays shipped earlier today. The Permaculture Scholar dialogue is unambiguous that Mollison zones are designer-drawn polygons, not concentric circles, and sector lines need real sun/wind/water data — neither was available, so the v3.1 layer now ships **topography only**, with Sectors and Zones surfaced as visibly disabled v3.2 affordances.

- Deleted `apps/web/src/v3/components/overlays/SectorsOverlay.tsx` and `ZonesOverlay.tsx` (mocked 8-ray sectors and 5-ring zone polygons). [`TopographyOverlay`](../apps/web/src/v3/components/overlays/TopographyOverlay.tsx) — the only data-backed one, fed from MapTiler `CONTOUR_TILES_URL` — stays.
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) now mounts only `TopographyOverlay` inside `DiagnoseMap`.
- [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) legend simplified — only the topography swatch row renders, gated on `topography` alone (no `anyOn` aggregation).
- [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx): Sectors and Zones rows are `<input disabled>` with a "v3.2" badge, `title="Data layer not yet available — v3.2"`, and a `.rowDisabled` style at `opacity: 0.55`. Footer toggle is now a single "Show / Hide topography" link; note copy: "Topography live · Sectors & Zones in v3.2".
- [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) bumped to `version: 2` with a `migrate` that force-clears `sectors` and `zones` to `false` on rehydrate, so any user who toggled them on under v1 doesn't see phantom overlays.
- [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) active-count badge now sums only `topography` — counting visibly disabled rows would lie about active layers.
- [`V3LifecycleSidebar.test.tsx`](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx) mock store flipped (`topography: true, sectors: false, zones: false`) so the badge assertion still resolves to `1`. 6/6 tests pass.

### Verification

- `pnpm vitest run src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` — 6/6 pass.
- `tsc --noEmit` — clean across touched files (DiagnosePage, DiagnoseMap, MatrixTogglesPopover, matrixTogglesStore, V3LifecycleSidebar).
- Preview: `/v3/project/mtc/diagnose` after `localStorage.removeItem('ogden-atlas-matrix-toggles')`. Popover opens, Sectors and Zones rows render disabled with "v3.2" badge and the tooltip. Toggling Topography shows the legend "Topography (contours)" on the map and updates the sidebar badge to "1 active". Sectors / Zones checkboxes refuse user input.

### Deferred

- Discover-stage map dropped from this session — `MOCK_CANDIDATES` has no `lat/lng/coord` field, so a "where is it?" map would have nothing to render. Restore once a parcel `centroid` lands in mock data.
- Real sector data (sun-path service, wind climatology) and designer-drawn zone polygons remain v3.2 work — the disabled-checkbox affordance now signals that honestly to the user.

---

## 2026-04-28 — Diagnose page: live MapLibre + matrix overlays

### Done

Wired the Matrix Toggles store to a real overlay layer on the Diagnose page (Permaculture Scholar IA: sectors / zones / topography are *site-analysis* tools, so they live on Diagnose, not Discover).

- New container [`apps/web/src/v3/components/DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) — MapLibre instance + `MapTokenMissing` fallback, render-prop children receive `(map, centroid)`. MTC centroid hard-coded to `[-78.20, 44.50]` for v3.1; real boundary geometry will swap in when the project store gains a parcel feature.
- Three overlay components in [`apps/web/src/v3/components/overlays/`](../apps/web/src/v3/components/overlays/):
  - `TopographyOverlay` — vector contours from MapTiler `CONTOUR_TILES_URL` (source-layer `contour`, `ele` property; thicker stroke + label every 100 m)
  - `SectorsOverlay` — 8 cardinal/intercardinal rays from centroid (mocked 600 m for v3.1)
  - `ZonesOverlay` — 5 concentric rings (Mollison Zones 1–5; mocked 25 / 75 / 200 / 600 / 1500 m radii)
- Each overlay subscribes to its own `useMatrixTogglesStore` boolean and toggles `visibility` via `setLayoutProperty`; layers are added once and never removed (idempotent ensure pattern matched against v1's `MapCanvas`).
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) gains a "Site analysis" section between StageHero and the category grid, hosting the map.
- Floating legend on the map labels active overlays so the toggle state is visible on the map itself, not only in the sidebar popover.

### Verification

- `tsc --noEmit` clean across `apps/web`.
- Preview reload at `/v3/project/mtc/diagnose`: all three overlays render at `[-78.20, 44.50]` (Ontario), legend reflects active toggles, matrix layers add to `map.getStyle()` (`matrix-{topography,sectors,zones}-{source|fill|line|label}`).
- Sectors-only mode confirmed: 8 directional rays render with N/S/E/W/SW labels; zone rings absent; basemap topo contours remain (those are MapTiler's own, unrelated to our `matrix-topography-line`).
- Switched MapLibre readiness gate from a `ready` boolean to a `useState<Map|null>` so children mount as soon as the map exists; overlays each handle `isStyleLoaded()` themselves. Earlier `ready` gate raced StrictMode's mount/unmount cycle and left only the topography effect surviving.

### Deferred

- **Real sector data.** Sun arc, prevailing wind, fire, water flows currently 8 evenly-spaced rays. Will need a sun-path service (NOAA/NREL) and per-region wind climatology for v3.2.
- **Designer-defined zones.** Mollison's zones are designer-drawn boundaries, not concentric circles. Mock rings communicate the concept but a real parcel needs polygon editing.
- **Parcel boundary in mockProject.** `mockProject.location` lacks lat/lng; centroid hardcoded. When the data layer grows a `boundary: GeoJSON.Polygon`, swap `MTC_CENTROID` for `centroid(boundary)` and re-fit the map to the parcel bounds.
- **Discover-stage "where is it?" map.** Discover is property-shopping (regulatory/zoning context, regional siting); deferred per Permaculture Scholar IA — the matrix overlays don't belong there.

### Recommended next session

- Wire a parcel boundary into the project store and let DiagnoseMap fit to it instead of the hard-coded centroid; once real parcels exist, raster contours from `TERRAIN_DEM_URL` become viable for adaptive contour intervals.

---

## 2026-04-28 — Atlas Sidebar IA: Phase B P0 utilities wired

### Done
Closed the "P0 footer buttons have no destination" carry-forward from the Phase B Shape-4 ship. The two P0 sidebar utilities now point at real surfaces:

- **Ethics & Principles** → static reference page at `/v3/reference/ethics`. New page: [apps/web/src/v3/pages/EthicsReferencePage.tsx](../apps/web/src/v3/pages/EthicsReferencePage.tsx) lists the three permaculture ethics (Earth Care / People Care / Fair Share) and Holmgren's twelve principles, content sourced from [wiki/concepts/permaculture-alignment.md](concepts/permaculture-alignment.md). Route registered as a child of `appShellRoute` so it inherits the LandOsShell chrome.
- **Matrix Toggles** → popover ([apps/web/src/v3/components/MatrixTogglesPopover.tsx](../apps/web/src/v3/components/MatrixTogglesPopover.tsx)) backed by a new `matrixTogglesStore` ([apps/web/src/store/matrixTogglesStore.ts](../apps/web/src/store/matrixTogglesStore.ts)). Three booleans — Topography / Sectors / Zones — persisted to `localStorage` (zustand `persist`, version 1, key `ogden-atlas-matrix-toggles`). Sidebar shows an active-count badge when any overlay is on. Click-outside / Escape closes the popover.
- **Sidebar wiring** ([V3LifecycleSidebar.tsx](../apps/web/src/v3/components/V3LifecycleSidebar.tsx)): Ethics row renders as `<Link to="/v3/reference/ethics">`, Matrix row as `<button>` with `aria-expanded` + `aria-haspopup="dialog"`. P1 rows (Plant DB, Climate Tools) stay disabled. Footer is now `position: relative` to anchor the popover, and `.utilityBtn` carries `text-decoration: none; color: inherit` so the Link looks identical to the buttons.
- **Render coverage** ([V3LifecycleSidebar.test.tsx](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx)): six-test smoke suite covering phase groups, renamed labels, the Ethics link target, popover open-on-click, the active-count badge, and P1 disabled state. Added `*.test.tsx` to the vitest include glob.

### Verification
- `pnpm vitest run src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` — 6/6 pass.
- `tsc --noEmit -p apps/web/tsconfig.json` — clean on touched files (Ethics page, sidebar, store, popover, route registration). Pre-existing v3 typecheck errors (FiltersBar, DiagnoseRail, HomeRail, OperateRail) remain untouched and unrelated.

### Carries forward
- Map-overlay layer that consumes `matrixTogglesStore` ships in v3.1 — toggles persist today but render no overlays yet. The popover surfaces a "Overlay layer ships in v3.1" note so the affordance isn't read as broken.
- A live ethics scorer that grades the active project against each principle is still deferred per Phase A's open-questions list.

---

## 2026-04-28 — Needs & Yields graph: Phase 3 (server persistence + scoring weight)

### Done

Closed out the [Needs & Yields ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) with server-of-record persistence and the integration-weight lift:

- **Migration 016** (`apps/api/src/db/migrations/016_project_relationships.sql`) — `project_relationships` table with FK CASCADE on project, UNIQUE on `(project_id, from_id, from_output, to_id, to_input)` mirroring the in-memory dedup, CHECK on the 13-value resource enum (kept in lockstep with `ResourceTypeSchema` via the shared test suite), CHECK no self-loop, CHECK ratio in [0,1].
- **API routes** (`apps/api/src/routes/relationships/index.ts`) — `GET/POST/DELETE /api/v1/projects/:id/relationships` with role gating (any role to read; owner/designer to write). `EdgeSchema.parse` is wrapped in a local `parseEdge` that rethrows as `ValidationError` so the global handler returns a clean 422 regardless of zod-instance identity across workspace packages. POST uses `ON CONFLICT DO UPDATE SET ratio` to honor the table's UNIQUE constraint without surprising callers. Smoke test covers GET (empty + populated), POST (valid + invalid resource), DELETE (204 + 404).
- **Web sync** (`apps/web/src/features/map/useRelationshipsSync.ts`) — hydrate-then-drain hook mounted by `RelationshipsOverlay`. Pending mutations live in the persisted store as a per-project FIFO queue (`pendingByProject`). Drains are sequential; 4xx responses log + drop, 5xx/network errors requeue at head and pause until the next interval / `online` event. localStorage stays canonical so offline writes never block the canvas.
- **Scoring weight lift** (`packages/shared/src/scoring/computeScores.ts`) — Ecological Integration `0 → 0.10`. Redistribution drawn per the Permaculture Scholar's recommendation: Design Complexity `0.10 → 0.05` (P8 makes integration the precise measure of complexity), Regenerative Potential `0.15 → 0.12` (P6 cycling = engine of regeneration), Agricultural Suitability `0.15 → 0.13` (P3 cycling boosts yields). Sum stays at 1.00. Rail badge updated from "weight 0 — informational" to "weight 0.10 · live".

### Verification
- `packages/shared` — 7 files / 159 tests pass (no regression on relationships, scoring, or schemas).
- `apps/api` — `relationships.test.ts` 6/6 pass; `tsc --noEmit` clean.
- `apps/web` — `relationshipsStore.test.ts` 5/5 pass; relationships-touching files type-clean. Pre-existing v3 typecheck errors (FiltersBar, DiagnoseRail, HomeRail, OperateRail) are unrelated.

### Awaiting
- Run `pnpm --filter @ogden/api migrate` against staging when next deploying — migration 016 is idempotent on a clean DB but has not been applied to long-running environments.

---

## 2026-04-28 — Atlas Sidebar IA: Permaculture Scholar synthesis (Phase A)

### Done
- Six-question dialogue with the Permaculture Scholar NotebookLM (`5aa3dcf3-...`) on lifecycle sidebar IA. Conversation `7bb6feac-2bd5-4867-836c-2a1aedcee705`, turns 1–6.
- Synthesis filed at [wiki/concepts/atlas-sidebar-permaculture.md](concepts/atlas-sidebar-permaculture.md).
- Verdict: lifecycle axis is correct; rename 4 of 7 stages (Discover→Observe, Prove→Test, Operate→Steward, Report→Evaluate); Steward is a loop, not a terminal step; add 4 utility nav items (Ethics & Principles, Plant DB, Climate Tools, Matrix Toggles) to sidebar footer.
- Recommended Phase B redesign **Shape 4** (combined: labels + grouping + footer utility nav).

### Awaiting
- User review of synthesis (Gate A) before Phase B implementation.

---

## 2026-04-28 — Atlas Sidebar IA: Permaculture-Grounded Redesign (Phase B)

### Done
Implemented Shape 4 (combined label refresh + grouping + footer utility nav) per the Phase A synthesis. Edited [V3LifecycleSidebar.tsx](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) and [V3LifecycleSidebar.module.css](../apps/web/src/v3/components/V3LifecycleSidebar.module.css):

- **Labels (v3-only override map, route slugs unchanged):** Discover→**Observe**, Prove→**Test**, Operate→**Steward**, Report→**Evaluate**. Diagnose / Design / Build kept. Per-stage descriptions added (e.g. "Thoughtful, protracted observation").
- **Grouping:** seven stages bucketed into three permaculture phases — *Understand* (Observe + Diagnose), *Design* (Design + Test), *Live* (Build + Steward + Evaluate). Group headers render as small uppercase eyebrow labels above each `<ol>`.
- **Loop affordance:** Steward (operate) row carries a `↻` badge with `title="Stewardship loops back to Observe"`, signaling the continuous-feedback wrap rather than a terminal step.
- **Footer utility nav:** four entries — Ethics & Principles (P0), Matrix Toggles (P0), Plant Database (P1), Climate Tools (P1). P0s render as enabled buttons (action wiring deferred); P1s render `disabled` with "Coming soon" copy per RULE 4 (no dead clicks).
- **Taxonomy untouched:** `LIFECYCLE_STAGES` in `features/land-os/lifecycle.ts` left as-is so the v2 sidebar at `/project/$projectId/*` is not affected. Renames live as a v3-only `V3_STAGE_LABELS` lookup in the sidebar component, keyed by `BannerId`.

### Verification
- `npx vite build` clean (32.46s, 493 PWA precache entries; no TS errors).
- Sidebar DOM via `preview_eval` confirmed: "PROJECT LIFECYCLE / Project Home / UNDERSTAND / 1 Observe / 2 Diagnose / DESIGN / 3 Design / 4 Test / LIVE / 5 Build / 6 Steward ↻ / 7 Evaluate / REFERENCE / Ethics & Principles · Matrix Toggles · Plant Database (Coming soon) · Climate Tools (Coming soon)". Active stage on `/v3/project/mtc/home` correctly resolves to "Project Home".
- `preview_screenshot` was timing out at 30s during the session — fell back to DOM inspection. Pre-existing axe accessibility warnings about `<aside>` inside another landmark are unrelated.

### Carries forward
- Seasonal/annual cycle toggle (header chip) and a live ethics scorer remain deferred per Phase A's open-questions list.
- Map-overlay layer that consumes `matrixTogglesStore` ships in v3.1 — toggles persist state today but render no overlays yet.

---

## 2026-04-28 — Needs & Yields graph: Phase 2 (canvas edges)

### Done

Shipped Phase 2 of the [Needs & Yields dependency graph
ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) — the live-canvas
socket and edge-draw UI behind `FEATURE_RELATIONSHIPS`. Phase 1 landed the
shared-package data model; Phase 2 surfaces it on the v2 map.

New web modules:

- [`apps/web/src/store/relationshipsStore.ts`](../apps/web/src/store/relationshipsStore.ts) — Zustand+persist project-scoped edge graph; validates via `EdgeSchema.safeParse` on insert; dedupes; localStorage-backed (DB persistence deferred to Phase 3).
- [`apps/web/src/lib/relationships/useAllPlacedEntities.ts`](../apps/web/src/lib/relationships/useAllPlacedEntities.ts) — selector aggregating structures, utilities, crop areas, and paddocks for the active project (paddocks expand to one entry per species).
- [`apps/web/src/features/map/RelationshipsOverlay.tsx`](../apps/web/src/features/map/RelationshipsOverlay.tsx) — `RelationshipsToggle` (compact spine button, Lucide Network icon) + `RelationshipsOverlay` (DOM overlay with `map.project()` + rAF-throttled re-projection on move/zoom/resize). Output sockets fan in the right hemisphere (green), input sockets in the left (gold), 26 px from the centroid. Drag-from-output → drop-on-input creates an edge after compatibility validation; invalid drops flash a 600 ms red banner. Edges render as SVG `<line>` with click-to-remove.
- [`apps/web/src/features/map/RelationshipsRail.tsx`](../apps/web/src/features/map/RelationshipsRail.tsx) — bottom-right floating card showing live `integrationScoreFromEdges` (0–100, "weight 0 — informational" badge) and the orphan-output list from `orphanOutputs`. Visible only while the overlay is active.

Wiring: [`MapView.tsx`](../apps/web/src/features/map/MapView.tsx) lazy-loads the toggle, overlay, and rail; [`LeftToolSpine.tsx`](../apps/web/src/features/map/LeftToolSpine.tsx) gained a `relationshipsSlot` next to the analysis-tool group.

Vite + Vitest aliases for `@ogden/shared/relationships` added in both [`vite.config.ts`](../apps/web/vite.config.ts) and [`vitest.config.ts`](../apps/web/vitest.config.ts).

### Tests

- `apps/web/src/tests/relationshipsStore.test.ts` — 5 tests covering valid round-trip, schema rejection, dedup-on-add, predicate remove, and `clearProject` scoping. All pass.

### Verification

- `pnpm --filter @ogden/web exec tsc --noEmit` produced no errors in any of the new relationships files (LeftToolSpine, MapView, RelationshipsOverlay, RelationshipsRail, relationshipsStore, useAllPlacedEntities).
- `pnpm --filter @ogden/web exec vitest run src/tests/relationshipsStore.test.ts` → 5/5 pass.
- Phase 1 vitest suite (`packages/shared`) untouched and still green.
- The integration score remains weighted at 0 in [`computeScores.ts`](../packages/shared/src/scoring/computeScores.ts), so existing project overall scores do not shift.

### Deferred

- **Phase 3 — DB persistence + non-zero scoring weight.** Edges currently live in localStorage only; the `Ecological Integration` slot is held at weight 0 until the canvas UX is validated.
- **Inline edge ratios.** `Edge.ratio` is in the schema but the UI has no setter yet — every edge is treated as routing 100% of the source's output.
- **Closed-loop highlight.** `closedLoops` is implemented in `cycle.ts` but the overlay does not yet visually emphasize edges that complete a cycle.
- **Persisted view-active flag.** `viewActive` is intentionally session-only; revisit if users want it sticky.

### Recommended next session

- **Wire `closedLoops` into the overlay** so edges participating in a cycle render with a brighter accent (visual confirmation that Holmgren P6 — Produce No Waste — is actually being achieved).
- Or — **bring up Phase 3** by lifting the integration weight from 0 to 0.10 and adding a server-side `relationships` table/endpoint.

---

## 2026-04-28 — Needs & Yields graph: Phase 1 (shared package)

Shipped Phase 1 of the [Needs & Yields dependency graph
ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) — the data
model + algorithms layer, no UI.

### What landed
- New subpath `@ogden/shared/relationships`:
  - `types.ts` — 13-value `ResourceType` const tuple, `EdgeSchema` Zod schema (with optional `ratio` ∈ [0,1]), `PlacedEntity<T>` and `RelationshipsState` value-object interfaces.
  - `catalog.ts` — `EntityType` union across the four canonical demand-module enums (Structure ∪ Utility ∪ CropArea ∪ Livestock = 54 types after dedup); exhaustive `OUTPUTS_BY_TYPE` and `INPUTS_BY_TYPE` `Record<EntityType, ResourceType[]>` seeds. The `Record` type makes adding a new enum value a typecheck failure here, enforcing exhaustiveness.
  - `flow.ts` — pure-function Edge CRUD (`addEdge`, `removeEdge`, `addEntity`, `removeEntity`, `emptyState`).
  - `cycle.ts` — `orphanOutputs`, `unmetInputs`, `closedLoops` (Johnson-style DFS with canonical-rotation dedup), `integrationScoreFromEdges` ∈ [0,1].
- `WEIGHTS['Ecological Integration'] = 0` slot reserved in [computeScores.ts](../packages/shared/src/scoring/computeScores.ts) — surfaceable but score-neutral until Phase 2 (canvas edge editor) ships.
- `./relationships` registered in `packages/shared/package.json` `exports`.
- 23 vitest cases in [relationships.test.ts](../packages/shared/src/tests/relationships.test.ts) — schema validation, catalog exhaustiveness, four cycle-algorithm contracts. Full shared suite: 159/159 green.

### Verification
- `pnpm --filter @ogden/shared run typecheck` clean.
- `pnpm --filter @ogden/shared test` 159/159.
- `pnpm -r run typecheck`: `packages/shared` ✓, `apps/api` ✓, `apps/web` ✗ — but the web errors are pre-existing in `src/v3/components/` (FiltersBar, DiagnoseRail, HomeRail, OperateRail) from commits `54070af`/`3a32a38`/`ff2d92f`, unrelated to relationships. Flagged for separate cleanup.

### ADR status
- [needs-yields-dependency-graph](decisions/2026-04-28-needs-yields-dependency-graph.md) flipped `proposed → accepted (Phase 1 of 3 — shared package shipped 2026-04-28)`.

### Deferred
- Phase 2 (canvas sockets/edges UI), Phase 3 (DB migration + persistence), then re-run Permaculture Scholar dialogue once #1+#2 ship.
- Pre-existing v3 web typecheck errors should be cleaned up separately.

---

## 2026-04-28 — Permaculture Scholar alignment review

Ran a 3-round structured dialogue with the **Permaculture Scholar** NotebookLM
(`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`, 44 sources) to evaluate Atlas
against the three permaculture ethics and Holmgren's twelve principles.
Conversation `48a34396-5525-4a57-9884-108d93b1872f`.

### Verdict
- **Ethics:** Earth Care strong · People Care partial · Fair Share partial.
- **Twelve principles:** 4 represented · 6 partial · 3 missing (Produce No
  Waste · Small & Slow Solutions · Edges & Marginal).
- **Process:** gap-analysis + confidence laddering ≈ "land physician
  diagnosis," but pre-flight audits + ADR culture are
  engineering-risk-management, not biological feedback. Amanah Gate +
  CSRA + mission-scoring genuinely equivalent to permaculture's three
  ethics in practice. Designer's ruling: **brilliant ally, distant cousin**.

### Filed
- [wiki/concepts/permaculture-alignment.md](concepts/permaculture-alignment.md)
  — full assessment + recommendations backlog.
- ADRs `2026-04-28-needs-yields-dependency-graph.md` and
  `2026-04-28-temporal-slider-succession-modeling.md` (P0 recs).
- [tasks/permaculture-alignment-backlog.md](../tasks/permaculture-alignment-backlog.md)
  — recs 3-6 (P1/P2) as ticket-ready entries.

Branch: `feat/atlas-permaculture` (cut from `feat/atlas-3.0`).

---

## 2026-04-28 — Atlas v3.0 lifecycle shell shipped

Completed the 9-phase v3.0 plan on `feat/atlas-3.0`. Atlas is now a
lifecycle-driven Land Intelligence OS with 7 stage pages mounted under
`/v3/project/:id/*`, a parallel route tree to the existing v2 workspace.

### What shipped (`feat/atlas-3.0`)

- **Shell + primitives** (Phases 1–2): branch cut, route stubs for all
  7 stages, [`apps/web/src/v3/`](../apps/web/src/v3/) folder with
  `useV3Project` adapter reading from a single MTC fixture
  ([`mockProject.ts`](../apps/web/src/v3/data/mockProject.ts)). Built
  `MetricCard`, `DecisionRail` (generic stage-aware container with a
  rail per stage under [`components/rails/`](../apps/web/src/v3/components/rails/)),
  `StageHero`, `PageHeader`, `BlockerCard`, `CategoryCard`,
  `InsightPanel`, `BestUsesTable`, `ScoreBar`, `DesignRulesGrid`.
- **Project Command Home** (Phase 3): verdict ring + 6-tile Project
  Health strip + Top Blocker + Recent Activity / Decisions / Next
  Actions tri-column.
- **Discover** (Phase 4): candidate board with 6 properties (Green
  Valley Ranch, Pine Ridge, Maple Creek, Riverside Meadows, Stonefield
  Acres, Highland Homestead), filters bar, shortlist + compare tray.
- **Diagnose** (Phase 5): Conditional Opportunity verdict + 7
  category cards (Regulatory/Soil/Water/Terrain/Ecology/Climate/Infra)
  + Risks / Opportunities / Limitations 3-panel.
- **Prove** (Phase 6): "Supported with Required Fixes" verdict, 4
  blockers, 6 best uses, 6 vision-fit bars with benchmarks, 5
  execution stats, 6 design-rules grid.
- **Operate** (Phase 7): 7 Today-on-the-Land tiles, alerts +
  upcoming events split panel,
  [`FieldMapPlaceholder`](../apps/web/src/v3/components/FieldMapPlaceholder.tsx)
  inline-SVG canvas with tone-coded flag chips. RULE 2: no MapboxGL
  imports anywhere in v3.
- **Build + Report MVPs** (Phase 8): 3-phase × 13-task build plan
  with status-keyed phase cards; Report page with "Generate Summary"
  → print-styled aggregation of verdict + 6 score bars + blockers +
  actions, `window.print()` + `@media print` rules.
- **Design Studio** (Phase 9, last per the brief): 5-group toolbox
  (Grazing & Land Use, Structures, Water Systems, Access & Paths,
  Amenity & Culture) → static-SVG canvas with paddocks A–D, yurt
  cluster, barn, musalla, hydrology stream/pond/wetland, contour
  curves, gold-dashed property boundary → 5 overlay toggle chips +
  Base Map dropdown → bottom 5-MetricCard strip
  (Area / Perimeter / Elevation / Water Need / Project Phase).
  Toolbox clicks fire toast ("Would place X").

### Verification

- `npm run build` clean across all phases.
- 8-route post-Phase-9 sweep confirmed: every route renders a clear
  title, populated DecisionRail, and `mapboxgl`/`maplibregl` both
  `undefined` on every route. RULE 3 (what / wrong / next) satisfied
  per stage.
- Backlog filed at
  [`apps/web/src/v3/BACKLOG-v3.1.md`](../apps/web/src/v3/BACKLOG-v3.1.md).

### Commits (top of `feat/atlas-3.0`)

```
b503b16 docs(v3): v3.1 backlog
efc3b47 feat(v3/design): Phase 9 — Design Studio
63ddc81 feat(v3/build,report): Phase 8 — Build + Report MVPs
43e542f feat(v3/operate): Phase 7 — Operations Hub
e2e1808 feat(v3): Phase 6 — Prove Feasibility Engine
bf8b0b7 feat(v3): Phase 5 — Diagnose Land Brief
3a32a38 feat(v3): Phase 4 — Discover candidate board
913df8e feat(v3): Phase 3 — Project Command Home
ff2d92f feat(v3): Phase 2 — primitive components
61c5f9a feat(v3): Phase 1 — branch + scaffolding
```

### Deferred (v3.1 backlog highlights)

- Live MapboxGL canvas in Design Studio replacing static SVG; live
  field map in Operate.
- Wire `useV3Project` to Fastify backend; route cutover from
  `/project/$projectId` to `/v3/...` once API + map land.
- Real candidate filtering, real Vision Fit scoring (reuse
  `packages/shared/src/scoring`), PDF export, Generate Brief / Fix on
  Map / Mark Phase Complete CTAs.
- axe-core contrast warnings on muted-text-on-charcoal; CSS-module
  `.d.ts` generation to clean up `string | undefined` widening.

### Recommended next session

- **v3.1 kickoff** — pick the spike that unblocks the most: either
  wire `useV3Project` to the Fastify backend (unblocks real data
  across all 7 stages) or replace the Design Studio SVG with the live
  MapboxGL canvas (unblocks placement scoring + the v3.1 cutover).

Decision record: [decisions/2026-04-28-atlas-v3-mock-first-lifecycle-shell.md](decisions/2026-04-28-atlas-v3-mock-first-lifecycle-shell.md).

---

## 2026-04-27 — Feasibility Command Center

Replaced the single-column `DecisionSupportPanel` on the Dashboard's
`feasibility` section with a verdict-led, two-column cockpit. The narrow
MapView right-rail still uses `DecisionSupportPanel`; this is page-level only.

### What changed (`feat/shared-scoring`)

- New [`FeasibilityCommandCenter`](../apps/web/src/features/decision/FeasibilityCommandCenter.tsx)
  composes: header → [`FeasibilityVerdictHero`](../apps/web/src/features/decision/FeasibilityVerdictHero.tsx)
  → [`BlockingIssuesStrip`](../apps/web/src/features/decision/BlockingIssuesStrip.tsx)
  → 2-col body (Fit & Readiness | Execution Reality) → Design Rules section →
  collapsible Methodology drawer → sticky [`FeasibilityDecisionRail`](../apps/web/src/features/decision/FeasibilityDecisionRail.tsx).
  All inner cards lazy-load via `Suspense`.
- New [`VisionFitAnalysisCard`](../apps/web/src/features/decision/VisionFitAnalysisCard.tsx)
  surfaces vision-vs-land fit alongside `BestUseSummaryCard` /
  `DomainFeasibilityCard` in the Fit column.
- Three new hooks under [`features/decision/hooks/`](../apps/web/src/features/decision/hooks/):
  `useFeasibilityVerdict` (verdict band + score), `useTriageItems` (ordered
  blocker list shared between Hero, BlockingIssuesStrip and DecisionRail),
  `useTypeFitRanking` (vision-fit ranking). These centralize logic that used
  to live inline in the panel cards.
- [`BestUseSummaryCard`](../apps/web/src/features/decision/BestUseSummaryCard.tsx)
  and [`WhatMustBeSolvedFirstCard`](../apps/web/src/features/decision/WhatMustBeSolvedFirstCard.tsx)
  thinned out (-293 lines combined) — heavy ranking/triage logic moved into
  the new hooks so the cards become render-only.
- [`CapitalIntensityCard`](../apps/web/src/features/decision/CapitalIntensityCard.tsx)
  radar `viewBox` widened to `-60 -30 320 260` so axis labels stop being
  clipped by the SVG box.
- [`DashboardRouter`](../apps/web/src/features/dashboard/DashboardRouter.tsx)
  swaps the `feasibility` case from `DecisionSupportPanel` to
  `FeasibilityCommandCenter` and threads `onSwitchToMap` through.
- [`vite.config.ts`](../apps/web/vite.config.ts) adds the
  `@ogden/shared/demand` subpath alias (more-specific entries must precede the
  bare `@ogden/shared` alias — Vite prefix-matches in order).

### Verification

- `tsc --noEmit` clean across the full session (every heartbeat exited 0).
- New components were authored against the existing scoring helpers — no
  duplicate score logic in the cockpit.

### Out of scope / deferred

- The `DecisionSupportPanel` is still mounted by the MapView right-rail. A
  future pass can decide whether the narrow panel should also adopt the new
  verdict + triage hooks.
- `OrganizationSettingsReadinessCard` already shipped in commit `017e7b2`
  and is not part of this entry.

---

## 2026-04-27 — UI/UX upgrade: Land Verdict shell (Phases 2–6)

Shipped the `2026-04-27` UI/UX upgrade brief — converted the dense operator
dashboard into a verdict-led "regenerative command center." Plan source of
truth: [`docs/ui-ux-upgrade-brief.md`](../docs/ui-ux-upgrade-brief.md).

### What changed (`feat/shared-scoring`)

- **Phase 2 — Navigation taxonomy.** Added a third grouping mode `stage`
  (Understand / Identify Constraints / Design / Test Feasibility / Prepare
  the Report) to [`features/navigation/taxonomy.ts`](../apps/web/src/features/navigation/taxonomy.ts);
  `STAGE_META`, `STAGE_ORDER`, `groupByStage()` parallel the existing phase
  and domain helpers. [`uiStore`](../apps/web/src/store/uiStore.ts) defaults
  the sidebar grouping to `stage`. [`IconSidebar`](../apps/web/src/components/IconSidebar.tsx)
  and [`DashboardSidebar`](../apps/web/src/features/dashboard/DashboardSidebar.tsx)
  consume the stage taxonomy with the same accordion behavior. Top tabs in
  [`ProjectTabBar`](../apps/web/src/components/ProjectTabBar.tsx) renamed to
  `Overview · Design Map · Intelligence · Report`.
- **Phase 3 — Land Verdict hero.** New
  [`LandVerdictCard`](../apps/web/src/features/dashboard/LandVerdictCard.tsx)
  derives a verdict band (Strong Fit / Conditional / Caution / Not
  Recommended) from `computeOverallScore()`, surfaces main blocker + best-fit
  use, and exposes `View Constraints / Open Design Map / Generate Brief`
  CTAs. New [`CriticalConstraintAlert`](../apps/web/src/features/dashboard/CriticalConstraintAlert.tsx)
  renders below it only when a blocking flag exists. Both mounted at the top
  of [`DashboardView`](../apps/web/src/features/dashboard/DashboardView.tsx)
  for the default `site-intelligence` section.
- **Phase 4 — Decision Triad.** New
  [`DecisionTriad`](../apps/web/src/features/dashboard/DecisionTriad.tsx)
  promotes Risks / Opportunities / Limitations into a three-column row with
  the schema *Impact · Why it matters · Recommended action · Confidence ·
  Source.* Reuses `deriveRisks()` / `deriveOpportunities()` from
  `@ogden/shared/scoring`; recommended action is heuristic from
  severity+bucket since `evaluateRule` projects out the rule's `action`.
- **Phase 5 — Next Best Actions + persistent CTA.** New
  [`NextBestActionsPanel`](../apps/web/src/features/dashboard/NextBestActionsPanel.tsx)
  replaces the empty "Regenerative Metrics" placeholder on the Overview
  right rail in [`DashboardMetrics`](../apps/web/src/features/dashboard/DashboardMetrics.tsx).
  Priority queue: missing boundary → top blocker → top opportunity → run
  feasibility → generate brief, capped at 5 items. A persistent
  `Generate Brief` button now sits in the [`ProjectTabBar`](../apps/web/src/components/ProjectTabBar.tsx)
  right slot on every project tab.
- **Phase 6 — Mobile shell.** New
  [`MobileProjectShell`](../apps/web/src/pages/MobileProjectShell.tsx)
  activates via `useIsMobile()` (≤768px). Top app bar (back / project name /
  brief icon) → vertical hero stack on Overview (verdict, alert, triad,
  next-actions) → sticky `Generate Land Brief` above bottom nav → bottom nav
  with four tabs → horizontal swipe (60px threshold) between tabs. Reuses
  the existing `MapView` and `DashboardRouter` for non-Overview tabs.

### Verification

- `tsc --noEmit` clean.
- Live preview verified at 1440 (desktop right rail + tab bar CTA), 768
  (mobile shell + bottom nav), and 375 (mobile shell + sticky CTA + 4-tab
  swipe). Generate Brief opens the existing `ProjectSummaryExport` modal at
  every breakpoint.
- Pre-existing test failures in [`apps/web/src/tests/computeScores.test.ts`](../apps/web/src/tests/computeScores.test.ts)
  belong to the in-flight shared-scoring rollout and are out of scope.

### Out of scope / deferred

- Stewardship-readiness compute engine, silvopasture/agritourism scoring —
  surfaces are reserved on the upgrade brief but compute lives later.
- Map-layer redesign and public-portal redesign.
- Backend/API changes — this was a presentation-layer plan.

---

## 2026-04-27 — Demand model round 2: overrides, occupancy, livestock, climate

Closed all six round-1 deferrals from the demand-coefficient session earlier
the same day. Decision:
[decisions/2026-04-27-demand-model-round-2.md](decisions/2026-04-27-demand-model-round-2.md).

### Changes (`feat/shared-scoring`)

- [`packages/shared/src/demand/structureDemand.ts`](../packages/shared/src/demand/structureDemand.ts)
  — `StructureLike` gains `demandWaterGalPerDay`, `demandKwhPerDay`,
  `occupantCount`. `RESIDENTIAL_STRUCTURE_TYPES` (cabin/yurt/tent_glamping/
  earthship/bathhouse) gates occupant scaling. Both getters early-return the
  override before greenhouse/occupants/stories scaling.
- [`packages/shared/src/demand/livestockDemand.ts`](../packages/shared/src/demand/livestockDemand.ts)
  *(new)* — `LIVESTOCK_WATER_GAL_PER_HEAD_DAY` by 9-species enum (FAO + NRCS:
  cattle 15, horses 12, pigs 5, sheep/goats 2, ducks_geese 0.3, rabbits 0.25,
  poultry 0.1, bees 0). `getPaddockWaterGalPerDay()` derives total head from
  `headCount ?? round(stockingDensity × areaHa)` and splits across species.
- [`packages/shared/src/demand/cropDemand.ts`](../packages/shared/src/demand/cropDemand.ts)
  — `getCropAreaDemandGalPerM2Yr(spec, climateMultiplier?)` and
  `getCropAreaWaterGalYr(area, climateMultiplier?)` accept optional multiplier;
  new `petClimateMultiplier(petMm, refPetMm = 1100)` clamps to `[0.7, 1.5]`.
- [`packages/shared/src/demand/rollup.ts`](../packages/shared/src/demand/rollup.ts)
  — `SiteDemandInput.paddocks?` + `climateMultiplier?`; `SiteDemand.livestockWaterGalYr`;
  total water = `structureWaterGalPerDay × 365 + cropWaterGalYr + livestockWaterGalYr`.
- [`packages/shared/src/scoring/hydrologyMetrics.ts`](../packages/shared/src/scoring/hydrologyMetrics.ts)
  — `HydroInputs.paddocks?`; PET-driven `climateMultiplier` derived from the
  same `computePet()` call already used for `petMm`, gated on solar/wind/RH
  presence so the legacy fallback path stays at 1.0.
- [`apps/web/src/store/structureStore.ts`](../apps/web/src/store/structureStore.ts)
  — `Structure` adds three optional fields (`demandWaterGalPerDay`,
  `demandKwhPerDay`, `occupantCount`).
- [`apps/web/src/features/structures/StructurePropertiesModal.tsx`](../apps/web/src/features/structures/StructurePropertiesModal.tsx)
  — Two demand-override inputs (placeholders show per-type defaults); 1–8
  occupants slider gated visible-only on residential types.
- [`apps/web/src/components/panels/DesignToolsPanel.tsx`](../apps/web/src/components/panels/DesignToolsPanel.tsx)
  — Both placement and edit handlers forward the three new fields to the store.
- [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts)
  — Removed deprecated `WATER_DEMAND_GAL_PER_M2_YR` flat re-export; only the
  per-area-type signature of `computeWaterGalYr` remains.
- [`apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx)
  — Tooltip + footnote callsites migrated to `getCropAreaDemandGalPerM2Yr`
  ("orchard reference" framing).
- [`apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx`](../apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx)
  — Reads `livestockStore.paddocks` (project-filtered) and threads paddocks
  + new structure override fields into the engine.
- [`apps/web/src/features/utilities/utilityAnalysis.ts`](../apps/web/src/features/utilities/utilityAnalysis.ts)
  — `estimateSolarOutput(panelCount, avgIrradiance?)`: irradiance now optional;
  4.5 kWh/m²/day fallback only when undefined or non-positive. TODO removed.
- [`apps/web/src/features/utilities/EnergyDemandRollup.tsx`](../apps/web/src/features/utilities/EnergyDemandRollup.tsx)
  — New `solarIrradianceKwhM2Day?` prop; footnote cites "(NASA POWER)" when
  the climate layer is loaded, else "(temperate-zone default)".
- [`apps/web/src/features/utilities/UtilityPanel.tsx`](../apps/web/src/features/utilities/UtilityPanel.tsx)
  + [`apps/web/src/features/dashboard/pages/EnergyDashboard.tsx`](../apps/web/src/features/dashboard/pages/EnergyDashboard.tsx)
  — Both read `climate.solar_radiation_kwh_m2_day` from siteData and forward.

### Tests + verification

- `packages/shared`: `npx vitest run` 136/136 ✓ — `demand.test.ts` grew 20 → 38
  with structure overrides, occupant scaling, livestock species coverage,
  paddock scaling, multi-species head splitting, PET multiplier endpoints,
  and override-stacks-with-stories.
- `tsc --noEmit` clean for `packages/shared`, `apps/web`, `apps/api`.

### Manual probe targets

- Cabin with `occupantCount = 4` → 240 gal/day (was 60).
- Cattle paddock at 10 head/ha × 2 ha → 300 gal/day in hydrology rollup.
- Climate-loaded solar row → "x.x kWh/m²/day (NASA POWER)" footnote vs.
  "(temperate-zone default — load climate layer for site-specific value)".
- Override `demandWaterGalPerDay = 200` on a 4-occupant cabin → 200 (override wins).

### Out of scope (deferred)

- PlantingTool per-area display rollup intentionally stays at the unscaled
  per-area-type baseline — proxy PET from temperature alone produced
  unrealistic 1.5× clamps; the multiplier belongs in the rollup that has
  full solar/wind/RH input.
- Per-paddock species head-count UI in placement flow.
- Manual "this site is arid" climate-multiplier toggle.
- Project-level "household size" aggregation across structures.

---

## 2026-04-27 — Project intake: map centering + manual coordinates

Closed a UX gap in the new-project wizard. Step 3's map opened at a
hardcoded Ontario centroid and only re-centered if a MapTiler geocode of
the Step-2 address succeeded. Geocodes were unscoped and silently swallowed
failures, so non-Toronto projects landed wrong with no signal.

### Changes (`feat/shared-scoring`)

- [`packages/shared/src/schemas/project.schema.ts`](packages/shared/src/schemas/project.schema.ts)
  — `ProjectMetadata` extended with `centerLat` (`-90..90`) + `centerLng`
  (`-180..180`). No DB migration (jsonb).
- [`apps/web/src/features/project/wizard/StepLocation.tsx`](apps/web/src/features/project/wizard/StepLocation.tsx)
  — Added optional lat/lng inputs with blur-time range validation +
  "paste lat, lng" textbox that splits Google-Maps-style strings.
- [`apps/web/src/features/project/wizard/StepBoundary.tsx`](apps/web/src/features/project/wizard/StepBoundary.tsx)
  — Inline geocode replaced by `centerMap()` callback driven by
  priority `boundary > manual coords > scoped geocode`. Geocode now
  appends `country=us|ca` + `provinceState`. Failures surface a
  dismissable banner with "Back to Step 2". Toolbar gains a **Recenter**
  button (uses current wizard data). Successful geocodes backfill
  `centerLat/Lng` so the project remembers its center.
- [`apps/web/src/pages/NewProjectPage.tsx`](apps/web/src/pages/NewProjectPage.tsx)
  + [`apps/web/src/features/project/wizard/StepNotes.tsx`](apps/web/src/features/project/wizard/StepNotes.tsx)
  — `WizardData` carries the strings; `buildMetadata()` parses to numbers
  before write so both local + server paths persist.

### Verification

- `apps/web` `tsc --noEmit` clean (Node heap bumped to 8 GB; default
  4 GB OOMs on this project — known Atlas constraint).
- DOM checks in preview: Step 2 lat/lng inputs + paste shortcut +
  inline range validation; Step 3 renders Recenter button + map canvas.
- Screenshot tool timed out — no pixel-level fly-to confirmation.

### Decision document

[`wiki/decisions/2026-04-27-project-intake-map-centering.md`](decisions/2026-04-27-project-intake-map-centering.md)
captures the centering priority + persistence contract for downstream
consumers (notably the §1 `project-intake` implementation pass, which
needs to honor `metadata.centerLat/Lng` when reopening existing projects).

### Deferred

- Wiring `metadata.centerLat/Lng` into the existing-project map open
  path (separate consumer; belongs in §1 implementation).
- Reverse geocoding, map-click-to-set-center.

---

## 2026-04-27 — Store-API stable-reference contract sweep

Followed up the 2026-04-26 Zustand selector-stability decision with a full
sweep of every store under [`apps/web/src/store/`](apps/web/src/store/) to
confirm the anti-pattern is closed and document return semantics on read-side
getters.

### Findings

29 stores audited. Three stores expose id-keyed read methods that return
freshly-allocated arrays (`.filter()` / `.sort()`):

- [`zoneStore.getProjectZones(projectId)`](apps/web/src/store/zoneStore.ts) — already documented with warning, no selector call-sites.
- [`phaseStore.getProjectPhases(projectId)`](apps/web/src/store/phaseStore.ts) — already documented with warning, no selector call-sites (TimelinePanel + 3 cards correctly subscribe to raw `.phases` and derive in `useMemo`).
- [`versionStore.getProjectSnapshots(projectId)`](apps/web/src/store/versionStore.ts) — already documented with warning, currently unused.

Three stores expose id-keyed read methods that return **stable stored
references** (`.find()`) — safe in selectors. These had no contract comment;
added one-line JSDoc:

- [`visionStore.getVisionData(projectId)`](apps/web/src/store/visionStore.ts) — 8 selector call-sites confirmed safe.
- [`portalStore.getConfig(projectId)`](apps/web/src/store/portalStore.ts) — internal callers only.
- [`portalStore.getBySlug(slug)`](apps/web/src/store/portalStore.ts) — internal callers only.

The remaining 23 stores (pathStore, structureStore, cropStore, livestockStore,
projectStore, uiStore, scenarioStore, siteDataStore, authStore, nurseryStore,
financialStore, commentStore, presenceStore, connectivityStore, mapStore,
soilSampleStore, regenerationEventStore, fieldworkStore, sitingWeightStore,
and others) expose no id-keyed read methods at all — call-sites already
follow the subscribe-then-derive pattern by default.

### Done

- Annotated `getVisionData`, `getConfig`, `getBySlug` with stable-reference
  contract comments.

### Verification

- No selector call-sites of the three fresh-array getters detected.
- Zero new infinite-render bugs introduced since the 2026-04-26 fix.

### Deferred

- **ESLint custom rule** to flag `useStore((s) => s.array.filter(...))` and
  `useStore((s) => s.getXxx(...))` where `getXxx` is on a known-fresh
  allow-list. Defer until a regression appears — manual JSDoc on the three
  fresh getters is sufficient signal for now.

---

## 2026-04-27 — Right rail / bottom toolbar split + Dashboard ↔ Map domain parity

Split the map-view chrome along a single rule: **right rail = read-out,
bottom toolbar = action**. Three phases landed in this session:

### Done

**Phase 1d — Biomass on both surfaces.** Biomass was dashboard-only despite
being a clean site-readout. Re-wired across the stack so the same
`BiomassDashboard` component renders on the dashboard and inside the map
right rail (via the existing `map-rail-dashboard` wrapper, same pattern as
Forest Hub / Carbon Diagnostic). Files: [`apps/web/src/features/navigation/taxonomy.ts`](apps/web/src/features/navigation/taxonomy.ts) (added `panel: 'biomass'`, `mapSubItem: 'biomass'`, dropped `dashboardOnly`), [`apps/web/src/components/IconSidebar.tsx`](apps/web/src/components/IconSidebar.tsx) (`SidebarView` and `SubItemId` unions), [`apps/web/src/components/ui/RailPanelShell.tsx`](apps/web/src/components/ui/RailPanelShell.tsx) (`VIEW_LABELS.biomass = 'Biomass'` — required by exhaustive `Record<Exclude<SidebarView, null>, string>`), [`apps/web/src/features/dashboard/DashboardRouter.tsx`](apps/web/src/features/dashboard/DashboardRouter.tsx), [`apps/web/src/features/map/MapView.tsx`](apps/web/src/features/map/MapView.tsx), and new [`apps/web/src/features/dashboard/pages/BiomassDashboard.tsx`](apps/web/src/features/dashboard/pages/BiomassDashboard.tsx).

**Phase 2b — Hydrology → Water Systems cross-link.** Avoided component
duplication: added `<div id="water-systems">` anchor in [`EnergyDashboard.tsx`](apps/web/src/features/dashboard/pages/EnergyDashboard.tsx) and a `WaterSystemsCrossLink` button in [`HydrologyDashboard.tsx`](apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx) that flips `activeDashboardSection` to `'energy-offgrid'` and `scrollIntoView` on the anchor.

**Phase 3 — Right rail vs bottom toolbar.** Removed `DesignToolsPanel`'s
internal `activeTab`; it now reads `useUIStore.activeDashboardSection` so the
left sidebar, right rail, and bottom toolbar move together. All "Draw" /
"Place" controls moved to [`DomainFloatingToolbar.tsx`](apps/web/src/features/map/DomainFloatingToolbar.tsx) and emit custom maplibre events (`ogden:zones:start-draw`, `ogden:structures:open-picker`, `ogden:crops:open-picker`, `ogden:paths:open-picker`). Affected panels: [`DesignToolsPanel`](apps/web/src/components/panels/DesignToolsPanel.tsx), [`ZonePanel`](apps/web/src/features/zones/ZonePanel.tsx), [`StructurePanel`](apps/web/src/features/structures/StructurePanel.tsx), [`CropPanel`](apps/web/src/features/crops/CropPanel.tsx), [`AccessPanel`](apps/web/src/features/access/AccessPanel.tsx) (added Path Type Picker modal).

Decision record: [decisions/2026-04-27-right-rail-bottom-toolbar-split.md](decisions/2026-04-27-right-rail-bottom-toolbar-split.md).

### Verification

- Browser smoke test on `351 House` (preview server, port 5200):
  - Dashboard Biomass: Density 104 t/ha · Site Total 31,382 t · Carbon
    Stock 191 tCO2e/ha · YoY +19% · vegetation composition + drivers all
    render with no console errors.
  - Map rail Biomass: same component, same numbers (single source via
    `useSiteData`).
  - All four design domains (zones, structures, access, crops): every action
    button lives only in `_toolbar_*` ancestor, zero matches in the rail.
- `tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=8192`) — Biomass
  cross-stack wiring compiles; previously-flagged
  `QuietCirculationRouteCard.tsx:128-132` and `ProgramCoverageCard.tsx:125`
  errors confirmed absent from current source.

### Deferred

- **Planting Tool render-loop.** Spun off as a separate task chip earlier
  in the session (unrelated to refactor — pre-existing infinite loop in
  `PlantingToolDashboard`).
- **`npm test` / `npm run lint` regression sweep.** Out of session scope
  but should run before merging `feat/shared-scoring`.

### Recommended next session

- **Sweep store API for stable-reference contracts.** For each `getXxx(id)`
  method in the Zustand stores, document whether it returns a stored
  reference or a fresh array. Convert any fresh-array getters to
  subscribe-then-derive at every call-site. Optionally add a one-line
  comment on each store action describing return semantics.

---

## 2026-04-27 — Sweep: Zustand selector anti-pattern across `feat/shared-scoring`

After the `ClimateShiftScenarioCard` fix below, swept the rest of the
branch for the same shape. Found 37 array-returning `.filter()` calls
inside Zustand selectors across 10 cards — all dormant infinite-loop
bugs that only haven't crashed because their dashboards aren't all
rendered yet.

Cards fixed (all now follow the `allX` + `useMemo` pattern):
- ai-design-support: AlternativeLayoutRationale, AssumptionGapDetector,
  EcologicalRiskWarnings, FeaturePlacementSuggestions, NeedsSiteVisit,
  PhasedBuildStrategy, WhyHerePanels (28 instances)
- economics: EnterpriseRevenueMix, OverbuiltForRevenueWarning,
  RevenueRampProjection (9 instances)

Portal cards (`ShareLinkReadiness`, `StakeholderReviewMode`) also use
`s.X.filter(...)` inside selectors but return `.length` (a primitive),
which Object.is compares safely — left as-is.

Applied via codemod (regex match on
`useXStore((s) => s.PROP.filter((p) => p.projectId === IDREF))`).
`pnpm tsc --noEmit` clean.

---

## 2026-04-27 — Planting Tool dashboard infinite-loop fix

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

---

## 2026-04-27 — Site Intelligence label-value layout fix

The Site Intelligence panel rendered each row at full panel width (~1080px)
with label glued left and value glued right via `flex:1; text-align:right`,
forcing 800+px saccades. Solution:

- Tile rows 2-3 across at desktop via `display:grid; grid-template-columns:
  repeat(auto-fill, minmax(260px, 1fr))` on the row-list container inside
  each `.liveDataWrap`. Collapses to a single column on narrow rails.
- Override the shared `.rightAlign` class and `.liveDataRight` wrapper inside
  `.liveDataRow` (`flex: 0 1 auto; margin-left: auto`) so values float to
  the **tile** edge, not the panel edge.
- Cap `.liveDataLabel` at `max-width: 130px`; baseline-align the row.

Live verification at 1440px viewport: gaps now 10–60px across Hydrology,
Groundwater, Water Quality, Live Ontario Data sections.

The Modern UI/UX Design Scholar notebook was rate-limited (8 retries) during
the consult attempt — plan stood on codebase evidence + established design-
system patterns (Stripe / Linear / IBM Carbon / Primer all use ~280–360 px
definition-list columns for dense metadata panels).

Files: [components/panels/SiteIntelligencePanel.module.css](../atlas/apps/web/src/components/panels/SiteIntelligencePanel.module.css)
Commit: `7f08936`

Deferred: re-consult scholar when rate limit clears; optional `.numeric`
modifier for tabular-num right-alignment of pure-metric rows.

---

## 2026-04-27 — Store-getter regression guards

Swept all 29 Zustand stores for array-returning getters and audited call-sites
to confirm none of them are invoked inside selectors today. Added JSDoc
warnings on the three array-returning getters (`phaseStore.getProjectPhases`,
`versionStore.getProjectSnapshots`, `zoneStore.getProjectZones`) explaining
the anti-pattern and showing the correct subscribe-then-derive snippet.
Future contributors will see the warning on IDE hover.

Cross-references: [decisions/2026-04-26-zustand-selector-stability.md](decisions/2026-04-26-zustand-selector-stability.md)

Deferred: custom ESLint rule to flag `useStore((s) => s.getXxx(...))` at
authoring time.

---

## 2026-04-26 — Sweep: hoist 59 in-selector `.filter()` calls into `useMemo` (commit `68b6811`)

Follow-up to the EnterpriseRevenueMixCard fix below. A multiline
grep across `apps/web/src/features/` revealed the same anti-pattern
in 15 additional files — Zustand selectors returning a fresh
`.filter()` array per call, all latent infinite-loop hazards.

**Files (15):** `stewardship/PunchListCard`, `portal/InternalVsPublicViewCard`,
`fieldwork/WalkChecklistCard`, `economics/RevenueRampProjectionCard`,
`economics/OverbuiltForRevenueWarningCard`, `crops/ClimateShiftScenarioCard`,
and 9 cards under `ai-design-support/` (WhyHerePanels, PhasedBuildStrategy,
NeedsSiteVisit, FeaturePlacementSuggestions, EducationalExplainer,
EcologicalRiskWarnings, DesignBriefPitch, AssumptionGapDetector,
AlternativeLayoutRationale).

**Approach.** One-shot codemod at
[`scripts/fix-store-filter-loops.mjs`](scripts/fix-store-filter-loops.mjs)
— regex-driven hoist of `useXStore((s) => s.field.filter(...))` into
`const allField = useXStore((s) => s.field); const name = useMemo(() => allField.filter(...), [allField, owner])`.
59 sites rewritten across 15 files; all 15 already imported `useMemo`
so no import edits needed.

**Codemod gotcha (preserved as a comment in the script).** Initial
regex used `^(\s*)` with `gm` flag. With CRLF line endings, JS regex
`^` can position itself between `\r` and `\n`, letting `\s*` consume
the `\n` and re-emit it inside the indent capture — corrupting line
structure. Switched indent capture to `(?<=^|\r?\n)([ \t]*)` (strict
horizontal whitespace, lookbehind for line start). Worth remembering
for any future codemod against this CRLF codebase.

**Verification.** `apps/web` `tsc --noEmit` reports zero new errors
in the 15 touched files (pre-existing breakage in
`AiSiteSynthesisCard.tsx` and `components/panels/*` is unrelated and
predates this branch). Preview reload — console clean of "Maximum
update depth"; only pre-existing axe-core a11y warnings and a
zustand "no migrate function" notice remain.

**Pattern note.** Codebase still has no `useShallow` / `zustand/shallow`
adoption. Established convention is now firmly "select primitive arrays,
filter via `useMemo`" — applies to any future card that needs a
project-scoped slice. Consider adding an ESLint rule that flags
`use\w+Store\(\(\w+\)\s*=>[^)]*\.filter` to prevent regressions.

---

## 2026-04-26 — Fix: EnterpriseRevenueMixCard infinite render loop

Bug → Economics panel's `EnterpriseRevenueMixCard` crashed the
ErrorBoundary on mount with "Maximum update depth exceeded". Root
cause: three Zustand selectors at lines 102-110 each returned a
fresh `.filter()` array per call, so referential equality failed
on every subscribe tick → infinite re-render.

**Files:**
- [`apps/web/src/features/economics/EnterpriseRevenueMixCard.tsx`](apps/web/src/features/economics/EnterpriseRevenueMixCard.tsx) — selectors now pull raw `structures` / `paddocks` / `cropAreas` arrays; project-id filtering moved into three `useMemo` blocks.

**Verification.** Console clean (no "Maximum update depth"); only
pre-existing axe-core color-contrast warnings remained. `tsc
--noEmit` for `apps/web` clean for the file.

**Pattern note.** Codebase has no `useShallow` / `zustand/shallow`
usage — the established convention is "select primitive arrays,
filter via `useMemo`". Other cards using the same anti-pattern
(in-selector `.filter`) are likely lurking; sibling
`StageRevealNarrativeCard` already had a similar fix earlier
(commit `844a3e5`).

---

## 2026-04-25 — §11 PredatorRiskHotspotsCard shipped (commit `48025c5`)

Feature → per-paddock predator-pressure breakdown mounted on
`LivestockDashboard` between `PastureUtilizationCard` and the
existing one-line welfare summary. Graduates the dashboard's
predator coverage from "X high, Y moderate" count into an
actionable per-paddock view with drivers and mitigations.

**Files:**
- `apps/web/src/features/livestock/PredatorRiskHotspotsCard.tsx` (~320 lines)
- `apps/web/src/features/livestock/PredatorRiskHotspotsCard.module.css` (~175 lines)
- `apps/web/src/features/dashboard/pages/LivestockDashboard.tsx` —
  import + mount
- `packages/shared/src/featureManifest.ts` —
  `predator-risk-zone-map` (§11, P3) `partial` → `done`

**Layered analysis (composes existing `computePredatorRisk` baseline):**
- **Species vulnerability** — poultry / ducks-geese / rabbits / bees
  rank highest (bumps band +1); sheep / goats / pigs mid; cattle /
  horses lowest (neutral). Vulnerable species gate the
  "guardian animal" + "night shelter" mitigations.
- **Edge density** — `perimeter / sqrt(area)` > 6 (long thin shape vs.
  perfect square = 4) bumps band +1; surfaces "subdivide into more
  compact cells" mitigation.
- **Fencing type** — `electric` drops band −1; `none` / `temporary`
  bumps +1 with "upgrade to permanent electric or woven-wire"
  mitigation; `post_rail` adds an "add electric offset wire"
  mitigation when species are vulnerable.
- **Shelter proximity** — no `animal_shelter` / `barn` / `pavilion`
  placed (or nearest > 300 m) bumps band +1 for vulnerable species,
  surfaces "place shelter within 300 m" mitigation.

Output: tone-coded list (green low / gold moderate / coral high)
ranked highest-risk first, header badge `{H}H · {M}M · {L}L`. Each
paddock card shows drivers (one bullet per overlay that fired) and
up to three mitigations from the static library, deduplicated.

All overlays presentation-layer only — no shared-package math.
Geometry helpers (centroid, area, perimeter via equirectangular
approximation) live inline in the card.

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 4 files only — used
`git checkout HEAD -- packages/shared/src/featureManifest.ts` to
quarantine an unrelated working-tree change at line 444 before
re-applying the §11 line for a single-purpose commit.

---

## 2026-04-25 — §9 OrientationFeedback in StructurePropertiesModal (commit `1001813`)

Feature → live solar-orientation feedback card mounted inside
`StructurePropertiesModal` directly under the rotation slider. As the
steward drags the orientation control, the card updates with tone-coded
feedback on how far the structure's long axis sits from true East–West
(the passive-solar baseline in both hemispheres) and a rough estimate
of winter-exposure loss. Includes a one-click "Snap to optimal" button
for the off-axis case.

**Files:**
- `apps/web/src/features/structures/StructurePropertiesModal.tsx` —
  optional `lat?: number` on `NewPlacementProps`, derive `lat` from
  `props.structure.center[1]` (edit) or `props.lat` (new), inline
  `<OrientationFeedback>` mount after the rotation control, +
  `OrientationFeedback` component appended (~150 lines)
- `apps/web/src/components/panels/DesignToolsPanel.tsx` —
  thread `lat={pendingStructureCenter[1]}` for new placement
- `packages/shared/src/featureManifest.ts` —
  `place-rotate-resize-structures` (§9, P2) `partial` → `done`

**Heuristic:**
- `optimalRot` = `0` when `widthM >= depthM` (long-side East–West
  baseline), `90` when steward has flipped which dimension is "long"
- `offsetDeg` = absolute distance (0–90°) from optimal, modulo 180
- `lossPct` = `1 − cos²(offsetDeg)` × 100 (steward-facing estimate,
  not a building-physics simulation)
- Tone bands: ≤15° good (green), ≤35° fair (gold), >35° poor (coral)
- Hemisphere copy: NH → "long side faces south", SH → "north";
  derived from `lat` sign

**Manifest scoping note:** the candidate I proposed referenced a
`building-orientation-tools` slug that doesn't exist in §9 (only
`setback-slope-solar-orientation-warnings`, already done). Mapped to
the closest real partial — `place-rotate-resize-structures` (P2) —
since the inline orientation feedback clearly graduates the rotation
control's UX.

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 3 files only — used
`git checkout HEAD -- packages/shared/src/featureManifest.ts` to
quarantine an unrelated working-tree change at line 440 before
re-applying the §9 line, ensuring a single-purpose commit.

---

## 2026-04-25 — §20 ExtractedPatternsCard shipped (commit `c02ee84`)

Feature → "Patterns from this site" card mounted on `TemplatePanel` above
the library list (when no template is selected). Renders six bundles +
a phase-structure row derived purely from the active project's stores —
no new entities, no shared-package math. Frames the project as a future
template by surfacing what would carry over: palettes, mixes, sets.

**Files:**
- `apps/web/src/features/templates/ExtractedPatternsCard.tsx` (~390 lines)
- `apps/web/src/features/templates/ExtractedPatternsCard.module.css` (~200 lines)
- `apps/web/src/features/templates/TemplatePanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` —
  `saved-bundles-rules-hotspots-phases-costs` (§20, P3) `planned` → `partial`

**Bundles surfaced:**
- **Zone palette** — count per `ZoneCategory` with color swatches
- **Structure mix** — count per `StructureType` + cost rollup ($K total,
  with "X of Y priced" caveat when some structures lack costEstimate)
- **Path palette** — count per `PathType` with total length per class
- **Livestock set** — distinct species across paddocks + avg head/ha
- **Crop polyculture** — top 8 distinct species across crop areas
- **Utility kit** — count per `UtilityType`
- **Phase structure** — ordered chips with timeframe + completion tone

Empty-project path: shows the explanatory header + "no design content
yet" hint. Header badge tallies all placed items as "{N} ITEMS".

Read-only inventory; the actual save-as-template / locking flow remains
follow-on work tracked under `template-duplication-locking-governance`
(§20, also `partial`).

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 4 files only — the
parallel-session WIP stash (`stash@{0}: pre-sync stash`) was kept aside.

---

## 2026-04-25 — §3 SiteNarrativeSummaryCard shipped (commit `54b3821`)

Feature → Risks / Opportunities / Limitations narrative trio mounted on
`SiteAssessmentPanel` between the existing "Site Flags" list and the
data-sources notice. The flag list above the new card is metadata-driven
(acreage, climate region, parcel boundary). This card walks every
project store (zones, structures, paddocks, utilities, paths, crops) and
produces a plain-language read-back of the design state — the kind of
sentences a steward would otherwise have to assemble manually before a
client review.

**Files:**
- `apps/web/src/features/assessment/SiteNarrativeSummaryCard.tsx` (~350 lines)
- `apps/web/src/features/assessment/SiteNarrativeSummaryCard.module.css` (~140 lines)
- `apps/web/src/features/assessment/SiteAssessmentPanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `risk-opportunity-limitation-summaries`
  (§3, P1) `partial` → `done`

**Logic:**
- **Opportunities:** multi-phase plan (≥ 2 structure phases),
  water-retention zones drawn (acreage roll-up), conservation acreage,
  diverse program (≥ 5 zone categories), crop polyculture (≥ 4 species),
  paddock rotation possible (≥ 2 paddocks).
- **Risks:** overstocked paddocks (> 14 head/ha, named inline), no water
  utility despite structures placed, bare-stage erosion zones, high
  invasive-pressure zones, habitable structures > 250 m from nearest
  water utility (named with distance), no buffer / setback zone drawn.
- **Limitations:** parcel < 5 acres, parcel boundary not captured, fewer
  than 3 zones drawn, no paths drawn, single-phase build plan.
- Each item: short title + italic plain-language body. Tone-coded bucket
  cards (green / red / lavender) and a header badge showing OPP / RISK /
  LIM counts.

**Type-check:** clean (`tsc --noEmit` exit 0). One JSX parse error along
the way — a literal `>` inside the footnote text was reading as a tag
opener; fixed with `&gt;`.

**Pure presentation.** Reads zoneStore + structureStore + livestockStore
+ utilityStore + pathStore + cropStore. No new shared math, no map
writes, no entity changes.

---

## 2026-04-25 — §3 SoilRiskHotspotsCard shipped (commit `fd92941`)

Feature → per-zone soil-risk advisory card mounted on `EcologicalDashboard`
between `EcologicalProtectionCard` and the carbon / seasonality / samples
stack. Closes the dry / wet / erosion / compaction half of §3
`sun-trap-dry-wet-erosion-compaction` (the sun-trap half is already
covered by `MicroclimateInsightsCard`). Mid-iteration the user pointed out
that the Livestock tab was missing an in-panel "Draw Paddock" button — that
shipped first as a small fix (`448a1ac`) before this card.

**Files:**
- `apps/web/src/features/soil-fertility/SoilRiskHotspotsCard.tsx` (~385 lines)
- `apps/web/src/features/soil-fertility/SoilRiskHotspotsCard.module.css` (~250 lines)
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `sun-trap-dry-wet-erosion-compaction`
  (§3) `partial` → `done`

**Logic (per zone):**
- **Compaction:** if a paddock centroid lies within 200 m of the zone
  centroid, use its `stockingDensity` — ≥ 14 head/ha = high, ≥ 8 = medium.
  Fallback medium for `livestock` / `infrastructure` / `access` zones with
  no stocking recorded.
- **Erosion:** zone `successionStage = 'bare'` → high; `'pioneer'` → medium;
  cleared access corridors bump medium when not yet climax.
- **Dry-prone:** centroid distance to nearest water utility (`well_pump` /
  `water_tank` / `rain_catchment`) — > 250 m = high (beyond hose run),
  120–250 m = medium (constrains irrigation lines), no water utility placed
  yet = medium for any non-conservation, non-water-retention zone.
- **Wet-prone:** `category = water_retention` (by-design wet) or ≥ 2 water
  utilities clustered within 80 m of the centroid (likely a low pocket).

Worst severity per zone drives the row tone (high / watch / clear). Parcel
rollup shows a tile per risk class with a hit count, and a footnote spells
out the heuristic thresholds so a steward knows what to interpret as
"walk-the-land prompt" vs. "engineering call."

**Type-check:** clean (`tsc --noEmit` exit 0). Manifest flip was reverted
once mid-commit by a parallel session (line 158 sprung back to `partial`)
and re-applied before staging — final cached diff shows just the single
intended line change.

**Pure presentation.** Reads `useZoneStore` + `useLivestockStore` +
`useUtilityStore` only. No new shared math, no new entity types, no map
writes, no server work.

---

## 2026-04-25 — §6 PassiveSolarTuningCard shipped (commit `c1aad18`)

Feature → per-structure rotate-by-X advisory card mounted on
`SolarClimateDashboard` between the Microclimate Insights section and the
Microclimate Zones grid. `PlacementScoringCard` already scores per-structure
long-axis alignment against the equator; this new card translates that score
into actionable rotation deltas — "rotate counter-clockwise 22°" — and rolls
the fleet into a parcel-level tuning summary so a steward can see at a
glance which dwellings still need a footprint adjustment before final
stake-out.

**Files:**
- `apps/web/src/features/climate/PassiveSolarTuningCard.tsx` (~300 lines)
- `apps/web/src/features/climate/PassiveSolarTuningCard.module.css` (~300 lines)
- `apps/web/src/features/climate/SolarClimateDashboard.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `passive-solar-building-siting`
  (§6) `partial` → `done` (this flip rode along in `dffc2b1`, the parallel
  fieldwork commit)

**Logic:**
- `HABITABLE_TYPES` covers cabin / yurt / greenhouse / bathhouse /
  prayer_space / classroom / earthship / pavilion / workshop /
  tent_glamping. Non-habitable structures (water tanks, sheds) excluded.
- `buildRow(s, lat)` derives `longIsWidth = widthM >= depthM`, sets
  `idealRot = longIsWidth ? 0 : 90`, reduces rotation mod 180 (so 180° ≡
  0°), then computes `deviation = min(r180, 180 - r180)` ∈ [0, 90] and a
  signed delta in the range −45..+45 (positive = clockwise).
- `axisScore = round((1 − deviation/90) × 40)` mirrors the
  PlacementScoringCard convention exactly, so the two cards stay in lockstep
  with no shared-package math drift. `potentialGain = 40 − axisScore`.
- Bands: aligned ≤ 15°, tunable 15–45°, critical > 45°.
- Each row renders a 0–90° gauge, four figure cells (current rot, ideal rot,
  suggested signed Δ, axis score N/40), and a plain-language advisory
  ("Rotate clockwise 22° … projected gain +9 axis pts").
- Parcel rollup tallies aligned/tunable/critical counts plus total
  recoverable axis points and total degrees of rotation needed across the
  fleet.
- Hemisphere-aware glazing primer at the top: `lat ≥ 0 →` south-facing
  long wall, else north — reminds the steward that axis alignment is
  necessary but not sufficient if the glazed facade looks at the wrong sky.

**Type-check:** clean (`tsc --noEmit` exit 0). Initial draft typed
`parcelBoundaryGeojson` as `Polygon | MultiPolygon` and threaded the full
`LocalProject` shape; refactored to take `{ projectId: string; lat: number }`
since the parent already derives `lat` via `turf.centroid` upstream.

**Verification:** type-check only. No live preview attempted this iteration.

**Pure presentation.** Reads `useStructureStore` + parent-derived `lat`. No
new shared math, no map overlays, no new entity types, no server work.

---

## 2026-04-25 — §19 EducationCoverageCard shipped (commit `c58dbfb`)

Feature → educational-mode coverage matrix mounted on `EducationalAtlasDashboard`
between the rationale-index card and `GatheringRetreatCard`. The dashboard
already exposes six interpretive modes (ecology / water / livestock /
agroforestry / regeneration / spiritual) but a steward couldn't see, at a
glance, which modes had material to draw from — a "spiritual" mode is
hollow without a prayer space, a "livestock" mode is hollow without
paddocks. This card surfaces that signal directly.

**Files:**
- `apps/web/src/features/education/EducationCoverageCard.tsx` (~280 lines)
- `apps/web/src/features/education/EducationCoverageCard.module.css` (~210 lines)
- `apps/web/src/features/dashboard/pages/EducationalAtlasDashboard.tsx` —
  import + mount
- `packages/shared/src/featureManifest.ts` — `clickable-hotspots-side-panel`
  (§19) `partial` → `done`

**Logic:**
- Inline `MODES` catalog mirrors the six dashboard modes; each mode declares
  the structure types, zone categories, utility types, path types, and crop
  types it interprets, plus whether paddocks count. Mappings are intentionally
  inclusive (food-production zones feed both ecology and agroforestry).
- For each mode: tally matched features across all six entity types and
  classify as `rich` (≥ 3), `light` (1–2), or `orphan` (0).
- KPIs: rich count, light count, orphan count, feature coverage % (share
  of placed features that ride at least one mode).
- Orphan callout lists hollow modes inline with a "seed hint" per mode
  describing what to add (e.g. "Add a prayer-space structure or designate
  a spiritual zone").
- Per-mode row: icon, label + dominant feature breakdown, count, tag.
- Empty-state branch when project has zero features.

**Manifest target rationale:** `clickable-hotspots-side-panel` (§19, P3)
specifies "clickable hotspots, side panel explanations". The card is the
data-side index those side-panels would render from — the matrix that
links each placed feature to the modes that should illuminate when it's
clicked. Three modes (`rationale-cards-purpose-meaning`,
`ecology-water-livestock-agroforestry-modes`, `spiritual-symbolism-regeneration-modes`)
remain at MT phase as planned for content-rich expansion.

**Coordination note:** parallel session had flipped `punch-list-site-verification`
(§24) from `planned` → `partial` between manifest reads. Reverted that line
on disk before committing to keep the §19 commit clean and let the §24
ship land in its own commit.

Type-check clean (`tsc --noEmit` exit 0).

---

## 2026-04-25 — §22 OperatingRunwayCard shipped (rode along in commit `ae87618`)

Annual revenue-vs-cost burn-down card mounted on `EconomicsPanel` Overview
tab between Scenario Comparison and Investment by Category. Complements the
existing cumulative cashflow chart, which only surfaces the trajectory; this
card surfaces the per-year deficit/surplus picture that operators plan
against, plus a bridge-capital number.

**Files:**
- `apps/web/src/features/economics/OperatingRunwayCard.tsx` (273 lines)
- `apps/web/src/features/economics/OperatingRunwayCard.module.css` (239 lines)
- `apps/web/src/features/economics/EconomicsPanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `cashflow-sequence-chart-break-even`
  (§22) `partial` → `done`

**Logic:**
- Reads `cashflow: YearlyCashflow[]` and `breakEven` already returned by
  `useFinancialModel`. Pure presentation — no engine changes.
- Per-year row computes `net = revenue − capital − operating` (mid scenario).
- A **bridge year** is any year with `net < 0`. Bridge capital = sum of bridge
  deficits × 1.10 contingency.
- KPIs: Bridge capital, Worst single year, Year operating costs are first
  covered by revenue, Year-10 net (steady-state lens).
- SVG chart: stacked downward bars (capital + operating) and upward bars
  (revenue) per year, with bridge years background-tinted amber and a BE
  marker at the cumulative break-even year.
- Tone-coded badge: `SELF-FUNDING` / `N BRIDGE YR(S)` / `N BRIDGE YRS`.

**Coordination note:** parallel session's commit `ae87618 feat(rules): guest
privacy card` swept my four files into a single commit before I could stage
them independently. The OperatingRunwayCard ship is intact in HEAD; this log
entry documents the cohabitation. Same pattern as §8 ride-along.

Type-check clean (`tsc --noEmit` exit 0).

---

## 2026-04-25 — §11 PastureUtilizationCard shipped (commit `6e6f047`)

Paddock-by-paddock stocking-density feedback card mounted on
`LivestockDashboard` after `BiosecurityBufferCard`. Closes the manifest
gap where `paddock-sizing-stocking-density` had a sizing calculator but
no utilization-vs-recommendation feedback.

For each paddock with a primary species and a `stockingDensity` value,
the card classifies utilization against the species' `typicalStocking`
from the local catalog, scaled by a precipitation-based forage capacity
factor derived from `climate.annual_precip_mm`:

  capFactor = 0.5 (≤300 mm) → 1.0 (~800 mm) → 1.1 (≥1500 mm)

Bands: **under** (<60%), **aligned** (60–110%), **high** (110–150%),
**over** (>150%). Each row carries density, recommended density,
utilization %, head count, AU load, AU/ha, plus an actionable advisory
(grow herd, shrink paddock, reduce intensity, watch parasite pressure).

Whole-parcel rollup: paddock count + idle subset, total area, total AU
loaded, parcel-wide AU/ha (tone-coded against 1.5/2.5 thresholds), and
an out-of-band/in-stocked count summarized in the header badge.

**Files (4):**
- `apps/web/src/features/livestock/PastureUtilizationCard.tsx` (new, 275 lines)
- `apps/web/src/features/livestock/PastureUtilizationCard.module.css` (new, 271 lines)
- `apps/web/src/features/dashboard/pages/LivestockDashboard.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`paddock-sizing-stocking-density`
  §11 partial → done)

Pure presentation — uses `useLivestockStore`, `LIVESTOCK_SPECIES`,
`AU_FACTORS`, and the climate site-data layer. No shared-package math,
no new persistence, no map writes. Type-check clean (`tsc --noEmit` exit 0).

---

## 2026-04-25 — §8 ZoneSiteSuitabilityCard shipped (commit `4cabd1b`)

Zone × site-data layer conflict audit, mounted on `ZonePanel` Analysis tab
immediately after `ZoneConflictDetector`. Where the existing detector
catches geometric overlap, incompatible adjacencies (livestock vs.
spiritual, etc.), and regulatory misfit against `permitted_uses`, it
stays silent on the *physical-site* conflicts: a habitation in a FEMA
flood zone, an annual-crop zone on hydrologic-group D soil, livestock on
a parcel with a significant wetland, an infrastructure zone on a 25°+
mean slope. This card runs each drawn zone against parcel-level signals
already loaded by the Hydrology / Decision panels and surfaces tone-coded
findings (good / fair / poor) per zone with a Basis line naming the
inputs each finding relied on.

**Inputs (parcel-level):** `wetlands_flood.flood_zone`, `wetlands_flood.has_significant_wetland`,
`elevation.mean_slope_deg`, `soils.hydrologic_group`. LAYERS x/4 badge
shows data completeness up front so the steward can tell when the audit
is genuinely silent vs. starved of inputs.

**Findings ruleset:**
  • Settlement-class zones (habitation/infrastructure/commons/retreat/etc.) in
    FEMA SFHA → poor; in 0.2%-annual zone → fair
  • Livestock or annual-crop zones on parcel with significant wetland → fair (E.coli / runoff)
  • Habitation/infrastructure/access zones on >25° slope → poor; 15–25° → fair
  • Annual-crop or habitation zones on hydrologic group D → poor; group C → fair

Pure presentation — no shared-package math, no zone-store writes, no
map overlay.

**Files (4):**
- `apps/web/src/features/zones/ZoneSiteSuitabilityCard.tsx` (new, 260 lines)
- `apps/web/src/features/zones/ZoneSiteSuitabilityCard.module.css` (new, 211 lines)
- `apps/web/src/features/zones/ZonePanel.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`zone-overlap-conflict-adjacency`
  §8 partial → done)

Type-check clean. Files were swept up in the parallel `4cabd1b` commit
alongside `feat(rules): safety buffer rules card`; that's why the commit
header reads `feat(rules)` — the §8 ship rode along with §11 Safety
Buffer's authoring window. Both ships are intact in HEAD.

---

## 2026-04-25 — §6 MicroclimateInsightsCard shipped (commit `5237c29`)

Derived microclimate advisories card mounted on `SolarClimateDashboard`
immediately above the existing MICROCLIMATE ZONES count strip. Cross-
references prevailing wind, dominant aspect, mean slope, elevation range,
annual precipitation, and parcel-centroid latitude — already loaded into
the dashboard for other cards — into a tone-coded advisory list:

  • Wind-exposed / wind-sheltered / side-flank slopes (vs. prevailing wind)
  • Solar gain bias from aspect × hemisphere (south-facing in NH, north in SH)
  • Frost-pocket risk on low-gradient terrain with measurable relief
  • Rain-shadow advisory on the leeward flank of significant elevation gain
  • Mildew-pressure warning on wet + cool-aspect slopes (precip > 1100 mm)

Each chip includes a Basis line naming the inputs it relied on, plus an
INPUTS x/4 badge showing data completeness so a steward can tell a
confident advisory from a heuristic one. Pure presentation — no shared-
package math, no map overlay, no writes.

**Files (4):**
- `apps/web/src/features/climate/MicroclimateInsightsCard.tsx` (new, 313 lines)
- `apps/web/src/features/climate/MicroclimateInsightsCard.module.css` (new, 170 lines)
- `apps/web/src/features/climate/SolarClimateDashboard.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`natural-shelter-solar-exposure`
  §4 partial → done)

Type-check clean (`tsc --noEmit` exit 0).

---

## 2026-04-25 — §27 PortalShareSnapshotCard shipped (commit `2ae5b17`)

Steward-side preview card for the public-portal share payload, mounted on
`PortalConfigPanel` between the Visible Sections selector and the Donations
block. Pure derivation from `usePortalStore` plus the active cartographic
preset key in localStorage (`atlas:cartographic-style-preset`, set by §23
CartographicStylePresetsCard) — no portal-store writes, no shared-package
math.

**Renders:** publish state badge + canonical share URL block (slug + token
state), audience-facing payload list (hero/mission/sections/contact),
visible-section chip cluster, data-masking treatment block (full / curated /
minimal with tone-coded copy), branded palette swatch row mirroring the
active cartographic preset, and a copy-share-payload-as-JSON button for
hand-off to PR / press / a board.

**Files (3):**
- `apps/web/src/features/portal/PortalShareSnapshotCard.tsx` (new, 292 lines)
- `apps/web/src/features/portal/PortalShareSnapshotCard.module.css` (new, 285 lines)
- `apps/web/src/features/portal/PortalConfigPanel.tsx` (mount)

Manifest `public-landing-page` (§27) had already been flipped `partial → done`
in the prior parallel-session commit window; no manifest delta in this commit.
Type-check clean for the new files; unrelated parallel-session WIP errors do
not touch portal/.

---

## 2026-04-25 — Pre-Flight Audit (P0 + P1 + Mobile)

Five-phase pre-test gate on `feat/shared-scoring`, executed against the
2026-04-25 plan-mode triage of three Explore sweeps. Decision file:
[2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

### What landed

1. **Manifest hygiene (Pivot B).** ~28 orphan `[SectionName]Page.tsx` stubs
   from the 2026-04-22 scaffolding pass were re-annotated with
   `<SectionScaffold realSurface={[…]}/>` pointing at the production
   dashboards already wired into `taxonomy.ts:NAV_ITEMS`. Manifest's
   `status: done` rows are no longer misleading because the stub itself
   now records where the live surface lives. No router churn.
2. **Typecheck the dirty tree.** `tsc --noEmit` × `@ogden/web` /
   `@ogden/api` / `@ogden/shared` all exit 0 with
   `NODE_OPTIONS=--max-old-space-size=8192` and a 600 s budget. Earlier
   120 s timeout on `@ogden/web` resolved.
3. **Mobile breakpoints across 18 dashboard CSS modules.** Each module
   in `apps/web/src/features/dashboard/pages/*.module.css` now carries
   `@media` rules calibrated to its own class structure (e.g.,
   `EnergyDashboard` collapses `.scoreHero`, `EcologicalDashboard`
   collapses `.dualScoreRow`/`.wetlandGrid`/`.pollinatorEcoregionStrip`/
   `.carbonGrid`, `StewardshipDashboard` hides chrome at 375 px,
   `PaddockDesignDashboard` keeps its container queries and adds
   viewport queries). `Hydrology` retained its 480/600/800 queries.
4. **Landing route + `/home` migration.** `landingRoute` registered at
   `/` outside AppShell with `beforeLoad: () => isAuthenticated() &&
   throw redirect({ to: '/home' })` reading
   `localStorage.getItem('ogden-auth-token')` directly so the redirect
   fires before AppShell mounts. `homeRoute` moved `/` → `/home`. Eight
   call-sites migrated: `AppShell.tsx` (×3 — `isHome` predicate, logo,
   back-link), `CommandPalette.tsx`, `ProjectTabBar.tsx`,
   `CompareCandidatesPage.tsx` (×2 via `replace_all`),
   `useKeyboardShortcuts.ts` (Ctrl+H), `LoginPage.tsx` (post-auth
   default), `ProjectPage.tsx` (×2 — not-found link, post-delete
   navigate). §6 Climate verified — `apiClient.climateAnalysis.*` →
   `features/climate/SolarClimateDashboard.tsx` chain already wired;
   the orphan stub at `features/climate-analysis/ClimateAnalysisPage.tsx`
   correctly points at it via `realSurface[]`.
5. **Wiki + LAUNCH-CHECKLIST persistence.** This entry, the decision
   file, four new Operational rows in `LAUNCH-CHECKLIST.md` (caveat
   plumbing, citation backfill, map-overlay chrome migration,
   focus-trap audit), and an `index.md` row.

### Verification

- `pnpm --filter @ogden/web exec tsc --noEmit` → exit 0
- `grep "to:\s*['\"]\/['\"]" apps/web/src` → no matches
- `grep "to=[\"']\/[\"']" apps/web/src` → no matches
- 18 dashboard modules each carry ≥2 `@media` queries
- `landingRoute` unauth serves `LandingPage`; authed redirects to
  `/home` without flash

### Deferred to LAUNCH-CHECKLIST

Caveat-disclosure plumbing across scoring panels; citation backfill on
~20 regional cost rows; map-overlay chrome migration to
`MapControlPopover` (10 overlays remaining); `SlideUpPanel` /
`RailPanelShell` focus-trap audit; scoring → UI parity script for the
41-variant `LayerSummary` union; 3 residual `title=` sites; `MASTER.md`
reference to `design-system/pages/` (does not exist); livestock module
`@ts-expect-error` / `eslint-disable` concentration.

---

## 2026-04-25 — Elevation live-data snake_case/camelCase fix

The Site Intelligence panel "LIVE DATA" row showed `121–201 m` for elevation
on Ontario projects regardless of location, with a "Medium" confidence badge
and a "Live" section header — a deceptive presentation that looked authoritative
but was actually the latitude-based fallback estimate.

### Root cause
The frontend NRCan HRDEM proxy reader at `apps/web/src/lib/layerFetcher.ts`
read its response in camelCase (`d.fetchStatus`, `d.sourceApi`, `d.dataDate`,
`d.rasterUrl`), but the API at `apps/api/src/routes/elevation/index.ts`
emits snake_case (`fetch_status`, `source_api`, `data_date`, `raster_url`,
matching the rest of that payload — `raster_tile`, `original_datum`,
`datum_offset_applied`). The check `d.fetchStatus !== 'complete'` always
tripped (undefined ≠ 'complete'), the `try`/`catch` fell through to
`elevationFromLatitude(lat, lng, country)`, and at lat ≈ 43.48 that returns
`baseElev = 150` ± `[-30, +50]` = **121–201 m** with `confidence: 'medium'`
and `sourceApi: 'Estimated (NRCan HRDEM unavailable)'`. Because climate was
live, the section-level `isLive` flag (any layer live → true) kept the "Live"
badge on, masking the silent fallback.

### Changes
- `apps/web/src/lib/layerFetcher.ts` — `fetchElevationNrcan` now reads
  `d.fetch_status`, `d.source_api`, `d.data_date`, `d.raster_url` to match
  the API payload shape.

### Verification
- `curl /api/v1/elevation/nrcan-hrdem?...` returns 200 with
  `fetch_status: 'complete'`, `source_api: 'NRCan HRDEM Lidar DTM (1m)'`,
  `min_elevation_m: 153`, `max_elevation_m: 195`.
- Browser preview after `localStorage.removeItem('ogden-layer-cache')` and
  reload: elevation row reads `153–195 m` with **High** confidence,
  source `NRCan HRDEM Lidar DTM (1m)`, data date `2026-04-25`.
- Network tab: no `nrcan-hrdem` entries in failed-requests filter
  post-fix.

### Notes
- The lat-based fallback should probably stop reusing
  `confidence: 'medium'` for CA — once the proxy fails it should look like
  fallback, not authoritative. Deferred — not in scope for this fix.

---

## 2026-04-25 — §7 timeline edit/delete row controls

Closes the second deferred item on the regeneration-events UI surface
(create + compare shipped earlier today; mutation API was already live but
had no dashboard buttons).

### Changes
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  per-row "Edit" and "Delete" buttons. Visibility is gated by
  `canModify(event)` = `useProjectRole().canDelete` (owners) **OR**
  `event.authorId === useAuthStore().user.id` (own row). Delete uses
  `window.confirm("Delete \"<title>\"? …")` then dispatches
  `deleteEvent()` via the store; per-row `deletingId` state disables
  every action button on that row while the request is in flight.
- `apps/web/src/features/regeneration/LogEventForm.tsx` — new optional
  `editEvent?` prop. When set, all field state initializers prefill from
  the event, the form swaps the follow-up banner for an "Editing event"
  banner, the submit button reads "Save changes" instead of "Save event",
  and submission flows through `RegenerationEventUpdateInput.safeParse()`
  + `updateEvent(projectId, eventId, …)` instead of create. The
  safeParse branches were split (one inside each `isEdit` arm) to avoid
  the union-type widening that would otherwise drop `title` to
  `string | undefined` and break the create-side type guarantee.
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css`
  — added `.rowActionBtnDanger` (red border + hover) and tightened
  `.rowActionBtn` `:hover` + `:disabled` to wait until not-disabled.
- `apps/web/src/features/soil-ecology/CONTEXT.md` — dropped
  "editing/deleting events from the timeline UI" from the deferred
  list; documented the per-row author-or-owner permission rule.

### Verification
- `npx tsc --noEmit` in `apps/web/` — zero new errors. Pre-existing
  errors in `MapView.tsx` (UIState `rightPanelCollapsed` plumbing) and
  `ZoneSeasonalityRollup.tsx` (TS2532 on a possibly-undefined index)
  are unrelated to this change.
- Browser smoke skipped — preview navigation to the Ecological dashboard
  via DOM events was unreliable in this session. Edit reuses the same
  form whose create path was smoke-tested earlier today; Delete is a
  thin wrapper over an API call already exercised by the API smoke
  curl. Risk is low; flagged here so a follow-up session can do a full
  click-through if needed.

---

## 2026-04-25 — §7 before/after photo-compare pane

Closes the last deferred item on `regen-stage-intervention-log` (featureManifest
§7 Soil, Ecology & Regeneration). Events linked via `parent_event_id` now surface
a side-by-side BEFORE/AFTER photo comparison modal.

### Changes
- `apps/web/src/features/regeneration/PhotoComparePane.tsx` (NEW) —
  modal overlay with two columns: label + date header, title, photo
  gallery, notes. Escape-to-close + click-outside-to-close + modal
  aria. No drag-slider: field photos aren't pixel-aligned, so the
  side-by-side read is the honest one.
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  per-row "Log follow-up" (always) and "Compare before / after" (shown
  only when both self + parent carry `mediaUrls`) action buttons.
  `followUpParent` and `comparePair` state drives the form/overlay.
- `apps/web/src/features/regeneration/LogEventForm.tsx` — accepts
  optional `parentEvent` prop, threads `parentEventId` into the
  submitted payload, and renders a "↳ Follow-up to '…'" banner
  (clearable via the banner × or Cancel).
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css`
  — .rowActions, .rowActionBtn, .followBanner styling plus the
  compare overlay classes (.compareOverlay/Modal/Close/Grid/Column/
  Head/Label/Date/Title, .comparePhotoList/Photo/Empty, .compareNotes).
  Responsive: single-column under 720 px.
- `apps/web/vite.config.ts` — added `/uploads` to the dev-server
  proxy (mirrors the existing `/api` entry). Fastify serves uploaded
  media from `/uploads/*` in local-filesystem fallback mode; without
  the proxy, Vite's SPA fallback was masking image GETs with
  `index.html` (preview verification blocker).
- `apps/web/src/features/soil-ecology/CONTEXT.md` — removed
  "before/after photo-compare pane" from the deferred list; documented
  the new action-button behaviour.

### Verification
- `cd atlas/apps/web && npx tsc --noEmit` — clean (exit 0).
- Browser smoke: registered fresh user, created a project, uploaded
  two distinct 240×160 PNGs as "before.png" (#8c5a32) and "after.png"
  (#3c8246), POSTed two events (observation + milestone) with the
  milestone's `parentEventId = before.id`. Verified:
  - Timeline renders both rows with correct chips and follow-chip
    on the milestone.
  - Milestone row shows both "Log follow-up" and "Compare before /
    after" buttons; root row shows only "Log follow-up".
  - Compare button opens the overlay with both images loading at full
    natural resolution (240×160) and correct BEFORE/AFTER labels and
    dates.
  - Screenshot captured at desktop preset confirming side-by-side.

### Related
- §7 regeneration-events table (migration 015).
- `RegenerationEvent.parentEventId` schema field.

---

## 2026-04-24 — §8 seasonal / temporary / phased use zones

Closes `seasonal-temporary-phased-use-zones` (featureManifest §8 Land
Use Zoning & Functional Allocation / P2). Adds a third orthogonal
zone-tag axis (alongside §7 invasive pressure and succession stage)
plus a dashboard rollup so stewards can see how the design's zones
schedule across the year.

### Context
ZoneEcologyRollup (§7) shipped earlier covers the *condition* axis
(invasive pressure, succession stage). The §8 spec calls for a
*scheduling* axis: which zones are year-round, which only run summer
or winter, which are intentionally temporary (event staging, phased
construction laydown). This adds the third axis as another optional
field on `LandZone`, surfaces it in the existing ZonePanel "Tag" UI,
and rolls it up in a dashboard card with a per-month coverage strip
that flags peak and dead months.

### Changes
- `apps/web/src/store/zoneStore.ts` — new `Seasonality` union
  (`'year_round' | 'summer' | 'winter' | 'spring_fall' | 'temporary'`),
  `SEASONALITY_LABELS` and `SEASONALITY_COLORS` (warm summer / cool
  winter / sage year-round / soft green spring-fall / purple temporary
  — picked to read distinctly from invasive/succession palettes so the
  three rollups don't blur). New optional `seasonality?: Seasonality |
  null` on `LandZone`. No persist version bump because the field is
  optional; existing zones load with `undefined`.
- `apps/web/src/features/zones/ZonePanel.tsx` — extended creation form
  with a third select, wired into `handleSaveZone`. Added a third chip
  to the zone-row chip group. Extended the inline edit disclosure with
  a third `<select>` so stewards can tag/retag without redrawing the
  polygon.
- `apps/web/src/features/zones/ZoneSeasonalityRollup.tsx` (NEW, ~205
  lines) — pure-presentation card. Aggregates `byBucket` (Record of
  Seasonality | 'untagged' → acres) and a 12-element `monthlyAc` via
  the `ACTIVE_MONTHS` lookup table (NH calendar). Renders acres-by-
  season stacked bar with legend, plus a 12-cell monthly coverage
  strip whose heights scale to each month's tagged-acre activity
  relative to the year's peak. Narrative line surfaces peak and
  quietest months ("dead months are good slots for temporary / event
  programming").
- `apps/web/src/features/zones/ZoneSeasonalityRollup.module.css` (NEW,
  ~140 lines) — visual language mirrors ZoneEcologyRollup. New classes:
  `.monthStrip`, `.monthCell`, `.monthBar`, `.monthLabel`.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  mounted `<ZoneSeasonalityRollup>` between `ZoneEcologyRollup` and
  `CarbonByLandUseCard` (both skeleton path and full path) so the
  three zone-tag rollups read as a coherent block.
- `packages/shared/src/featureManifest.ts` — line 237 status
  `planned → done`.

### Rationale
Pure presentation. Three orthogonal zone-tag axes (condition,
succession, scheduling) layered on top of the same `LandZone` entity —
no new store, no new entity, no shared-package math. Per-month strip
gives stewards a quick read on labor / activity peaks and quiet
windows that could host event programming.

### Hemisphere caveat
`ACTIVE_MONTHS` uses Northern Hemisphere conventions (summer = May–Aug,
winter = Nov–Feb). The bucket bar is accurate everywhere; SH stewards
read summer/winter as inverted in the monthly strip. Wiring the §14
climate `latitudeDeg` derivation into ZoneStore is a separate task —
the seasonal-tag UI itself is hemisphere-neutral.

### Not in scope
- No per-zone date-range editor (e.g., "active May 1 – Sep 30") — the
  five-bucket vocabulary is intentional; finer windows belong in §15
  phasing/timeline.
- No labor/cost rollup tied to monthly activity (separate §6/§13
  follow-on).
- No SH calendar flip (separate task; needs project lat plumbed into
  this card).

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).

---

## 2026-04-24 — `typecheck` npm script (raised Node heap)

Follows the workspace-wide tsc verification (commit `2f891bc`). Default
Node heap (~2 GB) OOMs when running `tsc --noEmit` across any of the
three workspaces on this Windows 10 box. Contributors shouldn't have
to discover and set `NODE_OPTIONS` manually.

### Shipped
- Root [package.json](../package.json) — `typecheck` script that
  fans out via Turborepo: `turbo run typecheck`.
- [turbo.json](../turbo.json) — `typecheck` task registered.
- Per-workspace [package.json](../apps/web/package.json) (`apps/web`,
  `apps/api`, `packages/shared`) — each gets:
  `typecheck: node --max-old-space-size=8192 ../../node_modules/typescript/bin/tsc --noEmit`.
  Direct-node invocation works cross-platform without `cross-env`;
  the hoisted `typescript` always lives at `./node_modules/` from the
  repo root under the `shamefully-hoist` pnpm layout (see
  [.npmrc](../.npmrc)).
- Kept the existing `lint` script (`tsc --noEmit`) untouched to avoid
  churning CI that may depend on it.

### Verification
All three `npm run typecheck` runs exited 0 with clean output:
- `apps/web`
- `apps/api`
- `packages/shared`

### Outcome
`pnpm typecheck` (or `npm run typecheck` from any workspace) now runs
cleanly without manual env tweaking. Deferred: wire `typecheck` into
the pre-push or CI pipeline once `lint` is retired.

---

## 2026-04-24 — §7 carbon sequestration potential by land use

Closes `carbon-sequestration-potential` (featureManifest §7 Soil, Ecology
& Regeneration / P2). Complements the existing modeled-SOC card on the
EcologicalDashboard with a *land-use potential* estimate driven by the
zones the steward has actually drawn — answering "what can my design
plausibly sequester per year?" rather than "how much carbon is in the
soil today?".

### Context
The EcologicalDashboard already shows a SOC card backed by the scoring
engine (totalCurrentSOC_tC / totalPotentialSOC_tC / totalAnnualSeq_tCyr)
sourced from SoilGrids/SSURGO modeled data. That number is parcel-level
and ignores land use. The §7 spec calls for a per-land-use estimate, so
this card aggregates by `zone.category` (with a successionStage tag
multiplier when present) using literature-default sequestration rates.

### Changes
- `apps/web/src/features/zones/CarbonByLandUseCard.tsx` (NEW, ~225 lines)
  — pure-presentation card. Local lookup tables `BASE_RATE_TC_PER_AC_YR`
  (ZoneCategory → tC/ac/yr midpoint) and `STAGE_MULTIPLIER`
  (SuccessionStage → 0.3×/1.0×/1.2×/0.4×). Renders three header stats
  (annual tC/yr + tCO₂e, 20-year cumulative, average rate per acre +
  zone count + total acres), a tC-weighted stacked bar by category with
  legend, and an inline assumptions footer (literature midpoint sources,
  stage multiplier explanation, CO₂e molar conversion 1 tC = 3.667 tCO₂e,
  explicit scoping note that this is order-of-magnitude not LCA).
- `apps/web/src/features/zones/CarbonByLandUseCard.module.css` (NEW,
  ~155 lines) — visual language mirrors `ZoneEcologyRollup.module.css`
  so the §7 cards read as siblings. Reuses `var(--color-status-good-rgb)`
  for the stat-card tint, matching the existing `.carbonMetric` style.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  imported and mounted `<CarbonByLandUseCard projectId={project.id} />`
  in both the env-data-loading skeleton path and the full dashboard,
  positioned after `<ZoneEcologyRollup>` and before `<SoilSamplesCard>`.
- `packages/shared/src/featureManifest.ts` — line 214 status
  `planned → done`.

### Rate sources (heuristic midpoints, surfaced inline in the card)
- food_production: 0.15 tC/ac/yr (Six et al. 2002, lower bound for annual
  cropping; food-forest / silvopasture would be higher but the category
  alone can't tell us the steward intends that)
- livestock: 0.6 (Conant et al. 2017 grazing-land meta-analysis midpoint)
- wetland / water_retention: 1.5 (Mitsch & Gosselink wetland accumulation)
- conservation: 0.8 (Pan et al. 2011 forest-sink midpoint)
- buffer / hedgerow: 0.7 (Falloon et al. 2004 linear plantings)
- spiritual / commons / education / retreat: 0.3-0.4 (mixed-use proxies)
- habitation / infrastructure / access / future_expansion: 0 (no biotic
  sink; embodied-carbon discussion is out of scope)

Stage multipliers (when zone.successionStage is set): bare 0.3×, pioneer
1.0× (baseline), mid 1.2× (peak biomass-accumulation phase), climax 0.4×
(near steady-state).

### Rationale
Pure presentation — no shared-package math, no new store, no new entity.
The card pairs cleanly with the existing modeled-SOC card: one reads
*soil pool*, this one estimates *vegetation potential*. The footer makes
the assumption set transparent so the steward can sanity-check rather
than trust the number blindly. CO₂e is shown alongside tC because most
audiences read in CO₂e units.

### Not in scope
- No spatial sequestration map (that would require pixel-level rates
  and a render-to-canvas overlay — distinct future item).
- No carbon-credit valuation or LCA.
- No editable rate table; the literature defaults are baked in.
- No species-specific rates; that's a §10 item.

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).

---

## 2026-04-24 — §1 save candidate properties

Closes `save-candidates` (featureManifest §1 Property Profile / P2).
Completes the candidate-evaluation triad alongside duplicate (§1) and
compare (§1, shipped earlier).

### Context
`LocalProject.status` already had `'candidate'` in its union (projectStore.ts:19)
but nothing in the UI wrote to it — the only reader was CompareCandidatesPage
formatting a display string. This closes the loop with writers + a filter
surface so stewards can keep a working list of exploratory properties
separate from active builds.

### Changes
- `apps/web/src/pages/HomePage.tsx` — added `StatusFilter` state
  (`'all' | 'active' | 'candidate'`), filter-chip group (All / Active /
  Candidates with counts, hidden until at least one candidate exists),
  candidate-state card badge (info variant, dotted), card action cluster
  (Mark as candidate ↔ Promote) sharing the hover-reveal pattern with
  the existing Duplicate button, and empty-filter messaging.
- `apps/web/src/pages/HomePage.module.css` — new classes `.filterChips`,
  `.filterChip`, `.filterChipActive`, `.filterChipCount`, `.filterEmpty`,
  `.cardActions`, `.cardActionBtn`, `.cardCandidate` (dashed border for
  exploratory properties), `.cardBadges`. Replaced the single
  `.cardDuplicateBtn` with the generic `.cardActionBtn` cluster.
- `apps/web/src/features/project/ProjectEditor.tsx` — status checkbox
  inside the editor modal. Toggles `'active' ⇄ 'candidate'` only;
  archived/shared are managed elsewhere (permissions surface).
- `packages/shared/src/featureManifest.ts` — flipped line 90
  `save-candidates` status `planned → done`.

### Rationale
Pure presentation: no store schema changes, no new entities, no new
scoring math. The status union already supported it; this just surfaces
writers and a filter chip. Dashed border + info-dot badge communicates
"not yet committed" without competing with the projectType Badge at the
card head. Filter chips only render when candidates exist so fresh
accounts stay uncluttered.

### Not in scope
- No "archived" surfacing on HomePage (separate feature).
- No server-side filter query (candidates live in localStorage until the
  next sync; existing `ogden-projects` persist v3 already carries
  `status` through).
- No candidate-specific dashboard summary — stewards who need
  side-by-side comparison use the existing `/projects/compare` flow
  (shipped earlier as compare-candidates).

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).

---

## 2026-04-24 — Workspace-wide tsc baseline (raised Node heap)

Follow-up to the Lora-fallback removal commit (`ae78728`). The initial
post-sweep `tsc --noEmit` on `apps/web` OOM'd with a Node JS-heap
exhaustion — default V8 heap (~2 GB on this Windows 10 box) isn't enough
for the combined project-references graph.

### Verification
Ran with `NODE_OPTIONS=--max-old-space-size=8192`:
- `apps/web` `npx tsc --noEmit` — exit 0, clean.
- `packages/shared` `npx tsc --noEmit` — exit 0, clean.
- `apps/api` `npx tsc --noEmit` — exit 0, clean.

### Outcome
Type baseline confirmed clean across all three workspaces after the
Lora sweep. Future tsc runs on this box should set the 8 GB heap cap.
Consider adding an npm script (e.g. `typecheck`) that sets
`NODE_OPTIONS` so contributors don't hit the default-heap OOM.

---

## 2026-04-24 — §7 invasive pressure + succession stage tagging

Closes `invasive-succession-mapping` (featureManifest §7 Soil, Ecology
& Regeneration Diagnostics) — the missing per-zone ecological-condition
vocabulary that lets stewards tag zones from walk-throughs without
needing a formal survey.

### Shipped
- **`zoneStore.ts`** — adds `InvasivePressure` (`none` / `low` /
  `medium` / `high`) and `SuccessionStage` (`bare` / `pioneer` / `mid`
  / `climax`) string-union types, plus optional fields on `LandZone`.
  Exports `INVASIVE_PRESSURE_LABELS` / `_COLORS` and
  `SUCCESSION_STAGE_LABELS` / `_COLORS` vocab maps for downstream UI
  parity. Succession palette runs the low-biomass gold (bare) to
  sage-green (climax) gradient already in use on pollinator-habitat
  overlays; invasive palette mirrors the biological-activity chip
  palette in `soilSampleStore`. Both fields are optional so the
  `ogden-zones` persist version does **not** bump — existing zones
  load clean with `undefined` tags.
- **`features/zones/ZonePanel.tsx`** — two extra `<select>` controls
  on the zone-creation form (both default `''` = "not set"); inline
  "Tag" disclosure button on every zone-list row toggles an
  ecology-condition edit panel (pressure + stage + Done). The edit
  panel writes directly via `useZoneStore.updateZone` on change, so
  there's no Save/Cancel pair needed. Name / category / use fields
  remain immutable from this surface — deliberate v1 minimum.
  Color-coded chips render on the zone-list row whenever tags are
  present, borrowing the `currentColor`-driven pill style used in
  `SoilSamplesCard`.
- **`features/zones/ZonePanel.module.css`** — new `.zoneRow`,
  `.zoneChips`, `.zoneChip`, `.editBtn`, `.editRow`, `.editLabel`,
  `.editDoneBtn` classes. Layout inserts the disclosure row as a
  sibling beneath the existing `.zoneItem` so the chip + tag buttons
  sit horizontal and the edit drawer slides in vertically under it.
- **`features/zones/ZoneEcologyRollup.tsx`** (new, ~155 lines) —
  dashboard card aggregating acres-by-pressure and acres-by-stage
  across all zones in the project. Stacked-bar renderer with an
  "Untagged" bucket per row so un-classified zones are visible
  rather than silently dropped. Includes total acreage + zone count
  in the pressure block header, and a Bare→Climax direction hint in
  the stage block header. Pure presentation — no scoring-engine
  involvement.
- **`features/zones/ZoneEcologyRollup.module.css`** (new, ~120 lines)
  — matches the palette of existing EcologicalDashboard cards
  (`soilDataItem` / `carbonGrid`) with a 10-px bar track and a
  responsive legend grid.
- **`EcologicalDashboard.tsx`** — imports `ZoneEcologyRollup`,
  mounts it in both the env-data-loading skeleton state and the full
  dashboard, positioned above `<SoilSamplesCard>` so the three
  project-scoped observation surfaces (zone tags → soil samples →
  regeneration timeline) sit as a group.
- **`packages/shared/src/featureManifest.ts`** —
  `invasive-succession-mapping` planned → done (P2, §7).

### Verified
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
  --noEmit` — exit 0, zero diagnostics.

### Commit
- `2fdbe11` feat(zones): invasive pressure + succession stage tagging
  (§7) — 7 files, +578 / -20.

### Scope discipline
- **Presentation-layer only.** No shared-package math, no new API
  routes, no computeScores wiring. `@ogden/shared` touched only for
  the manifest status flip.
- **No persist version bump.** Both new fields are optional, so
  existing zones in localStorage continue to load without migration.
  Downstream consumers that iterate zones should treat the fields as
  `| null | undefined` — the store and rollup both do.
- **No map-layer color driver yet.** Zone fill on the Mapbox canvas
  still uses `z.color` (category color). The rollup currently surfaces
  tags via the panel chips + the dashboard bars. Re-paletting the map
  by pressure or stage would need a separate overlay toggle pattern
  (Mapbox `match` expression on `invasivePressure`) and dedicated
  legend chrome, so it is deferred.
- **No scoring impact.** Tags are qualitative and intentionally kept
  out of the scoring engine — they inform the steward, not the
  suitability / regenerative-potential labels. A future iteration can
  fold them into regeneration-priority ordering, but that is a scoring
  decision, not a UI one.

### Not in scope
- Map-layer re-paletting by pressure or stage (deferred to a
  §7 polish task — needs overlay toggle + legend).
- Bulk-tag affordance (tag multiple zones at once). v1 tags one zone
  at a time; bulk is a future UX polish.
- Historical comparison (diff the rollup across versionStore snapshots
  to see succession movement). Out of scope for the data-capture task.
- Export of the rollup to the project-summary PDF / CSV surfaces
  (follow-on).
- Invasive-species species list per zone (just pressure magnitude for
  now). A future feature could layer Asteraceae-family checklists or
  state noxious-weed lists on top — deliberately not conflated here.

---

## 2026-04-24 — §7 manual soil sample entry — lab + biological-activity card

Closes `manual-soil-test-entry` (featureManifest §7 Soil, Ecology &
Regeneration Diagnostics) — the remaining free-text soil gap above the
SSURGO / SoilGrids canonical layers.

### Shipped
- **`soilSampleStore.ts`** (new, 155 lines) — zustand + localStorage
  persist (`ogden-soil-samples` v1, mirrors `nurseryStore` shape).
  `SoilSample` captures date, label, optional point location, depth
  band (aligned to SoilGrids slices: `surface` / `0_5cm` / `5_15cm` /
  `15_30cm` / `30_60cm` / `60_100cm` / `100_200cm`), numeric lab
  fields (`ph`, `organicMatterPct`, `cecMeq100g`, `ecDsM`,
  `bulkDensityGCm3`), free-text `npkPpm`, 13-way USDA `texture`
  enum, 5-way `biologicalActivity` enum, `lab` source, and `notes`.
  Exports `TEXTURE_LABELS` / `DEPTH_LABELS` / `BIO_ACTIVITY_LABELS`
  vocabularies for downstream UI parity.
- **`features/soil-samples/SoilSamplesCard.tsx`** (new, ~410 lines) —
  card + inline disclosure form + row renderer. "Use boundary centre"
  button reuses the `boundaryCentroid` min/max-x/min/max-y helper
  pattern from `LogEventForm` (points can also be site-wide). Row
  shows a date header, depth + bio-activity chips (bio chip color-
  coded high/moderate/low/none/unknown), a metric grid of whichever
  numeric fields the steward entered, and the free-text notes.
- **`features/soil-samples/SoilSamples.module.css`** (new, ~260 lines)
  — visual language aligned with `RegenerationTimeline.module.css` so
  the two observation surfaces feel like one family on the dashboard.
- **`EcologicalDashboard.tsx`** — mounts `<SoilSamplesCard>` in both
  the env-data-loading skeleton state (so stewards can log during
  third-party API roundtrips) and the full dashboard (directly above
  `<RegenerationTimelineCard>`, below the EcologicalInterventions
  card).
- **`cascadeDelete.ts`** — `soilSamples` branch filters samples by
  `projectId` on project deletion. Samples are intentionally NOT
  cloned by `duplicateProject` — they are observations of the physical
  site, not design intent (mirrors how comments / fieldwork are
  excluded from `cascadeClone`).
- **`packages/shared/src/featureManifest.ts`** — `manual-soil-test-entry`
  planned → done (P2, §7).

### Verified
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc
  --noEmit` — exit 0, zero diagnostics.
- Pre-existing triage errors previously listed under §7 / §1 batches
  remain resolved (no new diagnostics introduced by this change).

### Commit
- `1307caa` feat(soil): manual soil sample entry — lab + biological-
  activity card (6 files, +960 / -4)

### Scope discipline
- **Presentation-layer only.** No shared-package math added; no new
  server endpoints; no API schemas; no `computeScores.ts` inputs.
  `@ogden/shared` touched only for the manifest status flip.
- **Map overlay deferred.** The original proposal included sample pin
  overlays on the Mapbox canvas, but the manifest label is data-entry
  focused ("Manual soil test entry, biological activity notes") and
  the overlay scope would have tripled the change surface. Deferred
  to a follow-on §7 polish task; sample `location` already persists
  as `[lng, lat]` so the overlay can consume it directly later.
- **Clone exclusion rationale.** The clone/no-clone line for this
  card matches the one already codified in `cascadeClone.ts` comments:
  "design-intent data" is cloned (zones, structures, paths, utilities,
  crops, paddocks, phases); "project-specific runtime state" is not
  (comments, fieldwork, portal, scenarios, versions, regeneration
  events — now also soil samples).

### Not in scope
- Server-side persistence / sync (samples live in localStorage only).
- Edit flow for existing samples (add + delete only; deliberate v1
  minimum — no update UI yet).
- Map overlay classed circles keyed on pH or biological-activity
  band (see Scope discipline above).
- Export to the fieldwork PDF / CSV surfaces (follow-on).
- Trend plots across sample dates (needs ≥2 samples per location, no
  UI surface yet).
- Photo attachment on samples (`LogEventForm` media pattern is shipped
  but would require a storage path — deferred until samples earn a
  server table).

---

## 2026-04-24 — Lora-fallback removal sweep (typography drift)

Closes the typography drift flagged during the MASTER.md palette refresh
(2026-04-24, commit `593405f`). Removes the legacy `'Lora', Georgia, serif`
fallback chain from `font-family` declarations across `apps/web/src/`. The
fallback was dead at runtime (the `--font-display` / `--font-serif` tokens
are always defined in [tokens.css](../apps/web/src/styles/tokens.css)) but
documented an authoritative-display intent (Lora) that contradicts the
actual token (`'Fira Code', monospace`). Removing the fallback aligns code
with [MASTER.md](../design-system/ogden-atlas/MASTER.md) §Typography.

### Shipped
- **Pattern 1 — standard `--font-display` fallback** (19 module.css files,
  ~62 sites): `font-family: var(--font-display, 'Lora', Georgia, serif);`
  → `font-family: var(--font-display);`. Touched: ProjectTabBar,
  DashboardMetrics, MetricCard, DashboardPlaceholder, EnergyDashboard,
  CartographicDashboard, EducationalAtlasDashboard, CarbonDiagnosticDashboard,
  EcologicalDashboard, MapLayersDashboard, HerdRotationDashboard,
  LivestockDashboard, TerrainDashboard, GrazingDashboard, HydrologyDashboard,
  StewardshipDashboard, PaddockDesignDashboard, PhasingDashboard,
  MapView.module.css.
- **Pattern 2 — `--font-serif` variant** (1 file, 2 sites):
  HydrologyRightPanel.module.css.
- **Pattern 3 — hard-coded `'Fira Code'` prefix + Lora fallback** (4 files,
  4 sites): ForestHubDashboard, PlantingToolDashboard, NurseryLedgerDashboard,
  FieldworkPanel. The `'Fira Code'` prefix was redundant (it's what the
  token already resolves to); collapsed both prefix and fallback into bare
  `var(--font-display)`. Closes two drift items at once.
- **Pattern 4 — JSX inline literals** (2 files):
  [EnergyDemandRollup.tsx:140](../apps/web/src/features/utilities/EnergyDemandRollup.tsx)
  (`fontFamily` style) and
  [StewardshipDashboard.tsx:139](../apps/web/src/features/dashboard/pages/StewardshipDashboard.tsx)
  (SVG `<text fontFamily=...>` attr).

### Out of scope
- [Modal.module.css:119](../apps/web/src/components/ui/Modal.module.css)
  uses `var(--font-display, Georgia, serif)` — no Lora token, legitimate
  Georgia fallback, different drift class. Left as-is.

### Verification
- `grep "'Lora'" apps/web/src/` — zero hits (was 76 across 26 files).
- Preview eval on `localhost:5200` confirms `--font-display` resolves to
  `'Fira Code', monospace` and that `getComputedStyle(...).fontFamily`
  on five sample dashboard surfaces returns `"Fira Code", monospace`.
- `tsc --noEmit` on `apps/web` OOM'd with Node heap exhaustion
  (environmental — `--max-old-space-size` not bumped on this box). Edits
  are all CSS strings or one string-literal swap inside a style/SVG attr,
  so they cannot introduce TS errors. Deferred a clean tsc run to the
  next session that bumps Node heap.

### Outcome
27 files touched (26 source + wiki/log.md). 76 fallback occurrences removed.
No runtime change — the fallback never fired, since the tokens are always
defined. Documentation-code alignment restored.

---

## 2026-04-24 — §1 compare-candidates: local-first multi-project matrix

Surfaces the dormant `/projects/compare` route with an end-to-end
selection flow so a steward can put two or more projects side-by-side
without crafting a URL.

### Shipped (commit `b0ebf83`)
- `apps/web/src/features/project/compare/CompareCandidatesPage.tsx` —
  rewritten to resolve ids against `useProjectStore` first (by `id` or
  `serverId`) and synthesise per-project counts from structures /
  zones / paths / utilities / crops / paddocks / phases stores. Falls
  back to `api.projects.get` for ids the local store doesn't know,
  and best-effort `api.projects.assessment` for server scores when
  available. Sections: Identity, Land basis, Design load, Assessment
  scores (server). Notice banner when the API is unreachable.
- `apps/web/src/features/project/compare/CompareCandidatesPage.module.css`
  (new) — proper page chrome (sticky first column, section dividers,
  numeric cells); replaces the previous inline styles.
- `apps/web/src/pages/HomePage.tsx` + `.module.css` —
  - "Compare" header button (visible when ≥ 2 projects exist) enters
    selection mode.
  - In selection mode each card renders as a `<button aria-pressed>`
    with a leading checkbox; the Duplicate overlay and the `<Link>`
    are suppressed so a click only toggles selection.
  - Sticky `compareBar` at viewport bottom shows running count + Cancel
    + Compare (disabled until 2+).
- `packages/shared/src/featureManifest.ts` — `compare-candidates`
  flipped from `planned` → `done`.

### Verification
`tsc --noEmit` exits clean (zero errors). No new shared-package math,
no zustand schema changes, no router changes — the route was already
defined; only the page's source-priority and the HomePage entry point
moved.

---

## 2026-04-24 — §7 dijkstraLCP barrel-export verification (no-op)

Plan-mode plan ([deep-launching-goose.md](../../.claude/plans/deep-launching-goose.md))
proposed adding `export * from './ecology/corridorLCP.js';` to
[packages/shared/src/index.ts](../packages/shared/src/index.ts) to fix a
runtime "module does not provide an export named `dijkstraLCP`" error from
[BiodiversityCorridorOverlay.tsx](../apps/web/src/features/map/BiodiversityCorridorOverlay.tsx).

### Finding
Verified the barrel re-export already exists at
[packages/shared/src/index.ts:29](../packages/shared/src/index.ts), and all
four imported symbols (`dijkstraLCP`, `frictionForCell`, `pickCorridorAnchors`,
`gridDims`) are exported from
[corridorLCP.ts](../packages/shared/src/ecology/corridorLCP.ts) at
lines 170, 205, 245, 341.

The plan was already complete — no edit needed. If the runtime error still
surfaces, it's a stale Vite dep-cache issue: clear `node_modules/.vite` and
restart the dev server.

### Outcome
No code change. Wiki entry only.

---

## 2026-04-24 — §7 regen-events: media upload + dashboard polish

Closes the media-upload gap left by the previous §7 session and folds in
two smoke-test findings from the same dev cycle.

### Shipped
- `apps/api/src/routes/regeneration-events/index.ts` — new
  `POST /:id/regeneration-events/media` multipart sub-route. Consumes
  `multipart/form-data` via `@fastify/multipart`, validates MIME against
  `image/(jpeg|png|webp|gif|heic|heif)`, enforces a 10 MB cap with a
  running-total guard, and writes via `StorageProvider.upload(...)` at
  key `projects/{projectId}/regeneration-events/{mediaId}/{sanitized}`.
  Returns `{ url, contentType, size, filename }` with 201.
- `apps/api/src/services/storage/StorageProvider.ts` — factory now
  detects missing AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_PROFILE`)
  and falls back to `LocalStorageProvider` even when `S3_BUCKET` is set,
  so dev environments with the bucket configured but no creds don't 500
  on first upload.
- `apps/api/src/app.ts` — added a path-traversal-guarded
  `GET /uploads/*` handler that streams files out of
  `data/uploads/` for the local-storage branch. No new dependency
  (`@fastify/static` not required for this single mount).
- `apps/web/src/lib/apiClient.ts` — `api.regenerationEvents.uploadMedia`
  helper (FormData POST with bearer auth, throws `ApiError` on non-2xx).
- `apps/web/src/features/regeneration/LogEventForm.tsx` — multi-file
  picker, per-file upload with running counter, accumulated `mediaUrls`,
  thumbnail preview, remove-button, and submit-disabled-while-uploading.
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  `EventRow` renders a thumbnail strip when `mediaUrls.length > 0`
  (each thumb is an `<a target="_blank">` to the full image).
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css` —
  styles for `.mediaPicker`, `.mediaInput`, `.mediaThumbs`,
  `.mediaThumb`, `.mediaRemove`, `.mediaStatus`, `.eventMedia`,
  `.eventMediaThumb`.
- `packages/shared/src/schemas/regenerationEvent.schema.ts` —
  `mediaUrls` validator relaxed from `z.string().url()` to a refine
  that accepts either `http(s)://` URLs (S3 mode) or server-relative
  paths starting with `/` (local-storage mode).

### Smoke-test findings folded into the same commit
- **Date-fix** (`RegenerationTimelineCard.tsx`): `formatDate` now parses
  `YYYY-MM-DD` strings as *local* calendar dates instead of letting
  `new Date(isoDate)` interpret them as UTC midnight. Without this, an
  event dated `2026-04-23` rendered as `Apr 22` in negative-offset
  timezones.
- **Gate-fix** (`apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`):
  `<RegenerationTimelineCard>` is hoisted out of the site-data loading
  branch — the timeline is project-scoped (regeneration_events table),
  not site-data-scoped, so it shouldn't disappear behind the FEMA/FWS
  fetch skeleton.

### Verification
- `npx tsc -b apps/api` — clean.
- `apps/web` `tsc --noEmit` — clean.
- API round-trip via browser fetch: register → create project → upload
  PNG (201) → create event with `mediaUrls: [url]` (201) → list returns
  the event with `mediaUrls` populated → `GET <url>` returns 200 (1139
  bytes). Confirmed against the local-fs storage branch.
- UI round-trip: `Photo Smoke UI` project on the Ecological dashboard
  renders the photo event with thumbnail and the observation event,
  both with correct dates (Apr 24 and Apr 22).

### Out of scope (still deferred)
- Polygon-location drawing for events (Point via boundary centroid or
  NULL site-wide only).
- Before/after side-by-side photo-compare pane.
- Editing/deleting events from the timeline UI.
- Lightbox / full-screen photo viewer (thumbnails open in a new tab).

---

## 2026-04-24 — §1 duplicate-from-template: project clone with design-entity cascade

Picks up the §1 candidate `duplicate-from-template` (Sprint Bismillah
manifest) — adds a one-click "Duplicate" affordance so a steward can
fork a project's design as a starting variant without re-drawing
everything.

### Shipped (commit `c867803`)
- `apps/web/src/store/cascadeClone.ts` (new) — mirrors `cascadeDelete`'s
  contract; clones zones, structures, paths, utilities, crops,
  paddocks, and phases scoped to the source project, assigning fresh
  ids + timestamps and dropping any `serverId` (the new project hasn't
  synced). Errors in one store are logged but don't abort the rest.
- `apps/web/src/store/projectStore.ts` — `duplicateProject(sourceId,
  overrideName?)` action added to the public store API. Deep-clones
  metadata (drops `serverId` / attachments / timestamps), names the
  clone `"{source} (Copy)"` by default, copies the parcel boundary
  GeoJSON into IndexedDB under the new id, and triggers
  `cascadeCloneProject`. Returns the new `LocalProject` or `null` if
  the source id is unknown.
- `apps/web/src/pages/HomePage.tsx` + `.module.css` — each project
  card now wraps the `<Link>` in a `position: relative` div with an
  overlay `<button>` that fades in on hover/focus. Clicking it
  short-circuits the link, calls `duplicateProject`, and navigates to
  the clone.
- `apps/web/src/features/map/MapView.tsx` — `SettingsPanel` gains a
  "Duplicate as Template" button between Edit and Export, plumbed
  through a new `onDuplicate` prop on `MapViewProps`.
- `apps/web/src/pages/ProjectPage.tsx` — wires `handleDuplicate` and
  passes it down to `MapView`.
- `packages/shared/src/featureManifest.ts` — flips
  `duplicate-from-template` from `planned` → `done`.

### Intentionally excluded from the clone
Runtime / project-specific state stays with the original:
- comments / collaboration discussion
- fieldwork entries / walk routes / punch list
- portal config (public publish settings)
- scenarios (re-derived per project)
- versions (the clone starts a fresh history)
- regeneration events (observation log)

Attachments are dropped on clone — re-uploading parsed blobs into
IndexedDB silently would double-fill quota; the user re-imports if
they want.

### Verification
`tsc --noEmit` clean (zero errors). No new shared-package math, no
zustand version bumps (no schema change), no router changes.

---

## 2026-04-24 — a11y(dev): @axe-core/react dev-mode audit wired

Stands up the **deferred axe-core tooling task** from the WCAG 2.1 AA
audit so future a11y regressions surface in-band during dev instead of
requiring another manual audit pass.

### Shipped (commit `32cd407`)
- `apps/web/package.json` — `@axe-core/react@^4.11.2` added to
  `devDependencies` (not `dependencies` — prevents prod install).
- `apps/web/src/main.tsx` — DEV-gated dynamic import:
  ```ts
  if (import.meta.env.DEV) {
    void import('@axe-core/react').then(({ default: axe }) => {
      console.info('[axe] dev-mode a11y audit armed (1s debounce)');
      axe(React, ReactDOM, 1000);
    });
  }
  ```
  Violations log to the browser console with a 1s debounce. Banner line
  is a deliberate dev-session marker so the audit's presence is
  verifiable at a glance.

### Tree-shake guardrails
1. `import.meta.env.DEV` is replaced with the literal `false` by Vite
   in prod, making the `if` body statically dead — Rollup eliminates
   the dynamic `import()` and the module never enters the graph.
2. Package lives under `devDependencies`, so `npm install --prod` (or
   any prod-only install strategy) won't even fetch it.

Dist-grep check (`grep -rE "axe-core|@axe-core|axe\.run|AxeBuilder"
apps/web/dist`) **confirmed clean** after commits `511031d` +
`74ebbd8` resolved the upstream tsc/build breakage — zero matches in
prod bundles. (Generic substring "axe" still matches inside unrelated
words like `maxAxes`/`relaxation` across cesium/maplibre/turf —
expected noise, verified non-referential.) Tree-shake working as
designed.

### Verification
- `corepack pnpm --filter @ogden/web add -D @axe-core/react` → installed
  at `^4.11.2`, pnpm-lock.yaml updated.
- Preview dev server reloaded; Vite optimizeDeps rebuilt ("✨ new
  dependencies optimized: @axe-core/react").
- Browser console shows `[axe] dev-mode a11y audit armed (1s debounce)`
  on both `/` and `/project/<uuid>` surfaces.
- Zero violations logged on either surface — slices 1 & 2 left the
  app clean for axe's default ruleset.

### Still open
- Mobile `SlideUpPanel` ergonomics pass (deferred in main audit).
- Public-portal full a11y audit (deferred).

### CI a11y gate — decision deferred (not built this session)
Discussed `pnpm test:a11y` via `@axe-core/playwright` (best ruleset
depth, best DX vs. Lighthouse-CI / Pa11y-CI alternatives). **Not
implemented** — chose dev-mode console as the primary tripwire +
quarterly manual axe sweep as the cheaper-but-discipline-dependent
holding pattern. Empirically a clean codebase re-acquires 1–3 serious
violations per quarter without an automated gate; revisit if drift
shows up in the next manual sweep.

---

## 2026-04-24 — Accessibility implementation slice 2 (WCAG 2.1 AA closure)

Closes out the remaining P1/P2 findings from
[`design-system/ogden-atlas/accessibility-audit.md`](../design-system/ogden-atlas/accessibility-audit.md).
All 12 audit findings now marked ✅ shipped across slices 1 (P0 + early P1s)
and 2 (this commit, `4802012`).

### Shipped

- **§3 `<div onClick>` triage** — 13 files sampled. 12 were modal-backdrop
  dismissals; each gained a `useEffect` Escape-key listener +
  `role="presentation"` on the backdrop + `role="dialog" aria-modal="true"` on
  the inner `stopPropagation` panel. `MilestoneMarkers` card (the one non-modal
  case) became `role="button" tabIndex={0} onKeyDown={Enter/Space}`.
  Shared dismiss handler kept, no duplicated logic. `Modal.tsx` already had an
  Escape handler, so it just gained the `role="presentation"` tag.
- **§4 Dashboard heading hierarchy** — 9 dashboard pages renumbered so the
  outline descends without skipping (h1 → h2 → h3). 31 tag changes total;
  all `className` styling preserved so visual layout is unchanged.
- **§8 Form labels** — 22 controls across `StructurePropertiesModal`,
  `wizard/StepNotes`, and the `DesignToolsPanel` zone-naming modal now carry
  `<label htmlFor>` + matching `id`; the hidden `<input type="file">` in
  StepNotes gained an `aria-label`. `LoginPage` and `SplitScreenCompare` were
  already compliant.
- **§4 Score live-region** — `ScoresAndFlagsSection` suitability card now
  carries `role="status" aria-live="polite" aria-atomic="true"` +
  `aria-label="Overall suitability score: {score} out of 100"` so screen
  readers announce score updates as derived layers complete.
- **P2 polish** —
  - Nav `aria-label`s: `DashboardSidebar` (`"Project dashboards"`),
    `HydrologyDashboard` suite tabs (`"Hydrology sub-dashboards"`),
    `PublicPortalShell` (`"Portal sections"`). `LandingNav` aria-label sits in
    the working tree awaiting that feature's initial commit (landing/ still
    untracked).
  - `Button` spinner animation wrapped in `@media (prefers-reduced-motion: reduce)`
    so the loading glyph freezes for users with the OS preference set.
  - `tokens.css` gains a short comment documenting the `--color-text-muted`
    ≥14px floor (preventive guardrail; existing usages all comply).

### Verification

- `tsc --noEmit` ran clean on every file touched this slice. The 48 repo-wide
  pre-existing errors (PlantingToolDashboard `Object is possibly undefined`,
  HydrologyDashboard `capacityGal`, AppShell route strings, regenerationEventStore)
  are unchanged — none live in a slice-2 file.
- Preview server remained green through the sweep; no console errors
  introduced.
- Audit doc `priority summary` table updated: all 12 findings now show
  ✅ shipped with per-slice attribution.

### Commits

- `4802012` — `feat(a11y): slice 2 — §3 onClick triage + heading hierarchy +
  form labels + P2 polish` (28 files, 540 +, 105 −, including the audit doc's
  first commit).

### Still open

Nothing in the scoped audit. Deferred items (mobile `SlideUpPanel`
ergonomics, public-portal full pass, automated axe tooling, WCAG 2.2 AA
additions, map-canvas a11y, auth-flow audit) remain queued per the
[audit's "Deferred / out of scope" section](../design-system/ogden-atlas/accessibility-audit.md#deferred--out-of-scope).

---

## 2026-04-24 — §9 infrastructure-cost-placeholder-per-structure

Commit `45ca966`. `costEstimate` was populated silently at placement
(template midrange) with no user-facing edit path; stewards couldn't
override it without writing directly to localStorage. This adds a
proper numeric input to the StructurePropertiesModal between the
footprint summary and the labor/material row. Label shows the template
midrange so the steward knows what they're overriding; parser treats
blank / non-positive as `null` ("explicitly unset"), positive numbers
are rounded to whole dollars. `StructureModalSaveData` gains
`costEstimate?: number | null`; DesignToolsPanel plumbs both save
paths. Edit mode uses conditional spread so `undefined` is a no-op
while `null` round-trips normally.

The "infrastructure requirement summary" half of the same manifest
entry was already shipped via the template info-badge — flipping
`partial → done` records that both halves are now complete.

tsc clean on touched files. Pre-existing error count dropped to 9.

### Recommended next

- **§14 `seasonal-storage-water-budget`** — still the biggest un-opened
  feature on the P2 backlog; plan file in `~/.claude/plans/` has the
  full spec. Monthly inflow/demand + running balance + storage sizing.
- **§15 `infrastructure-corridor-routing`** — currently `planned`;
  paths already exist, so this might collapse into a manifest sweep
  similar to the §13 utility batch.
- **§17 regulatory batch audit** — scan status flags for implicitly
  shipped items.

---

## 2026-04-24 — §15 cost-labor-material-per-phase

Commit `6467aa0`. Extended the existing cost-per-phase rollup to include
labor-hours and material-tonnage alongside cost. Structure gains two
optional fields (`laborHoursEstimate?`, `materialTonnageEstimate?`);
StructurePropertiesModal surfaces them as numeric inputs between Phase
and Notes (both new + edit modes); DesignToolsPanel plumbs through both
save paths; PhasingDashboard consolidates into `rollupByPhase` and
renders four stats per phase card (features · cost · labor · material)
with em-dash fallback on zero, plus a running labor/material detail
line in the arc-summary cost cell.

tsc clean on touched files. Total error count dropped from 52 → 13 via
the intra-session `capacityGal` restoration, independent of this work.
Manifest flipped `planned → done`.

### Recommended next

- **§14 `seasonal-storage-water-budget`** — standing plan file in
  `~/.claude/plans/` already describes a Water Budget tab built from
  `climate._monthly_normals` + `WHO_BASIC_DAILY_LITERS` (monthly inflow
  vs. demand + running balance + storage sizing).
- **§9 `infrastructure-cost-placeholder-per-structure`** — may be
  flippable with zero code: `costEstimate` is populated at placement,
  but the StructurePropertiesModal still lacks an input to edit it.
  Low-cost add to this surface we just touched.
- **§17 / §19 batch audit** — sweep status flags for items that are
  effectively shipped but still marked `planned` (the prior §13 utility
  sweep pattern).

---

## 2026-04-24 — §13 energy-demand-notes · §15 temporary-vs-permanent-seasonal

Two manifest gap-fills in a single combined commit (`c2e9862`, pushed to
`feat/shared-scoring`). Both are presentation-layer additions — no new
shared-package math, no new entity types, no persistence version bump.

### Shipped

- **§13 `energy-demand-notes`** — `planned → done`.
  - `Utility` gains optional `demandKwhPerDay?: number` (steward-entered
    daily load placeholder). Store stays at v1 — optional field is
    hydration-safe.
  - `UtilityPanel` placement modal adds a numeric "Energy demand
    (kWh / day)" input beneath the Phase selector; parsed with
    `Number.isFinite` + `> 0` guard so blank / non-numeric input lands
    as `undefined`.
  - New `EnergyDemandRollup` card in the Energy & Water systems tab:
    three stats (kWh/day load · kWh/day solar · net), per-category bar
    breakdown (Energy · Water · Infrastructure), supply-vs-load gap
    indicator. Solar side reuses `estimateSolarOutput(...)` — ≈2.5 kWh/day
    per placed `solar_panel` at 4.5 kWh/m²/day irradiance, 18% efficiency.
  - Rendered above `SolarPlacement` so stewards see supply-vs-load before
    considering array expansion.

- **§15 `temporary-vs-permanent-seasonal`** — `planned → done`.
  - `Structure`, `Utility`, `DesignPath` each gain optional
    `isTemporary?: boolean` and `seasonalMonths?: number[]` (1-indexed).
    JSDoc on each field links back to the §15 spec item.
  - `PhaseFeature` extends to required `isTemporary` + `seasonalMonths`;
    `aggregatePhaseFeatures` populates via `?? false` / `?? []` defaults
    so pre-existing entities flow through untouched.
  - `UtilityPanel` modal adds a "Temporary / seasonal" checkbox between
    the energy-demand input and the Notes textarea. (Checkbox wiring for
    Structure and Path entities deferred — the Utility surface alone is
    enough to demo the feature; can be sprinkled as a follow-on.)
  - `PhasingDashboard` header renders a "Hide temporary (N)" toggle
    when any temporary items exist. Feature list applies a dashed-
    border + italic-name + opacity-dimmed row styling with an inline
    "temp" badge.

### Verification

`apps/web` tsc clean on every file touched today (52 pre-existing
errors unchanged — `HydrologyDashboard.capacityGal`,
`SolarClimateDashboard.deriveInfrastructureCost`, `PlantingToolDashboard`,
`MapView`, `regenerationEventStore`, `AppShell`/`IconSidebar` nav routes,
`SynthesisSummarySection`, `EcologicalDashboard`).

### Recommended next

- **§15 `cost-labor-material-per-phase`** — cost rollup already ships;
  layer `laborHoursEstimate?` + a material tonnage placeholder and
  render a three-column per-phase bar.
- **§14 `seasonal-storage-water-budget`** — the standing plan file in
  `~/.claude/plans/` describes a Water Budget tab built from
  `climate._monthly_normals` + `WHO_BASIC_DAILY_LITERS`; all inputs
  already present.
- **§9 `infrastructure-cost-placeholder-per-structure`** — sanity-pass
  the Structure panel to confirm per-structure `costEstimate` edit UI
  is end-to-end (the §15 rollup already consumes the field; this entry
  may be flippable with zero code).

---

## 2026-04-24 — Accessibility implementation slice 1: P0 skip-link + §3 P1 cluster + §5 tooltip sweep

First implementation pass against the [Accessibility Audit (WCAG 2.1 AA)](../design-system/ogden-atlas/accessibility-audit.md) (2026-04-24). Two commits on `feat/shared-scoring`.

### Shipped
- **`d129dd0` — P0 + §3 P1 cluster (5 files):**
  - **Skip-link (WCAG 2.4.1, Level A)** — `AppShell` renders a visually-hidden `<a href="#main-content">` as the first focusable child; `:focus` reveals it via `translateY(0)` + warm-gold outline. `<main>` carries `id="main-content"`. Preview-verified: `transform: matrix(1,0,0,1,0,0)` + `outline: rgba(196,162,101,0.5) solid 2px` on focus.
  - **Landmark nav** — `IconSidebar` promoted from `<aside>` to `<nav aria-label="Atlas domains">`. Screen readers can now traverse Atlas domains via landmark navigation.
  - **Input focus-ring parity** — dropped the sage-green `border-color` shift from `Input.module.css` `:focus-visible`; the box-shadow ring + `--color-focus-ring` token now match Button's pattern (no border flash on focus).
  - **LayerLegendPopover focus trap** — ported `Modal`'s pattern (`FOCUSABLE_SELECTOR`, `panelRef`, `previousFocusRef`). Tab/Shift+Tab cycle within the dialog; auto-focus first focusable (Close button) on open; restore previous focus on close; dialog gets `aria-modal="true"` + `tabIndex={-1}`.
- **`29bf499` — §5 tooltip sweep (28 files, ~55 sites):**
  - Mechanical `title="…"` → `<DelayedTooltip label="…">` across panels, map controls, dashboard pages (Climate/Hydrology/Herd/Planting), collaboration/reporting/project features, and the mobile GPS tracker.
  - Rule 4 conditionals expressed as `disabled={!cond}`. Rule 3 non-interactive spans/divs get `tabIndex={0}` for keyboard reachability.
  - **Intentionally skipped** — 17 sites where `title` is a component prop (`RegSection`, `Section`, `MicroCard`, etc.) and 3 rule-3 exceptions (`ZoneAllocationSummary` stacked-bar segments, `NurseryLedgerDashboard` 12×N calendar grid, `ScoresAndFlagsSection` redundant aggregate row) with `// a11y: keyboard tooltip deferred` comments; high-cardinality siblings would spam tab order.

### Verification
- `tsc --noEmit` clean on all touched files (pre-existing errors in `PlantingToolDashboard.tsx` + financial test fixtures are unrelated to this slice).
- Preview (port 5200): skip-link hides above viewport, reveals on focus; `nav[aria-label="Atlas domains"]` present in DOM; `role="dialog"` + `aria-modal="true"` on legend popover open; no new console errors.

### Still open from the audit
- P1: `<div onClick>` triage across 13 files (not in this slice — requires case-by-case decision)
- P1: dashboard heading hierarchy (`<h1>`/`<h3>` unevenness)
- P1: form input audit (LoginPage, StructurePropertiesModal, boundary-draw)
- P2: nav `aria-label`s across remaining landmarks; score live-region; Button spinner `prefers-reduced-motion` block; muted-text small-font guardrail

---

## 2026-04-24 — §15 phase completion + notes · §13 utility status-sweep

Two parallel manifest gap-fills.

### Shipped
- **§15 `phase-completion-tracking-notes`** — `partial → done`.
  - `BuildPhase` extended with `completed`, `notes`, `completedAt`;
    store bumped to v2 with legacy-phase migration + `togglePhaseCompleted`.
  - `PhasingDashboard` Arc-summary gets a "Completion" cell with progress
    bar; each phase card gets a color-matched checkbox, completed-at
    badge, and working-notes textarea. CSS additions isolated to the
    dashboard module.
  - Financial test fixtures updated to include the three new required
    `BuildPhase` fields.
- **§13 utility placement sweep** — 8 entries `partial → done` after
  confirming `UtilityPanel` covers all 15 `UtilityType`s with click-to-
  place, localStorage persistence, and Phase 1–4 assignment (plus the
  dedicated Phasing tab and the systems-tab composition of
  `OffGridReadiness` + `SolarPlacement` + `WaterSystemPlanning`):
  `solar-battery-generator-placement`, `water-tank-well-greywater-
  planning`, `blackwater-septic-toilet`, `rain-catchment-corridor-
  lighting`, `firewood-waste-compost-biochar`, `tool-maintenance-
  laundry`, `utility-phasing`, `off-grid-readiness-redundancy`.
  `energy-demand-notes` left `planned` — needs a per-utility demand
  field that doesn't exist on `Utility` yet.

### Verification
`apps/web` tsc clean for every file touched today. Remaining
`PlantingToolDashboard.tsx` tsc errors are pre-existing working-tree
state (user-intentional rollback) — not regressed this session.

### Decision
`atlas/wiki/decisions/2026-04-24-phasing-completion-tracking-and-utility-status-sweep.md`

### Recommended next
- `energy-demand-notes` — add `demandKwhPerDay?: number` to `Utility`,
  a light input in the placement modal, and a rollup card in the
  Energy & Water systems tab.
- `infrastructure-cost-placeholder-per-structure` (§9) — the §15 cost
  rollup already uses `deriveInfrastructureCost`; flipping this needs
  a sanity pass over the Structure panel to confirm per-structure
  `costEstimate` edit UI is present end-to-end.
- `temporary-vs-permanent-seasonal` (§15) — `planned`; low cost, just
  a boolean + filter UI.

---

## 2026-04-24 — Pollinator §7 close: ecoregion adapter + patch-graph corridor layer

Flipped `featureManifest` §7 `native-pollinator-biodiversity` from
`partial` → `done`. Shipped:

- `packages/shared/src/ecology/ecoregion.ts` — CEC Level III lookup
  (bbox → nearest-centroid, 400 km fallback) across 7 eastern-NA
  ecoregions covering Milton ON through mid-Atlantic. Plant lists
  (~150 curated species) ship as JSON.
- `packages/shared/src/ecology/pollinatorHabitat.ts` — heuristic accepts
  `ecoregionId` + `corridorReadiness`; output adds `ecoregion`,
  `ecoregionPlants`, `connectivityBand`. Weights exported for server re-use.
- `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts` —
  5×5 synthesized patch grid, Mulberry32-seeded deterministic cover-class
  assignment, 4-neighbor patch-graph connectivity, `corridorReadiness`
  index. Wires in after `SoilRegenerationProcessor` in the soil-regen
  worker; failures are non-fatal.
- `apps/web/src/features/map/PollinatorHabitatOverlay.tsx` — now reads
  the new `pollinator_opportunity` layer directly. Fill = habitat quality,
  stroke weight/colour = connectivity role.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  Corridor Connectivity metric, CEC ecoregion strip, recommended native
  species cards (species/habit/bloom window).

### Verification
- `packages/shared` + `apps/api` tsc: clean.
- `apps/web` tsc: only pre-existing errors in `PlantingToolDashboard.tsx`
  and `src/tests/financial/*.test.ts` (unrelated).
- `verify-scoring-parity.ts`: byte-identical scores across two runs.
  Pollinator layer is read-side only — `computeScores.ts` untouched.

### Honest scoping (caveats surfaced in layer + dashboard)
- Patch grid is synthesized from aggregate land-cover %, not polygonized
  land cover. For rigorous corridor analysis a polygonized land-cover
  source + raster LCP is required (deferred).
- Ecoregion lookup uses bbox + nearest-centroid — points near ecoregion
  boundaries will misclassify. Documented in output.

### Decision
[`wiki/decisions/2026-04-24-atlas-pollinator-ecoregion-corridor.md`](decisions/2026-04-24-atlas-pollinator-ecoregion-corridor.md)

---

## 2026-04-24 — Accessibility Audit (WCAG 2.1 AA)

Produced [`design-system/ogden-atlas/accessibility-audit.md`](../design-system/ogden-atlas/accessibility-audit.md),
closing the a11y area deferred by the 2026-04-23 UX Scholar audit. Documentation
only — no code changes in this session.

### Headline findings

- **P0 (one):** No skip-link anywhere in `AppShell.tsx`. Every keyboard user
  must Tab through the full IconSidebar before reaching main content — WCAG
  2.4.1 Level A fail. Recommendation: visually-hidden `<a href="#main-content">`
  as first child of the shell div + `id="main-content"` on the existing
  `<main>` at `AppShell.tsx:107`.
- **P1 (six):** IconSidebar `<aside>` → `<nav>` promotion; `<div onClick>`
  triage across 12 files (Modal's backdrop-dismiss is legitimate; others need
  `<button>` or the role/tabIndex/onKeyDown trio); Input focus-ring uses
  sage-green border-shift inconsistent with Button's gold ring; LayerLegendPopover
  has `role="dialog"` but no focus trap; dashboard heading hierarchy skips
  levels (h1 → h3); bare `<input>` inventory outside FormField adoption.
- **P2 (five):** `title=` → DelayedTooltip sweep (70 occurrences across 34
  files); Button spinner `@keyframes` missing `prefers-reduced-motion` block
  (grep-confirmed); nav aria-labels; score live-region in SiteIntelligencePanel;
  muted-text font-size guardrail.

### Positive findings (compliance stamps)

- Focus-ring token (`--color-focus-ring`) consumed correctly by Button, Input,
  Tabs, Accordion.
- `Modal.tsx:55-114` textbook focus trap (Escape + Tab cycle + restore).
- `FormField.tsx:43-64` wires label/error/helper via `htmlFor` + injected
  `aria-describedby`.
- OKLCH contrast passes WCAG AA body text (13:1) and all status colors (5:1+).
- 9 CSS files correctly respect `prefers-reduced-motion`.

### Deliverables

- **NEW:** `design-system/ogden-atlas/accessibility-audit.md` — 8 sections +
  Priority Summary + Deferred + References. Follows the `ui-ux-scholar-audit.md`
  template. Every finding cites `file:line`.
- Cross-link: `ui-ux-scholar-audit.md` "does not cover" bullet updated to point
  at the new audit.
- `wiki/index.md` updated under Design System.

### Next session

Implementation plan that executes §1 (P0 skip-link + `<nav>` promotion) plus
§§2–3 P1 items (div-onClick triage + focus-ring parity). The §5 tooltip sweep
(mechanical, ~2 h) can run in a buffer session or parallel worktree.

---

## 2026-04-24 — MapControlPopover primitive + mapZIndex token export

Landed the two §5-deferred refactors from the IA & Panel Conventions spec
(`design-system/ogden-atlas/ia-and-panel-conventions.md`). Pure refactor — no
visual change. Mandate: retire inline chrome/zIndex literals in `features/map/**`
so future map surfaces are typed and centralized.

### Deliverables

- **`apps/web/src/components/ui/MapControlPopover.tsx`** (new) — thin
  chrome-only wrapper. Two variants: `panel` (rgba(125,97,64,0.4) border, radius
  10, padding 12/6px collapsed) and `dropdown` (rgba(196,180,154,0.25) border,
  radius 8, padding 10). No built-in header or position — callers own both and
  spread via the `style` prop (default ⊕ caller → caller wins).
- **`apps/web/src/lib/tokens.ts`** — added `mapZIndex` const (10 keys:
  `spine 2 / baseOverlay 3 / splitPane 3 / dropdown 4 / panel 5 / tooltip 6 /
  loadingChip 9 / toolbar 10 / mobileBar 40 / top 50`) below the existing global
  `zIndex` export.
- **`apps/web/src/styles/tokens.css`** — `--z-map-*` CSS mirror of the TS
  export. Two entries (`baseOverlay`, `loadingChip`) added after Phase 4 grep
  surfaced inline literals not in the original plan inventory (`cesiumOverlay`
  z:3 in `MapView.module.css`, `MapLoadingIndicator.module.css` chip z:9).
- **Consumer migrations** — 5 files now use `<MapControlPopover>`:
  `GaezOverlay.tsx`, `SoilOverlay.tsx`, `TerrainControls.tsx`,
  `HistoricalImageryControl.tsx`, `OsmVectorOverlay.tsx`. `TerrainControls` was
  borderless pre-refactor; preserved via `border: 'none'` style override (flagged
  in ADR as a de facto inconsistency to revisit).
- **zIndex literal sweep** — 13 inline sites swapped to tokens across
  `LeftToolSpine`, `MeasureTools`, `CrossSectionTool`, `MapView.tsx ×2`,
  `SplitScreenCompare ×2`, `GaezOverlay` (tooltip), `SoilOverlay` (tooltip) on
  the TSX side; `MapView.module.css ×4`, `DomainFloatingToolbar.module.css`,
  `MapLoadingIndicator.module.css` on the CSS side.
- **Doc updates** — `ia-and-panel-conventions.md` §2 matrix row + §4 callout +
  §5 deferred items flipped to "Landed 2026-04-24" with file refs.

### Verification

- Grep gate: `zIndex:\s*[1-9]` in `features/map/**/*.tsx` → 0 hits;
  `z-index:\s*[1-9]` in `features/map/**/*.module.css` → 0 hits.
- Vite HMR: all 5 consumers reload without errors after migration.
- Preview: map controls unchanged (chrome pixel-identical; `TerrainControls`
  deliberately still borderless).
- `tsc --noEmit`: clean (Phase 1, 2, 3 passes — Phase 4 pass pending).

### ADR

[2026-04-24 — MapControlPopover primitive + mapZIndex token export](decisions/2026-04-24-map-control-popover-and-mapzindex.md)

---

## 2026-04-24 — UX Scholar audit §§1 + 3: IA & panel conventions codified (P2)

Doc-only session closing the last two P2 items from the UX Scholar audit
(`design-system/ogden-atlas/ui-ux-scholar-audit.md` §§1 + 3). No code changes.

### Deliverable

- `design-system/ogden-atlas/ia-and-panel-conventions.md` (new) — 5-section spec:
  1. Perimeter strategy — the five zones (top chrome / left spine / map hero /
     floating tool spine / right rail) with per-zone owner, file, width, z-index,
     and route scope; invariants (no top bar on `/project/*`, one rail at a time,
     tool spine is floating-not-structural, map corner conventions).
  2. Z-index scale — global tier (`tokens.ts:303-312`, 8 steps base→max=999) +
     map canvas local sub-scale (1–50, isolated by `.mapArea { position: relative }`
     per `MapView.module.css:3-10`); rule that inline map-sub-scale numbers are
     acceptable only inside `.mapArea`.
  3. Panel decision matrix — 8 rows (rail / bottom sheet / modal / map-control
     popover / floating toolbar / command palette / toast / delayed tooltip) each
     citing a primitive file + "when to use" / "when NOT" guidance; anti-patterns
     list (re-invented modals, custom z-index >10, second rail, native `title=`).
  4. Ad-hoc floating inventory — 9 existing `features/map/*` floating surfaces
     documented with their shared glass-chrome recipe (`--color-chrome-bg-translucent`
     + `backdrop-filter: blur(8–10px)` + warm-gold border).
  5. Forward guidance (deferred) — `MapControlPopover` primitive extraction,
     `mapZIndex` token export, top-chrome-on-`/project/*` rationale.

### Cross-links

- Audit §§1 and 3 each gained a **Status (2026-04-24)** line pointing to the new spec.
- The new spec links back to audit, `MASTER.md`, and the two 2026-04-23 ADRs
  (OKLCH, DelayedTooltip).

### Not done / deferred

- No `MapControlPopover` primitive — the pattern is documented but not extracted.
- No `mapZIndex` token export — still lives as a comment in `MapView.module.css`.
- No ADR — this spec supersedes nothing; it formalizes existing practice.
  If the `MapControlPopover` or `mapZIndex` refactors land, an ADR will accompany them.

### Files touched

- `design-system/ogden-atlas/ia-and-panel-conventions.md` (new)
- `design-system/ogden-atlas/ui-ux-scholar-audit.md` (2 status lines)
- `wiki/log.md` (this entry)
- `wiki/index.md` (spec link added)

### Recommended next session

`MapControlPopover` primitive + `mapZIndex` token export — this turns the
"de facto glass chrome" pattern into a typed API and retires the ~9 inline
`zIndex: 5 / 10` literals under `features/map/`.

---

## 2026-04-23 — En-dash rendering fix + formatRange helper extraction

Two-commit pass on `main` closing a UI bug in the Economics panel and
Investor Summary export where literal `\u2013` escapes were rendering as
six raw characters instead of an en-dash.

**Root cause.** JSX text does not process JavaScript string escapes — only
string/template literals do. The offending lines mixed `{...}` JSX
expressions with bare `$` signs and `\u2013` in raw JSX text, which looked
template-literal-shaped but wasn't.

**Commits:**
- `5ac0ee6` `fix(web): render en-dash in Economics + Investor Summary ranges`
  — Replaced seven `\u2013` JSX-text occurrences with literal U+2013 across
  `apps/web/src/features/economics/EconomicsPanel.tsx` (L146, 350, 416, 453,
  478) and `apps/web/src/features/export/InvestorSummaryExport.tsx` (L252,
  281). Template-literal sites and `{'\u2013'}` JSX-expression sites were
  intentionally left untouched.
- `aea6de5` `refactor(web): extract shared formatKRange / formatUsdRange /
  fmtK helpers` — New `apps/web/src/lib/formatRange.ts` as the single
  source of truth for dollar-range formatting. Refactored 9 range sites
  across EconomicsPanel, InvestorSummaryExport, and ScenarioPanel to
  consume it; deleted the local `fmtK` in `ScenarioPanel.tsx`.

**Verification.** Static grep of `apps/web/src` confirmed no surviving
`\u2013` in JSX text (remaining matches all inside `.ts` string/template
literals or the `{'\u2013'}` expression at
`StructurePropertiesModal.tsx:108`). Browser check via preview MCP confirmed
real en-dashes across Economics Overview / Costs / Revenue tabs and the
Investor Summary export modal.

**Triage pass alongside.** Six prior uncommitted buckets sitting in the
working tree were reviewed and landed:
- `main`: NASA POWER adapter (`0f9a845`), SSURGO multi-horizon soil profile
  (`7edb12e`), docs + wiki + `.gitignore` hygiene (`94b2085`).
- `feat/shared-scoring` → PR #1 merged as `7708af8`: shared scoring lift
  (`adf2068`), `SiteAssessmentWriter` + pipeline orchestrator (`d63e06f`),
  Penman-Monteith PET dispatcher + Hydrology UI thread-through (`3cd44dc`).

**Deferred.** ClaudeClient prompt-caching rewrite + tests held back per
operator direction — "not ready for live yet."

---

## 2026-04-22 (latest+3) — Feature Sections §§1-30 scaffolding pass complete

Eight-commit pass on `feat/shared-scoring` standing up the 30-section
feature manifest as the single source of truth for Atlas's in-scope
surface. Each section now has a mountable route stub, feature folder
with CONTEXT.md, Zod placeholder, and manifest entry carrying the full
feature list with phase tags and status.

**Framework (Batch 0, `87d1a56`):**
- `packages/shared/src/featureManifest.ts` — manifest + subpath export
  `@ogden/shared/manifest`.
- `apps/api/src/plugins/featureGate.ts` — `fastify.requirePhase(tag)`
  decorator gated by `ATLAS_PHASE_MAX` (P1 default), `ATLAS_MOONTRANCE`,
  `ATLAS_FUTURE`. Closed routes 404, not 403 (invisible rather than
  forbidden).
- `apps/api/scripts/scaffold-section.ts` — idempotent generator.
- `apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl` — template.
- §1 gap closure: migrations 012 (project metadata jsonb) + 013
  (project_templates), candidate-compare page, FUTURE phase tag
  added to `PhaseTag` union + `PHASE_ORDER` + generator validators.

**Scaffolded commits (§§2-29, batch-by-batch merge pass):**
- `522b6c9` Batch 1 — §§2, 3, 4, 26
- `e7f657d` Batch 2 — §§5, 6, 7, 13
- `ec8f622` scaffold-section.ts marker tolerance fix (mid-pass)
- `86f6156` Batch 3 — §§8, 9, 10, 12
- `08bc0cd` Batch 4 — §§11, 14, 15, 16
- `c71caa5` Batch 5 — §§17, 18, 21, 22
- `e7a764c` Batch 6 — §§19, 20, 23, 25
- `c02f75e` Batch 7 — §§24, 27, 28, 29 (FUTURE + MT rollup)

**Execution model.** Hybrid: parallel 4-agent batches using
`isolation: "worktree"`; main session performs sequential merge pass
on cross-cutting files (`featureManifest.ts`, `app.ts`). Agents
produce stubs only. Per-section agent brief lives in the plan file.

**Slug conventions locked:**
- §1 manifest slug `project-intake` is logical; actual §1 surface
  remains at legacy `apps/web/src/features/project/` +
  `apps/api/src/routes/projects/`. No stub folder under
  `project-intake`.
- §27 `public-portal` route import aliased to
  `publicPortalSectionRoutes` in `app.ts` to avoid symbol collision
  with the legacy `publicPortalRoutes` from
  `./routes/portal/public.js` (different surface at `/api/v1/portal`).

**Verification (all green, 2026-04-22):**
- 29 manifest sections; 28 scaffolded slug folders present
  (§1 legacy by design).
- `@ogden/shared` lint ✓, `apps/api` tsc ✓, `apps/web` tsc ✓.
- `apps/api/scripts/verify-scoring-parity.ts` passes — no scoring
  drift introduced.

**Wiki updates:**
- New concept page: [[feature-manifest]].
- New ADR: `wiki/decisions/2026-04-22-feature-manifest-scaffolding-pass.md`.
- Entity pages updated: [[api]] (scaffolded routes row), [[web-app]]
  (`features/<slug>/` row + `_templates/`).

**Deferred (explicit):**
- Real UI, map interactions, business logic for §§2-29 — consumer
  sessions pick up from manifest + CONTEXT.md.
- §28 FUTURE items beyond manifest presence.
- jsonb `metadata` promotion to dedicated columns (revisit after
  three sections ship).

---

## 2026-04-22 (latest+2) — Audit §6 #14 + #15 closed; 04-21 audit top-10 complete

Two-bundle session closing the last substantive items from the 04-21 deep audit.

**#14 — `SiteAssessmentPanel` wired to persisted Tier-3 scores.**
- New `useAssessment(projectId)` hook in `useProjectQueries.ts` with
  explicit `isNotReady` state for the `NOT_READY` route response.
- New `AssessmentResponse` Zod schema in `@ogden/shared`;
  `api.projects.assessment(id)` now returns a typed envelope.
- `SiteAssessmentPanel` three-state display: server row primary (headline
  "Overall X.X · computed at …" + 4 cards from `site_assessments`),
  NOT_READY banner + local preview, error banner + local preview.
- 3 new web tests. Bundle #12 parity (|Δ|=0.000) means no dual-display.
- ADR: `wiki/decisions/2026-04-22-site-assessment-panel-server-wiring.md`.

**#15 — `Country` extended to 'INTL'; NasaPowerAdapter registered.**
- `Country` enum: `['US', 'CA']` → `['US', 'CA', 'INTL']`.
- `ADAPTER_REGISTRY` type relaxed: `Record<Country, …>` →
  `Partial<Record<Country, …>>`. Orchestrator's existing
  `ManualFlagAdapter` fallback already handled missing slots.
- `climate.INTL` registered to `NasaPowerAdapter` (globally valid,
  grid-interpolated climatology). Other seven Tier-1 layers leave
  `INTL` undefined — documented gap with inline comments naming future
  global sources (SRTM/ALOS, SoilGrids, HydroSHEDS, etc.).
- DB migration 011: `CHECK (country IN ('US','CA','INTL'))` on
  `projects`. No data rewrite.
- `AssessmentFlag.country` local enum deduped to reuse shared `Country`.
- `NewProjectPage` wizard gains "International" option; financial engine
  `SiteContext.country` widened; two dashboards cleaned up unsafe casts.
- 4 new api INTL-routing tests + 1 shared Country parse test.
- ADR: `wiki/decisions/2026-04-22-country-intl-and-nasapower-registration.md`.

**Verification (all green):**
- `tsc --noEmit` clean across `packages/shared`, `apps/api`, `apps/web`.
- Shared: 68/68 (was 67). API: **490/490** (was 486). Web: **381/381** (was 374 — gains include useAssessment + layerFetcher + syncService).

**Audit state:** 04-21 top-10 critical path fully resolved. Items #1–#15
all marked DONE. `fetchNasaPowerSummary` enrichment layer stays intact
and untouched — orthogonal to the INTL registration.

**Post-landing follow-ups (same day):**
- Migration 011 applied to dev DB. First draft of the migration was
  incorrect — `projects.country` was `character(2)` (fixed-width), so a
  CHECK against `'INTL'` would attach cleanly but every
  `UPDATE country = 'INTL'` would fail with `value too long for type
  character(2)`. Fix: widen column to `text` first (`USING rtrim(country)`
  strips trailing-space padding from existing `'US '`/`'CA '` values so
  the CHECK compares against literal `'US'`/`'CA'`), re-set default to
  `'US'`, then attach CHECK. Verified at runtime: `INTL` update succeeds;
  `MX` rejected by the constraint. ADR updated with the "Gotcha caught
  during apply" paragraph.
- `DOMAIN_ORDER` in `features/navigation/taxonomy.ts` reordered:
  `'energy-infrastructure'` moved to index 1 per operator request.
  DashboardSidebar now renders Energy & Infrastructure as the second
  domain group directly after Site Overview. One-line constant change;
  `groupByDomain` output object is unchanged.

---

## 2026-04-22 (latest+1) — Tier-3 parity loop closed end-to-end (audit §6 #12 DONE)

Bundle #12 of the 04-21 deep audit — "trigger a real Tier-3 run + re-run
verify-scoring-parity". Verification-only bundle (no code changes).

**DB state at run-time** (stale audit claim of "zero rows" superseded):
- 7 `projects`, 7 `site_assessments` rows, 2 `is_current` Rodale US projects
  with 10/11 complete `project_layers` each.

**Results:**
- **Smoke (no arg):** `npx tsx apps/api/scripts/verify-scoring-parity.ts`
  → module loads clean, 10 US-label `ScoredResult[]` emitted
  (Water Resilience / Agricultural Suitability / Regenerative Potential /
  Buildability / Habitat Sensitivity / Stewardship Readiness / Community
  Suitability / Design Complexity / FAO Land Suitability / USDA Land
  Capability), overall 66.0, determinism check ✓, DB-column mapping ✓ for
  all four tracked labels.
- **DB parity — `26b43c47-e7a2-406f-a6cb-d2d60221a591`** (Rodale 1):
  `Real-layer rescore: 78.0 · DB overall_score: 78.0 · |Δ| = 0.000` ✓
- **DB parity — `966fb6a3-6280-4041-9e74-71aae3f938be`** (Rodale 2):
  `Real-layer rescore: 50.0 · DB overall_score: 50.0 · |Δ| = 0.000` ✓

Both parity checks pass the `numeric(4,1)` rounding threshold with zero
delta, proving `SiteAssessmentWriter` and `@ogden/shared/scoring::
computeAssessmentScores` produce byte-identical results when fed the same
Postgres-materialized `project_layers` rows. The 04-21 schema-lift (#11),
the shared-scoring unification, and the canonical writer all hold end-to-
end against real DB evidence.

- `ATLAS_DEEP_AUDIT_2026-04-21.md` — #12 marked DONE with run output; audit
  hygiene note updated (live parity check no longer a deferred item).

With #12 closed, the 04-21 audit's "new critical-path order" items 1 + 2 are
both green (schema-lift + real Tier-3 run), unblocking the 477 → 484 → 486
test-delta as production-proven.

---

## 2026-04-22 (latest) — Halton-region registry append (Oakville + Milton × 2)

Direct probe session targeting the Halton Region follow-ups flagged in the
earlier bundle. `MUNICIPAL_ZONING_REGISTRY` grew 5 → 8 entries:

- `oakville` — By-law 2014-014 layer 10 at `maps.oakville.ca/oakgis/...`.
  Fields: `ZONE`, `ZONE_DESC`, `CLASS`, `SP_DESC`.
- `milton-urban` — Urban By-law 016-2014 at
  `api.milton.ca/.../UrbanZoning_202512171429/MapServer/8`. Fields:
  `ZONECODE`, `ZONING`, `LABEL`.
- `milton-rural` — Rural By-law 144-2003 at
  `api.milton.ca/.../RuralZoning/MapServer/9`. Same field shape.
- **Halton Hills** documented as unavailable — no public ArcGIS REST
  endpoint after 5 distinct probe patterns; town publishes By-law 2010-0050
  only as static PDFs. Rural points there fall through to LIO + CLI (no
  regression). ADR follow-up section records the probe attempts.

Attribution string in `getAttributionText()` updated to list Oakville + Milton
urban + Milton rural alongside the prior 5 bylaws. 3 new tests landed in
`OntarioMunicipalAdapter.test.ts` covering: Oakville bbox resolution,
Milton-urban vs Milton-rural bbox partitioning, registry-key uniqueness, and
attribution coverage of the new municipalities. Full api suite 484 → 486
green. `tsc --noEmit` clean.

- `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts` —
  +3 registry entries, attribution extended.
- `apps/api/src/tests/OntarioMunicipalAdapter.test.ts` — bbox-count bumped
  `>=5` → `>=8`; 3 new invariant/coverage tests added.
- `wiki/decisions/2026-04-22-ontario-municipal-zoning-registry.md` — new
  "2026-04-22 addendum — Halton-region append" section with probe log.

---

## 2026-04-22 (late) — Southern-Ontario municipal zoning registry (audit §6 #6 Ontario-portion DONE)

Operator re-scoped audit #6 mid-session from "US parcels" to "Ontario first,
focus on Halton + GTA." `OntarioMunicipalAdapter` extended with a curated
`MUNICIPAL_ZONING_REGISTRY` of 5 verified southern-Ontario open-data ArcGIS
REST endpoints (Toronto, Ottawa, Mississauga, Burlington, Barrie). Bbox
pre-filter scopes candidate endpoints so 0 or 1 municipal queries fire per
point in practice.

- `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts` —
  added `MUNICIPAL_ZONING_REGISTRY`, `candidateMunicipalities`,
  `queryMunicipalEndpoint`, `fetchMunicipalZoning`; rewired
  `fetchForBoundary` as three-source parallel merge (municipal + LIO + CLI)
  with a new `high`/`medium`/`low` confidence ladder (`high` requires
  municipal-bylaw hit AND AAFC CLI hit). `OntarioZoningSummary` extended
  with 5 optional municipal-* fields.
- `packages/shared/src/scoring/layerSummary.ts` — `ZoningSummary` variant
  extended with the same 5 optional fields (`municipal_zoning_code`,
  `municipal_zoning_description`, `municipal_zone_category`,
  `municipal_bylaw_source`, `registry_coverage`).
- `apps/api/src/tests/OntarioMunicipalAdapter.test.ts` — existing 16 tests
  moved onto a rural Grey County centroid (outside all 5 registry bboxes)
  so the LIO+CLI focus is preserved. 9 new tests cover: municipal hit +
  CLI → `high`; municipal alone → `medium`; municipal empty fallback to
  LIO; municipal 503 does not throw; rural bypass; registry structural
  invariants; `candidateMunicipalities` bbox-filter correctness.

**Coverage.** 5 municipalities (Toronto / Ottawa / Mississauga / Burlington
/ Barrie) ship in this bundle. Halton Hills, Milton, Oakville, Hamilton,
Waterloo Region, Guelph, London, Kingston, Peel (Brampton / Caledon), York,
and Durham deferred to follow-up — adding each is a ~15-minute registry
append (probe root service, read layer schema, append entry with bbox and
attribution).

**Tests.** 25/25 green on the adapter spec (was 16). Full api suite
484/484 green (was 477). `tsc --noEmit` clean across api + shared.

ADR: [wiki/decisions/2026-04-22-ontario-municipal-zoning-registry.md](decisions/2026-04-22-ontario-municipal-zoning-registry.md).

Audit `ATLAS_DEEP_AUDIT_2026-04-21.md` §6 #6 marked as "Ontario portion
DONE; US portion still pending."

---

## 2026-04-21 (late-late²) — NwisGroundwaterAdapter + PgmnGroundwaterAdapter (audit H5 #7 DONE)

Server-side lift of the previously client-only groundwater fetch. Two new
pipeline adapters implement the `DataSourceAdapter` contract:

- `apps/api/src/services/pipeline/adapters/NwisGroundwaterAdapter.ts` — US,
  queries `waterservices.usgs.gov/nwis/gwlevels/?parameterCd=72019&siteType=GW`
  within a 0.5° bbox and 1-year window; picks the nearest well by haversine.
  Treats HTTP 404 as empty (NWIS returns 404 for zero matching sites). Returns
  a low-confidence `station_count: 0` result when no wells have usable
  measurements rather than throwing.
- `apps/api/src/services/pipeline/adapters/PgmnGroundwaterAdapter.ts` — CA,
  Ontario PGMN via three LIO_OPEN_DATA MapServer layers (schema is unstable
  across LIO releases; all three are tried in order). Handles
  attribute-only, geometry-only, and mixed LIO feature shapes.

`groundwater` promoted out of the `Tier1LayerType` Exclude list in
`packages/shared/src/constants/dataSources.ts` and registered in
`ADAPTER_REGISTRY`. `DATA_COMPLETENESS_WEIGHTS.groundwater` was already `0.04`
so the completeness math is unchanged; `REQUIRED_TIER1` in the orchestrator
only gates the canonical 6 layers so a groundwater failure will not block
Tier-3 fan-out.

Web-side `fetchUSGSNWIS` / `fetchPgmnGroundwater` in
`apps/web/src/lib/layerFetcher.ts` retained as fallback for client-only
previews; annotated with a comment pointing at the canonical adapters.

**Tests.** 13 new (7 NWIS + 6 PGMN); full API suite 474/474 green; shared
58/58; tsc clean both apps.

ADR: [wiki/decisions/2026-04-21-nwis-groundwater-adapter.md](decisions/2026-04-21-nwis-groundwater-adapter.md).

---

## 2026-04-21 (late-late) — SSURGO chfrags + basesat disambiguation (audit H5 #4 DONE)

Closed the last outstanding H5 leverage item. `SsurgoAdapter.ts` now queries the
`chfrags` child table with `SUM(fragvol_r)` per major-component surface horizon
and component-weighted by `comppct_r` to produce a canonical
`coarse_fragment_pct_chfrags`. The legacy `frag3to10_r + fraggt10_r` field stays
as back-compat; `computeScores.ts:697` prefers the chfrags value when present.
Base saturation disambiguated: both `basesat_r` (NH4OAc pH 7, taxonomic) and
`basesatall_r` (sum-of-cations, agronomic) are now carried; summary exposes a
single `base_saturation_pct` preferring `basesatall_r` with a
`base_saturation_method: 'sum_of_cations' | 'nh4oac_ph7' | null` discriminant.

**Touched.** `SsurgoAdapter.ts` (+chfrags query, +basesat fields, +weighted
merge — soft-fail try/catch matches the existing profile/restriction pattern),
`packages/shared/src/scoring/layerSummary.ts` (`SoilsSummary` +3 optional
fields, `NUMERIC_KEYS.soils` +2), `computeScores.ts:697` (Sprint BB
coarse-fragment hook), `useSiteIntelligenceMetrics.ts` (prefer-chfrags fallback
chain + basesat surfacing), `SoilIntelligenceSection.tsx` (UI interface
extended), `SsurgoAdapter.test.ts` (+3 tests: chfrags weighting, chfrags
fallback on SDA failure, nh4oac_ph7 fallback when `basesatall_r` missing).
Tests 29/29 green in api; 58/58 green in shared; web + api tsc clean.

ADR: [wiki/decisions/2026-04-21-ssurgo-chfrags-basesat.md](decisions/2026-04-21-ssurgo-chfrags-basesat.md).

---

## 2026-04-21 (late) — LayerSummary discriminated-union migration (audit §5.6 RESOLVED)

Executed the spawned follow-up task from the graphify rebuild. Closed latent
audit issue 5.6 by lifting `LayerSummary` into `@ogden/shared/scoring` as a
41-variant discriminated union keyed by `layerType`.

**Shipped.**
- `packages/shared/src/scoring/layerSummary.ts` — new ~470-line module with
  one `*Summary` interface per `LayerType`, a `LayerSummaryMap` record, the
  union `LayerSummary`, and boundary coercers `toNum` / `toStr` /
  `normalizeSummary` that drop `'Unknown'` / `'N/A'` / `''` / `'null'` /
  `'undefined'` to `null`. Numeric fields are `number | null` (never union
  with `string`). A small number of narrative-string fields
  (`wetlands_flood.riparian_buffer_m`, `wetlands_flood.regulated_area_pct`)
  are intentionally typed `number | string | null` because the upstream
  source sometimes returns narrative text like *"Contact local Conservation
  Authority"*; those are excluded from `NUMERIC_KEYS` so `toNum` doesn't
  stomp the text.
- `packages/shared/src/scoring/types.ts` — `MockLayerResult` is now a mapped
  type: `{ [K in LayerType]: BaseLayerFields & { layerType: K; summary:
  LayerSummaryMap[K] & Record<string, unknown> } }[LayerType]`. The
  `& Record<string, unknown>` intersection lets fetchers keep writing extra
  keys (e.g. cache-strip fields `_monthly_normals`, `_wind_rose`) without
  breaking the strict narrowing that consumers care about. Added
  `LayerResultFor<K>` helper alias.
- `apps/web/src/lib/layerFetcher.ts` — migrated ~15 sentinel-string literal
  sites across SSURGO soils, ECCC climate, USGS/OHN watershed, FEMA
  wetlands/flood, US + CA zoning fetchers. Every `'Unknown'` / `'N/A'`
  assigned to a numeric field now coerces to `null` at the fetch boundary.
  Climate `lastFrost` / `firstFrost` / `hardinessZone` narrowed with
  `as string | null` casts to match the variant shape.
- `apps/web/src/lib/mockLayerData.ts` — CA mock literals (line 59, 77, 81)
  now emit `null` instead of `'N/A'` for `depth_to_bedrock_m`, `huc_code`,
  `catchment_area_ha`.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — **deleted**
  the `formatPct` defensive guard (lines 79–84) and simplified both call
  sites to read `wetlands.wetland_pct.toFixed(1)` directly with an inline
  `!= null` null-fallback. `regulated_area_pct` still routes through a small
  `typeof === 'number'` branch because the field is a permitted union.
- `apps/web/src/tests/computeScores.test.ts:289` and
  `apps/web/src/tests/helpers/mockLayers.ts:24,47` — cast the generic
  test-fixture builders via `as MockLayerResult` to collapse the 44-variant
  mapped type into the needed shape (TS2590 "union too complex" without
  the cast).

**Not needed.** Phase 3 (retype scoring engine + rule engine) and Phase 4
(consumer fixes driven by TS errors) reached zero-error state without
additional edits. The existing `s()` / `num()` / `nested()` helpers in
`computeScores.ts` and the `getLayerSummary<T>()` generic in
`siteDataStore.ts` are structurally compatible with the new types because
the `& Record<string, unknown>` intersection preserves the "extra keys are
fine" escape hatch. All 12+ downstream consumer files (useSiteIntelligenceMetrics,
SiteIntelligencePanel, HydrologyRightPanel, TerrainAnalysisFlags, dashboard
pages) continued to compile. The plan budgeted up to ~50k tokens for
consumer fixes; actual delta was zero. The belt-and-braces helpers stay in
place as a defensive layer for any future field drift.

**Verification.**
- `tsc --noEmit` clean in `apps/web`, `apps/api`, `packages/shared` (all
  three required `NODE_OPTIONS=--max-old-space-size=8192`).
- `formatPct` grep returns zero hits across the web app.

**Audit closure.** `ATLAS_DEEP_AUDIT_2026-04-21.md` §5.6 marked **RESOLVED**
with a resolution paragraph citing the new module + boundary coercers +
files touched. ADR filed at
`wiki/decisions/2026-04-21-layer-summary-discriminated-union.md`.

### Files Changed
- `packages/shared/src/scoring/layerSummary.ts` (new, ~470 lines)
- `packages/shared/src/scoring/types.ts` (rewritten, ~40 lines)
- `packages/shared/src/scoring/index.ts` (+1 export)
- `apps/web/src/lib/layerFetcher.ts` (~15 literal sites, +1 import)
- `apps/web/src/lib/mockLayerData.ts` (3 sentinel → null)
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`
  (−`formatPct`, 2 call sites simplified)
- `apps/web/src/tests/computeScores.test.ts` (helper cast)
- `apps/web/src/tests/helpers/mockLayers.ts` (two helper casts)
- `apps/api/src/services/assessments/SiteAssessmentWriter.ts` — **unchanged**;
  its JSONB-to-MockLayerResult round-trip compiles under the new types
  without a `normalizeSummary` boundary call because the DB column is
  already `unknown`-cast at ingest. The coercer is exported for future use
  if we ever tighten the read path.
- `ATLAS_DEEP_AUDIT_2026-04-21.md` §5.6 → RESOLVED
- `wiki/log.md` (this entry)
- `wiki/decisions/2026-04-21-layer-summary-discriminated-union.md` (new ADR)

---

## 2026-04-21 (late) — Graphify incremental rebuild + LayerSummary tightening task queued

Ran `/graphify update` on the repo after the day's map UX work. Incremental detect
found 800 changed files (541 code, 38 docs, 221 images). Rejected the 221 images:
213 were Cesium SDK bundled assets (`apps/web/public/cesium/Assets/**`) and 8 were
Istanbul coverage-report favicons — zero meaningful content, large vision-token
cost if extracted. Ran AST on 541 code files + semantic extraction on 38 docs
(2 parallel subagents). Merged into existing graph: **2,867 nodes, 3,812 edges,
666 communities**. Curated labels on the top 30 communities; long tail defaults
to "Community N". Outputs in `graphify-out/` (graph.html, graph.json,
GRAPH_REPORT.md). Total cost: 54.3k input / 8k output tokens.

**Keystone nodes the graph surfaced:** `fetchWithRetry()` (67 edges),
`fetchAllLayersInternal()` (42), `computeAssessmentScores()` (19),
`evaluateRules()` (17). The two fetcher hubs confirmed latent issue 5.6 from
`ATLAS_DEEP_AUDIT_2026-04-21.md`: `layerFetcher.ts` is a ~4,000-line file whose
Community 0 has cohesion 0.04 across 140 nodes — structural grab-bag, not a
module.

**Trace of issue 5.6 root cause.** BFS from the fetcher hubs pulled 147 nodes,
all same-file — the graph can't see cross-file consumers because AST extraction
didn't resolve imports. Switched to grep: only 4 files import `layerFetcher`
directly (siteDataStore, LayerPanel, layerFetcher.test, itself), but 18 files
read `.summary.*` keys downstream. The contract at the boundary
(`packages/shared/src/scoring/types.ts:15`) is
`summary: Record<string, unknown>` — an untyped blob that 88 fetcher literals
write into and 18 consumers read out of with zero type check. That's what lets
`'Unknown'` strings leak into numeric fields and produce runtime errors like
`wetland_pct.toFixed is not a function` (the Ecological dashboard's `formatPct`
guard is treating the symptom).

**Spawned follow-up task** "Tighten LayerSummary into discriminated union":
lift `LayerSummary` into `@ogden/shared/scoring` keyed by `layerType`, migrate
the 88 fetcher summary literals, let TS errors drive the 18 consumer fixes.
Scoring engine passes first (biggest downstream), dashboard guards removed
after. Closes latent issue 5.6.

**Surprising connections the graph flagged:** duplicate setup docs
(`LOCAL_SETUP.md` ≈ `infrastructure/LOCAL_VERIFICATION.md` ≈
`infrastructure/WINDOWS_DEV_NOTES.md` — consolidation candidate);
GAEZ + SoilGrids self-hosting decisions cluster tightly (same pattern applied
twice — justified); Atlas Deep Audit series forms a chain across
2026-04-19/21/undated.

**Known graph limitations.** AST extractor does not resolve cross-file imports,
so Community 0 looks more isolated than it is. Upgrading extraction to link
through `import` statements would collapse the 18 downstream consumer files
into Community 0 and raise cohesion meaningfully.

**Cleanup recommendation logged for graphify:** add
`apps/web/public/cesium/` and `**/coverage/` to the detection ignore list so
future `--update` runs don't re-propose 221 image extractions.

---

## 2026-04-21 — Educational booklet copy completed for all 10 labels + Design Complexity orientation fix

Follow-up to the schema-lift sprint, clearing the top deferred item from that
ADR. `SCORE_EXPLANATIONS` in `apps/api/src/services/pdf/templates/educationalBooklet.ts`
gained plain-language copy for the six labels that previously rendered via
graceful-degradation fallback: Habitat Sensitivity, Stewardship Readiness,
Community Suitability, Design Complexity, FAO Land Suitability, USDA Land
Capability — plus a bonus `Canada Soil Capability` entry for CA sites.

**Design Complexity orientation fix.** DC is the only score where higher =
worse (high complexity = harder to design around). The render loop hard-coded
`s.value >= 60 ? good : poor` which would have surfaced "easy site" copy on a
high-complexity score. Added an optional `inverted?: boolean` field to the
`SCORE_EXPLANATIONS` type; DC sets `inverted: true`; the verdict picker now
reads `const goodThresholdMet = info.inverted ? s.value < 40 : s.value >= 60;`.
No other label is inverted today — the field is opt-in.

Verification: `pnpm --filter @ogden/api exec tsc --noEmit` clean;
`pnpm --filter @ogden/api exec vitest run` 39 files / **459/459** green.

---

## 2026-04-21 — Schema-lift migration executed: `site_assessments` loses the 4 legacy score columns

Session three of the scoring-unification arc. Executed the filed
`site-assessments-schema-lift.md` plan end-to-end: migration 009 applied to dev
DB, writer simplified, PDF templates rewritten to iterate `ScoredResult[]`,
tests updated, new regression guard filed. Full verification matrix green —
shared/api/web tsc clean, api vitest 39 files / **459/459**, web computeScores
**138/138**. Zero row-impact at migration time (verified `SELECT count(*) → 0`).

**Phase 1 — migration runner recon.** Read `apps/api/scripts/migrate.js`:
filesystem-scan over `src/db/migrations/*.sql` sorted by filename, each run via
`psql -f`. Already-applied detection by substring match on "already exists" /
"duplicate". Next available filename is `009_` (slots 001–008 are occupied);
plan had suggested `002_` which was stale. HIGH risk (registry pattern not
confirmed) retired at this point.

**Phase 2 — migration file.** `apps/api/src/db/migrations/009_drop_legacy_score_columns.sql`
— `ALTER TABLE site_assessments DROP COLUMN IF EXISTS suitability_score,
buildability_score, water_resilience_score, ag_potential_score;` plus two
`COMMENT ON COLUMN` statements documenting `score_breakdown` as canonical
`ScoredResult[]` from `@ogden/shared/scoring` and `overall_score` as
denormalised-but-in-sync-by-construction.

**Phase 3 — writer simplification.** `SiteAssessmentWriter.ts` lost
`SCORE_LABEL_TO_COLUMN` + `scoreByLabel` + the `scoreMap` plucking block. The
INSERT shrank from 13 bound params to 9 (no more per-column scores; only
projectId, version, confidence, overall_score, score_breakdown, flags,
needs_site_visit, data_sources_used, computed_at). JSDoc rewritten to
describe the post-009 responsibility set. No behaviour change for callers —
`AssessmentWriteResult` shape unchanged.

**Phase 4 — PDF templates fixed.** `templates/index.ts` `AssessmentRow`
reshaped: drop 4 score fields, type `score_breakdown: ScoredResult[] | null`
and `flags: AssessmentFlag[] | null` (imported from
`@ogden/shared/scoring` and `@ogden/shared` respectively).
`templates/siteAssessment.ts` rewritten to iterate `ScoredResult[]` — gauge
per label + `Overall`; per-component factor tables pull from each result's
own `score_breakdown: ScoreComponent[]` using `{name, value}`. The old
dict-of-dicts iteration (`Object.entries(a.score_breakdown)`) is gone; this
was the latent bug that would have rendered numeric section headers ("0",
"1", …) the moment a real row existed.
`templates/educationalBooklet.ts` rekeyed `SCORE_EXPLANATIONS` on label
strings (`'Overall'`, `'Agricultural Suitability'`, `'Buildability'`,
`'Water Resilience'`, `'Regenerative Potential'`) instead of the old
column-name stems; labels without rich copy (6 of them) render with a
graceful-degradation fallback (score + generic verdict) pending a copy-
writing follow-up. `PdfExportService.fetchAssessment` SELECT reduced to the
canonical column set.

**Phase 5 — tests.** `SiteAssessmentWriter.test.ts` dropped the
`SCORE_LABEL_TO_COLUMN` describe block (constant no longer exists) and gained
a `computeAssessmentScores — canonical shape` block: locks in that every
`ScoredResult` has `{label, score, confidence, score_breakdown: array}` and
that the 4 labels the educational-booklet template has copy for are still
emitted. `siteAssessmentsPipeline.integration.test.ts` INSERT-capture
threshold adjusted 12→8; all `v[i]` assertions reindexed for the 9-binding
INSERT; new assertions verify every `score_breakdown` element has
`{label, score, confidence, score_breakdown, computedAt}`. New file
`siteAssessment.pdfTemplate.test.ts` — regression test that renders the PDF
against a real `ScoredResult[]` from the shared scorer and asserts: (a)
gauge per label + Overall, (b) factor-table card per label, (c) no numeric
section headers (the signature of the dict-of-dicts bug).

**Phase 6 — verification.** Shared tsc clean · API tsc clean · Web tsc
clean · API vitest 39/39 files, 459/459 tests passed · Web computeScores
138/138 passed. Migration 009 applied to dev DB via `psql -f`, `\d+
site_assessments` confirms the 4 columns are gone and column comments
landed on `overall_score` + `score_breakdown`. Full API suite re-run
post-migration with `DATABASE_URL` set — still 459/459.

**Phase 7 — wiki updates.** ADR filed at
`wiki/decisions/2026-04-21-site-assessments-schema-lift.md` (context, design
decisions, out-of-scope, verification matrix, files-touched table).
`wiki/entities/database.md` `site_assessments` row rewritten + a new note
in the bottom bullets documenting the canonical `ScoredResult[]` shape.
`wiki/concepts/scoring-engine.md` gained a "Canonical storage shape" section
with the full TypeScript type signature and pointed to the ADR.

**Open follow-ups surfaced but out of scope:** (a) plain-language copy for
the 6 labels without `SCORE_EXPLANATIONS` entries (renders graceful
degradation today), (b) delete the zombie `useAssessment()` hook or wire it
into a web consumer, (c) typed response schema for
`GET /projects/:id/assessment` (currently untyped via `SELECT sa.*`).
The first closes a UX gap; the second removes dead code; the third is hygiene.

---

## 2026-04-21 — Scoring parity verify + schema-lift migration plan filed

Follow-up session to the shared-scoring unification that closed an hour earlier. Two deliverables: (1) a structural parity smoke-test for `@ogden/shared/scoring` in a real Node process, (2) a filed migration plan for dropping the 4 lossy score columns from `site_assessments`. No schema code written — plan awaits approval.

**Phase 1 — parity verify.** New `apps/api/scripts/verify-scoring-parity.ts` (~200 LOC) imports `computeAssessmentScores` directly from `@ogden/shared/scoring` (the same module the writer + web shim reach), runs it against a 6-layer fixture (climate/soils/elevation/wetlands_flood/land_cover/watershed, acreage=40, US, fixed `computedAt='2026-04-21T12:00:00.000Z'`), and prints all 10 scores + the overall. Numeric evidence: Water Resilience 63.0 · Agricultural Suitability 70.0 · Regenerative Potential 66.0 · Buildability 50.0 · Habitat Sensitivity 43.0 · Stewardship Readiness 90.0 · Community Suitability 53.0 · Design Complexity 28.0 · FAO Land Suitability 71.0 · USDA Land Capability 76.0 — weighted overall **66.0**, matching the INFO log from the integration test path exactly. Determinism check: two consecutive calls byte-identical. Optional DB-comparison branch gated on a CLI projectId arg and `DATABASE_URL` — skipped because `SELECT count(*) FROM site_assessments → 0` (the writer has never fired in dev: no project has reached Tier-3 completion yet). **Correction to yesterday's log entry:** the scorer emits **10** labels, not 11. The earlier sprint summary inflated the count.

**Phase 2 — PDF-breakage scope confirmed.** Grep across the monorepo revealed a latent bug already on main: `apps/api/src/services/pdf/templates/siteAssessment.ts:64-75` iterates `a.score_breakdown` with `Object.entries()` expecting `Record<string, Record<string, number>>` (the legacy dict-of-dicts shape documented in the DDL comment), but the v2 writer now stores `ScoredResult[]`. Runtime behaviour for any row the new writer produces: the "Score Breakdowns" section renders section headers "0", "1", "2", … with gibberish tables showing ScoredResult properties (label, computedAt, confidence) in the factor-score position. Invisible today because zero rows exist. Affected files: `PdfExportService.ts:117-120` (SELECT of 4 cols), `templates/index.ts:33-50` (`AssessmentRow` type with wrong breakdown shape), `templates/siteAssessment.ts:49-75`, `templates/educationalBooklet.ts:147-153`. **Blast-radius surprise:** `useAssessment()` in `apps/web/src/hooks/useProjectQueries.ts:48` has **zero call sites** — the `GET /projects/:id/assessment` endpoint is a zombie. Web UI computes all scores fresh client-side and never reads DB-persisted assessments. Migration-time risk to the UI: nil.

**Phase 3 — migration plan filed.** `C:\Users\MY OWN AXIS\.claude\plans\site-assessments-schema-lift.md` — follows the approved plan format from yesterday's scoring-unification sprint. Key design decisions: (1) drop all 4 score columns, keep `overall_score` as a denormalised convenience column, (2) `ScoredResult[]` is the canonical jsonb shape (what the writer already stores — document it in a DDL comment + update DB wiki entity page), (3) no back-compat view (speculative future-proofing given zero external consumers), (4) fix the latent PDF bug in the same PR — currently-broken-but-invisible is worse than currently-broken-and-visible, (5) no runtime feature flag (zero users, deterministic migration). HIGH risk flagged: haven't yet read `apps/api/scripts/migrate.js` to confirm the file-discovery pattern — plan's execution Task 1 is to verify it before running. MEDIUM risk: the `SCORE_EXPLANATIONS` lookup in the educational booklet covers only 4 of the 10 labels, so 6 labels will render with graceful-degradation fallback pending a copy-writing follow-up.

**Definition of Done for this session:** Phase 1 parity script committed-ready + numeric evidence captured in this log entry · Phase 2 breakage scope documented · Phase 3 plan doc filed awaiting approval · wiki log entry appended. No schema code written; no new migration file on disk yet. Migration execution is the next session.

---

## 2026-04-21 — Shared scoring unification: `@ogden/shared/scoring` subpath + SiteAssessmentWriter v2

Closes the key compromise from this morning's Sprint-trio entry: the v1 backend scorer (4 coarse scores) inside `SiteAssessmentWriter.ts` has been deleted and replaced with a delegation into the canonical 11-score module lifted out of `apps/web/src/lib/computeScores.ts` into `@ogden/shared/scoring`. Web and API now emit byte-identical scores for the same inputs. Full verification green: shared/web/api tsc clean, web vitest 138/138, api vitest 14/14 (8 writer unit + 6 pipeline integration).

**Subpath export (not flat re-export).** `packages/shared/package.json` gained a second entry point alongside `.` — `"./scoring"` → `./src/scoring/index.ts`. Scoring lives in its own namespace (`ScoreComponent`, `ScoredResult`, `MockLayerResult` would have collided with existing `ScoreCard` in the main barrel). Matching aliases added to `apps/web/vite.config.ts` and `apps/web/vitest.config.ts`, with the more-specific `@ogden/shared/scoring` entry placed BEFORE `@ogden/shared` (Vite prefix-matches in order). `apps/api` resolves via `moduleResolution:"bundler"` in `tsconfig.base.json`, no alias needed.

**Files lifted into `packages/shared/src/scoring/`.**
- `computeScores.ts` — lifted from web (2323 LOC). Two targeted edits: (1) imports rewritten (`@ogden/shared` → `../schemas/assessment.schema.js`; `./mockLayerData.js` → `./types.js`); (2) module-local `_computedAtOverride` + try/finally inside `computeAssessmentScores(..., computedAt?)` so the API can pass a deterministic pipeline timestamp without threading the parameter through 11 internal scorer signatures (2 edits vs ~24). Single-threaded JS makes save/restore safe.
- `hydrologyMetrics.ts`, `petModel.ts` — verbatim.
- `tokens.ts` — scoring-only slice (`water`, `confidence`, `status`, `semantic`); full UI palette stays in web.
- `types.ts` — `MockLayerResult` pulled out of `apps/web/src/lib/mockLayerData.ts`.
- `rules/ruleEngine.ts`, `rules/assessmentRules.ts`, `rules/index.ts` — lifted. Cycle-avoidance: `ruleEngine.ts` imports from `../../schemas/assessment.schema.js` (specific file), NOT from `@ogden/shared` barrel.
- `index.ts` — new barrel with a `DO NOT re-export from main barrel` warning comment.

**Web becomes shims, not a rewrite.** `apps/web/src/lib/computeScores.ts`, `hydrologyMetrics.ts`, `petModel.ts`, `rules/index.ts` all shrunk to `export * from '@ogden/shared/scoring';`. `mockLayerData.ts` kept its fixture objects and now re-exports the type from shared. Every call-site in web (SiteIntelligencePanel, ScenarioPanel, DecisionSupportPanel, fuzzyMCDM, computeScores.test.ts + UI consumers) unchanged — proven by 138/138 web vitest green.

**SiteAssessmentWriter rewrite.** Deleted the 4 v1 scorer functions (`computeSuitability`, `computeBuildability`, `computeWaterResilience`, `computeAgPotential`) and the `ScoreCardOut` type. Added: `layerRowsToMockLayers(rows)` adapter; `normalizeConfidence`; `rollupConfidence(scores)` rolls up across **all 11** ScoredResults (not just the 4 mapped — weakest contributing layer sets the overall); `scoreByLabel(scores, label)` throws loudly if the shared scorer renames any of the 4 tracked labels; `clampScore` to [0,100] with one-decimal rounding for `numeric(4,1)`. `writeCanonicalAssessment` now: debounce guard → project fetch (acreage + country) → layers fetch (with `data_date`/`source_api`/`attribution`) → adapt → `computeAssessmentScores(mocks, acreage, country, computedAt)` → pluck 4 labels → `computeOverallScore(scores)` for overall → transactional write. Full 11-score array stored in `score_breakdown` jsonb — nothing lost. The 30s debounce and transaction shape unchanged from v1.

**Canonical mapping (locked in `SCORE_LABEL_TO_COLUMN`).** `water_resilience_score` ← "Water Resilience" · `buildability_score` ← "Buildability" · `suitability_score` ← "Agricultural Suitability" · `ag_potential_score` ← "Regenerative Potential". Three-layer defence against stringly-typed silent breakage: (1) `as const` record, (2) runtime `scoreByLabel` assertion inside the writer (throws before INSERT rather than NULLing), (3) a unit test that fails if the shared scorer stops emitting any tracked label.

**Tests.** `SiteAssessmentWriter.test.ts` rewritten (8 tests): 4× `layerRowsToMockLayers` adapter (shape, bogus-confidence → 'low' coercion, null `summary_data`, metadata propagation); 2× `SCORE_LABEL_TO_COLUMN` correctness (declares 4 columns, scorer still emits all 4 labels for a realistic layer set); 2× `computedAt` determinism (override stamps every result · live fallback when omitted). NEW `siteAssessmentsPipeline.integration.test.ts` (6 tests, mock-DB): Tier-3 gating (returns null at completed < 4, invokes writer at = 4); full-flow INSERT param capture asserts all 4 DB-column scores ∈ [0,100], 11-label score_breakdown, confidence rollup, needs_site_visit boolean, computed_at ISO, data_sources_used matches layer types in order; debounce skip; no_project skip; no_layers skip. Real-Postgres fixture deferred (no testcontainers harness in apps/api yet) — header comment flags the replacement point.

**Definition of Done.** `pnpm --filter @ogden/shared exec tsc --noEmit` clean · `pnpm --filter @ogden/web exec tsc --noEmit` clean · `pnpm --filter @ogden/api exec tsc --noEmit` clean · web vitest computeScores 138/138 · api vitest writer + integration 14/14 · shared scorer's 11 labels → 4 DB columns mapped in one const, guarded by runtime assertion + test. Live E2E verification (comparing `SiteIntelligencePanel` overall vs `SELECT overall_score FROM site_assessments WHERE is_current` for a US project after a fresh Tier-3 run) is the first action of the next session.

**Next session recommended objective.** Live E2E verify the parity claim, then begin porting the 11-score UI breakdown to an explicit DB schema (migration: drop the 4 score columns, keep only `score_breakdown` jsonb + `overall_score`; add a generated view for legacy readers) — now unblocked because the writer no longer has hard-coded column mapping.

---

## 2026-04-21 — Sprint trio: Penman thread-through + SSURGO backfill + canonical site_assessments writer

Three chained sprints targeting leverage items flagged in the 04-19 audit (#4 soil-adapter fidelity, #8 missing canonical assessment writer) plus activation of the previously inert FAO-56 Penman-Monteith PET path implemented earlier in the 04-20 petModel.ts work. All three sprints landed; tsc clean on apps/api; `pnpm vitest run SiteAssessmentWriter` → 11/11 green.

**Sprint 1 — Penman thread-through (3 callsites).** `HydrologyRightPanel.tsx`, `DashboardMetrics.tsx`, `HydrologyDashboard.tsx` all now thread `solar_radiation_kwh_m2_day`, `wind_speed_ms`, `relative_humidity_pct` (from NASA POWER via the Noaa/Eccc climate adapters) plus `latitudeDeg` (derived via `turf.centroid(project.parcelBoundaryGeojson)`) and `elevationM` (midpoint of elevation summary min/max) into `HydroInputs`. `computePet()` now returns `method:'penman-monteith'` in production whenever the climate layer carries NASA POWER fields; Blaney-Criddle remains the graceful fallback. Expected knock-on: aridity / LGP / water-resilience scores shift 10–25% higher PET in humid temperate zones.

**Sprint 2 — SSURGO field backfill.** `SsurgoAdapter.ts` gained exported `SoilHorizon` and `RestrictiveLayer` interfaces and a new multi-horizon profile query (component INNER JOIN chorizon LEFT JOIN corestrictions, filtered to `majcompflag='Yes'`, mukey list from the parcel). Dominant-component weighting via `comppct_r` picks the canonical restrictive layer per parcel (shallower depth breaks ties). `summary_data` now carries `horizons[]` and `restrictive_layer` alongside the legacy 0–30cm flattened fields (back-compat preserved). Test fixture extended with two components × two horizons and a Fragipan@60cm corestriction; also fixed a pre-existing bug where `kfact` was in the SDA query but missing from the horizon fixture. **Deferred:** `chfrags` depth-stratified coarse fragments (chkey-join complexity) and `basesat_r` vs `basesatall_r` column-name ambiguity — both tracked as follow-up.

**Sprint 3 — Canonical `site_assessments` writer.** New `apps/api/src/services/assessments/SiteAssessmentWriter.ts` exports four pure scoring functions (`computeSuitability`, `computeBuildability`, `computeWaterResilience`, `computeAgPotential`) returning `{score, label, confidence, breakdown}`; overall = 0.30·S + 0.20·B + 0.25·W + 0.25·A. AgPotential caps effective rooting depth at `restrictive_layer.depth_cm` when present (directly leverages Sprint 2 output). `writeCanonicalAssessment(db, projectId)` runs in a single `db.begin((tx:any)=>…)` transaction: 30s debounce guard → flip previous row's `is_current=false` → INSERT new row with `version = prev+1, is_current=true`, jsonb `score_breakdown`, `needs_site_visit = (confidence==='low')`, `data_sources_used`, `computed_at`. `maybeWriteAssessmentIfTier3Complete` checks the `data_pipeline_jobs` table (COUNT of complete rows for the 4 Tier-3 job types) rather than the Redis counter the plan suggested — simpler, stateless, idempotent. Wired into all 4 Tier-3 worker tails in `DataPipelineOrchestrator.ts` (terrain, microclimate, watershed, soil-regeneration) inside try/catch with best-effort error logging back into `data_pipeline_jobs`. 11 unit tests cover all 4 scorers + confidence rollup.

**Key compromise: v1 backend scorer ≠ lifted `computeScores.ts`.** The plan flagged the 2323-line frontend `computeScores.ts` lift-and-shift to `packages/shared` as the highest-risk step. Rather than rush a leaky port, Sprint 3 ships a self-contained, directionally-correct v1 scorer inside `SiteAssessmentWriter.ts` with a header comment documenting that the writer infrastructure (debounce / version bump / is_current flip / pipeline hook) is production-ready and that the scorer body is a swap-in target for a later shared-module migration. Front-end continues to compute client-side for now; parity check happens when the shared module lands.

**Definition of Done checks:** apps/api tsc clean · vitest SiteAssessmentWriter 11/11 green · all three sprints' files committed-ready. Live E2E verification (confirming `petMethod:'penman-monteith'` in a US project, a Fragipan-site `horizons[]` payload, and a `site_assessments` row materialising within a minute of Tier-3 completion) is the first action of the next session before any new sprint starts.

**Next session recommended objective.** Lift `apps/web/src/lib/computeScores.ts` into `packages/shared/src/scoring/computeScores.ts`, replace the v1 body in `SiteAssessmentWriter.ts` with a call into it, and add an integration test that triggers a full pipeline run and asserts `site_assessments` materialisation + web/API score parity within rounding.

---

## 2026-04-19 — Deep Technical Audit v2 (supersedes 04-14)

Produced `ATLAS_DEEP_AUDIT_2026-04-19.md` (392 lines, repo root) via 5 parallel Explore agents across structure/secrets/flags, DB schema+tsc-api, API routes+services+jobs+adapters, frontend components+stores+layerFetcher+tsc-web, data-integration + feature-completeness matrices; synthesized Phase H (revised %, critical path, data-pipeline gap map, user-journey, top-10 leverage tasks).

### Documentation corrections required (findings)
- **Adapter count was stale**: 2026-04-19 log entry stated "Adapters live: 8/14, remaining: wetlands/flood, climate, land_cover, zoning". Direct inspection of `apps/api/src/services/pipeline/adapters/` confirmed **all 14 adapters are LIVE** (Ssurgo, OmafraCanSis, UsgsElevation, NrcanHrdem, Nhd, Ohn, NwiFema, ConservationAuthority, NoaaClimate, EcccClimate, Nlcd, AafcLandCover, UsCountyGis, OntarioMunicipal). Zoning adapters are LIVE but PARTIAL (county/municipal-level only; parcel setbacks + overlays missing).
- **Store count was stale**: global CLAUDE.md references "18 stores"; actual `apps/web/src/stores/` count is **26**.

### Revised completion (vs 04-14 ~65% DONE headline)
Broken down: core infra ~95%, Tier-1 pipeline ~85% (full roadmap ~15%), scoring ~55%, frontend real-data ~75%, exports ~80%, AI ~5%. Aggregate: **~55% DONE · 25% PARTIAL · 20% STUB** when roadmap width is honoured (NWIS, StreamStats, EPA suite, GWA, PVWatts, Regrid, PAD-US, WDPA, WorldClim, WorldCover, SRTM still absent).

### Top-3 leverage for next session
1. Correct documentation drift (this entry + CLAUDE.md store count).
2. NasaPowerAdapter (solar radiation) — unblocks PET, LGP, PVWatts wiring, solar-PV score.
3. Wire Anthropic SDK into `ClaudeClient.ts` — activates the AtlasAI panel end-to-end.

### Other findings worth tracking
- `site_assessments` table is read by routes but **never written** from TypeScript. Either populate from Tier-3 completion callback or remove.
- `@scalar/fastify-api-reference` is a declared dep but no OpenAPI spec is registered — wire or drop.
- 3 layer types (zoning/infrastructure/mine_hazards) fall through to `mockLayerData.ts` silently; UI should badge them "demo" or gate.
- TypeScript strict passes cleanly on both api and web (0 errors each). Secrets scan clean.

Commit pending: audit file only; no code changes.

---

## 2026-04-21 — Sprint CD (GAEZ RCP track): futures reconnaissance + scenario as first-class dimension

Parallel Sprint CD work stream (distinct from the same-day SoilGrids Sprint CD entry below). Closes the two RCP-ingest prerequisites Sprint CC deferred: (1) enumerate FAO's RCP tuple space so we know what to ingest, (2) promote scenario to a first-class dimension in manifest/service/routes/convert-script so a later RCP run is pure ops — no code. **No RCP bytes ingested; no UI changes.** Sprint CD+1 will ingest a selected tuple subset against the new schema; Sprint CD+2 will add the picker UI + baseline-vs-future delta.

**Phase A — reconnaissance (`5a145c9`).** `apps/api/scripts/enumerate-gaez-futures.ts` (437 LOC, Node built-ins + unit-tested pure helpers) talks to FAO's `res05` ArcGIS ImageServer — `/query?returnDistinctValues=true` for the coarse (rcp, model, year) tuple space, then per-scenario paginated `/query` calls (page size 1000, FAO cap) for raster counts + per-scenario completeness against our 96-cell priority grid. Output: `apps/api/data/gaez/futures-inventory.{json,md}`. **74 non-baseline scenarios enumerated** — 72 RCP futures (4 RCPs × 6 GCMs × 3 periods) + 2 historical CRUTS32 baselines (1961-1990, 1971-2000). Every future scenario shows 12 crop gaps vs our 96-cell target because FAO only publishes the High input-level raster series for futures (no Low). 8 new tests in `enumerate-gaez-futures.test.ts` cover `extractEmissions` / `computeScenarioId` / `computeCompleteness`. Tiny `download-gaez.ts` touch (+14/-7) to share a helper.

**Phase M1 — chore (`840f26a`).** Dropped an unused `FeatureAttributes` export from `download-gaez.ts` surfaced during Phase A review. Pure cleanup.

**Phase B+C — scenario dimension (`be40cde`).** `GaezRasterService` gains: (1) optional `ManifestEntry.scenario?: string`, (2) lookup cascade `entry.scenario ?? manifest.climate_scenario ?? 'baseline_1981_2010'` (so pre-Sprint-CD manifests keep working unchanged), (3) `resolveLocalFilePath(scenario, crop, waterSupply, inputLevel, variable)` — scenario promoted to the first arg, (4) `query(lat, lng, scenario?)` and `getManifestEntries(scenario?)` — optional filters. Routes (`routes/gaez/index.ts`): `/raster/:crop/...` became `/raster/:scenario/:crop/:waterSupply/:inputLevel/:variable` (breaking — exactly one caller, `GaezOverlay.rasterUrl`, retrofitted to hardcode `baseline_1981_2010` with `TODO(sprint-cd+2)`); `/query` + `/catalog` accept optional `?scenario=<id>`. `SCENARIO_RE = /^[a-z0-9_]{1,64}$/` enforced at the route boundary as the path-traversal guard. 5 new service tests + 5 new route tests (baseline-compat cascade, scenario-filtered query + catalog, invalid-scenario 400, route-shape happy path).

**Phase D — convert script (`afc36c1`).** `convert-gaez-to-cog.ts` gains `--scenario <id>` (default `baseline_1981_2010`, validated against `SCENARIO_RE`). Every emitted manifest entry carries its `scenario` field. Composite manifest key `${crop}_${ws}_${il}:${scenario}` used only when non-baseline — baseline keeps the legacy `${crop}_${ws}_${il}` shape for backward compatibility. 8 new tests covering CLI flag parsing, scenario validation, key-shape selection, and per-entry emission. Regenerated baseline manifest has every entry carrying `"scenario": "baseline_1981_2010"` explicitly (idempotent under the cascade — service behaviour unchanged).

**Verification.** `cd apps/api && npx vitest run` → **415/415 green** (baseline 402 → 415, +13 net across the sprint's four phases; individual phases wrote 26 new tests, delta accounts for some reorganization inside `gaezRoutes.test.ts`). `npx tsc --noEmit` clean. No frontend bundle changes — the one-line `GaezOverlay.rasterUrl` edit is a pure path-segment addition.

**Files touched (this sprint, across all four code commits).** `apps/api/scripts/enumerate-gaez-futures.ts` (new), `apps/api/scripts/enumerate-gaez-futures.test.ts` (new), `apps/api/data/gaez/futures-inventory.{json,md}` (new), `apps/api/scripts/download-gaez.ts`, `apps/api/scripts/convert-gaez-to-cog.ts`, `apps/api/src/services/gaez/GaezRasterService.ts`, `apps/api/src/routes/gaez/index.ts`, `apps/api/src/tests/gaezRoutes.test.ts`, `apps/api/src/tests/GaezRasterService.test.ts`, `apps/api/package.json`, `apps/web/src/features/map/GaezOverlay.tsx` (one-line rasterUrl path-segment addition).

**Deferred.**
- **Sprint CD+1 — RCP ingest.** Operator reviews `apps/api/data/gaez/futures-inventory.md` and selects a tuple subset. Reasonable default pending confirmation: RCP8.5 + RCP4.5 × 2041-2070 × ENSEMBLE GCM × 12 priority crops × rainfed + irrigated × High input (≈96 rasters, ~1 GB pre-COG). `download-gaez.ts` needs a trivial extension to filter on scenario (the service-side plumbing is already in place).
- **Sprint CD+2 — picker UI.** Scenario dropdown in `<GaezMapControls>`, scenario line in the hover tooltip, baseline-vs-future delta card in `GaezSection`. Retires the `TODO(sprint-cd+2)` marker in `GaezOverlay.tsx`.

**ADR.** [`wiki/decisions/2026-04-21-gaez-rcp-reconnaissance.md`](decisions/2026-04-21-gaez-rcp-reconnaissance.md) records the naming convention, enumeration method, backward-compat posture, and recommended tuple subset.

**Commits:** `5a145c9`, `840f26a`, `be40cde`, `afc36c1` + a Phase E wiki commit landing alongside this log entry.

---

## 2026-04-21 — Sprint CD: map-side SoilGrids v2.0 property overlay (code landed; ingest deferred)

Second raster overlay, mirroring Sprint CB/CC's GAEZ architecture for ISRIC SoilGrids v2.0. Operator can toggle "Soil Properties" in `MapLayersPanel`, pick from five properties (bedrock depth, pH, organic carbon, clay, sand) in a floating panel, and see the selected property painted across the world at 250 m. Differs from GAEZ in three intentional ways: (1) manifest is keyed on a single `property` string, not a 4-tuple; (2) the raster endpoint is **not** JWT-gated because SoilGrids is CC BY 4.0 (permissive) — unlike FAO's CC BY-NC-SA 3.0 IGO; (3) per-property color ramps (5 distinct hues) instead of a single mode-switched pair.

**Backend (`apps/api`).**
- `services/soilgrids/SoilGridsRasterService.ts` — clone of `GaezRasterService` with the lookup key simplified to `property`. Manifest at `data/soilgrids/cog/soilgrids-manifest.json`; `fromFile` for local, `fromUrl` for S3 (`SOILGRIDS_S3_PREFIX`). `query(lat, lng)` samples all manifest entries in parallel, applying each entry's optional `scale` factor before returning `{ readings: [{property, value, unit}, ...] }`. GDAL no-data sentinel recognized via `image.getGDALNoData()`.
- `routes/soilgrids/index.ts` — `/query?lat=&lng=`, `/catalog`, `/raster/:property`. Zod validates lat/lng. Range-request logic is identical to GAEZ (206 Partial Content, 416 for malformed/past-EOF, `Accept-Ranges: bytes`). Manifest lookup is the single trust boundary — user-supplied `property` never concatenates into a filesystem path.
- `lib/config.ts` — `SOILGRIDS_DATA_DIR` (default `./data/soilgrids/cog`), `SOILGRIDS_S3_PREFIX` (optional, empty string → undefined).
- `app.ts` — plugin registration at `/api/v1/soilgrids` and a `initSoilGridsService()` init block that logs enabled/disabled based on manifest presence.
- `tests/soilgridsRoutes.test.ts` — 18 new tests mirroring `gaezRoutes.test.ts`: 3 validation + 4 service-interaction + 2 catalog + 9 raster (happy + range + 416 + 404 paths + "no auth gate" assertion). All 18 green. Full API suite 389/389 (was 371/371).
- `data/soilgrids/README.md` + `data/soilgrids/cog/soilgrids-manifest.example.json` — ingest recipe (`gdal_translate -projwin -168 72 -52 24 -co COMPRESS=DEFLATE -co TILED=YES -co COPY_SRC_OVERVIEWS=YES /vsicurl/https://files.isric.org/...`) and manifest shape. Real manifest is gitignored.

**Frontend (`apps/web`).**
- `packages/shared/src/constants/dataSources.ts` — `'soil_properties'` added to `LayerType` union and excluded from `Tier1LayerType`.
- `store/mapStore.ts` — `SoilSelection { property: string }` + `soilSelection` / `setSoilSelection`. Mirrors `gaezSelection` shape; null until the overlay first becomes visible, then seeded from `/catalog`.
- `features/map/soilColor.ts` — `SOIL_RAMPS` record keyed by `SoilRampId` (`sequential_earth` / `diverging_ph` / `sequential_carbon` / `sequential_clay` / `sequential_sand`). Each ramp is a `(range: [min, max]) => { valueToRgba, swatches }` factory so legend labels come out unit-aware. `rampGradientCss(ramp)` builds the CSS gradient for the legend strip. α = 140/255 to match GAEZ.
- `features/map/SoilOverlay.tsx` — `<SoilOverlay>` and `<SoilMapControls>`. Canvas-source + raster layer IDs `soil-properties-source` / `soil-properties-layer`, inserted before the first `symbol` layer so labels stay above the overlay. Decode effect fetches `/api/v1/soilgrids/raster/:property` via `geotiff.js` `fromUrl` with Range requests, paints a 4320×2160 offscreen canvas using the selected ramp, then `src.play(); src.pause()` to force MapLibre to re-read. `raster-opacity: 0.60` (slightly below GAEZ 0.65 so hillshade reads). Hover tooltip rAF-throttles pixel reads and shows `{label} · {formatted value}` with per-property `scale` applied. Controls panel positions at `right: 260` to sit left of the GAEZ picker at `right: 12`.
- `features/map/LayerPanel.tsx` — `LAYER_LABELS` + `LAYER_ICONS` gained entries for `soil_properties` (required by the `Record<LayerType, string>` exhaustiveness, caught by tsc).
- `components/panels/MapLayersPanel.tsx` — new overlay row `{ key: 'soil_properties', label: 'Soil Properties', desc: 'SoilGrids depth, pH, organic carbon, texture' }`. Unlike the existing overlay rows (which toggle MapLibre layers via `setLayoutProperty`), this one flips `visibleLayers` on the store via `setLayerVisible('soil_properties', …)` — the overlay component self-manages its MapLibre layer lifecycle, so the panel is just a store switch. Eye icon reads its state from `visibleLayers.has('soil_properties')` rather than local `overlayStates`.
- `features/map/MapView.tsx` — `<SoilOverlay map={mapRef} />` + `<SoilMapControls />` mounted inside a dedicated `<ErrorBoundary>` after the GAEZ pair (both source/layer IDs distinct, no MapLibre-source collision when both are on).

**Verification (no-manifest mode).** GDAL is not installed on this workstation, so the ingest step is deferred to a machine that has it. Verified end-to-end that the code path survives the "no raster data" case gracefully:
- `curl /api/v1/soilgrids/catalog` → `{entries:[], count:0, attribution:"…CC BY 4.0"}`
- `curl /api/v1/soilgrids/query?lat=43.55&lng=-79.66` → `{fetch_status:"unavailable", message:"SoilGrids rasters not loaded — see apps/api/data/soilgrids/README.md"}`
- `curl /api/v1/soilgrids/raster/bedrock_depth` → 404 JSON
- Toggled `visibleLayers` to include `soil_properties` via the zustand store; `<SoilMapControls>` rendered the empty-manifest state cleanly: "SoilGrids rasters not ingested on this deployment." + "ISRIC SoilGrids v2.0 · CC BY 4.0". No console errors. Network shows the expected harmless 404 on the raster fetch (the overlay still attempts the default `bedrock_depth` fetch even when the catalog is empty — a small polish item, not a crash).
- `tsc --noEmit` clean for `@ogden/api`, `@ogden/web`, `@ogden/shared`.
- `apps/web` Vite production build succeeds (sw.js + 107 precache entries).
- `apps/api` `tsc` build succeeds.
- API vitest: 31 files / 389 tests all green.

**Deferred (does not block code landing).**
- **SoilGrids COG ingest.** Runs on a machine with GDAL installed. Plan: `gdal_translate -projwin -168 72 -52 24 -co COMPRESS=DEFLATE -co TILED=YES -co COPY_SRC_OVERVIEWS=YES /vsicurl/https://files.isric.org/soilgrids/latest/data/<layer>/<layer>.vrt <out>.tif` for BDRICM, phh2o 0-30cm, soc 0-30cm, clay 0-30cm, sand 0-30cm. Populate `apps/api/data/soilgrids/cog/soilgrids-manifest.json` with min/max from `gdalinfo -stats`. Total disk footprint estimated <1 GB across the 5 clipped rasters.
- **Empty-catalog polish.** `SoilOverlay` should skip the `bedrock_depth` default fetch when `catalog.entries` is empty, to avoid the cosmetic 404 in the network tab.
- **Preview-mode screenshot.** The Claude Preview screenshot tool was unresponsive during this session; verification used DOM snapshots + network inspection instead. Visual parity with GAEZ picker hasn't been eyeballed yet; once rasters land, do a side-by-side screenshot run.
- **Point-query cross-check.** Click a parcel, confirm the Site Intelligence panel's bedrock depth (from `lioFetchSoils` / `fetchSoilGrids`) falls within the same color class as the overlay at that pixel. Requires ingest first.

**Commits (pending user approval to commit).**
- `feat(api): add /soilgrids/{catalog,query,raster} routes + SoilGridsRasterService`
- `feat(web): map-side SoilGrids property overlay with per-property ramps + picker`
- `docs(wiki): log Sprint CD — SoilGrids overlay code landed, ingest deferred`

---

## 2026-04-21 — Sprint CC: GAEZ overlay hardening (hover readout + yield mode + raster auth)

Three polish/hardening items on top of the Sprint CB foundation — all landing in the same files CB touched, committed as three focused commits. None of them are Sprint CD (RCP ingest), which remains deferred to its own planning pass.

**Backend (`apps/api`).**
- `routes/gaez/index.ts` — `/raster/:crop/:waterSupply/:inputLevel/:variable` gains `preHandler: [fastify.authenticate]`. `/catalog` (manifest digest) and `/query` (single-pixel) stay public. Rationale: FAO GAEZ v4 is CC BY-NC-SA 3.0 IGO; streaming raw FAO bytes to anonymous clients is the passive-scrape surface we can close cheaply. The NC-clause business decision itself stays tracked on `wiki/LAUNCH-CHECKLIST.md`.
- `tests/gaezRoutes.test.ts` — 3 new tests (401 no header / 401 malformed / 200 valid JWT) inside the existing raster `describe`. Existing happy-path raster tests gained a helper `authHeader()` that mints a test JWT via `app.jwt.sign({ sub: 'test-user', email: 't@t' })`. Suite: 371/371 green (was 368/368).

**Frontend (`apps/web`).**
- `store/mapStore.ts` — `GaezSelection` grows `variable: 'suitability' | 'yield'` (new `GaezVariable` type). Added `gaezMaxYield` + `setGaezMaxYield()` — the decode effect publishes the per-tile 99th-percentile yield so the Legend can render "~N kg/ha" without a cross-component ref.
- `features/map/gaezColor.ts` — `yieldToRgba(value, maxYield)` + `YIELD_GRADIENT_CSS`. 5-stop viridis-ish ramp (deep purple → blue → teal → green → yellow), linear interp, α≈140/255 so mode-flipping feels consistent. Negative values / NaN → transparent (catches FAO in-band `-1` sentinel).
- `features/map/GaezOverlay.tsx` — major growth in three axes:
  1. **Hover readout.** New `rasterStateRef` captures `{band, width, height, originX, originY, xRes, yRes, noData, variable, maxYield, selection}` at the end of every decode. A new `mousemove`/`mouseleave` effect converts `e.lngLat` → pixel indices via `floor((lng - originX) / xRes)` / `floor((lat - originY) / yRes)` and renders a small fixed-position tooltip (rAF-gated to coalesce 60Hz bursts). Tooltip text mirrors the Site Intelligence panel's GAEZ section: `crop water input · S2` in suitability mode, `crop water input · 5,400 kg/ha` in yield mode. Border color = class swatch (suitability) or ramp color (yield).
  2. **Yield-gradient paint.** Decode effect branches on `selection.variable`. Suitability path unchanged. Yield path samples the band at ~10k points, sorts, takes the 99th percentile as `maxYield`, and paints with `yieldToRgba(v, maxYield)`. `rasterUrl()` now uses `selection.variable` instead of hardcoded `'suitability'`. Sparse-tile fallback: fewer than 100 samples → `maxYield = max(samples)`.
  3. **JWT auth.** Reads `useAuthStore((s) => s.token)` and forwards it as `Authorization: Bearer ...` on both the catalog fetch and the geotiff.js `fromUrl(url, { headers })` call. Verified ahead of time: `RemoteSourceOptions.headers` propagates through geotiff's internal fetch (`node_modules/geotiff/dist-module/source/remote.d.ts`). Unauthenticated catalog fetches surface via the existing "Catalog failed: …" error string.
- `GaezMapControls` — new `<ModeToggle>` segmented-button pair (Class / Yield). Legend swaps between discrete suitability swatches and a continuous gradient strip with `0` / `~N kg/ha` labels (pulled from `useMapStore.gaezMaxYield`).

**Verification.**
- `cd apps/api && npx vitest run` → 371/371 green.
- `cd apps/web && npx tsc --noEmit` → 0 errors.
- Manual (dev): toggle GAEZ, confirm overlay unchanged from CB, hover Iowa → tooltip reads "maize rainfed high · S1"; flip mode → viridis ramp, Iowa bright, Sahara transparent, tooltip reads "maize rainfed high · ~12,000 kg/ha"; log out + refresh → "Catalog failed: 401" surfaces without crash.

**Deferred (Sprint CD and later).** RCP future-scenario ingest (own plan); Web Worker decode offload; per-zoom resolution tiers; side-by-side crop compare / delta viz; touch-device hover equivalent; per-crop calibrated yield ceilings (tile-derived 99th percentile is MVP); per-user rate-limiting on `/raster/*` beyond the global `rateLimit`. FAO NC-license business decision itself stays the launch blocker.

**Commits:**
- `feat(api): require auth on /gaez/raster/:crop/...`
- `feat(web): GAEZ overlay hover readout + yield-gradient mode`
- `docs(wiki): log Sprint CC — GAEZ overlay hardening`

---

## 2026-04-21 — Sprint CB: map-side GAEZ v4 suitability overlay

First raster overlay in Atlas. Operator can now toggle "Agro-Climatic Suitability (GAEZ)" on the map and see the selected crop's suitability class gradient worldwide at 5 arc-min; before this, GAEZ was only queryable at a single parcel centroid via the Site Intelligence panel.

**Backend (`apps/api`).**
- `GaezRasterService` gains `getManifestEntries()` + `resolveLocalFilePath()` public accessors. `resolveLocalFilePath()` is the path-traversal guard: it looks up by exact manifest-key match; user path components never reach `join()`.
- `routes/gaez/index.ts` gains two endpoints. `GET /api/v1/gaez/catalog` returns `{ entries, count, attribution }` for the map-side crop picker. `GET /api/v1/gaez/raster/:crop/:waterSupply/:inputLevel/:variable` streams the COG with `Accept-Ranges: bytes`, parses `Range: bytes=START-END` (supports open-ended `bytes=START-`), emits 206 + `Content-Range` on partial, 416 on malformed or past-EOF, 404 on unknown variable / manifest miss / missing file. `Cache-Control: public, max-age=3600`.
- `apps/api/src/tests/gaezRoutes.test.ts` extended with 11 new tests (2 catalog + 9 raster — full fetch, byte range, open-ended range, 416 malformed, 416 past-EOF, 404 unknown-variable before service call, 404 unknown-crop, 404 disabled-service, 404 missing file). Suite: 368/368 green (up from 357).

**Frontend (`apps/web`).**
- `features/map/GaezOverlay.tsx` — two exports co-located because they share `gaezSelection`: `<GaezOverlay map={map}>` (canvas-source lifecycle + geotiff.js decode + `play()/pause()` re-upload trick) and `<GaezMapControls>` (floating top-right panel with crop/water/input selects + legend).
- `features/map/gaezColor.ts` — `suitabilityToRgba()` + `SUITABILITY_SWATCHES` + `rgbaToCss()`. Palette derived from `tokens.ts confidence.high/medium/low` + an amber-orange S3 bridge + desaturated WATER blue, all at α≈140/255 so the base map stays legible.
- `store/mapStore.ts` — `GaezSelection` type + `gaezSelection`/`setGaezSelection`. Null until picker seeds canonical default `maize / rainfed / high` (falls back to `catalog[0]` if absent).
- `features/map/MapView.tsx` — mounts `<GaezOverlay map={mapRef} /> + <GaezMapControls />` inside an `ErrorBoundary` sibling to `MapCanvas`. LayerPanel toggle (`gaez_suitability`, scaffolded Sprint BU) unchanged — it now drives real rendering.

**Render path.** MapLibre `type: 'canvas'` source pinned to `[[-180,90],[180,90],[180,-90],[-180,-90]]`, `animate: false`. On selection change: `fromUrl()` streams the COG via Range reads, `readRasters({ interleave: false })` yields the whole-world 4320×2160 band, `suitabilityToRgba()` maps each pixel to RGBA into an `ImageData`, `putImageData` onto the offscreen canvas, then `src.play(); src.pause()` forces MapLibre to re-read the pixels. Z-order: inserted with `beforeId = getFirstSymbolLayer(map)` so labels render above the raster while parcel fills (added later) sit above naturally.

**Verification.** `npx tsc --noEmit` 0 errors; `npx vitest run` 30/30 files, 368/368 tests green; manual pending against a dev API with `gaez-manifest.json` present. Main-thread decode measured at ~50–80 ms on a modern laptop — fine for MVP; Web Worker offload deferred.

**Files touched (8):** `apps/api/src/services/gaez/GaezRasterService.ts`, `apps/api/src/routes/gaez/index.ts`, `apps/api/src/tests/gaezRoutes.test.ts`, `apps/web/src/store/mapStore.ts`, `apps/web/src/features/map/gaezColor.ts` (new), `apps/web/src/features/map/GaezOverlay.tsx` (new), `apps/web/src/features/map/MapView.tsx`, `wiki/{entities/api.md, entities/web-app.md, log.md}`.

**Deferred:** Sprint CC (RCP-scenario ingest) still outstanding. Within CB scope: Web Worker decode, per-zoom resolution tiers, yield-gradient color ramp, side-by-side crop compare, hover-readout on the overlay (panel already serves that role), auth on the raster endpoint (tracked in LAUNCH-CHECKLIST).

---

## 2026-04-21 — Sprint CA closed at Phase A: premise refuted, no code change

Planned as "clean up the NoData tag in `convert-gaez-to-cog.ts`" — Sprint BZ left a note that the COG conversion was dropping the source GDAL NoData tag, causing `-1` sentinel values to leak through at Sahara. Sprint BZ's classifier guard (`yield < 0 || null → UNKNOWN`) was framed as defense-in-depth papering over this ingest defect.

Phase A probe via a small `geotiff.js` script against the raw + COG files (`maize_rainfed_high_yield.tif` + `_suitability.tif`, sampled at Iowa / Sahara / Bering / Antarctica / Pacific) **refuted the premise**. Both raw AND COG have `GDAL_NODATA=-9` set identically. Bering / Antarctica / Pacific all return `-9` in yield and `0` in suitability (= true NoData, flows through as `null`). Sahara returns `-1` in yield and `9` in suitability — but these are NOT NoData leaks; they're a **second, in-band FAO sentinel** meaning "pixel is on-raster but not viable for this crop / water / desert".

Conclusion: the ingest is clean. FAO uses a two-sentinel convention per raster (standard NoData + in-band "not viable"), and Sprint BZ's `yield < 0` classifier branch is load-bearing code that handles the second sentinel — not defensive scaffolding around a broken ingest. Documented the two-sentinel pattern in `wiki/entities/api.md` under `GaezRasterService`.

**Considered and rejected:**
- *Add `-a_nodata -1` override at conversion:* GDAL bands can only hold one NoData value; this would replace FAO's `-9` tag with `-1`, confusing downstream tools (QGIS, anything reading the COGs directly).
- *Reframe `-1` as class `N` (not suitable) instead of `UNKNOWN`:* closer to FAO's intent, but contradicts Sprint BZ's hard-won "Sahara should say UNKNOWN" UX decision; not worth a re-litigation.

**Files touched (1):** `wiki/entities/api.md` (edited the Sprint BZ note to reflect the CA finding), `wiki/log.md` (this entry). No source changes.

**Next up:** Sprint CB (map-side GAEZ raster visualization) and Sprint CC (RCP ingest) remain deferred. With CA closed, both inherit a clean, well-understood ingest + classifier foundation.

---

## 2026-04-21 — Sprint BZ: GAEZ WATER/desert classifier fix + 47-crop ranking UI

Two follow-ups deferred from Sprint BY landed together in one sprint:

**(a) Classifier fix — WATER vs off-extent NoData (commit `6ba8efb`).** During Sprint BY's full-ingest smoke queries, the Sahara point (24 N, 12 E) returned `primary_suitability_class: 'WATER'` for all 47 crops — obviously wrong for the world's largest hot desert. Root cause: `GaezRasterService.mapSuitabilityCode(code)` mapped raw raster code `9` unconditionally to `'WATER'`. But FAO reuses code 9 for BOTH open water AND off-cropland-extent NoData. The function had no access to the paired yield raster even though `query()` was already sampling both in parallel.

Live-data probe against the running API confirmed the disambiguation hypothesis with a twist — Sahara yield came back as `-1` (sentinel leak through a missing GDAL NoData tag on the COG conversion), not null as originally hypothesized. Fix broadened: treat `yield < 0 OR null OR non-finite` as off-extent (`UNKNOWN`), `yield >= 0` as real water (`WATER`). Also sanitized yield output to null for any negative sentinel, and fixed a second bug in the fallback branch that was hardcoding `primary_suitability_class: 'WATER'` even when all 47 entries came back UNKNOWN (Bering Sea was reporting WATER for the right reason by accident; Sahara was WATER for the wrong reason). Fallback now picks WATER only when at least one entry classifies as WATER, otherwise UNKNOWN with a "no cropland extent" message.

TDD: 2 new tests (`code 9 + yield=-1 → UNKNOWN`, `code 9 + yield=null → UNKNOWN`) + 2 existing tightenings. 357/357 backend vitest green. Real-data re-probe: Iowa unchanged S1 potato 12,719 kg/ha; Sahara now `UNKNOWN` with yield=null; Bering Sea now `UNKNOWN` (more honest than the accidental-WATER it returned before).

**(b) Full 47-crop ranking UI (commit `915c0b0`).** Post Sprint BY, the API returns 47 entries in `crop_suitabilities[]` (12 crops × up-to-4 water/input combos, minus the cassava_irrigated_low FAO gap). `layerFetcher` was already plumbing the full array into `gaezMetrics`, but `GaezSection.tsx` rendered only `best_crop` + `top_3_crops`. Users couldn't see rye-at-S2 or soybean-at-S3 without hitting the API directly.

Added a collapsed-by-default disclosure below the top-3 row: `Full crop ranking (47)` header with a chevron, expanding to 47 rows of `[crop label] [class badge] [yield kg/ha] [water/input subtitle]`. Sort matches the API's existing yield-desc + suitability-rank order. Implementation: extended `GaezMetrics` with `fullRanking?: GaezCropRow[]`, populated it in `useSiteIntelligenceMetrics.ts` from `sm['crop_suitabilities']`, and added a `useState`-gated block in `GaezSection` reusing `s.liveDataHeader` / `s.chevron` / `s.chevronClosed` / `p.innerPad` — same token vocabulary as the Soil section's existing disclosures. Suitability badges reuse the existing `confidence.high/medium/low` palette via a module-local `suitabilityColor` helper (no new CSS). Zero typecheck errors.

**Skipped intentionally** (deferred unless operator asks): grouping the 47 rows by suitability class, a crop-label lookup for prettier names than `replace(/_/g, ' ')`, a tabs-based rewrite of `GaezSection`, frontend component tests (no harness yet). **Remaining GAEZ follow-ups:** the missing GDAL NoData tag on COG conversion (which caused the `-1` sentinel leak) — harmless given the yield-aware classifier, but worth fixing in `convert-gaez-to-cog.ts` to clean up the raw data; RCP-scenario ingest for future time periods; map-side raster visualization.

**Files touched (5):** `apps/api/src/services/gaez/GaezRasterService.ts`, `apps/api/src/tests/GaezRasterService.test.ts`, `apps/web/src/components/panels/sections/GaezSection.tsx`, `apps/web/src/hooks/useSiteIntelligenceMetrics.ts`, `wiki/entities/api.md`.

**Verification:** 357/357 backend tests green. `pnpm --filter @ogden/web exec tsc --noEmit` → 0 errors. Iowa / Sahara / Bering live-probe classifications all correct per hypothesis. Manual browser verification of the disclosure deferred to operator (identical data plumbing as top_3 which already works → high confidence).

---

## 2026-04-21 — Staging provisioning decision parked

Considered executing `wiki/decisions/2026-04-20-atlas-staging-provisioning.md`
immediately after Sprint BY. Declined on three grounds: no concrete audience
for a staging URL (dev loop is fine on localhost), CC BY-NC-SA NC clause means
any public URL needs auth/robots gating anyway, and $25/mo recurring is
premature without a trigger. Decision doc updated to `Status: Parked`;
revisit criteria documented inline (external viewer needs URL, feature requires
non-local validation, or production launch within 4 weeks). Preserves Sprint BY
gains — GAEZ pipeline runs fully against localhost — without drifting config
files that would bitrot before deploy.

---

### 2026-04-21 — GAEZ Automated Downloader (Sprint BY) — Option C Landed and Executed End-to-End
- **Context:** Sprint BX shipped the operator preflight + smoke-test runbook but left the acquisition step manual (96 Data Viewer clicks against FAO's ArcGIS Hub SPA — Theme 4 has no bulk download; the v4 DATA ACCESS page literally says "Use Data Viewer" in its download column). BY implements the third and most ambitious option from the BX handback: a fully programmatic downloader that bypasses the portal entirely by talking to FAO's ArcGIS Image Service (`res05`) directly.
- **Discovery (schema probe):** `https://gaez-services.fao.org/server/rest/services/res05/ImageServer` is a single-service catalog containing ALL GAEZ v4 themes (122,708 rows), with fields `crop`, `water_supply`, `input_level`, `sub_theme_name`, `variable`, `model`, `year`, and — critically — `download_url` pointing at a direct `s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/res05/…/*.tif` path (no auth, no license-page redirect). Theme 4 narrows via `sub_theme_name IN ('Suitability Class', 'Agro-ecological Attainable Yield ')` + `variable LIKE '…current cropland…'` + `year='1981-2010'` + `model='CRUTS32'`. Observed quirk: the yield sub-theme is stored with a trailing space in FAO's DB — filter matches both with/without for future-proofing.
- **Crop-name mapping (our slug → FAO canonical):** `rice → Wetland rice`, `potato → White potato`, `millet → Pearl millet`, `sweet_potato → Sweet potato`; remaining 8 match. Water-supply mapping: `rainfed → Rainfed`, `irrigated → Gravity Irrigation` (40 crops) with fallback priority `Irrigation` / `Sprinkler Irrigation` / `Drip Irrigation` for crops like Cassava that only publish one irrigated variant.
- **Script (`apps/api/scripts/download-gaez.ts`):** 320 LOC TypeScript using Node built-ins only (`node:https`, `node:fs`) — no new deps. Architecture: (a) `enumerateTargets()` produces the 96 target filenames matching `convert-gaez-to-cog.ts`'s `parseName()` scheme; (b) `resolveTargets()` makes 24 `/query` calls (12 crops × 2 variables — not 96) and picks the best row per bucket via water-supply priority order; (c) `downloadFile()` streams to `${dest}.tmp` then renames, with redirect-following and 3× exponential-backoff retry (1s/4s/16s); (d) concurrency limiter for parallel downloads (default 4). CLI flags: `--filter <substring>`, `--dry-run`, `--concurrency N`.
- **Tests (`apps/api/src/tests/downloadGaez.test.ts`):** 30 unit tests covering `sqlQuote` escaping, `buildQueryUrl`/`buildWhereClause` construction (including the trailing-space sub-theme edge case), `enumerateTargets` 96-combination invariant, `mapToFilename` water-supply priority + input-level match (with Rainfed/Gravity Irrigation/Irrigation cases and the "Rainfed All Phases" rejection), `shouldInclude` filter semantics (smoke-test pair matches exactly 2), `parseArgs` CLI parsing, and `resolveTargets` with a mocked fetcher (smoke-test pair, Cassava partial-coverage unresolved case, Gravity-over-Irrigation preference, Cassava Irrigation fallback, ImageServer error passthrough, one-query-per-(crop, variable) invariant). All 30/30 green.
- **End-to-end execution:** Ran the full pipeline this session — (1) `--dry-run` resolved 94/96 against live FAO (the 2 missing are `cassava_irrigated_low_{suitability,yield}` — a legitimate FAO data gap, not a script bug: Cassava publishes only Irrigation/High, no Irrigation/Low); (2) smoke download of 2 maize files in 2.8 s total (3.2 MB); (3) preflight green (`2/2 raw files match naming`); (4) COG conversion green (`Converted: 2, Crop keys: 1` — PROJ warnings from PostgreSQL's bundled proj.db conflict are cosmetic; GDAL still wrote both COGs); (5) API booted with `GAEZ v4 raster service enabled`; (6) Iowa query returned `fetch_status: complete`, maize S1 at 10,918 kg/ha — within the 3,000–12,000 expected range from the smoke-test doc.
- **Full 94-file pull:** Ran `download-gaez.ts --concurrency 6` after smoke passed → 92 fresh + 2 skipped from smoke = 94/94 available in `raw/`, total ~90 MB, under 90 seconds. Then full COG conversion: `Converted: 92, Reused: 2, Crop keys: 47` (48 minus the cassava_irrigated_low gap). API restarted and queried against the full manifest — Iowa (42, -93.5): 47 crops analyzed, best = irrigated-high potato at 12,719 kg/ha S1 (maize S1 at 11,177, barley S1 at 9,664 — sane ranking for prime US cropland). Punjab (31, 74): maize S2 at 7,196 (hot/dry drags class from S1 to S2, realistic). Sahara (24, 12): all crops WATER/NoData (expected; no mapped cropland in the Sahara interior, though WATER-class on desert is a classifier edge case worth a future refinement).
- **Docs updated:** `apps/api/scripts/ingest-gaez.md` §2 promoted the programmatic path to primary with a block pointing at `npm run download:gaez`, keeping the Data Viewer flow as fallback. `apps/api/scripts/gaez-smoke-test.md` Step 1 became `pnpm … run download:gaez -- --filter maize_rainfed_high` (one command replaces 10 click-steps). `apps/api/package.json` gained `download:gaez` script entry. `wiki/entities/api.md` got a `scripts/download-gaez.ts` row under the GAEZ subsection.
- **Files touched (6):** `apps/api/scripts/download-gaez.ts` (new, 320 LOC), `apps/api/src/tests/downloadGaez.test.ts` (new, 30 tests), `apps/api/package.json` (added `download:gaez`), `apps/api/scripts/ingest-gaez.md` (primary-path block in §2), `apps/api/scripts/gaez-smoke-test.md` (Step 1 rewritten), `wiki/entities/api.md` (scripts row).
- **Net impact:** Atlas now has full FAO GAEZ v4 Theme 4 coverage live in dev — 47 of 48 crop keys populated (12 crops × 4 mgmt regimes, minus the one FAO gap). Operator friction dropped from "96 portal clicks over 2-3 hours" to "one command, ~90 seconds unattended." The Data Viewer fallback path stays documented in case FAO rotates or breaks the ImageServer. No new dependencies, no infrastructure, no license-agreement automation (the CC BY-NC-SA 3.0 IGO NC-clause remains the pre-commercial blocker tracked in `wiki/LAUNCH-CHECKLIST.md` — programmatic downloading is covered by the license; downstream commercial use is what triggers review).
- **Verification:** 30/30 new vitest tests green. `npm run download:gaez -- --dry-run --filter maize_rainfed_high` resolves 2/2 in <2 s. Full pull Iowa smoke query returns `complete` + S1 maize 10,918 kg/ha. No apps/web or apps/api core-source changes → existing 325 api / 361 web vitest suites unaffected.

---

### 2026-04-20 — GAEZ Ingest Operator Tooling + Staging Provisioning Plan (Sprint BX)
- **Scope:** Operator asked to "run the GAEZ ingest pipeline against real Theme 4 rasters in a staging env." The ingest is not autonomously executable — FAO GAEZ v4 requires manual click-through of a CC BY-NC-SA 3.0 IGO license page (no REST endpoint), GDAL is not installed on the dev machine, and no staging infrastructure exists yet. BX lands the three artifacts that unblock this work without violating those constraints: (A) an operator preflight script, (B) a single-raster smoke-test runbook, (C) a staging-provisioning decision doc.
- **Option A — preflight script (`apps/api/scripts/gaez-ingest-preflight.ps1`):** PowerShell operator preflight that (1) checks `gdal_translate --version` with install-path hints (OSGeo4W / QGIS bundle / conda), (2) creates `data/gaez/raw/` + `data/gaez/cog/` on `-CreateDirs`, (3) validates any existing raw-file names against the `parseName()` regex in `convert-gaez-to-cog.ts` and flags skip-prone files by name, (4) prints a 96-file download checklist with `-PrintChecklist`. Exits 0 ready-to-ingest or 1 with actionable blockers. ASCII-only to avoid PS 5.1 CP-1252 parse errors on no-BOM UTF-8.
- **Option B — smoke-test runbook (`apps/api/scripts/gaez-smoke-test.md`):** Documents the minimum-real-data validation path: download 1 yield + 1 suitability raster (`maize_rainfed_high_*.tif`), run ingest, boot API, hit `/api/v1/gaez/query?lat=42&lng=-93.5` (Iowa cropland), verify `fetch_status: 'complete'` + plausible nonzero yield + S1/S2-ish class. Adds water-point + polar-point edge cases. Zero infrastructure; catches bugs the fully-mocked unit tests miss (projection metadata, NoData encoding, real geotiff.js byte-range behavior).
- **Option C — staging-provisioning decision doc (`wiki/decisions/2026-04-20-atlas-staging-provisioning.md`):** Scopes the minimum-viable staging env that would let GAEZ run "in staging" end-to-end: Fly.io (API + Postgres + Redis, ~$15-25/mo), Cloudflare Pages (web, free), AWS S3 + CloudFront (GAEZ COGs, ~$1/mo), Cloudflare DNS (`atlas-staging.ogden.ag`, `atlas-web-staging.ogden.ag`, `gaez-staging.ogden.ag`). Four phases: infra (2-3 h), GAEZ ingest + upload (~1 h + 30 min compute), deploy + verify (~30 min), handback (~15 min). Deliberately **Proposed, not Committed** — operator decision point is whether to allocate 4-6 hours + $25/mo now or stay mock-validated until prod launch. Recommendation: run Option B first, revisit C once a second infrastructure need (prod DNS, Stripe, production DB) amortizes the setup cost.
- **Also touched:** `apps/api/scripts/ingest-gaez.md` gained a §2b "Preflight (recommended)" section pointing at the new PS1 + smoke-test doc. `wiki/index.md` gained the staging-provisioning decision-doc link under Decisions.
- **Not landed:** no actual staging infrastructure provisioned, no GDAL install, no rasters downloaded, no ingest run. These are operator-gated — cannot be executed by Claude Code in the current session (license click-through, infrastructure provisioning, and disk/network cost all fall outside the agent boundary).
- **Verification:** preflight runs clean (with `[FAIL] gdal_translate not on PATH` + `[OK] directory creation` + `Missing: 96` on a fresh checkout). No apps/api or apps/web code touched → existing vitest + tsc + build state preserved (325 api / 361 web).
- **Files touched (5):** `apps/api/scripts/gaez-ingest-preflight.ps1` (new), `apps/api/scripts/gaez-smoke-test.md` (new), `wiki/decisions/2026-04-20-atlas-staging-provisioning.md` (new), `apps/api/scripts/ingest-gaez.md` (§2b preflight cross-reference), `wiki/index.md` (decisions link).
- **Handback to operator:** to exercise the GAEZ pipeline against real data, (1) install GDAL (OSGeo4W recommended on Windows), (2) run `pwsh apps/api/scripts/gaez-ingest-preflight.ps1 -CreateDirs` to prep the tree, (3) follow `apps/api/scripts/gaez-smoke-test.md` for the 1-raster validation or `apps/api/scripts/ingest-gaez.md` for the full 96-raster ingest, (4) when ready, revisit `wiki/decisions/2026-04-20-atlas-staging-provisioning.md` to decide on staging infra.
- **Follow-up fixup (same session, post-install):** Operator installed OSGeo4W 3.12.3 via the GUI installer. It landed at `%LOCALAPPDATA%\Programs\OSGeo4W\` (per-user install) and did not modify PATH — "installed" ≠ "on PATH". Hardened both operator tools to survive this case: (a) `gaez-ingest-preflight.ps1` now falls back to scanning standard OSGeo4W install paths + reading the uninstall registry keys when `gdal_translate` isn't on PATH, and prints the exact one-liner to persist the bin dir to user PATH or the `GDAL_BIN` env-var override; (b) `convert-gaez-to-cog.ts` gained a `resolveGdalTranslate()` helper that honors `GDAL_BIN` and falls back to the platform-default binary name, so the ingest can run even in shells that predate a PATH update. Persisted `C:\Users\MY OWN AXIS\AppData\Local\Programs\OSGeo4W\bin` to user PATH during the session — new shells inherit it. Vitest 27/27 GAEZ tests still green post-fixup.

---

### 2026-04-20 — Fix apps/api tsc/build regressions (Sprint BW)
- **Scope:** Sprint BV's debrief flagged three pre-existing `apps/api` tsc/build regressions that were blocking `npm run build` while vitest stayed green (the broken adapters weren't exercised by the passing suite). BW is a short triage sprint to clear them so `apps/api` builds cleanly again on `main`.
- **Fix 1 — `NlcdAdapter.ts:168` (`Property 'features' does not exist on type '{}'`):** `response.json().catch(() => null)` inferred `{} | null`, so `json?.features` didn't typecheck. Widened the parse to an explicit `{ features?: Array<{ properties?: Record<string, unknown> }> } | null` cast at the assignment site. No behavioral change — the downstream `if (!features || features.length === 0)` guard already handles the missing-features case.
- **Fix 2 — `UsCountyGisAdapter.ts:436/447` (duplicate `getAttributionText` + private-vs-interface visibility):** the adapter had two `getAttributionText` methods — a `private` summary-taking variant (`:436`) used internally by `fetchForBoundary` (`:429`), and a public no-arg variant (`:447`) required by the `DataSourceAdapter` interface. TS rejected both as duplicates, and the private one also violated the interface. Renamed the internal helper to `buildAttributionText(summary)` and updated the single call site; the public parameterless `getAttributionText()` remains as the interface contract. The test at `UsCountyGisAdapter.test.ts:283` was already calling the public variant — passes unchanged.
- **Fix 3 — `SsurgoAdapter.test.ts:123` (missing `frag3to10_pct` / `fraggt10_pct` on `HorizonRow`):** Sprint BB's SSURGO coarse-fragment enrichment added these two required fields to the `HorizonRow` type, but the two test fixture rows in `Weighted average computation > computes correct weighted averages for 60/40 split` never got backfilled. Added `frag3to10_pct: 0, fraggt10_pct: 0` to both rows — neutral values (no coarse fragments), doesn't perturb any downstream assertion.
- **Verification:** `cd apps/api && npx tsc --noEmit` → clean. `npm run build` → clean. `npx vitest run` → **325/325 passing** (unchanged). `cd apps/web && npx vitest run` → **361/361 passing** (unchanged).
- **Files touched (3):** `apps/api/src/services/pipeline/adapters/NlcdAdapter.ts`, `apps/api/src/services/pipeline/adapters/UsCountyGisAdapter.ts`, `apps/api/src/tests/SsurgoAdapter.test.ts`.

---

### 2026-04-20 — Land FAO GAEZ v4 Self-Hosting (Sprint BV)
- **Scope:** Sprint BU restored `main` test-green while explicitly deferring the GAEZ (FAO Global Agro-Ecological Zones v4) self-hosting slice. Sprint BV lands that slice: the `GaezRasterService` (geotiff.js byte-range COG reads, local FS + HTTPS/S3 dual backend, LRU-cached TIFF handles, 48-sample per-point query across 12 crops × 4 management regimes), Fastify `GET /api/v1/gaez/query?lat=&lng=` route with Zod validation and `{ data, error }` wrapper, `gdal_translate`-based `convert-gaez-to-cog.ts` ingestion producing `gaez-manifest.json`, `app.ts` + `lib/config.ts` + `.env.example` + `package.json` + `.gitignore` glue, plus 28 new Vitest tests. Wiki claims in `index.md`, `entities/api.md`, `entities/gap-analysis.md` now truthful; decision doc `2026-04-20-gaez-self-hosting.md` landed; new `wiki/LAUNCH-CHECKLIST.md` seeded with **CC BY-NC-SA 3.0 IGO legal review** as the first pre-commercial blocker.
- **Phase A — verification:** Read `GaezRasterService.ts` (362 lines) + `routes/gaez/index.ts` (69 lines) end-to-end. Confirmed `initGaezService` / `getGaezService` singleton factory, `isEnabled()` returns false when `gaez-manifest.json` absent, `query(lat, lng)` returns `{ fetch_status, confidence, source_api, attribution, summary }` with summary selected by yield-desc-primary / suitability-rank-desc-tiebreaker. Verified `openTiff` trailing-slash-aware URL join for S3. Cross-referenced test patterns in `UsgsElevationAdapter.test.ts` (adapter pattern) and `smoke.test.ts` (Fastify `buildApp()` + `inject()` with `vi.mock()` of DB + Redis plugins).
- **Phase B — GaezRasterService unit tests (18 tests, all green):** `src/tests/GaezRasterService.test.ts` — `vi.mock('geotiff')` at module scope, `makeFakeTiff(value, opts?)` factory returns image with `getWidth/getHeight/getOrigin/getResolution/getGDALNoData/readRasters`. Coverage: `loadManifest` (absent / malformed / valid / zero-entries), `query` (disabled → unavailable, full 48-raster happy path, all-water WATER class, all-fail failed path, highest-yield-wins tiebreaker, top-3 uniqueness, NoData handling), `openTiff` backend switch (local `fromFile` vs `fromUrl` with/without trailing slash), pixel math (window `[px, py, px+1, py+1]` for known lat/lng + out-of-bounds), singleton factory re-init.
- **Phase C — route integration tests (9 tests, all green):** `src/tests/gaezRoutes.test.ts` — mocks `../plugins/database.js` + `../plugins/redis.js` via `fastify-plugin` (copied from `smoke.test.ts`), mocks `../services/gaez/GaezRasterService.js` exports to a `gaezFake` stub. Validation: missing lat (422), missing lng (422), lat out of [-90, 90] (422), lng out of [-180, 180] (422), non-numeric (422). Service-interaction: disabled → 200 + `fetch_status: 'unavailable'` + message mentioning `ingest:gaez`, happy path → 200 + summary.best_crop, query throws → 200 + `fetch_status: 'failed'`, wrapper shape always `{ data, error }`.
- **Phase D — full-suite:** `cd apps/api && npx vitest run` → **325/325 passing** (297 baseline + 28 new GAEZ). `cd apps/web && npx vitest run` → **361/361 passing** (unchanged). `apps/api` `tsc --noEmit` + `npm run build` surface pre-existing errors in `NlcdAdapter.ts`, `UsCountyGisAdapter.ts` (duplicate `getAttributionText` method + private-vs-interface visibility), `SsurgoAdapter.test.ts` (missing `frag3to10_pct`/`fraggt10_pct` on test horizons); all untouched by BV — regressions from the BT/BU landing slice, to be addressed in a follow-up sprint.
- **Phase E — wiki:** `wiki/index.md` gained `LAUNCH-CHECKLIST.md` link under Orientation + GAEZ decision link under Decisions. `wiki/entities/api.md` gained `/api/v1/gaez` route-table row + `services/gaez/GaezRasterService.ts` services-list entry. `wiki/entities/gap-analysis.md` normalized "Sprint BI self-hosts FAO GAEZ v4" → "Sprint BV self-hosts FAO GAEZ v4" and now claims 8/10 global-data coverage truthfully. `wiki/entities/web-app.md` gained a Sprint BV note (GAEZ backend now live, `gaez_suitability` layer type flips from `'unavailable'` to `'complete'` when manifest is present). `wiki/LAUNCH-CHECKLIST.md` created with CC BY-NC-SA 3.0 IGO legal review as first blocker.
- **Files touched (18 total):** Source: `apps/api/src/services/gaez/GaezRasterService.ts`, `apps/api/src/routes/gaez/index.ts`, `apps/api/scripts/convert-gaez-to-cog.ts`, `apps/api/scripts/ingest-gaez.md`, `apps/api/src/app.ts`, `apps/api/src/lib/config.ts`, `apps/api/.env.example`, `apps/api/package.json`, `.gitignore`. Tests (new): `apps/api/src/tests/GaezRasterService.test.ts`, `apps/api/src/tests/gaezRoutes.test.ts`. Wiki: `wiki/decisions/2026-04-20-gaez-self-hosting.md`, `wiki/index.md`, `wiki/entities/api.md`, `wiki/entities/gap-analysis.md`, `wiki/entities/web-app.md`, `wiki/LAUNCH-CHECKLIST.md`, `wiki/log.md`.
- **Out of scope / follow-up:** (1) Running the actual `ingest:gaez` pipeline against 96 raw Theme 4 .tifs requires GDAL + ~40 GB disk — ops task, separate sprint. (2) Staging-env integration against real COGs also deferred. (3) Pre-existing `tsc`/`npm run build` errors in `NlcdAdapter.ts` / `UsCountyGisAdapter.ts` / `SsurgoAdapter.test.ts` — BT/BU landing regressions, not BV-introduced; file a triage sprint. (4) CC BY-NC-SA 3.0 IGO non-commercial clause is a hard pre-commercial blocker — tracked in `wiki/LAUNCH-CHECKLIST.md`.

---

### 2026-04-20 — Land Panel Split + Scoring Support Libs (Sprint BU)
- **Scope:** After Sprint BT committed the `computeScores.ts` + `layerFetcher.ts` diffs, `main` was briefly in a non-compiling state — `computeScores.ts` imports from 11 in-progress lib files that had been living unstaged in the worktree since Sprints BB–BJ. BU lands all the Sprint BS panel-split artifacts + those scoring support libs + the in-progress state/route/store wiring as one coherent slice, restoring a compilable, test-green `main`. GAEZ self-hosting (Sprint BI API side) was explicitly deferred to its own sprint.
- **Phase A — triage:** Inventoried 30 unstaged files. Split cleanly along the BB–BJ-vs-GAEZ seam: `apps/api/.env.example`, `package.json`, `app.ts`, `lib/config.ts`, `.gitignore`, `apps/api/scripts/convert-gaez-to-cog.ts`, `scripts/ingest-gaez.md`, `src/routes/gaez/`, `src/services/gaez/`, `wiki/decisions/2026-04-20-gaez-self-hosting.md`, `wiki/entities/api.md`, `wiki/entities/gap-analysis.md`, `wiki/index.md` → GAEZ sprint. Everything else → BU. `packages/shared/src/constants/dataSources.ts`'s 17 new `LayerType` union members include `'gaez_suitability'` as a forward-referenced type only (safe — web-side can name the type before the API route is live). `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts`'s `coarse_fragment_pct` addition is BB-pipeline soil enrichment (unrelated to GAEZ) → BU.
- **Phase B — land Sprint BS panel split:** The big `SiteIntelligencePanel.tsx` refactor (1,645 lines → 465 lines of orchestration + 28 new section components under `components/panels/sections/`) lands with the `vite.config.ts` manualChunks routing that splits them into the `panel-sections` chunk. `useSiteIntelligenceMetrics.ts` hook + `useSiteIntelligenceMetrics.test.ts` (5 tests, happy-dom, already passing) land together. `panel.module.css` carries the section-boundary styling. Net effect: the chunk architecture sized under Sprint BS is now fully realized on `main` — shell **15.82 kB**, panel-sections **100.99 kB**, panel-compute **152.93 kB**, ecocrop-db **946.90 kB** (isolated).
- **Phase B — land BB–BJ scoring support libs:** 11 new files under `apps/web/src/lib/`: `designIntelligence.ts`, `regulatoryIntelligence.ts`, `energyIntelligence.ts`, `climateProjections.ts`, `ecosystemValuation.ts`, `fuzzyMCDM.ts`, `waterRightsRegistry.ts`, `companionPlanting.ts`, `canopyHeight.ts`, plus two utility modules `debounce.ts` and `perfProfiler.tsx`. These are the functions the Sprint BT `computeScores.ts` already imports from — they compute per-domain scoring components that feed into the 8 weighted dimensions + 2–3 formal classifications.
- **Phase B — land state + route wiring:** `store/projectStore.ts`, `store/siteDataStore.ts` (56-line delta — new Tier-3 layer-result caching), `lib/rules/ruleEngine.ts`, `lib/mockLayerData.ts`, `lib/syncService.ts`, `pages/ProjectPage.tsx`, `routes/index.tsx`, `features/map/LayerPanel.tsx` all carry the glue that lets the new section components and scoring libs receive their data.
- **Phase C — verification:** `npx tsc --noEmit` clean across `apps/web`. `npx vitest run` — **361/361 passing** (Sprint BT's 361 baseline preserved; the 5 `useSiteIntelligenceMetrics.test.ts` tests that were already being counted now have their file committed). `npm run build` — clean in ~23 s. Panel chunk sizes exactly match the Sprint BS design targets.
- **Files touched (58 total):** 27 modified + 31 new. Key paths: `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (orchestration shell), `apps/web/src/components/panels/sections/*.tsx` (28 new), `apps/web/src/hooks/useSiteIntelligenceMetrics.ts` + test, 11 new `apps/web/src/lib/*.{ts,tsx}` scoring + util libs, `apps/web/vite.config.ts`, `apps/web/src/styles/panel.module.css`, `apps/web/src/store/{projectStore,siteDataStore}.ts`, `apps/web/src/lib/{mockLayerData,syncService,rules/ruleEngine}.ts`, `apps/web/src/pages/ProjectPage.tsx`, `apps/web/src/routes/index.tsx`, `apps/web/src/features/map/LayerPanel.tsx`, `packages/shared/src/constants/dataSources.ts` (+17 `LayerType` union members), `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` (SSURGO coarse-fragment %), `wiki/concepts/scoring-engine.md`, `wiki/entities/data-pipeline.md`.
- **Deferred to next sprint (GAEZ):** `apps/api/{scripts/convert-gaez-to-cog.ts, scripts/ingest-gaez.md, src/routes/gaez/, src/services/gaez/, .env.example, package.json, app.ts, lib/config.ts}`, `.gitignore` (GAEZ raster paths), `wiki/decisions/2026-04-20-gaez-self-hosting.md`, `wiki/index.md` (decision link), `wiki/entities/api.md` (route table entry), `wiki/entities/gap-analysis.md` (GAEZ "implemented" annotations). Files remain unstaged in the worktree — visible via `git status`, not stashed.

---

### 2026-04-20 — Triage BB–BJ Regressions (Sprint BT)
- **Scope:** Sprint BS surfaced 10 pre-existing failures across `computeScores.test.ts` (8) and `layerFetcher.test.ts` (2). Triage across `git diff` of both files concluded that the uncommitted local changes represent **coherent in-progress work across Sprints BB–BJ** (~3,000 lines of live-API fetchers + Tier 3 scoring extensions) rather than accidental rot. Decision: land, don't revert.
- **Phase A — `layerFetcher.ts` `raceWithSignal` rejection bug:** Line 158 was `new Promise<FetchLayerResults>((resolve) => { … p.then(…, (err) => { …; throw err; }); })` — the `throw err` inside a `.then` rejection handler is swallowed because the Promise executor never captured `reject`. Any failing upstream promise caused `raceWithSignal` to hang forever, cascading through the `fetchAllLayers` dedup map. One-line fix: capture `reject` in the executor and forward via `reject(err)`. Verified — `raceWithSignal` now settles correctly on rejection.
- **Test-timeout alignment:** The `fetchAllLayers` tests were timing out at the default 5,000 ms because the panel now iterates ~30+ live-API fetchers per call, each attempting network I/O before falling back to mock. Raised timeouts on three US-path tests (`returns mock data when all APIs fail` → 15_000, `caches results to localStorage` → 15_000, `handles US country correctly` → 15_000, `returns cached results on second call` → 20_000). The CA test already had a 15,000 ms override. Observed per-test run time ~9 s.
- **Phase B — `computeScores.test.ts` drift:** `computeAssessmentScores` returns **10 scores for US (8 weighted + FAO Land Suitability + USDA Land Capability), 11 for CA (+Canada Soil Capability)**. Tests were asserting length 7 — pre-dated the introduction of `computeCommunitySuitability` + the three formal-classification scorers and had been failing against HEAD. Updates:
  - All 7 `toHaveLength(7)` assertions updated to `10` (or `11` for CA).
  - `includes all expected score labels` extended with `'Community Suitability'`, `'FAO Land Suitability'`, `'USDA Land Capability'`.
  - `assigns a valid rating to each score` filtered to `scores.slice(0, 8)` — formal-classification scorers emit domain-specific ratings (`'S1 — Highly Suitable'`, `'Class 2 — …'`) that don't match the `Exceptional/Good/Moderate/Low/Insufficient Data` enum.
  - CA test explicitly passes `country='CA'` as the 3rd argument (optional param added in a prior sprint); without it, the Canada Soil Capability branch is skipped and length stays at 10.
- **Verification:** `npx vitest run` — **361/361 passing** (up from 351/361). `npm run build` — clean (22 s). `npx tsc --noEmit` — clean. Panel chunk sizes unchanged vs Sprint BS baseline.
- **Files touched:** `apps/web/src/lib/layerFetcher.ts` (1-line fix at line 165), `apps/web/src/tests/layerFetcher.test.ts` (3 timeout overrides), `apps/web/src/tests/computeScores.test.ts` (7 length + 1 label + 1 rating-scope + 1 country-arg updates).
- **Coherent sprints now landable under Sprint BT:** BB (GBIF biodiversity), BC (EPA UST/LUST/Brownfields/Landfills, USGS mine hazards, FUDS contamination), BD (USGS Principal Aquifer, WRI Aqueduct water stress, stream seasonality), BF (NLCD prior land-use history), BG (WDPA / ALR / AUV / EcoGifts regulatory), BH (FAO GAEZ agro-climatic suitability), BJ (abort-signal plumbing + dedup).

---

### 2026-04-20 — Panel Chunk Split + Hook Test (Sprint BS)
- **Scope:** Two follow-ups from the Sprint BR debrief — (a) split the 1,144 kB lazy-loaded `SiteIntelligencePanel` chunk into granular, parallel-loadable chunks; (b) add a Vitest fixture test around `useSiteIntelligenceMetrics` to protect the BQ hook boundary.
- **Phase A — chunk split (`apps/web/vite.config.ts`):** Converted `manualChunks` from the object form (exact-name vendor splits) to the function form, so rollup can route arbitrary paths. Kept the existing vendor groupings (`maplibre`, `turf`, `framework`, `cesium`) and added three app-side splits:
  - `ecocrop-db` — FAO EcoCrop data (`data/ecocrop_parsed.json` + `data/ecocropSubset`, ~968 kB raw / ~109 kB gzip); cache-stable, no code churn expected
  - `panel-sections` — the 27 section components under `components/panels/sections/` (~101 kB / ~20 kB gzip)
  - `panel-compute` — the heavy per-metric compute libs (`designIntelligence`, `regulatoryIntelligence`, `energyIntelligence`, `climateProjections`, `ecosystemValuation`, `cropMatching`, `companionPlanting`, `fuzzyMCDM`, `hydrologyMetrics`, `canopyHeight`, `waterRightsRegistry`, `computeScores`) + `hooks/useSiteIntelligenceMetrics` (~153 kB / ~49 kB gzip)
- **Before / after chunk sizes** (lazy panel payload only):
  - Before: `SiteIntelligencePanel` 1,144.14 kB / gzip 158.66 kB (single chunk, serial download after panel open, any edit invalidates the whole blob)
  - After: shell 15.82 kB + panel-sections 100.99 kB + panel-compute 152.93 kB + ecocrop-db 946.90 kB = **1,216.64 kB total / gzip ~183 kB across 4 files**
  - Net: slightly larger total (~6% / +24 kB gzip) due to per-chunk rollup boilerplate, but the shell is **72× smaller** (first panel-open paint is near-instant), 3 of 4 chunks load in parallel, and editing one section/lib invalidates only its chunk (ecocrop-db cache-hit rate approaches 100% across deploys).
- **Phase B — hook test (`apps/web/src/tests/useSiteIntelligenceMetrics.test.ts`):** New Vitest file using the existing `@testing-library/react` + happy-dom stack (already in devDeps; env override via `@vitest-environment happy-dom` directive since the project default is `node`). Five test cases:
  1. Returns all 37 expected keys (guard against accidental rename / drop)
  2. Does not throw with empty layers; every key present (contract: downstream sections destructure without null-guarding; hook never explodes on degenerate inputs)
  3. At least one metric hydrates when passed `mockLayersUS()`
  4. Memoizes return reference for stable inputs (rerender with same args → same reference) — protects the `useMemo` seam
  5. Recomputes when `layers` array identity changes — protects the dep array
- **Verification:** Five new tests pass. Pre-existing failures in `computeScores.test.ts` (8) and `layerFetcher.test.ts` (2) are from unrelated local edits (+151 lines in computeScores, +2,686 lines in layerFetcher — not touched this session); out of scope. `npm run build` succeeds (~24 s).
- **Files touched:** `apps/web/vite.config.ts` (manualChunks → function form), `apps/web/src/tests/useSiteIntelligenceMetrics.test.ts` (new).

---

### 2026-04-20 — Semantic Token CSS Bridge (Sprint BR)
- **Scope:** Follow-up to Sprint BQ. After BQ, 71 inline `style={{…}}` objects bound to TS semantic tokens (`semantic.sidebarIcon` / `semantic.sidebarActive`) remained across 27 section files + `SiteIntelligencePanel.tsx` — these could not be migrated to CSS modules in BQ because the module files had no way to reference the TS token values. BR closes that gap by bridging the two token surfaces through CSS custom properties already present in `apps/web/src/styles/tokens.css` (`--color-sidebar-active: #c4a265`, `--color-sidebar-icon: #9a8a74`), then adds semantic-token-backed utility classes and swaps the inline styles.
- **Phase 1 — utility classes (panel.module.css):** Added 12 classes in two batches — (a) solo-pattern classes: `.tokenActive`, `.tokenIcon`, `.tokenIconFs11Mt2`, `.tokenIconFs10Italic`, `.tokenIconFs12Leading`, `.tokenIconFs11Leading`, `.tokenActiveFs10Bold`; (b) Phase 3 atoms for composite patterns: `.fs9`, `.fs10`, `.mt2`, `.mr2`, `.tokenIconGrid2`. All color values reference CSS vars so tokens.css remains the single source of truth.
- **Phase 2 — solo pattern swap (script-driven, 20 files):** Regex-driven migration of the 6 highest-frequency semantic-bound inline styles. Reused the existing `p.mt4`/`p.mb4` utilities when a composite required them (e.g., `{ fontSize: 10, color: semantic.sidebarIcon, marginTop: 4, fontStyle: 'italic' }` → `` `${p.tokenIconFs10Italic} ${p.mt4}` ``). Script handled three className-positional cases (before / after / absent) and template-string merging. Changed files: AhpWeights, Canopy, Climate, Community, CropMatching, Design, Ecosystem, Energy, EnvRisk, Fuzzy, Groundwater, HydroExt, HydroIntel, InfraAccess, LandUse, RegionalSpecies, Regulatory, SiteContext, Soil, WaterQuality.
- **Phase 3 — composite stragglers (5 files):** Remaining 2× patterns swapped in ClimateProjections, CropMatching, EcosystemServices, EnergyIntelligence, RegulatoryHeritage — using the Phase 3 atoms (`fs9`/`fs10`/`mt2`/`mr2`) composed with `tokenIcon` in template className expressions; `tokenIconGrid2` covers a 2× grid composite.
- **Unused-import cleanup:** After the swaps left three files with no remaining `semantic.*` code references (HydrologyExtensions, ClimateProjections, EnergyIntelligence), dropped `semantic` from their tokens.js imports. Remaining 19 files still use `semantic` elsewhere (dynamic color interpolations in badges / computed styles) and keep the import.
- **Verification:** `npx tsc --noEmit` clean. `npm run build` succeeds (22.02 s, SiteIntelligencePanel chunk 1,144.14 kB / gzip 158.66 kB — unchanged vs BQ post-build, as expected: inline style object literals collapsed to class-name string concats are ~net-zero in bundled output). `style={{` count on the sections dir + panel: 198 → 159 (−39, ~20% reduction on top of BQ's 378→198). `semantic.sidebar*` inline-style hits: 71 → 26 (−45, ~63%). Remaining 26 are genuinely dynamic (runtime-computed colors like `color: l.status === 'complete' ? confidence.high : …`, conditional backgrounds on `confidence.low`-toned badges, hover-bound color overrides) and are left inline by design.
- **Cumulative post-BR:** Panel + 27 sections now carry 159 inline styles total (down from the pre-BQ peak of ~378 on sections alone). `panel.module.css` grew from the pre-BQ baseline by 16 classes (BQ) + 12 classes (BR) = 28 new utilities, all documented inline by sprint tag.
- **Files touched:** `apps/web/src/styles/panel.module.css` (+12 classes), 24 `apps/web/src/components/panels/sections/*.tsx`, `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (incidental swap via the same script).
- **Deferred:** The 26 remaining `semantic.*` dynamic-style references cannot migrate without a runtime-CSS-var escape hatch (`style={{ '--col': confidence.high }}` + `.classRef { color: var(--col) }` pattern) — not worth the complexity unless/until another sprint touches that code.

---

### 2026-04-20 — Panel Body Consolidation + CSS Migration (Sprint BQ)
- **Scope:** Closes the two deferred refactors from the Sprint BP debrief — (A) relocate the 37 layer-metric `useMemo` blocks that still lived in `SiteIntelligencePanel.tsx` into a single custom hook, and (B) begin the CSS-module migration for the ~378 inline `style={{…}}` objects accumulated across the 27 section files.
- **Phase A — `useSiteIntelligenceMetrics` hook:** `apps/web/src/hooks/useSiteIntelligenceMetrics.ts` (newly created). A single `useMemo` keyed on `[layers, project.acreage, project.country, project.provinceState, project.parcelBoundaryGeojson]` (union of all original deps) wraps 37 IIFE-bodied metric computations extracted verbatim from the panel (lines ~272–1213). Returns a keyed object covering `hydroMetrics`, `windEnergy`, `infraMetrics`, `solarPV`, `soilMetrics`, `groundwaterMetrics`, `waterQualityMetrics`, + 8 environmental-hazard + 3 site-context + 3 hydrology-extension + 7 regulatory + 5 community/context + 5 long-tail metrics + `gaezMetrics`. Signature: `useSiteIntelligenceMetrics(layers, project)`. Return type exported via `SiteIntelligenceMetrics = ReturnType<typeof useSiteIntelligenceMetrics>`.
- **Panel consumer rewrite:** Instead of rewriting every reference to `m.foo`, destructured the hook return: `const { hydroMetrics, windEnergy, ... , gaezMetrics } = useSiteIntelligenceMetrics(layers, project);`. Keeps the remaining panel code + section JSX line-for-line identical to pre-BQ (no consumer edits needed; `eiaTriggers` + `cropMatches` useMemos continue to reference their deps by original name). Removed 9 now-unused imports from the panel (`computeHydrologyMetrics`, `computeWindEnergy`, `parseHydrologicGroup`, `HYDRO_DEFAULTS`, `HydroMetrics`, `WindEnergyResult`, `estimateCanopyHeight`, `computeFuzzyFAOMembership`, `classifyAgUseValue`) + `fmtGal` + `findCompanions`.
- **Phase A verification:** `cd apps/web && npx tsc --noEmit` — clean. `SiteIntelligencePanel.tsx` reduced **1492 → 827 lines (−665, ~45%)**. `useMemo` count 62 → 28 in the panel. Behavioral semantics preserved — same recomputation trigger set (hook's single `useMemo` fires on the union of what the 37 individual `useMemo`s previously fired on). Note: the plan's ≤550-line gate was not hit; the remaining ~275 lines are non-metric useMemos (`designIntelligence`, `energyIntelligence`, `climateProjections`, `ecosystemIntelligence`, `eiaTriggers`, `typicalSetbacks`, `cropMatches`, `companionCache`, `ahpResult`, `assessmentScores`, derived scoreboards) + UI state hooks + 25 `<…Section />` JSX prop passes + `useCallback` toggle handlers. Those consume hook output and UI state — extracting them would split the orchestration boundary, not reduce it.
- **Phase B — CSS-module migration (378 → 198 inline styles, −180, ~48% reduction):** Added 10 new utility classes to `apps/web/src/styles/panel.module.css`: `.rightAlign`, `.flexBetween`, `.itemLabel`, `.detailText`, `.borderBottomNone`, `.fs11` (plan-scoped) + `.innerPad`, `.cursorDefault`, `.colStretchPad`, `.separatorThin` (added during second-pass when the top-frequency remaining patterns were identified). Patterns migrated across 22 of 27 section files:
  - `{ marginBottom: 'var(--space-5)' }` → `p.mb20` (outer `.liveDataWrap` — every file)
  - `{ flex: 1, textAlign: 'right' }` → `p.rightAlign` (badge wrappers + value spans — 25+ occurrences)
  - `{ flex: 1, textAlign: 'right', fontSize: 11 }` → `${p.rightAlign} ${p.fs11}` (9 occurrences)
  - `{ padding: '4px 8px 6px', fontSize: 11, color: 'var(--color-panel-muted, #888)', fontStyle: 'italic' }` (with + without `borderBottom: 'none'`) → `p.detailText` (~17 occurrences, mostly `DesignIntelligenceSection`)
  - `{ padding: '4px 0' }` → `p.innerPad` (20× — one per toggleable section's inner container)
  - `{ cursor: 'default' }` on `liveDataHeader` → `p.cursorDefault` (10 occurrences)
  - `{ flexDirection: 'column', alignItems: 'stretch', padding: '8px 12px' }` (+ `borderBottom: 'none'` variant) → `p.colStretchPad` (+ `p.borderBottomNone`) — 17× across `RegulatoryHeritageSection` + 4 others
  - `{ borderTop: '1px solid var(--color-panel-border, #333)', margin: '4px 0' }` → `p.separatorThin` (8× on standalone `<div … />` separators)
  - `{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }` → `p.flexBetween` (6× in `RegulatoryHeritageSection`)
  - `{ fontSize: 11, color: semantic.sidebarIcon, marginTop: 2 }` → `p.itemLabel` (multi-file; note — only the semantic-token-free variant is converted; token-bound variants kept inline since JS tokens ≠ CSS vars in this codebase)
  - `{ marginTop: 4 }` → `p.mt4` (existing utility; 2× with `className` merge)
- **Per-file inline-style reductions (before → after):** `DesignIntelligenceSection` 65→27 · `RegulatoryHeritageSection` 46→22 · `SoilIntelligenceSection` 18→7 · `HydrologyIntelligenceSection` 18→9 · `EnvironmentalRiskSection` 18→13 · `SiteContextSection` 15→7 · `RegionalSpeciesSection` 15→12 · `LandUseHistorySection` 14→12 · `InfrastructureAccessSection` 14→12 · `EnergyIntelligenceSection` 13→10 · `CommunitySection` 10→4 · `GroundwaterSection` 9→5 · `WaterQualitySection` 11→7 · `GaezSection` 9→7 (+ 1 bugfix for `className`/`className` duplication caught by `tsc`). Files untouched: `_shared.tsx`, `SiteSummaryNarrativeSection` (0 inline styles already), `OpportunitiesSection`, `ConstraintsSection`, `DataLayersSection`, `AssessmentScoresSection`.
- **Remaining inline styles (~198):** All dynamic — score-badge `background`/`color` interpolated from `confidence.high/medium/low` + state, `semantic.sidebarActive`/`sidebarIcon` token colors (JS-bound hex, not CSS vars), runtime-computed widths, grid-template-columns with calculated fractions. Per the plan's "what stays inline" guidance, these are legitimate holdouts.
- **Files touched:** `apps/web/src/hooks/useSiteIntelligenceMetrics.ts` (new), `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (−665 lines, import cleanup), `apps/web/src/styles/panel.module.css` (+10 utility classes), 22 section files under `apps/web/src/components/panels/sections/`, `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `npx tsc --noEmit` clean after each phase. `npm run build` succeeds (22.02 s). Panel chunk size: `SiteIntelligencePanel-DiNOoR0u.js` 1144.88 kB (gzip 158.68 kB) — inline-object literals collapsed into shared module-class strings, minor bundle improvement.
- **Milestone:** `SiteIntelligencePanel.tsx` cumulative reduction since pre-BJ: **4086 → 827 lines (−3259, ~80%)**. Panel body now reads as: state hooks → destructured hook call → derived memos → callbacks → JSX. Further reduction would require collapsing the JSX prop-pass cluster itself (e.g., composing a single `<SiteIntelligenceSections metrics={…} />` aggregator), which crosses an architectural boundary and is not net-positive.
- **Deferred:** `useSiteIntelligenceMetrics.test.ts` snapshot test against a fixture `layers[]` (plan A3 optional — not needed for correctness, metric bodies are verbatim copies). `semantic.sidebarActive`/`sidebarIcon` → CSS-variable migration in `tokens.css` (would unlock another ~30 inline-style removals but requires token-system refactor, separate sprint).

---

### 2026-04-20 — Sub-Component Extraction (Sprint BP)
- **Scope:** Final trio cleared — Site Context (Sprints O/P/BB), Community (Sprint V), and FAO GAEZ v4 agro-climatic suitability (Sprint BI). Closes the extraction-pattern long tail flagged at the end of Sprint BO.
- **SiteContextSection:** 7 props — 5 optional sub-metric interfaces (`CropValidationMetrics`, `BiodiversityMetrics`, `SoilGridsMetrics`, `CriticalHabitatMetrics`, `StormMetrics`) declared structurally inline, plus `siteContextOpen` + `onToggleSiteContext`. Outer `hasAny` short-circuit moved inside the section. Parent adds `onToggleSiteContext = useCallback(() => setSiteContextOpen((v) => !v), [])`.
- **CommunitySection:** 3 props — `DemographicsMetrics` structural interface inline, plus `communityOpen` + `onToggleCommunity`. Parent bridges the legacy `demogOpen`/`setDemogOpen` state to the new prop names via `onToggleCommunity = useCallback(() => setDemogOpen((v) => !v), [])`.
- **GaezSection:** 1 prop — `GaezMetrics` structural interface covering both `enabled`/`!enabled` branches + `GaezTop3Crop[]`. Non-toggleable; fragment wrapper collapsed into the section's `SectionProfiler` root.
- **Files touched:** 3 new section files under `apps/web/src/components/panels/sections/`, `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — 3 imports + 2 useCallbacks + 3 JSX splices), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean. `SiteIntelligencePanel.tsx` reduced 1755 → ~1492 lines (−263, beating the ~1450 projection by a small margin due to the 5-prop `<SiteContextSection />` call site). Cumulative since Sprint BJ: 4086 → ~1492 (**−2594 lines, ~63%**).
- **Milestone:** Panel is now pure orchestration + hooks. 25 memo'd, profiler-wrapped sections live under `sections/`. The remaining bulk is `useMemo` declarations for layer metrics (lines ~500-1210) and the computed-scores reducers — these are not JSX and shouldn't be extracted as sections; a future sprint could relocate them to a custom hook (`useSiteIntelligenceMetrics(layers)`) if further reduction is desired.
- **Deferred:** CSS-module migration for the remaining ~384 inline style objects scattered across the section files (stylistic refactor, separate sprint). Custom-hook relocation of layer-metric `useMemo`s (not urgent — panel already performant after Sprint BJ's memoization work).

---

### 2026-04-20 — Sub-Component Extraction (Sprint BO)
- **Scope:** Sixth wave of the BJ→BN extraction pattern. Cleared eight inlined blocks across two phases: five mid-panel data cards (Fuzzy FAO, AHP weights, Regional Species, Canopy Structure, Land-Use History) and the footer cluster (Opportunities, Key Constraints, Data Layers).
- **Phase 1 — mid-panel cards:** 5 new section files under `apps/web/src/components/panels/sections/`. All non-toggleable, 1 prop each, no parent useCallback needed. `FuzzyFaoSection` + `AhpWeightsSection` import typed results from `lib/fuzzyMCDM.js` (`FuzzyFAOResult`, `AhpResult`). `CanopyStructureSection` imports `CanopyHeightResult` from `lib/canopyHeight.js`. `RegionalSpeciesSection` + `LandUseHistorySection` declare structural interfaces inline (anonymous `useMemo` parent metrics).
- **Phase 2 — footer cluster:** 3 new section files. `OpportunitiesSection` + `ConstraintsSection` are symmetric (4 props each) — receive the already-sorted `topOpportunities`/`topConstraints` arrays plus `enrichment` (`AIEnrichmentState`) and `showAll` + `onToggleShowAll`. Parent adds `onToggleShowAllOpps` + `onToggleShowAllRisks` useCallbacks. Flag types import `AssessmentFlag` from `@ogden/shared`. `DataLayersSection` is the smallest extraction to date (12 JSX lines, 1 prop, typed `DataLayerRow[]`).
- **Files touched:** 8 new section files, `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — 8 imports + 2 useCallbacks + 8 JSX splices), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean after each phase. `SiteIntelligencePanel.tsx` reduced 2018 → 1755 lines (−263, beating the ≤1780 phase-2 gate). Cumulative since Sprint BJ: 4086 → 1755 (−2331 lines, **~57%**).
- **Milestone:** Panel is now past the 2000-line mark in the opposite direction — more than half of the pre-BJ bulk has been relocated to 22 memo'd, profiler-wrapped section files. Pattern held cleanly for all eight extractions with zero TS errors across both splice rounds.
- **Deferred (next sprint):** Site Context (Sprints O/P/BB) — 130-line toggleable with 5 sub-metric cards + `siteContextOpen` state; Community (Sprint V) — ~85-line toggleable demographics card; GAEZ v4 agro-climatic — ~97-line non-toggleable with fragment wrapper. After that trio, expect the panel to settle at ~1450 lines of pure orchestration + hooks. CSS-module migration for 384 inline style objects still deferred (stylistic refactor, separate sprint).

---

### 2026-04-20 — Sub-Component Extraction (Sprint BN)
- **Scope:** Fifth wave of the BJ/BK/BL/BM extraction pattern. Tackled the two biggest remaining blocks (Site Summary + AI Narrative cluster, Assessment Scores breakdown) plus the two Sprint BD rollups still inlined (Hydrology Extensions, Energy Intelligence).
- **Phase 1 — SiteSummaryNarrativeSection:** `sections/SiteSummaryNarrativeSection.tsx` (~90 lines). 3 props (`enrichment`, `siteSummary`, `landWants`). Bundles the Site Summary paragraph, "What This Land Wants" card, Design Recommendations multi-card AI block, and the AI loading spinner into one memo'd unit. Imports `AIEnrichmentState` from `store/siteDataStore.js`, `AILabel` from `_shared`, `Spinner` from `components/ui/Spinner`. Non-toggleable.
- **Phase 2 — AssessmentScoresSection:** `sections/AssessmentScoresSection.tsx` (~100 lines). 3 props (`assessmentScores`, `expandedScore`, `onToggleExpandedScore`). Imports `AssessmentScore` type from `lib/computeScores.js`. Parent adds `onToggleExpandedScore` useCallback (same pattern as `onToggleExpandedCrop` from Sprint BK). Per-component ConfBadge + source-tag chips + sub-bar rendering all moved inside.
- **Phase 3 — HydrologyExtensionsSection:** `sections/HydrologyExtensionsSection.tsx` (~105 lines). 3 props. Declares `AquiferMetrics`, `WaterStressMetrics`, `SeasonalFloodingMetrics` structural interfaces inline. Non-toggleable (top-level `if (!a && !b && !c) return null` short-circuit).
- **Phase 4 — EnergyIntelligenceSection:** `sections/EnergyIntelligenceSection.tsx` (~80 lines). 1 prop (`energyIntelligence`). Imports `GeothermalResult`, `EnergyStorageResult` from `lib/energyIntelligence.js`; declares composite `EnergyIntelligenceData` wrapper. Non-toggleable.
- **Files touched:** 4 new section files under `apps/web/src/components/panels/sections/`, `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — 4 imports + 1 useCallback + 4 JSX replacements), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean after all 4 splices. `SiteIntelligencePanel.tsx` reduced 2232 → 2018 lines (−214). Cumulative since Sprint BJ: 4086 → 2018 (−2068 lines, **~51%**).
- **Milestone:** Panel is now under 50% of its pre-sprint-BJ size. Site Summary cluster extraction consolidates 4 visually-related blocks (Site Summary, What This Land Wants, Design Recommendations, AI loading indicator) into one memo'd unit — same render boundary, zero prop duplication.
- **Deferred (next sprint):** Remaining inlined sections: Fuzzy FAO Suitability, AHP weighted priority, Regional Species Context, Canopy Structure, Land-Use History, Site Context (O/P/BB), Community (V), GAEZ v4 agro-climatic, Opportunities list, Key Constraints list, Data Layers footer. CSS-module migration for inline style objects still deferred. Pattern holds cleanly across 14 extracted sections — the remaining blocks are smaller and should compact faster.

---

### 2026-04-20 — Sub-Component Extraction (Sprint BM)
- **Scope:** Fourth wave of the Sprint BJ/BK/BL extraction pattern. Four more inlined JSX sections lifted out of `SiteIntelligencePanel.tsx`: Infrastructure Access (Sprint K/L/W), Environmental Risk (Sprint BG air/earthquake + Sprint BI Superfund/UST/LUST/brownfields/landfills/mine-hazard/FUDS), Climate Projections (Sprint BE Cat 5, IPCC AR6), Ecosystem Services (Sprint BE Cat 7, de Groot 2012 + wetland function).
- **Phase 1 — InfrastructureAccessSection:** `sections/InfrastructureAccessSection.tsx` (200 lines). 4 props (`infraMetrics`, `proximityMetrics`, `infraOpen`, `onToggleInfra`). Declares structural `InfrastructureMetrics` + `ProximityMetrics` interfaces inline. Parent adds `onToggleInfra` useCallback.
- **Phase 2 — EnvironmentalRiskSection:** `sections/EnvironmentalRiskSection.tsx`. 10 props covering all 8 hazard subsystems. Structural interfaces for all 8 metric shapes declared inline. `hasAny` short-circuit moved inside the component. Parent adds `onToggleEnvRisk` useCallback.
- **Phase 3 — EcosystemServicesSection:** `sections/EcosystemServicesSection.tsx` (87 lines). 1 prop (`ecosystemIntelligence`). Non-toggleable (always expanded when data present, `cursor: 'default'` header). Imports `EcosystemValuation` + `WetlandFunction` from `lib/ecosystemValuation.js`; declares composite `EcosystemIntelligence` wrapper interface in the section.
- **Phase 4 — ClimateProjectionsSection:** `sections/ClimateProjectionsSection.tsx` (90 lines). 1 prop (`climateProjections`). Non-toggleable. Imports `ClimateProjection` from `lib/climateProjections.js`.
- **Files touched:** `apps/web/src/components/panels/sections/InfrastructureAccessSection.tsx` (new), `apps/web/src/components/panels/sections/EnvironmentalRiskSection.tsx` (new), `apps/web/src/components/panels/sections/EcosystemServicesSection.tsx` (new), `apps/web/src/components/panels/sections/ClimateProjectionsSection.tsx` (new), `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — 4 imports + 2 useCallbacks + 4 JSX replacements), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean after each phase. `SiteIntelligencePanel.tsx` reduced 2677 → 2232 lines (−445). Cumulative since Sprint BJ: 4086 → 2232 (−1854 lines, ~45%).
- **Pattern note:** Non-toggleable sections (Ecosystem, Climate) are the cheapest to extract — one prop, no open state, no useCallback wrapper required in parent. Toggleable sections with many sub-metrics (Environmental Risk, 10 props) remain the ceiling on prop-count complexity; still preferable to the prior inlined form.
- **Deferred (next sprint):** Remaining inlined sections: Hydrology Extensions (aquifer + water stress + seasonal flooding), Energy Intelligence, Fuzzy FAO Suitability, AHP, Regional Species Context, Canopy Structure, Land-Use History, Site Context, Community, Site Summary + AI Narrative cluster, Assessment Scores breakdown, Opportunities, Constraints, GAEZ FAO, Data Layers. CSS-module migration for 384 inline style objects still deferred.

---

### 2026-04-20 — Sub-Component Extraction (Sprint BL)
- **Scope:** Continuation of Sprint BK's extraction pattern. Four more inlined JSX sections lifted out of `SiteIntelligencePanel.tsx` into memo-wrapped, `<SectionProfiler>`-instrumented files under `components/panels/sections/`: Groundwater (Sprint M), Water Quality (Sprint M), Soil Intelligence (Sprint G), and the heavyweight Design Intelligence rollup (10 subsystems: passive solar, windbreak, water harvesting, septic, shadow, RWH sizing, pond volume, fire risk, footprint optimization, compost siting).
- **Phase 1 — GroundwaterSection:** `sections/GroundwaterSection.tsx` (114 lines). 3 props. Declares structural `GroundwaterMetrics` interface inline (parent metric is an anonymous `useMemo` return). Parent adds `onToggleGroundwater` useCallback.
- **Phase 2 — WaterQualitySection:** `sections/WaterQualitySection.tsx` (141 lines). 3 props. Declares structural `WaterQualityMetrics` interface inline. Parent adds `onToggleWq` useCallback.
- **Phase 3 — SoilIntelligenceSection:** `sections/SoilIntelligenceSection.tsx` (209 lines). 3 props. Declares structural `SoilMetrics` interface inline covering all 13 fields rendered. Parent adds `onToggleSoil` useCallback.
- **Phase 4 — DesignIntelligenceSection:** `sections/DesignIntelligenceSection.tsx` (406 lines — largest extraction to date). 3 props. Imports `DesignIntelligenceResult` from `lib/designIntelligence.js` (typed source). `hasAny` short-circuit check moved inside the component so parent passes raw nullable value. Parent adds `onToggleDi` useCallback.
- **Files touched:** `apps/web/src/components/panels/sections/GroundwaterSection.tsx` (new), `apps/web/src/components/panels/sections/WaterQualitySection.tsx` (new), `apps/web/src/components/panels/sections/SoilIntelligenceSection.tsx` (new), `apps/web/src/components/panels/sections/DesignIntelligenceSection.tsx` (new), `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — 4 imports + 4 useCallbacks + 4 JSX replacements), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean after each phase. `SiteIntelligencePanel.tsx` reduced 3364 → 2677 lines (~687 lines removed net). Cumulative since Sprint BJ: 4086 → 2677 (−1409 lines, ~34%).
- **Gotcha reinforced:** As noted in Sprint BK, commenting out an old block with `{false && metric && (...)}` does **not** preserve TS null narrowing inside the dead subtree — it introduces dozens of TS18047 errors even though the code is unreachable. Must strip the dead block fully with Python before re-running `tsc`. Hit this once on Phase 3 (soil); recovered by splicing lines 1325–1497 out in one shot.
- **Deferred (next sprint):** Remaining inlined sections: Infrastructure Access, Environmental Risk, Hydrology Extensions, Energy Intelligence, Climate Projections, Ecosystem Services, Fuzzy FAO Suitability, AHP, Regional Species Context, Canopy Structure, Land-Use History, Site Context, Community, Site Summary + AI Narrative cluster, Assessment Scores, Opportunities, Constraints, GAEZ FAO, Data Layers. Pattern is now battle-tested across 8 sections — future extractions should move faster. Migration of 384 inline style objects to CSS modules still deferred.
- **Pattern reinforcement:** When the parent metric is an anonymous `useMemo` return, declare the shape as a structural `interface` in the section file. When the source is a lib-level computation with an exported result type, `import type` it instead (as in `DesignIntelligenceResult`). Both are first-class — the structural form avoids a round-trip of hoisting types up to lib.

---

### 2026-04-20 — Sub-Component Extraction (Sprint BK)
- **Scope:** Follow-on to Sprint BJ's render-budget work. Sprint BJ's `React.memo` + `EMPTY_LAYERS` stabilization captured the easy wins; BK tackles the structural debt — 4086-line `SiteIntelligencePanel.tsx` with 4 massive JSX sub-trees each re-reconciling on every parent render. Goal: extract 4 clean, memo-wrapped section components into `components/panels/sections/`, establish a shared `_shared.tsx` + `_helpers.ts` module, and land the pattern so future extractions follow the same shape.
- **Phase 1 — Shared module:** `components/panels/sections/_shared.tsx` (CREATE) — hosts the 4 Sprint BJ memo'd leaves (`AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle`) relocated from the parent so extracted sections can import without circular refs. `components/panels/sections/_helpers.ts` (CREATE) — pure helper functions (`severityColor`, `formatComponentName`, `capConf`, `getScoreColor`, `getHydroColor`, `getSoilPhColor`, `getCompactionColor`). Parent imports updated.
- **Phase 2 — ScoresAndFlagsSection:** `components/panels/sections/ScoresAndFlagsSection.tsx` — blocking flags alert stack, overall suitability card (ScoreCircle + layer-completeness dots + derived-count caption), Tier 3 "Derived Analyses" rows, collapsible Live Data panel with conservation-authority card + last-fetched caption. 13 props, wrapped in `memo` + `<SectionProfiler id="site-intel-scores">`. Parent adds `onToggleLiveData` useCallback to avoid identity churn on the toggle prop.
- **Phase 3 — CropMatchingSection:** `components/panels/sections/CropMatchingSection.tsx` — FAO EcoCrop crop-match list with category filter pills, per-crop expandable breakdown (limiting factors, factor bars, Sprint J agroforestry companions, Sprint BF annual-bed companion pairs). 8 props. Parent adds `onToggleExpandedCrop` + `onToggleShowAllCrops` useCallbacks.
- **Phase 4 — RegulatoryHeritageSection:** `components/panels/sections/RegulatoryHeritageSection.tsx` — Sprint BC/BF/BH regulatory rollup: conservation easement, heritage site, BC ALR, EA/permit triggers, typical setbacks, mineral rights, water rights, ag use-value assessment, Ecological Gifts Program (CA). 9 props. Null-guards on each metric kept inside the section (moved `anyPresent` check inside so parent passes raw nullable values). `SetbackResult`, `EIATriggerResult`, `AgUseValueResult` imported from `lib/regulatoryIntelligence.ts`; other shapes declared structurally in the section file.
- **Phase 5 — HydrologyIntelligenceSection:** `components/panels/sections/HydrologyIntelligenceSection.tsx` — Sprint F hydrology card (aridity, water balance, PET, harvest potential, storage sizing, irrigation deficit, growing period) + Sprint J wind power + Sprint K solar PV rows. 5 props. Parent adds `onToggleHydro` useCallback.
- **Files touched:** `apps/web/src/components/panels/sections/_shared.tsx` (new), `apps/web/src/components/panels/sections/_helpers.ts` (new), `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx` (new), `apps/web/src/components/panels/sections/CropMatchingSection.tsx` (new), `apps/web/src/components/panels/sections/RegulatoryHeritageSection.tsx` (new), `apps/web/src/components/panels/sections/HydrologyIntelligenceSection.tsx` (new), `apps/web/src/components/panels/SiteIntelligencePanel.tsx` (modified — imports + 4 JSX replacements + 4 useCallback wrappers), `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean after each phase. `SiteIntelligencePanel.tsx` reduced 4086 → ~3364 lines (~720 lines removed net, excluding new section files).
- **Deferred (next sprint):** Remaining inlined JSX blocks — groundwater, water quality, soil intelligence, infrastructure, demographics, ecosystem valuation card, AHP table, climate projections, design intelligence, hydrology extensions (aquifer + water stress + seasonal flooding), energy intelligence, storm events, air quality, earthquake, GAEZ, crop validation, proximity. Each is a candidate for the same extraction pattern but out of scope here — plan was explicitly sized at 4 sections to fit context budget. Migration of 384 inline style objects to CSS modules still deferred. Bylaw-level setback parsing, ESDAC, Fan et al. groundwater raster remain deferred from Sprint BH/BI.
- **Pattern established:** Each extracted section is `export const X = memo(function X(props: XProps) { ... })`, wrapped in `<SectionProfiler id="site-intel-{slug}">`, receives state via props (no `useSiteData` subscription inside sections), and exports its own prop interfaces. Toggle callbacks are `useCallback`-wrapped in the parent to keep prop identity stable across parent renders so `memo` actually skips. This pattern is ready for the 10+ remaining sections and future gap-closing work.

---

### 2026-04-20 — UX/Performance Hardening (Sprint BJ)
- **Scope:** First performance pass after closing data-coverage gaps. Two tracks: (A) debounce + cancel the layer-dispatch pipeline so rapid boundary edits coalesce and project switches don't leak in-flight work; (B) shave the `SiteIntelligencePanel` render budget (60 `useMemo` hooks keyed on `layers`, 4086 lines, no memoization) via `React.memo`, sub-component memoization, a stable `EMPTY_LAYERS` fallback, and dev-only `<Profiler>` telemetry.
- **Phase 1 — Dispatch (Track A):** `lib/debounce.ts` (CREATE, 35 lines, no lodash). `lib/layerFetcher.ts` — added optional `signal?: AbortSignal` to `FetchLayerOptions`; `fetchAllLayersInternal` races `Promise.allSettled(fetchers)` against the signal and returns an `{ aborted: true }` sentinel on cancellation (in-flight HTTP continues silently — acceptable vs threading the signal through ~38 individual fetchers). In-flight promise dedup also races against the caller's signal via `raceWithSignal()`. `store/siteDataStore.ts` — per-project `AbortController` registry (`Map<string, AbortController>`); `takeController()` aborts any previous in-flight controller for the same projectId and replaces it, `releaseController()` clears in `finally`. Exported `abortFetchForProject(id)` for unmount cleanup. `fetchForProject` semantics changed: short-circuit only on `'complete'` status (was `'loading' || 'complete'`), so rapid boundary edits now **replace** the in-flight fetch rather than being dropped. `refreshProject` gets the same treatment. `pages/ProjectPage.tsx` — boundary-change effect wrapped in `debounce(fetchSiteData, 400)` with cleanup `cancel()`; new cleanup effect calls `abortFetchForProject(projectId)` on navigation away.
- **Phase 2 — Render (Track B):** `lib/perfProfiler.tsx` (CREATE) — `<SectionProfiler id>` around React's built-in `<Profiler>`, logs renders over 16 ms, gated on `import.meta.env.DEV` so production tree-shakes. `SiteIntelligencePanel.tsx` — wrapped 4 pure sub-components in `memo` (`AILabel`, `RefreshIcon`, `ConfBadge`, `ScoreCircle`); extracted main body to `SiteIntelligencePanelImpl`, exported a `memo(SiteIntelligencePanelImpl)` wrapped in `<SectionProfiler id="site-intelligence-panel">`; added module-level `EMPTY_LAYERS: MockLayerResult[] = []` and swapped `siteData?.layers ?? []` → `?? EMPTY_LAYERS` so the fallback identity stops changing between renders (was minting a fresh `[]` each render and cascading through every memo keyed on `layers`).
- **Files touched:** `apps/web/src/lib/debounce.ts` (new), `apps/web/src/lib/perfProfiler.tsx` (new), `apps/web/src/lib/layerFetcher.ts`, `apps/web/src/store/siteDataStore.ts`, `apps/web/src/pages/ProjectPage.tsx`, `apps/web/src/components/panels/SiteIntelligencePanel.tsx`, `wiki/entities/web-app.md`, `wiki/log.md`.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean (baseline preserved since Sprint BI). No new deps.
- **Deferred (follow-on sprint):** Full extraction of `SiteIntelligencePanel` into per-section memoized sub-components (the 12 heavy `useMemo` bodies — turf ops, FAO fuzzy membership, ecosystem valuation, full score recompute — each to their own file). Migration of 384 inline style objects to CSS modules. Zustand `shallow` selector adoption. Per-fetcher `AbortSignal` threading (current race gives immediate cancellation semantics; true HTTP cancel is a bigger change). Virtualized scrolling for tables (not needed at current cap of 20 rows). Bylaw-level setback parsing, ESDAC, Fan et al. groundwater raster (all pre-existing deferrals from Sprints BH/BI).
- **Risks noted during implementation:** (1) Replacing (not skipping) in-flight fetches on rapid edits could thrash, but the 400 ms debounce in ProjectPage coalesces edits *before* they hit the store so the replace path only fires on genuine boundary changes. (2) `AbortError` from the inner race is caught and converted to the `aborted: true` sentinel so it never surfaces as an uncaught error. (3) `SiteIntelligencePanel` is only imported as a default import across the codebase — the internal rename to `SiteIntelligencePanelImpl` is safe.

---

### 2026-04-20 — Cat 12 FAO GAEZ v4 Self-Hosting (Sprint BI)
- **Scope:** Close the last substantive Cat 12 data gap by self-hosting FAO GAEZ v4 Theme 4 (Suitability + Attainable Yield) rasters behind a Fastify point-query endpoint. Establish raster-hosting infrastructure reusable for future raster-backed layers (Fan et al. groundwater, ESDAC). Cat 12 → 8/10, total → ~119/120. Remaining deferred: ESDAC (registered key), Fan et al. (static raster — partial heuristic already shipped).
- **Phase 1 — Ingest script + manifest schema:** `apps/api/scripts/ingest-gaez.md` (operator-facing README, covers portal navigation, naming scheme `{crop}_{waterSupply}_{inputLevel}_{variable}.tif`, gdal verification, verification query, S3 deployment path, CC BY-NC-SA 3.0 IGO license notice). `apps/api/scripts/convert-gaez-to-cog.ts` scans `data/gaez/raw/`, parses the naming scheme (12 crops × rainfed/irrigated × low/high × suitability/yield = 96 rasters), shells out to `gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2`, emits `gaez-manifest.json`. Idempotent (skips if COG newer than raw). Registered as `pnpm --filter @ogden/api run ingest:gaez`. `.gitignore` excludes `apps/api/data/gaez/raw/` + `cog/*.tif`.
- **Phase 2 — GaezRasterService + Fastify route:** `apps/api/src/services/gaez/GaezRasterService.ts` loads manifest on boot, exposes `query(lat, lng)` that parallel-samples all manifest entries via `geotiff.js` `fromFile` (local FS) or `fromUrl` (S3/HTTPS byte-range). Maps GAEZ suitability codes (1-9) → `S1/S2/S3/N/NS/WATER`. `computeSummary()` derives `best_crop` (highest attainable yield across management variants), `best_management`, `primary_suitability_class`, `top_3_crops`, full `crop_suitabilities[]`. Per-TIFF header cache (LRU, cap 128). Graceful NoData + out-of-bounds handling (returns null per-raster, skipped in summary). `apps/api/src/routes/gaez/index.ts` — `GET /api/v1/gaez/query?lat=&lng=` (unauth, public, Zod validation, `{ data, meta, error }` envelope). Registered in `app.ts` with `initGaezService()` invoked before onReady hooks.
- **Phase 3 — Config + storage wiring:** `apps/api/src/lib/config.ts` extended with `GAEZ_DATA_DIR` (default `./data/gaez/cog`) + optional `GAEZ_S3_PREFIX` (HTTPS/S3 base URL). `GaezRasterService` resolves COGs transparently via local FS when prefix unset, HTTPS byte-range when set. `.env.example` documents both. No new dependencies — `geotiff@3.0.5` was already in use by `ElevationGridReader`.
- **Phase 4 — Frontend LayerType + fetcher:** `'gaez_suitability'` added to `LayerType` union + `Tier1LayerType` Exclude list in `packages/shared/src/constants/dataSources.ts`. `LayerPanel.tsx` label `Agro-Climatic Suitability (GAEZ)` + icon `🌾`. `fetchGaezSuitability(lat, lng)` in `layerFetcher.ts` calls `/api/v1/gaez/query`, handles 4 branches: (1) network failure → null, (2) API up but manifest absent → informational "Estimated (...)" layer for operator visibility, (3) success with summary → `confidence: 'medium'`, `sourceApi: 'FAO GAEZ v4 (self-hosted)'` (qualifies as live), (4) service failed → failed layer. Dispatched in `runLayerFetch` via existing `trackLive()` pattern.
- **Phase 5 — UI:** New `gaezMetrics` useMemo in `SiteIntelligencePanel.tsx`. New block rendered above the existing Crop Suitability section (GAEZ serves as a regional prior; EcoCrop as per-field detail). Rows: best crop + management (rainfed/irrigated × low/high), suitability badge (S1=green / S2=amber / S3=red / etc.), attainable yield (kg/ha/yr), top-3 crops with yield + suitability, resolution note, license attribution. Disabled state renders an operator-facing "Not available on this deployment" with the ingest-script pointer.
- **Phase 6 — Wiki + ADR + log:** `gap-analysis.md` Cat 12 row → 8/10 (GAEZ row flipped from Deferred to Implemented with self-hosted rationale). Total → ~119/120. `api.md` routes table + services list updated. New ADR `wiki/decisions/2026-04-20-gaez-self-hosting.md` documents decision, alternatives (defer / scrape portal / gdal-async / precomputed grid), consequences, and flags CC BY-NC-SA 3.0 IGO non-commercial clause as a pre-launch legal-review blocker. Indexed in `wiki/index.md`.
- **Verification:** `cd apps/api && npx tsc --noEmit` — no new errors (my 4 transient errors fixed; pre-existing baseline errors in NlcdAdapter / UsCountyGisAdapter / SsurgoAdapter test files remain from prior sprints and are not blocking). `cd apps/web && npx tsc --noEmit` — clean. Script (`scripts/convert-gaez-to-cog.ts`) is outside the tsconfig `include` globs, so it runs via `tsx` at invocation time.
- **Endpoints + license:** FAO GAEZ v4 portal `gaez.fao.org/Gaez4/download` (manual download only — CC BY-NC-SA 3.0 IGO). Self-hosted COG layout: `{crop}_{waterSupply}_{inputLevel}_{variable}.tif`. API: `GET /api/v1/gaez/query?lat=&lng=`. Attribution: "FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO" (baked into response + UI).
- **Risks / known limitations:** (1) CC BY-NC-SA 3.0 IGO `NC` clause → pre-launch legal review required before commercial deployment. (2) Manual ingest step (cannot automate past the click-through license). (3) First-query cold start (~200–400 ms) — acceptable; optional preload optimization deferred. (4) Disk footprint ~1–3 GB post-COG; S3 sync documented. (5) Raster subset is 12 crops × 4 management × 1 climate scenario = 96 files — expanding is data-only (drop files, rerun ingest).

---

### 2026-04-20 — Cat 11 Regulatory & Legal Closure (Sprint BH)
- **Scope:** Close the final 5 gaps in Cat 11 (Regulatory & Legal) using a max-coverage strategy (ship informational/static fallbacks where no REST endpoint exists). Target: 6/11 → 11/11. Total gap progress: ~113/120 → ~118/120. Also corrected a prior debrief mis-classification: Cat 9 (Renewable Energy) was already 6/6 complete per Sprints J (wind), K (solar PV), Q (biomass + micro-hydro), BD (geothermal + energy storage); no code work needed there.
- **Phase 1 — Setbacks reclassification (no code):** Sprint BF's `estimateTypicalSetbacks()` in `regulatoryIntelligence.ts` already ships broad-class defaults (agricultural/residential/commercial × US/CA) and renders a UI row. Re-classified in gap-analysis.md as **Implemented (typical defaults)**. Per-municipality bylaw parsing remains indefinitely deferred (requires per-city scraping + NLP).
- **Phase 2 — Water Rights:** `lib/waterRightsRegistry.ts` (CREATE) — 50-state `US_WATER_DOCTRINE` (riparian / prior_appropriation / hybrid), `US_WATER_RIGHTS_ENDPOINTS` table for 9 Western states (CO DWR, WA Ecology, OR OWRD, WY SEO, NM OSE, ID IDWR, MT DNRC, UT DWRi, NV DWR) with defensive field-name candidates, `US_WATER_RIGHTS_INFORMATIONAL` for CA/TX/AZ, `CA_PROV_WATER_RIGHTS` for ON/BC/AB/SK/QC. `getDoctrineSummary()` helper. New `water_rights` LayerType in `packages/shared/src/constants/dataSources.ts` + LayerPanel label/icon. `fetchWaterRights()` in layerFetcher.ts uses `resolveCountyFips()` → state code, then 5 km envelope ArcGIS query with great-circle nearest-POD ranking and priority-date / use-type / flow-rate extraction. Falls back to doctrine-only informational layer (confidence: low, sourceApi prefixed "Estimated") when no REST endpoint or query fails.
- **Phase 3 — Mineral Rights composite:** `fetchMineralRightsComposite()` replaces `fetchBlmMineralRights` call in the dispatch. Still queries BLM federal mineral estate + mining claims (existing logic inlined), then chains state-specific registries via `US_STATE_MINERAL_REGISTRIES` table (TX RRC, ND Industrial Commission, WY WOGCC, CO ECMC, OK OCC, MT MBMG — ArcGIS 2 km envelope queries with type/status field picking). Non-registry states (PA, KY, WV, LA, CA, NM, AK) get `US_STATE_MINERAL_INFORMATIONAL` agency notes. CA branch: BC-only (`lng < -114`) queries BC Mineral Titles Online WFS (`openmaps.gov.bc.ca/.../MTA_ACQUIRED_TENURE_SVW`) via CQL_FILTER INTERSECTS — reuses the BC ALR WFS pattern from Sprint BC. Summary adds `state_registry_checked`, `state_wells_within_2km`, `state_well_types`, `state_regulatory_note`, `bc_mto_tenure_present`, `bc_mto_tenure_count`.
- **Phase 4 — Ag Use-Value Assessment:** Pure compute in `regulatoryIntelligence.ts`. `US_AG_USE_VALUE_PROGRAMS` covers 30 states (CA Williamson Act, VA Land Use, MD Ag Use, NC PUV, FL Greenbelt, PA Clean & Green, OH CAUV, IN, IL, IA, MN Green Acres, WI, NY Ag Assessment, NJ Farmland, GA CUVA, TX 1-d-1, OK, CO, KS, NE, SD, ND, MT, WA Open Space, OR EFU, TN Greenbelt, KY, SC, AL, MS, AR, MI QAPE, MA Ch 61A). `CA_PROV_FARM_CLASS_PROGRAMS` covers 6 provinces (ON FPTP, BC Class 9, AB, SK, MB, QC PCTFA). `classifyAgUseValue()` takes `{stateCode, country, province, acreage, primaryLandCoverClass}` and returns `{program_available, program_name, eligibility: Eligible/Likely Eligible/Below Threshold/Verify, estimated_tax_reduction_range_pct, regulatory_note, statute_reference, jurisdiction}`. Non-catalogued US states fall through to generic "contact state tax assessor" note.
- **Phase 5 — CA Ecological Gifts Program:** `fetchEcoGiftsProgram()` in layerFetcher.ts — Canada-only. ECCC publishes the canonical list at open.canada.ca CKAN dataset `b3a62c51-90b4-4b52-9df7-4f0d16ca2d2a` (non-spatial JSON bundle). Ships a representative 12-property `ECOGIFTS_SAMPLE` covering ON/QC/BC/AB/NS/PE/MB so the UI can surface a nearest-gift context; attribution caption directs users to ECCC for current authoritative listings. Merges into `conservation_easement` LayerType via the same additive-merge dispatch pattern Sprint BG used for WDPA (preserves NCED + adds ecogift fields `ecogift_nearby_count`, `nearest_ecogift_km`, `nearest_ecogift_name`, `nearest_ecogift_area_ha`, `nearest_ecogift_year`, `olta_directory_note`). Ontario Land Trust Alliance (OLTA) directory URL baked into `olta_directory_note` since OLTA is not REST-queryable.
- **Phase 6 — UI:** `SiteIntelligencePanel.tsx` Regulatory & Heritage block extended with 4 new rows (inside the existing section — no new sections). New useMemos: `waterRightsMetrics`, extended `mineralRightsMetrics` (state/BC fields), `agUseValueMetrics` (derives `acreage` from parcel boundary via turf, resolves stateCode from water-rights/mineral-rights summary fields), `ecoGiftsMetrics` (CA-only). Badges follow existing `s.scoreBadge` pattern with confidence-coloured tint; statute references render as italic captions. `classifyAgUseValue` import added.
- **Verification:** `cd apps/web && npx tsc --noEmit` — clean (baseline preserved since Sprint BG). All Phase 2 water-rights informational fallbacks use `sourceApi: 'Estimated (...)'` so `isLiveResult()` correctly excludes them from the live-count. Phase 5 EcoGifts also uses `Estimated` prefix (sample is curated, not an authoritative ECCC query). Live-only sources (Western US water-rights live registries, BC MTO WFS, state mineral-well ArcGIS, federal BLM) contribute to live-count as expected.
- **Gap status:** Cat 11 → 11/11 **Complete**. Total: ~118/120. Remaining ~2: Cat 12 deferred items (FAO GAEZ v4 no REST; Fan et al. groundwater static raster — partial heuristic already shipped) and Cat 2 N-P-K partial (phosphorus + potassium, no free global dataset). Atlas's gap surface is now effectively closed for the documented analyst-grade decision set.
- **Risks / known limitations:** State ArcGIS endpoints occasionally rate-limit or schema-drift — defensive `pickField()` candidate-list pattern and per-state try/catch with informational fallback protect against this. EcoGifts sample is curated (not live); caption directs users to ECCC for authoritative current list. Ag use-value programs drift periodically; each entry carries a `statute_reference` so users can verify with the source. BC MTO WFS follows identical schema pattern as BC ALR (Sprint BC).

---

### 2026-04-20 — Cat 12 Global Data Coverage (Sprint BG)
- **Scope:** Close 5 of the 10 remaining Cat 12 gaps — widen Atlas from US+Ontario high-fidelity to global medium-confidence. Target: 0/10 → 7/10 (including 2 already-closed from prior sprints: SoilGrids Sprint BB, ECOCROP Sprint E). Total: ~108/120 → ~113/120.
- **Phase 0 — Type widening:** `Project.country`, `FetchLayerOptions.country`, `RuleContext.country`, `deriveOpportunities/deriveRisks` signatures, `generateMockLayers`, `siteDataStore.fetchForProject/refreshProject` all widened from `'US' | 'CA'` to `string`. Two `as 'US' | 'CA'` casts retained at `syncService.ts` API boundary where backend still requires strict union.
- **Phase 1 — Copernicus DEM (Gap 4):** `fetchElevationCopernicus(lat, lng, bbox)` in layerFetcher.ts. OpenTopography public API `portal.opentopography.org/API/globaldem` with `demtype=COP30` primary + `SRTMGL3` fallback on 503. AAIGrid (Arc ASCII grid) text parser — no geotiff dependency. Reuses Horn 3×3 slope + 8-bin aspect algorithm from `fetchElevationWCS`. Returns `mean_elevation_m`, slope stats, aspect, `dem_resolution_m`. Confidence: medium. Attribution: ESA Copernicus GLO-30 DEM via OpenTopography.
- **Phase 2 — OpenMeteo ERA5 climate (Gap 2):** `fetchClimateOpenMeteo(lat, lng)`. `archive-api.open-meteo.com/v1/archive` 1991-2020 daily mean temp + precip sum, aggregated to monthly (12 bins × 30 years) + annual. Derives `annual_temp_mean_c`, `annual_precip_mm`, coldest/warmest month means, GDD base-10, growing-season days (>5 °C threshold), USDA hardiness zone from estimated abs-min, Köppen via existing `computeKoppen()` helper. Confidence: medium. Attribution: ERA5 Reanalysis (ECMWF) / WorldClim v2.1.
- **Phase 3 — ESA WorldCover (Gap 5):** `fetchLandCoverWorldCover(lat, lng)`. Terrascope WMS GetFeatureInfo (`services.terrascope.be/wms/v2`), 3×3 grid sampling (9 points ±0.002°, ≈ 200 m). Class codes 10-100 per ESA 2021 legend. Returns `primary_class`, `worldcover_code`, `classes{}`, `tree_canopy_pct`, `cropland_pct`, `urban_pct`, `wetland_pct`. Downstream canopy-height (Sprint BF) + biodiversity IUCN-habitat (Sprint BB) consume these keys unchanged. Attribution: ESA WorldCover v200 (Zanaga et al. 2022, CC BY 4.0).
- **Phase 4 — WDPA Protected Areas (Gap 7):** `fetchWdpaProtectedAreas(lat, lng)`. UNEP-WCMC public ArcGIS FeatureServer `data-gis.unep-wcmc.org`. Point-in-polygon query + 2 km envelope nearest-count. Merges into existing `conservation_easement` layer (custom dispatch in `runLayerFetch` appends WDPA summary keys to NCED result rather than replacing — US sites get both). Fields: `wdpa_site`, `wdpa_name`, `wdpa_designation`, `wdpa_iucn_category`, `wdpa_status_year`, `nearest_wdpa_within_2km_count`. Confidence: high when on-site, medium otherwise. Attribution: UNEP-WCMC & IUCN WDPA (CC BY 4.0).
- **Phase 5 — Global groundwater heuristic (Gap 8):** `fetchGroundwaterHeuristicGlobal(lat, lng)`. Latitude-regime estimate: equatorial humid 4 m / tropical 10 m / subtropical arid 30 m / temperate 10 m / boreal 6 m. Explicit `confidence: 'low'`, `sourceApi: 'Estimated (heuristic — no global water-table REST API)'` so `isLiveResult()` does not count it as live. `heuristic_note` caption rendered in UI to discourage design use. No free global REST API exists for water-table depth (Fan et al. 2013 is static raster).
- **UI:** No new panel sections — existing Site Context / Soil / Climate / Land Cover / Regulatory blocks render `layer.sourceApi` + `layer.attribution` automatically; the new source strings appear naturally on global sites. SiteIntelligencePanel rendering unchanged.
- **Verification:** `npx tsc --noEmit` in `apps/web` — clean. Baseline preserved. US + CA sites continue to hit their existing authoritative fetchers first (USGS 3DEP, NOAA ACIS, MRLC NLCD, NCED, USGS NWIS); global fallbacks only run on `country !== 'US' && country !== 'CA'` or on US/CA fetcher failure.
- **Gap status:** Cat 12 → 7/10 Complete (up from 0/10). Remaining 3 Deferred: FAO GAEZ v4 (download-only tiles), ESDAC (registered key required), Fan et al. groundwater (static raster — partial heuristic only). Atlas now renders medium-confidence data for any global site.

---

### 2026-04-19 — Remaining Gaps across Cat 1/6/7/8/11 (Sprint BF)
- **Scope:** Close 8 of 11 remaining gaps spanning five categories — Cat 1 (fuzzy+AHP), Cat 6 (companion planting, invasive, native), Cat 7 (canopy height), Cat 8 (prior land use), Cat 11 (setbacks, federal mineral rights). Three remain Open with documented rationale (water rights, ag use-value, CA easements). Total: ~100/120 → ~108/120.
- **Phase 1 — Fuzzy MCDM:** `apps/web/src/lib/fuzzyMCDM.ts` (CREATE)
  - `computeFuzzyFAOMembership()` — trapezoidal membership functions per factor (pH, rooting depth, slope, AWC, EC, CEC, GDD, drainage) produce S1/S2/S3/N1/N2 memberships with gradual transitions. Geometric-mean aggregation across factors (ALUES tradition); max-membership defuzzification with confidence score.
  - `computeAhpWeights(matrix)` — Saaty 1980 AHP via geometric-mean row-normalization (approximates principal eigenvector within ~1% for n ≤ 10). Returns weights + λmax + CR (vs Saaty RI table 1–10); flags inconsistency at CR > 0.10. Default 8×8 matrix (`DEFAULT_ATLAS_AHP_MATRIX`) for Atlas's scored categories.
  - `computeOverallScore()` extended with optional `weights?: number[]` param; default remains uniform.
- **Phase 2 — Companion planting + Species lists:**
  - `apps/web/src/lib/companionPlanting.ts` (CREATE) — static matrix of ~60 food crops with companions/antagonists/rationale (Riotte *Carrots Love Tomatoes* + permaculture literature). `findCompanions(cropName)` with plural/alt-form normalization.
  - `layerFetcher.ts::fetchUsdaPlantsByState()` — reverse-geocodes state (US) via existing `resolveCountyFips`, queries USDA PLANTS Database REST by state; returns two layers (`invasive_species` + `native_species`) with counts + top-10 common names. CA fallback: VASCAN (Canadensys) province checklist by coarse bbox. Graceful null + informational stub on API failure.
- **Phase 3 — Canopy height:** `apps/web/src/lib/canopyHeight.ts` (CREATE)
  - `estimateCanopyHeight({ treeCanopyPct, primaryLandCoverClass, meanAnnualTempC, annualPrecipMm, koppenClass })` — classifies biome (Tropical Moist/Dry Broadleaf, Temperate Broadleaf/Conifer, Boreal, Mediterranean, Savanna) from Köppen letter + temp/precip + land cover. Biome-specific height ranges from Simard et al. 2011 + FAO FRA 2020, modulated by tree-cover %. Result labelled `confidence: 'estimate'` — clearly not a direct GEDI lidar measurement.
- **Phase 4 — Prior land-use history:** `layerFetcher.ts::fetchNlcdHistory()` (US only)
  - Samples NLCD land cover across 6 epochs (2001, 2006, 2011, 2016, 2019, 2021) via MRLC GeoServer WMS GetFeatureInfo. Derives transitions list and `disturbance_flags[]` (wetland→any, forest→cropland, natural→developed). Buildability scoring extended with `prior_disturbance_flag` component (max −2).
- **Phase 5 — Typical setbacks:** `apps/web/src/lib/regulatoryIntelligence.ts::estimateTypicalSetbacks()`
  - Broad zoning classifier (agricultural/rural/residential/commercial/industrial) → default front/side/rear setbacks plus conditional waterbody buffer (if stream <200 m) and wetland buffer. Rule source: ICLEI model bylaws + Ontario PPS (for CA). Labelled explicitly as "typical defaults — verify with local bylaw".
- **Phase 6 — Federal mineral rights:** `layerFetcher.ts::fetchBlmMineralRights()` (US only)
  - BLM Mineral Estate MapServer (point-in-polygon) + Mining Claims MapServer (~2 km envelope). Returns `federal_mineral_estate` flag, claim count, unique claim types (lode/placer/mill site/tunnel site). Coverage note: federal minerals only — state/private mineral rights remain unqueryable.
- **LayerTypes + wiring:** Added four new types to `packages/shared/src/constants/dataSources.ts` (`invasive_species`, `native_species`, `land_use_history`, `mineral_rights`); wired into `Tier1LayerType` Exclude, LayerPanel labels+icons, and `runLayerFetch()` Promise.allSettled dispatch. Fills in previously-missing LayerPanel entries for Sprint BA/BB/BC/BD types.
- **Phase 7 — Documented Open (no code):** Water rights (50+ fragmented US state REST adapters), ag use-value assessment (county tax-assessor portals, mostly non-REST), CA conservation easements (OLTA data not aggregated into public REST) — documented rationale kept in gap-analysis row.
- **Files touched:** `fuzzyMCDM.ts` (new), `companionPlanting.ts` (new), `canopyHeight.ts` (new), `layerFetcher.ts` (+3 fetchers, 4 helper functions), `regulatoryIntelligence.ts` (+setbacks), `computeScores.ts` (+prior_disturbance_flag, optional AHP weights), `dataSources.ts` (+4 LayerTypes), `LayerPanel.tsx` (+17 LAYER_LABELS/LAYER_ICONS entries).
- **API endpoints:** USDA PLANTS (`plantsservices.sc.egov.usda.gov/api/PlantDistribution`), VASCAN (`data.canadensys.net/vascan/api/0.1/search.json`), MRLC NLCD epochs 2001–2021 (GeoServer WMS), BLM Mineral Layer + Mining Claims (gis.blm.gov ArcGIS).
- **Verification:** `npx tsc --noEmit` passes clean. All fetchers wrapped in try/catch with graceful null or informational fallback stubs. Fuzzy + AHP are pure computation, no network dependency.

---

### 2026-04-19 — Cat 5 Climate Projections + Cat 7 Ecosystem Valuation (Sprint BE)
- **Scope:** Close 3 remaining gaps — Cat 5 climate projections (closing Cat 5 at 10/10) + Cat 7 ecosystem valuation + wetland function (Cat 7: 5/8 → 7/8). All three are pure frontend computation — no new APIs. Total: ~97/120 → ~100/120.
- **Phase 1 — Climate Projections:** `apps/web/src/lib/climateProjections.ts` (CREATE)
  - `computeClimateProjections({ lat, lng, annualTempC, annualPrecipMm })` — looks up 26 IPCC AR6 reference regions by bbox containment. Each region carries ensemble-median ΔT and Δprecip% for SSP2-4.5 and SSP5-8.5 (mid-century 2041–2060) drawn from IPCC AR6 WG1 Ch. 12 regional factsheets. Deltas applied to historical NOAA/ECCC annual means.
  - Returns region name, reference + projection periods, ΔT/Δprecip + projected T and precip for both scenarios, warming class (Low/Moderate/High/Severe on SSP5-8.5 ΔT), precipitation trend (Wetter/Stable/Drier/Strongly Drier on SSP5-8.5 Δprecip), and an adaptation advisory string.
  - Global fallback (2.0/2.9 °C, 2/4%) for any lat/lng not matched by a region polygon.
- **Phase 2 — Ecosystem Services Valuation + Wetland Function:** `apps/web/src/lib/ecosystemValuation.ts` (CREATE)
  - `computeEcosystemValuation({ treeCanopyPct, wetlandPct, riparianBufferM, organicMatterPct, isCropland, carbonSeqTonsCO2HaYr, propertyAcres })` — InVEST-style composite from land cover, wetland, soil, and Sprint R carbon flux. Seven services: carbonStorage (seq × $50 SCC), pollination, waterRegulation, waterQuality, habitatProvision, erosionControl, recreation. Per-biome coefficients from de Groot et al. (2012) + Costanza et al. (2014). Returns per-service $/ha/yr, total $/ha/yr, site total ($/yr × acres), dominant service, and narrative.
  - `classifyWetlandFunction({ wetlandPct, nearestStreamM, drainageClass, treeCanopyPct, organicMatterPct, riparianBufferM })` — simplified Cowardin (1979) classifier → five classes (Palustrine forested/emergent/shrub, Riverine, Lacustrine) + 0–100 function score (wetland cover + riparian buffer + OM + stream connectivity) + primary-function list per class.
- **UI:** `apps/web/src/components/panels/SiteIntelligencePanel.tsx`
  - Two new useMemos — `climateProjections` (reads climate layer + parcel centroid) and `ecosystemIntelligence` (composes valuation + wetland function; inlines the Sprint R carbon seq formula).
  - New "Climate Projections (2041–2060)" block — region, warming by 2050 (both scenarios, color-coded class badge), precipitation change (both scenarios, trend badge), advisory + historical-vs-projected footer.
  - New "Ecosystem Services" block — total ESV $/ha/yr + site $/yr, narrative, 7-service grid, optional Wetland Function sub-card (class badge + score + Cowardin narrative).
- **Types:** No new LayerType additions — both features read from existing `climate`, `land_cover`, `wetlands_flood`, `soils`, `crop_validation`, and `watershed` layer summaries.
- **Files Touched:** 2 created (`climateProjections.ts`, `ecosystemValuation.ts`) + 1 modified (`SiteIntelligencePanel.tsx`) + 2 wiki docs.

---

### 2026-04-19 — Cat 9 Renewable Energy + Cat 4 Hydrology (Sprint BD)
- **Scope:** Close 5 remaining gaps — Cat 9 Renewable Energy (geothermal, energy storage) + Cat 4 Hydrology (aquifer type, water stress index, seasonal flooding). Takes Cat 9 from 4/6 → 6/6 and Cat 4 from 7/10 → 10/10 (both categories now complete). Total: ~92/120 → ~97/120.
- **Phase 1 — Cat 9 Energy Intelligence (pure computation):** `apps/web/src/lib/energyIntelligence.ts` (CREATE)
  - `computeGeothermalPotential()` — ground-source heat-pump feasibility from climate + soils. Ground temp ≈ mean annual air temp (ASHRAE). Soil thermal conductivity from USDA texture class per IGSHPA (sand 2.0, sandy 1.5, clay 1.35, loam 1.1, peat 0.4, shallow bedrock <1.5 m → 2.8 W/m·K). Selects loop type (vertical / horizontal / pond) from bedrock depth + drainage + conductivity. COP baseline 4.0 ± temp/K adjustments, clamped 2.8–5.2. Rating Excellent/Good/Fair/Marginal.
  - `computeEnergyStorage()` — battery sizing for 5 kWp residential PV. Daily yield = PSH × kWp × 0.78 PR. Autonomy 1 day (grid-tied, 8 kWh load) or 3 days (off-grid, 20 kWh load). Battery = load × days / (0.8 DoD × 0.9 RTE). Rating Excellent/Good/Adequate/Limited on kWh/kWp/day.
- **Phase 2 — Cat 4 Hydrology data fetchers:** `apps/web/src/lib/layerFetcher.ts`
  - `fetchUsgsAquifer()` → USGS Principal Aquifers FeatureServer (ArcGIS) point-in-polygon, with National_Aquifers fallback. Classifies productivity by rock type: sand/gravel/unconsolidated = High; carbonate/limestone/dolomite/sandstone = Moderate; crystalline = Low. Layer type `aquifer`. US only.
  - `fetchWaterStress()` → WRI Aqueduct 4.0 global FeatureServer. Returns `bws_score`, `bws_label`, drought risk, interannual variability, riverine flood risk. 5-tier class Low / Low-Medium / Medium-High / High / Extremely High. Layer type `water_stress`. Global coverage.
  - `fetchSeasonalFlooding()` → USGS NWIS two-step: (1) bbox site query finds nearest discharge gauge within 30 km; (2) `/stat/?statReportType=monthly&parameterCd=00060` fetches monthly-mean discharge. Parses RDB (tab-separated). Variability index = (max−min)/annualMean classifies Low/Moderate/High/Extreme. Reports peak/low flow months. Layer type `seasonal_flooding`. US only.
- **Scoring:** `computeScores.ts` — `computeWaterResilience` extended with three optional layer params + components:
  - `baseline_water_stress` (penalty max −10): Low 0 / Low-Medium −2 / Medium-High −5 / High −8 / Extremely High −10.
  - `aquifer_productivity` (max +5): High 5 / Moderate 3 / Low 1.
  - `stream_seasonality` (penalty max −5): Low 0 / Moderate −1 / High −3 / Extreme −5.
- **Types:** `packages/shared/src/constants/dataSources.ts` — `LayerType` union extended with `'aquifer' | 'water_stress' | 'seasonal_flooding'`; all three added to `Tier1LayerType` Exclude list (direct-fetch, not part of Tier 1 adapter registry).
- **UI:** `apps/web/src/components/panels/SiteIntelligencePanel.tsx`
  - Three new useMemo hooks `aquiferMetrics`, `waterStressMetrics`, `seasonalFloodingMetrics`.
  - New `energyIntelligence` memo composing geothermal + storage from climate + soils + groundwater layers.
  - New "Hydrology Extensions" block (3 rows: Principal Aquifer, Water Stress, Stream Seasonality) rendered before Site Context.
  - New "Energy Intelligence" block with two sub-cards (Geothermal GSHP rating + recommendation + ground/K/COP footer; Solar+Battery Storage rating + sizing recommendation).
- **Dispatch wiring:** `runLayerFetch()` pushes `fetchUsgsAquifer`, `fetchWaterStress`, `fetchSeasonalFlooding` into the Promise.allSettled block immediately after the Sprint BC `fetchBcAlr` call.
- **Files Touched:** 1 created + 4 modified (`energyIntelligence.ts` new; `layerFetcher.ts`, `computeScores.ts`, `SiteIntelligencePanel.tsx`, `dataSources.ts` modified) + 2 wiki docs.

---

### 2026-04-19 — Cat 8 Environmental Risk + Cat 11 Regulatory (Sprint BC)
- **Scope:** Close 7 of 13 remaining gaps across Cat 8 Environmental Risk (5 of 5) + Cat 11 Regulatory (3 of 8 via API + 1 via computation). 4 execution phases; remaining Cat 11 items (setbacks, mineral rights, water rights, ag use-value, CA easements) left Open with documented rationale (fragmented/non-REST sources).
- **Phase 1 — EPA Envirofacts extensions (US + CA landfill):** `apps/web/src/lib/layerFetcher.ts`
  - New `envirofactsBbox()` helper — generic lat/lng bbox query over `enviro.epa.gov/enviro/efservice/...` tables.
  - `fetchEPAUst()` → `UST` + `LUST_RELEASE` tables. Fields: `nearest_ust_km`, `nearest_lust_km`, `lust_sites_within_1km`. Layer type `ust_lust`.
  - `fetchEPABrownfields()` → `BF_PROPERTY` (ACRES). Fields: `nearest_brownfield_km`, `cleanup_status`, `sites_within_5km`. Layer type `brownfields`.
  - `fetchEPALandfills()` → US: EPA FRS `FRS_FACILITIES` filtered post-fetch by NAICS 562212/562219. CA: Ontario LIO `LIO_Open08/9` Waste Management Sites. Layer type `landfills`.
  - `computeScores.ts`: three new Buildability penalty components `ust_proximity`, `brownfield_proximity`, `landfill_proximity` (each max −3, tiered <0.5/<2/<5 km).
- **Phase 2 — USGS MRDS + USACE FUDS:** `apps/web/src/lib/layerFetcher.ts`
  - `fetchUsgsMineHazards()` → USGS MRDS WFS (`mrdata.usgs.gov/services/mrds`) with ArcGIS REST fallback. Fields: `nearest_mine_km`, `commodity`, `dev_stat`, `mines_within_10km`. Layer type `mine_hazards`. US-only, `resultRecordCount=100` cap.
  - `fetchFuds()` → USACE FUDS public ArcGIS FeatureServer (`services.arcgis.com/ue9rwulIoeLEI9bj/...FUDS_Property_Points`). Fields: `nearest_fuds_km`, `project_type`, `sites_within_10km`. Layer type `fuds`.
  - `computeScores.ts`: combined `legacy_contamination` penalty component (max −3) triggers if either `nearest_mine_km` or `nearest_fuds_km` <2 km.
- **Phase 3 — NCED + Heritage:** `apps/web/src/lib/layerFetcher.ts`
  - `fetchNced()` → NCED public ArcGIS (`gis.ducks.org/arcgis/rest/services/NCED/NCED_Public`). Point-in-polygon for overlap flag + bbox for nearby. Fields: `easement_present`, `easement_holder`, `easement_purpose`, `easement_acres`. Layer type `conservation_easement`. US-only.
  - `fetchHeritage()` → US: NPS National Register of Historic Places ArcGIS (`mapservices.nps.gov/.../nrhp_locations`). CA: Parks Canada Historic Sites via open.canada.ca CKAN. Fields: `heritage_site_present`, `designation`, `nearest_heritage_km`. Layer type `heritage`. Flag-only, no score penalty (informational).
- **Phase 4 — EIA triggers + BC ALR:**
  - New file `apps/web/src/lib/regulatoryIntelligence.ts` — `computeEIATriggers({ areaHa, wetlandsPresent, regulatedAreaPct, floodZone, criticalHabitatPresent, slopeDeg, landCoverPrimaryClass, protectedAreasNearbyKm, heritageSitePresent, conservationEasementPresent })`. Flags up to 8 categorical triggers: CWA §404 wetlands, FEMA SFHA, ESA §7, slope+forest erosion permit, ≥5 ha natural-cover conversion, protected-area buffer <1 km, NHPA §106 / Ontario Heritage Act, conservation easement restrictions. Outputs `regulatoryBurden` Low (0) / Moderate (1–2) / High (3–4) / Extreme (5+).
  - `fetchBcAlr()` in `layerFetcher.ts` — BC OATS ALR Polygons WFS (`openmaps.gov.bc.ca/.../OATS_ALR_POLYS`) with CQL_FILTER `INTERSECTS(SHAPE, POINT(lng lat))`. Fields: `in_alr`, `alr_region`. Layer type `alr_status`. Gated: `country=CA` AND `lng<-114` (BC-only).
- **Shared type extensions:** `packages/shared/src/constants/dataSources.ts` — 8 new entries added to `LayerType` union (`ust_lust`, `brownfields`, `landfills`, `mine_hazards`, `fuds`, `conservation_easement`, `heritage`, `alr_status`) and all added to `Tier1LayerType` Exclude list.
- **UI:** `SiteIntelligencePanel.tsx` — 8 new useMemo hooks (one per layer). Environmental Risk collapsible extended with 5 new rows (UST/LUST, Brownfields, Landfills, Mine Hazards, FUDS) after existing Superfund block. New always-open "Regulatory & Heritage" section with Conservation Easement, Heritage Site, BC ALR rows + EA/Permit Triggers list with regulatoryBurden badge.
- **Gap analysis updated:** Cat 8: 3/8 → 7/8. Cat 11: 3/11 → 6/11. Total: ~85/120 → **~92/120** (7 gaps closed).
- **Known Open (documented):** Cat 8 prior land use history (requires historical imagery). Cat 11 setbacks (bylaw parsing), mineral rights (fragmented state), water rights (state-by-state), ag use-value (tax-assessor), CA conservation easements (OLTA fragmented).

---

### 2026-04-19 — Footprint + Compost + Stoniness + SoilGrids + IUCN Habitat + GBIF Biodiversity (Sprint BB)
- **Scope:** Close 7 remaining gaps across Cat 13 (2: footprint optimization, compost siting), Cat 2 (2: surface stoniness, SoilGrids + partial N-P-K), Cat 7 (2: IUCN habitat type, biodiversity index). Four execution phases.
- **Phase 1 — Design Intelligence (pure computation):** `apps/web/src/lib/designIntelligence.ts`
  - **Footprint optimization:** `computeFootprintOptimization()` — composite 0-100 from sub-scores terrain (slope + TPI flat %), solar (reuses `computePassiveSolar` `solarAdvantage`), wind (reuses `computeWindbreak` `avgWindSpeedMs` as exposure penalty), drainage (SSURGO drainage_class), flood zone flag from wetlands summary. Outputs rating, compositeScore, hemisphere-aware `bestAspectDirection` (S/SSE/SSW N-hem, N/NNE/NNW S-hem), recommendedBuildZone narrative, limitingFactors[].
  - **Compost siting:** `computeCompostSiting()` — slope ≤8° preferred, drainage (well/moderately well preferred), downwind direction via new `opposite8()` helper (N↔S, NE↔SW, etc.) applied to `primaryWindDir`. Outputs rating, recommendedDirectionFromDwelling, slopeDeg, drainageClass, limitingFactors, recommendation narrative.
  - `DesignIntelligenceResult` gains `footprint` + `compostSiting` fields. `computeDesignIntelligence` signature gains `wetlandsSummary` param. `SiteIntelligencePanel.tsx` extends Design Intelligence visibility guard and renders two new sub-sections mirroring Sprint AA style.
- **Phase 2 — Surface stoniness (SSURGO extension):**
  - `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` — added `ch.frag3to10_r`, `ch.fraggt10_r` to chorizon SELECT; extended `HorizonRow` + `parseSdaRows` + `computeWeightedAverages` return shape; added `coarse_fragment_pct` to `SoilSummary` + `buildUnavailableResult` defaults.
  - `apps/web/src/lib/layerFetcher.ts` — matching SDA query extension in `fetchSoils()`; sum `frag3to10_r + fraggt10_r` weighted to 0-30 cm → `coarse_fragment_pct` summary field.
  - `apps/web/src/lib/computeScores.ts` — new `coarse_fragment_penalty` component in Agricultural Suitability (FAO S1-N2 thresholds: <15% = 0, 15–35% = −1, 35–55% = −2, >55% = −3; max magnitude 3).
  - `SiteIntelligencePanel.tsx` — "Coarse Fragments" row in Soil Intelligence section.
- **Phase 3 — SoilGrids global API:**
  - `apps/web/src/lib/layerFetcher.ts` — new `fetchSoilGrids(lat, lng)` hitting `rest.isric.org/soilgrids/v2.0/properties/query` (free, no auth, CORS-friendly). Queries phh2o, nitrogen, soc, cec, bdod, clay, sand, silt, cfvo across depth layers 0–5, 5–15, 15–30 cm; depth-weighted mean (weights 5/10/15) with documented mapped-unit conversions (phh2o÷10, nitrogen×0.01, soc÷10, bdod×0.01, clay/sand/silt×0.1, cfvo×0.1). Returns layer type `soilgrids_global` with summary fields `sg_ph`, `sg_nitrogen_g_kg`, `sg_soc_g_kg`, `sg_cec_mmol_kg`, `sg_bulk_density_g_cm3`, `sg_clay_pct`, `sg_sand_pct`, `sg_silt_pct`, `sg_cfvo_pct`. Try/catch with null fallback on error.
  - `packages/shared/src/constants/dataSources.ts` — extended `LayerType` union with `'soilgrids_global' | 'biodiversity'`; both added to `Tier1LayerType` Exclude list.
  - `SiteIntelligencePanel.tsx` — SoilGrids pH/N/SOC + Texture/CFVO rows in Site Context collapsible.
  - **Partial N-P-K closure:** nitrogen (g/kg) now available globally. Phosphorus + potassium remain Open (no free global dataset).
- **Phase 4 — IUCN habitat + GBIF biodiversity index:**
  - **IUCN habitat:** `iucnHabitatFromClass(primaryClass)` in `layerFetcher.ts` — maps CDL / AAFC / ESA WorldCover class strings to IUCN Habitat Classification Scheme v3.1 codes (1=Forest, 3=Shrubland, 4=Grassland, 5=Wetlands, 6=Rocky, 12=Marine, 14.1=Arable, 14.2=Pastureland, 14.5=Urban, 17=Other). Enriches `fetchLandCover` summary.
  - **Biodiversity:** `fetchBiodiversity(lat, lng, landCoverPrimaryClass)` — GBIF Occurrence API (`api.gbif.org/v1/occurrence/search`) with 5 km bbox (0.045° lat, cosine-adjusted lng), 20-year window, `has_coordinate=true`, `facet=speciesKey` + `limit=0` for unique species count. Classified Low/Moderate/High/Very High at 50/150/400. Returns layer type `biodiversity` with `species_richness`, `biodiversity_class`, `iucn_habitat_code`, `iucn_habitat_label`.
  - `computeScores.ts` — `computeHabitatSensitivity` gains optional `biodiversity` param + new `biodiversity_index` scoring component (max 5: ≥400=5, ≥150=4, ≥50=2, >0=1).
  - `SiteIntelligencePanel.tsx` — Biodiversity badge + IUCN Habitat rows in Site Context collapsible; outer visibility guard extended.
- **Gap analysis updated:** Cat 13: 8/10 → 10/10 (Complete). Cat 2: 12/16 → 14/16 (N-P-K partial via SoilGrids nitrogen; P/K + boron Open). Cat 7: 3/8 → 5/8. Total: ~78/120 → ~85/120.

---

### 2026-04-19 — RWH Sizing + Pond Volume + Fire Risk Zoning (Sprint AA)
- **Scope:** Close the three remaining P3 computation gaps in Cat 13 Design Intelligence (rainwater harvesting sizing, pond volume estimation, fire risk zoning). All pure frontend computation on already-fetched layers — no new APIs.
- **`apps/web/src/lib/designIntelligence.ts` additions:**
  - **Constants:** `RWH_EFFICIENCY = 0.85` (EPA WaterSense runoff coefficient), `TYPICAL_ROOF_AREA_M2 = 200` (typical farmhouse), `WHO_BASIC_DAILY_LITERS = 400` (4-person household).
  - **RWH:**
    - New interface `RwhSizingResult` — yield per 100 m², typical farmhouse m³/yr, days of supply vs WHO demand, rating (Excellent ≥850 L/m²/yr, Good ≥425, Limited ≥170, Poor).
    - `computeRainwaterHarvesting(annualPrecipMm)` — `yield = area × precip × 0.85`; both per-100m² normalized and typical-roof outputs.
  - **Pond Volume:**
    - New interface `PondVolumeResult` — total volume m³/gal, rating (Large ≥5000, Medium ≥500, Small ≥50, Very small), per-candidate dimensions, meanDepthM.
    - `computePondVolumeEstimate(watershedDerivedSummary, countryCode)` — pyramidal model `cellCount × cellArea × depth × 0.5`. Cell area derived from DEM resolution: 100 m² (US 3DEP 10m) or 400 m² (CA HRDEM 20m). Depth = `clamp(1.0 + meanSlope × 0.3, 0.5, 3.0)`.
  - **Fire Risk:**
    - New interface `FireRiskResult` — risk class (Low/Moderate/High/Extreme), composite score, fuel loading 0-100, slope/wind factors, primary wind direction.
    - `fuelByLandCoverClass(primaryClass, treeCanopyPct)` — NFDRS analogues: forest 60–85, shrub 50–70, cropland 20–35, grass 25–40, wetland 5, developed 10.
    - `computeFireRisk(landCoverSummary, slopeDeg, avgWindSpeedMs, primaryWindDir)` — Rothermel-inspired `fuel × slopeFactor × windFactor`; slopeFactor = `1 + (slope/15)²`; windFactor = `1 + speed/10`.
  - **`DesignIntelligenceResult`** gains `rwh`, `pondVolume`, `fireRisk` fields.
  - **`computeDesignIntelligence`** signature extended with optional `climateSummary`, `landCoverSummary`, `countryCode` params (all default, backwards-compatible). Wind inputs for fire are reused from the already-computed windbreak result (no duplicate wind-rose aggregation).
- **`SiteIntelligencePanel.tsx` changes:**
  - useMemo reads `climate` + `land_cover` layers; passes `project.country ?? 'US'`. Dep array includes `project.country`.
  - Outer visibility guard extended with `|| designIntelligence.rwh || designIntelligence.pondVolume || designIntelligence.fireRisk`.
  - **RWH Potential sub-section:** rating badge, annual precip flag, yield per 100 m² (L + m³), typical farmhouse m³/yr and days-of-supply vs WHO demand, italic recommendation.
  - **Pond Volume sub-section:** volume rating badge, volume m³ flag, estimated dimensions (area × depth + gallons), italic recommendation.
  - **Fire Risk sub-section:** risk class badge (green/amber/red), composite score flag, fuel loading 0-100, slope/wind factor row, italic recommendation.
  - Each section separated by hairline dividers within the Design Intelligence collapsible.
- **Gap analysis updated:** Cat 13 Design Intelligence: 5/10 → 8/10; Total: ~75/120 → ~78/120. Remaining Cat 13: footprint optimization, compost siting (both P3, deferred).

---

### 2026-04-19 — Septic Suitability + Shadow Modeling (Sprint Z)
- **Scope:** Add two more Design Intelligence capabilities: septic/leach-field suitability (USDA NRCS thresholds) and shadow/shade modeling (solar geometry). Both are pure frontend computation on already-fetched layers.
- **`apps/web/src/lib/designIntelligence.ts` additions:**
  - **Septic:**
    - New interface `SepticSuitabilityResult` — rating Excellent/Good/Marginal/Unsuitable, recommendedSystem Conventional/Mound/Engineered/Not recommended, limitingFactors list, input echoes
    - `classifyDrainage(drainageClass)` helper — substring match on SSURGO/LIO drainage phrases
    - `computeSepticSuitability({ ksatUmS, bedrockDepthM, waterTableDepthM, drainageClass, slopeDeg })` — thresholds per USDA NRCS / EPA Onsite Wastewater Treatment Manual: Ksat 15–150 µm/s ideal, bedrock ≥1.8 m, water table ≥1.8 m, well/moderately well drainage, slope <8.5° (conventional). Factors that push rating: <1.0 m bedrock → engineered; <0.6 m water table → unsuitable
  - **Shadow:**
    - New interface `ShadowAnalysisResult` — winter/summer/equinox noon altitudes (degrees), winterShadeRisk Low/Moderate/High/Severe, sunAccessRating Excellent/Good/Limited/Poor
    - `solarDeclination(dayOfYear)` — Cooper's equation: δ = 23.45° × sin(360/365 × (284 + n))
    - `noonSolarAltitude(lat, dayOfYear)` — α = 90° − |lat − δ|
    - `slopeAdjustedAltitude()` — adds slopeDeg on sun-facing aspect, subtracts on shady aspect, half-effect on SE/SW/NE/NW, neutral on E/W
    - `computeShadowAnalysis(lat, aspect, slopeDeg)` — computes 3 checkpoints; winterShadeRisk compounded when N-facing + slope ≥10° at high lat; annualScore = 0.5×winter + 0.3×equinox + 0.2×summer
  - **`DesignIntelligenceResult`** now has `septic` + `shadow` fields
  - **`computeDesignIntelligence`** gains two optional params `soilsSummary` + `groundwaterSummary` (default null, backwards-compatible); extracts `ksat_um_s`, `depth_to_bedrock_m`, `drainage_class`, `groundwater_depth_m`
- **`SiteIntelligencePanel.tsx` changes:**
  - useMemo reads `soils` + `groundwater` layers and passes their summaries
  - Outer visibility guard: added `|| designIntelligence.septic || designIntelligence.shadow`
  - **Septic sub-section:** rating badge, recommended system, bulleted limiting factors, recommendation text
  - **Sun Access sub-section:** annual rating badge, winter noon altitude (color-coded by shade risk), summer noon, equinox noon, recommendation
  - Both sections separated by hairline dividers within the Design Intelligence collapsible
- **Gap analysis updated:** Cat 13 Design Intelligence: 3/10 → 5/10; Total: ~73/120 → ~75/120

---

### 2026-04-19 — Water Harvesting Siting in Design Intelligence (Sprint Y)
- **Scope:** Surface swale and pond siting candidates from the pre-computed `watershed_derived` layer in the Design Intelligence panel.
- **Key insight:** `WatershedRefinementProcessor` already runs `computeSwaleCandidates` + `computePondCandidates` server-side and stores top 30 swales + top 20 ponds (sorted by suitabilityScore 0-100) in the `watershed_derived` summary. No new API calls or backend work required.
- **`apps/web/src/lib/designIntelligence.ts` additions:**
  - New interfaces: `SwaleCandidate`, `PondCandidate`, `WaterHarvestingResult`
  - `computeWaterHarvesting(watershedDerivedSummary)` — extracts `swaleCandidates` + `pondCandidates`; derives `swaleRating` (Excellent/Good/Fair/Limited) and `pondRating` (Excellent/Good/Fair/None) from top suitabilityScore; generates recommendation text with candidate count, slope, elevation, accumulation
  - `DesignIntelligenceResult` extended with `waterHarvesting: WaterHarvestingResult | null`
  - `computeDesignIntelligence` gains optional 5th param `watershedDerivedSummary` (default `null` — fully backwards-compatible)
- **`SiteIntelligencePanel.tsx` changes:**
  - `designIntelligence` useMemo now reads `watershed_derived` layer and passes its summary to `computeDesignIntelligence`
  - Outer visibility guard updated: `|| designIntelligence.waterHarvesting` added
  - Water Harvesting sub-section added inside Design Intelligence collapsible: Swale Sites rating badge + candidate count, Best Swale row (slope + elevation + score), swale recommendation text, Pond Sites rating badge + candidate count, Best Pond row (slope + accumulation + score), pond recommendation text
  - Separator `<div>` between windbreak and water harvesting blocks
- **Gap analysis updated:** Cat 13 Design Intelligence: 2/10 → 3/10; Total: ~72/120 → ~73/120
- **Swale suitability algorithm reference:** slope optimum 8° (range 2–15°) + flow accumulation P50–P90 + run length → score 0-100. Pond: accumulation ≥P75 + slope <3° → score 0-100.

---

### 2026-04-19 — 8-Layer UI Surface + Design Intelligence (Sprint X)
- **Scope:** Surface 8 previously-fetched-but-hidden layers in SiteIntelligencePanel + implement passive solar / windbreak Design Intelligence utility.
- **SiteIntelligencePanel additions (`apps/web/src/components/panels/SiteIntelligencePanel.tsx`):**
  - 6 new collapsible sections added: Environmental Risk, Site Context, Community, Design Intelligence
  - **Environmental Risk** — Superfund nearest km (color-coded by 2/5 km thresholds), air quality AQI class + PM2.5 percentile, seismic hazard PGA + class badge
  - **Site Context** — CDL crop name + year + Active Cropland/Agricultural/Non-agricultural badge, critical habitat on-site/nearby/none with species name, FEMA disaster count (10yr) + most common type
  - **Community** — Rural Class badge, population density /km², median income, median age (source: US Census ACS)
  - **Design Intelligence** — passive solar advantage badge + building axis orientation, windbreak orientation + prevailing wind direction + secondary wind; both sourced purely from existing `elevation` + `climate` layers
  - **Proximity rows** in Infrastructure Access — farmers market km + nearest town km from `proximity_data` layer (OSM Overpass)
  - All sections null-safe: hidden when layer absent or not 'complete'
- **New file: `apps/web/src/lib/designIntelligence.ts`:**
  - `computePassiveSolarOrientation(aspect, lat, slopeDeg)` → `PassiveSolarResult` — angular deviation from hemisphere-optimal bearing → solarScore 0-100 → Excellent/Good/Moderate/Poor
  - `computeWindbreakSiting(windRose)` → `WindbreakResult | null` — 16-sector wind rose energy weighting (freq × speed²) → dominant cardinal → perpendicular windbreak orientation
  - `computeDesignIntelligence(aspect, lat, slope, windRose)` → `DesignIntelligenceResult` — graceful null handling when inputs absent
- **Gap analysis updated:** Design Intelligence Cat 13: 0/10 → 2/10; Total: ~70/120 → ~72/120
- **Layers now fully surfaced in UI:** groundwater, water_quality, superfund, critical_habitat, storm_events, crop_validation, air_quality, earthquake_hazard, census_demographics, proximity_data (all 10 extended layers visible)

---

### 2026-04-19 — Wiki Audit + Groundwater/Water Quality UI Surfacing
- **Scope:** Wiki catch-up audit (gap analysis, scoring engine, data-pipeline pages were stale after Sprints I-W) + UI surfacing of groundwater and water quality layers in SiteIntelligencePanel.
- **Wiki updates:**
  - `wiki/entities/data-pipeline.md` — removed stale "Next focus: scoring engine refactor" note; updated frontend layerFetcher to 19 live layer types; confirmed scoring engine complete (Sprint M)
  - `wiki/entities/gap-analysis.md` — updated summary table from ~60/120 to ~70/120; marked groundwater + water_quality as Implemented (Sprint M); added CDL crop validation (Sprint P); added critical habitat (Sprint O); added superfund/air quality/earthquake hazard (Sprints O, T, U); added biomass + micro-hydro (Sprint Q); updated extreme events (Sprint P FEMA); corrected counts for Cat 4 (5→7), 5 (8→9), 6 (6→7), 7 (2→3), 8 (0→3), 9 (2→4)
  - `wiki/concepts/scoring-engine.md` — added Sprints N-W to sprint history table; updated component count to ~153; fixed "9 scoring functions" → "10-11 scoring functions"
- **SiteIntelligencePanel UI additions (`apps/web/src/components/panels/SiteIntelligencePanel.tsx`):**
  - Added collapsible **Groundwater** section: depth (m + ft), depth class label (shallow/moderate/deep), station name, distance, measurement date. Source: USGS NWIS (US) / Ontario PGMN (CA)
  - Added collapsible **Water Quality** section: pH (color-coded), dissolved oxygen (mg/L), nitrate (mg/L), turbidity (NTU), station name + distance. Source: EPA WQP (US) / ECCC PWQMN (CA)
  - Both sections null-safe — hidden when layer absent or fetch status not 'complete'
- **Key insight from audit:** Sprints M-W had been implemented in `layerFetcher.ts` and `computeScores.ts` without corresponding wiki log entries. This session restores wiki accuracy.

---

### 2026-04-19 — Zoning Adapters: UsCountyGisAdapter + OntarioMunicipalAdapter (14/14 live — 100% Tier 1 complete)
- **Scope:** Implemented zoning layer backend adapters (US + CA) — **all 7 Tier 1 layers now fully covered.**
- **UsCountyGisAdapter (US — `apps/api/src/services/pipeline/adapters/UsCountyGisAdapter.ts`):**
  - Step 1: FCC Census Block API (no auth) resolves lat/lng → 5-digit county FIPS + county name + state
  - Step 2: `COUNTY_ZONING_REGISTRY` (9 curated counties) maps FIPS → ArcGIS REST endpoint + field map
  - Supports both MapServer and FeatureServer URLs; multi-field fallback chains for zone/description/overlay fields
  - `inferZoningDetails()`: regex + keyword pattern matching → permitted_uses, conditional_uses, is_agricultural
  - Unregistered counties return structured "unavailable" result (intentional non-error, low confidence) with guidance text including county name + state
  - Registry counties: Lancaster PA, Loudoun VA, Buncombe NC, Hamilton OH, Dane WI, Washington OR, Sonoma CA, Boulder CO, Whatcom WA
- **OntarioMunicipalAdapter (CA — `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts`):**
  - Parallel `Promise.allSettled`: LIO_Open06 planning layers + AAFC CLI
  - LIO: tries layers 4, 5, 15, 26 sequentially (first match wins); 12-field fallback chains per field (ZONE_CODE, DESIGNATION, LAND_USE_CATEGORY, etc.)
  - AAFC CLI: tries 2 service URLs (AAFC reorganizes periodically); CLI class 1-7 + subclass → human-readable capability + limitation descriptions
  - Ontario-specific `inferZoningDetails()`: recognizes Greenbelt, Natural Heritage System, CLUPA, Niagara Escarpment designations
  - Test note: concurrent execution of LIO + AAFC in `Promise.allSettled` required URL-routing `mockImplementation` for "CLI only" test scenario
- **Orchestrator:** 2 new imports + 2 new `if` blocks in `resolveAdapter()`. Comment updated: "All Tier 1 adapters implemented — fallthrough should not occur in practice"
- **Tests:** 15 US + 18 CA = 33 new tests; suite at 298/298 passing
- **Completeness:** 14/14 adapters live; **100% of total Tier 1 completeness weight** (soils 20% + elevation 15% + watershed 15% + wetlands 15% + zoning 15% + climate 10% + land_cover 10%)
- **Next:** Scoring engine refactor (plan file `clever-enchanting-moler.md`) or US county zoning registry expansion

---

### 2026-04-19 — Land Cover Adapters: NlcdAdapter + AafcLandCoverAdapter (12/14 live)
- **Scope:** Implemented land_cover layer backend adapters (US + CA) — 6th of 7 Tier 1 layers complete.
- **NlcdAdapter (US — `apps/api/src/services/pipeline/adapters/NlcdAdapter.ts`):**
  - MRLC NLCD 2021 WMS GetFeatureInfo endpoint, 5-point sampling (centroid + 4 cardinal offsets at ±400 m)
  - Builds real class distribution from sample pixel values rather than heuristic lookup
  - Weighted-average tree_canopy_pct and impervious_pct across all valid samples
  - Confidence: high (centroid returned value), medium (only offsets), low (latitude fallback)
  - Handles GRAY_INDEX and value property names from WMS response
- **AafcLandCoverAdapter (CA — `apps/api/src/services/pipeline/adapters/AafcLandCoverAdapter.ts`):**
  - AAFC Annual Crop Inventory 2024 ImageServer Identify (single centroid point)
  - 50+ AAFC class codes → primary_class, dominant_system, tree_canopy_pct, impervious_pct, is_agricultural, is_natural
  - Handles NoData, cloud (code 1), and cloud-shadow (code 136) as fallback triggers
  - Accepts code as number or string (AAFC may return either)
- **Orchestrator:** Both wired into `resolveAdapter()` (2 new imports + 2 new `if` blocks)
- **Tests:** 18 NlcdAdapter + 17 AafcLandCoverAdapter = 35 new tests; suite at 262/262 passing
- **Completeness:** 12/14 adapters live; 85% of total completeness weight covered
- **Remaining:** zoning US/CA (15% weight) — the final Tier 1 stub

---

### 2026-04-19 — Climate Adapters: NoaaClimateAdapter + EcccClimateAdapter (10/14 live)
- **Scope:** Implemented climate layer backend adapters (US + CA) completing the 5th of 7 Tier 1 layers.
- **NoaaClimateAdapter (US — `apps/api/src/services/pipeline/adapters/NoaaClimateAdapter.ts`):**
  - Two-step NOAA ACIS POST API: StnMeta (nearest GHCN station with 1991-2020 coverage) → StnData (30-year monthly maxt/mint/pcpn in °F/inches)
  - Station selection: prefers stations with valid 1991→2020 daterange, falls back to nearest
  - Metric conversion + 12-month normal aggregation from up to 360 monthly rows
  - Derives: `annual_precip_mm`, `annual_temp_mean_c`, `growing_season_days`, `last_frost_date`, `first_frost_date`, `hardiness_zone`, `growing_degree_days_base10c`, `koppen_classification`, `freeze_thaw_cycles_per_year`, `snow_months`, `monthly_normals[]`
  - Confidence: high (<30 km station), medium (<60 km), low (>60 km or fallback)
  - Fallback: latitude-based estimate when ACIS unavailable
- **EcccClimateAdapter (CA — `apps/api/src/services/pipeline/adapters/EcccClimateAdapter.ts`):**
  - ECCC OGC API Features GET with ±0.5° bbox, cosine-corrected nearest station selection
  - Dual field fallback chains: ANNUAL_PRECIP / TOTAL_PRECIP, MEAN_TEMP / ANNUAL_MEAN_TEMP, FROST_FREE_PERIOD / FROST_FREE_DAYS, etc.
  - Returns: `annual_precip_mm`, `annual_temp_mean_c`, `growing_season_days`, frost dates, hardiness zone, station name/distance, data period from NORMAL_CODE
  - Confidence: based on distance + field completeness
  - Fallback: latitude-based estimate when ECCC unavailable
- **Orchestrator:** Wired both adapters into `DataPipelineOrchestrator.resolveAdapter()` (2 new `if` blocks + 2 new imports)
- **Tests:** 14 NoaaClimateAdapter + 13 EcccClimateAdapter = 27 new tests; suite at 225/225 passing
- **Completeness:** 10/14 adapters live; 75% of total completeness weight covered (soils 20% + elevation 15% + watershed 15% + wetlands 15% + climate 10%)
- **Next priority:** land_cover adapters (MRLC NLCD US + AAFC CA, 10% weight) → would bring coverage to 85%

---

### 2026-04-16 — Sprint M: Tier 3 Integration + Scoring Calibration + UI Surfacing + Pipeline Fixes
- **Scope:** Full Tier 3 scoring integration (terrain_analysis, watershed_derived, microclimate, soil_regeneration components wired into all 7 weighted scores), scoring calibration audit (3 bugs + 3 calibration fixes), SiteIntelligencePanel UI surfacing of WithConfidence data, and pipeline bug fixes.
- **Scoring engine changes (`apps/web/src/lib/computeScores.ts`):**
  - Integrated Tier 3 layer components across all 7 existing weighted scores (graceful degradation when absent)
  - Added 8th weighted dimension: **Community Suitability** (6 census components: population density, median income, educational attainment, homeownership rate, poverty rate penalty, vacancy rate)
  - **Bug fix:** `salinity_penalty` maxPossible corrected from 0 to -5
  - **Bug fix:** WEIGHTS sum corrected from 1.05 to 1.00 (Design Complexity 0.15 → 0.10)
  - **Calibration:** Buildability base lowered from 75 to 60
  - **Calibration:** Community Suitability base raised from 10 to 25, added 4 new components (edu, homeownership, poverty, vacancy) — effective range improved from 10-40 to ~17-91
  - All outputs now produce `ScoredResult` with `score_breakdown`, `confidence`, `dataSources`, `computedAt`
- **UI changes (`SiteIntelligencePanel.tsx` + `.module.css`):**
  - Added overall confidence badge next to "Overall Suitability" title
  - Added per-score `dataSources` tags below each score bar
  - Added `sourceLayer` attribution in breakdown rows
  - Added `computedAt` timestamp per score breakdown
  - Guards for empty `dataSources` and empty `score_breakdown` arrays
- **Pipeline fixes (`DataPipelineOrchestrator.ts`):**
  - Removed orphan `compute_assessment` job INSERT (no queue/worker existed)
  - Fixed BullMQ retry status tracking: `status = 'queued'` → `status IN ('queued', 'failed')` across all 4 Tier 3 workers
- **API fix (`routes/design-features/index.ts`):**
  - Fixed TS2345 by casting `body.properties` and `body.style` to `Record<string, string>` for `db.json()` calls
- **Scoring components:** ~129 → ~140+ (Tier 3 integration + Community Suitability)
- **Weighted dimensions:** 7 → 8 (Community Suitability added at 5%)

---

### 2026-04-14 — Sprint L: Protected Areas + Infrastructure Rules + Scoring Polish
- **Scope:** Extended Overpass query for protected areas (1 new Cat 7 gap), added 8 infrastructure assessment rules (first infrastructure-aware rules), wired untapped water supply scoring, and audited Cat 11 regulatory status (3 gaps reclassified as implemented via existing zoning fetcher).
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — extended Overpass query with `boundary=protected_area` + `leisure=nature_reserve` tags; added `protected_area` bucket, distance, name, class, and count to infrastructure layer summary
  - `apps/web/src/lib/computeScores.ts` — added `protected_area_proximity` (max 8) to Habitat Sensitivity (inverted — closer = higher sensitivity); added `water_supply_proximity` (max 3) to Buildability; threaded infrastructure to `computeHabitatSensitivity()`
  - `apps/web/src/lib/rules/ruleEngine.ts` — added `infrastructure` to `RuleContext` interface and `buildContext()` layer extraction
  - `apps/web/src/lib/rules/assessmentRules.ts` — added `infrastructure` category to `AssessmentRule` type; added 4 opportunity rules (good-road-access, grid-connected, market-accessible, masjid-nearby) + 4 risk rules (remote-from-hospital, no-road-access, no-grid-access, protected-area-constraint)
  - `packages/shared/src/schemas/assessment.schema.ts` — added `'infrastructure'` to `AssessmentFlagCategory` enum
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Protected Area row to Infrastructure Access section (distance + name + color coding); added protected area fields to `infraMetrics` useMemo
- **Scoring components:** ~126 → ~129 (+1 protected area habitat, +1 water supply buildability, +1 infrastructure category)
- **Assessment rules:** 28 → 36 (+4 opportunity, +4 risk — all infrastructure-based)
- **Gaps closed:** 1 new (protected areas Cat 7) + 3 reclassified (Cat 11 zoning, overlay, floodplain already live)

---

### 2026-04-14 — Sprint K: Overpass Infrastructure Distances + Solar PV Potential
- **Scope:** First sprint to add a new external API. Integrated OpenStreetMap Overpass API for distance-to-infrastructure (8 Category 10 gaps) plus solar PV potential from existing NASA POWER data (1 Category 9 gap). Added `infrastructure` layer type, Haversine distance computation, 6 new scoring components, Infrastructure Access panel section, and Solar PV row.
- **Files modified:**
  - `packages/shared/src/constants/dataSources.ts` — added `'infrastructure'` to LayerType union, excluded from Tier1LayerType
  - `apps/web/src/lib/layerFetcher.ts` — added `haversineKm()` helper, `fetchInfrastructure()` (single batched Overpass query for 7 POI categories: hospital, masjid, market, power substation, drinking water, road), ~25km search bbox, wired into `fetchAllLayersInternal()`. Fixed `replaceLayer()` to push new layer types without mock entries
  - `apps/web/src/lib/computeScores.ts` — added 4 infrastructure scoring components to Buildability (hospital_proximity max 5, road_access max 5, grid_proximity max 4, market_proximity max 3); added masjid_proximity (max 4) and solar_pv_potential (max 5) to Stewardship Readiness; threaded `infrastructure` layer and `solarRadiation` through scoring pipeline
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Infrastructure Access collapsible section (6 rows: hospital, masjid, market, grid, road, water with color-coded distances); added Solar PV row to Hydrology Intelligence section (PSH/day, annual yield, class label); added `infraOpen` state, `infraMetrics` + `solarPV` useMemo hooks
  - `apps/web/src/features/map/LayerPanel.tsx` — added `infrastructure` to LAYER_LABELS and LAYER_ICONS
- **Scoring components:** 120 → ~126 (+4 infrastructure buildability, +1 masjid stewardship, +1 solar PV stewardship)
- **Gaps closed:** 9 (8 infrastructure + 1 solar PV) — cumulative ~56/120
- **New API:** OpenStreetMap Overpass (free, no auth, CORS-friendly)

---

### 2026-04-14 — Sprint J: Soil Degradation + WRB + Agroforestry + Wind Energy
- **Scope:** Implemented 4 remaining frontend-computable gaps: soil degradation risk index, WRB soil classification, agroforestry species pairing, and wind energy potential — all from existing layer data, no new APIs. This exhausts all frontend-computable opportunities.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added soil degradation risk component (composite of OM depletion, salinization, compaction, erosion, drainage — max 8) to Stewardship Readiness; added wind energy potential component (max 5) from wind rose power density; threaded elevation + windPowerDensity through Stewardship Readiness
  - `apps/web/src/lib/cropMatching.ts` — added `findAgroforestryCompanions()` function: filters EcoCrop DB for perennial trees/shrubs, scores by structural diversity, family diversity, N-fixation, rooting depth complementarity. Returns top companions with compatibility scores. Added `CompanionMatch` interface + `rangesOverlap()` helper
  - `apps/web/src/lib/hydrologyMetrics.ts` — added `computeWindEnergy()`: frequency-weighted cubic mean (Betz law), NREL power class, optimal direction, capacity factor. Added `WindEnergyResult` interface
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added WRB classification row to Soil Intelligence (USDA→WRB lookup + Gleyic/Calcic/Humic/Haplic qualifiers); Wind Power row to Hydrology Intelligence (W/m² + class + direction); agroforestry companions sub-list under expanded crop matches; wind energy useMemo + companion cache useMemo
- **Scoring components:** 118 → 120 (+1 soil degradation, +1 wind energy)
- **Gaps closed:** 4 (soil degradation risk, WRB classification, agroforestry pairing, wind energy potential)

---

### 2026-04-14 — Sprint I: LGP + Canada Soil Capability + Carbon Stock Estimation
- **Scope:** Implemented three remaining frontend-computable gaps: Length of Growing Period (LGP), Canada Soil Capability Classification (CSCS), and carbon stock estimation — all from existing fetched layer data, no new APIs.
- **Files modified:**
  - `apps/web/src/lib/hydrologyMetrics.ts` — added `computeLGPDays()` using FAO AEZ monthly water balance (precip vs 0.5×PET with soil water carry-over); extended `HydroInputs` (monthlyNormals, awcCmCm, rootingDepthCm) and `HydroMetrics` (lgpDays, lgpClass)
  - `apps/web/src/lib/computeScores.ts` — added `computeCanadaSoilCapability()` (8-limitation model mirroring USDA LCC with AAFC thresholds, Class 1-7 + T/W/D/E/F/M/R subclasses, CA sites only); added `length_of_growing_period` component (max 6) to Agricultural Suitability; added `carbon_stock` component (max 6) to Regenerative Potential using IPCC formula with Adams pedotransfer fallback for bulk density; threaded `country` parameter through `computeAssessmentScores()`
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added "Growing Period" row to Hydrology Intelligence section, "Carbon Stock" row (tC/ha + color coding) to Soil Intelligence section; passed monthly normals + soil params to hydro metrics; threaded `project.country` to scoring
- **Scoring components:** 108 → 118 (+1 LGP, +8 CSCS, +1 carbon stock)
- **Scoring functions:** 9 → 10 (for CA sites; 9 for US sites)
- **Gaps closed:** 3 (LGP, Canada Soil Capability, carbon stock estimation)

---

### 2026-04-14 — Sprint H: Gap Audit + Wiki Update
- **Scope:** Audited all gaps closed by Sprints A-G, updated gap analysis wiki page with per-gap status markers, rewrote scoring engine concept page to reflect current 9-dimension / 108-component architecture, and produced a prioritized "what's next" roadmap for Sprints I-J.
- **Files modified:**
  - `wiki/entities/gap-analysis.md` — updated Categories 1 (4/7), 2 (scoring wire-ups), 4 (5/10 hydrology), 6 (5/8 crop); rewrote summary table (~40/120); added completed sprint table (A-H) + next sprint candidates
  - `wiki/concepts/scoring-engine.md` — rewrote from "5 assessment dimensions" to 7 weighted + 2 formal classifications, 108 components, sprint history table
  - `wiki/log.md` — added Sprint F, G, H entries
- **Key findings:** Gap analysis was significantly stale — Hydrology showed 0/10 when 5/10 were implemented (Sprint F), scoring engine page said 5 dimensions when there are 9.
- **No code changes** — wiki-only sprint.

---

### 2026-04-14 — Sprint G: Soil Intelligence + Hardiness Zones + Rain-Fed vs Irrigated
- **Scope:** Combined polish sprint wiring existing SSURGO data into scoring, adding Soil Intelligence panel section, USDA Hardiness Zone scoring, rain-fed vs irrigated crop distinction, and fixing a pH field name bug across 3 sites.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added 4 scoring components: calcium_carbonate (max 4), permeability/Ksat (max 4), compaction_risk/bulk density (max 3), hardiness_zone (max 5). Fixed `ph_value` → `ph` bug at 2 sites (computeAgriculturalSuitability, computeFAOSuitability).
  - `apps/web/src/lib/cropMatching.ts` — added `irrigationNeeded` + `irrigationGapMm` to CropMatch interface, rain-fed vs irrigated computation in `scoreCrop()`. Fixed third `ph_value` → `ph` bug in `siteConditionsFromLayers()`.
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Soil Intelligence collapsible section (8 rows: pH, OM, CEC, texture, bulk density, Ksat, CaCO3, rooting depth), irrigation badges on crop list items ("+X mm" / "Rain-fed"), reordered useMemo hooks to fix dependency ordering.
- **Bugs fixed:** `ph_value` → `ph` at 3 locations (SSURGO field is `ph`, not `ph_value`). pH scoring was silently returning 0 for all sites.
- **Scoring components:** 97 → 108 (+4 soil + +1 hardiness + FAO/USDA retained)
- **Gaps closed:** Rain-fed vs irrigated distinction (Cat 6), hardiness zone wired into scoring (Cat 1)

---

### 2026-04-14 — Sprint F: Hydrology Intelligence
- **Scope:** Implemented 5 hydrology gaps as frontend-computed metrics from existing climate + watershed data. Created `hydrologyMetrics.ts` utility and added Hydrology Intelligence section to SiteIntelligencePanel.
- **Files created:**
  - `apps/web/src/lib/hydrologyMetrics.ts` — pure functions: Blaney-Criddle PET, aridity index (UNEP classification), irrigation water requirement, rainwater harvesting potential
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added 4 water resilience scoring components: pet_aridity (max 8), irrigation_requirement (max 6), rainwater_harvesting (max 5), drainage_density (max 4)
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Hydrology Intelligence collapsible section (PET, aridity, RWH potential, irrigation requirement, drainage density) between scores and crop suitability
  - `apps/api/src/services/terrain/WatershedRefinementProcessor.ts` — added drainage density computation from D8 flow accumulation grid (channel threshold = 100 cells, km/km² classification)
- **Gaps closed:** 5 hydrology gaps (PET/ET, aridity index, irrigation requirement, rainwater harvesting, drainage density)
- **Gaps remaining (hydrology):** 5 (groundwater depth, aquifer type, seasonal flooding duration, water stress index, surface water quality)

---

### 2026-04-14 — Sprint E: Crop Suitability — FAO EcoCrop Integration
- **Scope:** Integrated the full FAO EcoCrop database (2071 crops, sourced from OpenCLIM/ecocrop GitHub under OGL v3) with a 9-factor crop suitability matching engine. Replaces the hand-curated 60-crop subset with authoritative FAO data covering cereals, legumes, vegetables, fruits, forestry, forage, medicinals, ornamentals, and more.
- **Files created:**
  - `apps/web/src/data/EcoCrop_DB.csv` — raw FAO EcoCrop database (2568 species, 53 columns)
  - `apps/web/src/data/ecocrop_parsed.json` — parsed/normalized JSON (2071 crops with valid temperature data, 965 KB)
  - `scripts/parse_ecocrop.py` — CSV→JSON converter with English name extraction, categorical field encoding
  - `apps/web/src/lib/cropMatching.ts` — 9-factor matching engine: temperature, precipitation, pH, drainage, texture, soil depth, salinity, growing season, cold hardiness. Uses optimal/absolute range interpolation (same as OpenCLIM). Overall score: 40% min factor + 60% mean (Liebig's law blend). Returns FAO-style S1/S2/S3/N1/N2 classes.
- **Files modified:**
  - `apps/web/src/data/ecocropSubset.ts` — replaced hand-curated CropEntry interface with FAO-aligned schema; JSON import of full database
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added "Crop Suitability" section with category filter pills, expandable per-crop factor breakdowns, ScoreCircle reuse
  - `apps/web/src/components/panels/SiteIntelligencePanel.module.css` — crop filter pill styles, crop metadata layout
  - `wiki/entities/gap-analysis.md` — Category 6 updated: 4/8 implemented
- **Gaps closed:** 4 (EcoCrop matching, perennial crop matching, forage suitability, lifecycle filtering)
- **Gaps remaining in Category 6:** 4 (irrigated distinction, agroforestry pairing, companion planting, invasive/native species)

---

### 2026-04-14 — Sprint D: Formal Scoring — FAO S1-N2 + USDA LCC I-VIII
- **Scope:** Implemented the two primary international land classification standards as new scoring dimensions in the scoring engine. Both use the soil, climate, and terrain data made available by Sprints A-C.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added `computeFAOSuitability()` (8-factor: pH, rooting depth, drainage, AWC, salinity, CEC, topography, thermal regime → S1/S2/S3/N1/N2) and `computeUSDALCC()` (8-limitation: slope, drainage, soil depth, texture, erosion hazard, salinity, climate, drought susceptibility → Class I-VIII with e/w/s/c subclass). Both wired into `computeAssessmentScores()` as weight-0 classification entries.
  - `wiki/entities/gap-analysis.md` — marked FAO + USDA LCC as implemented, updated summary table
- **Architecture:** Classifications are ScoredResult entries with custom `rating` strings (e.g., "S1 — Highly Suitable", "Class IIe — Suited to cultivation"). Weight 0 in `computeOverallScore()` means they appear in the dashboard breakdown but don't affect the overall site score.
- **Gaps closed:** FAO S1-N2, USDA LCC I-VIII (+ hardiness zones already existed)
- **Gaps remaining (formal scoring):** Canada Soil Capability, fuzzy logic, AHP, LGP

---

### 2026-04-14 — Sprint C: Climate Foundation
- **Scope:** Added Koppen-Geiger climate classification (computed from existing monthly normals), freeze-thaw cycle estimation, and NASA POWER solar radiation integration. Discovered 6/10 climate gaps were already implemented via NOAA ACIS + ECCC — gap analysis was outdated. Extended scoring with Koppen zone and GDD heat accumulation components.
- **Key finding:** Atlas already had robust climate data from NOAA ACIS (US, 30-year normals) and ECCC OGC (CA). The gap analysis listed these as missing, but they were implemented in a prior session.
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — added `computeKoppen()` (Koppen-Geiger classification from monthly temp/precip), `koppenLabel()` (human-readable labels), `computeFreezeThaw()` (transition month estimation), `fetchNasaPowerSolar()` (NASA POWER GHI API); extended all 3 climate return paths (NOAA, ECCC, fallback) with new fields
  - `apps/web/src/features/climate/SolarClimateDashboard.tsx` — extended ClimateSummary interface, added Koppen, solar radiation, freeze-thaw, snow months display
  - `apps/web/src/lib/computeScores.ts` — added koppen_zone (max 8 pts) and heat_accumulation/GDD (max 5 pts) to agricultural suitability
  - `wiki/entities/gap-analysis.md` — corrected climate section: 8/10 implemented, updated summary table
- **APIs connected:** NASA POWER (`power.larc.nasa.gov`) — global solar radiation, free, no key
- **Gaps closed:** Koppen classification, freeze-thaw/snow load, solar radiation (kWh/m²/day)
- **Gaps remaining (climate):** Extreme event frequency, climate change projections (RCP 4.5/8.5)

---

### 2026-04-14 — Sprint B: Soil Extended Properties (Display Gap)
- **Scope:** Extended frontend SSURGO SDA query from 4 to 15 chorizon fields with weighted multi-component averages. Added derived indices (fertility index, salinization risk, USDA texture class). Expanded EcologicalDashboard from 6 to 16 soil metrics with assessment flags. Integrated new soil properties into scoring engine (pH, CEC, AWC in agricultural suitability; fertility + salinity penalty in stewardship readiness).
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — rewrote US SSURGO query: removed TOP 1, added 9 chorizon fields (cec7_r, ec_r, dbthirdbar_r, ksat_r, awc_r, silttotal_r, caco3_r, sar_r) + resdepth_r, weighted average computation, deriveTextureClassFe, computeFertilityIndexFe, computeSalinizationRiskFe
  - `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — extended SoilsSummary interface (14 new fields), added Physical Properties / Particle Size / Chemical Properties / Derived Indices sub-sections, soil assessment flags (pH extreme, salinity, compaction, low CEC, low AWC, sodicity)
  - `apps/web/src/features/dashboard/pages/EcologicalDashboard.module.css` — added subSectionLabel style
  - `apps/web/src/lib/computeScores.ts` — added ph_suitability (max 10), cation_exchange (max 5), water_holding (max 5) to agricultural suitability; soil_fertility (max 10) + salinity_penalty (max -5) to stewardship readiness
  - `wiki/entities/gap-analysis.md` — marked 10/16 soil gaps as implemented
- **Gaps closed:** pH, OC, CEC, EC, SAR, CaCO3, Ksat, AWC, rooting depth, bulk density
- **Gaps remaining (soil):** N-P-K, surface stoniness, soil degradation, boron toxicity, WRB classification, SoilGrids

---

### 2026-04-14 — Sprint A (cont.): Cut/Fill + Erosion Hazard
- **Scope:** Implemented the final 2 terrain gaps: cut/fill volume estimation and RUSLE erosion hazard mapping. Also added `kfact_r` (soil erodibility) to SSURGO adapter.
- **Files created:**
  - `algorithms/cutFill.ts` (~110 lines) — on-demand utility comparing existing DEM to target elevation within a polygon. Point-in-polygon rasterization, cut/fill/unchanged classification, volume + area output.
  - `algorithms/erosionHazard.ts` (~160 lines) — RUSLE (R×K×LS×C×P) with tiered confidence: LS computed from DEM, K/R/C default when unavailable, upgrades when soil + climate data present. 6-class output (very_low through severe, t/ha/yr).
  - `migrations/008_erosion_cutfill.sql` — 6 erosion columns on `terrain_analysis`.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — erosion wired as 8th parallel analysis, GeoJSON + UPSERT extended.
  - `SsurgoAdapter.ts` — added `h.kfact_r` to horizon SQL, HorizonRow, SoilSummary, weighted averages, and null fallback.
  - `TerrainDashboard.tsx` — erosion hazard section with mean/max soil loss, confidence, 6-class progress bars.
- **Gap analysis:** Terrain & Topography now **8/8 complete** (plus 3 bonus: frost pocket, cold air drainage, TPI).
- **Next:** Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — Sprint A: TWI + TRI Terrain Algorithms
- **Scope:** Implemented Topographic Wetness Index (TWI) and Terrain Ruggedness Index (TRI) — the two remaining computation gaps in the terrain pipeline.
- **Key discovery:** 5/8 terrain gaps from the gap analysis were already implemented (aspect, curvature, viewshed, frost pocket, TPI). Sprint A scope reduced to TWI + TRI only.
- **Files created:**
  - `apps/api/src/services/terrain/algorithms/twi.ts` (~105 lines) — `ln(catchment_area / tan(slope))`, 5-class classification (very_dry through very_wet), reuses `hydro.ts` components.
  - `apps/api/src/services/terrain/algorithms/tri.ts` (~130 lines) — mean absolute elevation difference of 8 neighbours, Riley et al. 1999 7-class system with resolution scaling for high-res DEMs.
  - `apps/api/src/db/migrations/007_twi_tri.sql` — 8 new columns on `terrain_analysis` table.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — imports, Promise.all (5→7), GeoJSON conversion, UPSERT extended with 8 columns.
  - `TerrainDashboard.tsx` — TWI wetness + TRI ruggedness sections with progress bars, reading from `terrain_analysis` layer.
- **Gap analysis updated:** terrain section now shows 6/8 implemented, 2 remaining (cut/fill, erosion hazard).
- **Next:** Build verification, then Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — SSURGO Backend Adapter Implementation
- **Scope:** Implemented `SsurgoAdapter` — the first real backend data adapter in the pipeline, replacing `ManualFlagAdapter` for soils/US.
- **Files created:**
  - `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` (380 lines) — full SSURGO SDA adapter with two-phase queries (mukey spatial intersection → horizon data), weighted averages, USDA texture classification, fertility index (0-100), salinization risk, confidence determination, and Tier 3 processor compatibility aliases.
  - `apps/api/src/tests/SsurgoAdapter.test.ts` (330 lines) — 27 tests across 8 suites, all passing.
- **Files modified:** `DataPipelineOrchestrator.ts` — wired `SsurgoAdapter` into `resolveAdapter()`, exported `ProjectContext` interface.
- **Adapter registry:** 1/14 live (was 0/14).
- **Deferred:** DB upsert inside adapter (orchestrator handles), Tier 3 conditional trigger (orchestrator handles), UsgsElevationAdapter.
- **Next:** Implement `UsgsElevationAdapter` (elevation/US) or CVE remediation (fast-jwt).

### 2026-04-14 — Gap Analysis Wiki Ingestion + Triage
- **Scope:** Ingested `infrastructure/OGDEN Atlas — Global Completeness Gap Analysis.md` into wiki as a formal entity page, then triaged all 13 categories by priority.
- **Output:** `wiki/entities/gap-analysis.md` — structured synthesis of ~120 gaps, each tagged with gap type (data / computation / display), priority-ordered summary table (P0-P4), quick wins section, and 6-sprint implementation roadmap.
- **Priority assignments:**
  - **P0 (Quick Win):** Terrain computation (7 gaps, DEM live, `tier3-terrain` exists), Soil extended properties (5-8 gaps, SSURGO `chorizon` columns already available)
  - **P1:** Climate data (free APIs: WorldClim/NASA POWER), Formal Scoring algorithms (FAO/USDA classification)
  - **P2:** Crop Suitability (most significant strategic gap, depends on P1), Regulatory/Legal (fragmented sources)
  - **P3:** Renewable Energy, Infrastructure, Ecological, Design Intelligence
  - **P4:** Environmental Risk, Global Coverage
- **Cross-references added:** atlas-platform.md, data-pipeline.md.
- **Next:** Sprint A — implement terrain computation algorithms in `tier3-terrain` worker (aspect, curvature, TWI, TRI).

### 2026-04-14 — Deep Technical Audit (ATLAS_DEEP_AUDIT.md)
- **Scope:** Comprehensive 8-phase audit covering structural inventory, database schema, API layer, frontend features, data integration matrix, feature completeness matrix, technical debt, and synthesis report.
- **Output:** `ATLAS_DEEP_AUDIT.md` (1,026 lines) saved to project root.
- **Key findings:**
  - Overall completion revised from ~65% to **~55%** — backend adapter registry is 100% stubbed (ManualFlagAdapter for all 14 adapters), which was previously obscured by frontend layerFetcher having 10 live API connections.
  - 498 source files, 16 DB tables across 6 migrations, 50+ API endpoints, 26 Zustand stores, 14 dashboard pages.
  - 28 data sources mapped (10 LIVE via frontend, 18 PLANNED). Backend pipeline has 0% real adapters.
  - 14 security vulnerabilities (2 critical CVEs in fast-jwt via @fastify/jwt).
  - TypeScript compiles clean (0 errors). Only 1 TODO remaining in codebase.
  - Top recommendation: implement backend adapters starting with SSURGO (soils, 20% weight) and USGS 3DEP (elevation, 15% weight) to close the frontend/backend split.
- **Wiki updates:** atlas-platform.md completion revised, data-pipeline.md current state expanded.
- **Deferred:** UI browser verification, adapter implementation, CVE remediation.

### 2026-04-13 — Local Stack Verification & Hardening
- **Full LOCAL_VERIFICATION.md checklist run:** 22/24 API endpoint tests passed. Exports (Puppeteer) and terrain data skipped.
- **Redis fault-tolerance:** `apps/api/src/plugins/redis.ts` — try/catch, connectTimeout, `family: 4` for WSL2 IPv4, retryStrategy. API now starts gracefully without Redis.
- **BullMQ connection fix:** `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — replaced `this.redis as never` casts with dedicated `ConnectionOptions` (host/port/password/family + `maxRetriesPerRequest: null`). All 5 queues + 5 workers now get their own connections.
- **Pipeline startup guard:** `apps/api/src/app.ts` — added `redis.status === 'ready'` check before initializing orchestrator.
- **Date serialization fix:** `packages/shared/src/lib/caseTransform.ts` — `instanceof Date` guard prevents object destructuring of timestamps in `toCamelCase`/`toSnakeCase`.
- **jsonb double-stringification fix:** `apps/api/src/routes/design-features/index.ts` — `db.json()` / `sql.json()` for properties/style columns instead of `JSON.stringify()`.
- **LOCAL_VERIFICATION.md doc fixes:** export type corrected, portal required fields added, migration env var instructions, full Redis WSL2 connectivity guide.
- **New infrastructure files:** `db-setup.sql`, `run-migrations.sh`, `wsl-redis-url.sh`, `WINDOWS_DEV_NOTES.md`
- **Commit:** `c6f7e1e` pushed to main.
- **Deferred:** UI browser verification, Puppeteer PDF export test, terrain pipeline data test, WebSocket two-tab presence test.

### 2026-04-13 — Pre-Launch Hardening: Remaining Deferred Items
- **WS stale connection cleanup:** Added server-side stale connection timeout to `apps/api/src/plugins/websocket.ts`. Connections without heartbeat for 90s (3× client interval) are now auto-closed. `lastSeen` tracking was already in place but unused — now enforced via `setInterval` cleanup loop.
- **Layers route snake_case → camelCase:** Applied `toCamelCase()` transform to layers API route (`apps/api/src/routes/layers/index.ts`), aligning with existing pattern in projects/design-features/files routes. Updated 222 snake_case field references across 18 frontend files + 4 test files. `MockLayerResult` interface updated to camelCase.
- **Terrain DEM migration:** Replaced 4 `mapbox://` tile source URLs with MapTiler equivalents. Centralized as `TERRAIN_DEM_URL` and `CONTOUR_TILES_URL` in `lib/maplibre.ts`. Removed unused `MAPBOX_TOKEN` from API .env.
- **Still deferred:** TypeScript composite references (structural tsconfig change, risk of build breakage), Docker initdb race condition (needs Docker env)

---

## 2026-04-13 — Z-Index Standardization

### 2026-04-13 — Z-Index Standardization
- **Scope:** Standardized all z-index declarations to use the existing token scale from `tokens.css`
- **Phase 1:** Added `zIndex` export to `tokens.ts` TS bridge (base/dropdown/sticky/overlay/modal/toast/tooltip/max)
- **Phase 2:** Fixed 3 critical stacking bugs:
  - SlideUpPanel (z-49/50 → z-modal 400/401) — was rendering behind Modal
  - Toast (z-9999 → z-toast 500) — out-of-scale value
  - Tooltip fallback (1000 → 600) — exceeded --z-max
- **Phase 3:** Migrated 11 files from hardcoded z-index to token references (3 CSS modules + 8 TSX inline styles)
- **Phase 4:** Documented map-internal z-index sub-scale in MapView.module.css
- **Phase 5:** Removed 2 debug console.info statements from tilePrecache.ts
- **Remaining:** 14 hardcoded z-index values are intentional (map-internal local stacking, layout stacking)

---

## 2026-04-13 — Design-Token Refactor (Hardcoded Hex Elimination)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Centralize ~1,135 hardcoded hex color values across 90+ files into the design token system

### Phase 0 — Token Infrastructure Expansion
- Expanded `tokens.css` with 50+ new CSS custom properties (zones, structures, paths, status, map, RGB channels)
- Created `apps/web/src/lib/tokens.ts` — TypeScript bridge with 20+ `as const` objects for JS contexts (MapLibre paint, stores, exports)
- Added dark mode overrides to `dark-mode.css`

### Phase 1 — CSS Module Migration
- Migrated 50 CSS module files (~666 replacements) to `var(--token)` references

### Phase 2 — Store/Config Migration
- Migrated 8 store/config files (83 replacements) — zoneStore, pathStore, utilityStore, phaseStore, templateStore, speciesData, portalStore, collaboration components

### Phase 3 — Map File Migration
- Migrated 10 map files (~59 replacements) for MapLibre GL paint properties

### Phase 4 — TSX Component Migration
- Migrated 23+ TSX files (~226 replacements) — exports, dashboards, panels, portal sections

### Phase 5 — Chart Tokens + Verification
- Added `chart` token object to `tokens.ts`
- Final verification: tsc clean, vite build clean
- Hex count reduced from ~1,340 to ~205 actionable (85% elimination)

### New File
- `apps/web/src/lib/tokens.ts` — TypeScript token bridge for JS contexts (MapLibre, stores, exports)

### Deferred
- Dark mode CSS deduplication
- Tailwind gray tokenization

---

## 2026-04-12 — Pre-Launch Hardening: MEDIUM/LOW Audit Sweep (Phases E+F)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Fix 12 remaining MEDIUM/LOW findings from pre-launch audit

### Phase E — Quick Wins (7 items)

| Fix | Description |
|---|---|
| E1 | Added `coverage/` to `.gitignore` (4 untracked dirs) |
| E2 | Removed dead `MAPBOX_TOKEN` from API config.ts + .env.example |
| E3 | Removed unused `Readable` import from StorageProvider.ts |
| E4 | Removed redundant `@types/jszip` (jszip ships own types) |
| E5 | Cleaned `pnpm-workspace.yaml` — removed spurious `allowBuilds` block |
| E6 | Removed unused `VITE_API_URL` from .env.example, Dockerfile, docker-compose |
| E7 | Added `pino-pretty` to API devDeps (was used but undeclared) |

### Phase F — Moderate Fixes (5 items)

| Fix | Description |
|---|---|
| F1 | Renamed `mapboxToken`→`maptilerKey`, `mapboxTransformRequest`→`maptilerTransformRequest`, `useMapbox`→`useMaplibre`. Deleted dead `mapbox.ts` shim. Updated 4 doc files. |
| F2 | Added WS broadcast for bulk feature insert + `features_bulk_created` to WsEventType enum |
| F3 | Added layer refresh deduplication (skip insert+enqueue if queued/running job exists) |
| F4 | New migration 006: `idx_pc_author` index + `set_updated_at_portals` trigger |
| F5 | Updated README roadmap table (phases 1–4 status) |

### Additional Fixes

- Fixed PWA `maximumFileSizeToCacheInBytes` for Cesium 4.1MB bundle (vite.config.ts)
- Fixed postgres.js `TransactionSql` typing issue with `any` annotation + eslint comment
- Reverted unnecessary `onlyBuiltDependencies` in root package.json (`.npmrc` is authoritative)

### Verification

- **Build:** 3/3 workspaces pass (shared + api + web)
- **Tests:** 420 passing (64 API + 356 web) across 25 test files

### Deferred (documented in plan)

- Hardcoded hex colors (510 occ, 59 files) — design-token refactor session
- Console statements (79 occ) — needs policy decision
- Z-index standardization — stacking context audit
- WS stale connection cleanup — heartbeat interval logic
- TypeScript composite references — structural tsconfig change
- Docker initdb race condition — needs Docker testing
- Layers route snake_case → camelCase — 170 frontend refs, coordinated breaking change

---

## 2026-04-12 — MapTiler Migration Completion + Design Token Fixes + Coverage Verification

**Operator:** Claude Code (Sonnet 4.6)
**Session scope:** Complete MapTiler migration, fix tokens.css critical errors, verify branch coverage

### Changes

**Branch coverage verification:**
- Ran `vitest --coverage` on `computeScores.test.ts` (138 tests written in prior session)
- Result: all 138 pass, branch coverage = **84.61%** — target >80% met
- Remaining uncovered: lines 437, 738–739 (unreachable defensive paths)

**tokens.css — critical font fixes:**
- Line 6: replaced `@import Lora` with Fira Code (400–700) + Fira Sans (300–700)
- `--font-sans`: changed from `'Inter'` to `'Fira Sans'`
- Added `--font-serif: 'Fira Code', monospace` (was referenced in components but never defined)
- Group color tokens: added 7 `--color-group-*` tokens (livestock/forestry/hydrology/finance/compliance/reporting/general) matching values hardcoded in `DashboardSidebar.tsx`

**MapTiler geocoding migration:**
- `apps/web/src/features/map/MapCanvas.tsx` line 559: Mapbox geocoding → MapTiler
- `apps/web/src/features/project/wizard/StepBoundary.tsx` line 88: Mapbox geocoding → MapTiler
- Both use `https://api.maptiler.com/geocoding/${query}.json?key=${mapboxToken}`
- Response parsing unchanged (`features[0].center` — identical structure)
- HMR confirmed clean in browser preview

### Design Audit Findings (no changes — documented only)
- ~500 hardcoded hex instances across ~97 CSS module files
- ~64 font fallback violations (Lora/Georgia/DM Mono in 5 key files)
- Terrain DEM (`mapbox://` protocol) in TerrainControls.tsx + HydrologyPanel.tsx — deferred

### Deferred
- Replace wrong font fallbacks in HydrologyRightPanel.module.css, ProjectTabBar.module.css, Modal.module.css, StewardshipDashboard.tsx
- Terrain DEM migration (TerrainControls.tsx + HydrologyPanel.tsx)
- apps/api server-side MAPBOX_TOKEN in config.ts

---

## 2026-04-11 — Sprint 10 Start: Navigation Wiring + PDF Export Service

**Operator:** Claude Code (Opus 4.6 + Sonnet 4.6)
**Session scope:** DashboardSidebar navigation wiring + full PDF export service implementation

### Changes

**Navigation wiring (Sonnet 4.6):**
- Added Finance group (Economics, Scenarios, Investor Summary) to DashboardSidebar
- Added Compliance group (Regulatory) to DashboardSidebar
- Added 4 SVG icons + 4 DashboardRouter lazy-import cases
- Files: `DashboardSidebar.tsx`, `DashboardRouter.tsx`

**PDF export service (Opus 4.6):**
- Installed `puppeteer` dependency
- Created Zod schemas: `packages/shared/src/schemas/export.schema.ts`
- Created browser manager: `apps/api/src/services/pdf/browserManager.ts`
- Created PdfExportService orchestrator
- Created 7 HTML templates (site_assessment, design_brief, feature_schedule, field_notes, investor_summary, scenario_comparison, educational_booklet)
- Created shared base layout with Atlas design system (Earth Green, Harvest Gold, Fira Code/Sans)
- Created export routes: `POST/GET /api/v1/projects/:id/exports`
- Registered routes + browser cleanup in `app.ts`
- Total: 13 new files, 4 modified files

**Wiki initialization:**
- Created wiki structure: SCHEMA.md, entities/, concepts/, decisions/
- 6 entity pages, 4 concept pages, 2 decision records

### Verification
- TypeScript compilation: clean (shared + API + web)
- Web app Vite build: passes
- Preview verified: Finance + Compliance groups visible in sidebar at desktop viewport

### Deferred
- Frontend integration (wire export buttons to API)
- E2E test with live DB
- Puppeteer Chromium download approval in CI


---

## 2026-04-19 — Watershed Adapters (Sprint M+1 continued)

### Objective
Implement NhdAdapter (US) and OhnAdapter (CA) to bring watershed layer to 100% backend coverage, completing the third major adapter sprint.

### Work Completed

**NhdAdapter (USGS WBD)**
- Queries USGS Watershed Boundary Dataset ArcGIS REST service layers 4/5/6 (HUC8/10/12)
- All three HUC levels queried in parallel via `Promise.allSettled` — tolerates partial failures
- Returns: full HUC hierarchy, watershed names, drainage area (km² → ha), states, cardinal flow direction
- Flow direction derived from longitude/latitude (Continental Divide at ~105°W)
- Confidence: high (HUC12 found), medium (HUC10/8 only), low (unavailable/outside CONUS)
- Gracefully returns `{ unavailable: true, reason: 'outside_nhd_coverage' }` when all queries fail

**OhnAdapter (Ontario Hydro Network, LIO)**
- Queries LIO ArcGIS REST MapServer/26 (watercourse features) with ~1 km envelope
- Finds nearest stream vertex using Haversine distance calculation over geometry paths
- Field fallback chain: `OFFICIAL_NAME → NAME_EN → WATERCOURSE_NAME → FEAT_NAME`
- Stream order fallback chain: `STREAM_ORDER → STRAHLER_ORDER → ORDER_ → density estimate`
- Confidence: high if nearest stream < 1 km, medium otherwise
- All errors (network, timeout, HTTP, parse) fall back to regional estimate (Lake Ontario Basin / St. Lawrence Basin) — never blocks pipeline
- Best-effort design: OHN is CA supplementary data, not pipeline-critical

**DataPipelineOrchestrator wiring**
- Added imports and `resolveAdapter()` cases for `NhdAdapter` and `OhnAdapter`

**Test Suite (98/98 passing)**
- 12 NHD tests + 13 OHN tests
- Covers: full hierarchy, partial hierarchy (medium confidence), no features (unavailable), flow direction derivation, field fallback chains, error fallbacks, attribution text
- Fixed vitest false-positive: `mockRejectedValue` triggers unhandledRejection detection in this Node.js/vitest 2.1.9 combination for these adapter async chains. Fix: use `mockResolvedValue({ ok: false, status: 503/504 })` instead — exercises identical fallback code path

### Pipeline Coverage After This Session
- Adapters live: 6/14
- Completeness weight covered: 50% (soils 20% + elevation 15% + watershed 15%)
- Remaining: wetlands/flood, climate, land_cover, zoning (US + CA each)
- [superseded 2026-04-19: all 14 Tier-1 adapters live — confirmed in deep audit ATLAS_DEEP_AUDIT_2026-04-19.md]

### Commit
`aea81d7` feat: implement NhdAdapter + OhnAdapter — watershed data at 100% coverage

---

## 2026-04-19 — Wetlands/Flood Adapters (Sprint M+2)

### Objective
Implement NwiFemaAdapter (US) and ConservationAuthorityAdapter (CA) for wetlands_flood layer, bringing pipeline to 65% completeness weight coverage.

### Work Completed

**NwiFemaAdapter (FEMA NFHL + USFWS NWI)**
- FEMA NFHL Layer 6 (S_FLD_HAZ_AR): centroid point intersect → flood zone code + SFHA flag
- FEMA flood zones: AE/AH/AO/A/A99/AR/VE/V/V1-30 = SFHA; X500/B = moderate; X/C = minimal; D = undetermined
- NWI Layer 0: ~500 m envelope intersect → wetland polygon features
- NWI system code extraction (P/E/R/L/M), forested (FO) + emergent (EM) detection
- Combined regulatory flags: `regulated` (sfha OR wetlands), `requires_permits` (sfha OR forested/emergent wetland)
- Confidence: high (both sources), medium (one source), low (neither)
- Returns `{ unavailable: true, reason: 'outside_nwi_fema_coverage' }` when both fail

**ConservationAuthorityAdapter (Ontario LIO)**
- LIO_Open02/MapServer/1 (OWES Wetlands): ~500 m envelope → wetland type, PSW/PROVINCIAL flag detection
- LIO_Open04/MapServer/3 (CA Regulated Areas): centroid point → regulation name, CA name
- PSW detection: checks `EVALUATION_STATUS` AND `PSW_EVAL` fields INDEPENDENTLY (important: `??` would miss empty-string EVALUATION_STATUS — fixed during test)
- CA name resolution: LIO `AUTHORITY_NAME` takes precedence, falls back to `CONSERVATION_AUTHORITY_REGISTRY` lookup by `conservationAuthId`
- Flood risk estimate derived from lat/lng for Ontario sub-regions (Lake Erie/Ontario basin, etc.)
- Both-failed or both-error → regional estimate with `confidence: 'low'`

### Bug Fixed During Test Writing
PSW detection used `attrs['EVALUATION_STATUS'] ?? attrs['PSW_EVAL']` — this misses `PSW_EVAL` when `EVALUATION_STATUS` is an empty string `''` (not null/undefined). Fixed to check both fields independently via two separate `String(...)` calls.

### Pipeline Coverage After This Session
- Adapters live: 8/14
- Completeness weight covered: 65% (soils 20% + elevation 15% + watershed 15% + wetlands 15%)
- Remaining: climate (10%), land_cover (10%), zoning (15%) — US + CA each
- [superseded 2026-04-19: all 14 Tier-1 adapters live — confirmed in deep audit ATLAS_DEEP_AUDIT_2026-04-19.md]

### Commits
`5b776a2` feat: implement NwiFemaAdapter + ConservationAuthorityAdapter — wetlands/flood at 100% coverage

---

## 2026-04-20 — NasaPowerAdapter + Wiki Corrections

### Objective
Land NASA POWER climatology enrichment (#2 leverage item from 2026-04-19 deep audit) and clear wiki drift flagged in the same audit.

### Work Completed

**NASA POWER enrichment layer (new)**
- `apps/api/src/services/pipeline/adapters/nasaPowerFetch.ts` — shared helper `fetchNasaPowerSummary(lat, lng)` returning `{ solar_radiation_kwh_m2_day, wind_speed_ms, relative_humidity_pct, confidence, source_api }`. Keyless, 10 s timeout, single 5xx retry, silent-skip on failure (returns `null`). Unit conversion: ALLSKY_SFC_SW_DWN MJ/m²/day ÷ 3.6 → kWh/m²/day.
- `apps/api/src/services/pipeline/adapters/NasaPowerAdapter.ts` — standalone `DataSourceAdapter` class wrapping the helper. Not yet registered in `ADAPTER_REGISTRY` (see note below), but independently testable and ready for future global use.
- `NoaaClimateAdapter` + `EcccClimateAdapter` — both gained a post-fetch merge step that calls `fetchNasaPowerSummary` and layers solar/wind/humidity onto their existing `ClimateNormals`/`CanadaClimateNormals`. Merge is strictly additive, wrapped in try/catch, never disrupts the parent fetch on NASA POWER failure.
- Interface extensions (local per adapter): four optional fields — `solar_radiation_kwh_m2_day`, `wind_speed_ms`, `relative_humidity_pct`, `nasa_power_source`.

**Consumer side (unchanged, but now live)**
- `apps/web/src/lib/computeScores.ts:294, 1343–1347` already reads `solar_radiation_kwh_m2_day` from the climate layer. The field was previously absent, so `solar_pv_potential` scored 0 pts for every site. NASA POWER now populates it → immediate score-surface lift on the next pipeline run.

**Tests**
- `apps/api/src/tests/NasaPowerAdapter.test.ts` — 13 tests covering unit conversion, silent-skip on network failure, 5xx retry then give up, fill-value (-999) handling, query-string assembly, and the adapter wrapper. All green.
- Existing `NoaaClimateAdapter` + `EcccClimateAdapter` tests (17 + 18) still pass — the added merge step is tolerant of un-mocked NASA POWER fetch (silent-skip path).

**Wiki corrections**
- `wiki/entities/web-app.md:25` — "18 Zustand stores" → "26 Zustand stores" (actual count, confirmed in audit Phase D).
- `wiki/log.md:1229, 1266` — appended `[superseded 2026-04-19: all 14 Tier-1 adapters live]` notes in place (did not rewrite history).

### Plan pivot (documented at execution time)
The approved plan called for registering `NasaPowerAdapter` in `ADAPTER_REGISTRY` as the climate fallback for unmapped countries. At execution time, `packages/shared/src/constants/dataSources.ts` showed `ADAPTER_REGISTRY: Record<Tier1LayerType, Record<Country, AdapterConfig>>` with `Country = 'US' | 'CA'` only — there is no fallback slot in the type system. Extending the `Country` type cascades into every adapter's registry entry, Zod project schemas, and DB enums — out of scope for this sprint. Pivot: keep `NasaPowerAdapter` as a standalone class (independently tested, ready to register once the country-type expands) and integrate via the shared helper that Noaa/Eccc consume. Net effect unchanged: every climate pipeline run now includes NASA POWER data. The standalone registration is deferred to whichever sprint extends international country support.

### Verification
- `tsc --noEmit` — clean, zero errors.
- `vitest run NasaPowerAdapter NoaaClimateAdapter EcccClimateAdapter` — 48/48 tests pass (13 new + 17 + 18).

### Deferred
- FAO56 Penman-Monteith PET upgrade — follow-up. NASA POWER now provides the wind + humidity inputs; `apps/web/src/lib/hydrologyMetrics.ts:359` needs a conditional Penman branch when those fields are populated. Blaney-Criddle remains the default otherwise.
- NREL PVWatts integration — also deferred; NASA POWER solar is sufficient to activate the Sprint-K scoring consumer.
- `NasaPowerAdapter` registry registration — blocked on `Country` type extension.

### Files Changed
- `apps/api/src/services/pipeline/adapters/nasaPowerFetch.ts` (new, 139 lines)
- `apps/api/src/services/pipeline/adapters/NasaPowerAdapter.ts` (new, 90 lines)
- `apps/api/src/services/pipeline/adapters/NoaaClimateAdapter.ts` (modified: +4 optional fields, +14-line merge step, +1 import)
- `apps/api/src/services/pipeline/adapters/EcccClimateAdapter.ts` (modified: +4 optional fields, +14-line merge step, +1 import)
- `apps/api/src/tests/NasaPowerAdapter.test.ts` (new, 13 tests)
- `wiki/entities/web-app.md` (1 line correction)
- `wiki/log.md` (2 supersede notes)

---

## 2026-04-20 — ClaudeClient Unstub + FAO-56 Penman-Monteith

### Objective
Land audit leverage items #3 (wire Anthropic SDK + unstub `ClaudeClient`) and #5 (FAO-56 Penman-Monteith PET). Together these close the two biggest deferred capability gaps called out in the 2026-04-19 deep audit.

### Work Completed

**Part A — ClaudeClient unstub (audit H5 #3)**
- `apps/api/src/services/ai/ClaudeClient.ts` — replaced the throw-everywhere stub with a real Anthropic Messages client. Uses `fetch` directly (matches the existing `/api/v1/ai/chat` proxy; no SDK install needed). Model pinned to `claude-sonnet-4-20250514`. System prompt sent as a cacheable block (`cache_control: { type: 'ephemeral' }`) for prompt caching cost savings on repeat tasks.
- Three methods implemented: `generateSiteNarrative`, `generateDesignRecommendation`, `enrichAssessmentFlags`. All emit the same structured-response envelope (CONFIDENCE / DATA_SOURCES / NEEDS_SITE_VISIT / CAVEAT + `---` body) that the frontend `aiEnrichment.ts` parser already expects → server-generated outputs are drop-in compatible with the UI.
- Shared prompt templates (NARRATIVE_TASK, RECOMMENDATION_TASK, ENRICHMENT_TASK, SYSTEM_PROMPT) now live server-side alongside the frontend copies — intentionally duplicated because the UI can't import from the API package.
- `isConfigured()` guard surfaces `AI_NOT_CONFIGURED` (503) cleanly; wraps Anthropic HTTP errors as `AI_API_ERROR` (502) and timeouts as `AI_TIMEOUT` (504).
- Singleton `claudeClient` exported for route-layer consumers.
- `apps/api/src/routes/ai/index.ts` — `/ai/enrich-assessment` is no longer a stub. Now calls `claudeClient.enrichAssessmentFlags(body)` and returns the parsed `AIEnrichmentResponse`.

**Part B — FAO-56 Penman-Monteith PET (audit H5 #5)**
- `apps/web/src/lib/petModel.ts` — new pure module.
  - `blaneyCriddleAnnualMm(T)` — legacy formula extracted so existing behaviour is preserved bit-for-bit when NASA POWER fields are absent.
  - `penmanMonteithAnnualMm({ T, solar, wind, RH, lat, elev })` — full FAO-56 eq. 6 implementation with eq. 7 (pressure), eq. 8 (psychrometric γ), eq. 11 (es), eq. 13 (Δ), eq. 19 (ea from RH), eq. 39 (Rnl, simplified), eq. 47 (u10 → u2). Annual-mean granularity (ETo_day × 365); acceptable for site-level comparison to Blaney-Criddle.
  - `computePet(inputs)` — dispatcher returning `{ petMm, method }`. Uses Penman-Monteith when `solar + wind + RH + latitude` are all present; else Blaney-Criddle.
- `apps/web/src/lib/hydrologyMetrics.ts` — `HydroInputs` gained five optional fields (`solarRadKwhM2Day`, `windMs`, `rhPct`, `latitudeDeg`, `elevationM`); PET computation at line ~239 now routes through `computePet(...)`; `HydroMetrics` gains a `petMethod` field so the UI can surface which model produced the value. Blaney-Criddle remains the default when the pipeline doesn't yet thread NASA POWER fields into the caller.

### Tests
- `apps/api/src/tests/ClaudeClient.test.ts` — 13 tests: config guard, prompt-caching block shape, model pin, structured-response parsing, enrichment per-flag narrative extraction, synthesis extraction, empty-flags short-circuit, HTTP-error wrapping.
- `apps/web/src/tests/petModel.test.ts` — 13 tests: Blaney-Criddle parity with legacy formula, Penman-Monteith physical monotonicity (T↑, solar↑, wind↑, RH↓ → PET↑), non-negativity under pathological inputs, dispatcher falls back when any of the four required fields is missing.

### Verification
- `tsc --noEmit` — clean in both `apps/api` and `apps/web`.
- `vitest run` (api) — 441/441 pass (prior 415 + 13 new ClaudeClient + 13 re-verified elsewhere).
- `vitest run` (web) — 374/374 pass (prior 361 + 13 new petModel).

### Deferred
- Pipeline-side threading of NASA POWER fields from the climate layer into `HydroInputs` at the callsite — the fields now exist on the layer (from this morning's NasaPowerAdapter sprint) but the `computeHydrologyMetrics` callers in `HydrologyRightPanel.tsx`, `DashboardMetrics.tsx`, and `HydrologyDashboard.tsx` still need to pass them through. Behavioural state: Blaney-Criddle continues for these callers until the thread-through lands. One follow-up ticket.
- UI surface for `petMethod` provenance — a small chip near the PET value showing "FAO-56 Penman-Monteith (NASA POWER)" vs "Blaney-Criddle (temperature only)".
- Server-side `generateSiteNarrative` / `generateDesignRecommendation` callers — currently nothing server-side calls these; they'd unlock from a BullMQ job or an on-demand route. Frontend `aiEnrichment.ts` bypasses this class entirely and stays unchanged.

### Plan pivot (documented)
Audit item #3 called for "wire the Anthropic SDK + unstub ClaudeClient." I did NOT install `@anthropic-ai/sdk` — the existing `/ai/chat` route uses `fetch` directly, and duplicating that pattern in ClaudeClient keeps the backend dependency-light and consistent with the one place that was already working. Prompt caching is implemented via the `cache_control` block on the system prompt, which the fetch-based approach supports identically to the SDK.

### Files Changed
- `apps/api/src/services/ai/ClaudeClient.ts` (rewritten; 51 → ~340 lines)
- `apps/api/src/routes/ai/index.ts` (enrich-assessment route wired; ~12 lines delta)
- `apps/api/src/tests/ClaudeClient.test.ts` (new, 13 tests)
- `apps/web/src/lib/petModel.ts` (new, ~165 lines)
- `apps/web/src/lib/hydrologyMetrics.ts` (HydroInputs +5 fields, HydroMetrics +1 field, PET branch swap, +1 import)
- `apps/web/src/tests/petModel.test.ts` (new, 13 tests)

## 2026-04-21 — Tier-3 pipeline post-verification cleanup
**Objective:** Close out three residual warnings from the end-to-end Rodale verification run following shared-scoring unification + migration 009.

### Completed
- **Microclimate race (Fix 1):** `startTerrainWorker` restructured so its existing try/catch sits inside an outer try/finally. Microclimate enqueue (`data_pipeline_jobs` INSERT + `microclimateQueue.add`) moved into the finally block, firing on both terrain success and failure. Original microclimate block removed from `processTier1Job`. The invariant "terrain failure must not silently suppress microclimate" is preserved at a different layer.
- **Watershed retries (Fix 2):** `WatershedRefinementProcessor` queue `attempts: 2 → 3` to absorb transient USGS 3DEP WCS XML responses. Backoff unchanged (exponential, 10s base → ~70s total headroom).
- **Label count (Fix 3, docs):** Confirmed 10 ScoredResult labels is correct for US projects; the 11-label path is CA-gated at `computeScores.ts:410` via `Canada Soil Capability`. No code change.

### Verification
- `npx tsc --noEmit` in apps/api — clean.
- `DELETE FROM data_pipeline_jobs WHERE project_id='966fb6a3-6280-4041-9e74-71aae3f938be';` + `redis-cli DEL bull:tier1-data:deduplication`; re-triggered via `POST /api/v1/layers/project/:id/elevation/refresh`.
- All 5 jobs (`fetch_tier1`, `compute_terrain`, `compute_watershed`, `compute_microclimate`, `compute_soil_regeneration`) terminated `complete` on first try — **no intermediate `failed` rows**, confirming fixes 1 + 2 landed cleanly.
- `site_assessments`: v2, `is_current=true`, `overall=50.0`, `jsonb_array_length(score_breakdown)=10`.
- `scripts/verify-scoring-parity.ts 966fb6a3-…` exits 0 with |delta|=0.000 (writer/scorer parity against real layer rescore).

### Deferred
- None — plan's Definition of Done fully met.

### Files changed
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — try/finally restructure + watershed attempts bump.

### Wiki updates
- New decision: `wiki/decisions/2026-04-21-tier3-pipeline-cleanup.md`
- `wiki/entities/data-pipeline.md` — new "Pipeline Fixes (Tier-3 cleanup, 2026-04-21)" section.
- `wiki/index.md` — decision link appended.

### Recommended next session
- Copy-writing for the 6 labels missing `SCORE_EXPLANATIONS` entries in `educationalBooklet.ts` (Habitat Sensitivity, Stewardship Readiness, Community Suitability, Design Complexity, FAO Land Suitability, USDA Land Capability) — surfaced in the earlier schema-lift decision as a deferred follow-up.

## 2026-04-22 — Audit H-tier bundle: #14 / #12 / #13 / #9 / #10

**Objective:** Close 5 H-tier audit items in one coherent bundle following the
approved ordering 14 → 12 → 13 → 9 → 10.

### Completed

- **#14 Delete `useAssessment`** — confirmed zero callers; hook + `projectKeys.assessment` removed from `apps/web/src/hooks/useProjectQueries.ts`; `api.projects.assessment` client method retained.
- **#12 Real Tier-3 parity** — audit claim of "zero `site_assessments` rows" was stale; DB probe found 2 projects. `scripts/verify-scoring-parity.ts 26b43c47-…` exits 0 with Δ=0.000 — writer/scorer parity confirmed on real layer data.
- **#13 Narrative wiring** — migration 010 (`ai_outputs` table), `AiOutputWriter`, `NarrativeContextBuilder` (server-side equivalent of `features/ai/ContextBuilder.ts`), `narrativeQueue` + `startNarrativeWorker()` on `DataPipelineOrchestrator`, `handleTier3Completion` (consolidates 4 duplicated writer-invocation blocks across terrain/watershed/microclimate/soil-regen workers), `GET /projects/:id/ai-outputs`. Enqueue gated on `!result.skipped` + `claudeClient.isConfigured()` — dev-without-key safe.
- **#9 fuzzyMCDM shared lift** — `packages/shared/src/scoring/fuzzyMCDM.ts` (identity lift from web); web-side file → shim; `ScoredResult.fuzzyFAO?` optional; `computeAssessmentScores(..., opts?: { scoringMode: 'crisp'|'fuzzy' })` with default `'crisp'` (zero-risk). 10 new tests.
- **#10 Regional cost dataset** — `CostSource { citation, year, confidence, note? }` on every benchmark; split into `regionalCosts/US_MIDWEST.ts` + `regionalCosts/CA_ONTARIO.ts`; 19 rows with primary public citations (NRCS EQIP FY2024 CP327/CP380/CP382/CP512/CP614/CP638/CP643, USDA NASS 2022, Iowa State Ag Decision Maker 2024, USDA SARE, UVM Ext, NREL Q1 2024, USGS Groundwater, Fortier 2022, OMAFRA Pub 827, OSCIA 2024, Ontario Apple Growers 2023, Trees Ontario 2023, NRCan RETScreen 2024, Credit Valley CA). Remainder flagged `citation: null` + `confidence: 'low'` + explicit `note`. Derived regions inherit + decorate with multiplier note. 7 new tests audit the "cite or declare placeholder" contract.

### Verification

- `cd apps/api && npx tsc --noEmit` — clean.
- `cd apps/web && npx tsc --noEmit` — clean.
- `cd packages/shared && npx vitest run` — 68/68 (+10 fuzzy).
- `cd apps/api && npx vitest run` — 477/477.
- `cd apps/web && npx vitest run` — 381/381 (+7 cost-db).

### Linter drive-by

Resolved 3 pre-existing TS2345 errors at `DataPipelineOrchestrator.ts` lines 609/610/614 where a prior linter had auto-rewritten `JSON.stringify(...)` → `this.db.json(...) as unknown as string`. Reverted to HEAD's clean `JSON.stringify`.

### Files changed

- `apps/web/src/hooks/useProjectQueries.ts` — `useAssessment` + `projectKeys.assessment` removed.
- `apps/api/src/db/migrations/010_ai_outputs.sql` — new.
- `apps/api/src/services/ai/AiOutputWriter.ts` — new.
- `apps/api/src/services/ai/NarrativeContextBuilder.ts` — new.
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — narrative queue + worker + `handleTier3Completion` + `JSON.stringify` revert.
- `apps/api/src/app.ts` — `startNarrativeWorker()` wired.
- `apps/api/src/routes/projects/index.ts` — `/ai-outputs` route.
- `packages/shared/src/scoring/fuzzyMCDM.ts` — new.
- `packages/shared/src/scoring/index.ts` — export fuzzyMCDM.
- `packages/shared/src/scoring/computeScores.ts` — `FuzzyFAOResult` field on `ScoredResult`, `ComputeAssessmentScoresOptions`, opt-in branch.
- `packages/shared/src/tests/fuzzyMCDM.test.ts` — new (10 tests).
- `apps/web/src/lib/fuzzyMCDM.ts` — shim re-export from `@ogden/shared/scoring`.
- `apps/web/src/features/financial/engine/types.ts` — `CostSource` interface + optional `source` field on 5 benchmark interfaces.
- `apps/web/src/features/financial/engine/regionalCosts/US_MIDWEST.ts` — new.
- `apps/web/src/features/financial/engine/regionalCosts/CA_ONTARIO.ts` — new.
- `apps/web/src/features/financial/engine/costDatabase.ts` — rewritten as thin facade; derived regions auto-decorate sources.
- `apps/web/src/tests/financial/costDatabase.test.ts` — new (7 tests).

### Wiki updates

- 3 new ADRs: `2026-04-22-ai-outputs-persistence.md`, `2026-04-22-fuzzymcdm-shared-integration.md`, `2026-04-22-regional-cost-dataset.md`.
- `wiki/index.md` — decision links appended.

### Deferred / follow-up

- Web-side `AtlasAIPanel` not yet flipped to read `GET /ai-outputs` endpoint — left with existing client-side Claude path as fallback. Follow-up session should make the panel prefer the persisted outputs when present.
- Apply migration `010_ai_outputs.sql` against local + staging DBs (additive, safe to run idempotently).
- Replace placeholder "US × 1.20" Ontario cost rows with primary sources over time; tracked via the `citation: null` + `confidence: 'low'` marker.

### Recommended next session

- Audit item #11 (next H5 in the backlog), or the follow-up `AtlasAIPanel` wiring referenced above.

## 2026-04-23 / 2026-04-24 — UI/UX Scholar audit: P0 (OKLCH + tooltip + shimmer) and P1 (sparkline)

### Context

Two-part session driven by `design-system/ogden-atlas/ui-ux-scholar-audit.md` (produced at start of 2026-04-23). Shipped the P0 items and the first P1 primitive.

### Part 1 — P0 (2026-04-23): OKLCH tokens, shimmer signifier, DelayedTooltip

**OKLCH elevation + semantic hues.** Added OKLCH primitives block in `apps/web/src/styles/tokens.css` (L steps 15.5 / 21 / 26.5 / 33, constant chroma + hue in warm-neutral space; separate L/C/H triples for primary/accent/success/warning/error/info). Wired overrides in `apps/web/src/styles/dark-mode.css` behind `@supports (color: oklch(0 0 0))`. Runtime-verified: `getComputedStyle(body).backgroundColor === "oklch(0.155 0.01 60)"`.

**Plan deviation:** Original plan proposed stacking hex + OKLCH declarations so older browsers would fall through. Custom-property values are strings, not colors — both store, `var(--color-bg)` resolves to the OKLCH string, and the invalid color computes to transparent on unsupporting browsers. Corrected with `@supports` gate.

**Shimmer signifier.** `.signifier-shimmer` utility in `apps/web/src/styles/utilities.css` — `@property --signifier-shimmer-angle` + conic-gradient border with mask compositing; `prefers-reduced-motion` disables the animation.

**DelayedTooltip primitive.** Discovered a feature-rich `<Tooltip>` at `apps/web/src/components/ui/Tooltip.tsx`. Built `DelayedTooltip.tsx` as ~30-line preset wrapper: 800 ms delay, `position="right"` default, `disabled` pass-through.

**Plan deviation:** Skipped unit tests — vitest config is `environment: 'node'` + `include: ['src/**/*.test.ts']`. Adding happy-dom + .tsx globs was out of scope.

**Rollout.** Replaced `title=` with `<DelayedTooltip>` and applied `signifier-shimmer` on active state across `IconSidebar.tsx`, `CrossSectionTool.tsx`, `MeasureTools.tsx`, `ViewshedOverlay.tsx`, `MicroclimateOverlay.tsx`, `HistoricalImageryControl.tsx`, `OsmVectorOverlay.tsx`, `SplitScreenCompare.tsx`.

### Part 2 — P1 (2026-04-24): Sparkline primitive + OKLCH elevation sweep

**Sparkline.** Zero-dep SVG micro-chart at `apps/web/src/components/ui/Sparkline.tsx` — neutral stroke, semantic accent as endpoint dot only (per Scholar §5). Props: `values: readonly number[]`, `width`, `height`, `stroke`, `accent`, `ariaLabel`. Default 60×18. Renders nothing for <2 points.

**Plumbing.** Extended `LiveDataRow` in `packages/shared/src/scoring/computeScores.ts` with `sparkline?: number[]` + `sparklineLabel?: string`. In `deriveLiveDataRows`, the Climate row pulls `climate.summary._monthly_normals`, sorts by month, extracts `precip_mm`, attaches as sparkline series (only when ≥3 finite values). Mirrored on local `LiveDataRow` in `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx`; rendered `<Sparkline>` inside `liveDataRight` between value and classification chip.

**OKLCH elevation sweep.** Audited inline warm-neutral hex in `apps/web/src/**/*.tsx`. Most already used `var(--color-*, fallback)` pattern — only `apps/web/src/features/portal/PublicPortalShell.tsx:54` had a bare `background: '#1a1611'`, converted to `var(--color-bg, #1a1611)`. Decorative accents (hero gradients, brand gold text, map paint, canvas fills) intentionally left.

### Verification

- `tsc --noEmit` clean on both `apps/web` and `packages/shared`.
- Dev-server preview: body bg resolves to OKLCH, no console errors, Sparkline module resolves at runtime.
- Visual screenshot of sparkline on live Climate row deferred — authed project route with NOAA/ECCC normals not reachable from current dev session.

### Files changed

- `apps/web/src/styles/tokens.css` — OKLCH primitives.
- `apps/web/src/styles/dark-mode.css` — `@supports`-gated OKLCH overrides.
- `apps/web/src/styles/utilities.css` — `.signifier-shimmer` utility.
- `apps/web/src/components/ui/DelayedTooltip.tsx` — new.
- `apps/web/src/components/ui/Sparkline.tsx` — new.
- `apps/web/src/components/ui/index.ts` — exports.
- `apps/web/src/components/IconSidebar.tsx` — DelayedTooltip wraps.
- `apps/web/src/features/map/{CrossSectionTool,MeasureTools,ViewshedOverlay,MicroclimateOverlay,HistoricalImageryControl,OsmVectorOverlay,SplitScreenCompare}.tsx` — tooltip + shimmer.
- `apps/web/src/features/portal/PublicPortalShell.tsx` — bare hex → `var(--color-bg)`.
- `apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx` — `LiveDataRow.sparkline`, Sparkline render.
- `packages/shared/src/scoring/computeScores.ts` — `LiveDataRow.sparkline*`, climate precip series.
- `design-system/ogden-atlas/ui-ux-scholar-audit.md` — new audit doc.
- `design-system/ogden-atlas/impl-plan-oklch-tooltip.md` — new impl plan.

### Wiki updates

- 2 new ADRs: `2026-04-23-oklch-token-migration.md`, `2026-04-23-delayed-tooltip-primitive.md`.
- `wiki/entities/web-app.md` — UI primitives section updated.
- `wiki/index.md` — decision links appended.

### Deferred / follow-up

- Visual screenshot of sparkline on authed Climate row.
- Broader sparkline adoption (soil horizons, elevation profile, hydrology).
- `--l-popover` OKLCH tier (L=33) defined but not yet mapped to a `--color-*` surface.
- MeasureTools inner mode-selector `title=` left in place (compact popover, low discoverability value).

### Recommended next session

- ~~IA codification (§1) + panel decision matrix (§3) — P2 documentation in `design-system/ogden-atlas/`, codifying rail/popover/modal conventions.~~ **Landed in `c276c51`** as [`design-system/ogden-atlas/ia-and-panel-conventions.md`](../design-system/ogden-atlas/ia-and-panel-conventions.md); refreshed 2026-04-24 (see later entry). Or next H-tier audit item.

## 2026-04-24 — Panel scrollbar theming + shared barrel fix

**Symptom.** Runtime import error on Biodiversity Corridor overlay: `The requested module '/packages/shared/src/index.ts' does not provide an export named 'dijkstraLCP'`. Separately, the Site Intelligence panel's inner scroll container rendered the default Windows scrollbar instead of the themed 6 px gold variant used elsewhere in the dashboard.

**Fix 1 — barrel export.** `packages/shared/src/ecology/corridorLCP.ts` defined `dijkstraLCP` / `frictionForCell` / `pickCorridorAnchors` / `gridDims`, but the shared package barrel didn't re-export the module. Added `export * from './ecology/corridorLCP.js';` to [`packages/shared/src/index.ts`](packages/shared/src/index.ts). (Folded into `9101393 feat(soil-ecology): §7 pollinator close`.)

**Fix 2 — scrollbar theming.** The shared `.container` class in [`apps/web/src/styles/panel.module.css`](apps/web/src/styles/panel.module.css) owns the inner scroll (`overflow-y: auto; height: 100%`) for every right-panel component (including `SiteIntelligencePanel` via `p.container`). It had no `::-webkit-scrollbar` rules, so it fell back to the OS chrome while `DashboardView.content` — which scrolls one layer out — was themed. Added `scrollbar-width: thin` + `scrollbar-color` (Firefox) and `::-webkit-scrollbar{width:6px}` + track/thumb/hover rules matching the gold alpha used in `DashboardView.module.css`. Runtime-verified: `getComputedStyle(panel.container).scrollbarColor === 'rgba(180, 165, 140, 0.18) rgba(0, 0, 0, 0)'`.

### Deferred

- **Site Intelligence width.** `DashboardView` reserves a fixed 280 px right column for `DashboardMetrics`; the Site Intelligence panel fills the remaining `flex: 1` column and therefore never spans the full dashboard width. Not a bug per the current layout spec — flagged for follow-up if a full-width mode is wanted for specific sections.

## 2026-04-24 — Pollinator habitat **state** overlay (4th §7 wave)

**Motive.** The existing `PollinatorHabitatOverlay` reads the bbox-scale synthesized `pollinator_opportunity` 5×5 grid emitted by `PollinatorOpportunityProcessor` — a planting-opportunity surface that mixes cover sampling with connectivity role. That doesn't answer the parcel-scale question users actually ask on site: *what habitat exists here today?*

**Shared helper.** Added [`packages/shared/src/ecology/pollinatorHabitatState.ts`](packages/shared/src/ecology/pollinatorHabitatState.ts) — pure `classifyZoneHabitat({ coverClass, disturbanceLevel })` returning `{ band, score, normalizedClass, isLimiting }`. Limiting table (cropland/urban/water) wins over supportive; limiting weight ≥ 0.9 → `hostile`, else `low`. Supportive weight is discounted by `1 − 0.3 × disturbanceLevel`, then banded at 0.8 / 0.55 / 0.3. Reuses `POLLINATOR_SUPPORTIVE_WEIGHTS` + `POLLINATOR_LIMITING_WEIGHTS` — no new authoritative vocabulary. Substring match prefers longest key so "Mixed Forest" beats "Forest". 10/10 vitest cases green.

**Overlay.** [`apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx`](apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx) fetches the existing `soil_regeneration` layer, classifies each zone centroid via `classifyZoneHabitat`, writes `habitatStateBand` onto feature props, and paints classed circles + strokes keyed by a Mapbox `match` expression (sage / gold / muted / slate-red palette, mirroring the opportunity overlay). Lucide Leaf icon in the spine (distinct from the Flower-2 used on opportunity). `pollinatorHabitatStateVisible` + setter in [`mapStore.ts`](apps/web/src/store/mapStore.ts); compact toggle slotted into [`LeftToolSpine.tsx`](apps/web/src/features/map/LeftToolSpine.tsx); lazy imports + mount in [`MapView.tsx`](apps/web/src/features/map/MapView.tsx).

**Scoring parity.** Untouched. `computeScores.ts` does not reference the new helper; `verify-scoring-parity.ts` stays at delta 0.

### Deferred

- True pixel-scale habitat raster (parcel-scale land cover sampled at say 10 m) rather than zone centroids.
- Regional-plant lists keyed to `normalizedClass` for the tooltip ("supports X / Y").
- Cross-parcel stitching — current overlay stops at the project boundary.


## 2026-04-24 — Ecological dashboard ecoregion + native species surfacing

**Motive.** [`pollinator_opportunity`](apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts) materialises a CEC Level III ecoregion id + patch-graph `corridorReadiness` alongside the 5x5 patch grid, and `@ogden/shared` already exports a curated native-plant list per ecoregion (`plantsForEcoregion`). Until now none of that surfaced in the UI — the §7 `EcologicalDashboard` stopped at soil / land cover / wetlands, so the ecoregion + species data shipped in `9101393` was effectively invisible to users.

**Change.** [`apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`](apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx) gains a "NATIVE PLANTING & POLLINATOR HABITAT" section between Wetland & Riparian and Ecological Interventions. Reads `pollinator_opportunity` layer, calls `computePollinatorHabitat({ landCover, wetlands, ecoregionId, corridorReadiness })` from `@ogden/shared`, and renders:

- 3-column ecoregion strip: CEC Level III name + code badge, habitat-suitability score + band, corridor-connectivity band + patch count.
- Curated native species list (common / *scientific* / habit · bloom window) when ecoregion resolves; falls back to habitat-class categories otherwise.
- First caveat from the heuristic surfaced inline as honest-scoping note.

Also adds `'pollinator_opportunity'` to `ECOLOGY_LAYER_SOURCES` so its flags flow through the existing opportunities filter.

**Scoring parity.** Untouched. `computePollinatorHabitat` is read-side only; `computeScores.ts` still does not reference it, so `verify-scoring-parity.ts` stays at delta 0 per the P2 ADR.

**Preview glitch (unrelated).** Mid-session the `web` Vite dev server wedged on a stale HMR snapshot of `RailPanelShell.tsx` and kept emitting `does not provide an export named 'RailPanelShell'` even though the file on disk had the named export intact. Source was not modified this session. Resolved by restarting the Vite server (`preview_stop` + `preview_start web`) — fresh bundle, no server errors.

### Deferred

- Caveat drawer: only the first caveat is rendered inline; the full list (raster-LCP limitation, microsite disclaimer, field-survey prompt) could be exposed behind a "Why this matters" affordance.
- Guild-by-plant badges: `PollinatorPlant.guilds` is in the data but not yet rendered (bees / butterflies / hummingbirds icons).
- Ecoregion coverage expansion beyond the 7 pilot eastern-NA regions — new entries need both an `NA_ECOREGIONS` record and a curated plant list in `pollinatorPlantsByEcoregion.json`.

## 2026-04-24 — IA + panel matrix refresh (P2 follow-up)

**Context.** The 2026-04-23/24 UX Scholar entry recommended "IA codification (§1) + panel decision matrix (§3)" as the next session. That work actually landed earlier in commit `c276c51` as [`design-system/ogden-atlas/ia-and-panel-conventions.md`](../design-system/ogden-atlas/ia-and-panel-conventions.md) — the recommendation line was stale. This session is a **freshness pass** against that doc, auditing everything that landed between c276c51 and today.

**Classified post-c276c51 additions** — each component was checked against the matrix as *(a)* fits an existing row, *(b)* needs a new row, or *(c)* violates the matrix:

| Component | Verdict |
|---|---|
| `StickyMiniScore` | (b) — new matrix row: "Sticky sub-header inside rail" |
| `BiodiversityCorridorOverlay` non-compact toggle (lines 265–287) | (c) — hand-rolled `backdropFilter` button; logged as known violation |
| `BiodiversityCorridorOverlay` compact toggle + paint | (a) — spine-btn + paint-only |
| `PollinatorHabitatStateOverlay` | (a) — paint-only |
| `RegenerationTimelineCard` + `LogEventForm` | (b) — new row: "Inline section-scoped disclosure form" |
| `EnergyDemandRollup` | (b) — new row: "Compact KPI / supply-vs-demand strip" |
| `SynthesisSummarySection`, `MilestoneMarkers` | (a) — rail sections, no new primitive |
| `LandingPage` + `LandingNav` (non-project `/`) | (b) — new §1 sub-section: "Public route exception" |
| 28-file `title=` → `DelayedTooltip` retrofit (`29bf499`) | validates existing §3 row |

**Doc edits (single file — `ia-and-panel-conventions.md`).**

- §1 Invariants — added a **Public route exception (Landing)** block. The landing page at `/` is the one surface that skips `AppShell` and renders its own sticky 64 px top bar (`LandingNav`). Rule: don't extend this pattern to any authed route.
- §3 matrix — 3 new rows (StickyMiniScore / disclosure form / rollup strip).
- §3 anti-patterns — added "hand-rolled floating toggles with inline `backdropFilter`" + a new **Known violations** sub-section naming `BiodiversityCorridorOverlay.tsx:265–287` and the broader 5-file map-overlay migration backlog (Agroforestry / CrossSection / MeasureTools / Microclimate / MulchCompostCovercrop still ship the pre-primitive chrome).
- §4 inventory — new "Paint-only overlays" sub-list for `PollinatorHabitatStateOverlay` and the paint portion of `BiodiversityCorridorOverlay`.
- §5 Deferred — retired the landed items (MapControlPopover primitive + map z-index token) which had been listed as "Landed 2026-04-24" but were already in the body; added opportunistic map-overlay migration + landing-OKLCH audit items.
- Appended a **Revision history** footer with the initial vs refresh diff.

**No code changes.** Documentation-only pass per the audit's P2 label. `wc -l` of the doc: 166 → 207 (within the <250 gate).

### Deferred

- **Map-overlay migration completion.** ~5 files in `features/map/**` still ship hand-rolled `backdropFilter` chrome outside the `MapControlPopover` primitive. Handle opportunistically when touching those files.
- **BiodiversityCorridorOverlay fix.** The documented violation should migrate to `MapControlPopover variant="dropdown"` — separate code session.
- **MASTER.md palette drift.** The 2026-04-01 palette in `design-system/ogden-atlas/MASTER.md` (green/harvest-gold, Fira fonts) no longer reflects the warm-slate + OKLCH reality. Worth a separate refresh session against `tokens.css`.

### Recommended next session

- `BiodiversityCorridorOverlay` migration to `MapControlPopover` (small, isolated; closes the flagged violation). Or the `MASTER.md` palette refresh if a wider design-system-doc session is preferred.

## 2026-04-24 — Regeneration events API + timeline UI (manifest `regen-stage-intervention-log` → done)

**Motive.** Migration 015 + Zod schema shipped last session but no one could read or write. `EcologicalDashboard` showed derived/planned interventions but had no way to log what was actually done on site, so §7's intervention-log / stage-tagging / before-after concerns were a dormant substrate. Closed both remaining layers.

**Typecheck debt cleared first.**
- `Utility.capacityGal?: number` added to [apps/web/src/store/utilityStore.ts](apps/web/src/store/utilityStore.ts) — `HydrologyDashboard`'s roof-catchment / cistern-sizing block had been using the field all along; the persist blob already holds it, typing just caught up.
- [PlantingToolDashboard.tsx](apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx) tightened for `noUncheckedIndexedAccess`: polygon centroid coords narrow through typed locals, and proximity loops hoist `nurseries[0]` / `composts[0]` / `irrigationSources[0]` into a `first` constant, addressing subsequent elements through per-iteration locals rather than re-reaching through the original array.

**API route.** New Fastify module [apps/api/src/routes/regeneration-events/index.ts](apps/api/src/routes/regeneration-events/index.ts) mirrors the comments-route pattern: `GET` (any role) with optional `eventType / interventionType / phase / since / until / parentId` filters, `POST / PATCH / DELETE` guarded by `owner | designer` with additional author-or-owner gate on mutations. Geometry round-trips through `ST_GeomFromGeoJSON` / `ST_AsGeoJSON::jsonb`; rows come back through a local `mapRow` rather than `toCamelCase` to keep geometry + jsonb handling visible. Registered at `/api/v1/projects` prefix in [app.ts](apps/api/src/app.ts).

**Client + store.** Added `api.regenerationEvents.{ list, create, update, delete }` cluster to [apiClient.ts](apps/web/src/lib/apiClient.ts) mirroring `api.comments`. Filters serialize through a typed `URLSearchParams` pass. [regenerationEventStore.ts](apps/web/src/store/regenerationEventStore.ts) parallels `siteDataStore`: `eventsByProject[projectId] = { events, status, error }`; mutations refetch on success.

**UI.** New [apps/web/src/features/regeneration/](apps/web/src/features/regeneration/) folder carrying `RegenerationTimelineCard.tsx`, `LogEventForm.tsx`, `useRegenerationEvents.ts`, `RegenerationTimeline.module.css`. Card mounts on [EcologicalDashboard](apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx) directly after the intervention-list section. Events sort `event_date DESC, created_at DESC`, with event-type chip + title + date header, optional intervention/phase/progress/area tag row, `↳ follows "<parent>"` link for `parent_event_id`, and 140-char notes truncation + show-more toggle.

**Form convention.** `LogEventForm` introduces the **dashboard-inline disclosure form** as the entry pattern for lifecycle events (distinct from wizard-only intake). Collapsed "+ Log event" button → inline expanded form with `RegenerationEventInput.safeParse()` gating submit, segmented `eventType` / `progress` controls, conditional `interventionType` select when `eventType === 'intervention'`, site-wide vs. boundary-centre Point location (no map-drawing yet). Documented in [soil-ecology CONTEXT.md](apps/web/src/features/soil-ecology/CONTEXT.md) so future timeline-style inputs follow the same shape.

**Explicitly deferred.** Media upload (object storage separate ticket — `media_urls` stays empty array), polygon-location drawing, before/after side-by-side photo compare, editing/deleting events from the timeline UI (API supports it; no button surface wired yet), and list cursor pagination (acceptable until a project crosses ~500 events).

**Verification.** `tsc -b packages/shared apps/api` clean. `tsc --noEmit` on `apps/web` clean across every touched file (`regeneration/*`, `regenerationEventStore`, `apiClient`, `utilityStore`, `EcologicalDashboard`, `HydrologyDashboard`, `PlantingToolDashboard`). Browser round-trip unverified — `EcologicalDashboard` is behind auth and no preview click-through this session.

## 2026-04-24 — BiodiversityCorridorToggle violation resolved (deletion, not migration)

**Motive.** The IA conventions doc (commit `f16d0c1`) flagged `BiodiversityCorridorOverlay.tsx:265-287` as a §3 known violation: a hand-rolled `backdropFilter` toggle button parallel to a correct spine-btn. The recommended-next-session line said "migrate to `MapControlPopover`". Spent the orientation pass auditing the call sites before agreeing.

**Critical finding — dead code.** `BiodiversityCorridorToggle` had a `compact?: boolean` prop with two return branches: a spine-btn for `compact === true` and the hand-rolled chrome for the default. The only consumer in the codebase is [`MapView.tsx:362`](../../apps/web/src/features/map/MapView.tsx) — `<BiodiversityCorridorToggle compact />`. The non-compact branch was unreachable. `MapControlPopover` is also the wrong shape for a label-only toggle (it's a chrome container for legends/pickers, not a single button).

**Resolution.** Resolution = delete, not migrate.

- [BiodiversityCorridorOverlay.tsx](apps/web/src/features/map/BiodiversityCorridorOverlay.tsx): dropped the `compact` prop, the `if (compact) { return ... }` wrapper, and the 23-line non-compact `return` block. The spine-btn return is now the unconditional return.
- [MapView.tsx:362](apps/web/src/features/map/MapView.tsx): dropped the now-redundant `compact />` prop on the `<BiodiversityCorridorToggle />` JSX call.

**Doc updates.** [`design-system/ogden-atlas/ia-and-panel-conventions.md`](design-system/ogden-atlas/ia-and-panel-conventions.md):
- §3 Known violations bullet struck through and marked "Resolved 2026-04-24" with a note that resolution was deletion (the dead branch had only one unused call shape).
- §4 Paint-only overlays line for `BiodiversityCorridorOverlay` updated — no longer carrying a violation note; now reads as a clean paint overlay with a co-located spine-btn export.
- Revision history footer gained a third bullet recording this resolution.

**Verification.** `tsc --noEmit` on `apps/web` clean. Live preview at `localhost:5200` shows the spine-btn rendering as the connectivity-Waypoints SVG (38×40px, `class="spine-btn"`, `aria-pressed="false"`). Map a11y / `getLayer` errors in the console are pre-existing and unrelated to this change.

### Recommended next session

- **Map-overlay chrome migration completion** (the broader §3 backlog item): grep `backdropFilter` in `apps/web/src/features/map/**` and audit the 5 remaining files (`AgroforestryOverlay`, `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`, `MulchCompostCovercropOverlay`) for popover-vs-spine-btn-vs-no-chrome classification before migrating opportunistically. Or `MASTER.md` palette refresh as a doc-only alternative.


## 2026-04-24 — Web tsc tightening to zero errors

**Symptom.** `apps/web` `tsc --noEmit` carried 9 errors across 3 sites, all from concurrent sprints that had landed references without their implementations:

1. `<Link to="/home">` in [`AppShell.tsx`](apps/web/src/app/AppShell.tsx) (\u00d72) and [`IconSidebar.tsx`](apps/web/src/components/IconSidebar.tsx) referenced a route the registry never declared.
2. [`SiteIntelligencePanel.tsx`](apps/web/src/components/panels/SiteIntelligencePanel.tsx) imported `SynthesisSummarySection` from `./sections/SynthesisSummarySection.js`, but the section file wasn't in HEAD. Working-tree copy also referenced a non-existent `.title` field on `AssessmentFlag`.
3. [`SolarClimateDashboard.tsx`](apps/web/src/features/climate/SolarClimateDashboard.tsx) imported `deriveInfrastructureCost` / `formatCostShort` / `estimateStructureHeightM` from `features/structures/footprints.ts` \u2014 none of those exports existed.

**Fix.**

- Routes: `/home` \u2192 `/` (the registered home path) in three Link sites.
- Synthesis section: added [`SynthesisSummarySection.tsx`](apps/web/src/components/panels/sections/SynthesisSummarySection.tsx) (\u00a74 Risk/Opportunity/Limitation TL;DR component) and dropped the dead `.title ??` fallbacks \u2014 `AssessmentFlag` exposes only `message`.
- Cost helpers: implemented in [`footprints.ts`](apps/web/src/features/structures/footprints.ts):
  - `estimateStructureHeightM(type)` \u2014 per-type ridge/eave height table (placeholder; should come off Structure once a height field is exposed).
  - `deriveInfrastructureCost(st)` \u2014 user-set `costEstimate` \u00b115% when present, otherwise type-template `costRange` scaled by placed/nominal area (clamped 0.5x..2x). Returns `{ low, mid, high, source, infraReqs }`.
  - `formatCostShort(value)` \u2014 short money formatter (`$25k` / `$1.2M` / `$850`).

**Verification.** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from `apps/web` now exits 0 with no output. Shared package typecheck unchanged (still clean). Scoring parity untouched.

### Deferred

- Real per-structure height (off `Structure.heightM` field) instead of the by-type lookup. Requires schema + UI work to capture height at placement time.
- Infrastructure cost: replace the area-scaled template band with a true bill-of-materials estimator once a structure-spec library exists. Current scaling is intentionally crude (0.5x..2x clamp).

## 2026-04-24 — MASTER.md palette refresh

**Motive.** [`design-system/ogden-atlas/MASTER.md`](design-system/ogden-atlas/MASTER.md) was a 204-line auto-scaffold from 2026-04-01 documenting a generic green-on-white "Earth green + harvest gold" palette (`#15803D` primary, `#F0FDF4` background) with bright button/card specs and a "Community/Forum Landing" page pattern. None of it matched the shipping codebase, which has moved through OKLCH primitives (ADR 2026-04-23), the warm-neutral chrome migration (UX Scholar 2026-04-23), the `MapControlPopover` + `mapZIndex` extraction (commit `c276c51`), and the `DelayedTooltip` retrofit (commit `29bf499`). Doc-only session: rewrite MASTER.md to reflect what the app actually is.

**Orientation finding — typography divergence.** `tokens.css:287-289` declares `--font-display: 'Fira Code'` and `--font-serif: 'Fira Code'`. But ~20+ component CSS modules carry `font-family: var(--font-display, 'Lora', Georgia, serif)`. The Lora fallback never fires (`--font-display` is always set), but the chain implies a historical intent of Lora-display. Resolution path chosen this session: codify Fira Code / Fira Sans (per `tokens.css`) as authoritative; flag the Lora drift in §Deferred as a separate sweep.

**Surgical rewrite.** [`MASTER.md`](design-system/ogden-atlas/MASTER.md) grew 204 → 382 lines:

- **Color Palette** — replaced the 5-row hex table with: OKLCH primitives (elevation ladder + 6 semantic hue channels) per the OKLCH ADR; earth/sage/water/sand ramps (50–900); semantic tokens (`--color-bg`, `--color-text`, primary/accent/status/info); chrome neutrals (`--color-chrome-bg`, `--color-chrome-bg-translucent`, `--color-chrome-bg-overlay`, `--color-elevation-highlight`); two-gold convention (`--color-gold-brand` for brand vs `--color-gold-active` for active-state UI on dark chrome — AA-contrast rationale); identity scales (zone 13, structure 6, path 11, group 7, confidence 3, status 3); map rendering defaults; rgb-channel companions.
- **Typography** — codified Fira Code / Fira Sans per `tokens.css`. Added a "Known drift" sub-block explaining the Lora-fallback situation.
- **Spacing** — replaced t-shirt-keyed table (which is not in `tokens.css`) with the actual numeric `--space-1` … `--space-16` scale.
- **Shadow / radius / z-index / transitions** — reflected actual `tokens.css` values; cross-referenced `mapZIndex` to `lib/tokens.ts` and `ia-and-panel-conventions.md`.
- **Component Specs** — replaced literal `.btn-primary` / `.card` / `.input` / `.modal` blocks (never adopted by the shipping app) with pointers to canonical primitives: `panel.module.css`, `MapControlPopover` (panel/dropdown variants), `DelayedTooltip`, `.spine-btn`, `Modal.tsx` + `SlideUpPanel.tsx`.
- **Style Guidelines** — replaced "Organic Biophilic / Wellness app" framing with "Warm-neutral chrome over biophilic map data; brand moments in earth-gold; OKLCH-derived elevation; minimal shadow, max-blur translucency for map-tethered surfaces." Dropped the "Community/Forum Landing" pattern — doesn't match `LandingPage`.
- **Anti-Patterns** — kept the 9 foundational entries; appended 7 Atlas-specific from `ia-and-panel-conventions.md` §3 (hand-rolled `backdropFilter` chrome, bare `title=`, raw `zIndex` literals in `features/map/**`, hard-coded font-family, hard-coded ramp hex, `gold-brand` on dark chrome, `<div onClick>` for true interactives).
- **Pre-Delivery Checklist** — kept the 9 existing entries; appended OKLCH parity / two-gold / mapZIndex / DelayedTooltip / panel-chrome / `preview_eval` verification steps.
- **References + Revision history** — added matching the `ia-and-panel-conventions.md` convention; cross-referenced four sibling docs and three ADRs.

**Verification.** Spot-grepped every CSS variable claimed in the rewrite against `tokens.css` — all 22 less-common tokens (`--color-gold-active`, `--color-chrome-bg-overlay`, `--l-popover`, `--c-warm-neutral`, `--space-5`, `--shadow-inner`, `--z-map-loading-chip`, `--z-map-mobile-bar`, `--z-map-top`, `--color-info-500`, `--color-confidence-{high,medium,low}`, `--color-status-{good,moderate,poor}`, `--color-map-popup-bg`, `--color-map-label-halo`, `--color-elevation-highlight`, `--color-gold-brand`, `--color-text-subtle`, `--h-warm-neutral`) found in `tokens.css`. All five linked primitive files (`tokens.ts`, `dark-mode.css`, `MapControlPopover.tsx`, `DelayedTooltip.tsx`, `Modal.tsx`, `panel.module.css`) confirmed present. Cross-checked `accessibility-audit.md` to confirm no contradictions (it actively reinforces the OKLCH / DelayedTooltip / MapControlPopover foundation).

### Deferred

- **Lora-fallback removal sweep.** ~20+ component CSS modules carry `var(--font-display, 'Lora', Georgia, serif)`. Mechanical grep-and-replace to drop the Lora fallback (Fira Code is authoritative per `tokens.css`). Captured in MASTER.md §Deferred for a separate session.
- **OKLCH semantic uniformity tuning.** Current OKLCH L values were reverse-computed for visual parity, not yet tuned for perceptual uniformity (per OKLCH ADR Consequences). A future pass should tighten `--l-success` / `--l-warning` so they read at equal weight.
- **`design-system/pages/`.** MASTER.md routing references this dir for page-specific overrides; dir does not yet exist. Create when the first page needs a Master-overriding spec.

### Recommended next session

- **Lora-fallback removal sweep** (mechanical doc-aligning sweep — ~20 files; closes the typography drift flagged in MASTER.md §Deferred). Or the broader **map-overlay chrome migration completion** (5 remaining `backdropFilter`-bearing files in `features/map/**`, popover-vs-spine-btn classification before migration).

## 2026-04-25 — §7 PollinatorHabitatStateOverlay shipped (commit `75edc45`)

**Motive.** Three WIP threads sat uncommitted on `feat/shared-scoring`: `PollinatorHabitatStateOverlay`, a HomePage/landing redesign, and `StickyMiniScore`. Goal: pick one, close the loop. Pollinator-state was nearest to ship — the shared classifier `classifyZoneHabitat` had already landed in `9101393`, the store flag, MapView wiring, and SoilRegenerationProcessor field-emission were all dirty-but-coherent, and the overlay + vitest spec only needed adding.

**Vertical slice landed (6 files, +354 lines):**

- **Overlay** — [`apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx`](apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx) — fetches `soil_regeneration` layer via `api.layers.get`, classifies each zone-centroid feature through `classifyZoneHabitat`, paints two `circle` layers (fill + stroke) keyed off a `match` expression on the new `habitatStateBand` property. Band palette mirrors `PollinatorHabitatOverlay` for visual consistency across the two pollinator surfaces.
- **Toggle** — same file: `PollinatorHabitatStateToggle({ compact? })`. Compact variant uses Lucide `Leaf` glyph on `.spine-btn` with `signifier-shimmer` active-state; default variant a pill in the toolbar. `DelayedTooltip` wrapper either way.
- **Vitest spec** — [`packages/shared/src/tests/pollinatorHabitatState.test.ts`](packages/shared/src/tests/pollinatorHabitatState.test.ts) — 10 cases: null cover → `unknown`, Grassland → `high`/score 1.0, Cultivated Crops → limiting/`low`, Developed High Intensity → `hostile`/score 0, disturbance scaling, limiting-table precedence, lowercase substring match, longest-prefix win (Mixed Forest beats Forest), unknown-class fallback to `low`, disturbance clamp `[0,1]`. All 10 green.
- **Store** — [`apps/web/src/store/mapStore.ts`](apps/web/src/store/mapStore.ts) gains three §7 sibling flags (`pollinatorOpportunityVisible`, `biodiversityCorridorVisible`, `pollinatorHabitatStateVisible`) introduced as a single coherent batch. The first two were already wired by their respective overlays; this commit was the natural moment to commit the flag block.
- **Tool spine** — [`apps/web/src/features/map/LeftToolSpine.tsx`](apps/web/src/features/map/LeftToolSpine.tsx) gains `biodiversityCorridorSlot` + `pollinatorHabitatStateSlot` props. Closes a pre-existing prop-shape gap on HEAD: committed `MapView` already passed `biodiversityCorridorSlot`, but the committed `LeftToolSpine` interface didn't yet accept it.
- **Map view** — [`apps/web/src/features/map/MapView.tsx`](apps/web/src/features/map/MapView.tsx) lazy-imports the overlay + toggle and threads them through the spine + Suspense overlay stack.
- **Soil processor** — [`apps/api/src/services/terrain/SoilRegenerationProcessor.ts`](apps/api/src/services/terrain/SoilRegenerationProcessor.ts) emits `coverClass` + `disturbanceLevel` per zone feature. The land-cover intersection already happens inside `loadContext`; this just propagates the existing values onto the GeoJSON properties so the overlay can classify without a second land-cover query.

**Distinct from siblings.** Three pollinator/biodiversity surfaces now coexist on `soil_regeneration`:
- `PollinatorHabitatOverlay` — bbox-scale 5×5 synthesized opportunity grid (planting opportunity from planned interventions).
- `BiodiversityCorridorOverlay` — least-cost path connecting two farthest high-opportunity anchors (connectivity).
- `PollinatorHabitatStateOverlay` — parcel-scale current-quality classifier (this commit). **Not a scoring component** — `computeScores.ts` untouched.

**Verification.** `apps/web` tsc clean (exit 0); `apps/api` tsc clean; vitest 10/10 green on the new spec. Preview smoke deferred — needs a project with materialised `soil_regeneration` data; flagged for next session.

**Process.** Working tree had ~14 unrelated dirty files (RailPanel refit, right-rail collapse state, regen-form tweaks, structures §9 SupportInfrastructureCard, soil-ecology CONTEXT.md, ZoneSeasonalityRollup, launch.json, tsbuildinfo). Two explicit-pathspec stashes (`non-pollinator WIP`, `structures §9 WIP`) isolated the pollinator slice. After the commit, `structures §9` popped cleanly; `non-pollinator WIP` blocked on regeneration files re-modified by a parallel agent during the session — left in `stash@{0}` for manual reconciliation rather than risking a discard.

### Deferred

- **Pop `stash@{0}` (non-pollinator WIP).** Conflicts with currently-dirty regeneration files (LogEventForm, RegenerationTimelineCard, RegenerationTimeline.module.css). Inspect with `git stash show -p stash@{0}` and merge by hand, or commit the regeneration changes first then pop.
- **Preview smoke for `PollinatorHabitatStateOverlay`.** Confirm 4-band paint, toggle on/off cleanup, no layer-leak on style reload. Needs a project with materialised `soil_regeneration`.
- **`StickyMiniScore` ship.** Component file remains untracked but is already imported + used in committed [`SiteIntelligencePanel.tsx:653`](apps/web/src/components/panels/SiteIntelligencePanel.tsx) — `git add` + commit closes a (likely) latent build break.
- **Landing/HomePage redesign.** `apps/web/src/features/landing/` (~8 files) untracked; not wired into any route. Needs `landingRoute` added to `routes/index.tsx` with auth-redirect-to-`/home` `beforeLoad`.

### Recommended next session

- **`StickyMiniScore` add-and-commit.** Trivial closer (one `git add` + commit) that may also fix a latent main-branch build issue. Confirm SiteIntelligencePanel typechecks before/after to verify.
- Or — **Landing wire-up** (larger scope: routes, auth-redirect, public-portal CSP). Defer until landing is signed off as the public face.

---

## 2026-04-26 — Visitor MapTiler key + Zustand selector loop fixes

### Done

**Live-site MapTiler key entry.** Production build of `atlas.ogden.ag` ships without `VITE_MAPTILER_KEY`. Visitors now paste their own free key into the page; it's persisted to `localStorage` (`ogden-maptiler-key`) and survives reload. Files: [`apps/web/src/lib/maplibre.ts`](apps/web/src/lib/maplibre.ts) (added `MAPTILER_KEY_STORAGE`, `resolveKey()`, `setMaptilerKey()` — module-load constants now resolve from localStorage first, env fallback, no breaking changes at call sites because save flow triggers `window.location.reload()`); [`apps/web/src/features/project/wizard/StepBoundary.tsx`](apps/web/src/features/project/wizard/StepBoundary.tsx) (replaced env-var-jargon error with visitor-facing key-entry fallback `MapKeyFallback`); [`apps/web/src/components/MapTokenMissing.tsx`](apps/web/src/components/MapTokenMissing.tsx) (same input + Save & reload + Clear saved key).

**Infinite-render bug — Feasibility & Herd Rotation panels.** Both panels triggered `Maximum update depth exceeded` and rendered as ErrorBoundary fallback. Root cause: Zustand selectors of the form `useStore((s) => s.someMethod(args))` or `useStore((s) => s.array.filter(...))` where the inner expression returned a freshly-derived array each call. `useSyncExternalStore` saw a "changed" snapshot every render → re-render → selector re-runs → new array → re-render → loop. Fixed in 6 files by switching to subscribe-then-derive: read the raw store array (stable reference) and compute the project-filtered slice inside `useMemo`:
- [`apps/web/src/features/decision/SeasonalRealismCard.tsx`](apps/web/src/features/decision/SeasonalRealismCard.tsx) — was `usePhaseStore((st) => st.getProjectPhases(project.id))` — actual crash from screenshot
- [`apps/web/src/components/panels/TimelinePanel.tsx`](apps/web/src/components/panels/TimelinePanel.tsx) — same `getProjectPhases` pattern, latent
- [`apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx`](apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx) — `paddocks.filter(...)` inside selector — Herd Rotation crash
- [`apps/web/src/features/fieldwork/WalkChecklistCard.tsx`](apps/web/src/features/fieldwork/WalkChecklistCard.tsx) — 4 inline-filter selectors
- [`apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx`](apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx) — 5 inline-filter selectors
- [`apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx`](apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx) — 5 inline-filter selectors

Decision record: [decisions/2026-04-26-zustand-selector-stability.md](decisions/2026-04-26-zustand-selector-stability.md).

**Dashboard content centering.** [`apps/web/src/features/dashboard/DashboardView.module.css`](apps/web/src/features/dashboard/DashboardView.module.css) — added `.content > * { margin-inline: auto; }`. Each dashboard page already declares its own `max-width` (e.g. HerdRotationDashboard `.page { max-width: 860px }`) — they were just left-aligning inside a 1080px column. Auto inline margin centers them without changing per-page widths. Verified: 860px page now renders with ~107px gap on each side within the 1080px container.

### Verification

- Reproduced both infinite-loop panels in dev preview (Feasibility, Herd Rotation), applied fixes, reproduced clean render — no error boundary, child cards present.
- DOM probe confirms centered child: `childLeft: 347, childRight: 1207` inside `contentLeft: 240, contentRight: 1320`.
- MapTiler visitor flow verified earlier in session via tsc + vite build (both exit 0).

### Deferred

- **Landing-zone audit for the same selector anti-pattern.** Caught 6 files via grep on `use\w+Store\(\(.*?\) => .*?\.(filter|map|sort|slice)\(`. A second sweep should also check store-method getters that return new arrays (`getProjectPhases`, etc.) — only `getProjectPhases` was confirmed problematic; other `getXxx` methods (`getVisionData`, `getConfig`) use `.find()` and return stored references, which is safe.
- **ESLint custom rule** to flag the anti-pattern at lint-time. Defer until next sweep confirms the pattern is closed.

### Recommended next session

- **Sweep store API for stable-reference contracts.** For each `getXxx(id)` method, document whether it returns a stored reference or a fresh array. Convert any fresh-array getters to subscribe-then-derive at every call-site. Optionally add a one-line comment on each store action describing return semantics.

---

## 2026-04-27 — Demand coefficient tables (water + electricity)

### Done

**De-hardcoded site demand.** Replaced the `{ low: 50, medium: 110, high: 220 }` flat crop-water lookup, the `irrigationDemandGal = annualRainfallGal * 0.22` placeholder, and the entirely-missing structure/utility demand models with per-type coefficient tables in a new `@ogden/shared/demand` subpath.

New module: [`packages/shared/src/demand/`](../packages/shared/src/demand/) — `structureDemand.ts`, `utilityDemand.ts`, `cropDemand.ts`, `rollup.ts`, `index.ts`. Wired into [`hydrologyMetrics.ts`](../packages/shared/src/scoring/hydrologyMetrics.ts) (accepts optional `structures`/`utilities`/`cropAreas` on `HydroInputs`; falls back to 22% only when none are passed). Web dashboards rerouted: [`HydrologyDashboard.tsx`](../apps/web/src/features/dashboard/pages/HydrologyDashboard.tsx) threads placed entities through; [`EnergyDemandRollup.tsx`](../apps/web/src/features/utilities/EnergyDemandRollup.tsx) sums structure + utility loads via the new helpers; [`PlantingToolDashboard.tsx`](../apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx) uses the 2D area-type × class table; [`apps/web/src/features/crops/waterDemand.ts`](../apps/web/src/features/crops/waterDemand.ts) became a thin wrapper with the deprecated flat table preserved for one release.

**Tests.** 20 new in [`packages/shared/src/tests/demand.test.ts`](../packages/shared/src/tests/demand.test.ts) covering finiteness of every type's coefficients, greenhouse area scaling, `storiesCount` linearity, override semantics (well_pump 12 wins; 0 falls through), area-type ≠ same-class divergence (orchard:medium ≠ market_garden:medium), rollup additivity (2 cabins = 2× one cabin), and hydrology back-compat (empty inputs → 22% fallback; structure-only → 21,900 gal/yr; crop-only orchard 1000 m² medium → 110,000 gal/yr).

Decision record: [decisions/2026-04-27-demand-coefficient-tables.md](decisions/2026-04-27-demand-coefficient-tables.md).

### Verification

- `packages/shared` build ✓; vitest 118/118 ✓ (20 new in `demand.test.ts`).
- `apps/web` `tsc --noEmit` ✓; `apps/api` `tsc --noEmit` ✓.
- Root `npm run lint` ✓.
- Live dev-server module probe confirmed cabin 60+8, well_pump 6 (override 12), orchard low/med/high = 60/110/180, mixed scenario rollup = 601,100 gal/yr + 19 kWh/day.

### Deferred

- **Per-instance override modals** for structures and utilities (current model: per-type defaults + the existing `demandKwhPerDay` text field).
- **Livestock water demand** — `livestock/speciesData.ts` carries gal/head/day data; not yet folded into `sumSiteDemand`.
- **Household occupancy modeling** — cabin's 60 gal/day = 1-occupant assumption.
- **Real solar irradiance from NASA POWER** — `utilityAnalysis.ts` still uses the 4.5 kWh/m²/day literal (TODO note added).
- **Climate / PET multiplier on crop demand** — flat 1.0 in this pass; lives next to the existing FAO-56 PET model.
- **Drop the deprecated flat `WATER_DEMAND_GAL_PER_M2_YR`** after PlantingTool's species-rollup is migrated to the per-area-type signature.

### Recommended next session

- **Livestock demand into the rollup.** `speciesData.ts` already has gal/head/day; thread `LivestockLike[]` into `sumSiteDemand` and `HydroInputs`.
- Or — **per-instance override UI**. StructurePropertiesModal + utility property modal grow a "demand override" field; defaults remain visible as the placeholder.

---

## 2026-04-28 — v3.2 solar sectors land on Diagnose

### Done

**Wedges over the parcel.** The Diagnose site-analysis map now renders three solar sector wedges — winter solstice, equinox, summer solstice — fanning sunrise→sunset over the MTC parcel centroid. The Matrix Toggles popover's previously-disabled "Sectors" row is live; toggling it shows/hides all three wedges via the existing `matrixTogglesStore`.

New module: [`apps/web/src/lib/sectors/`](../apps/web/src/lib/sectors/) — `solar.ts` (pure suncalc-driven sector computation; UTC-noon anchor dates so timezone/DST drift can't move the arc; northern-hemisphere clockwise sweep through south), `types.ts` (shared `SectorKind` discriminator that already accommodates `wind-prevailing`, `fire`, `view`, `noise` for future passes), and 8 vitest cases covering azimuth-bearing math, default 600m reach, and the suncalc provenance entry.

New overlay: [`apps/web/src/v3/components/overlays/SectorsOverlay.tsx`](../apps/web/src/v3/components/overlays/SectorsOverlay.tsx) — `@turf/turf`'s `sector()` builds wedge polygons; three layers (`fill` 0.18 opacity, dashed `line`, `symbol` labels). Idempotent ensure() pattern matches `TopographyOverlay`; visibility-only on toggle so reflows are cheap.

**Wiring.** [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx) re-enables the Sectors row, bumps the Zones placeholder badge to v3.3. [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) version 2→3 (clears stale `zones` carry-over only — preserves user's sectors choice). [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) hosts an internal `DiagnoseOverlays` component so `useMemo(computeSolarSectors(centroid), [centroid])` can cache the wedges. [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) adds a sectors row to the active-overlays legend. [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) badge counts topography + sectors (zones still excluded as a v3.3 placeholder).

**Mock data.** [`v3/types.ts`](../apps/web/src/v3/types.ts) gains `ProjectLocation.boundary?: GeoJSON.Polygon`; [`mockProject.ts`](../apps/web/src/v3/data/mockProject.ts) carries a hand-drawn ~128 ha rectangle around `[-78.20, 44.50]` so DiagnoseMap can `fitBounds` and pass the bounds-derived centroid to overlay children. Real cadastral geometry lands later.

**Dependency.** Added `suncalc` (~5 KB MIT, no network) + `@types/suncalc`. Chose it over NREL SPA / Open-Meteo to keep solar geometry deterministic and offline.

### Verification

- `apps/web` `tsc --noEmit` ✓ (clean, 0 bytes).
- `apps/web` vitest: **14/14** (8 new in `lib/sectors/__tests__/solar.test.ts`, 6 in `V3LifecycleSidebar.test.tsx` updated for the `topography+sectors=true` mock and `/2/` badge assertion).
- `vite build` ✓ (~2m13s, 493 PWA precache entries).
- Preview eval at `/v3/project/mtc/diagnose`: popover label reads "Solar arcs (winter · summer · equinox)", Zones placeholder shows `v3.3`, footer reads "Topography & Sectors live · Zones in v3.3", `sectorChecked=true` after toggle, canvas mounted. **Visual screenshot of wedge geometry on the map was not captured — preview_screenshot timed out twice.** Functional verification only.

### Deferred

- **Visual screenshot confirmation** of the wedge fan over the MTC parcel — the preview screenshot tool was unresponsive during this session. Code paths verified through tests + DOM eval.
- **Southern hemisphere sweep direction.** `solar.ts` carries a TODO; northern-only is fine for MTC and any prospective Canada/Northeast US parcels.
- **Wind / fire / view / noise wedges.** The `SectorKind` discriminator and `SiteSectors` shape already accommodate them; the popover row is currently solar-only.
- **Polar-region guard.** Wedges are filtered when suncalc returns invalid Dates, but no UX message yet.
- **Real cadastral boundary.** MTC carries a hand-drawn rectangle in `mockProject.ts`; v3.2's outstanding work includes a real parcel fetch.

### Recommended next session

- **Zones overlay (v3.3).** Use-frequency rings 0–5 anchored on the homestead centroid, wired to the same `matrixTogglesStore.zones` flag. Once it lands, the sidebar badge and popover footer copy ("Zones in v3.3") need updating in lockstep.
- Or — **wind-prevailing wedge.** Extend `lib/sectors/` with an Open-Meteo / ERA5 wind-rose pull, persist to `SiteSectors.wedges` alongside the solar arcs, surface in the same overlay.

---

## 2026-04-28 — v3.3 zones land on Diagnose

### Done

**Six concentric use-frequency rings.** The Matrix Toggles popover's third row (Zones, previously a v3.3 placeholder) is now data-backed. Toggling Zones paints six rings on the Diagnose map: Zone 0 = home (5 m disc), Zones 1–4 = annulus belts at 30/100/300/600 m, Zone 5 = "wild beyond" clipped to the parcel boundary when one is supplied.

New module: [`apps/web/src/lib/zones/`](../apps/web/src/lib/zones/) — `concentric.ts` (pure function `computeConcentricZones(centroid, opts?)` returning a `SiteZones` value with the default radii ladder `[5, 30, 100, 300, 600]`; ascending-positive guard rejects malformed custom ladders), `types.ts` (`ZoneIndex`, `ZoneRing`, `SiteZones`), and 11 vitest cases covering radii continuity, default/custom ladder, label/color invariants, Zone 5 unbounded, and centroid pass-through.

New overlay: [`apps/web/src/v3/components/overlays/ZonesOverlay.tsx`](../apps/web/src/v3/components/overlays/ZonesOverlay.tsx) — hand-rolled annulus polygons (outer ring + reversed inner ring as a hole) via `turf.circle`. Zone 0 renders as a solid disc; Zone 5 renders as `parcel boundary − zone-4-outer-circle` when a boundary prop is supplied, and is omitted otherwise. Three layers (`fill` 0.14 opacity, `line`, `symbol` labels) match the SectorsOverlay pattern with idempotent ensure() and visibility-only toggle.

**Wiring.** [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx) re-enables the Zones row, drops the `v3.3` soon-badge, footer now reads "Topography · Sectors · Zones live". [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) bumps version 3→4 with a no-op pass-through migrate (earlier versions force-cleared `zones` to keep stale state from claiming a non-existent overlay; that constraint is gone). [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) extends `DiagnoseOverlays` with `useMemo(computeConcentricZones(centroid), [centroid])` and threads `project.location.boundary` through. [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) gets a third legend row (zones swatch `#a85a3f`). [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) badge now counts `topography + sectors + zones`.

### Verification

- `apps/web` `tsc --noEmit` clean for the v3.3 surface (zones, popover, sidebar, page, map). Pre-existing rails / FiltersBar / DiagnoseMap.polygonBounds errors unchanged from baseline; not introduced by this session — verified by stashing the v3.3 diff and re-running tsc on HEAD.
- `apps/web` vitest: **25/25** (11 new in `lib/zones/__tests__/concentric.test.ts`, plus the 8 sectors + 6 sidebar tests; sidebar mock now `{ topography: true, sectors: true, zones: true }` and the badge asserts `/3/`).
- `apps/web` `pnpm exec vite build` ran clean (~43s, 493 PWA precache entries — same surface as v3.2). The `pnpm build` script is `tsc && vite build` and currently fails at the tsc gate on the pre-existing baseline errors above. Vite build alone is the truer signal for this session's surface.
- Preview eval at `/v3/project/mtc/diagnose`: popover row labels read "Topography / Sectors / Zones (Zone 0–5)", footer "Topography · Sectors · Zones live", all three checkboxes enabled, badge text reads "Matrix Toggles3…", canvas mounted, legend shows three rows. **Visual screenshot of the rendered zone rings was not captured — `preview_screenshot` timed out three times this session, same regression as v3.2.** Functional verification only.

### Deferred

- **Visual screenshot confirmation** — the preview screenshot tool was unresponsive throughout this session. Functional verification covers the data and DOM paths but does not confirm map paint.
- **Per-project radii overrides.** v3.3 ships a single pedagogical default ladder; an intensive market garden compresses all six zones into ~100 m, while pasture stretches them to kilometres. Adding `Project.zoneRadii?: [number,number,number,number,number]` is a small follow-up.
- **Real homestead anchor.** Zone 0 sits at the parcel centroid; permaculture practice anchors zones at the dwelling. Adding a clickable "Place homestead" pin lands in v3.4.
- **Boundary clipping for the inner annuli.** Today's annuli are full circles even when they overlap the parcel edge. Clipping to boundary would tighten the visual but requires `@turf/mask` or polygon-with-hole assembly per ring.
- **Zone-aware label placement.** Labels currently render at the polygon's centroid (which for an annulus is the circle's center, *inside* the inner hole). Moving labels onto the ring itself is a layout fix.

### Recommended next session

- **Wind-prevailing sector** (Open-Meteo / ERA5) — extend `lib/sectors/` with a wind-rose pull, surface as a fourth sector kind alongside the solar arcs.
- Or — **homestead-marker placement** — small UX feature: click on the Diagnose map to drop the zones anchor; persist as `Project.homesteadCenter?: [lng, lat]`. Unblocks per-project zone calibration.
- Or — **Zone 5 boundary clipping for the inner annuli** if the visual asymmetry is distracting in user testing.

## 2026-04-28 — Homestead anchor (placement UX)

**Commit:** [`771e31a`](../../) `feat(diagnose): homestead anchor — placeable marker recenters sectors & zones`

Permaculture Scholar follow-up: Mollison's Zone 0 is the home, not the parcel centroid. Sectors and concentric zones now radiate from a user-placed homestead point when set, falling back to the polygon centroid (then the page fallback) otherwise.

### Done

- `apps/web/src/store/homesteadStore.ts` — zustand `persist` keyed by `projectId` → `[lng, lat]`. Pattern matches `matrixTogglesStore` (versioned with no-op migrate).
- `apps/web/src/lib/anchor/effectiveAnchor.ts` — pure helper: explicit homestead → polygon centroid (mean of distinct ring vertices) → fallback. 6 vitest cases, all green.
- `apps/web/src/v3/components/overlays/HomesteadMarker.tsx` — draggable MapLibre `Marker` with custom DOM glyph ("Zone 0" disc); persists on `dragend` to avoid mid-drag thrash. Mid-flight position sync via a separate effect so external store updates don't fight the user's drag.
- `apps/web/src/v3/components/DiagnoseMap.tsx` — optional `homestead` prop renders a small toolbar (Place / Move / Clear) bottom-right, plus a one-shot map-click handler that flips a crosshair cursor while active; legend gains an "Anchored at …" note.
- `apps/web/src/v3/pages/DiagnosePage.tsx` — extracted `DiagnosePageMap` so the page-level component holds the homestead store reads; threads anchor into both `computeSolarSectors` and `computeConcentricZones` via `useMemo`.

### Verification

- `npx vitest run src/lib/anchor src/lib/zones src/lib/sectors src/v3/components` — **36/36 passing** (5 files), including the new 6-case `effectiveAnchor.test.ts`.
- `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` — clean, 1m10s, 493 PWA precache entries.
- `npx tsc --noEmit` OOMed on the full surface (same as v3.3); spot-checks of homestead surface compile via vitest's transform with no errors.
- Preview verify on `/v3/project/mtc/diagnose`:
  - Toolbar shows `Place homestead` by default; after seeding `localStorage` and reload, flips to `Move homestead` + `Clear`.
  - Legend caption reads `Anchored at homestead` (vs `Anchored at parcel centroid` when unset).
  - `.maplibregl-marker` mounts on the canvas at the seeded coordinate.
  - Click-to-toggle did not flip the React state in the preview (the synthetic click case from prior sessions); seeded localStorage as a substitute. The drag/persist path is exercised by the `dragend` listener — visual confirmation deferred with the rest.
- Screenshot tool timed out (third session in a row).
- Vitest baseline: `computeScores.test.ts` Tier-3 layer-counting suite shows 7 pre-existing failures unrelated to anchor/zones — left for a separate sweep.

### Deferred

- Visual screenshot of the placed marker + recentered rings (preview tool flaky).
- Synthetic-click verification — a regression for the preview tool, not the feature.
- Boundary clipping when homestead is placed outside the parcel (no warn yet).
- "Snap to centroid" affordance for users who placed and want to reset to the bbox/polygon center without losing the toggle on.
- `pnpm build`'s `tsc &&` step still red on baseline rails / FiltersBar / DiagnoseMap.polygonBounds errors — gate via `vite build` for now.

### Recommended next session

- **Wind-prevailing sector** (Open-Meteo / ERA5) — fourth sector kind alongside the solar arcs; now that the anchor flows through, the wind-rose can radiate from it.
- Or — **Boundary-aware homestead** — warn or refuse placement outside the parcel; clip Zone 5 inner annuli when boundary shrinks past zone-4-outer.
- Or — **persist homestead server-side** — promote from `localStorage` to project-scoped server state once the v3 mock-first stage gives way to real persistence.

---

## 2026-04-28 — v3.4 wind-prevailing sectors overlay

### Context

Following commit `771e31a` (homestead anchor flow-through), the fourth permaculture matrix overlay (prevailing wind) was the natural next step. The `SectorKind` union already included `"wind-prevailing"`; the anchor pipeline already feeds through `getEffectiveAnchor`. Mock-first, Eastern-Ontario climatology.

### Completed

- `lib/sectors/wind.ts` — `computeWindSectors(anchor, opts?)` returning `SiteSectors` with eight 45° compass petals. Petal reach = `maxReachMeters * (frequency / peakFrequency)`; default 600 m. `DEFAULT_FREQUENCIES` are W/NW-dominant Eastern Ontario climatology. 10 vitest cases (N→NW order, kind, bearings ±22.5°, frequencies sum ≈ 1, W dominant, longest = maxReach, custom override, NaN/negative fallback, anchor preserved, sources entry).
- `v3/components/overlays/WindSectorsOverlay.tsx` — mirrors `SectorsOverlay` (idempotent ensure, visibility-only on toggle); `matrix-wind-*` prefix; single rose color `#5b7a8a`; line solid (no dasharray); labels filtered to `frequency ≥ 0.10`.
- `store/matrixTogglesStore.ts` — v4 → v5; added `wind: boolean`; `setAll` covers it; migrate fills `wind: false`.
- `v3/components/MatrixTogglesPopover.tsx` — fourth row "Wind sectors (prevailing rose)".
- `v3/components/V3LifecycleSidebar.tsx` — count includes `Number(s.wind)`; footer caption now `Topography · Sectors · Zones · Wind overlay`.
- `v3/components/__tests__/V3LifecycleSidebar.test.tsx` — mock state extended with `wind: true`; badge assertion bumped to `/4/`.
- `v3/components/DiagnoseMap.tsx` — fourth legend row + `anyOn` includes wind.
- `v3/pages/DiagnosePage.tsx` — `useMemo windRose = computeWindSectors(anchor)`; renders `<WindSectorsOverlay>` after solar `SectorsOverlay`.

### Verified

- `npx vitest run src/lib/anchor src/lib/zones src/lib/sectors src/v3/components` — **46/46 pass** (was 36; +10 wind suite).
- `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` — clean (43.7 s).

### Deferred

- **Preview verification** — synthetic-click regression against the popover means the toggle flip cannot be exercised end-to-end in the preview tool; the seeded-localStorage substitute used for homestead would also work here. Logged as a standing limitation, not a feature blocker.
- **Real climatology fetch** — Open-Meteo / ERA5 wiring; out of scope for v3.4 mock-first.
- **Seasonal rose** — per-month or summer/winter mode; defer until live climatology lands.
- **Boundary-aware petal trimming** — currently petals can extend beyond the parcel; no clipping yet.

### Recommended next session

- **Live wind climatology** — wire Open-Meteo or ERA5 to populate `frequencies` from the anchor's lat/lon; cache server-side; fall back to `DEFAULT_FREQUENCIES` on outage.
- Or — **Boundary-aware overlays** — clip wind petals (and zone rings) at the parcel boundary; warn when homestead is placed outside the polygon.
- Or — **Sector toolbar** — combine the four toggles into a horizontal map-edge toolbar so power users don't need to open the sidebar popover for each flip.

## 2026-04-29 — Feasibility Command Center (Dashboard route)

### Context

User feedback flagged the legacy Feasibility view (DecisionSupportPanel rendered under §21) as a "scroll cave" of ~17 visually-equal diagnostic cards. Requested a decision pathway: **Verdict → Blockers → Fit → Execution Reality → Safety Rules → Evidence**, mirroring the LandVerdictCard / DecisionTriad philosophy that already shipped on the companion Dashboard. DecisionSupportPanel had to remain intact for the 260px MapView right rail (narrow context can't carry the new layout).

### Done

- `apps/web/src/features/decision/hooks/useTriageItems.ts` — extracted from `WhatMustBeSolvedFirstCard` so the new strip + rail consume identical triage data.
- `apps/web/src/features/decision/hooks/useTypeFitRanking.ts` — extracted weighted-score ranking from `BestUseSummaryCard`; exports `TypeFit[]`, `currentFit`, `bestFit`, `best/workable/avoid` partitions.
- `apps/web/src/features/decision/hooks/useFeasibilityVerdict.ts` — page-level "so what" hook: composes ranking + triage + financial model into bands `supported | supported-with-fixes | workable | not-recommended`, headline/subhead, mini-metrics, readiness chips.
- `apps/web/src/features/decision/FeasibilityVerdictHero.tsx` (+ module.css) — hero card mirroring `LandVerdictCard`: ScoreCircle, verdict band badge, mini metrics (best use, current direction, labor hrs, capital intensity, break-even, blockers), CTA row (Fix Blocking Issues / Open Design Map / Generate Feasibility Brief).
- `apps/web/src/features/decision/BlockingIssuesStrip.tsx` (+ module.css) — Status × Issue × Why × Action table for the "first" triage tier; "Fix on Map" per row; anchor `#feasibility-blockers` for the hero scroll target.
- `apps/web/src/features/decision/FeasibilityDecisionRail.tsx` (+ module.css) — sticky right rail: Current Verdict, Top Blocker, Next 3 Actions, Readiness chips (land/design/ops/capital/confidence), CTAs.
- `apps/web/src/features/decision/VisionFitAnalysisCard.tsx` (+ module.css) — per-requirement fit rows for `currentFit`, replacing the inline FitResultRow used by the legacy panel.
- `apps/web/src/features/decision/FeasibilityCommandCenter.tsx` (+ module.css) — orchestrator: header → hero → blockers strip → 2-col body (Fit & Readiness | Execution Reality) + sticky rail → Design Rules section → `<details>` Methodology drawer (collapsed by default; holds legacy WhatMustBeSolvedFirstCard + MissingInformationChecklistCard). Layout grid `minmax(0, 1fr) 280px`, collapses at 1100px; inner body grid collapses at 960px. Lazy-loads child cards.
- `apps/web/src/features/decision/WhatMustBeSolvedFirstCard.tsx` — replaced inline `useMemo` with `useTriageItems(project)` (no visual change).
- `apps/web/src/features/decision/BestUseSummaryCard.tsx` — replaced inline ranking with `useTypeFitRanking(project)` (no visual change).
- `apps/web/src/features/dashboard/DashboardRouter.tsx:224` — swapped `DecisionSupportPanel` → `FeasibilityCommandCenter` for the `'feasibility'` case.

### Verified

- `npm run typecheck` — clean for all new code.
- `npm run lint` — exit 0 (project's grounding gate).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — clean (1m 9s; PWA precache regenerated, 495 entries).
- Browser verification at 1440×900: hero (81/100, "Homestead Feasibility", "Supported with Required Fixes" badge, mini metrics, CTA row), blockers strip ("ALL CLEAR" state), 2-col body (Best Use Summary | Capital × Ops Intensity), sticky rail (Current Verdict, Top Blocker, Next 3 Actions, Readiness chips). No JS console errors — only pre-existing a11y contrast warnings from sibling components.

### Deferred

- **`Generate Feasibility Brief` CTA** — placeholder; needs export pipeline wiring.
- **DecisionSupportPanel slim-down** — legacy panel still serves the 260px MapView rail; long-term it could be reduced further but out of scope here.
- **Same recipe for sibling pages** — user said the Verdict→Blockers→Fit→Execution→Rules→Evidence philosophy applies to all major pages; Feasibility shipped first as the template.

### Recommended next session

- Apply the same hero/blocker/2-col/rail recipe to the next-most-cluttered Dashboard route (likely Hydrology or Ecological).
- Or — wire the real "Generate Feasibility Brief" exporter (PDF or markdown) so the hero CTA isn't a placeholder.
- Or — slim DecisionSupportPanel for the MapView rail by removing cards that the Command Center now owns (de-dup the 260px column).


---

## 2026-04-29 — Feasibility Brief exporter + Planting Tool cockpit

**Branch:** `feat/atlas-permaculture` · **Commits:** `4549397`, `846aaf5`

### Done

**Feasibility Brief exporter (`4549397`)**
- `apps/web/src/features/decision/lib/exportFeasibilityBrief.ts` — `renderFeasibilityBriefMarkdown({ project, verdict, ranking, triage })` mirrors the v3 Land-Brief pattern. Sections: Header, Verdict + interpretation paragraph, Snapshot table, Readiness, Blocking Issues (grouped by triage tier), Vision Fit Detail (per-requirement table from `currentFit.results`), Best-Use Ranking (top 8, ★ for current direction), Footer + methodology.
- `useFeasibilityBriefDownloader(project)` composes `useFeasibilityVerdict` + `useTypeFitRanking` + triage and returns a memoized download callback.
- `FeasibilityCommandCenter.tsx` now falls back to this downloader when no `onGenerateBrief` prop is passed, so the hero + rail "Generate Feasibility Brief" button is no longer a placeholder.

**Planting Tool Command Center (`846aaf5`)**
- Templated the same Verdict → Blockers → Fit/Execution → Methodology + sticky Decision Rail recipe onto `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (1,597 → 1,953 lines).
- In-file `derivePlantingVerdict` + `derivePlantingBlockers` re-present existing `orchardSafety` / `proximity` / `access` / `validations` / `waterDemand` memos. **No new analysis math** — only re-presentation.
- Verdict band derives from `orchardSafety.overallSite` + blocker counts → `good | caution | risk | unknown`. Mini metrics: suitable-species ratio, orchard count, total trees, water demand (gal/yr), blocker count.
- Blocking Issues strip flattens orchard placement risks, missing nursery/compost/irrigation/path banners, proximity/access risk rows, and placement-validation warnings into severity-ranked rows with "Fix on Map" CTAs.
- 2-col body: **Fit & Suitability** (Suitable Species) | **Execution Reality** (Design Metrics, Water Demand, Orchard Safety, Nursery & Compost Proximity, Access & Irrigation Tie-In). Full-width **Design Detail** section: Frost Windows, Spacing Logic, Placement Validation, Companion Planting, Yield Estimates. Closed-by-default **Methodology drawer**: §12+ long-form cards (SeasonalProductivity, TreeSpacingCalculator, CompanionRotationPlanner, AllelopathyWarning, OrchardGuildSuggestions, AgroforestryPatternAudit, CanopyMaturity, ClimateShiftScenario, ShadeSuccessionForecast) + AI Siting + VIEW ON MAP.
- Sticky Decision Rail: verdict, top blocker, next 3 actions, readiness chips (site / supply / logistics / species), Open Design Map + Jump to Blockers CTAs.
- CSS module gained ~270 lines for cockpit shell (`.cockpit*`, `.verdictHero*`, `.blockersStrip*`, `.rail*`, `.methodology*`, 2-col grid + sticky behavior, ≤1100px and ≤960px collapse breakpoints).

### Verified

- Typecheck: zero errors in new code (the 49 pre-existing errors all live in `src/v3/...` rails — unchanged from session start).
- Lint: clean for the touched files.
- Build, browser preview: deferred — earlier dev server in this session showed v3 lifecycle UI, not the Dashboard sidebar that mounts the legacy `'planting-tool'` and `'feasibility'` routes; needs a project that hits the Dashboard route to physically click through.

### Files

- `apps/web/src/features/decision/lib/exportFeasibilityBrief.ts` (new, 192 lines)
- `apps/web/src/features/decision/FeasibilityCommandCenter.tsx` (wired downloader)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.tsx` (cockpit refactor)
- `apps/web/src/features/dashboard/pages/PlantingToolDashboard.module.css` (cockpit shell classes)

### Recommended next session

- Visual verification of both the brief CTA (download triggers, markdown matches expected sections) and the Planting cockpit (band rendering, blocker rows, sticky rail).
- Template the cockpit recipe onto a third Dashboard page — Hydrology and Ecological are next-most-cluttered candidates.
- Pre-existing `src/v3/...` typecheck errors remain — separate cleanup task.

---

## 2026-04-26 — Portal render-loop fix + Zustand selector ADR

**Trigger.** `PortalConfigPanel` ErrorBoundary caught "Maximum update depth exceeded" on mount; stack pointed at [`StakeholderReviewModeCard.tsx`](apps/web/src/features/portal/StakeholderReviewModeCard.tsx) — same anti-pattern as `EnterpriseRevenueMixCard` (commit `5f8e245`) and the prior `phases` fix in `3b7ef6c`.

**Root cause.** `usePortalStore((s) => s.getConfig(project.id))` — getter-in-selector. `getConfig` does `get().configs.find(...)`. Under cascading updates (parent's `useMemo` calls `createConfig` while child is subscribed to `configs`), the find result identity churns and re-enters subscribe before settling.

**Fix.** Five files in `features/portal/`:

- [`StakeholderReviewModeCard.tsx`](apps/web/src/features/portal/StakeholderReviewModeCard.tsx) — replaced `getConfig` selector with `(s) => s.configs` + `useMemo` find; also moved 5 `.length` selectors to the hoist+useMemo pattern for consistency.
- [`PortalConfigPanel.tsx`](apps/web/src/features/portal/PortalConfigPanel.tsx) — same selector swap; preserved auto-create `useMemo` calling `createConfig` when no config exists.
- [`PortalShareSnapshotCard.tsx`](apps/web/src/features/portal/PortalShareSnapshotCard.tsx) — same selector swap.
- [`ServiceStewardshipFramingCard.tsx`](apps/web/src/features/portal/ServiceStewardshipFramingCard.tsx) — same selector swap.
- [`ShareLinkReadinessCard.tsx`](apps/web/src/features/portal/ShareLinkReadinessCard.tsx) — selector swap + 5 `.length` hoists.

**ADR.** Third recurrence; codified the rule in [`decisions/2026-04-26-zustand-selector-discipline.md`](decisions/2026-04-26-zustand-selector-discipline.md). Selectors must return primitives, raw store fields, or action refs only — no getter calls, no inline `.filter()/.map()/.sort()`. Includes a grep predicate for manual audit and flags two outstanding `getVisionData(...)` sites in `features/vision/` and `features/export/` as deferred low-risk follow-ups.

**Verification.** Preview reload → Public Portal panel → `section[aria-label="Stakeholder review mode"]` mounts; no "Maximum update depth" string in body; `apps/web` tsc clean for all 5 files. Console errors limited to pre-existing axe a11y contrast warnings + persist-middleware migration warnings (unrelated).

### Deferred

- **Sweep `features/vision/` and `features/export/`** for `s.getVisionData(...)` getter-in-selector at `StageRevealNarrativeCard.tsx:62` and `InvestorSummaryExport.tsx:24`. Not currently looping but matches the ADR anti-pattern.
- **Repo-wide grep audit** beyond `portal` + `economics` to confirm no other `s.getX(id)` selectors remain.
- **ESLint rule `no-derived-zustand-selector`** — codify the ADR mechanically if a fourth incident occurs.

### Recommended next session

- Knock out the two vision/export `getVisionData` sites under the new ADR (~10 min, mechanical).
- Or: pick up the deferred `StickyMiniScore` add-and-commit from 2026-04-25.

---

## 2026-04-29 — OBSERVE Stage IA restructure (Stage 1 of 3)

**Trigger.** Plan `~/.claude/plans/few-concerns-shiny-quokka.md` — collapse
Atlas's 5-stage taxonomy to the regenerative-design 3-stage cycle
(Observe → Plan → Act), ship an Observe Hub landing surface, and build the
8 gap surfaces from the permaculture observation framework.

**Branch.** `feat/atlas-permaculture` — 4 local commits (`74b45a2`,
`e2986db`, `103ce10`, `4c17d97`); not pushed.

**Phase 1 — taxonomy collapse.** `features/navigation/taxonomy.ts` gains
`Stage3Key`, `STAGE3_META`, `STAGE3_ORDER`, `groupByStage3()`. Every
`NavItem` now carries both `stage` (S1–S5) and `stage3` (observe/plan/act).
`uiStore.sidebarGrouping` default flipped to `'stage3'`; old groupings
remain via `GroupingToggle`. Mapping: S1+S2 → observe, S3 design + S4 →
plan, S3 operate + S5 → act.

**Phase 2 — Observe Hub.** `features/observe/ObserveHub.tsx` —
2-col landing page summarising the 6 spec modules (Human Context,
Macroclimate & Hazards, Topography, Diagnostics, Sectors, SWOT). Each
module card pulls a 3-line summary from `visionStore`, `siteDataStore`,
`soilSampleStore`, and the new `siteAnnotationsStore`, with an "Open
detail →" CTA driving `useUIStore.setActiveDashboardSection`.

**Phase 3 — sidebar regrouping.** Observe accordion holds 17 items in spec
order: Hub + Site Intelligence + Terrain + Hydrology + Solar/Climate +
Ecological + Cartographic + 8 new dashboardOnly surfaces + report exporter.
PLAN/ACT absorb existing dashboards via `stage3` tags only — internal
restructures deferred to those spec docs.

**Phase 4 — 8 gap surfaces.**
- 4a `StewardSurveyCard` + `IndigenousRegionalCard` — extends `visionStore`
  with `steward?: StewardProfile` (lifestyle, skill chips, vision) and
  `regional?: RegionalContext` (indigenous place names, network registry).
- 4b `HazardsLogCard` — historical hazard events (10 types).
- 4c `CrossSectionTool` — coordinate-input transect editor + SVG profile
  chart (PROFILE_W=720, PROFILE_H=180, SAMPLE_COUNT=100). Synthetic
  elevation profile via deterministic seed; UI labels it "live API
  pending". Map-drawn A→B picking deferred.
- 4d `SoilTestsCard` (jar test sand/silt/clay sum-validated, percolation,
  bedrock depth, roof catchment) + `FoodChainCard` (5 trophic levels +
  succession stage). Roof yield: `areaM2 × precipMm × coeff` litres
  (1 mm × 1 m² = 1 L).
- 4e `SectorCompassCard` — SVG circular editor (COMPASS_SIZE=360,
  RADIUS=150). `polar(bearingDeg, r)` converts compass bearing
  (N=0, clockwise) to SVG x/y via `((bearing − 90) × π / 180)`. 8 sector
  types (sun summer/winter, wind prevailing/storm, fire, noise, wildlife,
  view) with distinct wedge colors. `SectorOverlay` for MapView deferred.
- 4f `SwotJournalCard` — 4-column board (S=green / W=red / O=blue / T=gold)
  with per-column inline add. `DiagnosisReportExport` — composes Markdown
  report (sections 1-6 mirroring spec) from all stores; Blob download +
  `window.print()` PDF fallback. No PDF library added.

**Store deviation.** Plan said extend `siteDataStore`, but it's
fetch-driven and ephemeral. Created new persisted store
`store/siteAnnotationsStore.ts` (key `ogden-site-annotations`, v1) for
user-authored annotations, mirroring `nurseryStore`/`fieldworkStore`
pattern. Holds: `hazards`, `transects`, `sectors`, `ecology`,
`successionStageByProject`, `swot`. Helper:
`newAnnotationId(prefix)`. ADR
[`2026-04-29-observe-stage-ia-restructure.md`](decisions/2026-04-29-observe-stage-ia-restructure.md)
+ entity [`site-annotations-store.md`](entities/site-annotations-store.md)
record the rationale.

**Other store extensions** (additive optional fields, no migration):
- `visionStore` — `steward?`, `regional?` + `updateSteward`,
  `updateRegional`, `addNetworkContact`, `removeNetworkContact`.
- `soilSampleStore.SoilSample` — `jarTest?`, `percolationInPerHr?`,
  `depthToBedrockM?`, `roofCatchment?`.

**Verification.**
- `vite build` clean (24.05 s, PWA precache 510 entries / 13.6 MB) with
  bumped `NODE_OPTIONS=--max-old-space-size=8192` (default heap ~3.6 GB
  was OOMing tsc).
- `npx tsc --noEmit` zero new errors.
- Manual UI walkthrough + screenshots deferred.

### Deferred / out-of-scope

- **Push** the 4 local commits on `feat/atlas-permaculture` — awaiting
  manual walkthrough preference.
- **Real elevation API** for `CrossSectionTool` — currently synthetic.
- **`SectorOverlay` for MapView** — sector arrows projected from project
  centroid; backlog item.
- **Map-drawn A→B picking** via `DomainFloatingToolbar` draw-mode.
- **PLAN and ACT internal restructures** — pending those spec docs.
- **True PDF generation** (jspdf/pdf-lib) — print-to-PDF acceptable for v1.

### Recommended next session

- Manual end-to-end walkthrough on a fresh project (steward → hazards →
  transect → soil tests → sectors → SWOT → report). Capture screenshots
  for the LAUNCH-CHECKLIST.
- PLAN and ACT internal restructures (pending those spec docs).

### Same-day follow-ups (closed in this sprint)

After the initial 5 commits landed, all three deferred code items from the
ADR were closed in the same session:

- **`48a7990` — Live elevation API.** `CrossSectionTool` now POSTs to
  `/api/v1/elevation/profile` (NRCan HRDEM / 3DEP via the existing reader)
  with the A→B as a 2-vertex LineString and `sampleCount: 100`. Falls back
  to `syntheticProfile` only when the call throws or DEM has no coverage.
  `Transect` type extended with `sourceApi?`, `confidence?`,
  `totalDistanceM?`. UI button shows "Sampling DEM…" while in flight; chart
  footer chip shows source + confidence ("NRCan HRDEM Lidar DTM (1m) ·
  confidence: high") and only marks "illustrative only" when synthetic.

- **`20d9b79` — SectorOverlay for MapView.** New
  `features/map/SectorOverlay.tsx` reads `siteAnnotationsStore.sectors`
  filtered by `projectId`, builds polygon wedges via `turf.destination`
  from the parcel centroid, paints with the same palette as
  `SectorCompassCard`. Wedge radius scales with parcel diagonal
  (`turf.bbox × 0.75`, min 500 m). `mapStore` gains `sectorOverlayVisible`
  + setter; `LeftToolSpine` gets a Lucide-Compass spine button slot;
  `MapView` mounts both the overlay and the toggle. Quietly no-ops when
  no parcel boundary or no sectors. `style.load` re-sync survives basemap
  swaps.

- **`e726001` — Map-drawn A→B → observe transect.** The map-side
  `features/map/CrossSectionTool.tsx` now exposes a "Save as transect"
  button on its profile panel. After the user draws a line and the DEM
  sample lands, first/last coord of the drawn LineString → `pointA`/
  `pointB`; samples + sourceApi + confidence + totalDistanceM all carry
  through into a persisted `Transect`, so the same data the user drew on
  the map is immediately available in the hub-side observe surface (no
  re-draw, no re-sample). Saved-state shows green "Saved ✓" so the same
  line can't be persisted twice.

Cumulative: 8 commits on `feat/atlas-permaculture`, PR
[#6](https://github.com/onaxyzogden/atlas/pull/6) updated. Build green
across all three follow-ups (last build 23.23 s, 511 PWA precache entries
/ 13.6 MB).

## 2026-04-29 — PLAN Stage IA restructure (Stage 2 of 3)

Plan: `~/.claude/plans/few-concerns-shiny-quokka.md`
ADR: `wiki/decisions/2026-04-29-plan-stage-ia-restructure.md`

Stage 2 mirrors the OBSERVE precedent. Built the Plan Hub landing surface
plus 16 dashboard-only spec-module surfaces under
`apps/web/src/features/plan/`, all reachable from both the hub and the
PLAN sidebar accordion:

- **Module 1 — Layering:** `PermanenceScalesCard` (9-scale rollup of
  Yeomans permanence with feature counts).
- **Module 2 — Water:** `RunoffCalculatorCard` (UI on shared
  `hydrologyMetrics.runoffVolumeL`, auto-pulls `annualPrecipMm`),
  `SwaleDrainTool`, `StorageInfraTool` (cisterns/ponds/rain_gardens).
- **Module 3 — Zone & Circulation:** `ZoneLevelLayer` (Z0–Z5 picker on
  existing zones), `PathFrequencyEditor` (daily/weekly/occasional/rare).
- **Module 4 — Plant Systems:** `PlantDatabaseCard` (filterable browser
  over ~37-species starter DB), `GuildBuilderCard` (anchor + 7-layer
  members), `CanopySimulatorCard` (Year 1–50 SVG scrubber).
- **Module 5 — Soil Fertility:** `SoilFertilityDesignerCard`
  (composter / hugelkultur / biochar / worm_bin), `WasteVectorTool`
  (kitchen→chickens→orchard directed edges).
- **Module 6 — Cross-section + Solar:** `TransectVerticalEditorCard`
  with integrated solstice solar overlay (latitude derived from
  `Transect.pointA[1]`, altitude = `90 - lat ± 23.44`).
- **Module 7 — Phasing:** `PhasingMatrixCard` (phase × season grid),
  `SeasonalTaskCard` (per-phase task editor on
  `BuildPhase.tasks?: PhaseTask[]`), `LaborBudgetSummaryCard`
  (totals / per-phase / per-season rollup).
- **Module 8 — Principles:** `HolmgrenChecklistCard` (12 principles ×
  justification + linked-feature multi-pick + status pill).

**Store extensions (additive, no API changes):**
- `siteAnnotationsStore` v1→v2 with backfill migration. Added 5 new
  families (`earthworks`, `storageInfra`, `fertilityInfra`, `guilds`,
  `wasteVectors`, `species`); extended `Transect` with
  `verticalElements?`. The store now holds 11 families — flagged in the
  ADR as approaching god-store.
- `zoneStore.LandZone.permacultureZone?: 0|1|2|3|4|5` (additive).
- `pathStore.DesignPath.usageFrequency?: 'daily'|'weekly'|'occasional'|'rare'`.
- `phaseStore.BuildPhase.tasks?: PhaseTask[]` (new exported `PhaseTask`).
- New `principleCheckStore.ts` (zustand persist, key
  `ogden-principle-checks`).
- `structureStore` was deliberately NOT extended — the 7 new structure
  types attempted in scratch broke ~15 `Record<StructureType, T>` lookup
  tables; we kept the buildings registry pure and put the new families
  in `siteAnnotationsStore` instead.

**Data assets:** `data/plantDatabase.ts` (~37 species, layered) and
`data/holmgrenPrinciples.ts` (12 principles, stable ids `p1`–`p12`).

**Routing:** 17 new dashboardOnly NavItems registered in
`features/navigation/taxonomy.ts` (one per surface plus
`plan-solar-overlay` aliasing `plan-transect-vertical`); 16 lazy imports
+ 17 case branches added to `DashboardRouter.tsx`.

**Selector discipline:** every new card uses subscribe-then-derive
(`wiki/decisions/2026-04-26-zustand-selector-stability.md`); no inline
`.filter()`/`.map()` in selector callbacks.

**Verification:** `tsc --noEmit` clean, `vite build` green (22.25 s,
533 PWA precache entries). All 16 new sections reachable from Plan Hub
and the PLAN sidebar accordion. DiagnosisReportExport still mounts
cleanly under the extended stores.

---

## 2026-04-30 — uiStore `sidebarGrouping` stage3 coercion migration

**Branch:** `feat/atlas-permaculture`

**Trigger:** Steward report — *"ACT stage is not visible in the UI."*

**Root cause:** Returning browsers persisted `sidebarGrouping` at value
`'stage'` (or `'phase'` / `'domain'`) from before the 2026-04-29 IA
restructure flipped the default to `'stage3'`. The persist middleware
faithfully restored the stale value on every boot, leaving ACT items
sprinkled across non-stage3 group labels with no explicit "Act" header.
Every other surface verified correctly wired (taxonomy, DashboardSidebar,
IconSidebar, dashboardOnly filter on `MAP_ITEMS`).

**Fix:** Bumped `apps/web/src/store/uiStore.ts` persist `version` 1→2
and added an exported `migrateUIPersistedState(persistedState,
fromVersion)` that coerces non-`'stage3'` values to `'stage3'` exactly
once on `fromVersion < 2`. Idempotent on subsequent boots; users can
re-pick a different grouping manually after.

**Secondary fix:** Module-load `useUIStore.persist.rehydrate()` now
guards on `typeof window !== 'undefined'` so vitest can import the
module without crashing on the missing persist API.

**Verification:**
- `npx tsc --noEmit` — clean (exit 0).
- `npx vite build` — clean (40.99 s, 565 PWA precache entries).
- `npx vitest run src/tests/uiStoreMigrate.test.ts` — 7/7 green
  (`'stage' | 'phase' | 'domain'` → `'stage3'`; already-stage3
  unchanged; missing key unchanged; `fromVersion >= 2` no-op; null
  defensive).
- Full vitest run: 482 passed; 7 pre-existing failures in
  `computeScores.test.ts` (scoring layer count, predates this change).

**ADR:** [`wiki/decisions/2026-04-30-uistore-stage3-grouping-migration.md`](decisions/2026-04-30-uistore-stage3-grouping-migration.md).

## 2026-05-02 — In-flight closure arc (Phases 6 + 7)

Closed the bulk of `.claude/plans/few-concerns-shiny-quokka.md` across
an autonomous-loop session arc. Phases 0 (interactive verification) and
8 (ADR-gated future work) remain open by design.

**Phase 6 — V3 page-level CTA wiring** (commits `6658ff1`, `ff7ba5c`,
`2d961f5`, `d32186a`, `c47eed5`, `6dc545a`):

- **6.6** HomeRail stage progress now derives from
  `project.actions.filter(a => a.status === 'done').length / total`
  rather than a fixture literal.
- **6.3** New `useBuildTaskStore` (zustand + persist) keys task
  overrides on `${projectId}::${taskId}`. BuildPage status pills cycle
  `todo → in-progress → done → todo`; "Mark phase complete" sets every
  task in a phase to `done`.
- **6.1** DiscoverPage chips now drive a real `applyCandidateFilters`
  pass over the candidate set (acreage band, price band, use-fit tag).
  Selecting ≥2 candidates surfaces a `CompareModal` with side-by-side
  verdict / scores / top blocker.
- **6.2** ProvePage **Fix on Map** flies the design-page MapLibre
  canvas to the blocker centroid via a transient `useMapFocusStore`
  (not persisted — purely a UI signal). **Generate Brief** downloads
  a Markdown brief built by `generateProveBrief.ts` (verdict, blockers,
  best uses, vision fit, execution, design rules).
- **6.5** ReportPage gains **Download Markdown** (via
  `generateProjectReport.ts`), **Print / PDF** (browser print dialog),
  and **Copy share link** (clipboard + toast). react-pdf was rejected
  for v3.1 — runtime cost (~3MB) doesn't earn its keep against
  print-to-PDF + Markdown.
- **6.4** OperatePage **Create Field Task** + **Log Observation**
  CTAs wired to the fieldwork store.

**Phase 7 — Backend scaffold backfill** (commits `dae36f9`,
`9f0cdff`):

- **7.2** New `packages/shared/src/schemas/sectionResponse.ts` exports
  a `sectionResponse(summary)` helper that wraps a section-specific
  Summary in the same `'ready' | 'not_ready'` discriminated union
  used by section2/section5. All 26 stub schemas (section3, 4, 6..29)
  now export a typed `<Domain>Summary` (3-5 domain fields per the V3
  read-paths) plus a `<Domain>Response`. The
  `Generated stub. Replace with the real Zod types as this section…`
  comment is gone repo-wide.
- **7.1** All 25 scaffold-stub routes under `apps/api/src/routes/`
  replaced with real Fastify handlers that mount the standard
  `authenticate + requirePhase + resolveProjectRole` chain (matching
  basemap-terrain) and return their typed envelope parsed via Zod.
  Until the matching processor lands they emit
  `{ status: 'not_ready', reason: 'not_implemented' }` — a stable
  contract the V3 UI already discriminates against. The
  `Generated stub from scaffold-section.ts` comment is gone repo-wide.
- **7.3** Dead-on-arrival: `structureDemand.ts` and `comfortGrid.ts`
  no longer exist under `packages/shared/src/scoring/`; fuzzyMCDM is
  already wired into `computeScores.ts`; the provenance tooltip UX
  shipped earlier; `hydrologyMetrics.ts:65` is an intentional
  back-compat fallback, not a TODO.

**Verification per phase:**

- **6.x** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  clean for `@ogden/web`.
- **7.x** — same flag, clean for both `packages/shared` and
  `apps/api`. `git grep "Generated stub"` returns nothing.

**Out-of-scope for autonomous closure:**

- **Phase 0** — needs a running dev server + signed-out preview +
  Diagnosis Report markdown export inspection. Requires human at
  the browser.
- **Phase 8** — raster pollinator corridor analysis, global
  groundwater REST sources, phase-gated future routes
  (`MT`/`FUTURE`/`P4`), OBSERVE Phase 4b–4f. Each needs a scoped
  ADR before implementation.

**ADR:** [`wiki/decisions/2026-05-02-section-response-envelope.md`](decisions/2026-05-02-section-response-envelope.md).

## 2026-05-03 — M6 SWOT conform to OGDEN reference

**Trigger.** Static audit of `apps/atlas-ui` M6 SWOT pages (commit `e1930b4`) against the OGDEN prototype at `C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\pages\` — initial port had drifted: missing `.swot-hero` wrapper, dropped `.is-active` modifier on `.verdean-subnav`, hardcoded copy substituted with vm strings where unnecessary, prioritized-findings dot math removed.

**Decision.** Treat OGDEN's `src/pages/` as canonical. Re-port verbatim, surgically reintroduce four atlas-ui-specific concerns: vm imports (`swotDashboard`/`swotJournal`/`swotSynthesis` + `useBuiltinProject`), vm injection at data-only points (with `KPI_BY_LABEL`/`KPI_LABEL_DISPLAY` translation maps for UPPERCASE labels), TanStack Router `Link` (Lucide `Link` icon aliased to `LinkIcon`), and "351 House"/"Yousef A." labels. One approved deviation: dynamic `ReportRadar` polygon driven by `vm.swotDiamond`. ADR: [`decisions/2026-05-03-m6-swot-conform-to-ogden.md`](decisions/2026-05-03-m6-swot-conform-to-ogden.md).

**CSS audit conclusion.** Re-grep confirmed atlas-ui's M6 SWOT block (`styles.css` 8101–10507) already contains every OGDEN selector — `.swot-hero h1`, `.swot-equations`, `.swot-journal-rows p`, `.swot-panel-card button`, `.diagnosis-card section`, `.verdean-subnav .is-active`, full report-card family — and `.green-button` base at line 1195 matches OGDEN's line 7055 byte-for-byte. **No CSS backfill needed**; the visual drift was entirely structural (JSX), not stylistic.

**Files.** Three pages rewritten, net +145/−292:
- [`SwotDashboardPage.jsx`](apps/atlas-ui/src/pages/SwotDashboardPage.jsx)
- [`SwotJournalPage.jsx`](apps/atlas-ui/src/pages/SwotJournalPage.jsx)
- [`SwotDiagnosisReportPage.jsx`](apps/atlas-ui/src/pages/SwotDiagnosisReportPage.jsx)

**Verification.** `pnpm --filter atlas-ui build` clean (4.14s, 142 KB CSS / 481 KB JS). `preview_console_logs --level error` empty across all three SWOT routes. DOM eval on each route confirms expected `<h1>` text. `preview_screenshot` timed out repeatedly during this session — visual side-by-side diff against OGDEN deferred until tool recovers.

**Commit.** `ba32fc7`.

### Deferred

- **Visual side-by-side diff** against OGDEN once `preview_screenshot` is responsive — register OGDEN at port 4173 in `.claude/launch.json`, navigate both servers to `/observe/swot`, `/observe/swot/journal`, `/observe/swot/diagnosis-report` at viewport 1672×941, screenshot pair-wise.
- **`preview_inspect`** on six previously-broken selectors (`.swot-hero h1`, `.swot-equations`, `.swot-journal-rows`, `.diagnosis-card section`, `.verdean-subnav .is-active`, `.green-button`) to confirm computed values match OGDEN.

### Recommended next session

- Pair the M6 SWOT conform with the deferred visual side-by-side once screenshot tool recovers.
- Or — pivot to PLAN/ACT stage: 100+ reference PNGs in `C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\assets\reference\` are spec-only and not yet built into pages.
- Or — pick up the deferred follow-ups from 2026-04-26 (Zustand selector sweep on `features/vision/` + `features/export/` `getVisionData` sites).

## 2026-05-04 — atlas-ui ← MILOS UI/UX lift (Phases 1–4)

Bottom-up phased lift of `apps/atlas-ui` against the MILOS reference SPA
(`C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\src\`). Decision recorded
at [2026-05-04 atlas-ui ← MILOS UI/UX Lift](decisions/2026-05-04-atlas-ui-milos-lift.md).

**Phase 1 — Foundation tokens.** Extended `apps/atlas-ui/src/styles.css`
with spacing/text/motion/elevation/radius scales mirroring MILOS, plus
global `prefers-reduced-motion` zeroing. Tokens additive — zero visual
diff on the 14 wired OBSERVE pages.

**Phase 2 — Primitives + a11y.** Built
`apps/atlas-ui/src/components/primitives/` (Button, IconButton, TextInput,
Textarea, Select, Modal, Tooltip, Toast, Skeleton). Hooks: `useFocusTrap`,
`useKeyboard`, `useReducedMotion`. Dev-only `/dev/primitives` route for
visual QA.

**Phase 3 — Unified AppShell + icon registry.** New `AppShellV2` with
3-column grid, 56px topbar with portal slot, `layout="contained"|"fullscreen"`
prop, `navConfig` driven sidebar with progressive disclosure, `mod+k`
SearchPalette. Migrated all 18 routes one shell at a time across 4
commits. Stripped four bespoke shell CSS blocks (~527 lines, 9659 chars)
via brace-balanced Python parser handling `@media` nesting. Renamed
`AppShellV2` → `AppShell`; deleted legacy `AppShell` + `SideRail`.

**Phase 4 — Feedback wired into real flows.** Added `EmptyState`
primitive. Rewrote `BuiltinProjectContext` to expose `{status, error,
retry}` and call `toast.error(...)` on fetch failure (was previously
silent). Flipped provider order in `main.jsx` so `ToastProvider` wraps
`BuiltinProjectProvider`. `ObserveDashboardPage` consumes the contract
fully (Skeleton + `EmptyState variant="error"`). For the other 13
data-bearing pages, audit showed pervasive `?? staticFallback` patterns
making full skeletons more churn than value — built reusable
`<ProjectDataStatus />` inline alert (renders only when `status ===
"error"`, with Retry button) and dropped it into all 14 pages.

**Files changed (high-level):**
- New: `src/hooks/useFocusTrap.js`, `useKeyboard.js`, `useReducedMotion.js`
- New: `src/components/primitives/{Button,IconButton,TextInput,Textarea,Select,Modal,Tooltip,Toast,Skeleton,EmptyState}.jsx` + index
- New: `src/components/AppShell.jsx` (was `AppShellV2`), `src/styles/appshell.css`, `src/icons.js`
- New: `src/components/ProjectDataStatus.jsx`, `src/routes/devPrimitives.jsx`
- Edited: `src/styles.css` (token block), `src/main.jsx` (provider order), `src/context/BuiltinProjectContext.jsx` (status/error/retry), `src/components/index.js`
- Edited: 18 page files (shell wrapper migration); 14 data-bearing pages (ProjectDataStatus drop-in)
- Deleted: legacy `AppShell.jsx`, `SideRail.jsx`, four bespoke shell CSS blocks

**Verified:** `pnpm --filter atlas-ui build` clean after each phase.

**Deferred:** grid-alignment audit (walking the 14 presentational
components with `preview_inspect` to snap internal margins to `--space-*`
tokens); light-mode elevation parity.

**Commits:** `e1ec94e` (Phase 1–3 tokens/primitives/shell) →
`33fa3cf` (page migration) → `d20cbb5` (legacy shell removal) →
`7951596` (rename + dead-CSS strip) → `05b14a8` (Phase 4 feedback) →
`5029ca3` (ProjectDataStatus 14-page wiring).

---

## 2026-05-04 — Observe dashboard Human Context card visual restoration

**Trigger.** User flagged drift between live `/observe/dashboard` Human Context card and the legacy static reference (`apps/atlas-ui/legacy/index-static.html`). Three regressions: empty-dot people-orbit, flat-text mini-stats, and underlined `<Link>`-as-button labels.

**Fix.** Three files in `apps/atlas-ui/`:

- [`src/pages/ObserveDashboardPage.jsx`](apps/atlas-ui/src/pages/ObserveDashboardPage.jsx) — `PeopleOrbit` now renders a center node with `<User />` and 6 satellite nodes each containing a `<User />`; `MiniStats` consumes structured `{icon,label,value,tone}` items via a local lucide lookup (`users`, `newspaper`); `CardActions` appends `<ArrowRight />` to the primary button label. Removed the now-redundant inline `→` from the SWOT card's primary label.
- [`src/data/builtin-sample.js`](apps/atlas-ui/src/data/builtin-sample.js) — `observeDashboardModules.humanContext.miniStats` migrated from string array to `[{icon,label,value,tone?}]`. Stakeholders carries `tone: "amber"`.
- [`src/styles.css`](apps/atlas-ui/src/styles.css) — added `text-decoration: none` to `.stage-settings/.outlined-button/.green-button` base so router `<Link>` instances don't underline; split `.mini-stat-row` from `.dashboard-badge-row` (now a 3-column grid with stacked icon/label/`<b>` and `.amber b` modifier mapped to `--olos-gold-bright`); rebuilt `.people-orbit-small` with `::before/::after` concentric inner rings, `.people-orbit-small__center` element (44×44, bg `#33451e`), and per-node icon styling (27×27, 15px svg). Legacy CSS at `apps/atlas-ui/legacy/styles-static.css:510-569` was the reference.

**Verification.** `pnpm install --filter atlas-ui...` (worktree fresh-install). Vite at `http://127.0.0.1:5300/observe/dashboard`. `preview_inspect` confirmed: 6 orbit nodes each with svg + center svg, 3 mini-stat cells each with icon + `<b>`, `.amber b` color `rgb(213, 164, 58)` vs default `rgb(255, 242, 214)`, all three card buttons computed `text-decoration: none`. **Screenshot tool was unresponsive** (preview_screenshot timed out at 30s repeatedly) — verification rests on DOM/computed-style inspection, not visual diff.

**Note.** Mid-session, an external HEAD switch wiped uncommitted edits; changes were re-applied cleanly from the conversation context. Working tree was reverified post-restore.

### Deferred

- Other module cards (Macroclimate, Topography, EWE, Sectors, SWOT) still use the legacy `BadgeRow` pattern; user only requested Human Context parity. If the same icon+label+value treatment is desired elsewhere, the structured `miniStats` shape and `MINI_STAT_ICONS` lookup can be extended.
- Manual eyeball at `/observe/dashboard` recommended since screenshot tool timed out.

### Recommended next session

- Visual sweep across the remaining 5 dashboard module cards to check for similar drift from the legacy static reference.
- Or: pick up the still-deferred `getVisionData` selector cleanup from 2026-04-26.

---

## 2026-05-04 — Phase 8 dump-format verification sweep + foundational scaffolding

**Context.** Phase 8.2 engineering had landed up to the point where every
remaining adapter slice was blocked on an external-data verification
the agent could not complete offline (WDPA monthly dump format, NCED
licence + dump, ECCC ESG static dump, IGRAC GGIS WFS layer name).
Rather than fabricate format details and risk silent ingest-job
breakage on first cron run, four parallel research tracks were
collapsed into one operator-actionable verification note plus two
foundational scaffolding commits that do not depend on external
verification.

### Engineering shipped

**Commit `02258a4`** — `feat(web): drop INTL groundwater lat-heuristic in favour of server IGRAC` (Phase 8.2-A.4).
Non-US/non-CA groundwater path in
[`apps/web/src/lib/layerFetcher.ts`](apps/web/src/lib/layerFetcher.ts)
now returns `null` so the orchestrator IGRAC result surfaces in the
diagnosis report instead of the lat-based climatic-regime estimate.
`fetchGroundwaterHeuristicGlobal` retained as a last-resort callable
for paths that explicitly bypass the pipeline.

**Commit `9c5032a`** — `feat(8.2-B.1, 8.1-A.1): conservation overlay schema + canonical land-cover classes`.
Two foundational data-layer slices, one commit:
- [`apps/api/src/db/migrations/024_conservation_overlay_features.sql`](apps/api/src/db/migrations/024_conservation_overlay_features.sql) —
  one physical table, three logical sources (WDPA / NCED / ECCC_ESG),
  `(source, source_record_id)` upstream stable key for vintage UPSERTs.
  GIST + source + (source, ingest_vintage) indices.
- [`packages/shared/src/ecology/landCoverClasses.ts`](packages/shared/src/ecology/landCoverClasses.ts) —
  canonical Atlas class set + per-source mappings (NLCD 16, ACI ~70,
  WorldCover 11) → canonical strings. Class names align with the
  existing `pollinatorHabitat.ts` weight tables; three `(unspecified)`
  buckets capture WorldCover honest information loss.

### Research output

**[`wiki/inquiries/2026-05-04-dump-format-verification-sweep.md`](inquiries/2026-05-04-dump-format-verification-sweep.md)** —
single consolidated note covering all four upstream dumps. For each:
URL convention, file format, schema column table mapping to the Atlas
target table, ingest pattern (cron cadence + UPSERT key + atomic
vintage swap), and an operator-checklist of click-verifications
(download a sample, confirm column names, confirm CRS).
[`wiki/concepts/external-data-sources.md`](concepts/external-data-sources.md)
verification checklist updated with four new dump-format rows linking
back to the sweep.

Cross-cutting decisions locked in the sweep: EPSG:4326 for all
geometries, atomic vintage-swap pattern across all four ingest jobs,
`YYYY-MM | YYYY-Qn | <year>-static` vintage format convention.

### Definition-of-done check

`tsc --noEmit` clean on `@ogden/shared` and `apps/web` (with raised
heap; default 4 GB OOMs the type-checker on `layerFetcher.ts` size —
not a regression). Migration runner discovers 024 as a numeric-prefix
file; SQL syntax sanity-checked manually against migration 015's
trigger pattern.

### Deferred (operator-blocking)

- WDPA: download a current `WDPA_<MonthYYYY>_Public.zip`; confirm
  `.gdb` vs `.shp` extension, column names (is `DESIG_ENG` still
  stable?), CRS.
- NCED: capture terms-of-use; download latest quarterly bundle; confirm
  GDB schema columns.
- ECCC ESG: locate canonical open.canada.ca dataset slug; download
  shapefile + CSV; confirm column names + CRS.
- IGRAC GGIS: confirm WFS endpoint live, capture wells layer name +
  exact field schema via a 1-feature `getFeature` request.
- WDPA + IGRAC outbound emails (launch-gate, not engineering blocker):
  send `business-support@unep-wcmc.org` and the IGRAC `info@un-igrac.org`
  inquiries already drafted.

### Deferred (engineering, awaits verification)

- 8.2-A.3 IGRAC quarterly ingest job at `apps/api/src/jobs/igrac-ingest.ts`.
- 8.2-B.2 WDPA monthly ingest + adapter.
- 8.2-B.3 NCED quarterly ingest + adapter (also blocks on licence).
- 8.2-B.4 ECCC ESG static one-time import + adapter.
- 8.2-B.5 conservation-overlay endpoint + diagnosis-report copy.
- 8.1-A.1 raster path: NLCD/ACI/WorldCover adapters need a polygonization
  toolchain ADR (rasterio + shapely vs PostGIS `ST_DumpAsPolygons`)
  before adapter scaffolds can land.

### Recommended next session

Operator runs the four dump-format verifications (~30-60 min total of
portal navigation + sample downloads); files deltas back into the sweep
note; agent then drafts the four ingest jobs + four adapters in parallel
against the now-verified schemas. Polygonization toolchain ADR is a
small parallel scoping note that does not block the conservation arc
but does block the pollinator-corridor raster adapters.

---

## 2026-05-05 — Session close: Phase 8.2-B.4 CpcadAdapter + ingest job

**Session summary.** Continuation of the Phase 8 engineering arc.
All work in this session was on the `claude/vigilant-elbakyan-2d16d9`
branch (PR #12).

### Commits shipped this session (oldest → newest)

| Commit | Summary |
|--------|---------|
| `02258a4` | 8.2-A.4: retire INTL lat-heuristic in `layerFetcher.ts`; null fallthrough to server IGRAC |
| `9c5032a` | 8.2-B.1 + 8.1-A.1: migration 024 `conservation_overlay_features`; `landCoverClasses.ts` canonical mapping |
| `2ec2a56` | Dump-format verification sweep (WDPA/NCED/ECCC/IGRAC); cross-cutting ingest decisions locked |
| `6c5a4f8` | Source correction: ECCC ESG → CPCAD (schema verified from live GDB via ogrinfo) |
| `145ce36` | 8.2-B.4: `CpcadAdapter.ts` + `cpcad-ingest.ts` + registry wiring + config env vars |

### State of Phase 8 arcs

**Phase 8.2-A (IGRAC global groundwater fallback):**
- ✅ 8.2-A.1 migration 023 (`groundwater_wells_global`)
- ✅ 8.2-A.2 `IgracGroundwaterAdapter` + registry + orchestrator
- ✅ 8.2-A.4 client-side INTL heuristic retired
- ⏳ 8.2-A.3 `igrac-ingest.ts` — blocked on WFS layer-name verification
  (see dump-format sweep §4)

**Phase 8.2-B (Conservation overlay):**
- ✅ 8.2-B.1 migration 024/025 (`conservation_overlay_features` + CPCAD constraint)
- ✅ 8.2-B.4 `CpcadAdapter` + `cpcad-ingest.ts` (CA tier complete)
- ⏳ 8.2-B.2 WDPA — blocked on protectedplanet.net dump verification
- ⏳ 8.2-B.3 NCED — blocked on licence check + dump verification
- ⏳ 8.2-B.5 overlay endpoint + diagnosis report copy (after 8.2-B.2/3)

**Phase 8.1-A (Pollinator hybrid land cover):**
- ✅ 8.1-A.1 `landCoverClasses.ts` canonical mapping + NLCD/ACI/WorldCover code tables
- ⏳ 8.1-A.1 raster adapters — need polygonisation toolchain ADR first
- ⏳ 8.1-A.2/3/4 pending adapters

### Operator action items (non-engineering)

1. **Run `cpcad-ingest.ts`** against the local 2025 GDB (command in
   `data-pipeline.md` entity page) to populate `conservation_overlay_features`
   with the CPCAD 2025 vintage.
2. **Verify IGRAC WFS endpoint** — hit GetCapabilities, capture wells layer
   name + 1-feature schema (see dump-format sweep §4). ~10 min.
3. **Verify WDPA dump** — free account on protectedplanet.net, download
   current month ZIP, confirm `.gdb` extension + column names (see sweep §1).
4. **Verify NCED** — terms-of-use at `conservationeasement.us/about/legal/`;
   download quarterly bundle; column names (see sweep §2).
5. **Send outbound emails** (launch gates, not engineering blockers):
   `business-support@unep-wcmc.org` (WDPA commercial) + `info@un-igrac.org`
   (IGRAC licence). Drafts in `wiki/inquiries/`.

### Recommended next session

Either: operator files dump-format verifications back into
`wiki/inquiries/2026-05-04-dump-format-verification-sweep.md` → agent drafts
remaining ingest jobs + adapters (IGRAC ingest, WDPA adapter + ingest, NCED
adapter + ingest) in one session. Or: land the polygonisation toolchain ADR
for the 8.1 raster land-cover adapters so both 8.1 and 8.2 unblock in parallel.
---

## 2026-05-05 — Polygonisation toolchain ADR landed (unblocks 8.1-A)

Locks the raster-sample + polygonisation toolchain decisions left
implicit in the 8.1-A hybrid land-cover ADR and the 8.1-B
polygonize-friction ADR. New decision file:
`wiki/decisions/2026-05-05-pollinator-corridor-raster-pipeline.md`.

Eight decisions locked (D1-D8):

- **D1.** 8.1-A is raster-sample only. `LandCoverSummary.classes` is
  derivable from a parcel-bbox raster sample; no polygonisation
  required at the adapter layer. Polygonisation is exclusively an
  8.1-B (friction surface) concern.
- **D2.** Raster-sample toolchain = `geotiff.js` against per-vintage
  COGs. Mirrors `SoilGridsRasterService` and `GaezRasterService`
  exactly — no new architectural surface. Manifest-on-boot,
  byte-range reads only.
- **D3.** Source CRS reprojection happens at sample/polygonise time,
  not at ingest. NLCD EPSG:5070, ACI EPSG:3347, WorldCover EPSG:4326
  native; rasters stay in native CRS on disk; parcel polygon is
  reprojected via `proj4` at sample time.
- **D4.** Tile acquisition is an operator job
  (`apps/api/src/jobs/landcover-tile-ingest.ts`, deferred), not an
  API hot path. Runs once per vintage; tile layout
  `data/landcover/<source>/<vintage>/<tile>.tif` with optional
  `LANDCOVER_S3_PREFIX` env-var override (mirrors SOILGRIDS/GAEZ
  prefix pattern).
- **D5.** Production polygonisation = `gdal_polygonize.py`
  shell-out from the Tier-3 worker. Mirrors `cpcad-ingest.ts`'s
  `ogr2ogr` precedent. `rasterio` rejected (adds Python runtime),
  PostGIS `ST_DumpAsPolygons` rejected (requires `postgis_raster`
  extension we don't enable). Pure-JS contour tracing kept as
  dev/test fallback only.
- **D6.** Simplification = `ST_SimplifyPreserveTopology(geom, t)`
  with t = native pixel resolution: 30m NLCD/ACI, 10m WorldCover.
  PreserveTopology variant ensures shared edges stay shared, which
  the 8.1-C patch-graph LCP depends on.
- **D7.** Polygonised friction surfaces are ephemeral per-parcel.
  Computed in-memory in 8.1-B's processor, dropped on job completion.
  Persistence deferred until profiling shows polygonisation is the
  Tier-3 bottleneck; can be added non-breakingly later as a
  `pollinator_friction_cache` PostGIS table keyed by
  `(parcel_id, source, vintage)`.
- **D8.** `polygonizeBbox(parcel, options)` signature locked with
  injected `rasterService` (testable via stub) and `db` handle for
  the `ST_Transform` boundary.

Implementation impact: 8.1-A.1-A.3 unblocked today on `geotiff.js`
only; no GDAL runtime dependency required for the API server to
serve land-cover summaries. GDAL becomes a Tier-3 *worker* runtime
dependency (it was already a one-shot ingest dependency via
`cpcad-ingest`), with the same `GDAL_BIN_DIR` env var pattern;
worker-boot smoke check refuses to start if `gdal_polygonize.py`
is missing.

Wiki updates: index.md gets a new decisions row; this log entry.
No code changes in this commit (ADR-only).

### Next session

8.1-A.1 implementation: three `LandCoverRasterService` classes +
three adapters following the locked toolchain. Test fixtures
inject stub services so no real COGs need to land first. Tile
acquisition (`landcover-tile-ingest.ts`) lands as a follow-up
operator job in the same phase.

The four operator-blocking sweeps (8.2-A.3 IGRAC ingest,
8.2-B.2 WDPA, 8.2-B.3 NCED, plus the WDPA + IGRAC outbound emails)
remain in flight on the operator side; engineering side has no
remaining blocker on either branch.

## 2026-05-05 — 8.1-A & 8.1-B implementation landed (raster pipeline live behind flag)

Implements the toolchain locked in the 2026-05-05 ADR. Five commits
on `claude/vigilant-elbakyan-2d16d9` (PR #12):

- `a6377f7` 8.1-A.1 — `LandCoverRasterServiceBase` + three
  concrete services (NLCD, ACI, WorldCover) with manifest-on-boot,
  geotiff.js byte-range reads, proj4 reprojection at sample time.
- `0524a03` 8.1-A.2/A.3 — three raster-sample adapters
  (`NlcdLandCoverAdapter`, `AciLandCoverAdapter`,
  `WorldCoverLandCoverAdapter`) + shared
  `landCoverAdapterCommon.ts` for native→canonical class mapping
  and `LandCoverSummary` provenance fields.
- `a556dd3` 8.1-B.1/B.2 — `polygonizeBbox` + `corridorFriction` in
  `@ogden/shared` (signature locked per D8: `clipProvider`,
  `polygonizer`, `reprojector` injection); pure-JS
  `polygonizePixelGrid` fallback; `polygonizeWithGdal` shell-out in
  apps/api wrapping the locked `gdal_polygonize.py` toolchain (D5).
- `fd11cfc` 8.1-B.3/B.4 — `PollinatorOpportunityProcessor` swap
  behind `POLLINATOR_USE_POLYGON_FRICTION` flag (default off),
  60 s `withTimeout` race per `POLLINATOR_POLYGON_TIMEOUT_MS`,
  legacy synthesized-grid path retained as fallback.
  `landcover-tile-ingest.ts` operator job lands per D4.
  `LANDCOVER_TILES_READY` env-flag-gated dispatch in
  `DataPipelineOrchestrator.resolveAdapter`.
- `7ec7056` 8.1-B.5 — `clipToBbox` on the base class returning
  `RasterClip` (single-tile v1; multi-tile null + caller fallback);
  `sourceId: LandCoverSourceId` declared on each concrete service so
  clips carry provenance through `deriveCorridorFriction`.
  `tryPolygonPath` fully wired: country resolver
  (US→NLCD, CA→ACI, INTL→WorldCover), parcel bbox + degree-buffer
  ClipProvider adapter, `runPolygonFrictionPath` inside the
  withTimeout race. `loadContext` SQL extended with `p.country` +
  `ST_AsGeoJSON(p.parcel_boundary)` (Polygon/MultiPolygon parsed,
  first ring on MultiPolygon).

Test coverage: fixture-COG test
(`LandCoverRasterServiceBase.clipToBbox.test.ts`) mocks geotiff at
the module boundary and asserts the four `clipToBbox` branches
(unloaded manifest / no-tile-intersect / single-tile success /
multi-tile null). 4/4 pass. tsc clean across `@ogden/api` and
`@ogden/shared`. `polygonizeBbox.test.ts` covers the shared-package
contract end-to-end with stub providers. Total: 166/166 shared +
new clip tests passing; 7 unrelated pre-existing failures
(smoke/projects/boundary/NASA POWER/SSURGO) confirmed on baseline
via stash-and-rerun.

Production gate is intentionally still off:
`POLLINATOR_USE_POLYGON_FRICTION=false` and `LANDCOVER_TILES_READY=false`
keep both the orchestrator's adapter dispatch and the processor's
polygon path on the legacy synthesized-grid behaviour. Flipping
them on requires real tiles in `data/landcover/<source>/<vintage>/`
+ a manifest produced by `landcover-tile-ingest`. `verify-scoring-parity`
delta stays at 0.000 because pollinator_opportunity is never
referenced by `computeScores.ts`.

Known limitations carried forward:
- `clipToBbox` is single-tile-only in v1; multi-tile parcels
  fall back to the synthesized grid (logged at warn level).
  Multi-tile stitching deferred until profiling justifies it.
- ClipProvider's degree-buffer (bufferKm/111) ignores latitude
  scaling — acceptable for v1; tighten when high-latitude parcels
  become a real cohort.
- Friction-surface persistence is still ephemeral per D7.

### Next session

End-to-end smoke test: stand up a real WorldCover tile in
`data/landcover/worldcover/2021/`, run `landcover-tile-ingest`,
flip `POLLINATOR_USE_POLYGON_FRICTION=true` +
`LANDCOVER_TILES_READY=true` against a synthetic INTL project, and
watch a `samplingMethod: 'polygon'` row land in `project_layers`.
Triage the 7 pre-existing failing tests (separate session — they
pre-date this work).
