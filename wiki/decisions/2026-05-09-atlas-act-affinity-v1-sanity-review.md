# Act-affinity v1 — sanity review against representative steward days

**Date:** 2026-05-09
**Branch:** feat/atlas-permaculture
**Status:** Recorded — no code changes this session
**Predecessor:** [2026-05-09-atlas-act-operations-hub-project-type-aware-ranking.md](2026-05-09-atlas-act-operations-hub-project-type-aware-ranking.md)

## Why this exists

The v1 affinity table at
[`apps/web/src/v3/act/data/projectTypeModuleAffinity.ts`](../../apps/web/src/v3/act/data/projectTypeModuleAffinity.ts)
shipped earlier today as an opinionated, no-telemetry best guess. The
predecessor ADR explicitly named the risk: *"the affinity rankings feel
'wrong' for a real steward."* This review is a structured pen-and-paper
walkthrough — for each of the six archetypes, narrate a representative
peak-season day, count touches per Act module, then compare against
v1. The point is not to invent a "correct" ranking but to **catch any
v1 ordering that's implausibly wrong** before a real steward hits it.

## Method

For each archetype:

1. A one-sentence steward persona.
2. A representative peak-season day (8–14 actions).
3. Each action tagged to the Act module that owns its primary surface,
   using the actual card list from the Act stage:

   | Module | Cards |
   |---|---|
   | Build | Build Gantt · Budget vs actuals · Pilot plots |
   | Maintain | Event log · Maintenance schedule · Irrigation manager · Waste routing |
   | Livestock | Yield log · Rotation schedule · Pasture utilization · Forage quality · Browse pressure · Predator hotspots · Welfare access audit · Animal corridors |
   | Harvest | Harvest log · Succession tracker |
   | Review | Ongoing SWOT · Hazard plans |
   | Network | Network CRM · Community events · Appropriate tech |

4. Touch count per module → derived ordering, with first-action-of-day
   as tiebreaker.
5. v1 vs derived. Inversions of 1 position are "noise" (within
   pen-and-paper resolution); 2-position inversions are "candidate
   revisions"; 3+ position inversions are "implausibly wrong".
6. Confidence rating + recommendation: Keep v1, Tweak (with proposed
   v2), or Defer until real telemetry.

A few actions plausibly touch two modules. The walkthrough names a
**primary** module per action and notes the alternative inline; this
classification sensitivity is itself a finding (see Synthesis §2).

## Caveats

- All personas are pen-and-paper stereotypes. A real homestead may have
  no animals, an "educational farm" may run cohort-only with no public
  visitors, etc. Variance within an archetype is the largest source of
  uncertainty.
- The reviewer (me) shipped v1 the same day. Touch counts were tallied
  before re-reading v1 to keep the comparison fresh, but unconscious
  imports cannot be ruled out.
- Peak-season bias: shoulder-season and winter days redistribute
  weight toward `maintain` and `review` for almost every archetype.
  v1 is implicitly a peak-season ordering and the review inherits that
  framing.

---

## 1. regenerative_farm

**Persona.** Khaled, 12-acre diversified market farm in southern
Vermont, 2 paid hands, mid-July CSA peak.

**Representative day.**

1. 06:00 Morning egg gather → **harvest** (harvest log)
2. 06:30 Move broiler tractor + check water → **livestock** (rotation)
3. 07:00 Cattle paddock shift, count days-residual → **livestock**
   (pasture utilization)
4. 07:45 Wash-pack chiller temp log → **maintain** (event log)
5. 08:30 CSA harvest of peas, lettuce, herbs → **harvest** (log)
6. 11:00 Weekly seed/labor budget actuals → **build** (budget vs actuals)
7. 13:00 Drip-line repair + irrigation schedule → **maintain**
   (irrigation manager)
8. 14:00 Succession tray → **harvest** (succession tracker)
9. 15:30 Forage-quality eyeball on next paddock → **livestock**
10. 16:30 Vendor delivery call, log into CRM → **network**
11. 17:30 Evening egg gather + chicken count → **harvest** (primary;
    livestock secondary)
12. 18:00 Weekly SWOT + heat-index hazard scan → **review**

**Touch counts.** harvest 4 · livestock 3 · maintain 2 · build 1 ·
network 1 · review 1.

**Derived.** harvest, livestock, maintain, build, network, review
(first-action tiebreak places harvest above livestock at action #1).

**v1.** harvest, livestock, maintain, build, **review**, **network**.

**Comparison.** Positions 5/6 swap (review ↔ network), one-position
inversion only. All other positions match exactly.

**Confidence.** Medium. Peak-season is the strongest case for v1 here;
shoulder-season would push maintain up.

**Recommendation: Keep v1.**

---

## 2. retreat_center

**Persona.** Aisha, 40-acre wellness retreat, Nova Scotia, hosting a
cohort of 18 guests this week, late August.

**Representative day.**

1. 06:00 Dawn check generator + waste system → **maintain** (event log)
2. 06:30 Walk arrival path for trip hazards → **review** (hazard
   plans; primary because the action is risk-flagging)
3. 07:00 Arriving-guest message check, RSVP confirms → **network**
   (community events)
4. 08:00 Housekeeping ledger + linen rotation → **maintain** (event log)
5. 09:30 Staff briefing for the day's program → **network** (CRM)
6. 11:00 Lunch garden harvest for chef → **harvest**
7. 13:00 Trail signage check + program transition → **maintain**
   (event log; review secondary)
8. 15:00 1:1 well-being chat with a guest, log feedback → **network**
   (CRM)
9. 16:00 Sauna temperature controller fix → **maintain** (event log)
10. 17:00 Weekly tracking on booking revenue/op-costs → **build**
    (budget vs actuals)
11. 18:30 Incident debrief, file SWOT/hazard if needed → **review**

**Touch counts.** maintain 4 · network 3 · review 2 · harvest 1 ·
build 1 · livestock 0.

**Derived.** maintain, network, review, harvest, build, livestock.

**v1.** **network**, **maintain**, review, **build**, **harvest**, livestock.

**Comparison.**
- v1 #1 ↔ derived #2 (network/maintain swap, 1-pos)
- v1 #4 ↔ derived #4 (build/harvest swap, 1-pos)
- positions 3 and 6 match exactly

All inversions are 1-position; livestock-last is uncontested.

**Confidence.** Medium. Retreat days are tightly choreographed but
high day-to-day variance across retreat cultures (silent vs. social,
self-led vs. instructor-led).

**Recommendation: Keep v1.** Worth noting: a stronger argument exists
for promoting maintain to #1 (housekeeping is the literal primary
surface most days) than for keeping network there. This is a
deferred-until-telemetry call rather than a clear "wrong".

---

## 3. homestead

**Persona.** Maryam, 5-acre off-grid family homestead, southern
Ontario, two kids, peak August preserving season, owns chickens + two
dairy goats.

**Representative day.**

1. 06:30 Chicken release, water, eggs → **livestock** (yield log)
2. 07:00 Garden walk, breakfast harvest → **harvest**
3. 07:30 Cistern level + dispense top-up → **maintain** (irrigation)
4. 09:00 Jam canning + pantry inventory log → **harvest** (yield;
   maintain secondary for "preservation routine")
5. 09:30 Fence-wire fix from raccoon raid → **livestock** (predator
   hotspots; maintain secondary)
6. 10:30 Tomato processing, log preservation event → **maintain**
   (event log)
7. 13:00 Firewood splitting against winter target → **maintain**
   (maintenance schedule)
8. 14:30 Succession tray for fall greens → **harvest** (succession)
9. 15:30 Root-cellar inventory + expense ledger → **build** (budget vs
   actuals)
10. 16:30 Evening goat milking + browse-pressure note → **livestock**
    (yield log)
11. 17:00 Back-paddock chicken roost + egg gather → **livestock**
12. 19:00 Weekly storm/flash-freeze hazard scan → **review** (hazard
    plans)

**Touch counts.** livestock 4 · maintain 3 · harvest 3 · build 1 ·
review 1 · network 0.

**Derived.** livestock, maintain, harvest, build, review, network
(maintain edges harvest by first-action-of-the-day priority — action
#3 vs #2 — but the order is a coin flip).

**v1.** **maintain**, **harvest**, **livestock**, build, **network**,
**review**.

**Comparison.**
- livestock: #3 in v1 → #1 in derived (**2-position inversion** —
  candidate revision)
- maintain: #1 in v1 → #2 in derived (1-pos)
- harvest: #2 in v1 → #3 in derived (1-pos)
- build: #4 in both
- review/network swap (1-pos)

**Confidence.** Medium-low. Homestead is the highest-variance
archetype: a chicken-only urban homestead with no goats redistributes
livestock weight toward maintain/harvest. The persona above assumes
small livestock + dairy, which the Plan-checklist content for
homestead explicitly seeds ("poultry/small-livestock yard adjacent to
the kitchen", "single fertility loop").

**Recommendation: Tweak — but defer until telemetry.** Proposed v2:
`livestock, maintain, harvest, build, review, network`. The signal is
strong enough to flag (livestock owns 8 cards and dominates the day's
touches for a small-animal homestead) but weak enough that a real
steward might disagree if their homestead is plant-only. Don't ship
the tweak on pen-and-paper alone.

---

## 4. educational_farm

**Persona.** Yusuf, 25-acre teaching farm with a 6-person apprentice
cohort and weekly visiting school groups, peak September.

**Representative day.**

1. 07:00 Cohort orientation + day's curriculum → **network**
   (community events)
2. 08:00 Apprentice tour to cow paddock + grazing demo → **network**
   (community events; livestock data only as a teaching artifact —
   primary surface is the teaching event)
3. 09:00 Group harvest, students log first harvests → **harvest**
4. 10:30 SWOT review with apprentices on yesterday's wash-station
   congestion → **review** (SWOT)
5. 12:00 Visitor inquiry + book a tour → **network** (CRM)
6. 13:30 Maintenance schedule walk-through (lesson on hose repair) →
   **maintain** (maintenance schedule; network secondary as it's a
   lesson)
7. 14:30 Tractor field-day with apprentices, log appropriate-tech
   note → **network** (appropriate tech)
8. 15:30 Pre-orchard ladder safety walk → **review** (hazard plans)
9. 16:30 Visiting school-group bookings update → **network**
   (community events)
10. 17:00 Grant-funded apprenticeship budget tracking → **build**
11. 18:00 Grade apprentice journal entries → **network** (CRM)
12. 19:00 Staff debrief, log curriculum adjustments → **review** (SWOT)

**Touch counts.** network 6 · review 3 · harvest 1 · maintain 1 ·
build 1 · livestock 0.

**Derived.** network, review, harvest, maintain, build, livestock
(harvest/maintain/build all tied at 1; first-action priority orders
them harvest #3, maintain #6, build #10).

**v1.** network, review, **maintain**, **harvest**, build, livestock.

**Comparison.** Positions 3/4 swap (maintain/harvest, 1-pos). All
other positions match exactly.

**Confidence.** Medium-low. Highly classification-sensitive: action #2
(grazing demo) could plausibly count as livestock, and reclassifying
it pushes livestock from #6 to ~#3. The walkthrough chose **network**
because the *primary purpose* is teaching, not rotation tracking. A
real educational-farm steward who logs both surfaces would resolve
this differently per session.

**Recommendation: Keep v1.** The classification ambiguity is a real
concern for the row-tagging logic in `TodaysPriorities`/`AlertsPanel`
(see Synthesis §2) but doesn't drive a v2.

---

## 5. conservation

**Persona.** Layla, 80-acre rewilding project on a former pasture,
mid-October monitoring season, no livestock, no public visitors,
funded by a regional land-trust grant.

**Representative day.**

1. 06:00 Dawn bird transect → **review** (SWOT — observational
   logging is the closest existing surface)
2. 07:30 Indicator-species log entry → **review** (SWOT)
3. 09:00 Flood-line check after last night's storm → **maintain**
   (event log; review secondary)
4. 10:00 Invasive-species survey + flag honeysuckle patch → **review**
5. 11:30 Corridor camera-trap SD-card pull → **review**
6. 13:00 Trail closure due to bear sign → **review** (hazard plans)
7. 14:00 Chainsaw maintenance + sharpening → **maintain** (schedule)
8. 15:00 Partner conservancy land-trust transfer inquiry → **network**
   (CRM)
9. 16:00 Grant draw-down budget update → **build**
10. 17:00 Apprentice walks the boundary → **maintain** (event log)
11. 18:00 Quarterly steering-committee report draft → **network** (CRM)
12. 19:00 Day journal + new-hazard log → **review** (hazard plans)

**Touch counts.** review 6 · maintain 3 · network 2 · build 1 ·
harvest 0 · livestock 0.

**Derived.** review, maintain, network, build, harvest, livestock.

**v1.** review, maintain, **build**, **network**, harvest, livestock.

**Comparison.** Positions 3/4 swap (build/network, 1-pos). All other
positions match exactly.

**Confidence.** **High.** Conservation is the cleanest fit: every action
in the day is observation, monitoring, or risk-flagging, and `review`
unambiguously owns those surfaces. Livestock-last and harvest-last
are uncontested.

**Recommendation: Keep v1.** Strongest match across all archetypes.

---

## 6. multi_enterprise

**Persona.** Tariq, 60-acre integrated farm running concurrent CSA,
small ruminant flock, retreat-cabin rental, and a 4-person
apprenticeship cohort, mid-July.

**Representative day.**

1. 06:30 Morning livestock chores (poultry, sheep) → **livestock**
2. 07:30 CSA harvest with apprentice → **harvest**
3. 09:00 Apprentice teaching: kitchen-garden weeding → **network**
4. 10:00 Per-pasture P&L (sheep vs CSA) → **build** (budget vs actuals)
5. 11:30 Retreat-guest arrival + room check → **network** (events)
6. 13:00 Irrigation manifold leak ticket → **maintain** (irrigation)
7. 14:00 Pilot apple-orchard plot review → **build** (pilot plots)
8. 15:30 Hazard plan revision after last week's hose puncture →
   **review** (hazard plans)
9. 16:30 Sheep paddock move → **livestock** (rotation)
10. 17:30 Evening guest farm tour, log feedback → **network**
11. 18:30 Apprentice-cohort productivity SWOT → **review** (SWOT)
12. 19:30 Cross-enterprise yields report (does the orchard pay for the
    goat shed?) → **build** (budget vs actuals)

**Touch counts.** build 3 · network 3 · livestock 2 · review 2 ·
harvest 1 · maintain 1.

**Derived.** network, build, livestock, review, harvest, maintain
(network beats build on first-action priority among the 3-counts —
action #3 vs #4; livestock beats review on the 2-count tier — action
#1 vs #8; harvest beats maintain on the 1-count tier — #2 vs #6).

**v1.** **build**, **review**, **harvest**, **maintain**, **livestock**, **network**.

**Comparison.**
- network: #6 in v1 → #1 in derived (**3-position inversion** —
  implausibly wrong by the strict rule)
- build: #1 ↔ #2 (1-pos)
- livestock: #5 → #3 (**2-position** — candidate revision)
- review: #2 → #4 (**2-position** — candidate revision)
- maintain: #4 → #6 (**2-position** — candidate revision)
- harvest: #3 → #5 (**2-position** — candidate revision)

The ordering is fundamentally different.

**Confidence.** **Low.** Multi-enterprise is by definition a
combination archetype — the "right" ranking depends entirely on which
enterprises a real steward combines. Tariq's persona above leans
hospitality + apprenticeship, which inflates network. A
manufacturing + crops multi-enterprise (workshop + market garden)
would push build up and network down, more like v1.

The defensible v1 read: "multi_enterprise = multiple parallel revenue
streams that need P&L tracking, so build dominates." The hard-to-
defend v1 piece: **network last** is implausible for *any*
multi-enterprise because cross-enterprise coordination, partner
inquiries, and (often) guest interactions all live in network.

**Recommendation: Tweak — but defer until telemetry.** Proposed v2:
`build, network, review, livestock, harvest, maintain` — moves
network from last to second, demotes maintain (which had no obvious
support beyond "every farm needs maintenance"). The 3-position
network inversion is the cleanest signal across all archetypes that
v1 may be wrong; ship the tweak only after a real multi-enterprise
steward weighs in.

---

## Synthesis

### 1. Patterns that hold across types

- **`livestock` is bottom for non-animal archetypes.** v1 places
  livestock last for retreat_center, educational_farm, conservation,
  and (debatable) multi_enterprise. Derived orderings agree. This is
  the strongest cross-archetype regularity in v1.
- **`network` is top for people-facing types.** retreat_center and
  educational_farm both put network at #1 in v1 and the walkthroughs
  agree. This is the second-strongest regularity.
- **`review` is top for monitoring-driven types.** conservation puts
  review at #1; the walkthrough agrees emphatically. Combined with
  network-top for people-facing types, this is the design-pattern
  clearest from the data: **the #1 module is the "primary diagnostic
  surface" for that archetype**.
- **`build` is rarely #1.** Only multi_enterprise has build at #1 in
  v1, and the walkthrough disagrees. For every other type, build sits
  mid-pack (#3-#4). This suggests `build` is a *supporting* surface,
  not a leading one — useful for budget tracking but rarely the
  reason a steward opens the Operations Hub.

### 2. Module-surface-vs-ranking dissonance

`livestock` owns 8 cards (most of any module) but is ranked
**bottom** for retreat_center, educational_farm, conservation, and
arguably multi_enterprise. That's 4 of 6 archetypes. Either:

(a) the heavy livestock card surface is dead weight for those
projects (UX waste), or
(b) the ranking is right and the cards are appropriately invisible.

The pen-and-paper walkthroughs support (b): livestock-bottom matches
operational reality. But the cards still render in the right rail's
module bar and the user can navigate to them — so the cost of (a) is
"navigation noise", not "wasted screen". This is a v3 decision worth
recording but not acting on now.

A second dissonance: `harvest` owns only 2 cards but ranks #1 for
regenerative_farm. The walkthrough confirms — a market farm does
many *small* harvest events per day rather than a few big ones, and
both cards (yield log + succession tracker) are well-shaped for that.
The ranking is right; the surface area is small because the
operations are repetitive, not because they're rare.

### 3. Schedule-module gap

`Schedule` exists as an Act module in
[`apps/web/src/v3/act/types.ts`](../../apps/web/src/v3/act/types.ts)
(Weather forecast + Event calendar cards) but is **not** in the
affinity table at
[`projectTypeModuleAffinity.ts`](../../apps/web/src/v3/act/data/projectTypeModuleAffinity.ts).
A row tagged `module: 'schedule'` would currently return
`Number.POSITIVE_INFINITY` from `getModuleAffinityRank` and sink to
the bottom for every project type.

This is not necessarily wrong: schedule items are **time-driven**
(weather, calendar) rather than archetype-driven. A weather alert is
equally relevant to a homestead and a retreat center; type-affinity
would only be meaningful if schedule items had archetype-specific
priority within the time window, which they don't.

**Recommendation:** Leave `schedule` un-ranked, but **document the
omission** in `projectTypeModuleAffinity.ts` with a top-of-file
doc-comment so a future reader doesn't read the table as covering all
seven Act modules. (A 2-line change; defer to the same follow-up that
applies any v2 tweaks.)

For the moment, no row in `TodaysPriorities` or `AlertsPanel` is
tagged `'schedule'` — both panels source from stores whose semantics
map to the six ranked modules — so the gap is latent, not active.

### 4. Classification sensitivity

Two walkthroughs (educational_farm action #2, homestead actions #1
and #4) had at least one action that could plausibly belong to two
modules. The choice of primary module shifted the touch counts
enough to matter. Implications:

- The pen-and-paper review's resolution is genuinely 1-2 positions,
  not finer. This validates the "1-pos = noise" rule.
- The same ambiguity exists in the live row-tagging logic. For
  instance, a paddock-water-point alert is tagged `'livestock'` but
  could plausibly be `'maintain'` (water infrastructure). The current
  tagging is defensible but not unique.
- A future pass to pin down the tagging unambiguously would tighten
  the affinity sort's signal. Not in this session's scope.

---

## Findings summary

| Archetype | Inversion size | Confidence | Recommendation |
|---|---|---|---|
| regenerative_farm | 1-pos (review/network) | Medium | **Keep v1** |
| retreat_center | 1-pos × 2 | Medium | **Keep v1** |
| homestead | **2-pos** (livestock) | Medium-low | Tweak (`livestock, maintain, harvest, build, review, network`) — **defer until telemetry** |
| educational_farm | 1-pos (maintain/harvest) | Medium-low | **Keep v1** |
| conservation | 1-pos (build/network) | High | **Keep v1** |
| multi_enterprise | **3-pos** (network) | Low | Tweak (`build, network, review, livestock, harvest, maintain`) — **defer until telemetry** |

Plus one finding outside the per-archetype table:

- **Schedule module** — un-ranked. Recommended action: add a
  doc-comment to `projectTypeModuleAffinity.ts` explaining the
  omission. Defer alongside any v2 ordering change.

## What to do next

**Ship nothing today.** Four archetypes confirm v1 outright. Two have
plausible v2 candidates that depend on real-steward variance the
review can't resolve.

When the first real steward in either archetype lands and uses the
Operations Hub for ≥2 weeks:

1. Compare which Hub items they actually open vs. which the affinity
   sort surfaced.
2. If the gap matches the v2 proposal in this review, ship the v2
   ordering for that archetype only. Don't tweak the others.
3. Add the Schedule-module doc-comment in the same change.

Until then, v1 stands. The review is the durable artifact; the table
is unchanged.

## Follow-up

- [2026-05-10 — Act-affinity telemetry pipeline](2026-05-10-atlas-act-affinity-telemetry-pipeline.md):
  the durable read/write pipeline that replaces pen-and-paper
  walkthroughs with real-steward signal. Implements the precondition
  that "ship nothing until telemetry exists" depends on. v2 ranking
  proposals from this review (homestead, multi_enterprise) wait for
  ≥30 sessions × ≥2 project types of dashboard data.
