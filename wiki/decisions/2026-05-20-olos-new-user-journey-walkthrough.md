# 2026-05-20 — OLOS New-User Journey Walkthrough (6-step product run)

**Status:** observation · no code change
**Surface tested:** `feat/atlas-permaculture` (current branch), web :5200 + api :3001
**Persona:** brand-new account (`newuser-2026-05-20@example.com`) created against a freshly cleared localStorage
**Spec:** the 6-step OLOS journey as written in the product brief

## TL;DR

Atlas has a remarkably broad surface for a 55%-Done app — every one of the 6 journey steps has a real mounted module, not a placeholder. The verdicts are mostly 🟡 partial, not 🔴, because the chrome is there but several promises break under a true cold start: (a) layers don't auto-load on project create, (b) scorecard reports 13 dimensions where the journey promises 8, (c) monitoring backend calls fail with "Invalid or expired token" right after a successful registration, (d) the "OLOS will load real public GIS data for your parcel" sentence is materially false until a boundary is drawn.

The journey is shaped like a sequential 6-step walk; the IA is the **3-item Observe / Plan / Act** loop. They map cleanly — but a new user reading the brief and landing in `/v3/project/:id/observe` won't immediately see how step 1 → step 6 corresponds to the three nav items.

---

## Pre-flight findings (Phase 0)

Even before touching the journey, the boot surfaced four issues a fresh operator would hit:

- **Redis unavailable** in the API process → "pipeline workers and pub/sub will be disabled" warning. The marketing copy implies pipeline-fed layers; cold local boot quietly disables them.
- **3 unapplied migrations** (`026_geodesic_acreage_backfill`, `027_project_state_blobs`, `028_vegetation_and_succession_tables`) — runner not run as part of `pnpm install` or any boot hook. A new contributor following [LOCAL_SETUP.md](../../LOCAL_SETUP.md) would land here.
- **SoilGrids self-hosted service disabled** (no manifest at `data/soilgrids`) — silently degrades soils intelligence everywhere.
- **AI enrichment crashes on hydrated localStorage** with `TypeError: Cannot read properties of undefined (reading 'map')` at `apps/web/src/features/ai/ContextBuilder.ts:69` — fires once per pre-existing project across all three enrichment paths (site narrative, design recommendation, assessment flags). Then later switches to `Invalid or expired token` once auth is required. *Cleaning localStorage masks the first error but not the second.*

---

## Step 1 — Create a Project & Observe — 🟡 partial

**Surface:** `/login` → `/new` (4-step wizard) → `/v3/project/:uuid/observe`
**What works:** registration → wizard (name+type, location, boundary, notes) → Observe stage with a full annotation palette (Human Context · Macroclimate/Hazards · Topography · EWE · Sectors/Zones · SWOT · Built Environment).

**What breaks vs. the journey copy:**

- **"Search your property address … OLOS will automatically load real public GIS data for your parcel"** — false on cold start. Project create fires *one* API call (`GET /api/v1/projects/builtins`) and zero data-layer requests. No `POST /api/v1/projects` either — the new project is stored in localStorage only. The auto-fetch is gated behind drawing a boundary; without it, every layer-dependent UI shows "draw a property boundary first." A new user expecting the address to "snap" a parcel and pre-load layers will be lost.
- **"Project list as a new user"** — even after clearing 45 localStorage keys, two seed projects ("Moontrance Creek", "351 House — Atlas Sample") appear from `/api/v1/projects/builtins`. Not a bug, but the empty-state copy doesn't acknowledge them.
- **Auth state propagation gap:** after successful registration the header on `/home` shows "Test New User" but on `/new` reverts to "Sign In" — header is not subscribing to the same auth atom on the wizard route.
- **Controlled-select binding:** the project-type `<select>` does not commit through standard `change` events fired by automation; required `HTMLSelectElement.prototype.value` setter to commit. Real users are fine — but this is a smell that the select isn't a clean controlled component.
- **Sync banner conflict:** despite a valid registration, the project still shows "**Not saved to an account** — your design lives only in this browser." Either the banner is wrong, or the backend sync is genuinely not wired (matches the wiki entity statement that 26 stores are localStorage-persisted with no backend sync).
- **Observations not actually placed:** with no boundary, attempting to drop annotations is blocked. Couldn't verify reload-persistence of observations end-to-end via preview tooling (WebGL canvas synthetic events don't reach MapLibre — documented gotcha).

---

## Step 2 — Review the Site Scorecard — 🟡 partial

**Surface:** Observe → "Land Assessment" panel (right rail)

The scorecard mounts immediately. But:

- **The journey promises an "eight-dimension assessment." The UI shows 13** scored dimensions: Water Resilience (47/Low), Agricultural Suitability (48/Low), Regenerative Potential (35/Low), Buildability (60/Moderate), Habitat Sensitivity (25/Insufficient Data), Stewardship Readiness (34/Low), Community Suitability (53/Moderate), Design Complexity (20/Insufficient Data), Water Retention (0/Insufficient Data), Drought Resilience (0/Insufficient Data), Storm Resilience (5/Insufficient Data), FAO Land Suitability (60/S2 — Moderately Suitable), USDA Land Capability (72/Class III). The 8→6 mapping ADR `2026-04-30-v3-score-adapter-8-to-6-mapping.md` is now an 8→13 reality.
- **"With confidence ratings"** is rendered as the string "Insufficient Data" rather than a numeric/visual confidence; some dimensions still show a non-zero score next to "Insufficient Data," which reads incoherent (e.g., "Habitat Sensitivity 25 / Insufficient Data" — what does the 25 mean if the data is insufficient?).
- **Scores fire on a parcel with no boundary and no data.** Water Resilience 47 and Agricultural Suitability 48 are not credible reads of *this* land — they're priors. The "honest mirror" framing is undermined by showing numbers when the inputs are absent.

The 13-dimension cardography is genuinely impressive — but copy and behaviour need reconciling.

---

## Step 3 — Design the Landscape — ✅ delivers (palette) · 🟡 partial (catalogue/ledger)

**Surface:** `/v3/project/:id/plan`

The Plan stage tool palette is the **most complete surface in Atlas** by a wide margin. Categories visible:

Water (catchment, storage, swale, sink, spring, berm) · Zone & Circulation (zone, path, buffer ring, road, bridge, seed-zones-from-rings) · Machinery (turnaround) · Livestock (paddock, fence, schedule move, slaughter, cold chain, market) · Plant Systems (crop area, guild, orchard, silvopasture, pasture mix, oak/pine/apple/shrub, hedgerow, raised bed) · Soil (fertility unit, flow connector) · Holmgren Verification (note, transect) · Buildings (12 kinds) · Agricultural (barn, greenhouse, shed, animal shelter, compost) · Utilities (well, septic, tank, pump, solar) · Infrastructure (power, buried utility, fence, gate, driveway) · Machinery (shed, fuel, yard) · Amenities (fire circle, parking, terrace) · Custom GLB upload.

**Gap vs. journey copy:** the brief explicitly names "**planting catalogue and nursery ledger**." The palette has plant *kinds* (oak, pine, apple, shrub, hedgerow, etc.) but no top-level "catalogue" or "nursery ledger" view in the Plan tool tray. The nursery store exists in localStorage (`ogden-nursery`), but no discoverable surface. New users will not find it from the journey copy alone.

Map-canvas placement (continuous-point, hex-fill, spacing snap, temporal slider) couldn't be exercised via preview tooling — WebGL synthetic-event hang. These are validated in prior session memory on `feat/atlas-permaculture` but the cold-start verification is owed to a steward run.

---

## Step 4 — Phase the Build (Goal Compass + Phasing engine) — ✅ delivers

**Surface:** Plan → "Open Goal Compass module" + "Open Phasing & Budgeting module"

**Goal Compass** (slide-up, 5 sub-steps: Goal tree · Site profile · Proposal · Develop plan · Criteria forecast). The "Goal tree" is the strongest evidence of the journey's vision: 6 templated sub-goals (Cash crop yield, Soil health, Water cycle, Biodiversity habitat, Biodiversity outcomes, Livestock enterprise), each with measurable criteria + units + targets + by-year. Templates: regenerative farm / retreat / homestead / educational / conservation / multi-enterprise.

**Phasing & Budgeting** (slide-up, 9 tabs: Phasing matrix · Seasonal tasks · Cover-crop economics · Labor & budget · Scale-of-permanence · Cumulative investment · Maintenance schedule · Equipment replacement · Material substitutions).

The Phasing matrix is a **phase × season** grid with 4 phases (Year 0-1 / 1-3 / 3-5 / 5+). Each phase carries a **Yeomans cap** — `climate → landshape → water → access → trees → buildings → subdivision → soil → uncapped`. *This is the ecological-sequencing dependency the journey promises.* Swales before orchard is enforced by the Yeomans cap, not by an auto-DAG of task-to-task edges.

Verdict: delivers — but with a caveat the journey copy doesn't mention. The engine **doesn't auto-sequence** the design; it provides the *cap rule* that prevents out-of-order phases. The steward still adds tasks and assigns phases manually.

---

## Step 5 — Day-to-Day in the Command Centre (Act) — 🟡 partial

**Surface:** `/v3/project/:id/act/*`

The command-centre dashboard mounts with QUICK LOG (Log harvest · Log water check · Log livestock move · Create Field Task · Log Observation) + TRACKER (7 module tabs).

Mapping the journey's 7 promises to actual surfaces:

| Journey promise | Actual surface | Verdict |
|---|---|---|
| tasks | QUICK LOG + Plan→Phasing seasonal tasks + BUILD Gantt | ✅ |
| dependencies | Plan→Phasing Yeomans cap; visualised on BUILD Gantt | ✅ |
| labor | Plan→Phasing "Labor & budget" tab + MAINTAIN minutes per event | 🟡 visible, not driven from labour roster |
| materials | Plan→Phasing "Material substitutions" tab only | 🟡 partial |
| contractor scopes | NETWORK CRM (Vendor / Tradesperson / Consultant roles) | ✅ contacts; no scope-of-work doc |
| budget-vs-actual | BUILD "Budget vs actuals" tab | ✅ tab exists |
| field proof (photos, inspections) | QUICK LOG + per-feature event logs | 🔴 no photo upload visible on any Act surface |

Sub-modules surfaced and rich: MAINTAIN (event log, schedule, irrigation manager, waste routing); LIVESTOCK (9 tabs incl. welfare-access audit, predator hotspots); HARVEST (3 tabs); REVIEW (ongoing SWOT, hazard plans); NETWORK (CRM, community events, appropriate tech); SCHEDULE (weather forecast — gated on parcel boundary — and event calendar).

**The "field proof" channel is the most visible gap in Step 5.** The journey explicitly says "Field crews and contractors can work directly inside this plan, uploading 'field proof' like photos and completion inspections." There is no photo upload UI on any tab probed.

---

## Step 6 — Monitor Regeneration & Adapt — 🟡 partial (data side broken)

**Surface:** Plan → Regeneration Monitor · Habitat Allocation · Biodiversity Outcome Monitor

Each mounts and references the **MDPI Apricot Lane study (Year 0 / 5 / 9)** as the longitudinal model — strong framing.

- **Regeneration monitor:** "Goal-scored metrics on track · 3 scored · 0 on track · 0 lagging" + "Samples logged: 0". Loading samples → **"Couldn't load samples: Invalid or expired token."** Backend fetch fails for a logged-in user. The same error fires on Biodiversity Outcome Monitor.
- **Habitat Allocation:** Apricot Lane's "set aside ~10% as habitat/corridors" rule is encoded; the dashboard sums conservation/buffer/water-retention zones against the parcel; tracks habitat features. Works without backend (localStorage-driven).
- **Biodiversity Outcome Monitor:** native-cover, invasive-pressure, species trajectories — backend call fails the same way.

**Steward readiness gate (covenant-grounded, recently shipped per 2026-05-16 ADRs):** the regeneration plan store + livestock readiness gate weren't exercised in this run because no zone/paddock was placed (no boundary → no zones). The gate logic is heavily tested per the wiki, but a new-user simulation that doesn't place anything cannot reach it.

**Adaptive recommendation surface (D5):** memory references a "D5 adaptive recommendations" slice landing 2026-05-19. The Operating Dashboard tab exists inside BUILD; I did not drill into it in this run, but the journey's promise of "the system highlights what adjustments you need to make" is the D5 slice and should be re-examined separately to verify it actually issues recommendations against a real project's data.

---

## Mapping the journey to the actual 3-item IA

The journey is 6 sequential steps; the live IA is **Observe / Plan / Act**.

| Journey step | Lives in | Module(s) |
|---|---|---|
| 1 — Create + Observe | `/new`, `Observe` | wizard, annotation palette |
| 2 — Site Scorecard | `Observe` right rail | Land Assessment panel |
| 3 — Design | `Plan` | full tool palette + canvas |
| 4 — Phase the build | `Plan` | Goal Compass module + Phasing & Budgeting module |
| 5 — Day-to-day | `Act` | BUILD, MAINTAIN, LIVESTOCK, HARVEST, REVIEW, NETWORK, SCHEDULE |
| 6 — Regenerate & adapt | `Plan` | Regeneration Monitor, Habitat Allocation, Biodiversity Outcome Monitor |

The journey copy never names "Observe / Plan / Act." A first-time user reading the brief and arriving at the app has to infer the mapping. A landing-pane crosswalk would close this gap.

---

## Prioritized gap list (next-session candidates)

| # | Severity | Gap | Anchor |
|---|---|---|---|
| 1 | High | Backend fetch fails with "Invalid or expired token" on Regeneration & Biodiversity sample-load right after registration — auth token attachment regression | `apps/web/src/lib/apiClient.ts` request flow + the regeneration monitor data hooks |
| 2 | High | `ContextBuilder.ts:69` throws on hydrated localStorage where a project field is undefined — AI enrichment crashes on every app boot for any non-empty store | `apps/web/src/features/ai/ContextBuilder.ts:69` |
| 3 | High | Cold-start auto-fetch promise broken: no SoilGrids / SSURGO / GAEZ / hydrology adapter calls fire on project create. Pipeline is gated on boundary draw; journey copy implies otherwise | [`wiki/entities/data-pipeline.md`](../entities/data-pipeline.md) + project-create handler |
| 4 | Med | Scorecard cardography (13 dimensions) drifted from journey copy (8 dimensions); "confidence rating" rendered as a text label not a graded scale; non-zero scores appear for "Insufficient Data" rows | `apps/web/src/v3/observe/...` + [2026-04-30-v3-score-adapter-8-to-6-mapping.md](2026-04-30-v3-score-adapter-8-to-6-mapping.md) |
| 5 | Med | "Not saved to an account" banner shows for an authenticated user — store-backend sync is the underlying gap | wiki: [`web-app.md`](../entities/web-app.md) — Sprint 3+ backend-sync item |
| 6 | Med | Header reverts to "Sign In" on `/new` after successful registration on `/home` — auth selector not shared across routes | top-bar component shared between marketing-style and authed-app shells |
| 7 | Med | No "planting catalogue" or "nursery ledger" landing surface in Plan — store exists, no UI entry point | `ogden-nursery` store wired without a slide-up module |
| 8 | Med | No field-proof photo upload UI on any Act tab — Step 5 explicit promise unfulfilled | Act QUICK LOG + per-tab "Log …" forms |
| 9 | Low | Redis-off + 3 unapplied migrations + SoilGrids-disabled is the default cold-start state — fix-forward via `pnpm install` post-script or `LOCAL_SETUP.md` automation | [`LOCAL_SETUP.md`](../../LOCAL_SETUP.md) |
| 10 | Low | Journey copy doesn't crosswalk to Observe/Plan/Act IA — onboarding gap | `apps/web/src/v3/landing/...` or first-load tour |

---

## What was *not* exercised (steward owed)

- Map-canvas drawing (boundary, polygon zones, point placement, hex-fill stamping, temporal slider) — WebGL synthetic-event hang.
- Goal Compass steps 2–5 (Site profile → Criteria forecast) and how they feed the Phasing matrix.
- BUILD → Operating Dashboard / Adaptive Recommendations (the D5 slice that should answer the journey's "system highlights adjustments" promise).
- End-to-end regeneration readiness gate (needs paddock + zone on the map).
- Address-search → parcel-snap path (didn't reach geocode; address step is optional and we skipped).

---

## Recommended next session

Fix the auth-token regression first (gap #1) — every monitoring surface depends on it. Then close the cold-start auto-fetch promise (#3) or rewrite the journey copy to match the boundary-gated reality. The 13→8 scorecard reconciliation (#4) is a copy decision more than an engineering one.

---

## Update — 2026-05-20 (late)

Gaps #1 and #3 closed in the same session.

**Gap #1 — auth-token regression (FIXED).** Three frontend edits land the
race condition:

1. [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) — boot now blocks
   on `useAuthStore.getState().initFromStorage()` (1500ms timeout race)
   *before* `ReactDOM.createRoot(...).render(...)` and *before*
   `import('./store/siteDataSync.js')`. Side-effect imports can no longer
   fire authed fetches with `Authorization` undefined.
2. [`apps/web/src/store/authStore.ts`](../../apps/web/src/store/authStore.ts)
   — `initFromStorage()` catch-block narrowed. Transient `me()` failures
   (network blip / 500) no longer nullify the token; only real auth
   rejections (`ApiError` with `status === 401`, `code === 'INVALID_TOKEN'`,
   or `code === 'UNAUTHORIZED'`) clear it.
3. [`apps/web/src/features/project/wizard/StepNotes.tsx`](../../apps/web/src/features/project/wizard/StepNotes.tsx)
   — authenticated branch now `await`s `api.projects.create()` +
   `setBoundary()` and writes `serverId` to the local project *before*
   `navigate(...)`. Observe-stage components mount against a project that
   exists server-side, so per-project fetches no longer fail with a
   masquerading 404→401. The unauthenticated branch keeps its
   immediate-navigate behaviour. Double-submit guarded by `creating` flag.

Verified end-to-end on a fresh register → wizard → Observe walk and on a
mid-session reload of `/v3/project/{uuid}/observe`. Zero
`Invalid or expired token` errors in `preview_console_logs` on either path.
Remaining warnings (`AI features not configured`,
`role: viewer` from old queued ops) are unrelated.

**Gap #3 — cold-start auto-fetch promise (RECONCILED, copy path).**
Engineering an address→parcel-snap pipeline is out of scope (geocoding
contract + parcel service, multi-sprint). Instead the wizard now reads
honestly:

- [`StepLocation.tsx`](../../apps/web/src/features/project/wizard/StepLocation.tsx)
  carries an inline earth-tinted banner: *"Public GIS layers (elevation,
  soils, hydrology, climate, land-cover, zoning) are fetched after you
  draw the property boundary in the next step — not from the address
  alone."*
- [`StepBoundary.tsx`](../../apps/web/src/features/project/wizard/StepBoundary.tsx)
  shows a sage-tinted confirmation once a boundary lands: *"Boundary
  captured. Public GIS layers will be fetched in the background as soon
  as the project is created."*

Marketing/hero copy that promises auto-fetch on address (if any lives in
Gamma deck or `website/`) is flagged for steward review — outside this
session's commit scope.

**Adapter-stub correction (carried into [atlas-platform.md](../entities/atlas-platform.md)).**
The "ALL 14 backend adapters are stubbed (ManualFlagAdapter)" claim is
stale. Actual state: **17 live adapters** under
`apps/api/src/services/pipeline/adapters/` (SSURGO, USGS Elevation, NRCan
HRDEM, OMAFRA, NHD, OHN, NWI/FEMA, Conservation Authority, NOAA, ECCC,
NLCD, AAFC, US County GIS, Ontario Municipal, NWIS, PGMN, NASA POWER).
`ManualFlagAdapter` is a defensive fallback only, used when
`ADAPTER_REGISTRY[layerType]?.[country]` is undefined. Adapter dispatch is
boundary-gated, not create-gated.

Gaps #2 and #4–#10 remain open as documented above. No commit; awaiting
steward review.

---

## Update — 2026-05-20 (later)

Gap #2 closed.

**Gap #2 — `ContextBuilder.ts:69` hydration crash (FIXED).** The cited
"line 69" was off by ~15 lines; actual throwing sites were
[`ContextBuilder.ts:84`](../../apps/web/src/features/ai/ContextBuilder.ts)
(`p.species.map(...)`) and `:95` (`c.species.join(', ')`). Both fields can be
`undefined` on a paddock or crop area persisted under an older schema —
`livestockStore` is `version: 1` with a no-op `migrate`, so v0 entries
hydrate unchanged; `cropStore`'s v1→v2 migrator handles undefined inline
but doesn't touch v0 rows. Fix: guard both reads with `(x.species ?? [])`,
matching the `?? []` precedent in
[`cropStore.ts:110`](../../apps/web/src/store/cropStore.ts).

**Verification.** Seeded a degraded paddock and a degraded crop area
(both `projectId`-bound to the current project, `species` omitted) into
localStorage via `preview_eval`, reloaded the Observe stage, and confirmed
the three `aiEnrichment` paths (`generateSiteNarrative`,
`generateDesignRecommendation`, `enrichAssessmentFlags`) ran end-to-end
through `buildProjectContext` and reached the server-side API call —
failing only with the expected `ApiError: AI features are not configured.
Set ANTHROPIC_API_KEY` (env var absent). Pre-fix this would have thrown
synchronously before the network call. Cleared the repro rows; no
regression on normal data.

**Deferred follow-up.** Bumping `livestockStore` to `version: 2` with a
real migration that backfills `species: []` (and an audit of other stores
for similar v0→vN gaps) is defensible but broader — touches every
paddock-consuming surface (Plan-stage rotation cards, biodiversity
sampler). Tracked as future work; not part of this fix.

Gaps #4–#10 remain open as documented above. No commit; awaiting steward
review.
