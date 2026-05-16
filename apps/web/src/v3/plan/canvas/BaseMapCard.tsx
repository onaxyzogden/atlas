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
import { useZoneEmphasisStore } from '../../../store/zoneEmphasisStore.js';
import { COLORS, LABELS } from '../../../lib/zones/concentric.js';
import type { ZoneIndex } from '../../../lib/zones/types.js';
import css from './BaseMapCard.module.css';

const ZONE_INDICES: ZoneIndex[] = [0, 1, 2, 3, 4, 5];

interface MapOverlayDef {
  key: MatrixToggleKey;
  label: string;
  swatch: string;
}

const MAP_OVERLAYS_COLLAPSE_KEY = 'atlas.v3.mapOverlaysLegend.collapsed';

const DEFAULT_OVERLAYS: MapOverlayDef[] = [
  { key: 'sectors', label: 'Solar sectors (sunrise→south→sunset wedges)', swatch: '#c4a265' },
  { key: 'wind', label: 'Wind sectors (proportional · labelled)', swatch: '#5b7a8a' },
  { key: 'hazards', label: 'Hazards (fire · noise · wildlife)', swatch: '#a85a3f' },
  { key: 'views', label: 'Views (sightline sectors)', swatch: '#7aa86a' },
  { key: 'zones', label: 'Zones (use-frequency rings — drawn or textbook)', swatch: '#b07c4a' },
  { key: 'water', label: 'Water (streams · surface water)', swatch: '#5b8aa8' },
  { key: 'topography', label: 'Topography (contours + hillshade)', swatch: '#7a6a3f' },
  { key: 'builtEnvironment', label: 'Built environment (buildings · utilities · fences)', swatch: '#8a8e94' },
  { key: 'observeAnnotations', label: 'Observe annotations (steward-placed)', swatch: '#7c5a8a' },
  { key: 'sunPath', label: 'Sun path (hourly trajectory traces)', swatch: '#d68a4a' },
  { key: 'zoneRings', label: 'Design audit rings (Z1·Z2·Z3 around tagged Zone-0 elements)', swatch: '#c8a85a' },
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
type Stage = 'observe' | 'plan' | 'act';

const STAGE_HIDDEN: Record<Stage, ReadonlyArray<MatrixToggleKey>> = {
  observe: ['sunPath', 'zoneRings', 'scheduledMoves'],
  plan: [],
  act: ['sunPath', 'zoneRings', 'scheduledMoves'],
};

export interface BaseMapCardProps {
  /** When provided, hides overlays not applicable to that stage. */
  stage?: Stage;
}

export default function BaseMapCard({ stage }: BaseMapCardProps = {}) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  const toggles = useMatrixTogglesStore();
  const setHoveredZone = useZoneEmphasisStore((s) => s.setHoveredZone);

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
            {DEFAULT_OVERLAYS.filter(
              (o) => !stage || !STAGE_HIDDEN[stage].includes(o.key),
            ).map((o) => (
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
                {o.key === 'zones' && toggles.zones && (
                  <ul
                    className={css.subLegend}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    {ZONE_INDICES.map((z) => (
                      <li
                        key={z}
                        className={css.subRow}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredZone(z)}
                        onFocus={() => setHoveredZone(z)}
                        onBlur={() => setHoveredZone(null)}
                      >
                        <span
                          className={css.swatch}
                          style={{ background: COLORS[z] }}
                          aria-hidden="true"
                        />
                        <span className={css.text}>{LABELS[z]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
