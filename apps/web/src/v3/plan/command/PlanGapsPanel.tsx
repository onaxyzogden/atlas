/**
 * PlanGapsPanel — the Plan Command Centre's right-rail #3: a light "gaps"
 * synthesis. Mirrors `GapsPanel` (Observe). Two thin signals to chase before
 * carrying the stage into Act:
 *   1. Modules still at 0% verified (from the Plan compass views).
 *   2. Unreviewed Observe→Plan impact flags (open review runs) — recorded
 *      observations that may affect the plan but haven't been triaged.
 */

import { AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import type { ObjectiveView } from '../../compass/compassTypes.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { usePlanImpactFlags } from '../impact/usePlanImpactFlags.js';
import css from '../../command/shell/CommandCentreShell.module.css';

interface Props {
  projectId: string;
  /** Compass views (already filtered to the active module by the page). */
  views: ObjectiveView[];
}

export default function PlanGapsPanel({ projectId, views }: Props) {
  const flags = usePlanImpactFlags(projectId);
  const zeroModules = views.filter((v) => v.progress.pct === 0);
  const openFlags = flags.filter((f) => f.review.status === 'open');
  const hasGaps = zeroModules.length > 0 || openFlags.length > 0;

  return (
    <section className={css.panel} aria-label="Gaps and contradictions">
      <p className="eyebrow">Gaps &amp; contradictions</p>
      {!hasGaps ? (
        <p className={css.gapEmpty}>
          <CheckCircle2 size={15} strokeWidth={2} /> Every module has progress and
          all impact flags are reviewed.
        </p>
      ) : (
        <ul className={css.gapList}>
          {zeroModules.map((v) => (
            <li key={v.objective.id} className={css.gapRow}>
              <span className={css.gapIcon}>
                <AlertTriangle size={14} strokeWidth={2} />
              </span>
              <span className={css.gapLabel}>
                {PLAN_MODULE_LABEL[v.objective.id as PlanModule]} not started
              </span>
            </li>
          ))}
          {openFlags.map(({ flag }) => (
            <li key={flag.id} className={css.gapRow}>
              <span className={css.gapIcon}>
                <Flag size={14} strokeWidth={2} />
              </span>
              <span className={css.gapLabel}>
                Unreviewed impact: {flag.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
