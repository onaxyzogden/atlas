# OLOS UX Walkthrough — Regenerative Farm, End to End

> Simulated first-time-user session. Persona: naive user, navigating only by
> on-screen affordances. Environment: web app run standalone offline
> (`corepack pnpm --filter @ogden/web dev`), no backend (no API/Postgres),
> no login. Served at `http://localhost:5201`. Date: 2026-05-16.
> Branch: `feat/atlas-permaculture`.
>
> Legend: ✅ worked · ⚠️ confusing · ❌ broken · 🔌 backend-gated (untestable
> offline) · 🕳️ missing/expected-but-absent

## Summary

**Overall verdict:** The v3 "Land OS" is a genuinely impressive,
permaculture-literate design tool — grounded in Mollison/Holmgren/Yeomans,
with a standout click-to-anchor zone-seeding interaction and a report
surface that degrades gracefully offline. **But a naive first-time user
would almost certainly never see it.** The marketing landing has no way
into the app; the login gate contradicts the "works offline" promise with
a raw 500; and when a project *is* created, the wizard drops the user into
the **legacy** shell that contains none of this. The best product in the
codebase is hidden behind the worst onboarding in the codebase.

**Top friction points (ranked):**

1. **No discoverable path to the real product.** Landing → no "enter app";
   login gate breaks the offline promise; wizard → legacy flow, not v3.
   (Walkthrough only proceeded via direct-URL bypasses.)
2. **Boundary/location is lost between creation and v3** — one root cause
   degrades Observe, Plan, Act, and Report.
3. **Raw error leak at the very first action** (`Response not JSON (500)`
   on offline Create Account) with zero recovery guidance.
4. **Prove & Report are orphan routes** with no nav entry; the shipped
   3-item nav doesn't match the 7-stage lifecycle the product describes.
5. **Inconsistent polish:** raw enum labels, blank-on-first-paint maps,
   two competing app brand identities for one project.

**What's genuinely excellent:** v3 ring seeding, grounded permaculture
copy + checkable HOW guidance, offline form persistence, the closed-loop
Maintain module, and graceful offline degradation in Report.

## Environment & Setup Notes

- Root `pnpm dev` is the documented command but chains `pnpm migrate`
  (Postgres) and would fail offline. Had to know to run
  `pnpm --filter @ogden/web dev` instead. ⚠️ A first-time user following the
  README offline would be blocked at step one.
- `pnpm` was not on PATH; only `corepack pnpm` worked. ⚠️ Setup friction
  (environment-specific, not an app defect).
- Port 5200 (the documented port) was already in use; Vite silently fell
  back to 5201. ⚠️ README/console mismatch a new user could trip on.

---

## Stage 1 — Entry & Project Creation

**What the naive user tried:** Opened `http://localhost:5201`. Goal: start
planning a regenerative farm.

**Observations:**

- ❌ **No path into the app from the landing page.** The marketing landing
  (`/`) offers only three actions: "Request access →" (hero + nav + footer,
  3 copies), "Watch 90-sec demo", and "Sign in". There is no "Open app",
  "Try it", "Get started", or "Create a project" affordance anywhere on the
  page (verified by scrolling the entire page incl. footer). A first-time
  user has no obvious way to reach the actual product.
- ⚠️ **"Request access" is misleading.** It reads like a sales/waitlist
  gate ("Request access", "No credit card", "Paste a pin or upload a
  shapefile. See a full Atlas report in under two minutes."). It actually
  just routes to `/login`. The label sets the wrong expectation — a user
  expecting a waitlist form lands on a sign-in/register screen.
- ⚠️ **Hero map preview is blank on first paint**, then loads satellite
  imagery a second later. First impression is a dark empty box where the
  product demo should be. (MapTiler key works — it's a lazy-load/perceived-
  performance issue, not a broken key.)
- ❌ **Offline promise contradicted by the gate.** The login screen says
  *"The app also works fully offline — your projects are always saved
  locally."* But the screen offers only **Sign In** / **Create Account**,
  both of which require the backend. There is **no "Continue offline",
  "Skip", or "Use without an account" button.** A user who read the offline
  promise has no way to act on it.
- ❌ **Raw error leak on offline Create Account.** Filling Create Account
  with `testuser@example.com` / `TestPass123!` and submitting (no backend
  running) surfaces a red box reading literally **`Response not JSON
  (500)`**. This is an internal/developer message, not a user-facing one.
  It does not explain what went wrong or what to do. For a naive user this
  is a hard dead-end with no recovery guidance.
- 🕳️ **Persona fully blocked here.** The app
  *is* reachable by direct URL (`/home`, `/v3/project`) with no auth — but a
  naive user could not have discovered that. **Resuming the walkthrough via
  direct URL to maintain stage coverage; this bypass is itself the top
  Stage-1 finding.**

_Code reason (post-hoc):_ `/` is the public `LandingPage`; it only redirects
to `/home` if a token already exists ([apps/web/src/routes/index.tsx:255](apps/web/src/routes/index.tsx)).
There is no unauthenticated "enter app" link wired into the landing or login
pages, even though no route is actually auth-guarded. The "works fully
offline" copy in `LoginPage` is true of the app but unreachable *from* the
login screen.

### Stage 1 (cont.) — The New Project wizard

Reached via the unlabeled `/new` icon link on `/home`. 4-step wizard:
Name & Type → Location → Boundary → Notes.

- ✅ **Step 1 (Name & Type) works well.** "Regenerative Farm" is one of 7
  project types (regenerative_farm, retreat_center, homestead,
  educational_farm, conservation, multi_enterprise, moontrance/OGDEN
  Template) — matches the 6-archetype catalog. Country/Units selectable,
  good helper copy ("You can always change these later").
- ✅ **Step 2 (Location) is well-designed.** Clear guidance ("An address or
  parcel ID helps auto-fetch terrain, soils, and climate data"), a helpful
  Tip box, and a nice convenience: pasting `43.4516, -79.9540` into the
  combined field auto-split into separate Lat/Lng fields.
- ⚠️ **Step 3 (Boundary): map is invisible until "Draw on Map" is clicked.**
  The step initially shows a large black void with no map, no placeholder,
  and no prompt telling you to press "Draw on Map". A naive user reads this
  as a broken/empty step. After clicking, the satellite map renders
  correctly at the entered coordinates.
- ⚠️ **No drawing affordances or feedback.** Clicking 4 points drew a
  polygon, but there is no drawing toolbar, no instruction text, no
  vertex-count/area/acreage readout, and no explicit "finish/complete"
  action. For a land tool, the absence of a live area figure while drawing
  a property boundary is a notable gap.
- ⚠️ **Wizard state loss on a stray keypress (not reproduced on happy
  path).** On the first attempt, after drawing the boundary, a stale element
  ref + a stray **`End` keypress** caused the entire wizard to reset to an
  empty Step 1 — all 3 steps of data AND the drawn boundary gone, no
  warning, no autosave, no recovery. A clean second run (Continue clicked
  normally) advanced Boundary → Notes correctly with all steps checked, so
  this is **not** a happy-path defect. But it remains a real robustness gap:
  a single unexpected key/focus event destroying all unsaved wizard state
  with zero recovery is fragile for a multi-step form that includes manual
  map drawing. **Recommendation: autosave wizard draft to localStorage.**

### Stage 1 (cont.) — Project created, but into the *legacy* flow

Clicking "Create Project" on Step 4 succeeded. The project persisted
(localStorage, id `ff606b5f-…`) and the app navigated to
`/project/{id}` — the **legacy** `LifecycleProjectPage`, **not** the v3
`/v3/project/{id}` lifecycle where all the regenerative-farm / permaculture
work actually lives.

- ❌ **The new-project wizard routes a regen-farm user into a dead flow.**
  A naive user who picked "Regenerative Farm" lands on a 4-tab legacy
  dashboard (OVERVIEW / DESIGN MAP / INTELLIGENCE / REPORT) with **no
  Observe / Plan / Prove / Build / Operate lifecycle, no zones, no
  archetype, no interventions** — none of the permaculture tooling the
  project type implies. There is no visible link, button, or breadcrumb
  from the legacy page to the v3 lifecycle. A naive user would reasonably
  conclude these features don't exist.
- ✅ **Legacy DESIGN MAP works offline.** Satellite imagery renders, a
  left tool rail and a "MAP LAYERS" right rail appear, a "Draw Boundary"
  button and a "0 zones · 0 structures" readout are present. (The map did
  *not* recenter on the entered coordinates — it showed the default
  Ontario extent — a minor disorientation.)
- 🔌 **Legacy INTELLIGENCE is fully backend-gated.** "Loading project
  layers…" never resolves; every category (Elevation, Hydrology, Wetlands,
  Soils, Land Cover, Climate, Zoning) reads "Not fetched for this project
  yet." with a 0/N completeness bar. Expected offline — no data pipeline.
- 🕳️ **Legacy REPORT is a stub.** Renders only "reporting — This
  dashboard section is under development. COMING SOON." A capital-partner
  summary is unreachable from the flow the wizard drops you into.
- 🕳️ **Resuming in v3 via direct URL.** Per the naive-user protocol the
  dead-end is recorded; to maintain lifecycle-stage coverage the
  walkthrough continues at `/v3/project/{id}/observe`, a URL a naive user
  could not have discovered. **This dual-flow split is the single biggest
  Stage-1 finding.**

_Code reason (post-hoc):_ the `/new` wizard (`NewProjectPage`) creates the
project and routes to the legacy `projectRoute` (`/project/$projectId` →
`LifecycleProjectPage`), while the permaculture surface is the parallel
`v3ProjectLayoutRoute` tree ([apps/web/src/routes/index.tsx:99](apps/web/src/routes/index.tsx)
vs. [apps/web/src/routes/index.tsx:124](apps/web/src/routes/index.tsx)).
Both consume the same `useProjectStore` project, so the v3 lifecycle *does*
load this project — there is simply no in-app navigation bridging the user
from creation into it.

## Stage 2 — Observe

**What the naive user tried:** Reached `/v3/project/{id}/observe` (via the
direct-URL bypass from Stage 1). Goal: understand the site before designing.

**Observations:**

- ✅ **The v3 Observe surface is the real product.** A polished workspace:
  topographic basemap, an overlay toggle panel (Solar/Wind sectors,
  Hazards, Views, Zones, Water, Topography, Built environment, Observe
  annotations), a left palette of placeable landscape elements grouped by
  theme (Human Context, Macroclimate & Hazards, Topography, Earth/Water/
  Ecology), a right-rail "Observe essentials" checklist, and a bottom
  module bar (Human Context, Built Environment, Macroclimate & Hazards,
  Topography, Earth/Water/Ecology, Sectors & Zones, SWOT Synthesis).
  Holmgren/PDC permaculture framing is woven into the guidance copy.
- ❌ **Project location & boundary did NOT carry over from creation.** The
  map opens at a default demo location ("Clear Lake"), not the
  `43.4516, -79.9540` coordinates or the boundary drawn in the wizard. The
  "Observe essentials" checklist shows *Property boundary drawn* and *At
  least one landscape type placed* both unchecked. Combined with the
  legacy/v3 split, the work done in the legacy wizard is effectively
  stranded — the v3 lifecycle starts the user from zero.
- ✅ **Module dashboards are well-structured.** Human Context (Module 1)
  opens to Dashboard / Steward Survey / Indigenous & Regional / Vision
  tabs, a progress ring ("0 of 18 areas captured"), and an "Export
  human-context report" action. SWOT Synthesis (Module 7) mirrors the
  pattern (Strengths/Weaknesses/Opportunities/Threats, synthesis-depth
  ring). Consistent, legible, naive-user-friendly.
- ✅ **Offline form entry persists.** Typed a steward Name ("Yousef
  Abdelsalam") and Occupation ("Land steward") in the Steward Survey,
  switched tabs away and back — values were retained. Local Zustand
  persistence works with no backend, as designed. "All fields optional —
  fill in what you have" is good low-pressure copy.
- ⚠️ **Two project-shell identities.** The legacy flow brands as "OGDEN
  Land Design Atlas"; v3 brands as "OGDEN Land OS". Same project, two
  visual identities and two navigation models — disorienting if a user
  ever sees both.

## Stage 3 — Plan

**What the naive user tried:** Reached `/v3/project/{id}/plan` via the
"PLAN →" link in the Observe header. Goal: design the regenerative farm —
zones, water, interventions.

**Observations:**

- ✅ **Project type DID carry into Plan.** The right rail shows
  `PROJECT TYPE = Regenerative Farm` with a regen-specific CHECKLIST
  (cash-crop rotation vs. Yeomans rank, livestock-to-pasture ratio,
  keyline access tracks, swale staging, orchard guilds on contour…), each
  item tagged by system (→ Water / → Zones / → Livestock / → Soil…). This
  is strong, grounded, archetype-aware guidance — the best onboarding in
  the app so far. (Contrast Stage 2: *type* persisted, *location/boundary*
  did not.)
- ✅ **Click-to-anchor ring seeding works flawlessly offline.** Selected
  "Seed zones from rings" (clear helper: "Click where the home centre sits
  — full Z0–Z3 rings grow from there"), clicked the map, and got a
  confirmation toast — *"Seeded 4 draft zone(s) from the Mollison rings.
  Adjust, trim to the parcel, or clear them anytime."* — plus concentric
  Z0–Z3 rings rendered with live acreage labels (Home centre 0.2 ac …
  Z3 186 ac). This is the single most polished interaction in the
  walkthrough.
- ✅ **Seeded zones flow through to the Zone & Circulation module.**
  Coverage table auto-populated (Z0–Z3 = 1 each), and "Assign zone level"
  listed each ring with a function tag and hectare area + a per-zone
  level dropdown. The Overview & validation tab showed a green pass —
  *"All zones & paths tagged · every daily / weekly path enters a Z1 or
  Z2 zone ✓"* — a real, computed validation, not a stub.
- ✅ **Grounded permaculture copy throughout.** Module intros cite
  Mollison's *Designers' Manual*, Holmgren principles, and a dated
  "Permaculture Scholar (2026-05-07)" review. Right-rail HOW steps are
  checkable and persist (checking strikes the item through). This is the
  kind of domain depth a regen-farm user would trust.
- ⚠️ **Raw enum labels leak to the user.** Seeded-zone function tags
  render as `habitation` / `food_production` (snake_case) rather than
  "Habitation" / "Food production". Minor polish gap in an otherwise
  refined surface.
- ⚠️ **Zones seed onto the default location, not the parcel.** Because
  the boundary never transferred (Stage 2), the beautiful ring system is
  anchored over "Clear Lake", not the farm at `43.4516, -79.9540`. The
  "trim to the parcel" affordance exists but there is no parcel to trim
  to — the upstream boundary loss undermines an otherwise excellent tool.

## Stage 4 — Prove

**What the naive user tried:** There is **no "Prove" in the sidebar.** The
v3 nav collapses the lifecycle to three items — OBSERVE / PLAN / ACT.
"Prove" is only reachable by typing `/v3/project/{id}/prove`.

**Observations:**

- 🕳️ **The 7-stage mental model doesn't match the 3-item nav.** The
  README, the legacy flow, and this walkthrough's plan all describe a
  7-stage lifecycle (Observe → Plan → Prove → Build → Operate → Report).
  The actual v3 sidebar is **OBSERVE (Read the land) / PLAN (Design the
  land) / ACT (Build & operate)** plus a REFERENCE group (Ethics &
  Principles, Affinity telemetry, Plant Database "Coming soon", Climate
  Tools "Coming soon"). Prove and Report exist as routes but have **no
  navigation entry** — a naive user cannot discover them at all.
- ❌ **Prove is a bare dead-end.** `/prove` renders a single sentence,
  *"Feasibility brief is not yet available for this project."* — no
  header, no nav, no explanation of what a feasibility brief is, no CTA
  to generate one, no indication it's backend-gated. For a naive user
  this is indistinguishable from a broken page.
- 🔌 Likely backend/AI-gated (a "brief" implies server-side synthesis),
  but nothing on screen says so — the offline-mode contract from the
  login screen is silently broken again here.

## Stage 5 — Build

**What the naive user tried:** Expanded the ACT sidebar group → landed on
`/v3/project/{id}/act` ("Act — Build and operate"), then opened the BUILD
module from the bottom bar.

**Observations:**

- ✅ **Build & Construction works fully offline.** ACT · Module 1 with
  tabs Build Gantt / Budget vs actuals / Pilot plots. The "5-Year Build
  Gantt" renders a real read-only timeline: Phase 1 (Yr 0–1), Phase 2
  (Yr 1–3), Phase 3 (Yr 3–5), Phase 4 (Yr 5+) across quarterly columns,
  with the hint "Click a task marker to jump into the seasonal-task editor
  in PLAN" — a thoughtful cross-stage link.
- ✅ **The ACT surface is coherent.** Left "QUICK LOG" rail (Log harvest /
  water check / livestock move, Create Field Task, Log Observation), a
  map with the seeded zone rings, and a right rail (Weather, Today's
  Priorities, Alerts, Upcoming Events) dated correctly to "Sat, May 16".
- ⚠️ **Boundary loss bites again.** The Weather card reads "Set a parcel
  boundary to enable the local forecast." — the same missing-boundary
  root cause from Stage 2 degrades a third stage.

## Stage 6 — Operate

**What the naive user tried:** From ACT, opened the MAINTAIN module.

**Observations:**

- ✅ **Maintenance & Operations is well-modelled and offline-capable.**
  ACT · MAINTAIN with tabs Event log / Maintenance schedule / Irrigation
  manager / Waste routing. The "Log event" form (Feature kind, Feature,
  Date prefilled to 2026-05-16, Action, Minutes, Who, Notes) is clean and
  the intro explains the closed loop well — *schedule says "swales clear
  quarterly", log records "cleared … 25 min."*
- ⚠️ **Operate is gated on Plan having real drawn features.** The Feature
  dropdown shows "No earthworks drawn — add a swale or drain in Plan stage
  to log maintenance." Because the seeded zones aren't real placed
  earthworks (and there's no parcel), the operate loop has nothing to act
  on — the empty state is honest and instructive, though.
- ✅ Empty-state copy here is a model for the rest of the app: it tells
  you exactly what to do and where ("log your first above, click an
  irrigation feature… or click a placed structure and choose 'Log
  maintenance'").

## Stage 7 — Report

**What the naive user tried:** Like Prove, **Report has no sidebar entry**
— reached only via `/v3/project/{id}/report`. Goal: produce a
capital-partner summary and export it.

**Observations:**

- ✅ **Report is the strongest end-of-lifecycle surface.** Clean header,
  five clear actions (Generate Summary, Download Markdown, Download PDF,
  Print, Publish view-only link) and a helpful pre-state — *"Ready to
  generate. Click Generate Summary to compile the verdict, six scores,
  blocking issues, and next actions…"*
- ✅ **Generate Summary works fully offline.** Compiled a "PROJECT
  SUMMARY" for **Wadi Barakah Regenerative Farm** (the project *name*
  carried into v3 here — only location/boundary/area were lost upstream)
  with Verdict, six Scores (Land Fit, Water, Regulation, Access,
  Financial, Design), Blocking Issues, Next Actions.
- ✅ **Graceful degradation, not raw errors.** With no site data the
  verdict reads *"Awaiting site data… Run the Tier-1 layer fetch to
  populate this verdict."* and every score shows "Insufficient Data" /
  0 — honest, legible, and a stark contrast to the Stage-1
  `Response not JSON (500)` leak. This is the model the rest of the app
  should follow.
- ✅ **Markdown & PDF export work offline (client-side).** Both fired
  with no error and no console exception — the v3 report export is
  client-side, *not* the server-rendered PDF the plan anticipated would
  fail offline. (Positive surprise: contradicts the pre-walkthrough
  assumption.)
- ✅ **Publish view-only link fails gracefully.** The only genuinely
  backend-gated action: clicking it turned the button into *"Publish
  failed — check connection / project sync"* — self-explanatory, no
  crash, no raw stack. Exactly how an offline failure should present.
- ⚠️ Showing a 0/Insufficient-Data report to a *capital partner* would
  be embarrassing; the report is technically excellent but only as good
  as the (here empty) site data behind it — which traces back to the
  boundary/data-pipeline gaps, not the report surface itself.

---

## Cross-Cutting Issues

- **Two parallel apps, one project.** Legacy (`/project/{id}`, "OGDEN
  Land Design Atlas", 4 tabs) vs. v3 (`/v3/project/{id}`, "OGDEN Land
  OS", Observe/Plan/Act lifecycle). The new-project wizard drops the
  regen-farm user into the *legacy* shell, which has none of the
  permaculture tooling and no link to v3. **This is the single highest-
  impact issue: the product's best work is undiscoverable from its own
  front door.**
- **Boundary/location never propagates.** Entered coordinates + a drawn
  wizard boundary did not reach v3. Consequence cascades: Observe opens
  at a demo location, Plan zones seed off-parcel, Act weather is
  disabled, Report shows 0 ha / Insufficient Data. One root cause
  degrades five stages.
- **Nav model ≠ documented lifecycle.** README/marketing/legacy imply a
  7-stage lifecycle; v3 nav is 3 items (Observe/Plan/Act). Prove and
  Report are real, polished routes with **no navigation entry** — pure
  orphans for a naive user.
- **Offline contract is honored unevenly.** Most surfaces work offline
  beautifully (forms persist, zones seed, report generates). But the
  offline *promise* is broken at the front door (login gate, no
  "continue offline") and silently at Prove (bare dead-end, no "needs
  backend" hint).
- **Empty-state quality is bimodal.** Best-in-class on Maintain (tells
  you exactly what to do next) and Report (graceful degradation);
  worst-in-class on Prove (one orphan sentence) and Stage-1 Create
  Account (raw `Response not JSON (500)`).
- **Polish leaks.** Raw enum strings (`food_production`, `habitation`)
  surface to users in Plan; blank-on-first-paint maps in several places
  (timing, not broken keys).

## Prioritized Recommendations

1. **Bridge creation → v3.** Route the new-project wizard to
   `/v3/project/{id}/observe` (or add a prominent "Open in Land OS" CTA
   on the legacy page). _Code reason:_ `NewProjectPage` routes to the
   legacy `projectRoute`; the v3 tree
   ([apps/web/src/routes/index.tsx:124](apps/web/src/routes/index.tsx))
   consumes the same store and is one redirect away.
2. **Propagate boundary/location into the v3 project record** so Observe
   centers on the parcel and Plan/Act/Report inherit it. Highest
   leverage — fixes five downstream degradations at once.
3. **Add an unauthenticated "Continue offline / Open app" path** on the
   landing and login pages. No route is auth-guarded
   ([apps/web/src/routes/index.tsx:255](apps/web/src/routes/index.tsx));
   the offline promise is real but unreachable from the front door.
4. **Replace raw error leaks with graceful states.** The Stage-1
   `Response not JSON (500)` and the Prove dead-end should adopt the
   Report/Maintain pattern (explain, give a next action, note if
   backend-gated).
5. **Surface Prove & Report in the sidebar** (or fold them into ACT)
   so the lifecycle the product describes matches the nav it ships.
6. **Autosave the new-project wizard draft to localStorage** —
   robustness against the Stage-1 state-loss scenario.
7. **Polish pass:** humanize enum labels in Plan; add map placeholders/
   skeletons to kill blank-on-first-paint; reconcile the two app brand
   identities.
