// ActTierMapMarkers.tsx
//
// One pin per objective on the Act canvas, coloured by the objective's REAL
// execution state (complete / active / available). Clicking a pin selects
// that objective (drives the URL + flips the right rail to execution detail).
// Mirrors the marker lifecycle of ActProtoMapMarkers / CaptureMapMarkers.
//
// Pin positions are REAL: ActTierShell derives each objective's location from
// the centroid of its field actions' logged geometry (objectiveMarkerGeometry).
// Objectives without any logged location are absent from positionByObjective
// and render NO pin (hide-until-real) — there is no synthetic fallback.

import { useEffect, useRef } from 'react';
import type { PlanStratumObjective, UniversalDomain } from '@ogden/shared';
import { maplibregl } from '../../../lib/maplibre.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import { objectiveInScope } from '../../roles/viewScope.js';
import { mustSurface, type SurfaceReason } from '../../roles/alwaysSurface.js';

interface Props {
  map: maplibregl.Map;
  /** Real per-objective [lng, lat] from field-action geometry; objectives
   *  absent from this map have no logged location and render no pin. */
  positionByObjective: Readonly<Record<string, [number, number]>>;
  objectives: readonly PlanStratumObjective[];
  progressByObjective: Readonly<Record<string, ObjectiveProgress>>;
  activeObjectiveId: string | null;
  onSelectObjective: (objectiveId: string) => void;
  /**
   * Operational Role Layer scope (additive). When present + non-empty, pins for
   * out-of-scope objectives are DIMMED (never removed) so a role-filtered map
   * still shows every objective's real location. Promoted objectives (open flag,
   * cross-role dependency, shared-resource divergence) stay full opacity. Absent
   * or empty ⇒ every pin renders at full opacity exactly as before.
   */
  scopedDomains?: ReadonlySet<UniversalDomain>;
  surfaceMap?: ReadonlyMap<string, SurfaceReason[]>;
}

const EMPTY_SURFACE_MAP: ReadonlyMap<string, SurfaceReason[]> = new Map();

// State -> pin colour. Literal hexes match the data-viz status colours used
// across the v3 tier UI (complete green, gold active, neutral blue available).
const STATE_COLOR: Record<ObjectiveProgress['state'], string> = {
  complete: '#5dd39e',
  active: '#c4a265',
  available: '#5b8aa8',
};

function buildPin(color: string, isActive: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.45)';
  el.style.border = isActive
    ? '3px solid #c4a265'
    : '2px solid rgba(255, 255, 255, 0.85)';
  return el;
}

export default function ActTierMapMarkers({
  map,
  positionByObjective,
  objectives,
  progressByObjective,
  activeObjectiveId,
  onSelectObjective,
  scopedDomains,
  surfaceMap,
}: Props) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelectObjective);
  onSelectRef.current = onSelectObjective;

  useEffect(() => {
    const known = markersRef.current;
    const seen = new Set<string>();
    // Scope engaged only when a non-empty domain set is supplied (full view and
    // unscoped callers leave scopedDomains undefined ⇒ every pin full opacity).
    const scoped = scopedDomains !== undefined && scopedDomains.size > 0;

    objectives.forEach((objective) => {
      const pos = positionByObjective[objective.id];
      // Hide-until-real: objectives with no logged field-action geometry get no
      // pin. Leaving them out of `seen` also tears down any stale marker below.
      if (!pos) return;
      seen.add(objective.id);
      // Teardown-and-replace each pass so the active outline + state colour
      // stay current; the marker count is tiny, so this beats in-place mutation.
      known.get(objective.id)?.remove();
      const state = progressByObjective[objective.id]?.state ?? 'available';
      const el = buildPin(STATE_COLOR[state], objective.id === activeObjectiveId);
      // Role-scope de-emphasis: out-of-scope pins dim to 0.4 but stay on the map
      // (never hide, only de-emphasize). Promoted out-of-scope pins stay full.
      const scopeState = !scoped
        ? 'in'
        : objectiveInScope(objective, scopedDomains)
          ? 'in'
          : mustSurface(objective.id, surfaceMap ?? EMPTY_SURFACE_MAP).surface
            ? 'out-surfaced'
            : 'out';
      el.dataset.scope = scopeState;
      el.style.opacity = scopeState === 'out' ? '0.4' : '1';
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(pos)
        .addTo(map);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(objective.id);
      });
      known.set(objective.id, marker);
    });

    for (const [id, marker] of known.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        known.delete(id);
      }
    }
  }, [
    map,
    positionByObjective,
    objectives,
    progressByObjective,
    activeObjectiveId,
    scopedDomains,
    surfaceMap,
  ]);

  useEffect(() => {
    const known = markersRef.current;
    return () => {
      for (const marker of known.values()) marker.remove();
      known.clear();
    };
  }, []);

  return null;
}
