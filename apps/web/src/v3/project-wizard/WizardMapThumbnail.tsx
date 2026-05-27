/**
 * WizardMapThumbnail — Phase 2 / Slice 2.2.
 *
 * Read-only DiagnoseMap fitted to the project's parcel boundary, used as
 * a "spatial reminder" on Steps 2 and 3 of the wizard. No tools, no
 * edit affordances — the steward already drew the boundary on Step 1
 * and shouldn't be tempted to retrace it here.
 *
 * DiagnoseMap auto-fits when `boundary` is a Polygon (see polygonBounds
 * + initialCenter derivation), so passing the first polygon out of the
 * project's FeatureCollection is enough. When the boundary is missing
 * (extreme edge case — Step 1 enforces it) we fall back to the US
 * geographic centroid.
 */

import DiagnoseMap from '../components/DiagnoseMap.js';
import styles from './WizardMapThumbnail.module.css';

interface WizardMapThumbnailProps {
  boundary: GeoJSON.FeatureCollection | null;
  projectName: string;
}

const US_CENTROID: [number, number] = [-98.5795, 39.8283];

function firstPolygon(
  fc: GeoJSON.FeatureCollection | null,
): GeoJSON.Polygon | undefined {
  if (!fc) return undefined;
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') return geom as GeoJSON.Polygon;
    if (geom.type === 'MultiPolygon') {
      const first = (geom as GeoJSON.MultiPolygon).coordinates[0];
      if (first) {
        return { type: 'Polygon', coordinates: first };
      }
    }
  }
  return undefined;
}

export default function WizardMapThumbnail({
  boundary,
  projectName,
}: WizardMapThumbnailProps) {
  const polygon = firstPolygon(boundary);
  return (
    <aside
      className={styles.thumb}
      aria-label={`Parcel boundary for ${projectName}`}
    >
      <div className={styles.mapHost}>
        <DiagnoseMap centroid={US_CENTROID} zoom={4} boundary={polygon} />
      </div>
      <div className={styles.overlay}>
        <span className={styles.eyebrow}>Your parcel</span>
        <span className={styles.name}>{projectName}</span>
      </div>
    </aside>
  );
}
