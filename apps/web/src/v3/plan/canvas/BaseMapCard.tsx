/**
 * BaseMapCard — bottom-left floating card on the Vision-Layout canvas.
 *
 * Reuses the OBSERVE basemap and matrix-toggle stores so the two stages stay
 * in sync. Surfaces a dropdown for basemap style and checkbox toggles for the
 * overlays the Plan canvas can render today (topography contours, water,
 * sectors/zones). Boundaries section is informational v1 placeholders.
 */

import {
  BASEMAP_OPTIONS,
  useBasemapStore,
  type BasemapKey,
} from '../../observe/components/measure/useMapToolStore.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import css from './BaseMapCard.module.css';

const OVERLAYS = [
  { key: 'topography', label: 'Contours 2 m', swatch: '#7a6a3f' },
  { key: 'water',      label: 'Hydrology',     swatch: '#5b8aa8' },
  { key: 'zones',      label: 'Soils / zones', swatch: '#a85a3f' },
] as const;

export default function BaseMapCard() {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  const toggles = useMatrixTogglesStore();

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
        <h4 className={css.title}>Overlays</h4>
        {OVERLAYS.map((o) => (
          <label key={o.key} className={css.row}>
            <input
              type="checkbox"
              checked={toggles[o.key]}
              onChange={() => toggles.toggle(o.key)}
            />
            <span className={css.swatch} style={{ background: o.swatch }} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
