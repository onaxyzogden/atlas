/**
 * PlanModuleReadinessPanel — the Plan Command Centre's right-rail #2: a per-
 * module readiness tally. The Plan analog of `EvidenceLibraryPanel` — instead of
 * field-record counts it lists each module's live verified progress (from the
 * Plan compass), so the steward sees, in one place, how ready each module is to
 * carry into Act.
 */

import { Gauge } from 'lucide-react';
import type { ObjectiveView } from '../../compass/compassTypes.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import css from '../../command/shell/CommandCentreShell.module.css';

interface Props {
  /** Compass views (already filtered to the active module by the page). */
  views: ObjectiveView[];
  /** Aggregate stage verified percentage, for the footer total. */
  stagePct: number;
}

export default function PlanModuleReadinessPanel({ views, stagePct }: Props) {
  return (
    <section className={css.panel} aria-label="Module readiness">
      <p className="eyebrow">Module readiness</p>
      {views.length === 0 ? (
        <p className={css.emptyNote}>No modules to show for this filter.</p>
      ) : (
        <ul className={css.statList}>
          {views.map((v) => (
            <li key={v.objective.id} className={css.statRow}>
              <span className={css.statLabel}>
                <span
                  className={css.objCardDot}
                  style={{ background: v.objective.accent }}
                />
                {PLAN_MODULE_LABEL[v.objective.id as PlanModule]}
              </span>
              <span className={css.statValue}>{v.progress.pct}%</span>
            </li>
          ))}
          <li className={`${css.statRow} ${css.statTotal}`}>
            <span className={css.statLabel}>
              <Gauge size={14} strokeWidth={2} /> Stage verified
            </span>
            <span className={css.statValue}>{stagePct}%</span>
          </li>
        </ul>
      )}
    </section>
  );
}
