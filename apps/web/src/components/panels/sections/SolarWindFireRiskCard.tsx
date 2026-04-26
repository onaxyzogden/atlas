/**
 * §3 SolarWindFireRiskCard — solar exposure, wind regime, and wildfire
 * risk rollup derived from the existing climate + land_cover summaries.
 *
 * Closes manifest item `solar-wind-fire` (P2 planned → done).
 *
 * The ClimateProjectionsSection already shows projected precip/temp shifts;
 * the EnvironmentalRiskSection covers air quality + earthquake + Superfund.
 * What was missing:
 *   1. Solar exposure tier from annual_sunshine_hours (drives PV / drying /
 *      glazing decisions).
 *   2. Wind regime — prevailing direction + an exposure tier from canopy
 *      cover (drives windbreak orientation, structure siting, drift).
 *   3. Wildfire risk — heuristic combining aridity (precip vs ET proxy)
 *      with continuous-fuel cover (tree_canopy_pct), since FEMA/CalFire
 *      authoritative layers aren't loaded for arbitrary parcels.
 *
 * Pure presentation — reads climate + land_cover summaries from the layers
 * prop. Optional lat used for the solar-tilt design hint.
 */

import { memo, useMemo } from 'react';
import type { MockLayerResult } from '../../../lib/mockLayerData.js';
import s from './SolarWindFireRiskCard.module.css';

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
  hardiness_zone?: string;
  prevailing_wind?: string;
  annual_sunshine_hours?: number;
}

interface LandCoverSummary {
  tree_canopy_pct?: number;
  impervious_pct?: number;
}

interface Props {
  layers: MockLayerResult[];
  /** Project centroid latitude in degrees, used for solar-tilt design hint. */
  lat?: number | null;
}

type Tone = 'good' | 'fair' | 'poor';

interface FacetReport {
  tone: Tone;
  word: string;
  detail: string;
  hint: string;
}

interface SolarReport extends FacetReport {
  sunshineHours: number | null;
  designTiltDeg: number | null;
}

interface WindReport extends FacetReport {
  prevailing: string | null;
  windbreakOrientation: string | null;
  exposurePct: number | null;
}

interface FireReport extends FacetReport {
  ariditySignal: string;
  fuelLoad: string;
}

function getSummary<T>(layers: MockLayerResult[], type: string): T | null {
  const layer = layers.find((l) => l.layerType === type);
  return (layer?.summary as T) ?? null;
}

/* ── Solar ─────────────────────────────────────────────────────────────── */

function analyzeSolar(climate: ClimateSummary | null, lat: number | null): SolarReport {
  const hours = climate?.annual_sunshine_hours ?? null;
  if (hours == null) {
    return {
      tone: 'fair',
      word: 'Unknown',
      detail: 'No sunshine-hour data in the climate summary for this parcel.',
      hint: 'Add a NOAA / ECCC normals fetch to populate.',
      sunshineHours: null,
      designTiltDeg: lat != null ? Math.round(Math.abs(lat)) : null,
    };
  }
  let tone: Tone;
  let word: string;
  let detail: string;
  if (hours >= 2400) {
    tone = 'good';
    word = 'Excellent';
    detail = `${hours} sunshine hours/yr — strong PV yield, passive drying, and high glazing payoff.`;
  } else if (hours >= 1900) {
    tone = 'good';
    word = 'Good';
    detail = `${hours} sunshine hours/yr — solid PV economics; consider tracker arrays for marginal seasons.`;
  } else if (hours >= 1500) {
    tone = 'fair';
    word = 'Moderate';
    detail = `${hours} sunshine hours/yr — workable for PV but factor in winter low; orient glazing carefully.`;
  } else {
    tone = 'poor';
    word = 'Limited';
    detail = `${hours} sunshine hours/yr — cloud-belt parcel; prioritize south glazing, accept lower PV yield.`;
  }
  const tilt = lat != null ? Math.round(Math.abs(lat)) : null;
  const hint = tilt != null
    ? `Optimal fixed-array tilt \u2248 ${tilt}\u00b0 (latitude); reduce ~10\u00b0 to favor summer, raise ~10\u00b0 for winter.`
    : 'Set project boundary to compute optimal fixed-array tilt.';
  return { tone, word, detail, hint, sunshineHours: hours, designTiltDeg: tilt };
}

/* ── Wind ──────────────────────────────────────────────────────────────── */

const COMPASS_PERPENDICULAR: Record<string, string> = {
  N: 'E\u2013W', NNE: 'WSW\u2013ENE', NE: 'NW\u2013SE', ENE: 'NNW\u2013SSE',
  E: 'N\u2013S', ESE: 'NNE\u2013SSW', SE: 'NE\u2013SW', SSE: 'ENE\u2013WSW',
  S: 'E\u2013W', SSW: 'ESE\u2013WNW', SW: 'NW\u2013SE', WSW: 'NNW\u2013SSE',
  W: 'N\u2013S', WNW: 'NNE\u2013SSW', NW: 'NE\u2013SW', NNW: 'ENE\u2013WSW',
};

function dominantDirection(prevailing: string): string {
  const first = prevailing.split(/[-\s/]/)[0]?.trim().toUpperCase() ?? '';
  return first;
}

function analyzeWind(climate: ClimateSummary | null, landCover: LandCoverSummary | null): WindReport {
  const prevailing = climate?.prevailing_wind ?? null;
  const canopy = landCover?.tree_canopy_pct ?? null;
  const exposurePct = canopy != null ? Math.max(0, 100 - canopy) : null;

  const dom = prevailing ? dominantDirection(prevailing) : null;
  const orientation = dom && COMPASS_PERPENDICULAR[dom] ? COMPASS_PERPENDICULAR[dom] : null;

  if (prevailing == null && canopy == null) {
    return {
      tone: 'fair',
      word: 'Unknown',
      detail: 'No prevailing-wind or canopy data available.',
      hint: 'Populate the climate + land_cover summaries to derive an exposure tier.',
      prevailing: null,
      windbreakOrientation: null,
      exposurePct: null,
    };
  }

  let tone: Tone;
  let word: string;
  if (exposurePct == null) {
    tone = 'fair';
    word = 'Direction known';
  } else if (exposurePct >= 75) {
    tone = 'poor';
    word = 'Highly exposed';
  } else if (exposurePct >= 45) {
    tone = 'fair';
    word = 'Moderately exposed';
  } else {
    tone = 'good';
    word = 'Sheltered';
  }

  const detailParts: string[] = [];
  if (prevailing) detailParts.push(`Prevailing wind: ${prevailing}.`);
  if (exposurePct != null) detailParts.push(`Open / non-canopy land: ${Math.round(exposurePct)}%.`);
  const detail = detailParts.join(' ');

  const hint = orientation
    ? `Plant windbreaks on the ${orientation} axis to break the prevailing flow; site sensitive structures on the lee side.`
    : 'Once prevailing direction is known, orient windbreaks perpendicular to it.';

  return {
    tone,
    word,
    detail,
    hint,
    prevailing,
    windbreakOrientation: orientation,
    exposurePct,
  };
}

/* ── Fire ──────────────────────────────────────────────────────────────── */

function analyzeFire(climate: ClimateSummary | null, landCover: LandCoverSummary | null): FireReport {
  const precip = climate?.annual_precip_mm ?? null;
  const tempMean = climate?.annual_temp_mean_c ?? null;
  const seasonDays = climate?.growing_season_days ?? null;
  const canopy = landCover?.tree_canopy_pct ?? null;

  if (precip == null && canopy == null) {
    return {
      tone: 'fair',
      word: 'Unknown',
      detail: 'No precip or canopy data — fire-risk heuristic cannot be computed.',
      hint: 'For authoritative tiers consult FEMA Wildfire Risk to Communities (US) or CWFIS (CA).',
      ariditySignal: 'Unknown',
      fuelLoad: 'Unknown',
    };
  }

  // Aridity: precip vs a temperature-driven ET proxy (mm/yr).
  // ET proxy = max(0, tempMean) * seasonDays * 4.5 (rough Hargreaves-ish scalar).
  let aridityScore = 0;
  let ariditySignal = 'Moisture-balanced';
  if (precip != null && tempMean != null && seasonDays != null) {
    const etProxy = Math.max(0, tempMean) * seasonDays * 4.5;
    const ratio = precip / Math.max(etProxy, 1);
    if (ratio < 0.4) { aridityScore = 3; ariditySignal = 'Strongly arid'; }
    else if (ratio < 0.7) { aridityScore = 2; ariditySignal = 'Seasonally dry'; }
    else if (ratio < 1.1) { aridityScore = 1; ariditySignal = 'Moisture-balanced'; }
    else { aridityScore = 0; ariditySignal = 'Humid / surplus'; }
  } else if (precip != null) {
    if (precip < 400) { aridityScore = 3; ariditySignal = 'Low precip (<400 mm)'; }
    else if (precip < 700) { aridityScore = 2; ariditySignal = 'Moderate precip'; }
    else if (precip < 1000) { aridityScore = 1; ariditySignal = 'Adequate precip'; }
    else { aridityScore = 0; ariditySignal = 'Wet (>1000 mm)'; }
  }

  // Fuel load from canopy.
  let fuelScore = 0;
  let fuelLoad = 'Unknown';
  if (canopy != null) {
    if (canopy >= 60) { fuelScore = 3; fuelLoad = 'Heavy continuous fuel'; }
    else if (canopy >= 35) { fuelScore = 2; fuelLoad = 'Moderate fuel'; }
    else if (canopy >= 15) { fuelScore = 1; fuelLoad = 'Light fuel'; }
    else { fuelScore = 0; fuelLoad = 'Sparse fuel'; }
  }

  const total = aridityScore + fuelScore;
  let tone: Tone;
  let word: string;
  if (total >= 5) { tone = 'poor'; word = 'High'; }
  else if (total >= 3) { tone = 'fair'; word = 'Moderate'; }
  else if (total >= 1) { tone = 'good'; word = 'Low'; }
  else { tone = 'good'; word = 'Very low'; }

  const detail = `${ariditySignal}; ${fuelLoad.toLowerCase()}${canopy != null ? ` (${canopy}% canopy)` : ''}.`;
  const hint = total >= 3
    ? 'Maintain a 30 m defensible space around structures, harden roof + vents, plan a water-shuttle plug, and reduce ladder-fuel under any conifers.'
    : 'Standard rural prudence: keep mowed firebreaks at structure perimeters, store fuel away from buildings.';

  return { tone, word, detail, hint, ariditySignal, fuelLoad };
}

/* ── Component ─────────────────────────────────────────────────────────── */

export const SolarWindFireRiskCard = memo(function SolarWindFireRiskCard({ layers, lat }: Props) {
  const data = useMemo(() => {
    const climate = getSummary<ClimateSummary>(layers, 'climate');
    const landCover = getSummary<LandCoverSummary>(layers, 'land_cover');
    return {
      solar: analyzeSolar(climate, lat ?? null),
      wind: analyzeWind(climate, landCover),
      fire: analyzeFire(climate, landCover),
      hasAnyData: !!climate || !!landCover,
    };
  }, [layers, lat]);

  if (!data.hasAnyData) return null;

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Solar, Wind & Wildfire Risk</h3>
          <p className={s.cardHint}>
            Three-facet design rollup derived from climate + land-cover
            summaries. Heuristic only \u2014 use FEMA / CalFire / CWFIS for
            authoritative wildfire tiers.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      {/* ── Solar ──────────────────────────────────────────────────── */}
      <div className={`${s.facet} ${s[`tone_${data.solar.tone}`] ?? ''}`}>
        <div className={s.facetHead}>
          <span className={s.facetLabel}>Solar exposure</span>
          <span className={s.verdictWord}>{data.solar.word}</span>
        </div>
        <p className={s.facetDetail}>{data.solar.detail}</p>
        <p className={s.facetHintLine}>{data.solar.hint}</p>
        {(data.solar.sunshineHours != null || data.solar.designTiltDeg != null) && (
          <div className={s.statRow}>
            {data.solar.sunshineHours != null && (
              <div className={s.statBlock}>
                <span className={s.statLabel}>Sunshine</span>
                <span className={s.statVal}>{data.solar.sunshineHours} hr</span>
              </div>
            )}
            {data.solar.designTiltDeg != null && (
              <div className={s.statBlock}>
                <span className={s.statLabel}>Design tilt</span>
                <span className={s.statVal}>{data.solar.designTiltDeg}{'\u00b0'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Wind ───────────────────────────────────────────────────── */}
      <div className={`${s.facet} ${s[`tone_${data.wind.tone}`] ?? ''}`}>
        <div className={s.facetHead}>
          <span className={s.facetLabel}>Wind regime</span>
          <span className={s.verdictWord}>{data.wind.word}</span>
        </div>
        <p className={s.facetDetail}>{data.wind.detail}</p>
        <p className={s.facetHintLine}>{data.wind.hint}</p>
        {(data.wind.prevailing != null || data.wind.exposurePct != null) && (
          <div className={s.statRow}>
            {data.wind.prevailing != null && (
              <div className={s.statBlock}>
                <span className={s.statLabel}>Prevailing</span>
                <span className={s.statVal}>{data.wind.prevailing}</span>
              </div>
            )}
            {data.wind.windbreakOrientation != null && (
              <div className={s.statBlock}>
                <span className={s.statLabel}>Windbreak axis</span>
                <span className={s.statVal}>{data.wind.windbreakOrientation}</span>
              </div>
            )}
            {data.wind.exposurePct != null && (
              <div className={s.statBlock}>
                <span className={s.statLabel}>Open ground</span>
                <span className={s.statVal}>{Math.round(data.wind.exposurePct)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fire ───────────────────────────────────────────────────── */}
      <div className={`${s.facet} ${s[`tone_${data.fire.tone}`] ?? ''}`}>
        <div className={s.facetHead}>
          <span className={s.facetLabel}>Wildfire risk</span>
          <span className={s.verdictWord}>{data.fire.word}</span>
        </div>
        <p className={s.facetDetail}>{data.fire.detail}</p>
        <p className={s.facetHintLine}>{data.fire.hint}</p>
        <div className={s.statRow}>
          <div className={s.statBlock}>
            <span className={s.statLabel}>Aridity</span>
            <span className={s.statVal}>{data.fire.ariditySignal}</span>
          </div>
          <div className={s.statBlock}>
            <span className={s.statLabel}>Fuel</span>
            <span className={s.statVal}>{data.fire.fuelLoad}</span>
          </div>
        </div>
      </div>

      <p className={s.footnote}>
        <em>How this is computed:</em> Solar tier from{' '}
        <strong>annual_sunshine_hours</strong> (Excellent {'\u2265'}2400, Good
        {'\u2265'}1900, Moderate {'\u2265'}1500). Wind exposure from{' '}
        <strong>100 \u2013 tree_canopy_pct</strong> (Sheltered {'<'} 45%,
        Moderate {'<'} 75%, Highly exposed {'\u2265'} 75%). Wildfire risk
        sums an aridity score (precip vs a Hargreaves-ish ET proxy) and a
        fuel-load score (canopy %); 5{'\u2013'}6 = High, 3{'\u2013'}4 =
        Moderate, 1{'\u2013'}2 = Low, 0 = Very low. Heuristic guardrail
        \u2014 not a substitute for FEMA Wildfire Risk to Communities,
        CalFire FHSZ, or CWFIS daily indices.
      </p>
    </div>
  );
});
