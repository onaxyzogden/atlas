# OLOS / Atlas — Regen-Farm UX Walkthrough (Run 2)

**Date:** 2026-05-16
**Build:** branch `feat/atlas-permaculture`, web app served at `http://localhost:5202/`
**Environment:** **Frontend-only, fully offline.** No Docker → no Postgres/Redis/Fastify API.
Persistence is browser `localStorage` only. External APIs (Open-Meteo weather) unreachable.
**Driver:** Real Chrome via the Claude-in-Chrome MCP, viewport 1568×765.
**Persona:** Naive first-time user attempting to design *and* complete a full regenerative
farm — Mollison zones; food-forest guilds + orchards with poultry for pest control; water
catchment/storage/swales/sinks; soil-fertility / closed-loop infrastructure;
built-environment structures — navigating by on-screen affordances wherever possible.
**Project built:** "Wadi Barakah Regenerative Farm" (`7a5b9a13-e6b1-43d7-97f1-0891d5a61abf`),
ON, CA.

> This is an independent fresh run. The baseline doc
> `docs/ux-walkthrough-regen-farm.md` was **not** consulted for findings and is left
> byte-for-byte unmodified for comparison. Findings here were discovered honestly by
> driving the live app.

---

## Severity Legend

| Tag | Meaning |
|---|---|
| **CRITICAL** | Blocks a core advertised workflow end-to-end; no workaround by affordance |
| **MAJOR** | Feature visibly broken / a designed object is stranded; degrades trust |
| **MINOR** | Friction, confusing copy, cosmetic, or small UX nit |
| **GOOD** | Works well; called out so it is preserved in future refactors |
| **GATED** | Untestable this run because it needs the backend/external API (offline) |
| **CAVEAT** | A limitation of the automated harness, *not* a confirmed product defect |

---

## Headline

OLOS is, module-for-module, an **unusually deep and pedagogically grounded** land-design
tool. Most surfaces render rich, well-written, permaculture-literate content fully offline.
The dominant failure mode is **not** crashes or empty screens — it is **silent Plan→Act
linkage gaps**: a feature class is drawn and correctly persisted to its store, but a
downstream consuming surface never reads it, so the user is told "nothing here yet" with
no error. Integration quality is **feature-class-selective**:

- **Livestock** is production-grade end-to-end (design → store → every Act surface). ★
- **Built Environment** persists but its own Plan module renders blank (it *does* surface
  in one Act picker).
- **Water** and **Plant systems** persist but are stranded — multiple Act surfaces cannot
  see them.
- **Closed-loop / waste vectors** are not constructible end-to-end at all.

A naive user finishing this run would leave with a confident "Supported · 67/100" report
for a farm the system simultaneously believes is **0 hectares** and whose Structures,
closed-loop, harvest and irrigation tracking are non-functional — and would not be told
any of that.

---

## Stage-by-Stage Observations

### 1. Landing & project creation

A naive user reaches the app and creates a project through the New Project wizard
(Name & Type → Location → Boundary → Notes). The wizard is coherent and the
"Regenerative Farm" project type is discoverable. A boundary polygon was drawn on the
map and the project was created, routing the user into the v3 "Land OS" lifecycle
(Observe → Plan → Act → Report).

- **GOOD** — Wizard flow is linear and legible; project type selection is obvious.
- **MAJOR (#77 root)** — The drawn boundary's **acreage computes/persists as 0 ha**
  and this zero propagates all the way to the final Report ("ON, CA · 0 ha"). Every
  downstream area-aware calculation inherits a zero parcel.

### 2. Observe

Site-intelligence surface, modules and checklist explored. Boundary/location carry over
from creation. The Observe surface presents land-assessment framing the user can act on
in Plan. (Completed earlier in this run; no new blocker beyond the carried 0-ha area.)

### 3. Plan · Zones — **GOOD**

Both zone-creation paths work: click-to-anchor concentric **ring seeding** (Z0–Z5 off the
shared Mollison ladder) and the freehand **ZonePolygon** tool, with the **live zone-size
guide** giving under/ok/over feedback against the Mollison radius targets and an inline
metadata form. Six seeded zones (Home centre + Z1–Z5) persist and render on the canvas
and in the ZONES module. This is the most polished design surface in the app.

### 4. Plan · Plant systems — placement GOOD, downstream stranded

Food-forest guild and orchard placement works. The **"Apple-Comfrey Food-Forest Guild"**
(apple anchor + currant/comfrey members) persists to `ogden-polyculture.state.guilds`;
the orchard persists to `ogden-atlas-design-elements.state.byProject[…]` as
`kind:"orchard"`. Apple Tree A and Shrub A render on the canvas.
*(Downstream consequences: see #72 — Act cannot see any of this.)*

### 5. Plan · Livestock — **GOOD (paddock/fence)**, one blocker

The **"Orchard Poultry Run (pest control)"** paddock (species `poultry`, stocking density
150, electric fencing, ~7,827 m²) was placed for orchard pest management and persists
cleanly to `ogden-livestock`. The paddock and fence line flow into the LIVESTOCK module.

- **MAJOR (carried)** — The scheduled-move / rotation-move authoring path was **blocked**
  in Plan under the harness (React-controlled control could not be driven). Rotation
  *projection* still works downstream (see Act).

### 6. Plan · Water — flow-through OK, balance math broken

Catchment, Storage, contour Swale, and an Infiltration Bed ("downslope sink") were placed
and persist to `ogden-water-systems` (~1.9 KB). They render on the canvas and the WATER
module picks them up.

- **MAJOR (carried)** — The water-balance math is broken by an area-input bug (the same
  0-ha / area-handling defect family as #77). The module lists features but the
  balance figures are not trustworthy.

### 7. Plan · Soil Fertility & Closed-Loop

- **#57 GOOD** — *Fertility colocation* works: haversine Zone-1(≤25 m)/Zone-2(25–75 m)
  bucketing computes correctly (Guilds 1, Fertility units 1, In Zone-1 0/1, Overall 0%
  close). Holmgren P6 ("produce no waste") grounding present.
- **#58 CRITICAL** — The canvas **"Flow connector"** tool and the structured
  **"Waste-to-resource vectors"** tab are **two disconnected systems**. A flow connector
  drawn on the canvas gives **zero** closed-loop credit: the Closed-loop graph still
  renders the composter with an orange "orphan" ring. Silent failure of the central
  closed-loop intent.
- **#59 CRITICAL** — The Waste-vector **From/To dropdowns only expose Zones
  (Home centre + Z1–Z5) + the single Fertility composter** — no livestock, plant,
  structure or water elements. The module's own advertised canonical loop
  ("kitchen → chicken coop → composter → orchard") is **structurally not constructible**.
- **#60 CAVEAT** — The "Add vector" button stayed `disabled` under automation even with
  valid DOM From/To/Resource values (Chrome MCP cannot fire this React-controlled
  `<select>`'s `onChange`). Real-user behaviour on a native OS dropdown is unverified —
  but combined with #59 the canonical loop is unreachable regardless.
- **#62 MINOR** — First structure placement raises a local-only persistence banner:
  *"Your design lives in this browser… it is not fully saved to your account."*
  (Import/Export bundle). Honest, but a naive user may not grasp the data-loss risk.

### 8. Plan · Built Environment — palette GOOD, **module blank (MAJOR)**

- **GOOD** — Rich palette (BUILDINGS / AGRICULTURAL / UTILITIES groups + custom .glb
  upload). The **"Dimensions"** placement mode (Rect/Circle, m/ft, W/D/rotation,
  click-to-drop) is a clean, reliable UX.
- **#61 MAJOR** — A Barn placed via the palette **persists correctly** to
  `ogden-built-environment-v2` (`kind:"barn"`, `state:"proposed"`, valid Polygon,
  matching projectId) — verified directly in `localStorage` — **yet the STRUCTURES /
  Built Environment module renders BOTH tabs ("Structures overview", "Subsystems
  overview") completely blank**: no grounding panel, no list, no empty-state. The data
  layer works; the module surface is broken/unimplemented. This is the sharpest
  single-module regression in the app — every other Plan module renders rich content.

### 9. Act — strong shell, selective linkage

The Act stage loads cleanly offline with a rich operational shell (QUICK LOG quick
actions, Weather, Today's Priorities, Alerts, Upcoming Events) and **8 grounded modules**:
TRACKER, BUILD, MAINTAIN, LIVESTOCK, HARVEST, REVIEW, NETWORK, SCHEDULE.

- **#63 GOOD** — All 8 Act modules render substantive, well-written, grounded content
  offline with graceful empty states.
- **#64 GOOD (Plan→Act linkage that works)** — On entering Act, an Alert auto-generated:
  *"Orchard Poultry Run (pest control) — water point unset · MEDIUM · No water note
  recorded for paddock."* The Plan-stage pest-control paddock flowed straight into a
  computed Act operational alert. *(Note: on a later revisit the Alerts panel read
  "No active alerts" — possible recompute/flake; low confidence, logged for awareness.)*
- **#69 GOOD ★ (best integration in the app)** — **LIVESTOCK** is production-grade
  end-to-end. The poultry paddock powers: Yield log paddock picker; **Rotation schedule**
  (auto rest-clock — 1 ACTIVE, 14-day target May 30, species-recovery model);
  **Predator hotspots**; Animal-corridors audit (knows "1 paddock, 0/1 served");
  plus the landing Alert. Nine rich, grounded sub-tabs.
- **#70 GOOD (intelligent advisory)** — Predator hotspots *read the actual design*:
  "MODERATE PRESSURE — High-vulnerability species present (poultry); Electric fencing
  in place — significantly deters most ground predators; Nearest shelter is 355 m away —
  outside the 300 m welfare guideline" + three concrete mitigations. The welfare
  heuristic correctly flags my own design's missing near-paddock shelter.
- **#66 MAJOR linkage gap** — **MAINTAIN → Event log** FEATURE picker recognises only
  `Structure` kind (🏚 Barn flows through ✓). `Earthwork (swale/drain)` and
  `Storage (cistern/pond)` both yield **empty** FEATURE lists despite the Swale,
  Catchment, Infiltration Bed and Storage element being placed and persisted
  (`ogden-water-systems` ≈ 1.9 KB). The module's own hero copy uses *"swales clear
  quarterly"* as its canonical example — yet a swale **cannot be selected** to log it.
- **#67 MAJOR linkage gap** — **MAINTAIN → Irrigation manager** shows *"No crop areas
  yet — draw them on the map first"* despite the guild + orchard + Apple Tree A +
  Shrub A placed in Plant systems.
- **#71 MINOR** — LIVESTOCK → Move log SPECIES defaults to "Sheep" regardless of the
  selected paddock's actual species (the only paddock is poultry); the form does not
  pre-fill species from the paddock.
- **#72 MAJOR linkage gap (confirmed via store inspection)** — Plant systems persist
  correctly (orchard → `ogden-atlas-design-elements`; Apple-Comfrey guild →
  `ogden-polyculture.state.guilds`) but Act **HARVEST → Harvest log "CROP AREA"** picker
  is empty **and** MAINTAIN → Irrigation shows no crop areas. Neither Act consumer reads
  plant elements; harvest/irrigation tracking against designed crop areas is unreachable
  end-to-end. Same defect class as #61 (store populated, consuming surface blind to it).
- **#68 / consequence** — **MAINTAIN → Waste routing** is empty
  (*"No waste vectors yet — design them in PLAN → Soil & fertility…"*). Not a new defect:
  it is the downstream consequence of #59 (waste vectors not constructible). The
  closed-loop operational tracking is therefore unreachable **end-to-end**.
- **#73 GATED (graceful)** — **SCHEDULE → Weather forecast** and the landing Weather
  card both degrade gracefully offline: *"Forecast unavailable. Open-Meteo did not
  return data for this point. Try again later."* — a clear message, not a crash. This
  is the **only genuinely backend/external-gated surface in Act**; everything else is
  fully functional offline.
- **GOOD** — TRACKER (Plan Execution Tracker, By phase/By design layer), BUILD
  (5-Year Build Gantt + Budget-vs-actuals + Pilot-plots form), REVIEW (Continuous SWOT
  log + Hazard plans), NETWORK (CRM + Community events + Appropriate tech) are all
  functional offline with grounded copy and graceful empty states.

### 10. Report

- **#75 MAJOR (nav discoverability)** — There is **no forward affordance from Act to
  Report**. The Act top bar shows only "‹ PLAN" (backward). Plan had an explicit
  "ACT ›" forward button; Act has no "REPORT ›". The Report page itself has **no
  stage-nav chrome at all**. A naive user who finishes Act has **no on-screen path** to
  the Report stage — it was reachable here only by typing the `/report` URL directly
  (recorded bypass, per plan).
- **#76 GOOD** — Report → **Generate Summary works fully offline**: Verdict
  **67/100 "Supported"** ("Regulation is the weakest dimension at 52"), six-dimension
  scorecard (Land Fit 76 *Workable*; Water 63, Regulation 52, Access 55, Financial 62,
  Design 60 — all *Moderate*), Blocking Issues (0), Next Actions (0). Re-running shows
  "GENERATED JUST NOW".
- **#77 MAJOR (data integrity)** — The report header reads **"ON, CA · 0 ha"**. The
  parcel acreage is zero (the boundary-area defect, surfacing all the way at the end).
  The feasibility model still emits confident scores for a **0-hectare** farm — it does
  not guard against or reflect a zero-area parcel.
- **#78 MAJOR (trust)** — "Blocking Issues (0)" / "Next Actions (0)" and a "Supported"
  verdict are **misleading given the design's true state**. The report scores
  land-feasibility dimensions only; it surfaces **none** of the integration failures
  (blank Structures module, unreachable closed loop, stranded water/plant Act linkages,
  0-ha area). A naive user is told the design is fine when key modules are non-functional.
- **#79 SAFETY-SCOPED (not exercised)** — Download Markdown / Download PDF / Print /
  Publish view-only link are all present after generation. Per safety policy
  (no unsolicited file downloads; no audience-expanding publish without explicit user
  permission) these were **deliberately not triggered**. The generation prerequisite
  works; the export *output* fidelity is unverified this run.

---

## Per-Feature-Class Module-Population Matrix

| Feature class | Persists to store? | Plan module | Act surfaces | Verdict |
|---|---|---|---|---|
| **Zones** (Mollison Z0–Z5) | ✓ `ogden-zones` | ✓ ZONES (rich) | feeds waste-vector pickers | **GOOD** |
| **Livestock** (poultry paddock + fence) | ✓ `ogden-livestock` | ✓ LIVESTOCK | ✓ **all** (yield/rotation/predator/corridors/alert) | **GOOD ★** |
| **Built Environment** (barn) | ✓ `ogden-built-environment-v2` | ✗ **module blank (#61)** | ◐ MAINTAIN Structure picker only | **MAJOR** |
| **Water** (swale/catchment/storage/sink) | ✓ `ogden-water-systems` | ◐ WATER lists, balance math broken | ✗ MAINTAIN earthwork/storage blind (#66) | **MAJOR** |
| **Plant systems** (guild/orchard) | ✓ `ogden-polyculture` / `…design-elements` | ✓ placed | ✗ HARVEST + Irrigation blind (#72/#67) | **MAJOR** |
| **Soil fertility** (composter) | ✓ | ◐ colocation✓ but loop disconnect (#58) | ✗ Waste routing empty (consequence of #59) | **CRITICAL** |
| **Closed-loop waste vectors** | ✗ not constructible (#59/#60) | ✗ | ✗ | **CRITICAL** |

Legend: ✓ works · ◐ partial · ✗ broken/stranded

---

## Prioritized Recommendations

### P0 — Trust & data integrity (fix before any onboarding push)

1. **Fix the 0-ha boundary-area defect (#77, root of #78 and the Water balance bug).**
   Boundary acreage must compute from the drawn polygon and propagate to Water balance
   and the Report. A confident "Supported · 67" verdict for a 0-ha farm is a
   credibility-ending first impression.
2. **Make the Report honest about design completeness (#78).** Surface integration
   gaps (blank/unfilled modules, unreachable closed loop, zero-area parcel) as Blocking
   Issues / Next Actions, or scope the verdict's claims. Do not report "0 blocking
   issues" when core modules are non-functional.
3. **Repair the Built Environment / STRUCTURES Plan module (#61).** Data persists; the
   module just needs to render it. High user-visible payoff, likely contained fix.

### P1 — Close the Plan→Act linkage gaps (the dominant failure pattern)

4. **Wire Water earthworks/storage into MAINTAIN (#66).** The module advertises swale
   maintenance as its flagship example; the swale must be selectable.
5. **Wire Plant systems into HARVEST + Irrigation (#67/#72).** Designed orchards/guilds
   must populate the crop-area pickers, or harvest/irrigation tracking is dead.
6. **Unify the closed-loop system (#58/#59).** Make the canvas Flow-connector and the
   structured Waste-to-resource vectors the same model, and let waste-vector From/To
   reference livestock, plants, structures and water — not just zones + composter.
   Until this lands, the central permaculture promise (closed loops) is unreachable
   from creation to operation.

### P2 — Navigation & polish

7. **Add a forward affordance Act → Report (#75)** mirroring Plan's "ACT ›", and add
   stage-nav chrome to the Report page. Right now Report is undiscoverable without a URL.
8. **Pre-fill LIVESTOCK Move-log SPECIES from the selected paddock (#71).**
9. **Strengthen the local-only persistence warning (#62)** at first placement —
   make the data-loss risk and the Export-bundle remedy unmissable for naive users.

### Preserve (do not regress in refactors)

- The **LIVESTOCK** module end-to-end (#69/#70) — this is the reference standard the
  other feature classes should be brought up to.
- **Plan · Zones** ring-seeding + freehand + live size guide (#3) — the most polished
  design surface.
- Graceful offline degradation of external weather (#73) and the well-written grounded
  hero copy across all Act modules (#63).

---

## Method, Confidence & Caveats

- Driven through real Chrome by on-screen affordances; one deliberate URL bypass
  (Act→Report, itself logged as #75). Screenshots captured at every stage as evidence
  per project policy; store-level claims (#61, #66, #69, #72) were cross-checked by
  reading `localStorage` directly so "module is blank" vs "data not saved" was
  disambiguated rather than assumed.
- **CAVEAT (#60):** Some React-controlled `<select>` controls could not be driven by
  the automation harness. Where this affected a finding it is tagged CAVEAT and the
  product defect (e.g. #59) is stated independently of the harness limitation.
- **GATED:** Anything requiring Postgres/Fastify or external APIs was untestable
  (offline). In practice only external weather (#73) was actually gated — the offline
  surface is far larger and more functional than "frontend-only" would suggest.
- The baseline `docs/ux-walkthrough-regen-farm.md` was not used and is unmodified.

---

## Definition-of-Done Check

A full regen-farm design was attempted end-to-end: Mollison zones; food-forest guild +
orchard with a pest-control poultry paddock; water catchment/storage/swale/sink;
soil-fertility composter + (attempted) closed loop; and a built-environment barn — then
carried through Observe → Plan → Act → Report. For every feature class the doc records
whether it populated its downstream module or is a gap (matrix above), with
severity-tagged findings and prioritized recommendations. Baseline preserved.
