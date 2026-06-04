/**
 * Conformance guard for the Act tier-shell objective->tool wiring.
 *
 * This is the check whose ABSENCE let the override map silently rot: its keys
 * had been authored against an older objective-id vocabulary, so 18 of 19
 * universal objectives quietly fell through to the coarse stratum default and
 * showed tools their checklist never called for (terrain showing soil +
 * vegetation, etc.). These invariants fail the build the moment that drift
 * recurs.
 *
 * The override now spans more than one catalogue: the universal baseline plus
 * the silvopasture primary + secondary livestock objectives (added 2026-06-01
 * so paddock / pasture / fence tools surface on the livestock objectives rather
 * than the coarse stratum default). Both OBJECTIVE_ACT_TOOLS_OVERRIDE and the
 * objective catalogues live in @ogden/shared (catalogue-id strings only, no app
 * deps); ACT_TOOL_CATALOG lives in the app layer (lucide icons + MapToolId
 * union). Only the app layer can import both, so the cross-package check lives
 * here.
 */

import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_ACT_TOOLS_OVERRIDE,
  UNIVERSAL_PLAN_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  HOMESTEAD_PRIMARY_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  MARKET_GARDEN_PRIMARY_OBJECTIVES,
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  LIVESTOCK_PRIMARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_OBJECTIVES,
  CONSERVATION_PRIMARY_OBJECTIVES,
  OFF_GRID_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  allCatalogueObjectives,
  getObjectiveActTools,
} from '@ogden/shared';
import { ACT_TOOL_CATALOG, ACT_TOOL_CATEGORIES } from '../actToolCatalog.js';

describe('Act tier-shell objective->tool coverage', () => {
  const allObjectiveIds = new Set(allCatalogueObjectives().map((o) => o.id));
  const categoryIds = new Set(ACT_TOOL_CATEGORIES.map((c) => c.id));

  it('every override key is a real catalogue objective id', () => {
    // A key must be a real objective id in SOME encoded catalogue (universal or
    // a per-type layer); a typo or stale id resolves in none and trips here.
    const stale = Object.keys(OBJECTIVE_ACT_TOOLS_OVERRIDE).filter(
      (id) => !allObjectiveIds.has(id),
    );
    expect(stale).toEqual([]);
  });

  it('every universal objective has an explicit override entry', () => {
    const missing = UNIVERSAL_PLAN_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every silvopasture objective has an explicit override entry', () => {
    // Every silvopasture standalone objective (primary + secondary additive) is
    // explicitly wired so the rail shows livestock-relevant tools instead of
    // the coarse stratum default (which omits paddocks/pasture/fencing and
    // would surface crops/orchards/harvest on monitoring objectives).
    const silvObjectives = [
      ...SILVOPASTURE_PRIMARY_OBJECTIVES,
      ...SILVOPASTURE_SECONDARY_OBJECTIVES,
    ];
    const missing = silvObjectives
      .filter((o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE))
      .map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every homestead objective has an explicit override entry', () => {
    // Homestead is the active vertical-slice primary; its 15 hms-* objectives
    // were wired explicitly on 2026-06-03 (audit remediation R1) so spatial
    // objectives surface their own tools and decision/financial objectives
    // resolve to an intentional [] rather than the coarse stratum default.
    // An explicit [] still satisfies this ratchet (the id is present in the
    // override map); only a brand-new hms-* objective with no entry trips it.
    const missing = HOMESTEAD_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every regenerative-farm objective has an explicit override entry', () => {
    // Regen farm is the second per-type catalogue wired (audit remediation R1,
    // 2026-06-03) after homestead. Before this its 13 rf-* objectives fell
    // through to STRATUM_ACT_TOOLS_DEFAULT with a severe misfit (S3 nutrient /
    // pest showed access-utilities tools; S4 strategy showed roads/fencing; S5
    // fertility / windbreaks showed the water-line set). Each is now explicit;
    // an intentional [] (decision/financial objectives) still satisfies the
    // ratchet — only a brand-new un-wired rf-* trips it.
    const missing = REGEN_FARM_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every market-garden objective has an explicit override entry', () => {
    // Market garden is the third per-type catalogue wired (audit remediation R1,
    // 2026-06-03) after homestead and regen-farm. Before this its 24 mgd-*
    // objectives fell through to STRATUM_ACT_TOOLS_DEFAULT (S3 water/pest showed
    // access-utilities; S4 strategy showed roads/fencing; S5 infrastructure
    // showed the water-line set instead of bed/compost/wash-pack tools). Each is
    // now explicit; an intentional [] (sales / financial / scheduling decisions,
    // incl. the CSA-flagged s1 objectives) still satisfies the ratchet — only a
    // brand-new un-wired mgd-* trips it.
    const missing = MARKET_GARDEN_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every orchard objective (primary + secondary) has an explicit override entry', () => {
    // Orchard is the fourth per-type catalogue wired (audit remediation R1,
    // 2026-06-03). Covers BOTH the 25 orch-* primary objectives and the 5
    // standalone orch-sec-* additive objectives (which surface when orchard is a
    // secondary type — the same situation that forced the silvopasture-secondary
    // overrides), mirroring the silvopasture assertion's primary+secondary union.
    // (The 4 ORCHARD_SECONDARY_PATCHES inject into universal objectives that
    // already carry overrides, so they need no entry here.) An intentional []
    // (species / succession / financial / sequencing decisions) still satisfies
    // the ratchet — only a brand-new un-wired orch-* / orch-sec-* trips it.
    const orchardObjectives = [
      ...ORCHARD_PRIMARY_OBJECTIVES,
      ...ORCHARD_SECONDARY_OBJECTIVES,
    ];
    const missing = orchardObjectives
      .filter((o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE))
      .map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every livestock-operation objective (primary + secondary) has an explicit override entry', () => {
    // Livestock operation is the fifth per-type catalogue wired (audit
    // remediation R1, 2026-06-03). Covers BOTH the 23 lvs-* primary objectives
    // and the 7 standalone lvs-sec-* additive objectives (which surface when
    // livestock is a secondary type -- the same situation that forced the
    // silvopasture-secondary overrides), mirroring the orchard / silvopasture
    // assertions' primary+secondary union. (The 3 LIVESTOCK_SECONDARY_PATCHES
    // inject into universal objectives that already carry overrides, so they need
    // no entry here.) Before this its objectives fell through
    // STRATUM_ACT_TOOLS_DEFAULT (S2/S3 forage & water surfaced access-utilities;
    // S5 paddock / fencing / handling surfaced roads/fencing generically rather
    // than the paddocks/gates/barns family). An intentional [] (vision / breed /
    // stocking / grazing-method / financial / sequencing decisions, incl. the
    // CSA-flagged s7 marketing objective) still satisfies the ratchet -- only a
    // brand-new un-wired lvs-* / lvs-sec-* trips it.
    const livestockObjectives = [
      ...LIVESTOCK_PRIMARY_OBJECTIVES,
      ...LIVESTOCK_SECONDARY_OBJECTIVES,
    ];
    const missing = livestockObjectives
      .filter((o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE))
      .map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every conservation objective has an explicit override entry', () => {
    // Conservation is the sixth per-type catalogue wired (audit remediation R1,
    // 2026-06-03). It ships no standalone secondary layer, so this is a
    // primary-only ratchet over the 30 con-* objectives (like homestead /
    // regen-farm / market-garden). Before this its objectives fell through
    // STRATUM_ACT_TOOLS_DEFAULT (S2/S3 ecological surveys surfaced
    // access-utilities / the water-line set instead of vegetation /
    // wildlife-sector / erosion / fire-sector / transect ecology tools; S5
    // restoration design surfaced roads/fencing generically). Each is now
    // explicit; an intentional [] (S1 vision / intervention-philosophy / tenure,
    // S4 species-selection & pest-strategy decisions, S6 compliance admin, and
    // the whole S7 sequencing / planning / funding / review / volunteer band,
    // incl. the carbon/biodiversity-credit funding objective flagged for Scholar
    // Council review) still satisfies the ratchet -- only a brand-new un-wired
    // con-* trips it.
    const missing = CONSERVATION_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every off-grid objective has an explicit override entry', () => {
    // Off-grid resilience is the seventh per-type catalogue wired (audit
    // remediation R1, 2026-06-03). It ships no standalone secondary layer and no
    // patches, so this is a primary-only ratchet over the 27 ofg-* objectives
    // (like homestead / regen-farm / market-garden / conservation). Before this
    // its objectives fell through STRATUM_ACT_TOOLS_DEFAULT (the S2/S3 site &
    // systems surveys and the S5 water/energy/shelter/food/comms infrastructure
    // block surfaced the coarse access-utilities set instead of the source /
    // structure / climate-sector / production families). Each is now explicit;
    // an intentional [] (S1 philosophy/redundancy decisions, the whole S4
    // strategy/redundancy band, S6 monitoring-protocol design, and the S7
    // sequencing/logistics/habitation-gate band -- all Amanah-clean life-safety
    // decisions) still satisfies the ratchet -- only a brand-new un-wired ofg-*
    // trips it.
    const missing = OFF_GRID_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every agritourism objective has an explicit override entry', () => {
    // Agritourism is the eighth per-type catalogue wired (audit remediation R1,
    // 2026-06-03). It ships no standalone secondary layer and no patches, so this
    // is a primary-only ratchet over the 34 ag-* objectives (29 v1.0 + 5
    // eco-resort / glamping extension added out-of-band). Before this its
    // objectives fell through STRATUM_ACT_TOOLS_DEFAULT (the S2/S3 arrival /
    // hospitality / sensory / emergency / carrying-capacity surveys and the S5
    // accommodation / dining / sanitation / dispersed-siting / servicing design
    // block surfaced the coarse access-utilities set instead of the access /
    // structure / climate-sector / zoning families). Each is now explicit; an
    // intentional [] (S1 vision / capacity / regulatory, S2 seasonal pattern, the
    // S4 service / food strategy & the revenue-model objective whose membership /
    // season-pass Amanah scopeNote routes to Scholar Council, the S6 feedback /
    // compliance / load monitors, and the whole S7 staffing / booking / launch /
    // adaptive / seasonal-resilience band) still satisfies the ratchet -- only a
    // brand-new un-wired ag-* trips it.
    const missing = AGRITOURISM_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every ecovillage objective has an explicit override entry', () => {
    // Ecovillage is the ninth per-type catalogue wired (audit remediation R1,
    // 2026-06-03). It is primary-only (canBeSecondary: false) -- no standalone
    // secondary layer and no patches -- so this is a primary-only ratchet over the
    // 31 ev-* objectives. Before this its objectives fell through
    // STRATUM_ACT_TOOLS_DEFAULT (the S2/S3 carrying-capacity / tenure / landscape /
    // water-yield / waste / energy / infra-condition surveys and the S5 cluster /
    // communal-systems / sanitation / energy / food-zone design block surfaced the
    // coarse access-utilities set instead of the source / structure / climate-
    // sector / zoning families). Each is now explicit; an intentional [] (the whole
    // S1 governance band, the social-fabric survey, the S4 settlement / infra / food
    // strategies and both financial objectives -- EV-S4.8 and EV-S7.5, communal
    // member cost-sharing encoded verbatim per the operator's 2026-05-29 no-gating
    // authorisation, mapped to [] so no act surface engages a contribution
    // instrument -- the S6 monitoring band, and the whole S7 phasing / launch /
    // onboarding / adaptive / exit band) still satisfies the ratchet -- only a
    // brand-new un-wired ev-* trips it.
    const missing = ECOVILLAGE_PRIMARY_OBJECTIVES.filter(
      (o) => !(o.id in OBJECTIVE_ACT_TOOLS_OVERRIDE),
    ).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('every catalogue id emitted for any objective resolves in ACT_TOOL_CATALOG', () => {
    // Sweep every encoded catalogue objective through the resolver (override or
    // stratum default) so a tool id that does not mount is caught regardless of
    // which catalogue surfaced it.
    const unresolved: string[] = [];
    for (const objective of allCatalogueObjectives()) {
      for (const id of getObjectiveActTools(objective)) {
        if (!(id in ACT_TOOL_CATALOG)) {
          unresolved.push(`${objective.id} -> ${id}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('every catalogue tool declares a known category and matching id', () => {
    for (const [key, tool] of Object.entries(ACT_TOOL_CATALOG)) {
      expect(tool.id).toBe(key);
      expect(categoryIds.has(tool.category)).toBe(true);
    }
  });
});
