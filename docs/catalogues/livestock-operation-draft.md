# Livestock Operation — Catalogue Draft (for ratification)

> **Status:** DRAFT — Phase 1 (hybrid sourcing step 1). Nothing is encoded to
> TypeScript yet. Review, edit inline, and ratify; then I encode to
> `catalogues/livestockOperation.ts` and wire the taxonomy.
>
> **Type recommendation:** add `livestock_operation` as a **new primary type**
> (`canBePrimary: true, canBeSecondary: false`, ordinal 13). Confirm or redirect.
>
> **Authoring mode:** derived from livestock/regenerative-grazing best practice
> under the hybrid "I draft, you ratify" authorization. Voice + shape mirror the
> encoded catalogues (Authoring Standards v1.4): 5–15 checklist items per
> objective; each checklist fully partitioned into 2–3 named decision groups;
> a completion gate + an act handoff per objective; ASCII-only copy.
>
> **Ref prefix:** `LVS`. Refs are `LVS-S<stratum>.<n>`. (Universal objectives
> S1.1–S7.3 are shared by every type; primary objectives start at `.4`/`.5` per
> stratum to avoid colliding with the universal slots, matching silvopasture.)
>
> **Formula bindings (already in the engine):** `ckF` items bind to live compute
> widgets via `ObjectiveFormulaId` — `forage-carrying-capacity`,
> `carrying-capacity-seasonal`, `paddock-stocking-density`,
> `paddock-system-capacity`, `stock-water-demand`, `enterprise-break-even`.
> Marked **[formula: …]** below.

---

## ⚠️ Overlap decision you need to make

`silvopasture.ts` is subtitled *"Silvopasture / Livestock Land Management"* and
already encodes: livestock enterprise mix, animal welfare, pasture condition,
existing livestock infrastructure, stock-water availability, forage productivity,
paddock layout, establishment sequence (with a hard gate), and enterprise
financial viability. Because a steward picks **one** primary type, parallel
content across two types is acceptable (every type has its own water objective,
etc.). But to justify a *separate* type, this catalogue leads with the **animal
enterprise** — breeding program, herd genetics, year-round animal nutrition, herd
health at depth, processing/marketing logistics — and treats trees as out of
frame. Three framings are possible:

- **A — Distinct (recommended):** author as below; animal-enterprise-led, tree
  integration explicitly out of scope. ~23 objectives.
- **B — Lean:** drop objectives that fully duplicate silvopasture (welfare,
  pasture inventory, infra inventory) and keep only the animal-enterprise
  differentiators. ~15 objectives.
- **C — Don't add a type:** fold "livestock operation" into silvopasture as an
  emphasis instead. (Then this draft is discarded.)

**Default if you say nothing: A.**

---

## Stratum 1 — Project Foundation

### LVS-S1.4 — A clear livestock enterprise vision & species mix
- **shortTitle:** Livestock enterprise vision & species mix
- **Focused question:** What animals will this operation run, at what scale, and toward what production purpose?
- **Checklist**
  - c1 — Define the enterprise type(s) — breeding herd/flock, grow-out/finishing, dairy, fibre, dual-purpose, or mixed
  - c2 — Define species and candidate breeds — cattle, sheep, goats, pigs, poultry, or combination
  - c3 — Define production intent per species — meat, milk, eggs, fibre, breeding stock, land improvement
  - c4 — Define the integration logic between species if multi-species (leader-follower grazing, niche separation)
  - c5 — Confirm the enterprise vision fits the steward's experience and available labour
  - c6 — Confirm the vision is consistent with the site's climate and feed base
- **Decision groups**
  - dg1 *Enterprise & species* → c1, c2
  - dg2 *Production intent & integration* → c3, c4
  - dg3 *Capacity & site fit* → c5, c6
- **Completion gate:** Livestock enterprise vision approved. Species, scale, and production intent confirmed.
- **Act handoff:** Livestock Enterprise Vision & Species Mix Brief

### LVS-S1.5 — Clear production goals, scale & stewardship capacity
- **shortTitle:** Production goals, scale & capacity
- **Focused question:** What output does this operation aim for, and is that scale carriable by the steward's time, skill, and capital?
- **Checklist**
  - c1 — Define measurable production targets — head sold/yr, kg liveweight, litres, dozen eggs, breeding replacements
  - c2 — Define the target full-establishment herd/flock size
  - c3 — Define the establishment horizon — how many seasons to reach full scale
  - c4 — Assess steward stockmanship capacity — daily check, handling, calving/lambing, health intervention skill
  - c5 — Confirm capital and operating budget envelope is realistic for the scale
  - c6 — Confirm a continuity / absence-cover plan exists (animals need daily care)
- **Decision groups**
  - dg1 *Targets & scale* → c1, c2, c3
  - dg2 *Steward capacity* → c4, c6
  - dg3 *Capital envelope* → c5
- **Completion gate:** Production goals and target scale approved and confirmed within steward capacity.
- **Act handoff:** Production Goals & Capacity Brief

### LVS-S1.6 — Clear animal welfare & husbandry ethic
- **shortTitle:** Animal welfare & husbandry ethic
- **Focused question:** What minimum welfare standards govern every management decision — feed, water, shelter, handling, and end-of-life?
- **Checklist**
  - c1 — Define minimum space and stocking-density standards per species
  - c2 — Define shelter standards per species — shade, wind protection, wet-weather and extreme-heat/cold refuge
  - c3 — Define constant access to feed and clean water as a standing requirement
  - c4 — Define a low-stress handling commitment and handling-frequency norms
  - c5 — Define a humane health-intervention and end-of-life / emergency-euthanasia protocol
  - c6 — Confirm standards meet or exceed applicable animal-welfare legislation
- **Decision groups**
  - dg1 *Space, shelter & sustenance* → c1, c2, c3
  - dg2 *Handling & intervention* → c4, c5
  - dg3 *Compliance* → c6
- **Completion gate:** Animal welfare and husbandry ethic defined and confirmed legislation-compliant.
- **Act handoff:** Animal Welfare & Husbandry Standards Brief
- **scopeNotes (optional):** Welfare ethic reflects a duty of excellent care (ihsan) to the animals in the steward's trust; kept operational here.

---

## Stratum 2 — Land Reading

### LVS-S2.5 — A clear read of the forage & feed base
- **shortTitle:** Forage & feed base
- **Focused question:** What does the land currently grow as feed, and how much of the year's ration can it supply?
- **Checklist**
  - c1 — Map pasture/forage communities by zone — species composition and ground cover
  - c2 — Assess forage condition per zone — excellent, good, fair, poor, degraded
  - c3 — Identify desirable forage species and legume content present
  - c4 — Identify weed, toxic, and bare-ground problem areas
  - c5 — Record seasonal forage availability and quality curve across the year
  - c6 — Estimate the share of annual feed the land can supply vs bought-in feed
- **Decision groups**
  - dg1 *Composition & condition* → c1, c2 (observeFeeds: Vegetation & Succession)
  - dg2 *Desirable vs problem species* → c3, c4 (observeFeeds: Vegetation & Succession)
  - dg3 *Seasonality & self-sufficiency* → c5, c6
- **Completion gate:** Forage and feed base mapped. Seasonal supply curve and feed self-sufficiency estimated.
- **Act handoff:** Forage & Feed Base Survey

### LVS-S2.6 — A clear read of stock water sources
- **shortTitle:** Stock water sources
- **Focused question:** Where does livestock drinking water come from, how reliable is it, and how is it currently delivered?
- **Checklist**
  - c1 — Inventory all potential stock-water sources — wells, dams/ponds, streams, mains, rainwater
  - c2 — Assess each source's reliability across seasons and drought
  - c3 — Test/record water quality and stock-suitability concerns
  - c4 — Map existing reticulation — pipes, troughs, tanks, pumps and their condition
  - c5 — Identify paddocks/zones with no current water access
- **Decision groups**
  - dg1 *Sources & reliability* → c1, c2 (observeFeeds: Hydrology & Water)
  - dg2 *Quality* → c3 (observeFeeds: Hydrology & Water)
  - dg3 *Delivery & gaps* → c4, c5 (observeFeeds: Infrastructure & Access)
- **Completion gate:** Stock water sources inventoried, reliability and quality assessed, access gaps identified.
- **Act handoff:** Stock Water Source Survey

### LVS-S2.7 — A clear read of existing livestock infrastructure
- **shortTitle:** Existing livestock infrastructure
- **Focused question:** What fencing, yards, shelters, and laneways already exist, and what is reusable?
- **Checklist**
  - c1 — Inventory existing fencing — type, condition, and stock-tightness per species
  - c2 — Assess existing yards and handling facilities — capacity, layout, safety, condition
  - c3 — Assess existing shelters and barns — condition and species suitability
  - c4 — Map existing laneways and gateways — width, surface, flow, condition
  - c5 — Record reuse potential and obvious replacement needs
- **Decision groups**
  - dg1 *Fencing & yards* → c1, c2 (observeFeeds: Infrastructure & Access)
  - dg2 *Shelter & circulation* → c3, c4 (observeFeeds: Infrastructure & Access)
  - dg3 *Reuse assessment* → c5
- **Completion gate:** Existing livestock infrastructure inventoried; condition and reuse potential assessed.
- **Act handoff:** Existing Livestock Infrastructure Survey

---

## Stratum 3 — Systems Reading

### LVS-S3.5 — A clear carrying-capacity & seasonal feed-supply read
- **shortTitle:** Carrying capacity & seasonal feed supply
- **Focused question:** How many animals can this land carry, and how does that capacity move with the seasons?
- **Checklist**
  - c1 — Estimate forage dry-matter productivity per zone **[formula: forage-carrying-capacity, satisfiesWhenComputed]**
  - c2 — Estimate seasonal carrying capacity across the year **[formula: carrying-capacity-seasonal, satisfiesWhenComputed]**
  - c3 — Identify the feed-deficit (bottleneck) season that sets the safe stocking ceiling
  - c4 — Define the conservative vs productive stocking-rate scenarios
  - c5 — Record assumptions and confidence level behind the estimate
- **Decision groups**
  - dg1 *Productivity & capacity* → c1, c2
  - dg2 *Bottleneck & scenarios* → c3, c4
  - dg3 *Assumptions* → c5
- **Completion gate:** Carrying capacity estimated across seasons; the limiting season and a safe stocking ceiling identified.
- **Act handoff:** Carrying Capacity & Seasonal Feed-Supply Assessment

### LVS-S3.6 — A clear animal-health & parasite baseline
- **shortTitle:** Animal-health & parasite baseline
- **Focused question:** What health, parasite, and disease pressures does this site and region carry before any stock arrive?
- **Checklist**
  - c1 — Record regional/endemic disease pressures relevant to the chosen species
  - c2 — Record internal/external parasite pressure and known resistance issues
  - c3 — Record soil/forage mineral status driving deficiency or toxicity risk
  - c4 — Identify notifiable diseases and mandatory reporting/movement rules
  - c5 — Record the nearest veterinary and diagnostic support and response time
- **Decision groups**
  - dg1 *Disease & parasite pressure* → c1, c2
  - dg2 *Nutritional health risk* → c3
  - dg3 *Regulatory & support* → c4, c5
- **Completion gate:** Health, parasite, and disease baseline documented for the site and chosen species.
- **Act handoff:** Animal-Health & Parasite Baseline Report

### LVS-S3.7 — A clear predator, biosecurity & climate-risk read
- **shortTitle:** Predator, biosecurity & climate risk
- **Focused question:** What predation, incursion, and climate hazards threaten the herd, and how exposed is the site?
- **Checklist**
  - c1 — Identify predator species and historical predation pressure by zone
  - c2 — Identify biosecurity incursion vectors — boundaries, shared water, neighbour stock, wildlife
  - c3 — Identify climate hazards to stock — heat, cold, flood, fire, drought
  - c4 — Record boundary security and neighbour-stock contact risk
  - c5 — Rank the risks by likelihood and impact
- **Decision groups**
  - dg1 *Predation & incursion* → c1, c2
  - dg2 *Climate & boundary* → c3, c4 (observeFeeds: Risk & Suitability)
  - dg3 *Risk ranking* → c5 (observeFeeds: Risk & Suitability)
- **Completion gate:** Predator, biosecurity, and climate risks identified and ranked.
- **Act handoff:** Predator, Biosecurity & Climate Risk Reading

---

## Stratum 4 — Foundation Decisions

### LVS-S4.5 — Species & breed selection decision
- **shortTitle:** Species & breed selection
- **Focused question:** Which species and breeds are committed, and why do they fit this land and market?
- **Checklist**
  - c1 — Commit final species selection against feed base and steward capacity
  - c2 — Commit breed(s) per species — hardiness, temperament, market fit, climate adaptation
  - c3 — Decide breeding-stock sourcing strategy — buy in, raise replacements, or both
  - c4 — Decide genetic/health entry standards for incoming stock
  - c5 — Confirm the selection against the welfare ethic and carrying capacity
- **Decision groups**
  - dg1 *Species & breed* → c1, c2
  - dg2 *Sourcing & genetics* → c3, c4
  - dg3 *Cross-check* → c5
- **Completion gate:** Species and breeds committed; sourcing and entry standards decided.
- **Act handoff:** Species & Breed Selection Record

### LVS-S4.6 — Stocking rate & herd-structure decision
- **shortTitle:** Stocking rate & herd structure
- **Focused question:** How many of each class of animal will the operation run, and how is the herd structured?
- **Checklist**
  - c1 — Decide the target stocking rate against the carrying-capacity ceiling **[formula: paddock-stocking-density, satisfiesWhenComputed]**
  - c2 — Decide herd/flock structure — breeders, replacements, growers, finishers, sires
  - c3 — Decide the flex/destock policy for feed-deficit seasons and drought
  - c4 — Decide the replacement and culling rate to hold structure stable
  - c5 — Confirm the stocking decision leaves a feed-safety margin
- **Decision groups**
  - dg1 *Rate & structure* → c1, c2
  - dg2 *Flex & turnover* → c3, c4
  - dg3 *Safety margin* → c5
- **Completion gate:** Stocking rate and herd structure decided within the carrying-capacity safety margin.
- **Act handoff:** Stocking Rate & Herd Structure Record

### LVS-S4.7 — Grazing / feeding system decision
- **shortTitle:** Grazing / feeding system
- **Focused question:** How will animals be fed across the year — set-stocked, rotated, mob-grazed, or confinement-fed?
- **Checklist**
  - c1 — Decide the core grazing method — continuous, rotational, adaptive multi-paddock, or mob
  - c2 — Decide the role and timing of any confinement / barn feeding
  - c3 — Decide rest-and-recovery rules — graze period, rest period, residual targets
  - c4 — Decide the supplementary-feeding trigger and policy
  - c5 — Confirm the system fits the welfare ethic, labour, and land-improvement intent
- **Decision groups**
  - dg1 *Method & confinement* → c1, c2
  - dg2 *Recovery & supplements* → c3, c4
  - dg3 *Cross-check* → c5
- **Completion gate:** Grazing/feeding system decided with rest, recovery, and supplement rules.
- **Act handoff:** Grazing & Feeding System Record

### LVS-S4.8 — Stock-water strategy decision
- **shortTitle:** Stock-water strategy
- **Focused question:** How will every animal reach clean water within welfare distance, in every season?
- **Checklist**
  - c1 — Compute peak stock-water demand vs available supply **[formula: stock-water-demand, satisfiesWhenComputed]**
  - c2 — Decide source priority and any new source development
  - c3 — Decide the reticulation approach — gravity, pumped, storage buffering
  - c4 — Decide maximum walk-to-water distance per species and paddock
  - c5 — Confirm supply meets peak demand with a drought buffer
- **Decision groups**
  - dg1 *Demand & sources* → c1, c2
  - dg2 *Delivery & access* → c3, c4
  - dg3 *Resilience* → c5
- **Completion gate:** Stock-water strategy decided; peak demand met with a drought buffer.
- **Act handoff:** Stock-Water Strategy Record

---

## Stratum 5 — System Design

### LVS-S5.5 — Paddock / cell / yard layout design
- **shortTitle:** Paddock & cell layout
- **Focused question:** How is the grazing land subdivided to deliver the chosen grazing system?
- **Checklist**
  - c1 — Design the paddock/cell subdivision serving the grazing method **[formula: paddock-system-capacity]**
  - c2 — Size paddocks/cells to the herd and the planned graze/rest periods **[formula: paddock-stocking-density]**
  - c3 — Design laneways and gate placement for low-stress flow to water and yards
  - c4 — Locate sacrifice / stand-off areas for wet conditions and confinement feeding
  - c5 — Confirm the layout matches terrain, soils, and shelter
- **Decision groups**
  - dg1 *Subdivision & sizing* → c1, c2
  - dg2 *Flow & sacrifice areas* → c3, c4 (observeFeeds: Infrastructure & Access)
  - dg3 *Terrain fit* → c5
- **Completion gate:** Paddock/cell and yard layout designed and matched to terrain and the grazing system.
- **Act handoff:** Paddock & Cell Layout Design

### LVS-S5.6 — Fencing & water-reticulation design
- **shortTitle:** Fencing & water reticulation
- **Focused question:** What fencing and water-delivery infrastructure does the layout require?
- **Checklist**
  - c1 — Specify perimeter and subdivision fencing types per species and budget
  - c2 — Specify permanent vs temporary/electric fencing for flexible grazing
  - c3 — Design the water reticulation — mains, pipe runs, tanks, trough placement
  - c4 — Specify pump/power and storage to hold peak demand
  - c5 — Sequence fencing and water builds against the establishment plan
- **Decision groups**
  - dg1 *Fencing spec* → c1, c2
  - dg2 *Water delivery* → c3, c4 (observeFeeds: Infrastructure & Access)
  - dg3 *Build sequence* → c5
- **Completion gate:** Fencing and water-reticulation infrastructure specified and sequenced.
- **Act handoff:** Fencing & Water Reticulation Design

### LVS-S5.7 — Handling facilities & shelter design
- **shortTitle:** Handling facilities & shelter
- **Focused question:** Where and how will animals be safely handled, treated, and sheltered?
- **Checklist**
  - c1 — Design yards, race, and crush/handling system sized to peak throughput and species
  - c2 — Locate handling facilities for low-stress access from all paddocks
  - c3 — Design shade, wind, and wet/extreme-weather shelter per species
  - c4 — Design loading/unloading and quarantine/sick-bay provision
  - c5 — Confirm facilities meet the welfare ethic and operator-safety standards
- **Decision groups**
  - dg1 *Handling system* → c1, c2
  - dg2 *Shelter & quarantine* → c3, c4
  - dg3 *Welfare & safety* → c5
- **Completion gate:** Handling facilities and shelter designed to welfare and safety standards.
- **Act handoff:** Handling Facilities & Shelter Design

### LVS-S5.8 — Seasonal feed budget & supplementary-feed plan
- **shortTitle:** Seasonal feed budget
- **Focused question:** How is the herd fed through the deficit season without breaching welfare or carrying capacity?
- **Checklist**
  - c1 — Build a month-by-month feed budget — demand vs forage supply **[formula: carrying-capacity-seasonal]**
  - c2 — Quantify the deficit-season gap to fill with conserved or bought-in feed
  - c3 — Decide conserved-feed strategy — hay/silage made on-site vs purchased
  - c4 — Decide storage and the safe-reserve (drought buffer) volume
  - c5 — Confirm the plan holds welfare and body-condition targets year-round
- **Decision groups**
  - dg1 *Budget & gap* → c1, c2
  - dg2 *Conserved feed & storage* → c3, c4
  - dg3 *Welfare check* → c5
- **Completion gate:** Seasonal feed budget complete; deficit-season supply and reserve secured.
- **Act handoff:** Seasonal Feed Budget & Supplementary-Feed Plan

---

## Stratum 6 — Integration Design

### LVS-S6.5 — Herd-health, breeding & husbandry protocol
- **shortTitle:** Herd-health & breeding protocol
- **Focused question:** What standing protocol keeps the herd healthy and reproducing on schedule?
- **Checklist**
  - c1 — Define the animal-health calendar — vaccination, parasite, mineral, hoof/teeth, body-condition checks
  - c2 — Define the breeding plan — mating/joining windows, gestation, calving/lambing/farrowing management
  - c3 — Define replacement, weaning, and culling decisions and timing
  - c4 — Define identification, record-keeping, and traceability practice
  - c5 — Define the veterinary relationship and intervention thresholds
  - c6 — Define the response protocol for sick, injured, or down animals
- **Decision groups**
  - dg1 *Health calendar* → c1, c5
  - dg2 *Breeding & turnover* → c2, c3
  - dg3 *Records & response* → c4, c6
- **Completion gate:** Herd-health and breeding protocol defined with a health calendar and traceability practice.
- **Act handoff:** Herd-Health & Breeding Protocol

### LVS-S6.6 — Manure, nutrient cycling & pasture-recovery integration
- **shortTitle:** Manure & nutrient cycling
- **Focused question:** How does animal impact build soil and pasture rather than degrade it?
- **Checklist**
  - c1 — Define how grazing impact and dung/urine distribution are managed to lift fertility
  - c2 — Define manure handling from confinement/handling areas — capture, compost, return
  - c3 — Define the pasture-recovery and overseeding/renovation approach
  - c4 — Define nutrient-balance monitoring to avoid hotspots and runoff
  - c5 — Confirm integration with any cropping, orchard, or neighbouring systems
- **Decision groups**
  - dg1 *Animal impact & manure* → c1, c2
  - dg2 *Recovery & balance* → c3, c4
  - dg3 *Whole-system fit* → c5
- **Completion gate:** Manure and nutrient-cycling integration defined; pasture recovery and nutrient balance protected.
- **Act handoff:** Manure & Nutrient Cycling Plan

### LVS-S6.7 — Predator management, guardian & biosecurity protocol
- **shortTitle:** Predator & biosecurity protocol
- **Focused question:** What standing measures protect the herd from predation and disease incursion?
- **Checklist**
  - c1 — Define predator-deterrence measures — guardian animals, fencing, night housing, husbandry timing
  - c2 — Define the guardian-animal plan if used — species, number, integration, welfare
  - c3 — Define the biosecurity protocol — quarantine of incoming stock, visitor/vehicle hygiene
  - c4 — Define boundary and shared-water controls against neighbour-stock contact
  - c5 — Define the disease-outbreak response and notifiable-disease procedure
- **Decision groups**
  - dg1 *Predation control* → c1, c2
  - dg2 *Biosecurity* → c3, c4
  - dg3 *Outbreak response* → c5
- **Completion gate:** Predator-management and biosecurity protocols defined, including outbreak response.
- **Act handoff:** Predator & Biosecurity Protocol

---

## Stratum 7 — Phasing & Resourcing

### LVS-S7.5 — Herd build-up & establishment sequence  *(carries a hard gate)*
- **shortTitle:** Herd build-up sequence
- **Focused question:** In what order is infrastructure built and stock introduced, so no animal arrives before its support systems are ready?
- **Checklist**
  - c1 — Sequence infrastructure builds — fencing, water, handling, shelter — before stock
  - c2 — Define the herd build-up phases — initial cohort, breeding-up, full establishment
  - c3 — Define go/no-go readiness tests for fencing, water, and handling ahead of each intake
  - c4 — Define the introduction/acclimation protocol for new stock
  - c5 — Confirm each phase stays within carrying capacity and feed budget
- **Decision groups**
  - dg1 *Build & intake sequence* → c1, c2
  - dg2 *Readiness gates* → c3, c4
  - dg3 *Capacity check* → c5
- **Completion gate:** Establishment sequence approved. **Hard gate: no livestock are introduced before fencing, water, and handling facilities each pass an independent go/no-go test.**
- **Act handoff:** Herd Build-Up & Establishment Sequence
- **scopeNotes:** Hard gate transcribed from grazing-establishment best practice — stock readiness is gated on infrastructure, not the calendar.

### LVS-S7.6 — Enterprise financial viability & break-even plan
- **shortTitle:** Financial viability & break-even
- **Focused question:** Does the operation pay for itself, and when does it cross break-even?
- **Checklist**
  - c1 — Build the establishment capital budget — infrastructure, breeding stock, equipment
  - c2 — Build the annual operating budget — feed, animal health, labour, processing
  - c3 — Project the revenue timeline by enterprise to break-even **[formula: enterprise-break-even, satisfiesWhenComputed]**
  - c4 — Define the cash-flow buffer covering the pre-break-even build-up years
  - c5 — Confirm viability against the production goals and scale
- **Decision groups**
  - dg1 *Capital & operating cost* → c1, c2
  - dg2 *Revenue & cash flow* → c3, c4
  - dg3 *Viability check* → c5
- **Completion gate:** Financial viability plan approved; break-even timeline and cash-flow buffer confirmed.
- **Act handoff:** Enterprise Financial Viability Plan
- **scopeNotes:** Ordinary break-even budgeting (cost vs revenue timeline). No advance sale, no financial product, no riba- or gharar-adjacent content.

### LVS-S7.7 — Marketing, sales-channel & processing logistics
- **shortTitle:** Marketing & sales channels
- **Focused question:** How are animals and animal products sold and delivered, and through which channels?
- **Checklist**
  - c1 — Define the products and the form they are sold in — live animals, carcass, cuts, milk, eggs, fibre
  - c2 — Define the processing pathway — on-farm, mobile, licensed abattoir/processor — and its scheduling/booking lead time
  - c3 — Define the sales channels — farmgate/spot sale, wholesale, processor contract, livestock auction, buyers' clubs or meat-share / herd-share subscriptions
  - c4 — Define pricing, traceability, and any certification/labelling claims
  - c5 — Define delivery, cold-chain, and customer-relationship logistics
  - c6 — Confirm channels comply with food-safety and animal-product regulation
- **Decision groups**
  - dg1 *Products & processing* → c1, c2
  - dg2 *Channels & pricing* → c3, c4
  - dg3 *Delivery & compliance* → c5, c6
- **Completion gate:** Marketing, sales-channel, and processing logistics defined and confirmed compliant.
- **Act handoff:** Marketing & Sales-Channel Plan
- **scopeNotes (Amanah Gate — flag, do not omit):** Meat-share / herd-share / CSA-style advance-subscription channels (c3) entail the advance sale of animals or yield the steward does not yet possess (*bayʿ mā laysa ʿindak*). The channel is surfaced, never silently dropped — but it is **flagged for Scholar Council review before adoption** and must not be presented as a default or recommended model, and no CSRA / salam advance-purchase framing is used. Permissible analogues without the flag: farmgate/spot sale of stock on hand, and processor/wholesale contracts settled on delivered animals.

---

## Summary

| Stratum | Objectives | Refs |
|---|---|---|
| S1 Project Foundation | 3 | LVS-S1.4 – S1.6 |
| S2 Land Reading | 3 | LVS-S2.5 – S2.7 |
| S3 Systems Reading | 3 | LVS-S3.5 – S3.7 |
| S4 Foundation Decisions | 4 | LVS-S4.5 – S4.8 |
| S5 System Design | 4 | LVS-S5.5 – S5.8 |
| S6 Integration Design | 3 | LVS-S6.5 – S6.7 |
| S7 Phasing & Resourcing | 3 | LVS-S7.5 – S7.7 |
| **Total primary** | **23** | resolves to **19 universal + 23 = 42** objectives |

**Formula-bound items (8):** LVS-S3.5 c1/c2, S4.6 c1, S4.8 c1, S5.5 c1/c2, S5.8 c1, S7.6 c3.

**Amanah flag (1):** LVS-S7.7 c3 — advance-subscription meat/herd-share channels.

### What I need from you to proceed to encoding
1. **Framing A / B / C** (overlap with silvopasture) — default A.
2. **New primary type** `livestock_operation` confirmed (vs map-to-existing).
3. Any objective/checklist edits — add, cut, reword, or re-flag inline above.
4. `canBeSecondary` stays **false** (primary-only) unless you want it layerable.
