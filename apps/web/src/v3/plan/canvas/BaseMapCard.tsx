/**
 * BaseMapCard — top-left floating card on every Observe / Plan / Act map view.
 *
 * Hosts:
 *   - the basemap dropdown (useBasemapStore)
 *   - the canonical map-overlays legend (useMatrixTogglesStore)
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  BASEMAP_OPTIONS,
  useBasemapStore,
  type BasemapKey,
} from '../../observe/components/measure/useMapToolStore.js';
import {
  useMatrixTogglesStore,
  type MatrixToggleKey,
} from '../../../store/matrixTogglesStore.js';
import css from './BaseMapCard.module.css';

interface MapOverlayDef {
  key: MatrixToggleKey;
  label: string;
  swatch: string;
}

const MAP_OVERLAYS_COLLAPSE_KEY = 'atlas.v3.mapOverlaysLegend.collapsed';

const DEFAULT_OVERLAYS: MapOverlayDef[] = [
  // Single Sector compass row drives the unified HUD (solar arcs + wind
  // petals + manual sector arrows in one rose). See ADR
  // wiki/decisions/2026-05-21-atlas-observe-sector-compass-hud.md.
  { key: 'sectors', label: 'Sector compass (solar · wind · hazards · views)', swatch: '#c4a265' },
  { key: 'zones', label: 'Permaculture zones (steward-drawn in Observe)', swatch: '#b07c4a' },
  { key: 'water', label: 'Water (streams · surface water)', swatch: '#5b8aa8' },
  { key: 'topography', label: 'Topography (contours + hillshade)', swatch: '#7a6a3f' },
  { key: 'builtEnvironment', label: 'Built environment (buildings · utilities · fences)', swatch: '#8a8e94' },
  { key: 'observeAnnotations', label: 'Observe annotations (steward-placed)', swatch: '#7c5a8a' },
  { key: 'sunPath', label: 'Sun path (hourly trajectory traces)', swatch: '#d68a4a' },
  { key: 'zoneRings', label: 'Design audit rings (Z1–Z5 around tagged Zone-0 elements)', swatch: '#c8a85a' },
  { key: 'seededZones', label: 'Home centre / Daily touch / Weekly touch / Main crops / Forage / Wilderness', swatch: '#7a9a4a' },
  { key: 'scheduledMoves', label: 'Scheduled moves (Act-stage plans on paddocks · structures)', swatch: '#5a8a6a' },
];

// Per-stage overlay scoping: hide rows whose underlying layer isn't mounted on
// that stage, so the legend never offers checkboxes that no-op. The "draw-on-
// any-stage" toggles (sectors / wind / hazards / views / zones / water /
// topography / builtEnvironment) each independently gate their own
// steward-placed annotation group in ObserveAnnotationLayers (they are NOT
// ANDed with the `observeAnnotations` master — that master governs only the
// untoggled steward-annotation specs such as points/notes). All are mounted
// on Observe + Plan + Act — those rows stay everywhere. Only the Plan-stage
// computed overlays (PlanSunPathOverlay, PlanZoneRingsOverlay,
// PlanScheduledMovesOverlay) are stage-bound; hide them on Observe + Act.
//
// STAGE_HIDDEN is stage-granular only. The Plan stage has two structurally
// different canvases (Current Land mounts every Plan overlay; Vision Layout
// does not mount PlanSunPathOverlay / PlanZoneRingsOverlay), so those rows
// would be dead no-ops on Vision Layout. A canvas that does not mount an
// overlay passes its dead keys via the `hiddenOverlays` prop — suppression
// is the union of STAGE_HIDDEN[stage] and hiddenOverlays.
type Stage = 'observe' | 'plan' | 'act';

const STAGE_HIDDEN: Record<Stage, ReadonlyArray<MatrixToggleKey>> = {
  observe: ['sunPath', 'zoneRings', 'seededZones', 'scheduledMoves'],
  plan: [],
  act: ['sunPath', 'zoneRings', 'seededZones', 'scheduledMoves'],
};

export interface BaseMapCardProps {
  /** When provided, hides overlays not applicable to that stage. */
  stage?: Stage;
  /**
   * Extra overlay rows to hide for the specific canvas this card is mounted
   * on (declared by the mount site, which knows which overlay components it
   * actually mounts). Unioned with STAGE_HIDDEN[stage]. Used by the Vision
   * Layout Plan canvas, which does not mount sun-path / zone-rings overlays.
   */
  hiddenOverlays?: ReadonlyArray<MatrixToggleKey>;
}

export default function BaseMapCard({
  stage,
  hiddenOverlays,
}: BaseMapCardProps = {}) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  const toggles = useMatrixTogglesStore();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MAP_OVERLAYS_COLLAPSE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MAP_OVERLAYS_COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <div className={css.card} aria-label="Base map and overlays">
      <div className={css.section}>
        <h4 className={css.title}>Base Map</h4>
        <select
          className={css.select}
          value={basemap}
          onChange={(e) => setBasemap(e.target.value as BasemapKey)}
        >
          {BASEMAP_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={css.section}>
        <button
          type="button"
          className={css.overlaysHeader}
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="basemap-card-overlays"
          title={collapsed ? 'Expand map overlays' : 'Collapse map overlays'}
        >
          <span className={css.title}>Overlays</span>
          {collapsed ? (
            <ChevronDown size={14} strokeWidth={2} />
          ) : (
            <ChevronUp size={14} strokeWidth={2} />
          )}
        </button>
        {!collapsed && (
          <ul id="basemap-card-overlays" className={css.overlaysList}>
            {DEFAULT_OVERLAYS.filter((o) => {
              const hidden = new Set<MatrixToggleKey>([
                ...(stage ? STAGE_HIDDEN[stage] : []),
                ...(hiddenOverlays ?? []),
              ]);
              return !hidden.has(o.key);
            }).map((o) => (
              <li key={o.key} className={css.row}>
                <label className={css.rowLabel}>
                  <input
                    type="checkbox"
                    checked={toggles[o.key]}
                    onChange={() => toggles.toggle(o.key)}
                  />
                  <span
                    className={css.swatch}
                    style={{ background: o.swatch }}
                    aria-hidden="true"
                  />
                  <span className={css.text}>{o.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
