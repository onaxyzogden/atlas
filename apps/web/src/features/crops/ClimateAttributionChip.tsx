/**
 * ClimateAttributionChip — surfaces the PET-based climate multiplier and its
 * provenance (FAO-56 Penman-Monteith vs. Blaney-Criddle) as a small chip.
 *
 * Renders nothing when no climate data is loaded, so callers can drop it
 * unconditionally next to a water-demand figure.
 */

import type { ClimateMultiplierResult } from './useClimateMultiplier.js';

interface ClimateAttributionChipProps {
  climate: ClimateMultiplierResult;
  /** Optional CSS class — typically the host surface's chip / pill style. */
  className?: string;
  /** Optional inline styles for surface-specific overrides. */
  style?: React.CSSProperties;
}

export function ClimateAttributionChip({
  climate,
  className,
  style,
}: ClimateAttributionChipProps) {
  if (climate.unknown || climate.petMmYr === null) return null;
  const methodLabel = climate.method === 'penman-monteith' ? 'FAO-56' : 'Blaney-Criddle';
  const title =
    climate.method === 'penman-monteith'
      ? 'FAO-56 Penman-Monteith — solar/wind/RH from NASA POWER, latitude from parcel centroid'
      : 'Blaney-Criddle — annual mean temperature only (NASA POWER fields not loaded)';
  return (
    <span className={className} style={style} title={title}>
      ×{climate.multiplier.toFixed(2)} climate
      {' · '}
      {methodLabel}
      {' · '}
      {Math.round(climate.petMmYr)} mm/yr PET
    </span>
  );
}
