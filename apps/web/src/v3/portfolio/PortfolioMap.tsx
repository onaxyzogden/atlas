/**
 * PortfolioMap — multi-boundary MapLibre canvas for the Portfolio Home centre
 * zone (OLOS_Portfolio_Home_Spec_v1.0 §2.2). Renders every project boundary as
 * a stage-coloured polygon off a single FeatureCollection (the multi-feature
 * pattern from PlanDataLayers: one source + data-driven paint + a single
 * layer-scoped click handler), plus a floating label pin per project.
 *
 * Selection is driven by feature-state (`promoteId: 'id'`) so picking a project
 * — from the map or the left list — bumps its fill/stroke (§2.6 "selected")
 * without rebuilding paint expressions. Selecting flies the map to that
 * project; a "Fit all" control re-frames every boundary.
 *
 * Boundaries + pins are re-added idempotently on every `styledata` event so
 * they survive a basemap swap (same hazard DiagnoseMap documents at length —
 * setStyle's diff path silently wipes app-added sources/layers).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  maplibregl,
  MAP_STYLES,
  hasMapToken,
  maptilerTransformRequest,
} from '../../lib/maplibre.js';
import MapTokenMissing from '../../components/MapTokenMissing.js';
import { useBasemapStore } from '../observe/components/measure/useMapToolStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import {
  STAGE_PAINT,
  buildBoundaryFeatureCollection,
  derivePortfolioStage,
  projectCentroid,
  type PortfolioStage,
  type StagePaint,
} from './portfolioModel.js';
import css from './PortfolioMap.module.css';

const SRC = 'portfolio-boundaries';
const FILL_LAYER = 'portfolio-boundary-fill';
const LINE_SOLID_LAYER = 'portfolio-boundary-line-solid';
const LINE_DASHED_LAYER = 'portfolio-boundary-line-dashed';
const FIT_PADDING = 56;

interface PortfolioMapProps {
  projects: LocalProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Live-data §2.6 stage per project (usePortfolioStages). Falls back to the
   *  coarse geometry-only derivation for any project not present. */
  stageById?: ReadonlyMap<string, PortfolioStage>;
}

/**
 * `['match', ['get','stage'], 'setup', <v>, …, <default>]` over the stage
 * field. Returns `unknown` and is cast `as never` at the paint site — the
 * established idiom in PlanDataLayers for hand-built MapLibre expressions.
 */
function stageMatch(pick: (p: StagePaint) => string | number, fallback: string | number): unknown {
  return [
    'match',
    ['get', 'stage'],
    'setup', pick(STAGE_PAINT.setup),
    'plan', pick(STAGE_PAINT.plan),
    'act', pick(STAGE_PAINT.act),
    'observe', pick(STAGE_PAINT.observe),
    'archived', pick(STAGE_PAINT.archived),
    fallback,
  ];
}

export default function PortfolioMap({ projects, selectedId, onSelect, stageById }: PortfolioMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const basemap = useBasemapStore((s) => s.basemap);
  const initialBasemapRef = useRef(basemap);
  const appliedBasemapRef = useRef(basemap);
  const didInitialFitRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>>(
    new Map(),
  );
  // Keep the latest onSelect without re-binding marker click handlers.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const fc = useMemo(
    () => buildBoundaryFeatureCollection(projects, stageById),
    [projects, stageById],
  );

  // Centroid + stage per project, for label pins (includes geometry-less
  // projects that still carry an intake centroid).
  const pins = useMemo(
    () =>
      projects
        .map((p) => {
          const at = projectCentroid(p);
          const stage = stageById?.get(p.id) ?? derivePortfolioStage(p);
          return at ? { id: p.id, name: p.name, stage, at } : null;
        })
        .filter((x): x is { id: string; name: string; stage: PortfolioStage; at: [number, number] } => x !== null),
    [projects, stageById],
  );

  // ── Construct map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[initialBasemapRef.current] ?? MAP_STYLES['topographic'],
      center: [-79.7, 43.5],
      zoom: 9,
      attributionControl: { compact: true },
      transformRequest: maptilerTransformRequest,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    setMap(m);
    return () => {
      setMap(null);
      m.remove();
    };
  }, []);

  // ── Basemap swap (skip the first no-op; see DiagnoseMap rationale) ─────────
  useEffect(() => {
    if (!map) return;
    if (appliedBasemapRef.current === basemap) return;
    const target = MAP_STYLES[basemap];
    if (!target) return;
    appliedBasemapRef.current = basemap;
    map.setStyle(target);
  }, [map, basemap]);

  // ── Boundary source + layers (idempotent re-add on every styledata) ────────
  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;
      const existing = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (!existing) {
        map.addSource(SRC, { type: 'geojson', data: fc, promoteId: 'id' });
      } else {
        existing.setData(fc);
      }

      const fillColor = stageMatch((s) => s.fill, '#999999');
      const lineColor = stageMatch((s) => s.color, '#999999');
      const fillOpacity = [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.35,
        stageMatch((s) => s.fillOpacity, 0.15),
      ];
      const lineWidth = [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3,
        stageMatch((s) => s.strokeWidth, 1.5),
      ];

      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: 'fill',
          source: SRC,
          paint: { 'fill-color': fillColor as never, 'fill-opacity': fillOpacity as never },
        });
      }
      // line-dasharray is not a data-driven property, so dashed (setup/archived)
      // and solid (plan/act/observe) stages get separate layers behind a stage
      // filter (the precedent in PlanDataLayers' seed-line / setback-line).
      if (!map.getLayer(LINE_SOLID_LAYER)) {
        map.addLayer({
          id: LINE_SOLID_LAYER,
          type: 'line',
          source: SRC,
          filter: ['!', ['in', ['get', 'stage'], ['literal', ['setup', 'archived']]]] as never,
          paint: { 'line-color': lineColor as never, 'line-width': lineWidth as never },
        });
      }
      if (!map.getLayer(LINE_DASHED_LAYER)) {
        map.addLayer({
          id: LINE_DASHED_LAYER,
          type: 'line',
          source: SRC,
          filter: ['in', ['get', 'stage'], ['literal', ['setup', 'archived']]] as never,
          paint: {
            'line-color': lineColor as never,
            'line-width': lineWidth as never,
            'line-dasharray': [2, 2],
          },
        });
      }
      // Re-apply selection feature-state (cleared by a style reload).
      if (prevSelectedRef.current) {
        map.setFeatureState({ source: SRC, id: prevSelectedRef.current }, { selected: true });
      }
    };

    ensure();
    map.on('styledata', ensure);
    return () => {
      map.off('styledata', ensure);
    };
  }, [map, fc]);

  // ── Click a boundary → select ──────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.['id'];
      if (typeof id === 'string') onSelectRef.current(id);
    };
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', FILL_LAYER, onClick);
    map.on('mouseenter', FILL_LAYER, enter);
    map.on('mouseleave', FILL_LAYER, leave);
    return () => {
      map.off('click', FILL_LAYER, onClick);
      map.off('mouseenter', FILL_LAYER, enter);
      map.off('mouseleave', FILL_LAYER, leave);
    };
  }, [map]);

  // ── Label pins (DOM markers, reconciled by id) ─────────────────────────────
  useEffect(() => {
    if (!map) return;
    const live = markersRef.current;
    const wanted = new Set(pins.map((p) => p.id));
    // Drop stale markers.
    for (const [id, entry] of live) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        live.delete(id);
      }
    }
    // Add / update.
    for (const pin of pins) {
      let entry = live.get(pin.id);
      if (!entry) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = css.pin ?? '';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current(pin.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(pin.at)
          .addTo(map);
        entry = { marker, el };
        live.set(pin.id, entry);
      } else {
        entry.marker.setLngLat(pin.at);
      }
      entry.el.dataset['stage'] = pin.stage;
      entry.el.dataset['selected'] = pin.id === selectedId ? 'true' : 'false';
      entry.el.innerHTML = '';
      const dot = document.createElement('span');
      dot.className = css.pinDot ?? '';
      dot.style.background = STAGE_PAINT[pin.stage].color;
      const label = document.createElement('span');
      label.className = css.pinLabel ?? '';
      label.textContent = pin.name;
      entry.el.append(dot, label);
    }
  }, [map, pins, selectedId]);

  // Remove all markers on unmount.
  useEffect(() => {
    const live = markersRef.current;
    return () => {
      for (const [, entry] of live) entry.marker.remove();
      live.clear();
    };
  }, []);

  // ── Selection feature-state + fly-to ───────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    const prev = prevSelectedRef.current;
    if (prev && prev !== selectedId) {
      try {
        map.setFeatureState({ source: SRC, id: prev }, { selected: false });
      } catch {
        /* source may be mid-reload */
      }
    }
    prevSelectedRef.current = selectedId;
    if (!selectedId) return;
    try {
      map.setFeatureState({ source: SRC, id: selectedId }, { selected: true });
    } catch {
      /* source may be mid-reload; styledata ensure() re-applies */
    }
    const proj = projects.find((p) => p.id === selectedId);
    if (!proj) return;
    const at = projectCentroid(proj);
    const poly = fc.features.find((f) => f.properties.id === selectedId)?.geometry;
    if (poly) {
      const b = boundsOfPolygon(poly);
      if (b) {
        map.fitBounds(b, { padding: FIT_PADDING, maxZoom: 16, duration: 700 });
        return;
      }
    }
    if (at) map.flyTo({ center: at, zoom: 14, duration: 700 });
  }, [map, selectedId, projects, fc]);

  // ── Initial fit to all boundaries (once geometry is available) ─────────────
  useEffect(() => {
    if (!map || didInitialFitRef.current) return;
    const b = boundsOfFeatures(fc);
    if (!b) return;
    const apply = () => {
      map.fitBounds(b, { padding: FIT_PADDING, maxZoom: 15, animate: false });
      didInitialFitRef.current = true;
    };
    if ((map.getStyle()?.layers?.length ?? 0) > 0) apply();
    else map.once('styledata', apply);
  }, [map, fc]);

  const fitAll = () => {
    if (!map) return;
    const b = boundsOfFeatures(fc);
    if (b) map.fitBounds(b, { padding: FIT_PADDING, maxZoom: 15, duration: 700 });
  };

  if (!hasMapToken) {
    return (
      <div className={css.wrap}>
        <MapTokenMissing />
      </div>
    );
  }

  return (
    <div className={css.wrap}>
      <div ref={containerRef} className={css.map} />
      {fc.features.length > 0 && (
        <div className={css.controls}>
          <button type="button" className={css.control} onClick={fitAll} title="Fit all projects">
            Fit all
          </button>
        </div>
      )}
    </div>
  );
}

function boundsOfPolygon(poly: GeoJSON.Polygon): maplibregl.LngLatBounds | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let b: maplibregl.LngLatBounds | null = null;
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng === undefined || lat === undefined) continue;
    if (!b) b = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
    else b.extend([lng, lat]);
  }
  return b;
}

function boundsOfFeatures(
  fc: GeoJSON.FeatureCollection<GeoJSON.Polygon>,
): maplibregl.LngLatBounds | null {
  let b: maplibregl.LngLatBounds | null = null;
  for (const f of fc.features) {
    const ring = f.geometry.coordinates[0];
    if (!ring) continue;
    for (const pt of ring) {
      const lng = pt[0];
      const lat = pt[1];
      if (lng === undefined || lat === undefined) continue;
      if (!b) b = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
      else b.extend([lng, lat]);
    }
  }
  return b;
}
