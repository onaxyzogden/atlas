# Livestock Operation — SECONDARY layer (draft for ratification)

**Date:** 2026-06-03
**Type:** `livestock_operation` as a **secondary** layer
**Status:** ✅ **RATIFIED (Rev 3 final, 2026-06-03)** — operator delegated the final
two calls to me as domain expert. Rulings: add the regulatory-compliance item to
`S6.20`; add `tension-13` (livestock × conservation); no MTC-specific content (wrong
layer). Proceeding to Phase 2 encode.
**Shape:** Modifying (like the silvopasture secondary) — **7 additive objectives + 3 universal patches**.

> **Rev 2:** promoted integration-timing to its own `LVS-S5.20`; reframed `LVS-S6.21`
> around closed-loop fertility; softened `market_garden`/`conservation` cells `X → M`;
> added predator/guardian + stock-water-quality/riparian items.
>
> **Rev 3 (post 2nd expert review):** **restored the core stock-infrastructure +
> establishment hard-gate objective (`LVS-S4.21`)** that Rev 2 dropped — fencing,
> handling, shelter, and the "no animals before infrastructure passes go/no-go" gate
> (welfare + iḥsān commitment, per the silvopasture template). Genericized the BD500
> line to an illustrative example; sharpened the dry-season feed-budget item.

---

## What this layer is (and is not)

A **livestock_operation secondary** answers: *"my project is primarily something
else (regenerative farm, orchard / food forest, homestead, ecovillage) and I am
now folding a standalone animal enterprise onto it."*

It contributes the herd-specific reading + design that a non-livestock primary
lacks, and patches the shared **universal** water / soil / access objectives so
animal demand is woven into those whole-of-site decisions instead of bolted on.

**Deliberately distinct from the silvopasture secondary.** Silvopasture frames
livestock as one leg of an *integrated tree + forage + livestock* system —
grazing-as-a-tool under a tree canopy. This livestock secondary is the
**standalone animal enterprise**: herd-led, no tree-integration framing, and it
foregrounds the two things silvopasture does not — **biosecurity at the host
interface** (animals meeting the host's crops / visitors / nursery stock /
wildlife) and **closing the manure/nutrient loop back into the host's
production**. Refs and ids are namespaced (`LVS-S*.20+`, item ids `…-lvs-N`) so
both secondaries can apply on a third primary without collision.

## Amanah Gate

The secondary is **production-integration only** — the host primary owns
marketing and economics, so there is **no sales-channel objective here** and no
advance-sale / herd-share / CSA content (so no *bayʿ mā laysa ʿindak* surface is
introduced at all). Ordinary halal animal husbandry. A welfare/iḥsān note rides
the health objective; humane + halal handling intent is made explicit. No riba,
gharar, or CSRA framing. *Clean.* (If, during your edits, you want a sales hook
in the secondary, flag it — it would re-engage the verbatim-encode + scopeNote
CSA rule, and I'd treat it that way rather than reword it.)

---

## The 7 additive objectives

> Each will be encoded with 5–6 checklist items, a full mutually-exclusive
> decision-group partition, a completion gate, and an act handoff — same rubric
> as every other catalogue. Below is the intent + item spine for your review.

### 1. `LVS-S1.20` — Livestock enterprise intent & host-integration rationale
*(s1-project-foundation)*
**Focused question:** *Why is an animal enterprise being added to this host, what
will it produce, and how does it fit the host's land, labour, and goals?*
- Define the enterprise intent — product (meat / milk / fibre / eggs), land-management service, or both.
- Identify candidate species and classes of stock — ruminants, poultry, pigs, mixed.
- Define how the herd relates to the host enterprise — complementary, supplementary, or competing for land and labour.
- Identify operator livestock experience and the daily labour available for stock care.
- Confirm enterprise intent is compatible with the host's vision, scale, and stewardship capacity.

### 2. `LVS-S3.20` — Carrying-capacity fit on the host's forage base
*(s3-systems-reading)* — binds `forage-carrying-capacity` + `carrying-capacity-seasonal`
**Focused question:** *Can the host's existing land and forage actually carry this
herd through the year — and at what conservative stocking rate?*
- Map the host's grazeable forage by zone — pasture, crop residue, understorey, cover crops — composition and condition.
- Assess seasonal forage availability and identify the feed gaps across the year. **(ckF `carrying-capacity-seasonal`)**
- Estimate baseline carrying capacity from the forage productivity of the host land. **(ckF `forage-carrying-capacity`)**
- Identify how much host area is realistically available to stock without compromising the primary enterprise.
- Assess weed and toxic-plant presence relevant to the candidate stock species.

### 3. `LVS-S4.20` — Species/breed selection, stocking rate & grazing system
*(s4-foundation-decisions)* — binds `paddock-stocking-density`
**Focused question:** *Which animals, at what stocking rate, moved under what
grazing system — sized to the surveyed capacity?*
- Confirm species and breed selection against the host's climate, forage, and enterprise intent.
- Set the stocking rate per area at the chosen rotation. **(ckF `paddock-stocking-density`, advisory)**
- Define the grazing system — continuous, rotational, cell, or mob — and the rationale.
- Define graze-period and rest-period targets per season, tied to recovery indicators.
- Define the **winter / dry-season feed budget** and its contingency — carried fodder, supplementary feed, planned destocking, or agistment triggers (the moment most integrations fail).
- Confirm the stocking decision is consistent with the surveyed carrying capacity (objective 2).

### 4. `LVS-S4.21` — Core stock infrastructure & establishment gate  🔒 *(hard gate)*
*(s4-foundation-decisions)*
**Focused question:** *What containment, handling, and shelter must be in place — and
proven ready — before any animal arrives on the host?*
- Design **fencing** — perimeter and subdivision, type per zone (permanent, electric, or hybrid) appropriate to the candidate species.
- Design **handling facilities** — yards, race, and loading sized to species and scale, for low-stress routine husbandry.
- Design **shelter** — shade and weather refuge adequate to the stock and the host's climate.
- Confirm **water reticulation readiness** to every grazing area (detail owned by patch A; this confirms it is *installed and proven*).
- Define the **establishment go/no-go** — the hard rule that no livestock arrive before water, fencing, and handling each pass an independent readiness test.
> **Completion gate carries the hard rule verbatim:** *no livestock arrive before
> water, fencing, and handling facilities each pass an independent go/no-go test.*

### 5. `LVS-S5.20` — Animal-impact integration & stacking timing  ⭐ *(the differentiator)*
*(s5-system-design)* — optionally binds `paddock-system-capacity`
**Focused question:** *At which moments in the host's production cycle are animals
invited in — and how does each animal stack multiple functions rather than just
graze?*
- Map the **animal-impact windows** against the host's production calendar — when stock are invited in (e.g. orchard floor *post-harvest*; market-garden beds *between rotations*; cover-crop termination) and when they are *excluded* (fruit set/drop, seedling establishment, food-safety pre-harvest intervals).
- Define **functional stacking** per species — each animal performing more than grazing (poultry = eggs + tillage + pest/larva control + manure; pigs = windfall/cleanup; geese = selective grazing; ruminants = mowing + fertility).
- Define **sequencing / leader-follower** moves where multi-species — e.g. ruminants then poultry, or grazing then cleanup — and the spatial flow across the host.
- Define the integration's **spatial footprint** within the host layout — which zones, laneways, and temporary vs permanent infrastructure. *(optional ckF `paddock-system-capacity`)*
- Confirm the impact timing protects the host's primary yield and is consistent with the grazing system (objective 3) and the host's own calendar.

### 6. `LVS-S6.20` — Animal health, welfare & host-interface biosecurity
*(s6-integration-design)* — carries the iḥsān/welfare scopeNote
**Focused question:** *How are the animals kept healthy and humanely handled — and
how is disease/contamination kept from crossing between stock and the host's
crops, visitors, nursery stock, or wildlife?*
- Define the animal health program — vaccination, parasite management, and veterinary relationship.
- Define the daily welfare standard — feed, water, shade, low-stress handling — and humane + halal handling/slaughter-pathway intent where stock is raised for meat. *(iḥsān scopeNote)*
- Define biosecurity at the host interface — separating stock from food crops, nursery stock, and visitor areas; manure-pathogen and zoonosis controls.
- Define **predator pressure & guardian strategy** — guardian animals (dogs, geese, donkeys), night housing, and fencing appropriate to the host and candidate stock.
- Define wildlife / neighbouring-stock disease-vector controls and a quarantine protocol for incoming animals.
- Confirm **regulatory compliance** — animal-welfare legislation and any stock identification / movement requirements for the jurisdiction.
- Define record-keeping for stock numbers, health events, and movements.

### 7. `LVS-S6.21` — Manure, nutrient cycling & closed-loop fertility
*(s6-integration-design)*
**Focused question:** *How does animal impact become the host's fertility engine —
at the right ratio, without overloading, contaminating, or compacting?*
- Map manure / nutrient flows from stock into the host's crops, orchard floor, or pasture.
- Assess the **livestock-to-land fertility balance** — is the herd under-, at-, or over-stocked for *closed-loop* fertility (the farm-as-organism ideal of carrying enough animals to be self-sufficient in fertility without importing inputs)?
- Identify manure as a **substrate for on-farm preparations / composting** — e.g. quality compost, and (for a biodynamic steward) preparation-making such as horn-manure — fertility the host would otherwise buy in.
- Define safe manure handling — composting / withholding periods before food-crop contact (food-safety contamination guard).
- Define the overgrazing / compaction guard on the host's productive ground — graze/rest thresholds, exclusion zones, and nutrient-loading limits so density does not over-fertilise or pollute waterways.
- Confirm the nutrient-integration plan closes a fertility loop the host primary would otherwise have to source externally.

---

## The 3 universal patches

> These inject animal-specific items into the shared **universal** objectives. The
> resolver looks up the target by id, concatenates the gate amendment, and stamps
> each injected item `expandedBySecondaryId='livestock_operation'`. Item ids use
> the `…-lvs-N` suffix so they never collide with the silvopasture secondary's
> `…-silv-N` items on the same targets.

### A. Patch → `s4-water-strategy`  (ref `LVS>U-S4.2`) — binds `stock-water-demand`
- Add livestock drinking-water demand to the host's water balance — peak daily intake by species, class, and season. **(ckF `stock-water-demand`)**
- Confirm reticulated supply reaches every grazing area through the dry season, at a **water quality** fit for stock and for the host's irrigation.
- Define **riparian / waterway exclusion** — keep stock out of the host's clean waterways and dams to prevent pathogen and nutrient contamination.
- **Gate amendment:** *Livestock water demand and quality are in the water balance, supply reaches all grazing areas, and waterways are protected from stock contamination.*

### B. Patch → `s5-soil-improvement`  (ref `LVS>U-S5.3`)
- Define grazing-impact monitoring — ground cover, compaction, and condition by zone.
- Define graze/rest thresholds and manure-loading limits that build soil without overgrazing or nutrient pollution.
- **Gate amendment:** *Grazing-impact monitoring, graze/rest thresholds, and manure-loading limits protect and build the host's soil.*

### C. Patch → `s5-access`  (ref `LVS>U-S5.1`)
- Design stock-movement laneways linking grazing areas to water, handling yards, and shelter.
- Design gated crossings where stock laneways intersect vehicle access, crop areas, or waterways — minimise stress and cross-contamination points.
- **Gate amendment:** *Stock-circulation laneways and gated crossings move livestock with minimal stress and no crop/visitor cross-contamination.*

---

## Relationship matrix — proposed `livestock_operation` row

How a livestock secondary relates to each of the 13 primaries
(**A**=Amplifies, **M**=Modifies, **X**=Conflicts/tension, **NA**=not applicable):

| Primary | Cell | Why |
|---|---|---|
| homestead | **M** | Adds a managed herd that reshapes land/labour allocation |
| regenerative_farm | **M** | Livestock integrate into the farm's rotation and fertility |
| market_garden | **M** | Chicken-tractor / between-rotation integration is a known pattern; food-safety + space caution carried by *tension-12* |
| orchard_food_forest | **M** | Grazing under/among trees reshapes floor management |
| silvopasture | **NA** | Redundant — silvopasture already integrates livestock |
| ecovillage | **M** | Communal herd reshapes shared-land decisions |
| agritourism | **A** | Animals are a visitor-experience asset |
| education | **A** | Livestock are a teaching asset |
| conservation | **M** | Conservation/targeted grazing is a recognised restoration tool; habitat caution carried by *proposed tension-13* |
| off_grid | **A** | Animals add self-reliance (food, traction, fertility) |
| wellness | **X** | Animal operations vs a calm retreat setting *(tension-11 exists)* |
| nursery | **A** | Manure/fertility + grazed firebreaks support nursery ground |
| livestock_operation | **NA** | Self-cell |

**Optional `tension-13`:** livestock_operation × conservation (grazing-as-tool vs
habitat-protection), surfacing at `s4-foundation-decisions`. Tensions 11
(×wellness) and 12 (×market_garden) already exist and fire symmetrically.

---

## Resolved (Rev 2 → Rev 3)
- ✅ Integration-timing is its own objective (`LVS-S5.20`) — the permaculture differentiator.
- ✅ **Core stock-infrastructure + establishment hard-gate restored** (`LVS-S4.21`) — fencing, handling, shelter, and "no animals before infra passes go/no-go." Stratum spread now S1 · S3 · S4×2 · S5 · S6×2.
- ✅ `S6.21` reframed around **closed-loop / farm-as-organism fertility**; BD prep kept as an *illustrative example*, not a requirement.
- ✅ Matrix `market_garden` and `conservation` softened **X → M** (tension records carry the caution).
- ✅ Predator/guardian item in `S6.20`; water-quality + riparian-exclusion in patch A; dry-season feed-budget sharpened in `S4.20`.

## Known interaction (will note in encode comment, no guard built)
A user can pick **both** the silvopasture-secondary *and* the livestock-secondary on
a third host → duplicated grazing/water/soil content. Namespaced ids (`…-lvs-N` vs
`…-silv-N`) mean it won't collide, just reads redundant. Acceptable; a mutual-exclusion
rule would be a resolver change later, not a catalogue change.

## Final rulings (operator-delegated, 2026-06-03)
1. ✅ **`tension-13` added** — livestock × conservation @ `s4-foundation-decisions`. It is what makes the softened `M` cell honest.
2. ✅ **Regulatory-compliance item added** to `S6.20` (parity with the primary's welfare objective).
3. ✅ **No MTC-specific content** — a catalogue is a reusable template; MTC species/scale belong in the project instance.

→ Encoding **7 additive objectives + 3 patches** to `livestockOperation.ts`, taxonomy
+ resolver wiring, conformance tests; then verify (tsc + bounded vitest) and commit.
