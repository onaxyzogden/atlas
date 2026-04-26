/**
 * §19 WhyHerePanelsCard — for each placed entity type, three answer
 * panels:
 *   1. "Why here, not there?"   — siting rationale derived from
 *      proximity/slope/sun/drainage at the entity centroid.
 *   2. "What problem does this solve?" — mission-axis fit pulled from a
 *      curated category table.
 *   3. "What happens if omitted?"  — the negative-space description of
 *      what design need would go unmet.
 *
 * Closes manifest §19 `why-here-not-there-panels` (P3 partial -> done).
 *
 * Pure deterministic presentation — curated copy table per entity type
 * + lightweight site-data lookups. No LLM call. The "AI DRAFT" badge
 * tracks the §19 spec language only.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './WhyHerePanelsCard.module.css';

interface Props {
  project: LocalProject;
}

interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
  impervious_pct?: number | string;
}
interface SoilSummary {
  hydrologic_group?: string;
  drainage_class?: string;
}
interface WetlandsSummary {
  wetland_pct?: number;
  flood_zone?: string;
}

function parseNum(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

interface CopyEntry {
  problem: string;
  ifOmitted: string;
}

const STRUCTURE_COPY: Record<string, CopyEntry> = {
  residence: {
    problem:
      'Anchors daily presence on the land. Without a steward in residence, observation cycles slip from daily to weekly, and small management decisions stop happening at the right cadence.',
    ifOmitted:
      'Without a residence: management is remote-only. Pasture rotations get missed, irrigation faults run for days, and the parcel drifts toward whichever land use needs the least attention.',
  },
  barn: {
    problem:
      'Centralizes feed, tools, and shelter. The single biggest predictor of livestock and orchard productivity is how far the steward has to walk to do daily chores.',
    ifOmitted:
      'Without a barn: hay is stored outside (5–15% loss to weather), tools migrate to wherever they were last used, and chore time roughly doubles.',
  },
  greenhouse: {
    problem:
      'Stretches the growing season at both ends. In most climates a greenhouse adds 60–90 productive days per year — the difference between a 6-month and a 9-month income stream.',
    ifOmitted:
      'Without a greenhouse: starts must be bought rather than grown, and the spring/fall income shoulder is lost to frost.',
  },
  workshop: {
    problem:
      'Keeps maintenance velocity high. Equipment that breaks gets fixed the same week instead of accumulating in a corner of the barn.',
    ifOmitted:
      'Without a workshop: every repair becomes an off-site trip; small implements quietly decommission themselves.',
  },
  generic: {
    problem:
      'Reserves a footprint while design intent is being shaped. Useful as a placeholder; not useful for cost or phasing rollups until specified.',
    ifOmitted:
      'No problem solved yet — the footprint is a placeholder for a decision the steward has not made.',
  },
};

const UTILITY_COPY: Record<string, CopyEntry> = {
  water_tank: {
    problem:
      'Decouples water supply from water demand. Catchment fills the tank when it rains; the tank serves the parcel when it does not.',
    ifOmitted:
      'Without storage: every dry stretch puts the parcel on direct supply (well, municipal) with no buffer for fire, drought, or pump failure.',
  },
  well: {
    problem:
      'Provides parcel-independent water. Most rural parcels have no other potable option.',
    ifOmitted:
      'Without a well (and no municipal connection): no potable water on site — the parcel cannot host a residence or livestock.',
  },
  septic: {
    problem:
      'Treats wastewater on-site for parcels not on municipal sewer. Required by code for any dwelling.',
    ifOmitted:
      'Without septic (and no sewer): no occupiable dwelling can be permitted.',
  },
  solar: {
    problem:
      'Replaces grid electric with on-site generation. Pairs with battery for resilience and cuts operating cost by 40–80% over the array lifetime.',
    ifOmitted:
      'Without solar: full grid dependency with the associated monthly cost and grid-failure exposure.',
  },
  generic: {
    problem:
      'Reserves a utility footprint while design is in flux.',
    ifOmitted: 'No problem solved yet — placeholder until specified.',
  },
};

const CROP_COPY: Record<string, CopyEntry> = {
  orchard: {
    problem:
      'Long-lived calorie + cash crop with a rising yield curve from years 3–8. Carbon-sequestering and pollinator-supporting at maturity.',
    ifOmitted:
      'Without an orchard: no perennial fruit/nut yield; the parcel relies on annual rotations for all food production.',
  },
  food_forest: {
    problem:
      'Stacks yields vertically across canopy / sub-canopy / shrub / herb / vine / ground cover. Mature systems are low-input and biodiversity-rich.',
    ifOmitted:
      'Without a food forest: vertical integration is missed; the same area produces a fraction of the calorie + species diversity.',
  },
  row_crop: {
    problem:
      'Highest short-term yield per acre for staple foods. Mechanizable and storable.',
    ifOmitted:
      'Without row crops: staple food (grain, beans, potatoes) is purchased rather than produced.',
  },
  market_garden: {
    problem:
      'Highest gross revenue per acre of any crop type. Supports CSA and farmers-market business models.',
    ifOmitted:
      'Without a market garden: highest-value-per-acre cash flow is forgone; the parcel has fewer options for direct-market revenue.',
  },
  garden_bed: {
    problem:
      'Daily calorie supplementation, herb access, and an educational surface for visitors and family.',
    ifOmitted:
      'Without a garden bed: no household-scale food production; even small kitchen-table needs are purchased.',
  },
  windbreak: {
    problem:
      'Cuts livestock chill stress, reduces evapotranspiration on adjacent crops, and stabilizes soil. Effective lee zone is 10–15× the windbreak height.',
    ifOmitted:
      'Without a windbreak: full wind exposure across paddocks and crops, with measurably higher livestock feed demand and lower crop yields.',
  },
  shelterbelt: {
    problem:
      'Wider, multi-row windbreak that doubles as wildlife corridor and (with nut/fruit species) a yielding system.',
    ifOmitted:
      'Without a shelterbelt: wind protection narrower, no habitat corridor, and a missed yield surface.',
  },
  silvopasture: {
    problem:
      'Integrated tree + pasture system. Trees provide shade, browse, and timber/nut yield while pasture stays productive — measurably higher per-acre return than either alone.',
    ifOmitted:
      'Without silvopasture: pasture and orchard are separate land uses; total yield per acre is the sum of two single uses, not the integration.',
  },
  nursery: {
    problem:
      'On-site propagation cuts plant cost dramatically vs. retail and allows local-genetic stock that performs better year after year.',
    ifOmitted:
      'Without a nursery: every transplant is purchased — typically 5–10× the per-plant cost, with no local-adaptation advantage.',
  },
  pollinator_strip: {
    problem:
      'Lifts pollination yield in adjacent crops and supports native bees and butterflies. Small footprint, high system-wide leverage.',
    ifOmitted:
      'Without a pollinator strip: native pollinator populations decline and crop pollination relies on rented or weather-dependent honeybees.',
  },
};

const PADDOCK_COPY: CopyEntry = {
  problem:
    'Rotational grazing rebuilds soil, breaks parasite cycles, and keeps forage in vegetative growth. Without paddock subdivision, the parcel is set-stocked — the lowest-productivity, highest-degradation grazing pattern.',
  ifOmitted:
    'Without paddocks: livestock graze continuously across the whole parcel; soil compacts, palatable species decline, and parasite loads climb.',
};

const ZONE_COPY: CopyEntry = {
  problem:
    'Classifies the parcel by management intent so downstream rollups (carbon, water, cost) can attribute effects to discrete strategies.',
  ifOmitted:
    'Without zones: design rollups treat the parcel as homogeneous — losing the steward intent that would let the system recommend strategy-specific interventions.',
};

interface Panel {
  group: 'structure' | 'utility' | 'crop' | 'paddock' | 'zone';
  groupLabel: string;
  typeLabel: string;
  count: number;
  representative: string;
  whyHere: string;
  problem: string;
  ifOmitted: string;
}

function fmtSlope(s: number | undefined | null): string {
  if (s == null || !Number.isFinite(s)) return '';
  return `${s.toFixed(1)}\u00B0`;
}

function buildWhyHere(
  group: string,
  type: string,
  slopeDeg: number | undefined | null,
  canopyPct: number | null,
  imperviousPct: number | null,
  hsg: string | undefined | null,
  floodZone: string | undefined | null,
  wetlandPct: number | undefined | null,
): string {
  const parts: string[] = [];
  const slope = fmtSlope(slopeDeg);
  if (slope) parts.push(`mean slope ${slope}`);
  if (canopyPct != null) parts.push(`${canopyPct.toFixed(0)}% canopy`);
  if (imperviousPct != null && imperviousPct > 5)
    parts.push(`${imperviousPct.toFixed(0)}% impervious`);
  if (hsg) parts.push(`hydrologic group ${hsg}`);
  if (floodZone) parts.push(`FEMA Zone ${floodZone}`);
  if (wetlandPct != null && wetlandPct > 0)
    parts.push(`${wetlandPct.toFixed(1)}% wetland`);
  const ctx =
    parts.length > 0
      ? `Site context: ${parts.join(', ')}.`
      : 'Site context: layers not loaded — siting rationale is generic to type.';

  let typeRationale = '';
  if (group === 'structure') {
    if (type === 'residence' || type === 'workshop') {
      typeRationale =
        'Best on the flattest contour shoulder with road access and uphill of any septic field.';
    } else if (type === 'greenhouse') {
      typeRationale =
        'Best with east-west long-axis orientation, 6+ winter sun hours, and irrigation supply within 50 ft.';
    } else if (type === 'barn') {
      typeRationale =
        'Best near the operational core with downhill drainage away from any pond or stream.';
    } else {
      typeRationale =
        'Best on stable ground with clear approach access and known drainage routing.';
    }
  } else if (group === 'utility') {
    if (type === 'water_tank') {
      typeRationale =
        'Best uphill of primary use points (gravity feed) with an erosion-safe overflow path.';
    } else if (type === 'well') {
      typeRationale =
        'Best 50+ ft from any septic, on accessible ground for the drilling rig, near suspected aquifer recharge.';
    } else if (type === 'septic') {
      typeRationale =
        'Best 100 ft from wells, 50 ft from streams, with soil hydrologic group A or B for primary drainfield.';
    } else if (type === 'solar') {
      typeRationale =
        'Best with unshaded southern exposure, no canopy growth path within 100 ft, and inverter location near the panel array.';
    } else {
      typeRationale = 'Best where service routing reaches the use point with minimum trenching.';
    }
  } else if (group === 'crop') {
    if (type === 'orchard' || type === 'food_forest') {
      typeRationale =
        'Best on well-drained ground with 6+ growing-season sun hours and protection from prevailing wind.';
    } else if (type === 'row_crop' || type === 'market_garden' || type === 'garden_bed') {
      typeRationale =
        'Best on slope ≤6° with deep soil, irrigation reliability, and a wash/pack/processing surface within 200 ft.';
    } else if (type === 'windbreak' || type === 'shelterbelt') {
      typeRationale = 'Best perpendicular to dominant winter wind, in long unbroken runs.';
    } else if (type === 'silvopasture') {
      typeRationale =
        'Best on existing pasture with scattered trees protected and a rotation plan honoring tree establishment.';
    } else if (type === 'pollinator_strip') {
      typeRationale = 'Best at field edges, near insect-pollinated crops, on ground difficult to till.';
    } else {
      typeRationale = 'Best on suitable substrate with reliable water and protection from animal pressure.';
    }
  } else if (group === 'paddock') {
    typeRationale =
      'Best subdivided so every cell has water access, a back-fence rotation path, and corresponds to one day to one week of feed for the planned animal-unit-month.';
  } else if (group === 'zone') {
    typeRationale =
      'Best drawn to match management intent boundaries (production / conservation / buffer / commons), not arbitrary acreage targets.';
  }

  return `${ctx} ${typeRationale}`;
}

export default function WhyHerePanelsCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === project.id),
    [allStructures, project.id],
  );
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const siteData = useSiteData(project.id);

  const [openKey, setOpenKey] = useState<string | null>(null);

  const panels = useMemo<Panel[]>(() => {
    const elevation = siteData
      ? getLayerSummary<ElevationSummary>(siteData, 'elevation')
      : null;
    const landcover = siteData
      ? getLayerSummary<LandCoverSummary>(siteData, 'landcover')
      : null;
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const wetlands = siteData
      ? getLayerSummary<WetlandsSummary>(siteData, 'wetlands')
      : null;
    const slopeDeg = elevation?.mean_slope_deg;
    const canopyPct = parseNum(landcover?.tree_canopy_pct);
    const imperviousPct = parseNum(landcover?.impervious_pct);
    const hsg = soil?.hydrologic_group;
    const floodZone = wetlands?.flood_zone;
    const wetlandPct = wetlands?.wetland_pct;

    const out: Panel[] = [];

    // Group by type for each entity store
    const byStructureType = new Map<string, typeof structures>();
    for (const st of structures) {
      const t = String(st.type ?? 'generic').toLowerCase();
      const arr = byStructureType.get(t) ?? [];
      arr.push(st);
      byStructureType.set(t, arr);
    }
    for (const [t, arr] of byStructureType.entries()) {
      const entry = STRUCTURE_COPY[t] ?? STRUCTURE_COPY.generic;
      if (!entry) continue;
      const rep = arr[0]!;
      out.push({
        group: 'structure',
        groupLabel: 'Structure',
        typeLabel: t.replace(/_/g, ' '),
        count: arr.length,
        representative: rep.name,
        whyHere: buildWhyHere('structure', t, slopeDeg, canopyPct, imperviousPct, hsg, floodZone, wetlandPct),
        problem: entry.problem,
        ifOmitted: entry.ifOmitted,
      });
    }

    const byUtilityType = new Map<string, typeof utilities>();
    for (const u of utilities) {
      const t = String(u.type ?? 'generic').toLowerCase();
      const arr = byUtilityType.get(t) ?? [];
      arr.push(u);
      byUtilityType.set(t, arr);
    }
    for (const [t, arr] of byUtilityType.entries()) {
      const entry = UTILITY_COPY[t] ?? UTILITY_COPY.generic;
      if (!entry) continue;
      const rep = arr[0]!;
      out.push({
        group: 'utility',
        groupLabel: 'Utility',
        typeLabel: t.replace(/_/g, ' '),
        count: arr.length,
        representative: rep.name,
        whyHere: buildWhyHere('utility', t, slopeDeg, canopyPct, imperviousPct, hsg, floodZone, wetlandPct),
        problem: entry.problem,
        ifOmitted: entry.ifOmitted,
      });
    }

    const byCropType = new Map<string, typeof cropAreas>();
    for (const c of cropAreas) {
      const t = String(c.type ?? '').toLowerCase();
      if (!t) continue;
      const arr = byCropType.get(t) ?? [];
      arr.push(c);
      byCropType.set(t, arr);
    }
    for (const [t, arr] of byCropType.entries()) {
      const entry = CROP_COPY[t];
      if (!entry) continue;
      const rep = arr.slice().sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0))[0]!;
      out.push({
        group: 'crop',
        groupLabel: 'Crop area',
        typeLabel: t.replace(/_/g, ' '),
        count: arr.length,
        representative: rep.name,
        whyHere: buildWhyHere('crop', t, slopeDeg, canopyPct, imperviousPct, hsg, floodZone, wetlandPct),
        problem: entry.problem,
        ifOmitted: entry.ifOmitted,
      });
    }

    if (paddocks.length > 0) {
      const rep = paddocks
        .slice()
        .sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0))[0]!;
      out.push({
        group: 'paddock',
        groupLabel: 'Paddock',
        typeLabel: 'paddock',
        count: paddocks.length,
        representative: rep.name,
        whyHere: buildWhyHere('paddock', 'paddock', slopeDeg, canopyPct, imperviousPct, hsg, floodZone, wetlandPct),
        problem: PADDOCK_COPY.problem,
        ifOmitted: PADDOCK_COPY.ifOmitted,
      });
    }

    return out;
  }, [structures, utilities, cropAreas, paddocks, siteData]);

  return (
    <section className={css.card} aria-label="Why-here panels">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Why here, what problem, what if omitted</h3>
          <p className={css.cardHint}>
            Three answer panels per placed entity type:{' '}
            <em>why here, not there?</em>, <em>what problem does this solve?</em>,
            and <em>what happens if omitted?</em> Site context is read from
            the loaded layers; the rationale and problem framing comes from a
            curated copy table.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      {panels.length === 0 ? (
        <div className={css.empty}>
          No entities placed yet &mdash; place a structure, utility, crop
          area, or paddock and the why/what/if-omitted panels will surface
          here.
        </div>
      ) : (
        <ul className={css.list}>
          {panels.map((p) => {
            const id = `${p.group}-${p.typeLabel}`;
            const isOpen = openKey === id;
            return (
              <li
                key={id}
                className={`${css.row} ${css[`group_${p.group}`] ?? ''} ${
                  isOpen ? css.rowOpen : ''
                }`}
              >
                <button
                  type="button"
                  className={css.rowHead}
                  onClick={() => setOpenKey(isOpen ? null : id)}
                  aria-expanded={isOpen}
                >
                  <span className={css.rowGroup}>{p.groupLabel}</span>
                  <span className={css.rowTitle}>
                    {p.typeLabel}
                    {p.count > 1 ? (
                      <span className={css.rowCount}>{p.count} placed</span>
                    ) : (
                      <span className={css.rowCount}>{p.representative}</span>
                    )}
                  </span>
                  <span className={css.rowToggle}>{isOpen ? '\u2212' : '+'}</span>
                </button>
                {isOpen && (
                  <div className={css.rowBody}>
                    <div className={css.panel}>
                      <div className={css.panelLabel}>Why here, not there?</div>
                      <div className={css.panelText}>{p.whyHere}</div>
                    </div>
                    <div className={css.panel}>
                      <div className={css.panelLabel}>What problem does this solve?</div>
                      <div className={css.panelText}>{p.problem}</div>
                    </div>
                    <div className={css.panel}>
                      <div className={css.panelLabel}>What happens if omitted?</div>
                      <div className={css.panelText}>{p.ifOmitted}</div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className={css.footnote}>
        <em>How panels are generated:</em> deterministic. The site-context
        line in &ldquo;why here&rdquo; reads layer summaries (slope, canopy,
        impervious, hydrologic group, flood zone, wetland coverage); the
        type-specific siting rationale and the problem/if-omitted framings
        are curated copy keyed on entity type. Same inputs always produce
        the same panels &mdash; no LLM call.
      </p>
    </section>
  );
}
