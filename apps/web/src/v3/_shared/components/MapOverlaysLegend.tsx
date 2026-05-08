/**
 * MapOverlaysLegend — top-left collapsible legend for map overlay toggles.
 *
 * Standardizes the overlays UI across Observe / Plan / Act. Replaces the
 * legacy bottom-left MapToolbar overlays popover with a persistent panel.
 *
 * Backed by useMatrixTogglesStore for the actual toggle state; this
 * component is presentational + collapse-state only.
 *
 * Collapse state persists in localStorage so the user's preference survives
 * navigation and reload.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  useMatrixTogglesStore,
  type MatrixToggleKey,
} from '../../../store/matrixTogglesStore.js';
import css from './MapOverlaysLegend.module.css';

export interface MapOverlayDef {
  key: MatrixToggleKey;
  label: string;
  swatch: string;
}

const DEFAULT_OVERLAYS: MapOverlayDef[] = [
  { key: 'sectors', label: 'Solar sectors (sun arcs)', swatch: '#c4a265' },
  { key: 'wind', label: 'Wind sectors (proportional · labelled)', swatch: '#5b7a8a' },
  { key: 'hazards', label: 'Hazards (fire · noise · wildlife)', swatch: '#a85a3f' },
  { key: 'views', label: 'Views (sightline sectors)', swatch: '#7aa86a' },
  { key: 'zones', label: 'Zones (use-frequency rings)', swatch: '#b07c4a' },
  { key: 'water', label: 'Water (streams · surface water)', swatch: '#5b8aa8' },
  { key: 'topography', label: 'Topography (contours + hillshade)', swatch: '#7a6a3f' },
  { key: 'observeAnnotations', label: 'Observe annotations (steward-placed)', swatch: '#7c5a8a' },
];

const COLLAPSE_KEY = 'atlas.v3.mapOverlaysLegend.collapsed';

interface Props {
  overlays?: MapOverlayDef[];
  defaultCollapsed?: boolean;
}

export default function MapOverlaysLegend({
  overlays = DEFAULT_OVERLAYS,
  defaultCollapsed = false,
}: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === null) return defaultCollapsed;
    return stored === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const toggles = useMatrixTogglesStore();

  return (
    <div className={css.panel} data-collapsed={collapsed ? 'true' : 'false'}>
      <button
        type="button"
        className={css.header}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls="map-overlays-list"
        title={collapsed ? 'Expand map overlays' : 'Collapse map overlays'}
      >
        <span className={css.headerLabel}>MAP OVERLAYS</span>
        {collapsed ? (
          <ChevronDown size={14} strokeWidth={2} />
        ) : (
          <ChevronUp size={14} strokeWidth={2} />
        )}
      </button>
      {!collapsed && (
        <ul id="map-overlays-list" className={css.list}>
          {overlays.map((o) => (
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
  );
}
