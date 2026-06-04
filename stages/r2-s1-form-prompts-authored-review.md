# R2 -- per-type s1 intent form prompts: AUTHORED copy (for review)

**Phase:** R2 | **Status:** review -- authored by Claude at operator's explicit request 2026-06-03
("act as a legendary biodynamics/permaculture/SaaS expert and do it for me").
**Granularity:** one form tool per objective (the recommended default).
**Convention:** `formId` = objective id; `category: 'vision'`; icon chosen at wiring time.
**Operator review focus:** the hard-gate / Amanah-flagged blocks (marked [GATE] / [AMANAH]) -- confirm wording.
No riba/gharar introduced. CSA stays a listed channel (catalogue text); advance-purchase + carbon/
biodiversity credits carry a Scholar-Council routing note, per standing constraint.

Format per entry: `objective-id` | label | prompt | placeholder

---

## SILVOPASTURE

**silv-s1-enterprise-mix** [GATE: stock arrives only after fencing/water/handling pass go/no-go]
- label: `Enterprise mix`
- prompt: `Define your livestock enterprise mix and stocking strategy`
- placeholder: `Name the species and breeds you will run and the production intent of each (meat, milk, fibre, eggs, or land improvement). State stocking density against the land's carrying capacity, the rationale for this herd mix, and confirm it fits land type, labour, and market. No stock arrives before fencing, water, and handling pass go/no-go.`

**silv-s1-land-improvement-philosophy**
- label: `Land-improvement`
- prompt: `State your land-improvement philosophy and grazing integration strategy`
- placeholder: `Describe what grazing is designed to improve here -- soil, pasture productivity, ecological condition, or a blend -- and the outcomes you want (plant diversity, soil biology, infiltration). Define grazing windows and rest periods per zone, and confirm they serve those outcomes and your production intent.`

**silv-s1-animal-welfare**
- label: `Welfare ethic`
- prompt: `Define your livestock welfare philosophy and duty of care`
- placeholder: `Set out what excellent care means for each species, your welfare non-negotiables (breed, stocking density, access to feed/water/shelter), health and vaccination protocols, and humane handling and slaughter intent. Confirm this standard fits your production goals -- it gates all downstream livestock design.`

**silv-sec-s1-livestock-intent** (secondary overlay)
- label: `Livestock intent`
- prompt: `Define the livestock integration rationale for this overlay`
- placeholder: `Explain whether grazing here is a land-management tool, a production enterprise, or both, and which species/classes you are considering. Describe how the stock relate to the primary enterprise (complementary, supplementary, or competing for land), your experience and daily labour, and confirm fit with the primary vision and site scale.`

## HOMESTEAD

**hms-s1-household-needs**
- label: `Household needs`
- prompt: `Assess household needs and domestic enterprise scope`
- placeholder: `Record who lives here and their ages, your food-production target (subsistence, supplementary, or commercial), and whether any domestic enterprise is for own use or sale. Note the labour available, accessibility needs (mobility, health, age), and space requirements for dwelling, gardens, and outbuildings. Confirm all occupants agree before design begins.`

## REGENERATIVE FARM

**rf-s1-enterprise-mix**
- label: `Enterprise mix`
- prompt: `Define the farm enterprise mix and market channels`
- placeholder: `State your primary market channel (wholesale, direct-to-consumer, or mixed) and the crop and livestock enterprises you will run, with production targets and a seasonal calendar for each. Identify customer base and demand, confirm the mix fits soil, water, and labour and aligns with your regenerative principles, and note how you will decide to add or drop enterprises.`

## MARKET GARDEN

**mgd-s1-production-targets-sales** [AMANAH: CSA listed; route advance-purchase to Scholar Council]
- label: `Targets & sales`
- prompt: `Set production targets and your sales-channel strategy`
- placeholder: `State your target annual harvest value and primary market channel (farmers market, wholesale, CSA, online, restaurant supply, or hybrid), with the customer base and growth path for each. Define pricing and margin targets, and confirm the plan is realistic for a Year 1 ramp and Years 2-3 stabilisation. Route any advance-purchase or membership-prepayment model to the Scholar Council before committing.`

**mgd-s1-growing-system-philosophy**
- label: `Growing system`
- prompt: `Define your growing-system philosophy and regenerative approach`
- placeholder: `Describe your core growing philosophy (organic, regenerative, IPM, biodynamic, or hybrid), your soil-health targets (fertility, microbial life, water retention), and your approach to pests, disease, rotation, and succession. State your variety-selection and seed-saving stance (hybrid vs heirloom, productivity vs resilience) and confirm it fits your knowledge and site.`

**mgd-s1-market-channels**
- label: `Food safety`
- prompt: `Define market-channel compliance and food-safety framework`
- placeholder: `For each channel you sell through, record the food-safety, labelling, certification, and traceability requirements, plus packaging and cold-chain needs by product. Rank channels by compliance burden, set a compliance calendar (inspections, renewals), and confirm you have sought regulatory advice before first sale.`

## ORCHARD

**orch-s1-species-philosophy**
- label: `Species ethos`
- prompt: `Define your orchard species philosophy and portfolio strategy`
- placeholder: `State your core species philosophy (heritage, climate-adapted, productivity, or conservation focus) and the candidate species suited to your climate, soil, and water -- favour local provenance. Note disease and pest resistance needs, your portfolio shape (monoculture, polyculture, or agroforestry), and confirm choices hold up against climate projections across a 50+ year orchard life.`

**orch-s1-production-intent**
- label: `Production intent`
- prompt: `Define production intent and harvest/processing strategy`
- placeholder: `State your primary intent (subsistence, local market, wholesale, or value-added processing), your target yield per hectare, and harvest timing across the season. Describe your processing and preservation approach (fresh, dried, fermented, pressed, frozen), storage requirements, and confirm the plan matches available labour.`

**orch-s1-provenance-sourcing** [GATE: do not accept non-refundable stock before infra ready]
- label: `Stock sourcing`
- prompt: `Define tree-stock provenance and sourcing strategy`
- placeholder: `State your provenance preference and candidate nurseries, the tree size at planting (bare-root, small pot, large specimen), and establishment support (guards, mulch, staking, irrigation). Set quality standards and rejection criteria for received stock. Tree stock is often non-refundable -- do not accept delivery until soil, water, and protection are confirmed ready.`

## LIVESTOCK OPERATION

**lvs-s1-enterprise-vision**
- label: `Enterprise vision`
- prompt: `Define the livestock enterprise vision and systems outcome`
- placeholder: `State the enterprise purpose (meat, milk, fibre, breeding stock, land management, or a blend), the target species and classes, and your volume and quality targets with seasonal rhythms. Identify market channels and customer base, and confirm the vision fits your knowledge and site scale -- it gates all downstream systems design.`

**lvs-s1-production-goals**
- label: `Production goals`
- prompt: `Set production goals and financial performance targets`
- placeholder: `State target annual volume per commodity, quality and grading targets, and the timeline to peak output. Set a target net income or profit per year and check it against realistic gross-margin and cost assumptions. Confirm all operators agree on the goals and financial expectations.`

**lvs-s1-welfare-ethic**
- label: `Welfare ethic`
- prompt: `Define the livestock welfare ethic and duty of care`
- placeholder: `Set out what excellent care means for each species and production stage, your welfare non-negotiables (breed, stocking density, housing), and your health, vaccination, handling, and humane-slaughter protocols. This ethic gates all production design -- every system must meet it.`

**lvs-sec-s1-enterprise-intent** (secondary overlay)
- label: `Enterprise intent`
- prompt: `Define livestock enterprise intent and host-integration rationale`
- placeholder: `State whether the herd is for product (meat, milk, fibre, eggs), land-management service, or both, and the candidate species and classes. Describe how it relates to the host enterprise (complementary, supplementary, or competing for land and labour), your experience and daily labour, and confirm fit with the host vision, scale, and stewardship capacity.`

## CONSERVATION

**con-s1-conservation-intent**
- label: `Conservation aim`
- prompt: `Define conservation intent and ecological outcome targets`
- placeholder: `Describe the reference ecological state you are restoring toward and the target species and habitat types with their spatial extent. Set measurable outcome targets at 5, 10, and 25 years, define the minimum acceptable Phase 1 state, and confirm targets are achievable given site conditions and landscape context.`

**con-s1-intervention-philosophy** [GATE: S4-S5 design judged against this first]
- label: `Intervention`
- prompt: `Define your intervention philosophy and non-negotiables`
- placeholder: `State your stance -- passive rewilding, assisted natural regeneration, active restoration, or hybrid -- and list acceptable and prohibited methods. Define what evidence triggers active intervention versus letting nature recover, and confirm agreement among all decision-makers. Every S4-S5 design is judged against this first.`

**con-s1-tenure-covenant** [AMANAH: route carbon/biodiversity-credit agreements to Scholar Council]
- label: `Tenure & covenant`
- prompt: `Define land tenure and conservation covenant strategy`
- placeholder: `Evaluate the conservation instruments available (covenants, reserve declarations, easements, carbon agreements) and their effect on management flexibility. Choose a covenant strategy that matches your intent, identify the provider or registering body, and confirm terms do not conflict with planned interventions. Obtain legal advice before executing anything, and route any carbon or biodiversity-credit agreement to the Scholar Council first.`

## OFF-GRID

**ofg-s1-resilience-philosophy** [GATE: targets size every Tier 3-4 decision]
- label: `Resilience aim`
- prompt: `Define resilience philosophy and independence targets`
- placeholder: `Set an independence target for each critical system -- water, energy, food, communications, shelter -- and where full independence is not the aim, the acceptable backup or grid connection. State the worst-case duration all systems must run without resupply, and confirm targets are achievable against site potential. These targets size every Tier 3-4 decision.`

**ofg-s1-critical-systems-redundancy**
- label: `Redundancy`
- prompt: `Define critical systems and redundancy requirements`
- placeholder: `Classify every system by criticality (life-safety, essential, convenience) and set redundancy for each life-safety system (dual source, backup storage, manual fallback). Define minimum viable operation during failure, the maximum acceptable downtime before a life-safety threshold is breached, and confirm the redundancy is achievable on this site.`

## AGRITOURISM

**ag-s1-experience-vision**
- label: `Experience vision`
- prompt: `Define the visitor experience vision and commercial model`
- placeholder: `Describe the core guest experience in plain language and what makes this farm distinct. Identify visitor types (day, overnight, retreat, school groups), the commercial proposition and price point, and the hospitality identity. Confirm it fits steward capacity, and record what will never be compromised for commercial gain.`

**ag-s1-visitor-capacity**
- label: `Visitor capacity`
- prompt: `Define visitor capacity and operational boundaries`
- placeholder: `Set the maximum simultaneous guest capacity across accommodation, dining, and programming, and limits per visit type. Define which farm activities are incompatible with guests present, seasonal peak and off-peak limits, and confirm capacity is consistent with regulation and infrastructure.`

**ag-s1-regulatory-framework**
- label: `Licensing`
- prompt: `Define the regulatory and licensing framework`
- placeholder: `Record the food-service permits, accommodation licensing, public-liability insurance, and health-and-safety requirements for public access, plus any resource consents for visitor infrastructure. Build a compliance calendar of renewal dates and ongoing obligations.`

## ECOVILLAGE

**ev-s1-legal-governance**
- label: `Governance`
- prompt: `Define legal entity, tenure, and governance model`
- placeholder: `Evaluate legal entity options (land trust, co-operative, company, charitable trust, incorporated society), select one with rationale, and define your land-tenure model. Set the decision-making framework (consensus, sociocracy, majority, hybrid), financial governance (how funds are held, authorised, reported), and membership rights and obligations. Obtain legal advice before finalising.`

**ev-s1-provision-balance**
- label: `Provision balance`
- prompt: `Define the communal vs private provision balance`
- placeholder: `Define communal infrastructure commitments (water, energy, sanitation, shared buildings), your food-system approach (communal, individual plots, or hybrid), and the financial sharing model. Set private household entitlements (space, resources, privacy), resolve communal-efficiency vs household-autonomy tensions, and confirm all founding members agree.`

**ev-s1-conflict-framework** [GATE: framework must be signed before Act begins]
- label: `Conflict resolution`
- prompt: `Define conflict resolution and community agreements`
- placeholder: `Define your formal decision process with quorum, the dispute-resolution pathway (informal, mediation, arbitration), and community agreements on behaviour, noise, visitors, and shared space. Set the member exit process and a dissolution protocol for asset distribution, plus a regular review cadence. This framework must be signed before Act begins -- not after.`

## EDUCATION

**edu-s1-mission-audience**
- label: `Mission`
- prompt: `Define the educational mission and target audience`
- placeholder: `State your primary educational mission in plain language and the primary audience (school groups, farmers, public, practitioners, children). Define learning outcomes per program type and what this living site teaches that a classroom cannot, then confirm the mission fits your knowledge and site capacity.`

**edu-s1-curriculum-programs**
- label: `Curriculum`
- prompt: `Define the curriculum framework and program types`
- placeholder: `Define your program types (day workshops, tours, school excursions, residencies, online hybrid), the curriculum themes per type (soil, food systems, ecology, design), and the maximum group size for each. Set an annual calendar with seasonality, confirm consistency with your mission, and note your curriculum review process.`

**edu-s1-regulatory-framework** [GATE: no public program before permits + insurance]
- label: `Compliance`
- prompt: `Define the regulatory and accreditation framework`
- placeholder: `Record public-access and liability insurance, working-with-children or vulnerable-persons requirements, food-handling permits if you serve food, and building permits for teaching structures. Note any accreditation intent (RTO, CPD, curriculum alignment) and a compliance calendar. Hard gate: no public program runs before permits and insurance are confirmed.`

## WELLNESS

**well-s1-healing-philosophy**
- label: `Healing ethos`
- prompt: `Define the healing philosophy and therapeutic intent`
- placeholder: `State, in plain language, what this sanctuary believes about healing and the primary modalities offered (somatic, contemplative, nature-based, integrative). Define the therapeutic intent (restoration, recovery, deepening, retreat) and the non-negotiable environmental conditions -- silence thresholds, light quality, privacy. This philosophy constrains every Tier 3-4 decision.`

**well-s1-guest-intake**
- label: `Guest intake`
- prompt: `Define the guest intake and suitability framework`
- placeholder: `Describe the target guest profile and the conditions you actively welcome (burnout, grief, stress, life transition), those that require practitioner assessment first, and those outside scope needing clinical referral. Define how suitability is assessed, and confirm it stays within practitioner scope of practice.`

**well-s1-regulatory-standards** [GATE: no service until qualifications/registration/insurance]
- label: `Standards`
- prompt: `Define regulatory and professional standards`
- placeholder: `Record the practitioner qualifications required for each modality, registration and insurance, and scope-of-practice boundaries. Note health-and-safety, food-service, and accommodation licensing, and a compliance calendar (renewals, CPD, audits). Hard gate: no therapeutic service is offered until all qualifications, registrations, and insurance are confirmed.`

**well-s1-privacy-policy**
- label: `Privacy policy`
- prompt: `Define the privacy and confidentiality policy`
- placeholder: `State what guest information you collect and why, how it is stored, accessed, and retained, and the confidentiality obligations for all practitioners and staff. Define what triggers a mandatory disclosure and to whom, the guest consent process for any sharing, and confirm legal advice on privacy obligations in your jurisdiction.`

**well-sec-s1-healing-philosophy** (secondary overlay)
- label: `Healing overlay`
- prompt: `Define the healing philosophy for this wellness overlay`
- placeholder: `State the healing philosophy this wellness layer brings to the host project and the modalities offered alongside the primary land use. Define which host activities and conditions are compatible with therapeutic guest presence, the non-negotiable environmental conditions (silence, light, privacy), and confirm the overlay supports rather than competes with the primary purpose.`

**well-sec-s1-regulatory-standards** (secondary overlay) [GATE]
- label: `Overlay standards`
- prompt: `Confirm therapeutic regulatory and professional standards`
- placeholder: `Record practitioner qualifications and registrations per modality, professional insurance and scope of practice, and any therapeutic health-safety-licensing beyond the primary use. Set a compliance calendar for the layer. Hard gate: no therapeutic service runs alongside the primary use until qualifications, registrations, and insurance are confirmed.`

---

36 objectives authored (32 primary + 4 secondary). All ASCII. One form tool each.
