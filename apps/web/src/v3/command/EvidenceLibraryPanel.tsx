/**
 * EvidenceLibraryPanel — aggregate field-record tally for the Command Centre.
 *
 * Sums the seven Observe annotation stores' records per domain (via
 * useEvidenceCounts) so the steward sees, in one place, how much real field
 * evidence underlies the verified stage. Counts only — the records themselves
 * live on each module's map/dashboard.
 */

import { FileStack } from 'lucide-react';
import { useEvidenceCounts } from './useEvidenceCounts.js';
import css from './shell/CommandCentreShell.module.css';

interface Props {
  projectId: string;
}

export default function EvidenceLibraryPanel({ projectId }: Props) {
  const rows = useEvidenceCounts(projectId);
  const total = rows.reduce((sum, r) => sum + r.n, 0);

  return (
    <section className={css.panel} aria-label="Evidence library">
      <p className="eyebrow">Evidence library &amp; field notes</p>
      <ul className={css.statList}>
        {rows.map((r) => (
          <li key={r.label} className={css.statRow}>
            <span className={css.statLabel}>{r.label}</span>
            <span className={css.statValue}>{r.n}</span>
          </li>
        ))}
        <li className={`${css.statRow} ${css.statTotal}`}>
          <span className={css.statLabel}>
            <FileStack size={14} strokeWidth={2} /> Total field records
          </span>
          <span className={css.statValue}>{total}</span>
        </li>
      </ul>
    </section>
  );
}
