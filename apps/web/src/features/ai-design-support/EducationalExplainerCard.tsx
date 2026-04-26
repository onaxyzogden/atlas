/**
 * §17 EducationalExplainerCard — plain-English "what is this, why use it,
 * what to watch for" cards for entity types the steward has placed, plus
 * pre-place checklists for entity types they have NOT yet placed.
 *
 * The §17 spec calls for "AI educational explanation and checklist
 * generation". This is the deterministic-presentation surface: a curated
 * local copy table keyed by entity type/category, surfaced in the order
 * that matches the user's current parcel state.
 *
 * No LLM call. The "AI DRAFT" badge tracks the §17 spec language only.
 *
 * Closes manifest §17 `ai-educational-explanation-checklists`
 * (P3) planned -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import css from './EducationalExplainerCard.module.css';

interface Props {
  project: LocalProject;
}

interface Explainer {
  key: string;
  group: 'structure' | 'utility' | 'crop' | 'paddock' | 'zone';
  title: string;
  definition: string;
  whyUse: string;
  watchFor: string;
  preplace: string[];
}

const STRUCTURE_EXPLAINERS: Record<string, Explainer> = {
  residence: {
    key: 'residence',
    group: 'structure',
    title: 'Residence',
    definition: 'A dwelling for the steward, family, or onsite team.',
    whyUse: 'Anchors daily presence on the land — proximity is the single largest predictor of attentive management.',
    watchFor: 'Setbacks from property lines, septic/well separation, prevailing wind for woodsmoke, and view-shed from the road.',
    preplace: [
      'Confirm zoning permits a primary dwelling on this parcel.',
      'Verify septic perc test or sewer connection availability.',
      'Locate the well or municipal connection at least 50 ft uphill of any septic.',
      'Check FEMA flood zone status for the proposed footprint.',
    ],
  },
  barn: {
    key: 'barn',
    group: 'structure',
    title: 'Barn',
    definition: 'Multi-purpose covered space for hay, equipment, livestock shelter, or workshop use.',
    whyUse: 'Concentrates feed and tool access at the operational core, reducing daily walking distance.',
    watchFor: 'Manure runoff routing, hay-fire ventilation, electrical loads for outlets/lighting, and turning radius for trailers.',
    preplace: [
      'Identify the hay/feed source and confirm trailer access path.',
      'Plan a downhill drainage route away from any pond or stream.',
      'Decide whether a concrete slab or compacted aggregate is appropriate.',
    ],
  },
  greenhouse: {
    key: 'greenhouse',
    group: 'structure',
    title: 'Greenhouse',
    definition: 'Climate-protected growing structure for season extension or starts.',
    whyUse: 'Stretches the growing season at both ends; protects high-value transplants from frost and predation.',
    watchFor: 'Solar exposure (long axis east-west), summer overheating venting, water access for irrigation, and snow load on the frame.',
    preplace: [
      'Confirm 6+ hours of winter sun on the proposed footprint.',
      'Plan irrigation supply within 50 ft.',
      'Check prevailing winter wind and provide a windbreak if exposed.',
    ],
  },
  workshop: {
    key: 'workshop',
    group: 'structure',
    title: 'Workshop',
    definition: 'Enclosed space for tool storage, repair, and small-scale fabrication.',
    whyUse: 'Keeps maintenance velocity high — broken implements get fixed instead of accumulating.',
    watchFor: 'Power capacity (welder/compressor circuits), dust ventilation, and noise distance from residence.',
    preplace: [
      'Confirm 240V availability or panel capacity to add a circuit.',
      'Plan a dust-tolerant approach surface (gravel or concrete).',
    ],
  },
  generic: {
    key: 'generic',
    group: 'structure',
    title: 'Generic structure',
    definition: 'A placed footprint without a more specific type assigned.',
    whyUse: 'Reserves the location for a future build while design intent is still being shaped.',
    watchFor: 'Re-assign a specific type before financial or phasing rollups, otherwise the cost and value model is undefined.',
    preplace: [
      'Decide what this footprint is actually for before the next design review.',
    ],
  },
};

const UTILITY_EXPLAINERS: Record<string, Explainer> = {
  water_tank: {
    key: 'water_tank',
    group: 'utility',
    title: 'Water tank',
    definition: 'Above-ground or buried storage for catchment, well, or municipal water.',
    whyUse: 'Decouples supply from demand — critical for fire suppression, drought buffer, and pump cycling.',
    watchFor: 'Elevation relative to use points (gravity vs. pump), freeze protection, and overflow routing.',
    preplace: [
      'Decide on size based on roof catchment area times annual rainfall (or estimated demand).',
      'Pick a location uphill of primary use points if gravity feed is desired.',
      'Plan an overflow path that does not erode soil or pool against a structure.',
    ],
  },
  well: {
    key: 'well',
    group: 'utility',
    title: 'Well',
    definition: 'Drilled or driven point of access to groundwater.',
    whyUse: 'Independent water supply with no recurring municipal cost; often the only option on rural parcels.',
    watchFor: 'Setback from any septic system (typically 50–100 ft), depth uncertainty, and yield testing.',
    preplace: [
      'Pull neighbor well logs or USGS records to estimate depth and yield.',
      'Confirm 50+ ft from any septic field or barn.',
      'Budget for a yield test before committing to a high-demand use.',
    ],
  },
  septic: {
    key: 'septic',
    group: 'utility',
    title: 'Septic system',
    definition: 'Onsite wastewater treatment with tank and drainfield.',
    whyUse: 'Required for any dwelling not on municipal sewer.',
    watchFor: 'Perc-test results, drainfield distance from any well or surface water, and slope/soil restrictions.',
    preplace: [
      'Schedule a perc test if soil hydrologic group is C or D.',
      'Maintain 100 ft from wells, 50 ft from streams, 10 ft from property lines.',
      'Plan a reserve drainfield area equal to the primary.',
    ],
  },
  solar: {
    key: 'solar',
    group: 'utility',
    title: 'Solar array',
    definition: 'Photovoltaic generation, ground-mounted or roof-mounted.',
    whyUse: 'Reduces or eliminates grid electric cost; pairs with battery storage for resilience.',
    watchFor: 'Shading from trees over the next 20 years, panel orientation, and inverter location.',
    preplace: [
      'Map shadows from any tree taller than 30 ft within 100 ft of the array.',
      'Confirm roof structural capacity if mounting on a building.',
      'Decide grid-tied vs. battery-backed before sizing.',
    ],
  },
  generic: {
    key: 'generic',
    group: 'utility',
    title: 'Generic utility',
    definition: 'A utility footprint without a more specific type.',
    whyUse: 'Reserves the location while design is in flux.',
    watchFor: 'Re-assign a specific type before infrastructure phasing rollup.',
    preplace: ['Decide what this utility is before the next design review.'],
  },
};

const CROP_EXPLAINERS: Record<string, Explainer> = {
  orchard: {
    key: 'orchard',
    group: 'crop',
    title: 'Orchard',
    definition: 'Perennial fruit or nut tree planting on a defined polygon.',
    whyUse: 'Long-lived calorie + cash crop with rising yield curve from years 3–8.',
    watchFor: 'Cultivar chill-hour match to climate, deer/rodent pressure, irrigation in years 1–3, and pollinator partner trees.',
    preplace: [
      'Confirm at least 6 hours of growing-season sun.',
      'Verify soil drainage — most fruit trees fail in waterlogged ground.',
      'Plan a deer fence or individual cages from year 1.',
    ],
  },
  food_forest: {
    key: 'food_forest',
    group: 'crop',
    title: 'Food forest',
    definition: 'Multi-strata perennial planting (canopy, sub-canopy, shrub, herb, vine, ground cover).',
    whyUse: 'Yields stack vertically; mature systems are low-input and biodiversity-rich.',
    watchFor: 'Years 1–3 weed pressure on bare ground, water demand before canopy closure, and shade-out of the herb layer.',
    preplace: [
      'Sheet-mulch or cover-crop the polygon a season before planting.',
      'Plan irrigation through year 3 even if "self-sustaining" long term.',
      'Commit to a guild design before buying plants.',
    ],
  },
  row_crop: {
    key: 'row_crop',
    group: 'crop',
    title: 'Row crop',
    definition: 'Tilled annual production in linear rows (grain, vegetable, cover).',
    whyUse: 'Highest short-term yield per acre for staple foods; mechanizable.',
    watchFor: 'Erosion on slope, soil-organic-matter depletion under continuous tillage, and weed pressure.',
    preplace: [
      'Confirm slope is under 6° or plan contour beds.',
      'Plan a cover-crop rotation between cash crops.',
      'Identify the equipment (tractor, walk-behind) that will work the bed.',
    ],
  },
  market_garden: {
    key: 'market_garden',
    group: 'crop',
    title: 'Market garden',
    definition: 'Intensive vegetable production in permanent or semi-permanent beds.',
    whyUse: 'Highest gross revenue per acre of any crop type; supports CSA and farmers-market models.',
    watchFor: 'Labor demand peaks in May–July, irrigation reliability, and pest pressure on monocrop blocks.',
    preplace: [
      'Confirm water reliability — market gardens fail without consistent irrigation.',
      'Plan a wash/pack station within 200 ft of the bed area.',
      'Budget for tool inventory: broadfork, harvest knives, trays.',
    ],
  },
  garden_bed: {
    key: 'garden_bed',
    group: 'crop',
    title: 'Garden bed',
    definition: 'Small-scale household or kitchen-garden production.',
    whyUse: 'Daily calorie supplementation, herb access, and educational surface for visitors.',
    watchFor: 'Walking distance from kitchen, deer/rabbit pressure, and water hose reach.',
    preplace: [
      'Place within 100 ft of the kitchen door.',
      'Plan deer fencing if local pressure is medium or higher.',
    ],
  },
  windbreak: {
    key: 'windbreak',
    group: 'crop',
    title: 'Windbreak',
    definition: 'Linear tree/shrub planting designed to reduce wind speed downwind.',
    whyUse: 'Cuts livestock chill stress, reduces evapotranspiration on crops, and stabilizes soil.',
    watchFor: 'Effective lee zone is 10–15× the windbreak height; wrong species mix collapses the gradient.',
    preplace: [
      'Identify the prevailing winter wind direction.',
      'Plan multi-row mix (conifer + deciduous + shrub) for full lower-canopy density.',
    ],
  },
  shelterbelt: {
    key: 'shelterbelt',
    group: 'crop',
    title: 'Shelterbelt',
    definition: 'A wider, multi-row windbreak combining wind protection with habitat or yield.',
    whyUse: 'Doubles as wildlife corridor and (with nut/fruit species) a yielding system.',
    watchFor: 'Establishment cost and 5+ year horizon to functional density.',
    preplace: [
      'Layout perpendicular to dominant winter wind.',
      'Mix at least three species across height tiers.',
    ],
  },
  silvopasture: {
    key: 'silvopasture',
    group: 'crop',
    title: 'Silvopasture',
    definition: 'Integrated tree + pasture system grazed by livestock.',
    whyUse: 'Trees provide shade, browse, and nut/timber yield while pasture stays productive.',
    watchFor: 'Tree protection in years 1–5 (cages or temporary exclusion), and pasture species shade tolerance.',
    preplace: [
      'Cage every tree until it is taller than browse height for the species rotated through.',
      'Pick a pasture mix with at least one shade-tolerant grass and legume.',
    ],
  },
  nursery: {
    key: 'nursery',
    group: 'crop',
    title: 'Nursery',
    definition: 'On-site propagation area for transplants destined for elsewhere on the parcel.',
    whyUse: 'Cuts plant cost dramatically vs. retail purchase; allows local-genetic stock.',
    watchFor: 'Year-round irrigation, frost protection for tender starts, and labor for potting up.',
    preplace: [
      'Locate near water, hose-bib, and partial shade.',
      'Plan a propagation calendar before sourcing seed/cuttings.',
    ],
  },
  pollinator_strip: {
    key: 'pollinator_strip',
    group: 'crop',
    title: 'Pollinator strip',
    definition: 'Linear or block planting of flowering forbs and shrubs for pollinator support.',
    whyUse: 'Lifts pollination yield in adjacent crops and supports native bees and butterflies.',
    watchFor: 'Bloom-window gaps (need spring-summer-fall coverage), and weed competition in establishment.',
    preplace: [
      'Pick a species mix with overlapping bloom windows from April through October.',
      'Plan one weed-control pass through the first growing season.',
    ],
  },
};

const PADDOCK_EXPLAINER: Explainer = {
  key: 'paddock',
  group: 'paddock',
  title: 'Paddock',
  definition: 'Fenced grazing cell sized for a livestock group on a defined rotation.',
  whyUse: 'Rotational grazing rebuilds soil, breaks parasite cycles, and keeps forage in vegetative growth.',
  watchFor: 'Water access on every cell, rest period long enough for full regrowth, and seasonal carrying-capacity changes.',
  preplace: [
    'Decide on the species, group size, and rotation length first.',
    'Plan water in every paddock before placing the fence.',
    'Confirm the parcel can sustain the planned animal-unit-months on its forage base.',
  ],
};

const ZONE_EXPLAINER: Explainer = {
  key: 'zone',
  group: 'zone',
  title: 'Management zone',
  definition: 'Polygon classifying a portion of the parcel by intent (production, conservation, buffer, commons).',
  whyUse: 'Lets the design rollup attribute carbon, water, and cost effects to discrete management strategies.',
  watchFor: 'Overlapping or inconsistent classification will confuse downstream rollups.',
  preplace: [
    'Decide whether the zone reflects current state or intended future state.',
    'Pick a category that matches the dominant management intent, not edge cases.',
  ],
};

const ALL_STRUCTURE_KEYS = Object.keys(STRUCTURE_EXPLAINERS).filter((k) => k !== 'generic');
const ALL_UTILITY_KEYS = Object.keys(UTILITY_EXPLAINERS).filter((k) => k !== 'generic');
const ALL_CROP_KEYS = Object.keys(CROP_EXPLAINERS);

export default function EducationalExplainerCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const utilities = useUtilityStore((s) =>
    s.utilities.filter((u) => u.projectId === project.id),
  );
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const zones = useZoneStore((s) => s.zones.filter((z) => z.projectId === project.id));

  const [activeKey, setActiveKey] = useState<string | null>(null);

  const placedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const st of structures) {
      const t = String((st as { type?: string }).type ?? 'generic').toLowerCase();
      set.add(`structure:${STRUCTURE_EXPLAINERS[t] ? t : 'generic'}`);
    }
    for (const u of utilities) {
      const t = String((u as { type?: string }).type ?? 'generic').toLowerCase();
      set.add(`utility:${UTILITY_EXPLAINERS[t] ? t : 'generic'}`);
    }
    for (const c of cropAreas) {
      const t = String((c as { type?: string }).type ?? '').toLowerCase();
      if (CROP_EXPLAINERS[t]) set.add(`crop:${t}`);
    }
    if (paddocks.length > 0) set.add('paddock:paddock');
    if (zones.length > 0) set.add('zone:zone');
    return set;
  }, [structures, utilities, cropAreas, paddocks, zones]);

  const placedExplainers = useMemo<Explainer[]>(() => {
    const out: Explainer[] = [];
    for (const k of Array.from(placedKeys).sort()) {
      const [group, key] = k.split(':');
      if (!group || !key) continue;
      if (group === 'structure') {
        const e = STRUCTURE_EXPLAINERS[key];
        if (e) out.push(e);
      } else if (group === 'utility') {
        const e = UTILITY_EXPLAINERS[key];
        if (e) out.push(e);
      } else if (group === 'crop') {
        const e = CROP_EXPLAINERS[key];
        if (e) out.push(e);
      } else if (group === 'paddock') {
        out.push(PADDOCK_EXPLAINER);
      } else if (group === 'zone') {
        out.push(ZONE_EXPLAINER);
      }
    }
    return out;
  }, [placedKeys]);

  const missingExplainers = useMemo<Explainer[]>(() => {
    const out: Explainer[] = [];
    for (const k of ALL_STRUCTURE_KEYS) {
      if (!placedKeys.has(`structure:${k}`)) {
        const e = STRUCTURE_EXPLAINERS[k];
        if (e) out.push(e);
      }
    }
    for (const k of ALL_UTILITY_KEYS) {
      if (!placedKeys.has(`utility:${k}`)) {
        const e = UTILITY_EXPLAINERS[k];
        if (e) out.push(e);
      }
    }
    for (const k of ALL_CROP_KEYS) {
      if (!placedKeys.has(`crop:${k}`)) {
        const e = CROP_EXPLAINERS[k];
        if (e) out.push(e);
      }
    }
    if (!placedKeys.has('paddock:paddock')) out.push(PADDOCK_EXPLAINER);
    if (!placedKeys.has('zone:zone')) out.push(ZONE_EXPLAINER);
    return out;
  }, [placedKeys]);

  const counts = {
    placed: placedExplainers.length,
    missing: missingExplainers.length,
  };

  const renderCard = (e: Explainer, mode: 'placed' | 'missing') => {
    const id = `${mode}-${e.group}-${e.key}`;
    const isOpen = activeKey === id;
    return (
      <li
        key={id}
        className={`${css.row} ${css[`group_${e.group}`] ?? ''} ${
          isOpen ? css.rowOpen : ''
        }`}
      >
        <button
          type="button"
          className={css.rowHead}
          onClick={() => setActiveKey(isOpen ? null : id)}
          aria-expanded={isOpen}
        >
          <span className={css.rowGroup}>{e.group}</span>
          <span className={css.rowTitle}>{e.title}</span>
          <span className={css.rowToggle}>{isOpen ? '\u2212' : '+'}</span>
        </button>
        {isOpen && (
          <div className={css.rowBody}>
            <p className={css.line}>{e.definition}</p>
            <div className={css.line}>
              <span className={css.lineLabel}>Why use it:</span> {e.whyUse}
            </div>
            <div className={css.line}>
              <span className={css.lineLabel}>Watch for:</span> {e.watchFor}
            </div>
            {mode === 'missing' && (
              <div className={css.preplace}>
                <div className={css.lineLabel}>Pre-place checklist</div>
                <ul className={css.checklist}>
                  {e.preplace.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <section className={css.card} aria-label="Educational explainer">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Educational explainer &amp; pre-place checklists</h3>
          <p className={css.cardHint}>
            Plain-English &ldquo;what is this and why&rdquo; cards for the entity
            types you have placed, plus pre-place checklists for the types
            you have <em>not</em> placed yet. Click any row to expand.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={css.summaryRow}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.placed}</div>
          <div className={css.summaryLabel}>Placed types</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.missing}</div>
          <div className={css.summaryLabel}>Pre-place checklists</div>
        </div>
      </div>

      <div className={css.section}>
        <h4 className={css.sectionTitle}>What you have placed</h4>
        {placedExplainers.length === 0 ? (
          <div className={css.empty}>
            No entities placed yet &mdash; the pre-place checklists below
            are the right starting surface.
          </div>
        ) : (
          <ul className={css.list}>
            {placedExplainers.map((e) => renderCard(e, 'placed'))}
          </ul>
        )}
      </div>

      <div className={css.section}>
        <h4 className={css.sectionTitle}>Pre-place checklists (not yet placed)</h4>
        {missingExplainers.length === 0 ? (
          <div className={css.empty}>
            Every supported entity type is on the map. Future additions can
            be guided by the placed-entity cards above.
          </div>
        ) : (
          <ul className={css.list}>
            {missingExplainers.map((e) => renderCard(e, 'missing'))}
          </ul>
        )}
      </div>

      <p className={css.footnote}>
        <em>How explainers are generated:</em> deterministic lookup against
        a curated copy table keyed by entity type. Same inputs always
        produce the same cards &mdash; no LLM call. Copy is calibrated for
        an early-stage steward audience and covers the most common
        decisions, not every edge case.
      </p>
    </section>
  );
}
