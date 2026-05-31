/**
 * WizardBasemapToggle - compact on-map base-layer switcher for the Step 1
 * creation map. Pure UI over useBasemapStore; DiagnoseMap reacts to the
 * store and swaps the style via map.setStyle, so no map handle is needed
 * here. Mounted as a corner overlay inside WizardSiteMap.
 */

import { Layers } from 'lucide-react';
import {
  BASEMAP_OPTIONS,
  useBasemapStore,
  type BasemapKey,
} from '../observe/components/measure/useMapToolStore.js';
import styles from './WizardBasemapToggle.module.css';

export default function WizardBasemapToggle() {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

  return (
    <div
      className={styles.wrap}
      role="group"
      aria-label="Map base layer"
    >
      <span className={styles.heading}>
        <Layers size={13} aria-hidden />
        Base layer
      </span>
      <div className={styles.options}>
        {BASEMAP_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.key}
            className={styles.option}
            data-active={basemap === opt.key ? 'true' : 'false'}
            aria-pressed={basemap === opt.key}
            onClick={() => setBasemap(opt.key as BasemapKey)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
