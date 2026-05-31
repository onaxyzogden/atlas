/**
 * WizardSiteMap — Phase 2 / Slice 2.1.e.
 *
 * Map host for Step 1's right column. Mounts a DiagnoseMap with the
 * draft boundary (when present) and a chip toolbar that selects one of
 * four capture modes:
 *
 *   - Polygon (default, armed on first paint per spec AC 7.1)
 *   - Rectangle (drag bounds)
 *   - Upload (.kml / .kmz / .geojson / .json / .zip Shapefile)
 *   - Walk the boundary (mobile-only — feature-detected via
 *     `'geolocation' in navigator` plus a touch-points hint, falls back
 *     silently on desktop)
 *
 * When a boundary exists, BoundaryConfirmationStrip shows area +
 * perimeter and offers a Redo affordance that clears the draft so the
 * steward can re-trace.
 */

import { useMemo, useState } from 'react';
import {
  MapPin,
  Square,
  Upload,
  Footprints,
  RotateCcw,
} from 'lucide-react';
import type { Country, ParcelBoundaryGeojson } from '@ogden/shared';
import DiagnoseMap from '../components/DiagnoseMap.js';
import WizardDrawPolygonTool from './WizardDrawPolygonTool.js';
import WizardDrawRectangleTool from './WizardDrawRectangleTool.js';
import WizardUploadBoundary from './WizardUploadBoundary.js';
import WizardGpsWalkTool from './WizardGpsWalkTool.js';
import WizardBasemapToggle from './WizardBasemapToggle.js';
import WizardAddressSearch from './WizardAddressSearch.js';
import BoundaryConfirmationStrip from './BoundaryConfirmationStrip.js';
import type { WizardUnits } from '../../store/projectWizardStore.js';
import styles from './WizardSiteMap.module.css';

export type WizardToolMode = 'polygon' | 'rectangle' | 'upload' | 'gps';

interface WizardSiteMapProps {
  boundary: ParcelBoundaryGeojson | undefined;
  units: WizardUnits;
  country: Country;
  onBoundaryChange: (boundary: ParcelBoundaryGeojson | undefined) => void;
}

// Country-aware fallback center for the empty-state map view. Picked to
// frame the country reasonably; the steward will draw inside this.
const COUNTRY_CENTERS: Record<Country, [number, number]> = {
  US: [-98.5795, 39.8283],
  CA: [-106.3468, 56.1304],
  INTL: [0, 20],
};

const COUNTRY_ZOOMS: Record<Country, number> = {
  US: 3.6,
  CA: 3.2,
  INTL: 1.8,
};

/** Feature-detect mobile-ish UA so Walk mode only surfaces where it can work. */
function isMobileLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!('geolocation' in navigator)) return false;
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0);
  // UA hint — secondary signal so a desktop with a touchscreen still hides
  // the Walk chip (the wizard is desktop-first, mobile-tolerant).
  const ua = navigator.userAgent.toLowerCase();
  const uaMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
  return hasTouch && uaMobile;
}

/** Pull a Polygon from any of the ParcelBoundaryGeojson union shapes. */
function extractPolygon(
  boundary: ParcelBoundaryGeojson | undefined,
): GeoJSON.Polygon | undefined {
  if (!boundary) return undefined;
  if (boundary.type === 'Polygon') return boundary as GeoJSON.Polygon;
  if (boundary.type === 'MultiPolygon') {
    const first = (boundary as GeoJSON.MultiPolygon).coordinates[0];
    if (!first) return undefined;
    return { type: 'Polygon', coordinates: first };
  }
  if (boundary.type === 'Feature') {
    const g = (boundary as GeoJSON.Feature).geometry;
    if (g?.type === 'Polygon') return g as GeoJSON.Polygon;
    if (g?.type === 'MultiPolygon') {
      const first = (g as GeoJSON.MultiPolygon).coordinates[0];
      if (!first) return undefined;
      return { type: 'Polygon', coordinates: first };
    }
    return undefined;
  }
  if (boundary.type === 'FeatureCollection') {
    const fc = boundary as GeoJSON.FeatureCollection;
    for (const f of fc.features) {
      if (f.geometry?.type === 'Polygon') return f.geometry as GeoJSON.Polygon;
      if (f.geometry?.type === 'MultiPolygon') {
        const first = (f.geometry as GeoJSON.MultiPolygon).coordinates[0];
        if (first) return { type: 'Polygon', coordinates: first };
      }
    }
  }
  return undefined;
}

export default function WizardSiteMap({
  boundary,
  units,
  country,
  onBoundaryChange,
}: WizardSiteMapProps) {
  // Default tool: polygon (armed on first paint per AC 7.1).
  const [mode, setMode] = useState<WizardToolMode>('polygon');
  const showWalk = useMemo(isMobileLike, []);
  const polygon = useMemo(() => extractPolygon(boundary), [boundary]);

  const handleCapture = (poly: GeoJSON.Polygon) => {
    // Wrap as Feature so the persisted shape matches ObserveLayout's
    // onBoundaryImported contract (Feature or FeatureCollection).
    const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: poly,
    };
    onBoundaryChange(feature as unknown as ParcelBoundaryGeojson);
  };

  const handleRedo = () => {
    onBoundaryChange(undefined);
    setMode('polygon');
  };

  const tools: ReadonlyArray<{
    id: WizardToolMode;
    label: string;
    Icon: typeof MapPin;
    visible: boolean;
  }> = [
    { id: 'polygon', label: 'Draw polygon', Icon: MapPin, visible: true },
    { id: 'rectangle', label: 'Draw rectangle', Icon: Square, visible: true },
    { id: 'upload', label: 'Upload file', Icon: Upload, visible: true },
    {
      id: 'gps',
      label: 'Walk the boundary',
      Icon: Footprints,
      visible: showWalk,
    },
  ];

  return (
    <div className={styles.wrap}>
      <DiagnoseMap
        centroid={COUNTRY_CENTERS[country]}
        zoom={polygon ? 16 : COUNTRY_ZOOMS[country]}
        boundary={polygon}
      >
        {({ map }) => (
          <>
            <WizardAddressSearch map={map} country={country} />
            {!polygon && mode === 'polygon' && (
              <WizardDrawPolygonTool map={map} onComplete={handleCapture} />
            )}
            {!polygon && mode === 'rectangle' && (
              <WizardDrawRectangleTool map={map} onComplete={handleCapture} />
            )}
            {!polygon && mode === 'upload' && (
              <WizardUploadBoundary
                onParsed={(poly) => {
                  handleCapture(poly);
                }}
                onCancel={() => setMode('polygon')}
              />
            )}
            {!polygon && mode === 'gps' && (
              <WizardGpsWalkTool
                map={map}
                onComplete={handleCapture}
                onCancel={() => setMode('polygon')}
              />
            )}
          </>
        )}
      </DiagnoseMap>

      <WizardBasemapToggle />

      {!polygon && (
        <div className={styles.toolbar} role="toolbar" aria-label="Boundary capture tools">
          {tools
            .filter((t) => t.visible)
            .map((t) => (
              <button
                type="button"
                key={t.id}
                className={styles.toolBtn}
                data-active={mode === t.id ? 'true' : 'false'}
                onClick={() => setMode(t.id)}
              >
                <t.Icon size={14} aria-hidden />
                {t.label}
              </button>
            ))}
        </div>
      )}

      {polygon && (
        <BoundaryConfirmationStrip
          polygon={polygon}
          units={units}
          onRedo={handleRedo}
        />
      )}
    </div>
  );
}
