/**
 * BoundaryConfirmationStrip — area + perimeter readout for the captured
 * boundary on Step 1 of the wizard (AC 7.1: shown within 2s of polygon
 * close — render-on-mount satisfies this because the parent only mounts
 * the strip once a polygon exists, and turf.area + turf.length are sync
 * and sub-ms at parcel scale).
 *
 * Units track the wizard's `units` field:
 *   metric   → hectares  + kilometres
 *   imperial → acres     + miles
 *
 * Redo clears the draft boundary so the steward can pick a tool and
 * re-trace; the parent flips back to `polygon` mode on redo so the
 * default capture path is armed again.
 */

import * as turf from '@turf/turf';
import { RotateCcw } from 'lucide-react';
import { parcelAcreage } from '../../lib/geo.js';
import type { WizardUnits } from '../../store/projectWizardStore.js';
import styles from './BoundaryConfirmationStrip.module.css';

interface BoundaryConfirmationStripProps {
  polygon: GeoJSON.Polygon;
  units: WizardUnits;
  onRedo: () => void;
}

function formatArea(value: number | null, units: WizardUnits): string {
  if (value === null) return '—';
  return units === 'metric' ? `${value.toFixed(2)} ha` : `${value.toFixed(2)} ac`;
}

function formatPerimeter(km: number, units: WizardUnits): string {
  if (units === 'metric') return `${km.toFixed(2)} km`;
  const mi = km * 0.621371;
  return `${mi.toFixed(2)} mi`;
}

export default function BoundaryConfirmationStrip({
  polygon,
  units,
  onRedo,
}: BoundaryConfirmationStripProps) {
  const area = parcelAcreage(polygon, units);
  // turf.length of a Polygon returns the perimeter of the outer ring in km.
  let perimeterKm = 0;
  try {
    perimeterKm = turf.length(
      { type: 'Feature', properties: {}, geometry: polygon },
      { units: 'kilometers' },
    );
  } catch {
    perimeterKm = 0;
  }

  return (
    <div className={styles.strip} role="status" aria-live="polite">
      <div className={styles.readout}>
        <div className={styles.metric}>
          <span className={styles.label}>Area</span>
          <span className={styles.value}>{formatArea(area, units)}</span>
        </div>
        <div className={styles.divider} aria-hidden />
        <div className={styles.metric}>
          <span className={styles.label}>Perimeter</span>
          <span className={styles.value}>{formatPerimeter(perimeterKm, units)}</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.redoBtn}
        onClick={onRedo}
        aria-label="Discard boundary and redo"
      >
        <RotateCcw size={14} aria-hidden />
        Redo
      </button>
    </div>
  );
}
