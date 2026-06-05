// PlanSearchColumn — centre column shown IN PLACE of ObjectiveColumn while a
// header Stage Search query is active on the Plan stage. Renders the broadened,
// cross-stratum objective match list (resolvePlanSearchMatches) as the same
// ObjectiveCards the stratum column uses, each annotated with its owning
// stratum and — for a domain-only match — the domain that surfaced it.
// Selecting a result is delegated up so the shell can navigate + clear the
// query centrally (mirrors ObjectiveColumn's onSelectObjective contract).

import {
  findPlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import ObjectiveCard from './ObjectiveCard.js';
import type { PlanObjectiveMatch } from '../../search/useStageSearchResults.js';
import { C, F } from '../spine/tokens.js';
import css from './PlanSearchColumn.module.css';

interface Props {
  query: string;
  matches: readonly PlanObjectiveMatch[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  activeObjectiveId: string | null;
  onSelectObjective: (objective: PlanStratumObjective) => void;
}

export default function PlanSearchColumn({
  query,
  matches,
  objectiveStatuses,
  activeObjectiveId,
  onSelectObjective,
}: Props) {
  return (
    <section
      aria-label={`Search results for “${query.trim()}”`}
      style={{
        flex: 3,
        minWidth: 0,
        minHeight: 0,
        overflowY: 'auto',
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 12px',
        fontFamily: F.sans,
      }}
    >
      <div className={css.heading}>
        <span className={css.headingLabel} style={{ color: C.textPrimary }}>
          Search results
        </span>
        <span className={css.count} style={{ color: C.textTertiary }}>
          {matches.length} match{matches.length === 1 ? '' : 'es'} · all strata
        </span>
      </div>

      {matches.length > 0 ? (
        <ul className={css.list}>
          {matches.map(({ objective, matchedDomains }) => {
            const stratum = findPlanStratum(objective.stratumId);
            return (
              <li key={objective.id} className={css.item}>
                <ObjectiveCard
                  objective={objective}
                  status={objectiveStatuses[objective.id] ?? 'locked'}
                  isActive={objective.id === activeObjectiveId}
                  onSelect={onSelectObjective}
                />
                <div className={css.meta}>
                  {stratum && (
                    <span
                      className={css.metaStratum}
                      style={{ color: C.textTertiary }}
                    >
                      Stratum {stratum.ordinal} · {stratum.title}
                    </span>
                  )}
                  {matchedDomains.length > 0 && (
                    <span
                      className={css.metaVia}
                      style={{ color: C.textSecondary }}
                    >
                      via {matchedDomains.join(', ')}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          className={css.empty}
          style={{
            color: C.textSecondary,
            background: C.bg,
            border: `1px dashed ${C.border}`,
            borderRadius: 8,
          }}
        >
          No objectives or domains match “{query.trim()}” in this stage.
        </p>
      )}
    </section>
  );
}
