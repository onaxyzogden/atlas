/**
 * FieldworkDashboard — dashboard entry point that wraps the right-rail
 * FieldworkPanel. The panel takes `map: maplibregl.Map | null`; passing null
 * disables the "Add on Map" placement action in the Data tab while keeping
 * notes, walk routes, checklist, and photos fully functional.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import FieldworkPanel from '../../fieldwork/FieldworkPanel.js';
import css from './RailDashboardWrapper.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function FieldworkDashboard({ project, onSwitchToMap }: Props) {
  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>WORKSPACE · FIELDWORK</span>
          <h1 className={css.title}>Fieldwork</h1>
          <p className={css.desc}>
            Field notes, soil/water/structure data, walk routes, checklists, and photos
            captured during site visits.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Open Map View
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
      <div className={css.banner}>
        Placing data points by clicking on the map requires the map view.{' '}
        <button className={css.bannerLink} onClick={onSwitchToMap}>Switch to Map</button> to drop entries on a location.
      </div>
      <div className={css.embedded}>
        <FieldworkPanel project={project} map={null} />
      </div>
    </div>
  );
}
