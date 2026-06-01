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
import type { CrossRelationship } from '@ogden/shared';
import {
  STAGE_PAINT,
  buildBoundaryFeatureCollection,
  derivePortfolioStage,
  projectCentroid,
  type PortfolioStage,
  type StagePaint,
} from './portfolioModel.js';
import { emitPortfolioToast } from './PortfolioToast.js';
import css from './PortfolioMap.module.css';

const SRC = 'portfolio-boundaries';
const FILL_LAYER = 'portfolio-boundary-fill';
const LINE_SOLID_LAYER = 'portfolio-boundary-line-solid';
const LINE_DASHED_LAYER = 'portfolio-boundary-line-dashed';
const FIT_PADDING = 56;

// ── Cross-project relationship lines (§2.7) ─────────────────────────────────
const REL_SRC = 'portfolio-relationships';
const REL_SOLID_LAYER = 'portfolio-rel-line-solid';
const REL_DASHED_LAYER = 'portfolio-rel-line-dashed';

type RelType = CrossRelationship['relationshipType'];

// §2.7 line styling. Solid = adjacent_boundary / same_management_unit; the
// rest are dashed. Colours MUST mirror the --rel-* tokens in tokens.css
// (MapLibre paint can't read CSS vars, so the hexes are duplicated here).
const REL_SOLID_TYPES: RelType[] = ['adjacent_boundary', 'same_management_unit'];
const REL_DASHED_TYPES: RelType[] = ['shared_watershed', 'habitat_corridor', 'shared_infrastructure'];
const REL_COLORS: Record<RelType, string> = {
  shared_watershed: '#3b82f6',
  adjacent_boundary: '#6b7280',
  habitat_corridor: '#16a34a',
  same_management_unit: '#f97316',
  shared_infrastructure: '#9333ea',
};
const REL_TYPE_LABEL: Record<RelType, string> = {
  shared_watershed: 'Shared watershed',
  adjacent_boundary: 'Adjacent boundary',
  habitat_corridor: 'Habitat corridor',
  same_management_unit: 'Same management unit',
  shared_infrastructure: 'Shared infrastructure',
};
const REL_TYPE_ORDER: RelType[] = [
  'adjacent_boundary',
  'same_management_unit',
  'shared_watershed',
  'habitat_corridor',
  'shared_infrastructure',
];

// Data-driven `line-color` over the relationship_type property.
const relColorMatch: unknown = [
  'match',
  ['get', 'relationshipType'],
  'shared_watershed', REL_COLORS.shared_watershed,
  'adjacent_boundary', REL_COLORS.adjacent_boundary,
  'habitat_corridor', REL_COLORS.habitat_corridor,
  'same_management_unit', REL_COLORS.same_management_unit,
  'shared_infrastructure', REL_COLORS.shared_infrastructure,
  '#6b7280',
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface PortfolioMapProps {
  projects: LocalProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Live-data §2.6 stage per project (usePortfolioStages). Falls back to the
   *  coarse geometry-only derivation for any project not present. */
  stageById?: ReadonlyMap<string, PortfolioStage>;
  /** Cross-project relationships touching the selected project (§5). Drawn as
   *  centroid-to-centroid lines; display/awareness only (§5.1, §9.4). */
  relationships?: readonly CrossRelationship[];
  /** Owner-only two-pin creation: tap project A then B, pick a type. */
  onAddRelationship?: (
    projectAId: string,
    projectBId: string,
    type: RelType,
    notes: string | null,
  ) => void;
  /** Fired when a relationship line is tapped (in addition to the map tooltip). */
  onSelectRelationship?: (rel: CrossRelationship) => void;
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

export default function PortfolioMap({
  projects,
  selectedId,
  onSelect,
  stageById,
  relationships,
  onAddRelationship,
  onSelectRelationship,
}: PortfolioMapProps) {
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

  // ── Relationship UI state (§2.7) ───────────────────────────────────────────
  // Lines are OFF by default (§2.7); the toggle lives in the controls cluster.
  const [relVisible, setRelVisible] = useState(false);
  // Two-pin creation: `creating` arms the mode, `firstPick` holds the first
  // tapped project, `pendingPair` opens the type/notes picker once both chosen.
  const [creating, setCreating] = useState(false);
  const [firstPick, setFirstPick] = useState<string | null>(null);
  const [pendingPair, setPendingPair] = useState<{ aId: string; bId: string } | null>(null);
  const [pickType, setPickType] = useState<RelType>('adjacent_boundary');
  const [pickNotes, setPickNotes] = useState('');

  const relList = useMemo<readonly CrossRelationship[]>(() => relationships ?? [], [relationships]);
  const relCount = relList.length;

  // Centroid per project id (covers projects with geometry or an intake
  // centroid) — the endpoints of every relationship line. Keyed by BOTH the
  // local id and the server id: relationship rows come back from the API with
  // server-id endpoints, while pins/selection use local ids, so both must
  // resolve to the same centroid for the lines to draw.
  const centroidById = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const p of projects) {
      const at = projectCentroid(p);
      if (at) {
        m.set(p.id, at);
        if (p.serverId) m.set(p.serverId, at);
      }
    }
    return m;
  }, [projects]);

  // Local ids of projects that are synced to the server (have a `serverId`).
  // Only these can be linked — the relationship API resolves by server id.
  const syncedLocalIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of projects) if (p.serverId) s.add(p.id);
    return s;
  }, [projects]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  // LineString FeatureCollection between the two projects' centroids.
  const relFc = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString, { id: string; relationshipType: string }>>(() => {
    const features: GeoJSON.Feature<GeoJSON.LineString, { id: string; relationshipType: string }>[] = [];
    for (const r of relList) {
      const a = centroidById.get(r.projectAId);
      const b = centroidById.get(r.projectBId);
      if (!a || !b) continue;
      features.push({
        type: 'Feature',
        properties: { id: r.id, relationshipType: r.relationshipType },
        geometry: { type: 'LineString', coordinates: [a, b] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [relList, centroidById]);

  // Lookup for the line-click tooltip + onSelectRelationship callback.
  const relById = useMemo(() => {
    const m = new Map<string, CrossRelationship>();
    for (const r of relList) m.set(r.id, r);
    return m;
  }, [relList]);
  const relByIdRef = useRef(relById);
  relByIdRef.current = relById;
  const onSelectRelationshipRef = useRef(onSelectRelationship);
  onSelectRelationshipRef.current = onSelectRelationship;

  // Pin-tap routing: in creation mode taps pick relationship endpoints,
  // otherwise they select the project. Held in a ref so the marker click
  // listeners (bound once) always see the latest mode without re-binding.
  const handlePinActivate = (id: string) => {
    if (creating) {
      // A4 — un-synced gate: a project with no `serverId` has no backend row,
      // so the relationship API can't reference it. Block the pick and explain
      // rather than letting it fail silently downstream.
      if (!syncedLocalIds.has(id)) {
        emitPortfolioToast(
          `"${nameById.get(id) ?? 'That project'}" isn't synced to the server yet, so it can't be linked.`,
          'error',
        );
        return;
      }
      if (!firstPick) {
        setFirstPick(id);
        return;
      }
      if (firstPick === id) {
        setFirstPick(null); // tap the first pin again to deselect it
        return;
      }
      setPickType('adjacent_boundary');
      setPickNotes('');
      setPendingPair({ aId: firstPick, bId: id });
      return;
    }
    onSelectRef.current(id);
  };
  const pinActivateRef = useRef(handlePinActivate);
  pinActivateRef.current = handlePinActivate;

  const cancelCreate = () => {
    setCreating(false);
    setFirstPick(null);
    setPendingPair(null);
  };

  const submitCreate = () => {
    if (!pendingPair) return;
    onAddRelationship?.(pendingPair.aId, pendingPair.bId, pickType, pickNotes.trim() || null);
    setPendingPair(null);
    setFirstPick(null);
    setCreating(false);
    // Reveal the lines so the freshly-created connection is visible.
    setRelVisible(true);
  };

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

  // ── Relationship lines (§2.7) — idempotent re-add on every styledata, added
  //    AFTER the boundary layers so lines sit above the fills. Display only:
  //    these have zero effect on Plan/Act/Observe logic (§9.4). ────────────────
  useEffect(() => {
    if (!map) return;

    const ensureRel = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;
      const existing = map.getSource(REL_SRC) as maplibregl.GeoJSONSource | undefined;
      if (!existing) {
        map.addSource(REL_SRC, { type: 'geojson', data: relFc, promoteId: 'id' });
      } else {
        existing.setData(relFc);
      }
      const vis = relVisible ? 'visible' : 'none';
      // line-dasharray is not data-driven, so solid vs dashed types get
      // separate layers behind a type filter (same split as the boundaries).
      if (!map.getLayer(REL_SOLID_LAYER)) {
        map.addLayer({
          id: REL_SOLID_LAYER,
          type: 'line',
          source: REL_SRC,
          filter: ['in', ['get', 'relationshipType'], ['literal', REL_SOLID_TYPES]] as never,
          layout: { visibility: vis, 'line-cap': 'round' },
          paint: { 'line-color': relColorMatch as never, 'line-width': 2.5 },
        });
      }
      if (!map.getLayer(REL_DASHED_LAYER)) {
        map.addLayer({
          id: REL_DASHED_LAYER,
          type: 'line',
          source: REL_SRC,
          filter: ['in', ['get', 'relationshipType'], ['literal', REL_DASHED_TYPES]] as never,
          layout: { visibility: vis, 'line-cap': 'round' },
          paint: { 'line-color': relColorMatch as never, 'line-width': 2.5, 'line-dasharray': [2, 2] },
        });
      }
      // Sync visibility on toggle without rebuilding the layers.
      if (map.getLayer(REL_SOLID_LAYER)) map.setLayoutProperty(REL_SOLID_LAYER, 'visibility', vis);
      if (map.getLayer(REL_DASHED_LAYER)) map.setLayoutProperty(REL_DASHED_LAYER, 'visibility', vis);
    };

    ensureRel();
    map.on('styledata', ensureRel);
    return () => {
      map.off('styledata', ensureRel);
    };
  }, [map, relFc, relVisible]);

  // ── Click a relationship line → tooltip (type + notes) + callback ──────────
  useEffect(() => {
    if (!map) return;
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.['id'];
      if (typeof id !== 'string') return;
      const rel = relByIdRef.current.get(id);
      if (!rel) return;
      onSelectRelationshipRef.current?.(rel);
      const label = REL_TYPE_LABEL[rel.relationshipType];
      const notes = rel.notes ? escapeHtml(rel.notes) : '';
      const html =
        `<div style="font-family:inherit;font-size:12px;max-width:200px">` +
        `<strong>${escapeHtml(label)}</strong>` +
        (notes ? `<div style="margin-top:4px;color:#555">${notes}</div>` : '') +
        `</div>`;
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    };
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
    };
    const layers = [REL_SOLID_LAYER, REL_DASHED_LAYER];
    for (const layer of layers) {
      map.on('click', layer, onClick);
      map.on('mouseenter', layer, enter);
      map.on('mouseleave', layer, leave);
    }
    return () => {
      for (const layer of layers) {
        map.off('click', layer, onClick);
        map.off('mouseenter', layer, enter);
        map.off('mouseleave', layer, leave);
      }
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
          pinActivateRef.current(pin.id);
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
      // Creation-mode affordance: every pin is pickable, the first pick glows.
      entry.el.dataset['picking'] = creating ? 'true' : 'false';
      entry.el.dataset['firstpick'] = creating && pin.id === firstPick ? 'true' : 'false';
      entry.el.innerHTML = '';
      const dot = document.createElement('span');
      dot.className = css.pinDot ?? '';
      dot.style.background = STAGE_PAINT[pin.stage].color;
      const label = document.createElement('span');
      label.className = css.pinLabel ?? '';
      label.textContent = pin.name;
      entry.el.append(dot, label);
    }
  }, [map, pins, selectedId, creating, firstPick]);

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

          {/* Relationship-layer toggle (§2.7) — off by default; disabled with a
              §7 hint when the selected project has no relationships yet. */}
          <button
            type="button"
            className={`${css.control} ${relVisible ? css.controlActive : ''}`}
            onClick={() => setRelVisible((v) => !v)}
            disabled={relCount === 0}
            aria-pressed={relVisible}
            title={
              relCount === 0
                ? 'Add relationships to see connections'
                : relVisible
                  ? 'Hide cross-project connections'
                  : 'Show cross-project connections'
            }
          >
            Connections{relCount > 0 ? ` (${relCount})` : ''}
          </button>

          {/* Owner-only two-pin creation entry point (§5.5). */}
          {onAddRelationship ? (
            <button
              type="button"
              className={`${css.control} ${creating ? css.controlActive : ''}`}
              onClick={() => (creating ? cancelCreate() : setCreating(true))}
              aria-pressed={creating}
              title="Connect two projects"
            >
              {creating ? 'Cancel link' : '+ Link'}
            </button>
          ) : null}
        </div>
      )}

      {/* Creation hint while picking the two endpoints. */}
      {creating && !pendingPair && (
        <div className={css.relBanner} role="status">
          {firstPick
            ? `Now tap a second project to connect with "${nameById.get(firstPick) ?? 'project'}".`
            : 'Tap a project, then another, to connect them.'}
        </div>
      )}

      {/* Type + notes picker once both endpoints are chosen. */}
      {pendingPair && (
        <div className={css.relPicker} role="dialog" aria-label="New relationship">
          <p className={css.relPickerTitle}>
            Connect <strong>{nameById.get(pendingPair.aId) ?? 'project'}</strong> &amp;{' '}
            <strong>{nameById.get(pendingPair.bId) ?? 'project'}</strong>
          </p>
          <label className={css.relField}>
            <span>Relationship</span>
            <select
              value={pickType}
              onChange={(e) => setPickType(e.target.value as RelType)}
            >
              {REL_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {REL_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={css.relField}>
            <span>Notes (optional)</span>
            <textarea
              rows={2}
              maxLength={2000}
              value={pickNotes}
              onChange={(e) => setPickNotes(e.target.value)}
              placeholder="e.g. both drain into Miller Creek"
            />
          </label>
          <div className={css.relPickerActions}>
            <button type="button" className={css.relBtnGhost} onClick={cancelCreate}>
              Cancel
            </button>
            <button type="button" className={css.relBtnPrimary} onClick={submitCreate}>
              Create
            </button>
          </div>
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
