/**
 * homesteadSampleContent — the bespoke, per-objective authoring surface for the
 * Homestead — Atlas Sample (offline demo).
 *
 * This module is deliberately ISOLATED from the wiring + completion seeder
 * (`seedHomesteadSample.ts`). The seeder iterates the *resolved* objective set
 * and drives completion mechanically; it reads this map only for the human-
 * facing curated content layered on top of that completion. A missing entry is
 * always safe — the seeder falls back to a generic stub, so the project is
 * fully *completable* even while authoring is in progress. This split lets the
 * per-stratum prose be authored (and reviewed) independently of the mechanics.
 *
 * Keyed by the EXACT plan-objective ids the homestead configuration resolves
 * (universal + `hms-*` primary; see
 * `packages/shared/src/constants/plan/catalogues/{universal,homestead}.ts`).
 *
 * AMANAH / covenant note. The only money-touching objective is
 * `hms-s7-budget-input-reduction` — framed strictly as HOUSEHOLD PROVISION and
 * input-cost reduction, never revenue / sales / customers / subscription /
 * advance-sale, and NEVER CSA / CSRA / salam framing (permitted capital
 * channels are charitable donation, restricted donation, qard ḥasan, in-kind,
 * sponsorship). The same guard applies to any coherence-amendment text: the
 * coherence store silently drops advance-sale / CSA vocabulary at its
 * persistence boundary, which would leave the Coherence Record unsealed — so
 * every curated string here stays covenant-clean by construction.
 *
 * IMPORTANT (Threshold 1 coupling). Do NOT author `visionForm` content for the
 * Tier-0 `s1-vision-classify` / `s1-vision-constraints` captures here. The
 * Reality Check derives its intent elements from those captures when present and
 * falls back to `metadata.visionProfile` otherwise; the completion seeder
 * classifies the *profile-derived* elements. Seeding classify/constraints
 * captures would fork the element ids and leave the threshold reading
 * unclassified. Keep vision content on the other `s1-vision` surfaces.
 */

/**
 * One objective's curated content. Every field is optional: the seeder applies
 * whatever is present and skips the rest. Completion (checklist ticks, strata,
 * thresholds, milestones) is handled mechanically by the seeder and never
 * depends on anything here.
 */
export interface ObjectiveContent {
  /**
   * Steward-entered operating-threshold / parameter values, keyed by the
   * objective's `parameterGroup` item id. Applied via
   * `planStratumStore.setParameterValue`. Display-only — NOT a completion gate.
   */
  itemValues?: Record<string, string>;
  /** Free-text steward note for the objective (Act evidence). */
  notes?: string;
  /** Decision rationale prose (Act evidence). */
  rationale?: string;
  /**
   * Vision-form field values for objectives backed by a structured Act capture
   * (e.g. the `s1-vision` vision-builder). Shape is per-capture. See the
   * Threshold-1 coupling note above before authoring classify/constraints.
   */
  visionForm?: Record<string, unknown>;
  /** Lightweight evidence placeholders surfaced on the Act objective. */
  evidence?: {
    photos?: { itemId: string; caption: string; dataUri?: string }[];
    /** Evidence-descriptor ids to mark confirmed. */
    confirms?: string[];
  };
}

/**
 * The bespoke content, keyed by resolved objective id. Authored per stratum in
 * Phase 3. Entries may be added incrementally — the seeder tolerates a partial
 * map. (Intentionally starts empty: Phase 2 ships mechanical completion with a
 * generic stub; Phase 3 fills these with covenant-aligned, homestead-specific
 * prose drawn from the steward persona and the operator's chosen property.)
 */
export const HOMESTEAD_SAMPLE_CONTENT: Record<string, ObjectiveContent> = {
  // -------------------------------------------------------------------------
  // Stratum 1 -- Project Foundation
  // -------------------------------------------------------------------------
  "s1-vision": {
    notes:
      "Yusuf and Amina set the homestead's purpose plainly: feed the household first, build soil and water security, and leave the land more alive each year -- stewardship of the land as an amanah. Success for the first cycle was written as measurable provision, water, and soil targets the whole family agreed to.",
    rationale:
      "We chose household provision as the north star rather than market output: every system is sized to the family's real needs, and any surplus is treated as a blessing to share, not a product to sell. Naming the non-negotiables now keeps later design honest when trade-offs appear.",
  },
  "s1-steward": {
    notes:
      "The steward team was constituted around the household: Yusuf and Amina as primary stewards, Bilal carrying water and woodlot responsibilities, with a local water-systems contractor queued for the harvesting build. Labour, capital, skills, and decision rights were inventoried by domain.",
    rationale:
      "We assigned decision rights by domain so authority sits with whoever carries the work -- water with Bilal, household provision with Amina -- and named the one skill gap, water earthworks, that we will contract rather than force. Governance follows shura: the household sets its priorities together.",
  },
  "s1-boundaries": {
    notes:
      "Property boundaries were walked and mapped against title; easements, the access track, and the existing dwelling envelope were confirmed. Permitted uses, water entitlements, and the permits needed for water harvesting and minor earthworks were recorded.",
    rationale:
      "Establishing the legal envelope before any design protects the amanah -- we will not commit water or earthworks the title or permits do not allow. Knowing our entitlements up front lets the water strategy be built on rights we actually hold.",
  },
  "s1-stakeholders": {
    notes:
      "Neighbours sharing each boundary were mapped, along with the local authority officer for earthworks and the relationships of goodwill already in place. Preferred ways to keep each party informed were noted.",
    rationale:
      "A homestead lives inside a neighbourhood; mapping shared boundaries and goodwill early lets us harvest water and run animals as a good neighbour rather than a surprise. Relationships are part of the land's resilience.",
  },
  "hms-s1-household-needs": {
    notes:
      "The household's food needs were listed by category -- vegetables, fruit, protein, dairy, staples -- with current annual spend as the baseline and a self-sufficiency target set against each. Non-food needs the land could supply and the needs that will always be bought in were recorded, and the family agreed the minimum provision threshold that makes the homestead viable.",
    rationale:
      "Defining provision targets against an honest baseline keeps the whole plan anchored to real household needs rather than ambition. Naming what we will always source externally prevents over-building and keeps the homestead within the family's true capacity.",
  },

  // -------------------------------------------------------------------------
  // Stratum 2 -- Land Reading
  // -------------------------------------------------------------------------
  "s2-terrain": {
    notes:
      "A contour read of the site mapped slope, aspect, drainage divides, ridgelines, and the low hollows where water gathers. The areas showing erosion or instability were flagged as off-limits for intensive use.",
    rationale:
      "Reading the land's shape first lets water and zones follow the contour rather than fight it -- the foundation of a low-input homestead. Marking the unstable ground now keeps the family and the soil safe later.",
  },
  "s2-climate": {
    notes:
      "Seasonal rainfall, prevailing winds, frost dates, sun angles, and the fire-risk sector were recorded, along with the microclimates that warm or shelter parts of the site. The patterns were logged season by season.",
    rationale:
      "Climate and sectors decide what can grow where and how water must be stored across the dry months; capturing them honestly keeps the design resilient to the seasons rather than to an average year. The fire sector shapes where shelter and stores belong.",
  },
  "s2-ecology": {
    notes:
      "Existing vegetation, native and invasive species, wildlife corridors, and the water-dependent habitat were recorded by zone. Habitat connections to the surrounding land were noted as assets to protect.",
    rationale:
      "Stewarding the land as an amanah means building on the living systems already present rather than erasing them -- the existing ecology becomes the design's ally. Protecting corridors keeps the land more alive each year, as the vision asks.",
  },
  "s2-infrastructure": {
    notes:
      "Every track, building, fence, and utility line was mapped, with a condition assessment on the existing dwelling and outbuildings. Legal access points and the constraints on them were confirmed.",
    rationale:
      "Working with the infrastructure already on site -- especially the existing dwelling that becomes the homebase -- keeps the build within a modest budget. Knowing what stands and what is sound tells us what to repair before we add anything new.",
  },
  "hms-s2-resource-flows": {
    notes:
      "The household's current food sources, waste streams, energy use, and organic outputs -- kitchen scraps, garden waste, grey-water potential -- were surveyed, and the external inputs that home production could replace were identified. Seasonal swings in consumption and waste were noted.",
    rationale:
      "Mapping what flows through the household shows where bought-in inputs can be closed into on-site cycles -- the first step to reducing dependence. Treating waste as a fertility resource rather than a problem is how the homestead builds soil for free.",
  },
  "hms-s2-productive-capacity": {
    notes:
      "Existing fruit trees, perennials, water storage, compost, and animal infrastructure were inventoried and their condition and yield potential assessed, alongside the zones of healthy versus degraded soil. What already produces was distinguished from what needs rebuilding.",
    rationale:
      "Counting the productive capacity already on the land prevents us from buying what we already have and points the first season's effort at quick, real gains. Building on existing trees and infrastructure honours the work of those who tended the land before us.",
  },
  "hms-s2-landscape-vectors": {
    notes:
      "The surrounding land uses within reach of the site were mapped for spray drift, runoff, and upstream water-contamination risk, with prevailing wind assessed against any neighbouring chemical use. Landscape-scale pest pressure and shared-resource opportunities were recorded.",
    rationale:
      "A clean, safe household provision depends on what crosses the boundary as much as what happens inside it; naming drift and runoff risks lets us site sensitive food zones and water catchment defensively. Knowing the upstream risks protects the family's water and food.",
  },

  // -------------------------------------------------------------------------
  // Stratum 3 -- Systems Reading
  // -------------------------------------------------------------------------
  "s3-hydrology": {
    notes:
      "Surface flows, catchment areas, springs and seeps, infiltration by zone, and the existing drainage were mapped to show how water actually moves across the site through the seasons. The wet-season and dry-season behaviour were both recorded.",
    rationale:
      "Water is the homestead's first system, so understanding how it arrives, moves, and leaves comes before any decision that depends on it. Reading the hydrology honestly lets us slow, spread, and store water where the land already wants to hold it.",
  },
  "s3-soil": {
    notes:
      "Soil profiles were dug at representative points, with texture, structure, horizon colour, pH, organic matter, and basic nutrients recorded and the soil types mapped across the site. Drainage and water-holding were assessed zone by zone.",
    rationale:
      "Soil is the capital the whole homestead grows from; a baseline read tells us where to build fertility first and what each zone can realistically carry. Knowing the starting point is how we will measure the land growing more alive over the years.",
  },
  "hms-s3-water-quality": {
    notes:
      "Every drinking, cooking, and irrigation source was tested for biological and chemical contamination relevant to the landscape-vector findings, the rainwater catchment surfaces were checked, and a potability status was set for each source -- drinking, cooking, irrigation, or animal use only. Seasonal variation was logged.",
    rationale:
      "Provision the family drinks and eats from must be safe before it is plentiful; classifying each source by fitness protects health and directs treatment only where it is genuinely needed. Clean water is the first duty of stewardship over the household.",
  },

  // -------------------------------------------------------------------------
  // Stratum 4 -- Foundation Decisions
  // -------------------------------------------------------------------------
  "s4-water-strategy": {
    notes:
      "Total household and production demand was assessed against rainfall, the shallow groundwater, and surface flows, and a primary plus backup supply was selected: rainwater harvesting and swales first, with storage sized to carry the household through the dry season. A conservation and drought-response protocol was written.",
    rationale:
      "We chose to secure water before anything else, because every other system on the homestead depends on it -- the family's water-first sequencing made concrete. Rainwater and swales were preferred over drawing down groundwater so the strategy regenerates the site rather than depleting it.",
  },
  "s4-zones": {
    notes:
      "A zone framework was set by frequency of use and energy: zone 0 the existing dwelling as homebase, the intensive kitchen garden nearest, food production and orchard beyond, animals and broadacre further out, and the managed woodlot and conservation ground at the edge. Sector influences and enterprise conflicts were resolved against the survey findings.",
    rationale:
      "Permaculture zoning places the most-tended systems closest to the home so the family's daily energy goes the shortest distance -- the heart of a low-input homestead. Anchoring zone 0 on the existing dwelling means the whole layout grows outward from where life already happens.",
  },
  "hms-s4-food-production-strategy": {
    notes:
      "Household food needs were matched against what the site can grow, and primary methods were chosen -- annual beds, perennial fruit, staple crops, and integrated animals -- with first-cycle targets set for the high-frequency foods the family eats most. Seed-saving and preservation approaches were defined.",
    rationale:
      "Production was aimed first at the foods the household buys most often, so provision rises and grocery dependence falls from the earliest season. Saving seed and preserving the harvest turns a good season into year-round provision and frees the homestead from buying in each year.",
  },
  "hms-s4-fertility-strategy": {
    notes:
      "A whole-homestead fertility approach was set: hot and worm composting fed by kitchen scraps, garden waste, and animal manure; a mulching strategy by zone; cover crops and green manures in the garden; and animal integration cycling fertility back to the soil. External-input reduction targets were named with dates.",
    rationale:
      "Building fertility from the homestead's own organic flows is how the soil grows richer each year without bought-in inputs -- closing the loop the resource-flow survey opened. Integrating the animals into the fertility cycle makes them earn their keep in soil as well as food.",
  },
  "hms-s4-energy-shelter-resilience": {
    notes:
      "The existing shelter was assessed for all-season adequacy, and strategies were set for heating, backup power, and the critical systems -- water pump, refrigeration, communications -- that must stay running. A minimum resilience threshold and the priority improvements needed before Act were defined.",
    rationale:
      "A homestead must keep the household warm, fed, and watered through disruption, so we named the minimum standard to hold rather than chasing full independence beyond the budget. Heating with wood from the managed woodlot keeps the family resilient on a resource the land itself renews.",
  },

  // -------------------------------------------------------------------------
  // Stratum 5 -- System Design
  // -------------------------------------------------------------------------
  "s5-access": {
    notes:
      "A primary vehicle route was designed from the entry to each working zone, with track standards by use, pedestrian paths between the dwelling, garden, and animal areas, and turning and passing points for a delivery vehicle. Conflicts between vehicle, animal, and foot traffic were resolved.",
    rationale:
      "Access is designed once so the family's daily movement and the occasional heavy delivery both work without churning soil or crossing the animals' paths. Keeping vehicles to defined tracks protects the garden beds and the swales from compaction.",
  },
  "s5-water-infrastructure": {
    notes:
      "The harvesting and storage system was specified -- swales on contour, tanks at the dwelling, and a pond in the low hollow -- with a gravity-fed distribution network, overflow and spillway design, and materials and construction standards. Storage locations and capacities were fixed to the demand assessment.",
    rationale:
      "Gravity feed from high storage was chosen over pumping wherever the contour allows, so the water system keeps working when power does not -- resilience built into the design. Overflow and spillways were specified up front because an unplanned overflow is how water systems damage the land they were meant to serve.",
  },
  "s5-soil-improvement": {
    notes:
      "A zone-by-zone soil improvement program was designed -- composting, mulching, and cover cropping with application rates and timing -- the equipment needs defined, the first-cycle priority zones chosen, and a soil-health baseline set for tracking improvement. The kitchen garden and orchard were prioritised for the first cycle.",
    rationale:
      "Improvement effort was concentrated on the zones the household eats from first, so limited labour and compost return the fastest provision. Setting a measurable baseline now is how the family will see the soil growing more alive cycle after cycle.",
  },
  "hms-s5-food-zones-layout": {
    notes:
      "The kitchen garden was laid out with bed dimensions, paths, and orientation; annual rotation blocks, perennial orchard and berry zones, herb and medicinal beds, and a nursery and seed-saving area were sited; and the layout was tied into the fertility system's compost and mulch routes. Protected growing was included where the season requires it.",
    rationale:
      "The garden was designed so daily harvesting, watering, and composting follow the shortest, most natural paths from the dwelling -- keeping the highest-care zone genuinely low-effort. Integrating the beds with the compost and mulch routes means fertility reaches the food without extra carrying.",
  },
  "hms-s5-energy-shelter-systems": {
    notes:
      "Heating was designed around wood-fuel storage, stove placement, and passive-solar improvements; insulation upgrades were specified for seasonal performance; a backup power system was sized and sited; and the woodlot and woodshed were laid out for fuel security. Priority shelter repairs were specified.",
    rationale:
      "Designing the woodlot and woodshed alongside the stove ties the household's heat to a fuel the land renews, closing the energy loop the way the water and fertility loops close. Insulation was prioritised before generation because the cheapest energy is the energy the shelter does not lose.",
  },
  "hms-s5-animal-husbandry": {
    notes:
      "Housing for poultry and small ruminants was designed -- coops, pens, and shelters by species -- with secure runs, predator exclusion, feed storage, water delivery to every animal area, and a manure-management system that captures fertility for the garden. Grazing areas were sized to the land's carrying capacity.",
    rationale:
      "The animals were housed and fenced to keep them safe and the household provided with eggs, meat, and milk, while their manure was deliberately routed into the fertility cycle. Sizing grazing to carrying capacity keeps the animals a regenerative part of the land rather than a pressure on it -- husbandry as a trust.",
  },

  // -------------------------------------------------------------------------
  // Stratum 6 -- Integration Design
  // -------------------------------------------------------------------------
  "s6-monitoring": {
    notes:
      "Key indicators across water, soil, food production, and animals were defined, with data-collection methods, recording formats, monitoring frequency, and a named person responsible for each stream. The trigger points at which Observe data initiates a Plan review were set.",
    rationale:
      "A homestead improves only as fast as it can see itself, so monitoring was kept simple enough to actually maintain and pointed at the few indicators that matter most. Defining review triggers now closes the loop between watching the land and changing the plan.",
  },
  "hms-s6-self-sufficiency-feedback": {
    notes:
      "A provision-tracking system was designed to record what was grown, preserved, and consumed from the homestead each season, alongside a gap log of what was still purchased and at what cost, both tied back to the household's self-sufficiency targets. A seasonal review rhythm and a record format simple enough to keep were set.",
    rationale:
      "Measuring provision against the original baseline turns self-sufficiency from an aspiration into something the family can see rising season by season. The tracker was kept deliberately simple, because a record the household will keep beats a perfect one it abandons.",
  },

  // -------------------------------------------------------------------------
  // Stratum 7 -- Phasing & Resourcing
  // -------------------------------------------------------------------------
  "s7-phase1": {
    notes:
      "Phase 1 scope was set -- water harvesting, the kitchen garden, and the first poultry -- sequenced in implementation order with responsibilities assigned and completion milestones defined. The scope was confirmed against the capacity and resource plan.",
    rationale:
      "Phase 1 leads with water and the kitchen garden because they secure the homestead's foundation and return household provision fastest -- sequencing matched to the water-first vision. Scope was held to what the family's real labour and budget can finish, so the first phase ends in completion rather than exhaustion.",
  },
  "s7-resource-plan": {
    notes:
      "Labour was estimated by task and season for Phase 1, skill gaps and the one contractor requirement identified, equipment needs and sourcing defined, and capital requirements estimated by category with procurement priorities set. The plan was reconciled against the household's available time and budget.",
    rationale:
      "Resourcing was built from an honest read of the family's hours and modest budget, so the plan fits the capacity that actually exists rather than an ideal one. Naming the single contracted task keeps the rest of the work within the household's own hands and means.",
  },
  "s7-risk-register": {
    notes:
      "The top risks to Phase 1 -- drought in the establishment season, a water-harvesting build delay, predator loss of poultry, and a labour shortfall at peak -- were assessed for likelihood and impact, each given a contingency response, early-warning indicators, and a monitoring owner. The register was kept to the few risks that genuinely threaten the phase.",
    rationale:
      "Naming the handful of risks that could actually stall Phase 1, with a response ready for each, lets the family act calmly instead of scrambling when one arrives. Tying each risk to an early-warning indicator turns the monitoring system into the homestead's defence.",
  },
  "hms-s7-provision-phasing": {
    notes:
      "Fast-yielding provision -- salad greens, herbs, eggs, and sprouts -- was sequenced for immediate planting, with annual vegetables and preserving crops in the medium term and the orchard, perennials, and staples as the long horizon. Ecological readiness criteria were set for each layer, and the sequence was confirmed to reduce grocery spend from the earliest possible point.",
    rationale:
      "Quick wins were planted first so the household sees real food and falling grocery bills within the first season, sustaining the family's momentum through the slower perennial build. Gating each production layer on soil and water readiness keeps provision from being planted faster than the land can carry it.",
  },
  "hms-s7-budget-input-reduction": {
    notes:
      "Current annual household food and supply spend was recorded as the baseline, the spend categories to be reduced in Phase 1 were mapped with target reductions, input-reduction milestones were set by planning cycle, and the remaining external inputs that cannot yet be replaced were named with their cost. A minimum viability threshold for the household was agreed.",
    rationale:
      "The financial aim is reducing what the household must buy in, not earning a return -- provision and input substitution, measured against the family's own baseline. Any future surplus is treated as a blessing to share rather than a product, so this stays a household-provision plan, funded from the family's own savings and in-kind effort, never from advance sale of what the land has not yet grown.",
  },
  "hms-s7-adaptive-management": {
    notes:
      "An annual review process was defined -- what monitoring data is read and by whom -- with decision triggers for when a gap requires a plan change, a record of how and why changes are made, a three-year comprehensive review against the original self-sufficiency targets, and contingency responses for provision shortfalls. The protocol named who acts when a target is missed.",
    rationale:
      "A homestead meets a changing climate and a changing household over years, so the plan was built to adapt deliberately rather than drift. Reviewing against the original self-sufficiency targets keeps adaptation honest -- changing the method when needed, but never quietly lowering the provision the family set out to secure.",
  },
};
