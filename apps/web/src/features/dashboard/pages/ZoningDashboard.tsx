/**
 * ZoningDashboard — dashboard entry point that wraps the right-rail
 * ZonePanel. ZonePanel's draw functionality requires `draw` + `map`; passing
 * canEdit=false hides creation controls while still rendering the zones list,
 * sizing calculator, conflict detector, allocation rollup, and auto-suggest
 * read-outs.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import ZonePanel from '../../zones/ZonePanel.js';
import GuestRetreatEducationEventCard from '../../zones/GuestRetreatEducationEventCard.js';
import css from './RailDashboardWrapper.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function ZoningDashboard({ project, onSwitchToMap }: Props) {
  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>SECTION 3 · ZONING</span>
          <h1 className={css.title}>Zoning</h1>
          <p className={css.desc}>
            Land-use zone allocation, sizing, and conflict detection. Drawing new
            zone polygons happens in the map view.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Draw Zones on Map
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
      <div className={css.banner}>
        Creating, reshaping, or deleting zone polygons requires the map view.{' '}
        <button className={css.bannerLink} onClick={onSwitchToMap}>Switch to Map</button> to draw zones.
      </div>
      <GuestRetreatEducationEventCard project={project} />
      <div className={css.embedded}>
        <ZonePanel
          projectId={project.id}
          draw={null}
          map={null}
          isMapReady={false}
          canEdit={false}
        />
      </div>
    </div>
  );
}
