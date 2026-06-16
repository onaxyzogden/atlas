// PlanTierSearchRail — left rail shown IN PLACE of the normal Plan objective
// rail (ActTierObjectiveRail, shared with Act) while a header Stage Search query
// is active on the Plan stage. Renders the broadened, cross-stratum objective
// match set from resolvePlanSearchMatches: every objective whose text matches,
// plus objectives surfaced because one of their mapped Observe domains matched
// (shown with a subtle "via …" hint). Selecting a match reveals that objective
// in Plan and clears the query centrally (the shell owns clear + lock-gating,
// mirroring ActTierObjectiveRail's onSelect contract).
//
// Plan search is objectives + domains only (no tools), per the confirmed scope:
// the placeholder reads "Search objectives, domains…" and Plan has no standalone
// tool-search surface the way Act does.

import { findPlanStratum } from '@ogden/shared';
import ActTierObjectiveCard from '../../act/tier-shell/ActTierObjectiveCard.js';
import type { ObjectiveProgress } from '../../act/tier-shell/objectiveProgress.js';
import type { PlanObjectiveMatch } from '../../search/useStageSearchResults.js';
import shell from '../../act/tier-shell/ActTierShell.module.css';
import css from './PlanTierSearchRail.module.css';

const EMPTY_PROGRESS: ObjectiveProgress = {
  total: 0,
  verified: 0,
  state: 'available',
};

interface Props {
  query: string;
  matches: readonly PlanObjectiveMatch[];
  progressByObjective: Readonly<Record<string, ObjectiveProgress>>;
  activeObjectiveId: string | null;
  onSelectObjective: (objective: PlanObjectiveMatch['objective']) => void;
}

export default function PlanTierSearchRail({
  query,
  matches,
  progressByObjective,
  activeObjectiveId,
  onSelectObjective,
}: Props) {
  const total = matches.length;

  return (
    <div className={shell.railPanel}>
      <div className={shell.railHeader}>
        <span className={shell.railEyebrow}>Search · all strata</span>
        <span className={shell.railTitle}>
          {total} match{total === 1 ? '' : 'es'} for “{query.trim()}”
        </span>
      </div>

      {total === 0 ? (
        <p className={shell.railEmpty}>
          No objectives match “{query.trim()}” in this stage.
        </p>
      ) : (
        <div className={shell.railList}>
          {matches.map(({ objective, matchedDomains }) => {
            const stratum = findPlanStratum(objective.stratumId);
            return (
              <div key={objective.id} className={css.match}>
                <ActTierObjectiveCard
                  objective={objective}
                  eyebrow={
                    stratum
                      ? `S${stratum.ordinal} · ${stratum.title}`
                      : 'Objective'
                  }
                  progress={progressByObjective[objective.id] ?? EMPTY_PROGRESS}
                  isActive={objective.id === activeObjectiveId}
                  onSelect={() => onSelectObjective(objective)}
                />
                {matchedDomains.length > 0 && (
                  <span className={css.via}>via {matchedDomains.join(', ')}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
