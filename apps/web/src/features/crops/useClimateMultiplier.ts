/**
 * useClimateMultiplier — derive a PET-based climate multiplier (clamped 0.7–1.5)
 * for the given project so crop water demand reflects local evaporative load
 * rather than the temperate-baseline (1100 mm/yr) reference.
 *
 * Resolution order (matches the shared `hydrologyMetrics` rollup, decision
 * 2026-04-27-demand-coefficient-tables.md):
 *   1. Penman-Monteith when NASA POWER fields (solar / wind / RH) plus
 *      latitude are available — most physically accurate.
 *   2. Blaney-Criddle fallback when only annual mean temperature is present.
 *   3. 1.0 (no scaling) when no climate layer is loaded yet.
 *
 * The hook reads `useSiteDataStore.dataByProject[projectId].layers` and the
 * project's parcel-boundary centroid for latitude. It returns both the raw
 * multiplier and structured metadata so consumers can show provenance
 * ("FAO-56 Penman-Monteith via NASA POWER" vs. "Blaney-Criddle, temp only").
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useSiteDataStore } from '../../store/siteDataStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { computePet } from '@ogden/shared/scoring';
import { petClimateMultiplier } from '@ogden/shared/demand';

export interface ClimateMultiplierResult {
  /** Multiplier in [0.7, 1.5]; 1.0 when no climate data is available. */
  multiplier: number;
  /** PET in mm/yr, when computable. */
  petMmYr: number | null;
  /** Which model produced the PET value, if any. */
  method: 'penman-monteith' | 'blaney-criddle' | null;
  /** True when no climate layer has loaded for the project yet. */
  unknown: boolean;
}

const NEUTRAL: ClimateMultiplierResult = {
  multiplier: 1,
  petMmYr: null,
  method: null,
  unknown: true,
};

export function useClimateMultiplier(projectId: string): ClimateMultiplierResult {
  const siteData = useSiteDataStore((s) => s.dataByProject[projectId]);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  return useMemo<ClimateMultiplierResult>(() => {
    const layers = siteData?.layers;
    if (!layers || layers.length === 0) return NEUTRAL;

    const climateLayer = layers.find((l) => l.layerType === 'climate');
    if (!climateLayer) return NEUTRAL;

    const cs = climateLayer.summary as Record<string, unknown> | undefined;
    const annualTempC = typeof cs?.annual_temp_mean_c === 'number' ? cs.annual_temp_mean_c : null;
    if (annualTempC === null) return NEUTRAL;

    const solarRadKwhM2Day = typeof cs?.solar_radiation_kwh_m2_day === 'number'
      ? cs.solar_radiation_kwh_m2_day : undefined;
    const windMs = typeof cs?.wind_speed_10m_ms === 'number' ? cs.wind_speed_10m_ms : undefined;
    const rhPct = typeof cs?.relative_humidity_pct === 'number' ? cs.relative_humidity_pct : undefined;
    const elevationM = (() => {
      const elevLayer = layers.find((l) => l.layerType === 'elevation');
      const es = elevLayer?.summary as Record<string, unknown> | undefined;
      const v = typeof es?.elevation_m === 'number' ? es.elevation_m
        : typeof es?.mean_elevation_m === 'number' ? es.mean_elevation_m : null;
      return v ?? undefined;
    })();

    // Latitude — derive from parcel boundary centroid when present.
    let latitudeDeg: number | undefined;
    try {
      if (project?.parcelBoundaryGeojson) {
        const c = turf.centroid(project.parcelBoundaryGeojson);
        const coord = c.geometry.coordinates;
        if (Array.isArray(coord) && typeof coord[1] === 'number') latitudeDeg = coord[1];
      }
    } catch { /* ignore — Blaney-Criddle path */ }

    const pet = computePet({
      annualTempC,
      solarRadKwhM2Day,
      windMs,
      rhPct,
      latitudeDeg,
      elevationM,
    });

    return {
      multiplier: petClimateMultiplier(pet.petMm),
      petMmYr: pet.petMm,
      method: pet.method,
      unknown: false,
    };
  }, [siteData, project]);
}
