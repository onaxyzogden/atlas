/**
 * §17 FeaturePlacementSuggestionsCard — for each candidate entity type
 * the project doesn't yet have (or could reasonably use more of), check
 * whether site-layer evidence supports placing one and surface a row
 * with explainability bullets.
 *
 * Each suggestion carries:
 *   - Title: the entity type to place (e.g., "Greenhouse", "Orchard block")
 *   - Where: a textual region descriptor derived from layer summaries
 *     (e.g., "south-facing 3° contour shoulder, well-drained soils")
 *   - Why: 2–4 explainability bullets — the layer constraints satisfied,
 *     the existing entity gap, the dashboard surface that would benefit
 *   - Confidence: high / medium / low — based on how cleanly the
 *     site-layer evidence matches the candidate's required envelope
 *
 * Deterministic — same inputs always produce the same suggestions, no
 * LLM call. The "AI DRAFT" badge tracks the §17 spec language only.
 *
 * Closes manifest §17 `ai-feature-placement-suggestions` (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './FeaturePlacementSuggestionsCard.module.css';

interface Props {
  project: LocalProject;
}

// ─── Layer summary types (subset matching what we actually read) ──────────────
interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  solar_radiation_kwh_m2_day?: number;
  wind_speed_ms?: number;
}
interface ElevationSummary {
  mean_slope_deg?: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
}
interface SoilsSummary {
  hydrologic_group?: string;
  drainage_class?: string;
}
interface WetlandsFlood {
  flood_zone?: string;
  wetland_pct?: number | string;
}
interface LandCoverSummary {
  forest_pct?: number | string;
  grass_pct?: number | string;
  impervious_pct?: number | string;
}

type Confidence = 'high' | 'medium' | 'low';
type EntityFamily = 'shelter' | 'production' | 'water' | 'energy' | 'sanitation' | 'cultural';

interface Suggestion {
  id: string;
  family: EntityFamily;
  confidence: Confidence;
  title: string;
  whereLine: string;
  bullets: string[];
}

const FAMILY_LABEL: Record<EntityFamily, string> = {
  shelter:    'Shelter & retreat',
  production: 'Food production',
  water:      'Water systems',
  energy:     'Energy systems',
  sanitation: 'Sanitation & waste',
  cultural:   'Cultural & spiritual',
};

const FAMILY_ORDER: EntityFamily[] = [
  'shelter',
  'production',
  'water',
  'energy',
  'sanitation',
  'cultural',
];

const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high:   'High confidence',
  medium: 'Medium confidence',
  low:    'Low confidence',
};

/** Parse a numeric layer field that may be number, numeric string, or null/undefined. */
function num(raw: unknown): number | null {
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const v = parseFloat(raw);
    return isFinite(v) ? v : null;
  }
  return null;
}

/** Coarse drainage rank: higher = better drained. */
function drainageRank(cls: string | undefined): number | null {
  if (!cls) return null;
  const c = cls.toLowerCase();
  if (c.includes('excessively')) return 5;
  if (c.includes('somewhat excessively')) return 4;
  if (c.includes('well')) return 4;
  if (c.includes('moderately well')) return 3;
  if (c.includes('somewhat poorly')) return 2;
  if (c.includes('poorly')) return 1;
  if (c.includes('very poorly')) return 0;
  return null;
}

export default function FeaturePlacementSuggestionsCard({ project }: Props) {
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
  const siteData = useSiteData(project.id);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!siteData) return [];

    const climate   = getLayerSummary<ClimateSummary>(siteData,    'climate');
    const elevation = getLayerSummary<ElevationSummary>(siteData,  'elevation');
    const soils     = getLayerSummary<SoilsSummary>(siteData,      'soils');
    const wetFlood  = getLayerSummary<WetlandsFlood>(siteData,     'wetlands_flood');
    const landCover = getLayerSummary<LandCoverSummary>(siteData,  'land_cover');

    const slopeDeg     = elevation?.mean_slope_deg ?? null;
    const solarKwh     = climate?.solar_radiation_kwh_m2_day ?? null;
    const annualTempC  = climate?.annual_temp_mean_c ?? null;
    const annualPrecip = climate?.annual_precip_mm ?? null;
    const windMs       = climate?.wind_speed_ms ?? null;
    const drainage     = drainageRank(soils?.drainage_class);
    const floodZone    = (wetFlood?.flood_zone ?? '').toUpperCase();
    const wetlandPct   = num(wetFlood?.wetland_pct);
    const forestPct    = num(landCover?.forest_pct);
    const grassPct     = num(landCover?.grass_pct);
    const imperviousPct = num(landCover?.impervious_pct);

    const isFloodZone = floodZone.startsWith('A') || floodZone.startsWith('V'); // FEMA AE/A/VE
    const isHighWetland = (wetlandPct ?? 0) > 15;

    // Entity-coverage tallies.
    const structTypes = new Set<StructureType>(structures.map((s) => s.type));
    const utilTypes   = new Set<UtilityType>(utilities.map((u) => u.type));
    const cropCount    = cropAreas.length;
    const paddockCount = paddocks.length;

    const out: Suggestion[] = [];

    // ── shelter ───────────────────────────────────────────────────────
    // Cabin / yurt — basic retreat lodging on a flat shoulder.
    if (!structTypes.has('cabin') && !structTypes.has('yurt') && !structTypes.has('earthship')) {
      const slopeOk = slopeDeg != null && slopeDeg <= 10;
      const drainOk = drainage == null || drainage >= 3;
      const notFlood = !isFloodZone;
      const conf: Confidence = slopeOk && drainOk && notFlood ? 'high'
        : (slopeOk || drainOk) && notFlood ? 'medium' : 'low';
      const bullets: string[] = [];
      if (slopeDeg != null) {
        bullets.push(slopeOk
          ? `Mean site slope ${slopeDeg.toFixed(1)}° leaves several flat shoulders within the buildable envelope.`
          : `Mean site slope ${slopeDeg.toFixed(1)}° is steep — restrict to the gentlest contour bands or step the foundation.`);
      } else {
        bullets.push('Slope data unavailable — verify with a contour walk before staking the footprint.');
      }
      if (drainage != null) {
        bullets.push(drainOk
          ? `Soils are ${soils?.drainage_class ?? 'well-drained'} — a slab or pier foundation will sit dry.`
          : `Soils are ${soils?.drainage_class ?? 'poorly drained'} — elevate the floor on piers and oversize the perimeter drain.`);
      }
      if (isFloodZone) bullets.push(`Site is in FEMA flood zone ${floodZone} — keep the structure outside the regulatory floodplain or elevate above BFE.`);
      bullets.push('No primary lodging placed yet — without it, retreat-night revenue, occupancy ramp, and §22 phasing all surface as 0.');
      out.push({
        id: 'place-cabin',
        family: 'shelter',
        confidence: conf,
        title: 'Primary lodging — cabin or yurt',
        whereLine: slopeDeg != null && slopeDeg <= 6
          ? 'A flat-to-gentle contour shoulder with morning sun and short walk to the access road.'
          : 'The flattest accessible contour band — favor uphill of any septic and downwind of cooking smoke.',
        bullets,
      });
    }

    // ── shelter / cultural — prayer space ─────────────────────────────
    if (!structTypes.has('prayer_space')) {
      out.push({
        id: 'place-prayer-space',
        family: 'cultural',
        confidence: 'medium',
        title: 'Prayer space (small structure or pavilion)',
        whereLine: 'A quiet eastern aspect with a clear qibla sightline and a buffer of trees or earth-berm to the working edge of camp.',
        bullets: [
          'No dedicated prayer surface placed yet — the §1 maqasid faith axis surfaces a structural gap, not just a vision-statement gap.',
          'Site orientation derives from parcel centroid; a small structure (4×6m or smaller) fits even on tight contour bands.',
          'Pairs well with an outdoor wudu station fed from the rain-catchment line.',
        ],
      });
    }

    // ── production / greenhouse ───────────────────────────────────────
    if (!structTypes.has('greenhouse')) {
      const slopeOk = slopeDeg != null && slopeDeg <= 5;
      const solarOk = solarKwh != null && solarKwh >= 4;
      const conf: Confidence = slopeOk && solarOk ? 'high'
        : slopeOk || solarOk ? 'medium' : 'low';
      const bullets: string[] = [];
      if (solarKwh != null) {
        bullets.push(solarOk
          ? `Solar resource ${solarKwh.toFixed(1)} kWh/m²/day clears the 4 kWh threshold for season-extension production.`
          : `Solar resource ${solarKwh.toFixed(1)} kWh/m²/day is marginal — orient long axis east-west and accept summer-only use.`);
      }
      if (slopeDeg != null) {
        bullets.push(slopeOk
          ? `Slope ${slopeDeg.toFixed(1)}° supports a level pad without major grading.`
          : `Slope ${slopeDeg.toFixed(1)}° is steep — pad will need cut-and-fill or terraced retaining.`);
      }
      if (annualTempC != null && annualTempC < 7) {
        bullets.push(`Mean annual temperature ${annualTempC.toFixed(1)}°C — a greenhouse converts 4-month outdoor season into 8-month productive growing.`);
      }
      bullets.push('No greenhouse placed yet — §11 productivity dashboard treats the entire growing season as outdoor-only.');
      out.push({
        id: 'place-greenhouse',
        family: 'production',
        confidence: conf,
        title: 'Greenhouse (season-extension)',
        whereLine: 'A level shoulder with east-west long axis, 6+ winter sun hours, and minimum-wind drainage off the structure.',
        bullets,
      });
    }

    // ── production / orchard block ────────────────────────────────────
    if (cropCount === 0 || (cropCount < 3 && (drainage ?? 0) >= 3)) {
      const slopeOk = slopeDeg != null && slopeDeg >= 1 && slopeDeg <= 12;
      const drainOk = drainage != null && drainage >= 3;
      const solarOk = solarKwh == null || solarKwh >= 3.5;
      const conf: Confidence = slopeOk && drainOk && solarOk ? 'high'
        : slopeOk || drainOk ? 'medium' : 'low';
      const bullets: string[] = [];
      if (slopeDeg != null) {
        bullets.push(slopeOk
          ? `Slope ${slopeDeg.toFixed(1)}° gives natural cold-air drainage — frost pockets settle below the orchard band, not in it.`
          : `Slope ${slopeDeg.toFixed(1)}° — too flat invites frost pooling, too steep complicates harvest access.`);
      }
      if (drainage != null) {
        bullets.push(drainOk
          ? `Soils are ${soils?.drainage_class ?? 'well-drained'} — fruit trees won't sit in winter waterlog.`
          : `Soils are ${soils?.drainage_class ?? 'poorly drained'} — pick wet-tolerant species (pawpaw, persimmon, elderberry) or mound-plant.`);
      }
      if (cropCount === 0) {
        bullets.push('No crop areas placed yet — perennial fruit is the lowest-labor entry point and the §11 carbon-sequestration card surfaces a 0 baseline.');
      } else {
        bullets.push(`Only ${cropCount} crop area${cropCount === 1 ? '' : 's'} placed — adding a perennial block diversifies away from annuals and lifts the §11 biodiversity index.`);
      }
      out.push({
        id: 'place-orchard',
        family: 'production',
        confidence: conf,
        title: 'Orchard block — perennial fruit / nut',
        whereLine: 'A 1–12° aspect with full sun, well-drained soils, and protection from prevailing wind via the existing forest edge or a windbreak.',
        bullets,
      });
    }

    // ── production / paddock ──────────────────────────────────────────
    if (paddockCount === 0 && (grassPct == null || grassPct >= 25)) {
      const grassOk = grassPct == null || grassPct >= 25;
      const slopeOk = slopeDeg == null || slopeDeg <= 18;
      const conf: Confidence = grassOk && slopeOk ? 'high' : 'medium';
      const bullets: string[] = [];
      if (grassPct != null) {
        bullets.push(grassOk
          ? `Land cover is ${grassPct.toFixed(0)}% grassland/herbaceous — paddocks utilize what is already there.`
          : `Land cover is only ${grassPct.toFixed(0)}% grassland — clearing or pasture conversion is needed first.`);
      } else {
        bullets.push('Land-cover layer unavailable — verify pasture vs. forest before subdivision.');
      }
      if (slopeDeg != null) {
        bullets.push(slopeOk
          ? `Slope ${slopeDeg.toFixed(1)}° is grazeable — keep livestock off ground steeper than 25% to prevent erosion.`
          : `Slope ${slopeDeg.toFixed(1)}° is steep — limit to browse animals (goats) or skip grazing on this band.`);
      }
      bullets.push('No paddocks placed yet — §11 livestock dashboard treats the parcel as ungrazed; rotational grazing is the fastest soil-organic-matter lift available.');
      out.push({
        id: 'place-paddock',
        family: 'production',
        confidence: conf,
        title: 'Rotational grazing paddock',
        whereLine: 'The largest contiguous grass / herbaceous block, subdivided into 4–8 cells with shade access and a water point per cell.',
        bullets,
      });
    }

    // ── water / well ──────────────────────────────────────────────────
    if (!utilTypes.has('well_pump') && !structTypes.has('well')) {
      const drainOk = drainage != null && drainage >= 2;
      const notFlood = !isFloodZone;
      const conf: Confidence = drainOk && notFlood ? 'medium' : 'low';
      const bullets: string[] = [];
      if (isFloodZone) {
        bullets.push(`Site is in FEMA flood zone ${floodZone} — wellhead must sit above BFE and >50 ft from any septic.`);
      } else {
        bullets.push('Site is outside FEMA-mapped flood zone — wellhead siting has flexibility.');
      }
      if (annualPrecip != null) {
        bullets.push(`Annual rainfall ${Math.round(annualPrecip)} mm — recharge depends on local hydrogeology, not just precipitation. Hire a local well driller for the actual yield estimate.`);
      }
      bullets.push('No well or well pump placed yet — without a primary water source, the §14 hydrology budget assumes 100% of demand from rain catchment, which is fragile in drought years.');
      out.push({
        id: 'place-well',
        family: 'water',
        confidence: conf,
        title: 'Well + pump house',
        whereLine: 'Uphill of any septic by ≥50 ft, outside the flood zone, and accessible to a drilling rig (within 100 ft of an access track).',
        bullets,
      });
    }

    // ── water / rain catchment ────────────────────────────────────────
    if (!utilTypes.has('rain_catchment') && !utilTypes.has('water_tank') && !structTypes.has('water_tank')) {
      const precipOk = annualPrecip == null || annualPrecip >= 400;
      const conf: Confidence = precipOk ? 'high' : 'low';
      const bullets: string[] = [];
      if (annualPrecip != null) {
        bullets.push(precipOk
          ? `Annual rainfall ${Math.round(annualPrecip)} mm yields meaningful catchment off any roofed structure — see the §14 Roof Catchment tab.`
          : `Annual rainfall ${Math.round(annualPrecip)} mm is low — rain catchment is supplemental, not primary.`);
      }
      if (structures.length === 0) {
        bullets.push('No roofed structures placed yet — pair this suggestion with the lodging suggestion above; a 5,000-gal tank costs an order of magnitude less than well drilling.');
      } else {
        bullets.push(`${structures.length} structure${structures.length === 1 ? '' : 's'} placed — attach a downspout-fed tank to the largest roofed structure for an immediate harvest stream.`);
      }
      bullets.push('No catchment or storage utility placed yet — §14 hydrology storage gap currently shows whatever the default retention factor implies, not measured capacity.');
      out.push({
        id: 'place-rain-catchment',
        family: 'water',
        confidence: conf,
        title: 'Rain catchment + cistern',
        whereLine: 'Downhill of the largest roof, on a level pad with first-flush diversion and overflow routed to a swale or pond.',
        bullets,
      });
    }

    // ── energy / solar ────────────────────────────────────────────────
    if (!utilTypes.has('solar_panel') && !structTypes.has('solar_array')) {
      const solarOk = solarKwh == null || solarKwh >= 4;
      const conf: Confidence = solarOk ? 'high' : 'medium';
      const bullets: string[] = [];
      if (solarKwh != null) {
        bullets.push(solarOk
          ? `Solar resource ${solarKwh.toFixed(1)} kWh/m²/day supports a productive PV system year-round.`
          : `Solar resource ${solarKwh.toFixed(1)} kWh/m²/day is marginal — size for summer load and budget for grid or generator backup.`);
      }
      if ((forestPct ?? 0) > 60) {
        bullets.push(`Forest cover is ${forestPct?.toFixed(0)}% — array siting needs a clearing or roof mount; ground mount under canopy will underperform.`);
      } else {
        bullets.push('Forest cover is moderate — ground-mount or pole-mount in an open clearing will beat roof-mount on most retreat-scale arrays.');
      }
      bullets.push('No solar generation placed yet — §13 energy dashboard treats the project as fully grid-dependent.');
      out.push({
        id: 'place-solar',
        family: 'energy',
        confidence: conf,
        title: 'Solar PV array',
        whereLine: 'A south-facing clearing (or south-facing roof slope) with no afternoon shading from canopy or ridgeline.',
        bullets,
      });
    }

    // ── sanitation / septic ───────────────────────────────────────────
    if (!utilTypes.has('septic') && !utilTypes.has('greywater')) {
      const drainOk = drainage != null && drainage >= 3;
      const notWetland = !isHighWetland;
      const conf: Confidence = drainOk && notWetland ? 'high'
        : drainOk || notWetland ? 'medium' : 'low';
      const bullets: string[] = [];
      if (drainage != null) {
        bullets.push(drainOk
          ? `Soils are ${soils?.drainage_class ?? 'well-drained'} — a conventional drain field will percolate without ponding.`
          : `Soils are ${soils?.drainage_class ?? 'poorly drained'} — code-compliant alternative system needed (mound, sand filter, or constructed wetland).`);
      }
      if (isHighWetland) {
        bullets.push(`Wetlands cover ${wetlandPct?.toFixed(0)}% of the site — drain field needs to clear the wetland setback (typically 100 ft).`);
      }
      if (imperviousPct != null && imperviousPct > 10) {
        bullets.push(`${imperviousPct.toFixed(0)}% impervious cover — drain field must avoid driveways, paths, and roof drip lines.`);
      }
      bullets.push('No septic or greywater placed yet — without it, lodging structures cannot be permitted in most jurisdictions.');
      out.push({
        id: 'place-septic',
        family: 'sanitation',
        confidence: conf,
        title: 'Septic or greywater system',
        whereLine: 'Downhill of any well by ≥50 ft, on well-drained soil, away from wetland buffers and high-traffic paths.',
        bullets,
      });
    }

    // ── shelter / windbreak (informational, low-lift) ─────────────────
    if (windMs != null && windMs >= 4 && (forestPct ?? 0) < 40 && structures.length > 0) {
      out.push({
        id: 'place-windbreak',
        family: 'shelter',
        confidence: 'medium',
        title: 'Windbreak hedgerow / shelterbelt',
        whereLine: `On the prevailing-wind edge of the structures already placed — typically the NW or W boundary at this latitude.`,
        bullets: [
          `Mean wind speed ${windMs.toFixed(1)} m/s — sustained over the year, this is the level at which structures see meaningful cooling load and orchard windburn.`,
          `Forest cover is only ${(forestPct ?? 0).toFixed(0)}% — natural windbreak is sparse, planting one delivers the largest microclimate effect of any single intervention.`,
          'A 3-row hedgerow (low/mid/canopy) reduces downwind wind speed by 50–70% for a distance of 5–10× the canopy height.',
          'Pairs with the §12 agroforestry windbreak/shelterbelt manifest item.',
        ],
      });
    }

    return out.sort((a, b) => {
      const fa = FAMILY_ORDER.indexOf(a.family);
      const fb = FAMILY_ORDER.indexOf(b.family);
      if (fa !== fb) return fa - fb;
      return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
    });
  }, [siteData, structures, utilities, cropAreas, paddocks]);

  const counts = useMemo(() => {
    const total = suggestions.length;
    const high = suggestions.filter((s) => s.confidence === 'high').length;
    const med  = suggestions.filter((s) => s.confidence === 'medium').length;
    const families = new Set(suggestions.map((s) => s.family)).size;
    return { total, high, med, families };
  }, [suggestions]);

  const overallTone =
    counts.total === 0
      ? css.tone_good
      : counts.high > 0
        ? css.tone_poor
        : counts.med > 0
          ? css.tone_fair
          : css.tone_muted;

  const grouped = useMemo(() => {
    const map: Partial<Record<EntityFamily, Suggestion[]>> = {};
    for (const s of suggestions) {
      const arr = map[s.family] ?? [];
      arr.push(s);
      map[s.family] = arr;
    }
    return FAMILY_ORDER.flatMap((f) => {
      const items = map[f];
      if (!items || items.length === 0) return [];
      return [{ family: f, items }];
    });
  }, [suggestions]);

  return (
    <section className={css.card} aria-label="AI feature placement suggestions">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Feature placement suggestions</h3>
          <p className={css.cardHint}>
            For each entity type the project doesn&rsquo;t yet have, a
            site-derived <em>where to put it</em> plus the layer constraints
            that make this site a good (or marginal) match. Confidence
            reflects how cleanly the layer evidence supports placement.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={`${css.summaryRow} ${overallTone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.total}</div>
          <div className={css.summaryLabel}>Suggestions</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.families}</div>
          <div className={css.summaryLabel}>Families</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.high}</div>
          <div className={css.summaryLabel}>High conf.</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.med}</div>
          <div className={css.summaryLabel}>Med conf.</div>
        </div>
      </div>

      {!siteData && (
        <div className={css.empty}>
          Site data not loaded yet. Suggestions become available once the
          site-intelligence layers (climate, elevation, soils, wetlands,
          land cover) finish fetching for this parcel.
        </div>
      )}

      {siteData && counts.total === 0 && (
        <div className={css.empty}>
          No placement suggestions outstanding &mdash; every candidate
          entity type this card watches for is either placed or not
          supported by the current layer evidence. Revisit when a major
          entity is removed or when site data refreshes.
        </div>
      )}

      {grouped.map(({ family, items }) => (
        <div key={family} className={css.familyBlock}>
          <h4 className={css.familyTitle}>{FAMILY_LABEL[family]}</h4>
          <ul className={css.list}>
            {items.map((s) => (
              <li
                key={s.id}
                className={`${css.row} ${
                  s.confidence === 'high'
                    ? css.conf_high
                    : s.confidence === 'medium'
                      ? css.conf_med
                      : css.conf_low
                }`}
              >
                <div className={css.rowHead}>
                  <span
                    className={`${css.confTag} ${
                      s.confidence === 'high'
                        ? css.tag_high
                        : s.confidence === 'medium'
                          ? css.tag_med
                          : css.tag_low
                    }`}
                  >
                    {CONFIDENCE_LABEL[s.confidence]}
                  </span>
                  <span className={css.rowTitle}>{s.title}</span>
                </div>
                <div className={css.rowBody}>
                  <div className={css.line}>
                    <span className={css.lineLabel}>Where:</span> {s.whereLine}
                  </div>
                  <ul className={css.bullets}>
                    {s.bullets.map((b, i) => (
                      <li key={i} className={css.bullet}>{b}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How suggestions are built:</em> deterministic checks against
        site-intelligence layer summaries (slope, solar, drainage, flood
        zone, wetland %, land cover, wind, precip) cross-referenced with
        what is already placed in the structure / utility / crop / paddock
        stores. No LLM call &mdash; same inputs always produce the same
        suggestions. Each suggestion is a <em>candidate to consider</em>,
        not a prescription &mdash; ground-truth with a site walk before
        committing.
      </p>
    </section>
  );
}
