/**
 * TemplatesDashboard — dashboard entry point that wraps the right-rail
 * TemplatePanel. TemplatePanel only needs `project`, so it embeds cleanly
 * here with no map-required fallback.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import TemplatePanel from '../../templates/TemplatePanel.js';
import css from './RailDashboardWrapper.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function TemplatesDashboard({ project, onSwitchToMap }: Props) {
  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>WORKSPACE · TEMPLATES</span>
          <h1 className={css.title}>Templates</h1>
          <p className={css.desc}>
            Reusable design templates and applied template history for this project.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Open Map View
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
      <div className={css.embedded}>
        <TemplatePanel project={project} />
      </div>
    </div>
  );
}
