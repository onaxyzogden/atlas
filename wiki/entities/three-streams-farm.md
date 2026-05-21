# Three Streams Farm
**Type:** canon (fictional showcase project)
**Status:** ratified
**Path:** _no source path — canon is wiki-resident; substrate seeded in Phase 2_

## Purpose

Three Streams Farm is the fictional Ontario demo farm canon for the
Apricot-Lane-inspired OLOS showcase program. It fixes the parcel, the
origin narrative, the 8-year transformation arc, the species/guild
library, the audience-tier mapping, and the covenant framing — every
downstream phase quotes this page verbatim. The farm is fictional; the
real Ontario parcel underneath it is real, so the OLOS adapter chain
(Conservation Halton + OMAFRA + OHN + AAFC + NRCan + ECCC) returns
truthful data end-to-end.

## Parcel

- **Region:** rural northeast Milton, Halton Region, Ontario.
- **Watershed:** Sixteen Mile Creek headwater tributaries (three small
  branches converge through the lot — the farm's namesake).
- **Conservation Authority:** Conservation Halton (`CH`, census division
  `'3520'`) per
  [`CONSERVATION_AUTHORITY_REGISTRY['3520']`](../../packages/shared/src/constants/dataSources.ts)
  → endpoint `https://maps.conservationhalton.ca/arcgis/rest/services`.
- **Acreage:** ~180 acres (~73 ha).
- **Centroid (WGS84):** 43.5600, -79.9100.
- **Approximate bounding box:** [-79.9145, 43.5560] → [-79.9055, 43.5640]
  (~830 m × ~890 m, fits 180 acres with hedgerow edges).
- **Rural identification:** Lot 14, Concession 6 (geographic Township of
  Trafalgar / now Town of Milton). Formal MPAC PIN (`25-09-XXX-XXX-XXXXX`
  rural rolln format) bound during Phase 2 seed against
  [`apps/api/src/db/seed/017_builtin_sample_project.sql`](../../apps/api/src/db/seed/017_builtin_sample_project.sql)
  precedent.
- **Adapter routing:** all eight CA-side Tier-1 adapters in
  [`ADAPTER_REGISTRY`](../../packages/shared/src/constants/dataSources.ts)
  resolve to live endpoints for this centroid — elevation
  (`NrcanHrdemAdapter`), soils (`OmafraCanSisAdapter`), watershed
  (`OhnAdapter`), wetlands/flood (`ConservationAuthorityAdapter`),
  land cover (`AafcLandCoverAdapter`), climate (`EcccClimateAdapter`),
  zoning (`OntarioMunicipalAdapter` → Town of Milton Rural endpoint),
  groundwater (`PgmnGroundwaterAdapter`).

## Origin Narrative

Three Streams Farm is purchased in **2024 (Y0)** as 180 acres of eroded,
continuous-corn rural Milton ground at the toe of the Niagara
Escarpment — depleted topsoil under hilltop sheet-rill loss, three
small Sixteen Mile Creek tributaries cutting unprotected through the
property without buffer or shade, a single ageing windbreak along the
north edge, and the dominant land-cover signal on AAFC layers a 14-year
unbroken corn-soy rotation.

The farm is fictional. The arc that follows is *inspired by farms like
Apricot Lane Farms and the rehabilitation narrative shown in The
Biggest Little Farm*; Three Streams Farm is not affiliated with, owned
by, or partnered with Apricot Lane Farms, and no Apricot-Lane brand,
trademark, or co-mark is used in any OLOS surface. The "three streams"
of the name are the three tributaries crossing the lot — not a
financial vehicle, not a programme, not a partnership tier.

## Eight-Year Transformation Arc

The arc threads the Yeomans scale-of-permanence cap sequence (lifted
verbatim from
[[decisions/2026-05-12-plan-phasestore-yeomans-adapter.md]]) —
*climate → landshape → water → access → trees → buildings →
subdivision → soil → uncapped* — across the existing 4-phase scaffold
(`Year 0-1`, `Year 1-3`, `Year 3-5`, `Year 5+`) with default
`yeomansCap` per phase (`water`, `buildings`, `subdivision`, `soil`).
Monitoring trajectories follow the MDPI Apricot Lane sampling
cadence (Y0 / Y5 / Y9), referenced in
[[log/2026-05-20-olos-new-user-journey-walkthrough.md]] and
[[log/2026-05-19-atlas-b5-beneficial-organism-habitat.md]].

### Y0 (2024) — baseline observation
Boundary drawn; OLOS Observe modules pull adapter substrate; soil
sampled (organic-matter 1.4–1.9 %, compacted plow pan at 18 cm);
hydrology mapped (three tributaries, ephemeral cut gully on the
south slope); single windbreak documented; AAFC continuous-corn
signature confirmed. **Yeomans cap: `climate`** — observe, do not
move soil. No livestock, no cover crop, no perennial.

### Y1 (2025) — water + cover (Yeomans cap: `water`)
Keyline survey + first contour swales on the two steeper sub-watersheds;
riparian buffers seeded along all three tributaries (mixed grass +
nitrogen-fixing shrub setback per Conservation Halton O.Reg. 162/06).
Cover-crop rotation replaces the bare winter fallow on the row-crop
half: winter rye + crimson clover after the last corn harvest, tillage
radish + oats over-seeded into standing corn. First field hedgerow
extension along the east edge.

### Y2 (2026) — livestock integration + perennial start (Yeomans cap: `buildings`)
**Year-of-Showcase primary state.** First cow-calf herd lands (target
~80 head Black Angus / Devon-cross, rotational on 3-day moves following
[livestock-rotation-rest-compliance-pct](../../apps/web/src/data/goal-tree-templates.ts)
discipline at ≥90 %). Mobile poultry (~200-bird layer flock + 2 broiler
shifts) follows the cow-calf at 3-day lag. First orchard block
(~3 acres apple + pear + plum) on the south-facing bench. Mobile
shade/water infrastructure; first farmstead structures (pole barn +
egg-pack room) at the access node per the `access → buildings` cap
order.

### Y3 (2027) — hedgerow + windbreak maturation (Yeomans cap: `subdivision`)
Internal paddock subdivision densifies (~24 cells across the grazing
half); native hedgerow plantings on every internal fence line. Second
and third orchard blocks (stone fruit + nut). Pasture-cropping overlay
begins where cover-crop residues knit with low-vigour pasture. First
A-series biodiversity census documents post-buffer return of
amphibians and grassland birds along the three tributaries.

### Y4 (2028) — silvopasture maturation
Y2 orchard blocks reach productive canopy; sheep flock (~40-ewe Katahdin)
added as a third grazing class, integrated with the cow-calf rotation
on a 7-day lag. Compost + vermicompost loop closes on-farm with poultry
bedding + crop residue. Soil organic matter rises into the 2.6–3.1 %
band on the pasture half.

### Y5 (2029) — mid-arc polyculture (forward portal scene; Yeomans cap: `soil`)
**First forward scrollytelling scene.** Polyculture visibly mature:
silvopasture canopy unioned across overlapping guilds per
[[log/2026-05-21-b4-canopy-union-dedup.md]] and
[[log/2026-05-24-b4-host-canopy-union-viz.md]]; three streams shaded
through ~70 % of their on-farm reach; bird-species richness up
~2.4× over Y0; soil organic matter 3.5–4.2 % across former row-crop
ground. Apiary established. First seed-saving line for the cover-crop
mix.

### Y6–Y7 (2030–2031) — orchard production + perennial protein
Orchard yield curves enter their productive band; nut-tree understorey
diversifies; perennial-protein experiments (silvopasture-suited
hazelnut, chestnut) move from trial rows to production rows.
Adaptive-stewardship loop closes: A-series readings feed D5 dashboards;
recommendations route through Goal Compass.

### Y8 (2032) — stable ecosystem (terminal portal scene; Yeomans cap: `uncapped`)
**Terminal scrollytelling scene.** Continuous-corn signal is
historical; AAFC land-cover layer reads polyculture mosaic
(pasture / orchard / silvopasture / riparian / hedgerow); bird-species
richness ~3.5×; pollinator diversity index in its plateau band;
ecosystem-services valuation (per
[[decisions/2026-05-20-atlas-phase-a-apricot-lane-decision-layer.md]]
informational natural-capital cards) shows the regenerative arc as
*appreciation of stewardship value*, not yield to capital partners.

## Year-of-Showcase Scope

- **Y2 (2026)** is the loadable demo state — seeded in Phase 2 against
  current B-track capability (rotation-sequence readiness evaluators +
  `livestock-enterprise` Y2 promotion criteria shipped 2026-05-20 per
  [[decisions/2026-05-20-atlas-b3-x-rotation-promotion-criteria.md]]).
  The operational gate `livestock-rotation-spine-presence-pct ≥ 90 %`
  is the success criterion the demo project must satisfy at load.
- **Y5 (2029)** and **Y8 (2032)** are forward scrollytelling scenes
  in Phase 3 — sourced from this canon, projected from the same
  parcel. Late-arc complexity (full B4 succession modelling,
  Y6+ perennial-protein production curves) is labelled honestly as
  *"projected"* in the portal; the demo project does not pretend to
  render Y5+ as live execution state.

## Species & Guild Canon

**Keystone trees (Niagara Escarpment edge, Halton ecoregion):**
black walnut (*Juglans nigra*), white oak (*Quercus alba*), sugar maple
(*Acer saccharum*), eastern white pine (*Pinus strobus*), white ash
(*Fraxinus americana* — EAB-resistant cultivars only), shagbark hickory
(*Carya ovata*).

**Cover crop mixes (by season):**
- Late summer / overwinter: winter rye + crimson clover + hairy vetch.
- Spring catch-crop: oats + tillage radish + peas.
- Summer break-crop: cowpea + sorghum-sudangrass + buckwheat.

**Livestock species + integration cadence:**
- Cow-calf (~80 head Black Angus / Devon-cross), 3-day rotational
  moves per [livestock-rotation-rest-compliance-pct].
- Mobile poultry (~200-bird layer flock + seasonal broiler shifts),
  3-day lag behind the cow-calf.
- Sheep flock (~40-ewe Katahdin) added Y4, 7-day lag.

**Hedgerow composition (Conservation Halton native-species list
compatible):**
hawthorn (*Crataegus* spp.), red-osier dogwood (*Cornus sericea*),
serviceberry (*Amelanchier* spp.), elderberry (*Sambucus canadensis*),
nannyberry (*Viburnum lentago*), staghorn sumac (*Rhus typhina*).

## Audience-Tier Mapping

The Phase 3 portal surfaces a single front for all three tiers; deep
CTAs branch each tier into its own scene set, metric set, and
sign-up endpoint.

| Tier | Scenes surfaced | Metrics foregrounded | Terminal CTA |
|---|---|---|---|
| **Dreaming** (no project, no land) | Y0 baseline → Y8 vision (full arc) | Biodiversity recovery curve, "what 8 years of stewardship looks like" before/after panels | *"Start a dream project"* — Phase 4 template instantiation with a sample boundary |
| **Transitioning** (cash-crop operator) | Y0 → Y2 conversion mechanics; water + cover + livestock-paddock sequencing | Cover-crop ROI, paddock-density tables, rotation-sequence readiness, soil-organic-matter trajectory | *"Plan my transition"* — Phase 4 template with the visitor's own parcel boundary |
| **Stewarding** (long-horizon land manager / steward-org) | Y5 → Y8 maturity + Y9+ adaptive stewardship; monitoring instrumentation | A-series trajectories, D5 operating dashboards, adaptive-recommendation engine outputs | *"Steward a working farm"* — full OLOS account, A-series + (eventually) D-track |

Dreaming, Transitioning, Stewarding are framings of audience intent —
not financial relationships, not membership tiers, not capital
classes.

## Data Substrate

The OLOS positioning page
([[concepts/land-os-positioning.md]]) ratifies the success definition
verbatim, reproduced here:

> OGDEN Land OS is being built to serve as the full operating system
> for regenerative land development. Its success is measured by
> whether it can independently guide a project through observation,
> design, phased implementation, daily management, ecological
> monitoring, and adaptive stewardship at the complexity level of
> Apricot Lane Farms — without requiring external project management
> systems or personnel to hold the work together.

Three Streams Farm is the canonical proof of that definition. Each
Observe module pulls real adapter data for the Phase 2 Y2 seed:

| Observe module | Adapter (CA) | Source const | Notes |
|---|---|---|---|
| Elevation | `NrcanHrdemAdapter` | `nrcan_hrdem` | Halton 1 m LiDAR mosaic |
| Soils | `OmafraCanSisAdapter` | `omafra_cansis` | Halton county soil survey |
| Watershed | `OhnAdapter` | `ontario_hydro_network` | Sixteen Mile Creek subwatershed |
| Wetlands / flood | `ConservationAuthorityAdapter` | `conservation_authority` | CH O.Reg. 162/06 regulated areas |
| Land cover | `AafcLandCoverAdapter` | `aafc_annual_crop` | continuous-corn signature confirms baseline |
| Climate | `EcccClimateAdapter` | `eccc_normals` | Georgetown WWTP or equivalent station |
| Zoning | `OntarioMunicipalAdapter` | `ontario_municipal_gis` | Town of Milton Rural endpoint |
| Groundwater | `PgmnGroundwaterAdapter` | `ontario_pgmn` | PGMN well coverage in Halton |

A-series monitoring trajectories (regeneration events, biodiversity
outcomes, habitat allocation) are *seeded* for the 8-year arc — they
are not live readings — and follow the MDPI Apricot Lane Y0/5/9
sampling pattern combined with ECCC climate normals for the Halton
region. **Anything synthetic is labelled in-portal**; nothing seeded
is presented as a real field reading.

## Covenant Framing

No CSRA, no salam-style advance-purchase, no *bayʿ mā laysa ʿindak*
framing appears anywhere in the Three Streams canon, in Phase 2 seed
copy, in Phase 3 portal copy, or in Phase 4 template metadata. The
2026-05-04 erasure is binding ([[decisions/2026-05-09-atlas-csra-erasure.md]]).

If capital framing is invoked anywhere in the showcase surfaces — and
this canon does not invoke it — the only permitted public label is
*"capital partners & allies."* Permitted capital channels (per global
covenant): charitable donation, restricted donation, qarḍ ḥasan
(interest-free loan), in-kind contribution, sponsorship. Yield-share
framing is absent from the canon; any future post-acquisition yield
discussion is contemplated only as a membership benefit subject to
Scholar Council review, and is out of scope for the showcase.

Apricot Lane attribution wording (binding for all downstream phases):
*"inspired by farms like Apricot Lane Farms and the rehabilitation arc
shown in The Biggest Little Farm; Three Streams Farm is a fictional
Ontario operation."* No partnership claim, no brand co-mark, no
*"powered by"* or *"in association with"* construction.

## Notes

**Out of scope (canon document only).** The canon fixes parcel,
narrative, species, milestones, audience tiers, adapter substrate, and
covenant framing. It does *not* contain: the full monitoring trajectory
numbers (Phase 2 seeds those against the MDPI cadence), the portal
route surface or scrollytelling components (Phase 3), the template
schema or clone flow (Phase 4), or the Apricot-Lane-showcase program
ADR itself (a separate `wiki/decisions/2026-05-20-atlas-apricot-lane-showcase-program.md`
file is referenced from
[[log/2026-05-20-atlas-apricot-lane-showcase-program.md]] but has not
yet been written to disk — that ADR-creation task is tracked separately
from canon work).

**Downstream-phase pointers.**
- **Phase 2 (seed):** consumes the Parcel + Data Substrate sections
  verbatim; instantiates Y2 state into
  `apps/api/src/db/seed/` or equivalent; populates A-series stores
  with the 8-year trajectory; provides a "Load showcase project"
  entry from the dashboard / projects list.
- **Phase 3 (portal):** consumes the 8-Year Transformation Arc +
  Audience-Tier Mapping; surfaces Y2 / Y5 / Y8 as scenes; embeds
  Phase 2 map views filtered per scene.
- **Phase 4 (template):** extracts the Species & Guild Canon +
  Yeomans-capped phasing scaffold as a re-instantiable
  `ProjectTemplate`; substitutes generic Holmgren-grounded defaults
  for non-Ontario boundaries.

### Phase 4: Template Lineage (landed 2026-05-21)

Phase 4 extracted this canon into the public **Ecosystem Farm**
template — `slug='ecosystem-farm'`, sentinel
`00000000-0000-0000-0000-0000ec05fa12`, owned by `SYSTEM_USER_ID`,
`public=true`. The snapshot is a deep JSONB carrying ~22 design
features (centroid-normalized relative geometry), the 24-event
regeneration trajectory (relative dates), 8 project relationships
(name-keyed edges resolved on replay), and the 4-phase canon scaffold.

Cold visitors land via per-tier ContactCTA deep links:
`/register?next=instantiate&template=ecosystem-farm[&drawFirst=true|&fullSetup=true]`
(Dreaming / Transitioning / Stewarding respectively). Server-side
deep replay translates feature geometry into the visitor's boundary
via PostGIS `ST_Translate`; client-side seeder auto-fires on any
project whose `metadata.instantiatedFromTemplate === 'ecosystem-farm'`,
populating phaseStore (canon names) + workItemStore + nurseryStore +
siteProfileStore + ecologyStore (project-level `'mid'` succession at Y2).

See [[entities/ecosystem-farm-template]] for the template entity and
[[decisions/2026-05-21-atlas-ecosystem-farm-template-extraction]] for
the ADR ratifying the 3 locked decisions + 4-prong approach.

**ADR back-links.**
- Showcase program log (program plan ratification):
  [[log/2026-05-20-atlas-apricot-lane-showcase-program.md]].
- Walkthrough that motivated Phase 0:
  [[decisions/2026-05-20-olos-new-user-journey-walkthrough.md]].
- Yeomans cap sequence (phasing scaffold):
  [[decisions/2026-05-12-plan-phasestore-yeomans-adapter.md]].
- Year-2 promotion gate (rotation readiness):
  [[decisions/2026-05-20-atlas-b3-x-rotation-promotion-criteria.md]].
- Natural-capital decision layer:
  [[decisions/2026-05-20-atlas-phase-a-apricot-lane-decision-layer.md]].
- Covenant boundary on CSRA erasure:
  [[decisions/2026-05-09-atlas-csra-erasure.md]].
- Land OS positioning (north-star source):
  [[concepts/land-os-positioning.md]].
