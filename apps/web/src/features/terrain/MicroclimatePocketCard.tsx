/**
 * §7 MicroclimatePocketCard — derives 4 microclimate-pocket archetypes
 * from the parcel's dominant aspect, mean slope, and hardiness zone,
 * and recommends a planting / siting class for each.
 *
 * Composes existing site-data layers — no new fetches, no shared math:
 *   - elevation: predominant_aspect + mean_slope_deg
 *   - climate:   hardiness_zone (cold/warm modifier)
 *   - boundary:  parcel centroid latitude (for hemisphere flip)
 *
 * Four archetype pockets:
 *   - Warm pocket    (equator-facing slope ≥ 5°)
 *   - Morning sun    (east-facing slope ≥ 5°)
 *   - Afternoon heat (west-facing slope ≥ 5°)
 *   - Cool / shaded  (pole-facing slope ≥ 5°)
 *
 * Each pocket gets:
 *   - prevalence band (Strong / Moderate / Minor) keyed off how close the
 *     parcel's dominant aspect aligns with the archetype's bearing
 *   - microclimate effect line (frost-free window shift, soil-warming
 *     advantage, heat-stress risk, cool-season extension)
 *   - 3 species/siting classes appropriate for the pocket
 *
 * Heuristic only — sized as a steward checklist, not a microclimate
 * simulation. Mounted on TerrainDashboard between aspect distribution
 * and drainage analysis.
 *
 * Spec mapping: §4 `candidate-zones-pond-swale-keyline-orchard-grazing-structure`
 * (P2, partial — this card adds the orchard / heat-loving / cool-season
 * candidate-zone facet driven by aspect+slope+climate; does not close the
 * key, which also covers pond/swale/keyline/grazing/structure facets).
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import s from './MicroclimatePocketCard.module.css';

interface MicroclimatePocketCardProps {
  project: LocalProject;
}

interface ElevationSummary {
  predominant_aspect?: string;
  mean_slope_deg?: number;
}
interface ClimateSummary {
  hardiness_zone?: string;
  last_frost_date?: string;
  first_frost_date?: string;
}

type ArchetypeId = 'warm' | 'morning' | 'afternoon' | 'cool';

interface ArchetypeDef {
  id: ArchetypeId;
  /** Display label (lat-aware — "South-facing" in NH, "North-facing" in SH). */
  label: (latitudeDeg: number | null) => string;
  /** Cardinal direction the parcel must face to be a "Strong" match. */
  bearingDeg: (latitudeDeg: number | null) => number;
  /** Tone palette key. */
  tone: 'warm' | 'amber' | 'gold' | 'cool';
  /** One-line microclimate effect, with optional zone modifier. */
  effect: (zoneShiftHalf: number) => string;
  /** Three species / siting classes appropriate for the pocket. */
  recommendations: string[];
}

const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    id: 'warm',
    label: (lat) => (lat != null && lat < 0 ? 'North-facing warm pocket' : 'South-facing warm pocket'),
    bearingDeg: (lat) => (lat != null && lat < 0 ? 0 : 180),
    tone: 'warm',
    effect: (zoneShift) =>
      zoneShift >= 0.5
        ? `Effective hardiness ~${zoneShift.toFixed(1)} half-zones warmer than the parcel baseline; frost-free window extends 7–14 days at both shoulders.`
        : 'Soils warm earliest in spring; latest frost release. Best frost-free window of the four pockets.',
    recommendations: [
      'Heat-loving fruit (figs, persimmons, jujubes, espalier stone fruit)',
      'Warm-season vegetables (tomatoes, peppers, melons, sweet potatoes)',
      'Passive-solar building siting; greenhouse / cold frame anchor',
    ],
  },
  {
    id: 'morning',
    label: () => 'East-facing morning-sun pocket',
    bearingDeg: () => 90,
    tone: 'gold',
    effect: () =>
      'Direct sun until midday, then afternoon shade. Lower heat stress on leaves; gentler soil-moisture loss than a south-facing slope.',
    recommendations: [
      'Cool-season berries (blueberries, currants, gooseberries, raspberries)',
      'Leafy greens and brassicas (spring + fall extension)',
      'Pollinator garden — flowers open with morning warmth, less wilt-back by afternoon',
    ],
  },
  {
    id: 'afternoon',
    label: () => 'West-facing afternoon-heat pocket',
    bearingDeg: () => 270,
    tone: 'amber',
    effect: () =>
      'Heat accumulates through afternoon; highest evapotranspiration of the four pockets. Heat-stress risk for sensitive species in summer; extended ripening window in fall.',
    recommendations: [
      'Drought-hardy perennials (lavender, rosemary, sage, thyme, oregano)',
      'Late-ripening fruit & wine grapes; sun-cured tomatoes and peppers',
      'Windbreak / shelterbelt species tolerant of heat (juniper, autumn olive, sea buckthorn)',
    ],
  },
  {
    id: 'cool',
    label: (lat) => (lat != null && lat < 0 ? 'South-facing cool pocket' : 'North-facing cool pocket'),
    bearingDeg: (lat) => (lat != null && lat < 0 ? 180 : 0),
    tone: 'cool',
    effect: (zoneShift) =>
      zoneShift >= 0.5
        ? `Effective hardiness ~${zoneShift.toFixed(1)} half-zones cooler than the parcel baseline; later spring start, earlier fall finish.`
        : 'Slowest soil warming; longest snow / frost retention. Cool-season extension; reduced summer heat-stress for sensitive species.',
    recommendations: [
      'Cool-season understory & shade-tolerant edibles (ramps, ginseng, hostas, gooseberry)',
      'Native woodland restoration & forest-edge species (hazel, witch hazel, serviceberry)',
      'Cold-storage / root-cellar siting; quiet retreat / contemplation zones',
    ],
  },
];

/** Compass-bearing degrees for an 8-point cardinal label. */
const ASPECT_BEARING: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

function aspectBearing(aspect: string | undefined): number | null {
  if (!aspect) return null;
  const key = aspect.trim().toUpperCase();
  if (key in ASPECT_BEARING) return ASPECT_BEARING[key]!;
  // Try first one or two letters in case the layer returns full words ("South").
  const head = key.slice(0, 2);
  if (head in ASPECT_BEARING) return ASPECT_BEARING[head]!;
  const first = key[0];
  if (first && first in ASPECT_BEARING) return ASPECT_BEARING[first]!;
  return null;
}

/**
 * Smallest unsigned angular delta between two bearings, in [0, 180].
 */
function bearingDelta(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

type PrevalenceBand = 'strong' | 'moderate' | 'minor' | 'absent';

/**
 * Derive how strongly the parcel's dominant aspect supports a given
 * archetype. Driven by the angular delta between archetype bearing and
 * parcel aspect, modulated by slope (flat sites collapse all four
 * archetypes toward "Minor").
 */
function prevalenceFor(
  archetypeBearing: number,
  parcelAspectDeg: number | null,
  meanSlopeDeg: number,
): PrevalenceBand {
  // Below 2° mean slope, aspect has negligible microclimate effect — every
  // archetype is "Minor at best" regardless of cardinal alignment.
  if (meanSlopeDeg < 2) return 'minor';
  if (parcelAspectDeg == null) return 'minor';

  const delta = bearingDelta(archetypeBearing, parcelAspectDeg);
  // Slope strengthens the band: a 15° slope on a perfectly aligned aspect
  // is "Strong"; a 3° slope on the same aspect is at most "Moderate".
  if (delta <= 45) {
    if (meanSlopeDeg >= 8) return 'strong';
    if (meanSlopeDeg >= 4) return 'moderate';
    return 'minor';
  }
  if (delta <= 90) {
    if (meanSlopeDeg >= 8) return 'moderate';
    return 'minor';
  }
  if (delta <= 135) return 'minor';
  return 'absent';
}

const PREVALENCE_LABEL: Record<PrevalenceBand, string> = {
  strong: 'Strong presence',
  moderate: 'Moderate presence',
  minor: 'Minor presence',
  absent: 'Not present',
};

/**
 * Coarse hardiness-zone shift estimate. South-facing slope at 10°
 * effectively buys ~1 half-zone warmer; north-facing slope loses ~1
 * half-zone. Slope amplifies linearly up to ~15°, where the effect
 * caps. Unit: half-zones (so 1.0 = one half-zone, 2.0 = one full zone).
 */
function halfZoneShift(meanSlopeDeg: number): number {
  if (meanSlopeDeg < 2) return 0;
  const capped = Math.min(meanSlopeDeg, 15);
  // 0° → 0, 8° → 1.0, 15° → ~1.6 half-zones
  return Math.round((capped / 8) * 10) / 10;
}

export default function MicroclimatePocketCard({ project }: MicroclimatePocketCardProps) {
  const siteData = useSiteData(project.id);

  const analysis = useMemo(() => {
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

    let latitudeDeg: number | null = null;
    if (project.parcelBoundaryGeojson) {
      try {
        latitudeDeg = turf.centroid(project.parcelBoundaryGeojson).geometry.coordinates[1] ?? null;
      } catch { /* invalid boundary */ }
    }

    const meanSlopeDeg = elevation?.mean_slope_deg ?? 0;
    const aspectStr = elevation?.predominant_aspect ?? null;
    const aspectDeg = aspectBearing(aspectStr ?? undefined);
    const zoneShift = halfZoneShift(meanSlopeDeg);
    const hardinessZone = climate?.hardiness_zone ?? null;

    const pockets = ARCHETYPES.map((arch) => {
      const archBearing = arch.bearingDeg(latitudeDeg);
      const band = prevalenceFor(archBearing, aspectDeg, meanSlopeDeg);
      // Cool/warm pockets carry the zone-shift effect; east/west pockets
      // surface a flat zero-shift effect line.
      const effectShift = arch.id === 'warm' || arch.id === 'cool' ? zoneShift : 0;
      return {
        id: arch.id,
        label: arch.label(latitudeDeg),
        bearingDeg: archBearing,
        tone: arch.tone,
        effect: arch.effect(effectShift),
        recommendations: arch.recommendations,
        band,
      };
    });

    return {
      latitudeDeg,
      hemisphere: latitudeDeg != null && latitudeDeg < 0 ? 'SH' : 'NH',
      aspectStr,
      aspectDeg,
      meanSlopeDeg,
      hardinessZone,
      zoneShift,
      pockets,
      hasElevation: elevation != null,
    };
  }, [siteData, project.parcelBoundaryGeojson]);

  // Don't render the card without elevation data — nothing meaningful to say.
  if (!analysis.hasElevation) {
    return null;
  }

  const strongCount = analysis.pockets.filter((p) => p.band === 'strong').length;
  const moderateCount = analysis.pockets.filter((p) => p.band === 'moderate').length;
  const dominantPocket = analysis.pockets.find((p) => p.band === 'strong')
    ?? analysis.pockets.find((p) => p.band === 'moderate')
    ?? null;

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Microclimate pockets</h3>
          <p className={s.hint}>
            Four archetype pockets derived from dominant aspect ({analysis.aspectStr ?? '—'}),
            mean slope ({analysis.meanSlopeDeg.toFixed(1)}°),
            and hardiness zone ({analysis.hardinessZone ?? '—'}, {analysis.hemisphere}).
            {analysis.meanSlopeDeg < 2
              ? ' Slope is near-flat — aspect has minimal microclimate effect; recommendations apply only weakly.'
              : analysis.zoneShift >= 0.5
                ? ` Aspect-driven shift estimated at ~${analysis.zoneShift.toFixed(1)} half-zones across the four facing directions.`
                : ' Aspect contributes a measurable but small microclimate shift on this slope.'}
          </p>
        </div>
        <span className={s.badge}>
          {strongCount} strong · {moderateCount} moderate
        </span>
      </div>

      {dominantPocket && (
        <p className={s.dominantNote}>
          Dominant pocket: <strong>{dominantPocket.label}</strong> — {dominantPocket.effect}
        </p>
      )}

      <ul className={s.pocketList}>
        {analysis.pockets.map((p) => (
          <li key={p.id} className={`${s.pocket} ${s[`pocket_${p.tone}`] ?? ''}`}>
            <div className={s.pocketHead}>
              <span className={s.pocketLabel}>{p.label}</span>
              <span className={`${s.pocketBand} ${s[`band_${p.band}`] ?? ''}`}>
                {PREVALENCE_LABEL[p.band]}
              </span>
            </div>
            <p className={s.pocketEffect}>{p.effect}</p>
            <ul className={s.recList}>
              {p.recommendations.map((r, i) => (
                <li key={i} className={s.rec}>{r}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        Heuristic v1 — pockets derived from a single dominant-aspect value
        for the whole parcel. A future refinement could bucket the parcel
        by per-cell aspect (from the elevation raster) and report the
        share of acreage in each pocket.
      </p>
    </div>
  );
}
