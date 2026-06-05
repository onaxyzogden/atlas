# R2 -- per-type s1 intent form prompts: authoring worksheet

**Phase:** R2 (form-arm capture for per-type s1 vision/intent objectives)
**Status:** draft -- awaiting operator-authored prompt content
**Date opened:** 2026-06-03
**Owner of content:** Yousef (operator). Claude will NOT fabricate any prompt/placeholder text.
**Decision recorded:** AskUserQuestion 2026-06-03 -- "Per-type authored prompts" chosen over generic
checklist-driven form or close-by-decision.

---

## What this worksheet is for

R1/R3 closed Gap A: every objective now carries an explicit Act-stage tool mapping. The 36
type-specific `s1` intent objectives below currently map to an intentional `[]` -- a checkbox +
note completes them, but they have no dedicated capture surface. R2 gives each one a **form-arm
tool**: a button on the Act rail that opens a `VisionFormModal` text-capture popup (the same
mechanism as the universal `purpose-statement` / `success-criteria` tools already in the catalog).

The universal `s1-vision` form tools are hardwired to universal prompts ("State the primary purpose
of **this land project**"), so they cannot be reused verbatim for, e.g., `hms-s1-household-needs`.
R2 therefore needs **new per-type prompt text** -- which is authored catalogue content, yours to write.

## How to fill it in (only 3 fields per objective)

For each objective block below, fill the three `>>` lines. Everything else is already determined:

- **Tool label** -- short button text on the rail (aim <= 20 chars, ASCII only). Shown under an icon.
- **Prompt** -- the one-line modal heading. Imperative voice, matching the catalog house style
  (e.g. "Inventory available labour -- hours per week, seasonal variation, skill level").
- **Placeholder** -- helper text inside the textarea. 1-3 sentences guiding what to write. May
  reference the checklist items shown.

You do NOT need to supply: the `formId` (convention = the objective id, pre-filled per block), the
icon (Claude will pick a lucide icon consistent with the type), the category (`vision`), or the
override wiring. ASCII only -- no smart quotes, em-dashes, or non-Latin characters.

### Granularity note
Default below = **one form tool per objective**. If you want a particular objective split into
several form tools (one per checklist item, like the universal s1-vision's 7), say so on its block
and I will expand it -- each sub-tool then binds `formId = <objective-id>-c1`, `-c2`, etc.

### Amanah note
Several objectives carry **hard-gate / regulatory** flags (preserved below). These remain
decision/gate objectives; a capture form does not change the gate. No sales, advance-purchase, or
financing instrument exists in any of these objectives, so nothing engages riba/gharar. The CSA
reference on `mgd-s1-production-targets-sales-c2` is operator-encoded catalogue text and is shown
verbatim -- do not reword it; if your prompt touches sales channels, keep the existing scopeNotes
intent (route advance-purchase models to Scholar Council).

### If you decide an objective should stay `[]`
Some of these may genuinely not warrant a form (pure legal/regulatory gates served by checklist +
note). Mark such a block `KEEP []` and I will leave its override untouched and record the rationale.

---

## SILVOPASTURE (3 primary + 1 secondary)

### silv-s1-enterprise-mix -- A clear livestock enterprise mix & stocking strategy
`formId: silv-s1-enterprise-mix` | category: vision
Captures: species/breeds; production intent per species; herd-mix rationale; stocking density /
carrying capacity; compatibility with land+labour+market; decision-maker agreement.
**Flag:** Hard gate -- no livestock arrive before fencing, water, and handling facilities pass independent go/no-go tests.
>> Tool label:
>> Prompt:
>> Placeholder:

### silv-s1-land-improvement-philosophy -- A clear land-improvement philosophy & grazing integration strategy
`formId: silv-s1-land-improvement-philosophy` | category: vision
Captures: land-improvement philosophy (soil/pasture/ecology); desired ecological outcomes; grazing
windows per zone; rest periods; alignment with production intent; gate on livestock mgmt design.
>> Tool label:
>> Prompt:
>> Placeholder:

### silv-s1-animal-welfare -- A clear livestock welfare philosophy & duty of excellent care
`formId: silv-s1-animal-welfare` | category: vision
Captures: welfare philosophy per species; welfare non-negotiables (breed/density/feed/water/shelter);
health & vaccination protocols; humane handling & slaughter intent; compatibility with production;
gate on livestock design.
>> Tool label:
>> Prompt:
>> Placeholder:

### silv-sec-s1-livestock-intent -- A clear livestock enterprise intent & integration rationale (SECONDARY overlay)
`formId: silv-sec-s1-livestock-intent` | category: vision
Captures: integration rationale (tool vs enterprise vs both); candidate species/classes; relation to
primary enterprise; operator experience + labour; compatibility with primary vision & site scale.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## HOMESTEAD (1)

### hms-s1-household-needs -- A sound household needs assessment & domestic enterprise scope
`formId: hms-s1-household-needs` | category: vision
Captures: household composition & ages; food production target (subsistence/supplementary/commercial);
domestic enterprise scope (own use vs sale); household labour; accessibility requirements; space
requirements (dwelling/gardens/outbuildings); occupant agreement.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## REGENERATIVE FARM (1)

### rf-s1-enterprise-mix -- A clear regenerative farm enterprise mix & market channels
`formId: rf-s1-enterprise-mix` | category: vision
Captures: primary market channel (wholesale/DTC/mixed); crop+livestock enterprise mix; production
targets & seasonal calendar; customer base & demand; achievability within soil/water/labour;
alignment with regenerative principles; add/remove-enterprise decision process; operator agreement.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## MARKET GARDEN (3)

### mgd-s1-production-targets-sales -- A clear market-garden production target & sales channel strategy
`formId: mgd-s1-production-targets-sales` | category: vision
Captures: target annual harvest value; primary market channel (farmers market / wholesale / **CSA** /
online / restaurant / hybrid); customer base & growth; achievability within soil/water/labour;
pricing & margin targets; Year-1 ramp vs Years 2-3 realism.
**Flag:** Channel list includes CSA (operator-encoded). Keep existing scopeNotes intent -- route any
advance-purchase / membership-prepayment model to Scholar Council (bay` ma laysa `indak). Do not reword.
>> Tool label:
>> Prompt:
>> Placeholder:

### mgd-s1-growing-system-philosophy -- A clear growing system philosophy & regenerative approach
`formId: mgd-s1-growing-system-philosophy` | category: vision
Captures: core growing philosophy (organic/regenerative/IPM/biodynamic/hybrid); soil-health targets;
pest/disease approach; rotation & succession; variety selection/saving philosophy; achievability
within operator knowledge & site.
>> Tool label:
>> Prompt:
>> Placeholder:

### mgd-s1-market-channels -- A sound market channel & food safety framework
`formId: mgd-s1-market-channels` | category: vision
Captures: food-safety compliance per channel; labelling/certification/traceability; packaging &
cold-chain; per-channel regulatory risk; compliance calendar; regulatory advice before first sale.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## ORCHARD (3)

### orch-s1-species-philosophy -- A clear orchard species philosophy & productive portfolio strategy
`formId: orch-s1-species-philosophy` | category: vision
Captures: core species philosophy (heritage/climate-adapted/productivity/conservation); candidate
species for site climate-soil-water (local provenance); disease/pest resistance needs; portfolio
(mono/poly/agroforestry); compatibility with 50+ yr climate projections; achievability.
>> Tool label:
>> Prompt:
>> Placeholder:

### orch-s1-production-intent -- A clear production intent & harvest / processing strategy
`formId: orch-s1-production-intent` | category: vision
Captures: production intent (subsistence/local/wholesale/value-added); target yield/ha; harvest
timing & season; processing/preservation approach; storage requirements; match to labour.
>> Tool label:
>> Prompt:
>> Placeholder:

### orch-s1-provenance-sourcing -- A sound tree stock provenance & sourcing strategy
`formId: orch-s1-provenance-sourcing` | category: vision
Captures: provenance preference; candidate nursery suppliers; tree size at planting; establishment
support (guards/mulch/staking/irrigation); availability vs timeline & budget; received-stock quality
standards & rejection criteria.
**Flag:** Tree stock often non-refundable -- do not accept delivery until soil/water/protection infra confirmed ready.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## LIVESTOCK OPERATION (3 primary + 1 secondary)

### lvs-s1-enterprise-vision -- A clear livestock enterprise vision & systems outcome
`formId: lvs-s1-enterprise-vision` | category: vision
Captures: enterprise purpose (meat/milk/fibre/breeding/land-mgmt/combo); target species & classes;
target volume & quality; market channels & customer base; achievability; gate on downstream systems.
>> Tool label:
>> Prompt:
>> Placeholder:

### lvs-s1-production-goals -- A clear production goal & financial performance target
`formId: lvs-s1-production-goals` | category: vision
Captures: target annual volume per commodity; quality/grading targets; production timeline to peak;
target net income/profit per year; financial-viability assessment (gross margin, cost assumptions);
operator agreement on goals & financials.
>> Tool label:
>> Prompt:
>> Placeholder:

### lvs-s1-welfare-ethic -- A clear livestock welfare ethic & duty of excellent care
`formId: lvs-s1-welfare-ethic` | category: vision
Captures: welfare ethic per species/stage; welfare non-negotiables (breed/density/housing); health &
vaccination protocols; humane handling (transport/loading/restraint); humane slaughter intent; gate
on production design.
>> Tool label:
>> Prompt:
>> Placeholder:

### lvs-sec-s1-enterprise-intent -- A clear livestock enterprise intent & host-integration rationale (SECONDARY overlay)
`formId: lvs-sec-s1-enterprise-intent` | category: vision
Captures: enterprise intent (product / land-mgmt service / both); candidate species & classes;
relation to host enterprise (complementary/supplementary/competing); operator experience + daily
labour; compatibility with host vision, scale, stewardship capacity.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## CONSERVATION (3)

### con-s1-conservation-intent -- Define conservation intent & ecological outcome targets
`formId: con-s1-conservation-intent` | category: vision
Captures: reference ecological state; target species (flora/fauna); target habitat types & extent;
measurable outcome targets w/ timeframes (5/10/25 yr); minimum acceptable Phase-1 state; achievability
given site & landscape context.
>> Tool label:
>> Prompt:
>> Placeholder:

### con-s1-intervention-philosophy -- Define intervention philosophy & non-negotiables
`formId: con-s1-intervention-philosophy` | category: vision
Captures: intervention philosophy (passive/assisted/active/hybrid); acceptable methods; prohibited
methods; decision threshold for active vs natural recovery; agreement by decision authorities.
**Flag:** All S4-S5 design must be evaluated against this philosophy first -- a violating design needs a philosophy revision, not a variation.
>> Tool label:
>> Prompt:
>> Placeholder:

### con-s1-tenure-covenant -- Define land tenure & conservation covenant strategy
`formId: con-s1-tenure-covenant` | category: vision
Captures: applicable instruments (covenants/reserves/easements/carbon credits); management-flexibility
implications; chosen covenant strategy; covenant provider/registering body; legal advice before
executing; covenant terms vs planned interventions.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## OFF-GRID (2)

### ofg-s1-resilience-philosophy -- Define resilience philosophy & independence targets
`formId: ofg-s1-resilience-philosophy` | category: vision
Captures: independence target per critical system (water/energy/food/comms/shelter); acceptable
backup/grid where full independence not targeted; worst-case duration without resupply; achievability
vs site potential; targets as design constraints for Tier 3-4.
**Flag:** Independence targets are design gates -- every Tier 3-4 decision is sized against them.
>> Tool label:
>> Prompt:
>> Placeholder:

### ofg-s1-critical-systems-redundancy -- Define critical systems & redundancy requirements
`formId: ofg-s1-critical-systems-redundancy` | category: vision
Captures: criticality classification (life-safety/essential/convenience); redundancy per life-safety
system (dual source/backup storage/manual fallback); minimum viable operation during failure; max
acceptable downtime before life-safety breach; achievability on site.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## AGRITOURISM (3)

### ag-s1-experience-vision -- A clear visitor experience vision & commercial model
`formId: ag-s1-experience-vision` | category: vision
Captures: core guest experience (what makes farm distinct); visitor types; commercial proposition &
price point; hospitality identity; achievability within steward capacity; what will never be
compromised for commercial gain.
>> Tool label:
>> Prompt:
>> Placeholder:

### ag-s1-visitor-capacity -- A clear visitor capacity & operational boundary
`formId: ag-s1-visitor-capacity` | category: vision
Captures: max simultaneous guest capacity (accommodation/dining/programming); visit-type limits;
operational boundaries (farm activities incompatible with guests); seasonal capacity variation;
consistency with regulation & infrastructure.
>> Tool label:
>> Prompt:
>> Placeholder:

### ag-s1-regulatory-framework -- A sound regulatory & licensing framework
`formId: ag-s1-regulatory-framework` | category: vision
Captures: food-service permits; accommodation licensing; public-liability insurance; health & safety
for public access; resource consents for visitor infra; compliance calendar.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## ECOVILLAGE (3)

### ev-s1-legal-governance -- A sound legal entity, tenure & governance model
`formId: ev-s1-legal-governance` | category: vision
Captures: legal entity options & selection w/ rationale; land tenure model; decision-making framework
(consensus/sociocracy/majority/hybrid); financial governance; membership rights & obligations; legal
advice before finalising.
>> Tool label:
>> Prompt:
>> Placeholder:

### ev-s1-provision-balance -- A clear communal vs. private provision balance
`formId: ev-s1-provision-balance` | category: vision
Captures: communal infrastructure commitments; food-system approach (communal/individual/hybrid);
financial sharing model; private household entitlements; resolution of communal-efficiency vs
household-autonomy conflicts; founding-member agreement.
>> Tool label:
>> Prompt:
>> Placeholder:

### ev-s1-conflict-framework -- A sound conflict resolution & community agreement framework
`formId: ev-s1-conflict-framework` | category: vision
Captures: formal decision process w/ quorum; dispute-resolution pathway; community behaviour
agreements; member exit process; dissolution protocol; regular review process.
**Flag:** Framework must be SIGNED before Act begins, not after.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## EDUCATION (3)

### edu-s1-mission-audience -- Define educational mission & target audience
`formId: edu-s1-mission-audience` | category: vision
Captures: primary mission; primary audience; learning outcomes per program type; what this site
teaches that a classroom cannot; achievability within steward knowledge & site capacity.
>> Tool label:
>> Prompt:
>> Placeholder:

### edu-s1-curriculum-programs -- Define curriculum framework & program types
`formId: edu-s1-curriculum-programs` | category: vision
Captures: program types; curriculum themes per type; max group size per type; annual program
calendar (frequency/seasonality); consistency with mission; curriculum development/review process.
>> Tool label:
>> Prompt:
>> Placeholder:

### edu-s1-regulatory-framework -- Define regulatory & accreditation framework
`formId: edu-s1-regulatory-framework` | category: vision
Captures: public-access & liability insurance; working-with-children/vulnerable-persons; food-handling
permits; building permits for teaching structures; accreditation intent (RTO/CPD/curriculum); compliance calendar.
**Flag:** Hard gate -- no public program delivery before all required permits & insurance confirmed.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## WELLNESS (4 primary + 2 secondary)

### well-s1-healing-philosophy -- A clear healing philosophy & therapeutic intent
`formId: well-s1-healing-philosophy` | category: vision
Captures: healing philosophy; primary modalities (somatic/contemplative/nature-based/integrative);
therapeutic intent; non-negotiable environmental conditions (silence/light/privacy); founding-
practitioner agreement; philosophy as Tier 3-4 design constraint.
>> Tool label:
>> Prompt:
>> Placeholder:

### well-s1-guest-intake -- A sound guest intake & suitability framework
`formId: well-s1-guest-intake` | category: vision
Captures: target guest profile; conditions actively welcomed; conditions needing practitioner
assessment; conditions outside scope (clinical referral); intake/suitability process; consistency
with practitioner scope of practice.
>> Tool label:
>> Prompt:
>> Placeholder:

### well-s1-regulatory-standards -- A sound regulatory & professional standards framework
`formId: well-s1-regulatory-standards` | category: vision
Captures: required practitioner qualifications per modality; registration & insurance; scope-of-
practice boundaries; health & safety for therapeutic services; food-service & accommodation
licensing; compliance calendar; legal/professional advice before any service.
**Flag:** Hard gate -- no therapeutic service until all qualifications, registrations, insurance confirmed.
>> Tool label:
>> Prompt:
>> Placeholder:

### well-s1-privacy-policy -- A sound privacy & confidentiality policy
`formId: well-s1-privacy-policy` | category: vision
Captures: what guest info collected & why; data storage/access/retention; practitioner & staff
confidentiality obligations; mandatory-disclosure protocol; guest consent process; legal advice on
jurisdiction privacy obligations.
>> Tool label:
>> Prompt:
>> Placeholder:

### well-sec-s1-healing-philosophy -- A clear healing philosophy & therapeutic overlay intent (SECONDARY overlay)
`formId: well-sec-s1-healing-philosophy` | category: vision
Captures: healing philosophy the wellness layer brings to the host; modalities offered alongside
primary land use; host activities/conditions compatible with guest presence; non-negotiable
environmental conditions; overlay supports rather than competes with primary purpose.
>> Tool label:
>> Prompt:
>> Placeholder:

### well-sec-s1-regulatory-standards -- Confirmed therapeutic regulatory & professional standards (SECONDARY overlay)
`formId: well-sec-s1-regulatory-standards` | category: vision
Captures: practitioner qualifications & registrations per modality; professional insurance & scope
of practice; therapeutic-service health/safety/licensing beyond primary use; compliance calendar;
no service until qualifications & insurance in place.
**Flag:** Hard gate -- no therapeutic service alongside primary use until qualifications/registrations/insurance confirmed.
>> Tool label:
>> Prompt:
>> Placeholder:

---

## After you return this worksheet

Once the `>>` fields are filled (or blocks marked `KEEP []`), Claude will:
1. Add one `kind: 'form'` entry per authored objective to `ACT_TOOL_CATALOG`
   (`apps/web/src/v3/act/tier-shell/actToolCatalog.ts`) -- `formId` per block, your prompt/placeholder,
   an icon + `category: 'vision'`.
2. Confirm `VisionFormModal` accepts the new `formId`s (or extend its resolver) so the modal opens and
   persists capture to the same store the universal s1-vision forms use.
3. Replace each objective's `[]` in `OBJECTIVE_ACT_TOOLS_OVERRIDE` with its new form-tool id.
4. Extend `actToolCoverage.test.ts` so each newly-wired s1 objective resolves to a form tool (ratchet),
   and verify: `tsc --noEmit`, bounded vitest (`--pool=forks --testTimeout=20000`), audit re-run
   (Gap C falls by the count of objectives moved from intentional `[]` to a form tool).
5. One commit per type (or one R2 commit, your call) + wiki log entry + findings doc update flipping
   "R2 -- DEFERRED" to "R2 -- DONE".

No source is touched until your authored content lands here.
