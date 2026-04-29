/**
 * CollaborationDashboard — dashboard entry point that wraps the right-rail
 * CollaborationPanel. The panel's "Add Comment to Map" action requires a
 * map; clicking it from the dashboard switches to the map view rather than
 * trying to place a comment from a non-map context.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import CollaborationPanel from '../../collaboration/CollaborationPanel.js';
import RolesAccessMatrixCard from '../../collaboration/RolesAccessMatrixCard.js';
import css from './RailDashboardWrapper.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function CollaborationDashboard({ project, onSwitchToMap }: Props) {
  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>WORKSPACE · COLLABORATION</span>
          <h1 className={css.title}>Collaboration</h1>
          <p className={css.desc}>
            Comments, members, and activity feed for this project.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Open Map View
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
      {/* §20 Roles & access posture rollup */}
      <RolesAccessMatrixCard project={project} />

      <div className={css.embedded}>
        <CollaborationPanel
          project={project}
          map={null}
          onAddCommentMode={onSwitchToMap}
          isAddingComment={false}
        />
      </div>
    </div>
  );
}
