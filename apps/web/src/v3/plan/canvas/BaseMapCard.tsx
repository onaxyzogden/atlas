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
  { key: 'sectors', label: 'Solar sectors (sun arcs)', swatch: '#c4a265' },
  { key: 'wind', label: 'Wind sectors (proportional · labelled)', swatch: '#5b7a8a' },
  { key: 'hazards', label: 'Hazards (fire · noise · wildlife)', swatch: '#a85a3f' },
  { key: 'views', label: 'Views (sightline sectors)', swatch: '#7aa86a' },
  { key: 'zones', label: 'Zones (use-frequency rings)', swatch: '#b07c4a' },
  { key: 'water', label: 'Water (streams · surface water)', swatch: '#5b8aa8' },
  { key: 'topography', label: 'Topography (contours + hillshade)', swatch: '#7a6a3f' },
  { key: 'builtEnvironment', label: 'Built environment (buildings · utilities · fences)', swatch: '#8a8e94' },
  { key: 'observeAnnotations', label: 'Observe annotations (steward-placed)', swatch: '#7c5a8a' },
  { key: 'sunPath', label: 'Sun path (solstice + equinox arcs)', swatch: '#d68a4a' },
  { key: 'zoneRings', label: 'Zone rings (Z1 · Z2 · Z3 from home)', swatch: '#c8a85a' },
  { key: 'scheduledMoves', label: 'Scheduled moves (Act-stage plans on paddocks · structures)', swatch: '#5a8a6a' },
];

export default function BaseMapCard() {
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
            {DEFAULT_OVERLAYS.map((o) => (
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
