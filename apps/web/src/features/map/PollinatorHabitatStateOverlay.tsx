import { useEffect, useMemo, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { classifyZoneHabitat } from '@ogden/shared';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface PollinatorHabitatStateOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'pollinator-habitat-state';
const CIRCLE_LAYER_ID = 'pollinator-habitat-state-circle';
const STROKE_LAYER_ID = 'pollinator-habitat-state-stroke';

/**
 * §7 Pollinator habitat **state** overlay — reads the `soil_regeneration`
 * layer and paints each zone centroid by the zone's CURRENT habitat quality,
 * classified from per-zone `coverClass` + `disturbanceLevel` via the shared
 * `classifyZoneHabitat` helper.
 *
 * Distinct from:
 *   - `PollinatorHabitatOverlay` (reads `pollinator_opportunity`, a bbox-scale
 *     5×5 synthesized grid mixing cover sampling + connectivity role).
 *   - `AgroforestryOverlay` / `MulchCompostCovercropOverlay` (which paint
 *     planned *interventions*, not current state).
 *
 * This overlay answers: "What habitat exists here today?" — parcel-scale,
 * grounded in the real per-zone land cover the SoilRegenerationProcessor
 * already intersected against the `land_cover` layer summary.
 *
 * Not a scoring component. `computeScores.ts` is untouched.
 */
export default function PollinatorHabitatStateOverlay({
  projectId,
  map,
}: PollinatorHabitatStateOverlayProps) {
  const visible = useMapStore((s) => s.pollinatorHabitatStateVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [rawGeojson, setRawGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'soil_regeneration')
      .then((res) => {
        const data = (res as { data?: { geojsonData?: GeoJSON.FeatureCollection | null } }).data;
        if (data?.geojsonData && data.geojsonData.type === 'FeatureCollection') {
          setRawGeojson(data.geojsonData);
        }
      })
      .catch(() => { /* layer not materialised yet — leave null */ })
      .finally(() => setFetched(true));
  }, [visible, fetched, projectId]);

  // Classify each feature into a habitat-state band. The band is written
  // into a new `habitatStateBand` property so the Mapbox paint expression
  // can key off it directly. Source features are Points (zone centroids).
  const classifiedGeojson = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!rawGeojson) return null;
    return {
      type: 'FeatureCollection',
      features: rawGeojson.features.map((f) => {
        const props = f.properties as {
          coverClass?: string | null;
          disturbanceLevel?: number | null;
        } | null;
        const result = classifyZoneHabitat({
          coverClass: props?.coverClass ?? null,
          disturbanceLevel: props?.disturbanceLevel ?? null,
        });
        return {
          ...f,
          properties: {
            ...(f.properties ?? {}),
            habitatStateBand: result.band,
            habitatStateScore: result.score,
            habitatStateClass: result.normalizedClass,
          },
        };
      }),
    };
  }, [rawGeojson]);

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (visible && classifiedGeojson) {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(classifiedGeojson);
          if (map.getLayer(CIRCLE_LAYER_ID)) {
            map.setPaintProperty(CIRCLE_LAYER_ID, 'circle-opacity', overlayOpacity * 0.7);
          }
          if (map.getLayer(STROKE_LAYER_ID)) {
            map.setPaintProperty(STROKE_LAYER_ID, 'circle-stroke-opacity', overlayOpacity * 0.9);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: classifiedGeojson });
          // Band palette mirrors PollinatorHabitatOverlay for visual
          // consistency across the two pollinator surfaces.
          const bandColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'habitatStateBand'],
            'high', '#6ba47a',       // sage green — real forage/structure
            'moderate', '#d4c564',   // warm gold — edge-scale habitat
            'low', '#9c8b6e',        // muted — sparse or limiting
            'hostile', '#7a4a4a',    // slate red — urban/water/high-intensity
            '#9c8b6e',
          ];
          map.addLayer({
            id: CIRCLE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': bandColor,
              'circle-opacity': overlayOpacity * 0.7,
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,
                14, 8,
                18, 16,
              ],
            },
          });
          map.addLayer({
            id: STROKE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': 'transparent',
              'circle-stroke-color': bandColor,
              'circle-stroke-width': 1.2,
              'circle-stroke-opacity': overlayOpacity * 0.9,
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,
                14, 8,
                18, 16,
              ],
            },
          });
        }
      } else {
        for (const id of [STROKE_LAYER_ID, CIRCLE_LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      }
    };

    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, visible, classifiedGeojson, overlayOpacity]);

  return null;
}

export function PollinatorHabitatStateToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.pollinatorHabitatStateVisible);
  const setVisible = useMapStore((s) => s.setPollinatorHabitatStateVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Pollinator habitat (current state)" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle pollinator habitat state overlay"
        >
          {/* Lucide Leaf — current-state habitat signifier (distinct from
              the Flower-2 used on the planting-opportunity overlay). */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.66c0 4-.77 8.48-3.5 11.5a7 7 0 0 1-6.5 4.88Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle pollinator habitat state overlay" position="bottom">
      <button
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        className={visible ? 'signifier-shimmer' : undefined}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          background: visible ? '#6ba47a' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Habitat state
      </button>
    </DelayedTooltip>
  );
}
