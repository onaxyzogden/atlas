/**
 * spiritualAnalysis — pure helpers for the Spiritual panel:
 * prayer space alignment, quiet zone proximity, signs in creation.
 */

import * as turf from '@turf/turf';
import type { Structure } from '../../store/structureStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { DesignPath } from '../../store/pathStore.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { getLayerSummary } from '../../store/siteDataStore.js';

/* ------------------------------------------------------------------ */
/*  Prayer Space Alignment                                             */
/* ------------------------------------------------------------------ */

export interface AlignmentResult {
  structure: Structure;
  offsetDeg: number;
  isAligned: boolean;
  correction: string;
}

export function computeAlignmentOffset(
  structureRotation: number,
  qiblaBearing: number,
): { offsetDeg: number; isAligned: boolean; correction: string } {
  let diff = structureRotation - qiblaBearing;
  // Normalize to -180..180
  diff = ((diff + 540) % 360) - 180;
  const abs = Math.abs(diff);
  const isAligned = abs < 5;
  const correction = isAligned
    ? 'Correctly oriented'
    : diff > 0
      ? `Rotate ${abs.toFixed(1)}\u00B0 counter-clockwise`
      : `Rotate ${abs.toFixed(1)}\u00B0 clockwise`;
  return { offsetDeg: diff, isAligned, correction };
}

export function analyzePrayerSpaces(
  structures: Structure[],
  qiblaBearing: number,
): AlignmentResult[] {
  const prayerSpaces = structures.filter((s) => s.type === 'prayer_space');
  return prayerSpaces.map((structure) => {
    const { offsetDeg, isAligned, correction } = computeAlignmentOffset(
      structure.rotationDeg,
      qiblaBearing,
    );
    return { structure, offsetDeg, isAligned, correction };
  });
}

/* ------------------------------------------------------------------ */
/*  Quiet Zone Proximity                                               */
/* ------------------------------------------------------------------ */

export interface QuietZoneReport {
  zone: LandZone;
  noiseRisk: 'low' | 'medium' | 'high';
  nearestSource: string;
  distanceM: number;
}

export function analyzeQuietZoneProximity(
  spiritualZones: LandZone[],
  infrastructureZones: LandZone[],
  vehiclePaths: DesignPath[],
): QuietZoneReport[] {
  return spiritualZones.map((zone) => {
    let minDist = Infinity;
    let nearestSource = 'None';

    const centroid = turf.centroid(turf.feature(zone.geometry));

    // Check distance to infrastructure zones
    for (const iz of infrastructureZones) {
      try {
        const izCentroid = turf.centroid(turf.feature(iz.geometry));
        const dist = turf.distance(centroid, izCentroid, { units: 'meters' });
        if (dist < minDist) {
          minDist = dist;
          nearestSource = `${iz.name} (infrastructure)`;
        }
      } catch { /* skip */ }
    }

    // Check distance to vehicle paths
    for (const vp of vehiclePaths) {
      try {
        const nearestPt = turf.nearestPointOnLine(turf.feature(vp.geometry), centroid, { units: 'meters' });
        const dist = nearestPt.properties.dist ?? Infinity;
        if (dist < minDist) {
          minDist = dist;
          nearestSource = `${vp.name} (road)`;
        }
      } catch { /* skip */ }
    }

    const noiseRisk: 'low' | 'medium' | 'high' =
      minDist < 50 ? 'high' : minDist < 100 ? 'medium' : 'low';

    return { zone, noiseRisk, nearestSource, distanceM: minDist };
  });
}

/* ------------------------------------------------------------------ */
/*  Signs in Creation                                                  */
/* ------------------------------------------------------------------ */

export interface SignInCreation {
  label: string;
  description: string;
  value: string | null;
  present: boolean;
}

export function assembleSignsInCreation(siteData: SiteData | null): SignInCreation[] {
  if (!siteData) return [];

  const watershed = getLayerSummary<Record<string, unknown>>(siteData, 'watershed_derived');
  const landCover = getLayerSummary<Record<string, unknown>>(siteData, 'land_cover');
  const terrain = getLayerSummary<Record<string, unknown>>(siteData, 'terrain_analysis');
  const micro = getLayerSummary<{ sunTraps?: { areaPct?: number } }>(siteData, 'microclimate');

  const signs: SignInCreation[] = [];

  // Living Water
  const hasStreams = watershed && (watershed.streamline_count ?? watershed.mean_accumulation);
  signs.push({
    label: 'Living Water',
    description: 'Where the land channels its rain \u2014 seasonal streams, natural flow paths, and gathering waters.',
    value: hasStreams ? 'Flow paths detected' : null,
    present: !!hasStreams,
  });

  // Standing Testimony
  const forestPct = landCover?.forest_pct as number | undefined;
  signs.push({
    label: 'Standing Testimony',
    description: 'Old growth and canopy that has witnessed seasons \u2014 markers of time and patience.',
    value: forestPct != null ? `${forestPct.toFixed(0)}% canopy cover` : null,
    present: forestPct != null && forestPct > 10,
  });

  // Open Horizon
  const viewshedPct = terrain?.viewshed_pct as number | undefined;
  signs.push({
    label: 'Open Horizon',
    description: 'Where the eye meets the sky \u2014 viewsheds that invite contemplation and vastness.',
    value: viewshedPct != null ? `${viewshedPct.toFixed(0)}% visible horizon` : null,
    present: viewshedPct != null && viewshedPct > 30,
  });

  // Gathered Light
  const sunTrapPct = micro?.sunTraps?.areaPct;
  signs.push({
    label: 'Gathered Light',
    description: 'Where warmth collects in sheltered hollows \u2014 microclimates shaped by wind and slope.',
    value: sunTrapPct != null ? `${sunTrapPct.toFixed(0)}% sun-trap coverage` : null,
    present: sunTrapPct != null && sunTrapPct > 15,
  });

  return signs;
}
