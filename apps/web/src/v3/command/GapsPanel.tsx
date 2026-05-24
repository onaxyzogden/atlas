/**
 * GapsPanel — light "gaps & contradictions" synthesis for the Command Centre.
 *
 * Prototype heuristic: verification can be reached via checklist completion
 * without field annotations, so a 100%-verified stage can still have domains
 * with zero captured records. We surface those as coverage gaps to chase before
 * carrying the stage into Plan. Not a real contradiction engine — a deliberate
 * thin signal, mirroring the doc's "gaps & contradictions" panel.
 */

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEvidenceCounts } from './useEvidenceCounts.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  projectId: string;
}

export default function GapsPanel({ projectId }: Props) {
  const rows = useEvidenceCounts(projectId);
  const gaps = rows.filter((r) => r.n === 0);

  return (
    <section className={css.panel} aria-label="Gaps and contradictions">
      <p className="eyebrow">Gaps &amp; contradictions</p>
      {gaps.length === 0 ? (
        <p className={css.gapEmpty}>
          <CheckCircle2 size={15} strokeWidth={2} /> Every domain has captured
          field evidence.
        </p>
      ) : (
        <ul className={css.gapList}>
          {gaps.map((g) => (
            <li key={g.label} className={css.gapRow}>
              <span className={css.gapIcon}>
                <AlertTriangle size={14} strokeWidth={2} />
              </span>
              <span className={css.gapLabel}>
                No {g.label.toLowerCase()} captured yet
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
