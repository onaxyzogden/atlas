/**
 * VersionHistoryDashboard — dashboard entry point that wraps the right-rail
 * VersionHistory component. VersionHistory only needs `projectId`.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import VersionHistory from '../../project/VersionHistory.js';
import RestorePreviewCard from '../../project/RestorePreviewCard.js';
import css from './RailDashboardWrapper.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function VersionHistoryDashboard({ project, onSwitchToMap }: Props) {
  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>WORKSPACE · VERSION HISTORY</span>
          <h1 className={css.title}>Version History</h1>
          <p className={css.desc}>
            Snapshots of this project — review past states or restore an earlier version.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Open Map View
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
      {/* §1 Restore-preview diff for the most recent snapshot */}
      <RestorePreviewCard project={project} />

      <div className={css.embedded}>
        <VersionHistory projectId={project.id} />
      </div>
    </div>
  );
}
