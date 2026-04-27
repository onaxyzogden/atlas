/**
 * §17 NeedsSiteVisitCard — flags topics where the rule cascade is
 * running below-medium confidence and explicitly recommends a field
 * walk before trusting the dashboard. Pairs with the §17
 * AssumptionGapDetectorCard (which lists what defaults are in play)
 * and the §24 FieldworkChecklistCard (which captures the punch list
 * for the next visit).
 *
 * Topic-by-topic detection over the same site-data + entity stores
 * the dashboards already use. Each flag carries:
 *   - a topic label (water, soil, slope, vegetation, structures,
 *     livestock)
 *   - a confidence band (none / low / medium) — only `none` and `low`
 *     are surfaced; `medium` and above don't need a walk
 *   - a why-line: which inputs are missing or thin
 *   - a what-to-walk-for line: concrete observations a steward should
 *     bring back from the visit
 *
 * Pure read-side. No shared math, no LLM call. The "AI DRAFT" badge
 * tracks the §17 spec language.
 *
 * Closes manifest §17 `ai-needs-site-visit-flags` (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './NeedsSiteVisitCard.module.css';

interface Props {
  project: LocalProject;
}

type Topic = 'water' | 'soil' | 'slope' | 'vegetation' | 'structures' | 'livestock';
type Confidence = 'none' | 'low' | 'medium';

interface Flag {
  id: string;
  topic: Topic;
  confidence: Confidence;
  title: string;
  why: string;
  walkFor: string;
}

const TOPIC_LABEL: Record<Topic, string> = {
  water: 'Water',
  soil: 'Soil',
  slope: 'Slope & terrain',
  vegetation: 'Vegetation',
  structures: 'Structures',
  livestock: 'Livestock',
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  none: 'No confidence',
  low: 'Low confidence',
  medium: 'Medium confidence',
};

const TOPIC_ORDER: Topic[] = [
  'water',
  'soil',
  'slope',
  'vegetation',
  'structures',
  'livestock',
];

const CONFIDENCE_ORDER: Record<Confidence, number> = {
  none: 0,
  low: 1,
  medium: 2,
};

/* ── Loose layer-summary shapes (we only sample a few fields) ─────── */
interface ClimateSummary {
  annual_precip_mm?: number;
  growing_season_days?: number;
}
interface SoilSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface HydrologySummary {
  watershed_area_km2?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

export default function NeedsSiteVisitCard({ project }: Props) {
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

  const flags = useMemo<Flag[]>(() => {
    const out: Flag[] = [];
    const climate = siteData
      ? getLayerSummary<ClimateSummary>(siteData, 'climate')
      : null;
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const elevation = siteData
      ? getLayerSummary<ElevationSummary>(siteData, 'elevation')
      : null;
    const hydrology = siteData
      ? getLayerSummary<HydrologySummary>(siteData, 'hydrology')
      : null;
    const landcover = siteData
      ? getLayerSummary<LandCoverSummary>(siteData, 'landcover')
      : null;

    // ── water ──────────────────────────────────────────────────────
    const hasClimateNumbers =
      !!climate &&
      typeof climate.annual_precip_mm === 'number' &&
      climate.annual_precip_mm > 0;
    const waterUtilityCount = utilities.filter(
      (u) => u.type === 'water_tank' || u.type === 'well_pump' || u.type === 'rain_catchment',
    ).length;
    if (!hasClimateNumbers && !hydrology) {
      out.push({
        id: 'water-no-climate-no-hydrology',
        topic: 'water',
        confidence: 'none',
        title: 'No climate or hydrology data fetched',
        why: 'Annual precip is unknown and there is no watershed delineation. The water-budget tab is running in equal-12 distribution mode against a guess.',
      walkFor:
          'Existing wells, springs, seasonal seeps, drainage paths after rain, downhill water accumulation, neighbour water sources / shared aquifer notes.',
      });
    } else if (!hasClimateNumbers || !hydrology) {
      out.push({
        id: 'water-thin-data',
        topic: 'water',
        confidence: 'low',
        title: 'Water data is thin',
        why: hasClimateNumbers
          ? 'Climate exists but no hydrology layer — drainage and watershed routing are heuristic.'
          : 'Hydrology exists but climate precip is missing — annual catchment math defaults to a regional placeholder.',
        walkFor:
          'Where does runoff actually flow? Are there seasonal pools, ponds, low spots that hold water? Where would a swale or pond actually sit on the contour?',
      });
    }
    if (waterUtilityCount === 0) {
      out.push({
        id: 'water-no-infrastructure',
        topic: 'water',
        confidence: 'low',
        title: 'No water infrastructure placed yet',
        why: 'No wells, tanks, or rain catchment surfaces are on the map. Storage capacity, off-grid readiness, and seasonal-storage sizing all run against zero.',
        walkFor:
          'Existing well location & depth, tank sizes, rooftop catchment opportunities, water-truck access route, frost depth for buried lines.',
      });
    }

    // ── soil ───────────────────────────────────────────────────────
    const hasSoilFields =
      !!soil &&
      (soil.organic_matter_pct != null || soil.hydrologic_group != null);
    if (!soil) {
      out.push({
        id: 'soil-no-layer',
        topic: 'soil',
        confidence: 'none',
        title: 'No SSURGO soil layer fetched',
        why: 'Drainage class, hydrologic group, and organic-matter baselines are all unknown. Carbon sequestration scoring falls back to mid-band defaults.',
        walkFor:
          'Dig 3–5 hand-pits across the parcel: structure (crumbly vs. compacted), colour (depth of dark topsoil), smell, root depth, hand-texture (sand/silt/clay ribbon test), worm count.',
      });
    } else if (!hasSoilFields) {
      out.push({
        id: 'soil-thin-fields',
        topic: 'soil',
        confidence: 'low',
        title: 'Soil layer present but key fields missing',
        why: 'No organic-matter or hydrologic-group value parsed. Nutrient cycling and infiltration estimates are running thin.',
        walkFor:
          'Sample 2–3 reps across each major slope/aspect zone. A jar-test for texture and a $20 lab pH/OM test will collapse most of this uncertainty.',
      });
    }

    // ── slope / terrain ────────────────────────────────────────────
    const hasSlope =
      !!elevation && typeof elevation.mean_slope_deg === 'number';
    if (!elevation) {
      out.push({
        id: 'slope-no-layer',
        topic: 'slope',
        confidence: 'none',
        title: 'No elevation / slope layer fetched',
        why: 'USGS 3DEP slope, aspect, and curvature are absent. Steep-slope detection, sun-trap identification, and keyline geometry have nothing to compute against.',
        walkFor:
          'Walk the contour — where does the land break? Where are the flat shoulders, the steep faces, the swales? Carry a level or use a phone clinometer at 5–10 marker points.',
      });
    } else if (!hasSlope) {
      out.push({
        id: 'slope-no-mean',
        topic: 'slope',
        confidence: 'low',
        title: 'Elevation layer present, but mean slope missing',
        why: 'Per-acre slope distribution defaults are in use. Steep-slope warnings can fire false-positive or false-negative.',
        walkFor:
          'Walk the steepest faces and the flat shoulders. Note ground stability, erosion gullies, frost-hollow signs at the lowest points.',
      });
    }

    // ── vegetation ─────────────────────────────────────────────────
    const cropsMissingSpecies = cropAreas.filter((c) => c.species.length === 0).length;
    if (!landcover) {
      out.push({
        id: 'vegetation-no-landcover',
        topic: 'vegetation',
        confidence: 'none',
        title: 'No NLCD land-cover layer fetched',
        why: 'Tree-canopy %, vegetation type, and disturbance signals are absent. Ecological scoring uses a generic baseline.',
        walkFor:
          'Dominant overstory species, understory composition, invasive presence (priority weeds first), recent disturbance evidence (cut stumps, plough lines, burn scars).',
      });
    }
    if (cropAreas.length > 0 && cropsMissingSpecies > 0) {
      out.push({
        id: 'vegetation-crop-species-blank',
        topic: 'vegetation',
        confidence: 'low',
        title: `${cropsMissingSpecies} of ${cropAreas.length} crop areas have no species set`,
        why: 'Polyculture diversity and harvest-window estimation are running on area-type generic defaults.',
        walkFor:
          'Confirm what is actually growing in each marked area — and what should be replaced. Flag any mature trees worth keeping that the as-drawn polygons would clear.',
      });
    }

    // ── structures ─────────────────────────────────────────────────
    const structuresMissingNotes = structures.filter(
      (st) => !st.notes || st.notes.trim() === '',
    ).length;
    if (structures.length > 0 && structuresMissingNotes === structures.length) {
      out.push({
        id: 'structures-no-notes',
        topic: 'structures',
        confidence: 'low',
        title: 'No notes on any placed structure',
        why: 'Structures are sized by the type table only — no steward annotations capture access, condition, or build-feasibility constraints.',
        walkFor:
          'For each marked footprint: ground stability check, foundation type that fits, distance to nearest utility line, prevailing-wind orientation feel, view sightlines you actually want.',
      });
    }
    const hasNoElevationButHasStructures = structures.length > 0 && !elevation;
    if (hasNoElevationButHasStructures) {
      out.push({
        id: 'structures-no-elevation',
        topic: 'structures',
        confidence: 'low',
        title: 'Structures placed but no elevation data',
        why: 'Footprint placements have no terrain context. Drainage runoff, frost pockets, and view sightlines are guesses.',
        walkFor:
          'Stand on each marked footprint at first light and at sunset. What is the actual view? What is upslope of you? What floods after a heavy rain?',
      });
    }

    // ── livestock ──────────────────────────────────────────────────
    const paddocksMissingSpecies = paddocks.filter(
      (p) => p.species.length === 0,
    ).length;
    if (paddocks.length > 0 && paddocksMissingSpecies > 0) {
      out.push({
        id: 'livestock-paddock-species-blank',
        topic: 'livestock',
        confidence: 'low',
        title: `${paddocksMissingSpecies} of ${paddocks.length} paddocks have no species set`,
        why: 'Stocking density defaults to a single AU/ac. Rotation cycles and forage demand are placeholders.',
        walkFor:
          'Existing forage species mix, stocking history (talk to neighbour or prior owner), water access in each paddock, predator pressure, fence-line condition.',
      });
    }
    if (paddocks.length > 0 && !landcover) {
      out.push({
        id: 'livestock-no-landcover',
        topic: 'livestock',
        confidence: 'low',
        title: 'Paddocks placed but no land-cover data',
        why: 'Forage productivity baselines are unknown — carrying capacity is essentially a guess.',
        walkFor:
          'Plant-density walk with a square-foot frame at 5–10 representative spots per paddock; identify forage vs. weed cover ratio.',
      });
    }

    return out.sort((a, b) => {
      const da = TOPIC_ORDER.indexOf(a.topic);
      const db = TOPIC_ORDER.indexOf(b.topic);
      if (da !== db) return da - db;
      return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
    });
  }, [project, structures, utilities, cropAreas, paddocks, siteData]);

  const counts = useMemo(() => {
    const total = flags.length;
    const noConf = flags.filter((f) => f.confidence === 'none').length;
    const lowConf = flags.filter((f) => f.confidence === 'low').length;
    const topics = new Set(flags.map((f) => f.topic)).size;
    return { total, noConf, lowConf, topics };
  }, [flags]);

  const overallTone = counts.total === 0
    ? css.tone_good
    : counts.noConf > 0
      ? css.tone_poor
      : counts.lowConf > 4
        ? css.tone_fair
        : css.tone_muted;

  // Group by topic for render.
  const grouped = useMemo(() => {
    const map: Partial<Record<Topic, Flag[]>> = {};
    for (const f of flags) {
      const arr = map[f.topic] ?? [];
      arr.push(f);
      map[f.topic] = arr;
    }
    return TOPIC_ORDER.flatMap((t) => {
      const items = map[t];
      if (!items || items.length === 0) return [];
      return [{ topic: t, items }];
    });
  }, [flags]);

  return (
    <section className={css.card} aria-label="Needs site visit">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Needs site visit</h3>
          <p className={css.cardHint}>
            Topics where the rule cascade is running below-medium
            confidence. Each flag tells you{' '}
            <em>why</em> the dashboard can&rsquo;t ground its answer
            and <em>what to walk for</em> on the next field visit.
            High-confidence topics are not listed.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={`${css.summaryRow} ${overallTone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.total}</div>
          <div className={css.summaryLabel}>Flags</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.topics}</div>
          <div className={css.summaryLabel}>Topics affected</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.noConf}</div>
          <div className={css.summaryLabel}>No confidence</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.lowConf}</div>
          <div className={css.summaryLabel}>Low confidence</div>
        </div>
      </div>

      {counts.total === 0 && (
        <div className={css.empty}>
          No site-visit flags raised. Every topic has at least medium
          confidence in the underlying inputs &mdash; revisit when site
          data or placed entities change.
        </div>
      )}

      {grouped.map(({ topic, items }) => (
        <div key={topic} className={css.topicBlock}>
          <h4 className={css.topicTitle}>{TOPIC_LABEL[topic]}</h4>
          <ul className={css.flagList}>
            {items.map((f) => (
              <li
                key={f.id}
                className={`${css.flag} ${
                  f.confidence === 'none' ? css.conf_none : css.conf_low
                }`}
              >
                <div className={css.flagHead}>
                  <span
                    className={`${css.confTag} ${
                      f.confidence === 'none' ? css.tag_none : css.tag_low
                    }`}
                  >
                    {CONFIDENCE_LABEL[f.confidence]}
                  </span>
                  <span className={css.flagTitle}>{f.title}</span>
                </div>
                <div className={css.flagBody}>
                  <div className={css.flagLine}>
                    <span className={css.flagLineLabel}>Why:</span> {f.why}
                  </div>
                  <div className={css.flagLine}>
                    <span className={css.flagLineLabel}>Walk for:</span>{' '}
                    {f.walkFor}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How detection works:</em> deterministic threshold checks
        over the site-data layers and entity stores. A flag fires when
        the inputs feeding a given topic are missing entirely
        (&ldquo;no confidence&rdquo;) or thin enough that the dashboard
        is leaning hard on defaults (&ldquo;low confidence&rdquo;).
        Same inputs always produce the same output &mdash; no LLM call.
      </p>
    </section>
  );
}
