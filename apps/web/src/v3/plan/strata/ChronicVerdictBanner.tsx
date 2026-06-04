// ChronicVerdictBanner -- collapsible banner at the top of the Plan objective
// column surfacing CHRONIC structural verdicts (slice #3): a protocol PAIR
// co-deviating in the SAME season across >= 2 distinct rotation cycles. This is
// the HEAVIER/structural tier mounted directly ABOVE the single-cycle
// CoOccurrenceVerdictBanner: a one-off co-occurrence might be noise, but the
// same pair recurring season-over-season is "redesign, not retune".
//
// Collapsed by default to a one-line count; expanded, each verdict shows its
// theme heading, a summary sentence, a recurrence detail line, and deep-link
// buttons to the affected objectives. Existential-bearing verdicts (destocking
// / animal welfare) get a heavier amber ring so the steward sees the
// higher-stakes verdict.
//
// Pure presentational: verdicts are INJECTED, and the collapse state lives in
// the parent shell (mirrors CoOccurrenceVerdictBanner). The amber/gold
// treatment matches the co-occurrence palette, weighted a touch heavier to
// convey the chronic / structural tier.

import { useState, useEffect } from 'react';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChronicVerdict } from '@ogden/shared';
import {
  groupChronicVerdicts,
  capGroups,
} from '../../chronic/groupChronicVerdicts.js';
import css from './ChronicVerdictBanner.module.css';

// Top-N cap on rendered chronic verdict ROWS before the "show more" expander
// takes over. Group headers do not count toward the cap.
const DEFAULT_CHRONIC_CAP = 6;

interface Props {
  verdicts: ChronicVerdict[];
  expanded: boolean;
  onToggle: () => void;
  onSelectObjective: (objectiveId: string) => void;
}

export default function ChronicVerdictBanner({
  verdicts,
  expanded,
  onToggle,
  onSelectObjective,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  // Each fresh open of the banner should start capped. The steward could
  // expand -> "Show all" -> collapse; without this reset, re-expanding would
  // re-open fully expanded with the top-6 cap silently dropped.
  useEffect(() => {
    if (!expanded) setShowAll(false);
  }, [expanded]);

  if (verdicts.length === 0) return null;
  const count = verdicts.length;

  const groups = groupChronicVerdicts(verdicts);
  const { visibleGroups, hiddenCount } = capGroups(
    groups,
    showAll ? Number.POSITIVE_INFINITY : DEFAULT_CHRONIC_CAP,
  );

  return (
    <aside
      className={css.banner}
      aria-label="Chronic structural verdicts"
      data-testid="chronic-verdict-banner"
    >
      <button
        type="button"
        className={css.header}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={css.iconWrap} aria-hidden>
          <Layers size={14} />
        </span>
        <span className={css.headerText}>
          {count} chronic structural verdict{count === 1 ? '' : 's'}
        </span>
        <span className={css.chevron} aria-hidden>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {expanded && (
        <>
          <ul className={css.list}>
            {visibleGroups.map((group) => (
              <li key={group.key} className={css.groupBlock}>
                <p
                  className={css.groupHeader}
                  data-testid={`chronic-group-${group.key}`}
                >
                  {group.season ?? 'unknown'} - common deviant{' '}
                  {group.anchorTemplateId}
                </p>
                <ul className={css.groupRows}>
                  {group.verdicts.map((verdict) => (
                    <li
                      key={verdict.signatureKey}
                      className={css.row}
                      data-existential={
                        verdict.containsExistential ? 'true' : undefined
                      }
                      data-open={verdict.containsOpen ? 'true' : undefined}
                    >
                      <p className={css.themeHeading}>{verdict.theme}</p>
                      <p className={css.rowBody}>{verdict.summary}</p>
                      <p className={css.recurrence}>
                        {verdict.occurrenceCount} cycles{' '}
                        {verdict.consecutive ? 'consecutive' : 'recurring'}
                      </p>
                      <div className={css.linkRow}>
                        {verdict.objectiveIds.map((objectiveId) => (
                          <button
                            key={objectiveId}
                            type="button"
                            className={css.objectiveLink}
                            data-testid={`chronic-objective-link-${objectiveId}`}
                            onClick={() => onSelectObjective(objectiveId)}
                          >
                            Review {objectiveId}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && !showAll && (
            <button
              type="button"
              data-testid="chronic-show-more"
              className={css.showMore}
              onClick={() => setShowAll(true)}
            >
              Show {hiddenCount} more
            </button>
          )}
        </>
      )}
    </aside>
  );
}
