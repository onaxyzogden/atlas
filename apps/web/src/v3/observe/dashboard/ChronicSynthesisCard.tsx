/**
 * ChronicSynthesisCard -- read-only Observe synthesis surface that sits ABOVE
 * the single-cycle CoOccurrenceSynthesisCard sibling. Where that card surfaces
 * a one-off co-occurrence (the present), THIS card surfaces CHRONIC structural
 * verdicts (slice #3): a protocol PAIR co-deviating in the same season across
 * >= 2 distinct rotation cycles -- the strongest "redesign, not retune" signal.
 *
 * Observe SYNTHESIZES, it does not act: this card carries NO Acknowledge /
 * Resolve / Redesign controls -- only a single passive "Redesign in Plan" text
 * pointer. No <button>, no role=button, no onClick anywhere.
 *
 * Renders nothing (zero bytes) when there are no chronic verdicts.
 */

import type { ChronicVerdict } from '@ogden/shared';
import { useChronicVerdicts } from '../../../store/chronicVerdicts.js';
import { groupChronicVerdicts } from '../../chronic/groupChronicVerdicts.js';
import css from './ChronicSynthesisCard.module.css';

interface Props {
  projectId: string;
}

function recurrenceDetail(verdict: ChronicVerdict): string {
  const cycleWord = verdict.occurrenceCount === 1 ? 'cycle' : 'cycles';
  const cadence = verdict.consecutive ? 'consecutive' : 'recurring';
  return `Chronic across ${verdict.occurrenceCount} ${cycleWord} (${cadence}).`;
}

export default function ChronicSynthesisCard({ projectId }: Props) {
  // Self-fetched, exactly like the CoOccurrenceSynthesisCard sibling. The
  // 16-domain dashboard has no single domainId from which to derive a
  // currentBucket, so none is passed (a verified no-op for the dormancy
  // filter). Same decision as the sibling -- do NOT "add the missing bucket".
  const verdicts: ChronicVerdict[] = useChronicVerdicts(projectId);

  if (verdicts.length === 0) return null;

  // Group by (season, common-deviant anchor). Read-only synthesis surface:
  // render ALL groups and ALL their verdicts -- NO cap, NO show-more.
  const groups = groupChronicVerdicts(verdicts);

  return (
    <section
      className={css.card}
      data-testid="chronic-synthesis-card"
      aria-label="Chronic structural verdicts"
    >
      <div className={css.heading}>
        <span className={css.title}>Chronic structural verdicts</span>
        <span className={css.count}>{verdicts.length}</span>
      </div>
      <p className={css.lede}>
        Patterns recurring season-over-season across rotation cycles --
        structural, not noise.
      </p>
      <div className={css.rows}>
        {groups.map((group) => (
          <div key={group.key} className={css.groupBlock}>
            <div
              className={css.groupHeader}
              data-testid={`chronic-group-${group.key}`}
            >
              {`${group.season ?? 'unknown'} - common deviant ${group.anchorTemplateId}`}
            </div>
            {group.verdicts.map((verdict) => (
              <div
                key={verdict.signatureKey}
                className={css.row}
                data-testid="chronic-row"
                data-existential={
                  verdict.containsExistential ? 'true' : 'false'
                }
                data-open={verdict.containsOpen ? 'true' : 'false'}
              >
                <div className={css.theme}>{verdict.theme}</div>
                <p className={css.summary}>{verdict.summary}</p>
                <div className={css.objectives}>
                  Objectives: {verdict.objectiveIds.join(', ')}
                </div>
                <div className={css.recurrence}>
                  {recurrenceDetail(verdict)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className={css.pointer}>Redesign in Plan</span>
    </section>
  );
}
