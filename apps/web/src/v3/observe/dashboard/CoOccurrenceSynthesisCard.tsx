/**
 * CoOccurrenceSynthesisCard — read-only Observe synthesis surface that
 * mirrors the shipped Plan-view co-occurrence banner. Observe SYNTHESIZES,
 * it does not act: this card carries NO Acknowledge/Resolve/Dismiss
 * controls — only a single passive "Resolve in Plan" text pointer.
 *
 * Surfaces cross-protocol "structural verdict" clusters: groups of >=2
 * distinct review-flag templates that deviated together in the same
 * season:cycle bucket, grouped by the objective theme they implicate.
 *
 * Renders nothing (zero bytes) when there are no clusters.
 */

import type { CoOccurrenceCluster } from '@ogden/shared';
import { useCoOccurrenceClusters } from '../../../store/reviewFlagStore.js';
import css from './CoOccurrenceSynthesisCard.module.css';

interface Props {
  projectId: string;
}

export default function CoOccurrenceSynthesisCard({ projectId }: Props) {
  // currentBucket intentionally omitted: this mount surface is the
  // cross-domain 16-domain dashboard, so there is no single domainId from
  // which to derive a meaningful cycleNumber. A season-only bucket is a
  // verified no-op for the dormancy filter, so we pass no bucket at all.
  // (Same decision as the already-shipped Plan shell — do NOT "add the
  // missing bucket" here.)
  const clusters: CoOccurrenceCluster[] = useCoOccurrenceClusters(projectId);

  if (clusters.length === 0) return null;

  return (
    <section
      className={css.card}
      data-testid="cooccurrence-synthesis-card"
      aria-label="Cross-protocol structural verdicts"
    >
      <div className={css.heading}>
        <span className={css.title}>Structural verdicts</span>
        <span className={css.count}>{clusters.length}</span>
      </div>
      <div className={css.rows}>
        {clusters.map((cluster) => (
          <div
            key={cluster.bucketKey}
            className={css.row}
            data-testid="cooccurrence-row"
            data-existential={cluster.containsExistential ? 'true' : 'false'}
          >
            <div className={css.theme}>{cluster.theme}</div>
            <p className={css.summary}>{cluster.summary}</p>
            <div className={css.objectives}>
              Objectives: {cluster.objectiveIds.join(', ')}
            </div>
          </div>
        ))}
      </div>
      <span className={css.pointer}>Resolve in Plan</span>
    </section>
  );
}
