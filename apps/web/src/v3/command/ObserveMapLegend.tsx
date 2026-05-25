/**
 * ObserveMapLegend — the colour key for the Command Centre site map. Each row
 * maps an Observe domain to the marker colour CaptureMapMarkers paints. When a
 * module lens is active, the legend narrows to that single domain so the key
 * matches what's drawn on the map.
 */

import { OBSERVE_MODULES, OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  active: ObserveModule | null;
}

export default function ObserveMapLegend({ active }: Props) {
  const modules = active ? [active] : OBSERVE_MODULES;
  return (
    <div className={css.legend} aria-label="Map legend">
      <p className={css.legendTitle}>Observation modules</p>
      {modules.map((module) => (
        <span key={module} className={css.legendRow}>
          <span
            className={css.legendDot}
            style={{ background: OBSERVE_MODULE_DOT[module] }}
          />
          {OBSERVE_MODULE_LABEL[module]}
        </span>
      ))}
    </div>
  );
}
