/**
 * SilvopastureMemberOutline — on-map "what belongs to this host" hint.
 *
 * When the active Plan selection is a silvopasture host (design-element
 * `kind==='silvopasture'` or crop-area `type==='silvopasture'`), this
 * draws a dashed accent outline around every resolved member
 * (orchards, paddocks, guilds) so the steward can see the host's
 * footprint at a glance. Renders nothing otherwise.
 *
 * Implemented as a self-contained overlay (own `silvo-member-*` source
 * + layer), mirroring the utility-conflict-halo pattern in
 * DesignElementLayers — a separate stroke layer rather than feature-state
 * injected across the per-kind layer stack. This keeps the cross-store
 * highlight in one place and avoids coupling to PlanDataLayers internals.
 */

import { useMemo, useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { usePlanSelectionStore } from '../../store/planSelectionStore.js';
import {
  encodeHostId,
  resolveSilvopastureHosts,
  resolveMembers,
} from './silvopastureHosts.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const POLY_SOURCE = 'silvo-member-poly';
const POINT_SOURCE = 'silvo-member-point';
const POLY_LAYER = 'silvo-member-poly';
const POINT_LAYER = 'silvo-member-point';
const ACCENT = '#3f9c6d';

export default function SilvopastureMemberOutline({ map, projectId }: Props) {
  const items = usePlanSelectionStore((s) => s.items);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const designElements = useDesignElementsForProject(projectId);

  const selected = items[0];

  const { polyFC, pointFC } = useMemo(() => {
    const empty = {
      polyFC: { type: 'FeatureCollection' as const, features: [] },
      pointFC: { type: 'FeatureCollection' as const, features: [] },
    };
    if (!selected) return empty;

    const cropAreas = allCropAreas.filter((c) => c.projectId === projectId);
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);
    const guilds = allGuilds.filter((g) => g.projectId === projectId);

    let hostId: string | null = null;
    if (selected.kind === 'design-element') {
      const el = designElements.find((e) => e.id === selected.id);
      if (!el || el.kind !== 'silvopasture') return empty;
      hostId = encodeHostId('design-element', el.id);
    } else if (selected.kind === 'crop') {
      const area = cropAreas.find((c) => c.id === selected.id);
      if (!area || area.type !== 'silvopasture') return empty;
      hostId = encodeHostId('crop-area', area.id);
    } else {
      return empty;
    }

    const hosts = resolveSilvopastureHosts(projectId, cropAreas, designElements);
    const host = hosts.find((h) => h.id === hostId);
    if (!host) return empty;

    const members = resolveMembers(
      host,
      { cropAreas, designElements, paddocks, guilds },
      hosts,
    );

    const polys: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    for (const m of members.orchardsFromCrops) {
      polys.push({
        type: 'Feature',
        id: `crop-${m.entity.id}`,
        properties: {},
        geometry: m.entity.geometry,
      });
    }
    for (const m of members.orchardsFromDesign) {
      if (m.entity.geometry.type !== 'Polygon') continue;
      polys.push({
        type: 'Feature',
        id: `de-${m.entity.id}`,
        properties: {},
        geometry: m.entity.geometry,
      });
    }
    for (const m of members.paddocks) {
      polys.push({
        type: 'Feature',
        id: `pad-${m.entity.id}`,
        properties: {},
        geometry: m.entity.geometry,
      });
    }
    for (const m of members.guilds) {
      const c = m.entity.center;
      if (!c) continue;
      points.push({
        type: 'Feature',
        id: `gld-${m.entity.id}`,
        properties: {},
        geometry: { type: 'Point', coordinates: c },
      });
    }
    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      pointFC: { type: 'FeatureCollection' as const, features: points },
    };
  }, [selected, allCropAreas, allPaddocks, allGuilds, designElements, projectId]);

  useEffect(() => {
    if (!map) return;
    let disposed = false;
    let idleRetryArmed = false;
    const armIdleRetry = () => {
      if (disposed || idleRetryArmed) return;
      idleRetryArmed = true;
      map.once('idle', () => {
        idleRetryArmed = false;
        if (!disposed) apply();
      });
    };

    const apply = () => {
      if (disposed) return;
      if (!map.getStyle()) {
        armIdleRetry();
        return;
      }
      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const existing = map.getSource(id) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) existing.setData(data);
        else map.addSource(id, { type: 'geojson', data });
      };
      try {
        ensureSource(POLY_SOURCE, polyFC);
        ensureSource(POINT_SOURCE, pointFC);
      } catch {
        armIdleRetry();
        return;
      }
      try {
        if (!map.getLayer(POLY_LAYER)) {
          map.addLayer({
            id: POLY_LAYER,
            type: 'line',
            source: POLY_SOURCE,
            paint: {
              'line-color': ACCENT,
              'line-width': 3,
              'line-opacity': 0.95,
              'line-dasharray': [2, 1.5],
            },
          });
        }
        if (!map.getLayer(POINT_LAYER)) {
          map.addLayer({
            id: POINT_LAYER,
            type: 'circle',
            source: POINT_SOURCE,
            paint: {
              'circle-radius': 12,
              'circle-color': 'rgba(0,0,0,0)',
              'circle-stroke-color': ACCENT,
              'circle-stroke-width': 3,
              'circle-stroke-opacity': 0.95,
            },
          });
        }
      } catch {
        armIdleRetry();
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);
    map.on('styledata', onStyle);
    return () => {
      disposed = true;
      try {
        map.off('style.load', onStyle);
        map.off('styledata', onStyle);
        for (const l of [POLY_LAYER, POINT_LAYER]) {
          if (map.getLayer(l)) map.removeLayer(l);
        }
        for (const s of [POLY_SOURCE, POINT_SOURCE]) {
          if (map.getSource(s)) map.removeSource(s);
        }
      } catch {
        /* map already disposed */
      }
    };
  }, [map, polyFC, pointFC]);

  return null;
}
