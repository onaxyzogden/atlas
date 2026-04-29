/**
 * BlockingIssuesStrip — action-oriented table of "First" tier triage
 * items. Each row pairs the issue with why it matters and a one-click
 * action to fix it on the map. Reuses useTriageItems verbatim — does
 * not recompute.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useTriageItems, type TriageItem } from './hooks/useTriageItems.js';
import css from './BlockingIssuesStrip.module.css';

interface Props {
  project: LocalProject;
  onFixOnMap?: () => void;
  /** Anchor id so the hero CTA can scroll into view. */
  anchorId?: string;
}

export default function BlockingIssuesStrip({ project, onFixOnMap, anchorId = 'feasibility-blockers' }: Props) {
  const { grouped, openCounts } = useTriageItems(project);
  const blockers = grouped.first;

  return (
    <section id={anchorId} className={css.strip} aria-label="Must be solved first">
      <header className={css.head}>
        <div>
          <h3 className={css.title}>Must Be Solved First</h3>
          <p className={css.hint}>
            These items block downstream feasibility from computing. Resolve them before
            treating the rest of the page as final.
          </p>
        </div>
        <span className={`${css.count} ${blockers.length > 0 ? css.countBlock : css.countDone}`}>
          {blockers.length === 0 ? 'All clear' : `${openCounts.first} blocker${openCounts.first === 1 ? '' : 's'}`}
        </span>
      </header>

      {blockers.length === 0 ? (
        <p className={css.empty}>{'✓'} No blocking issues detected. Foundations are in place.</p>
      ) : (
        <div className={css.tableWrap} role="table">
          <div className={`${css.row} ${css.headerRow}`} role="row">
            <span className={css.colStatus} role="columnheader">Status</span>
            <span className={css.colIssue} role="columnheader">Issue</span>
            <span className={css.colWhy} role="columnheader">Why it matters</span>
            <span className={css.colAction} role="columnheader">Action</span>
          </div>
          {blockers.map((item, i) => (
            <BlockerRow key={`first-${i}`} item={item} onFixOnMap={onFixOnMap} />
          ))}
        </div>
      )}
    </section>
  );
}

function BlockerRow({ item, onFixOnMap }: { item: TriageItem; onFixOnMap?: () => void }) {
  return (
    <div className={css.row} role="row">
      <span className={css.colStatus} role="cell">
        <span className={css.statusDot} aria-hidden="true" />
        <span className={css.statusLabel}>Blocking</span>
      </span>
      <div className={css.colIssue} role="cell">
        <div className={css.issueLabel}>{item.label}</div>
        <div className={css.issueDetail}>{item.detail}</div>
      </div>
      <div className={css.colWhy} role="cell">{item.rationale}</div>
      <div className={css.colAction} role="cell">
        <button
          type="button"
          className={css.actionBtn}
          onClick={onFixOnMap}
          disabled={!onFixOnMap}
        >
          Fix on Map
        </button>
      </div>
    </div>
  );
}
