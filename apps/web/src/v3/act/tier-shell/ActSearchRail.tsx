// ActSearchRail — left rail shown IN PLACE of ActTierObjectiveRail while a
// header Stage Search query is active on the Act stage. Renders the broadened,
// cross-objective match set (resolveActSearchMatches): matching Act tools across
// every objective's tool set, plus objectives that match by text. Selecting a
// tool navigates to the objective that exposes it AND arms the tool there;
// selecting an objective just reveals it. The shell clears the query centrally
// (mirrors ActTierObjectiveRail's onSelect contracts).

import type { PlanStratumObjective } from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import type { ActToolMatch } from '../../search/useStageSearchResults.js';
import { findPlanStratum } from '@ogden/shared';
import shell from './ActTierShell.module.css';
import css from './ActSearchRail.module.css';

const EMPTY_PROGRESS: ObjectiveProgress = {
  total: 0,
  verified: 0,
  state: 'available',
};

interface Props {
  query: string;
  toolMatches: readonly ActToolMatch[];
  objectiveMatches: readonly PlanStratumObjective[];
  progressByObjective: Readonly<Record<string, ObjectiveProgress>>;
  activeObjectiveId: string | null;
  onSelectTool: (match: ActToolMatch) => void;
  onSelectObjective: (objective: PlanStratumObjective) => void;
  /**
   * Ids of tools that ALSO have a home on the Plan stage (i.e. survive
   * resolvePlanTools — everything except `log`-arm field logs). When provided
   * together with onOpenToolInPlan, a secondary "Open in Plan" control renders on
   * each plan-capable tool row so the steward can jump to Plan and use the tool
   * on its editable canvas / decision workbench, instead of only arming it in Act.
   */
  planToolIds?: ReadonlySet<string>;
  /** Hand off the matched tool to the Plan stage (navigate + arm on arrival). */
  onOpenToolInPlan?: (match: ActToolMatch) => void;
}

export default function ActSearchRail({
  query,
  toolMatches,
  objectiveMatches,
  progressByObjective,
  activeObjectiveId,
  onSelectTool,
  onSelectObjective,
  planToolIds,
  onOpenToolInPlan,
}: Props) {
  const total = toolMatches.length + objectiveMatches.length;

  return (
    <div className={shell.railPanel}>
      <div className={shell.railHeader}>
        <span className={shell.railEyebrow}>Search · all objectives</span>
        <span className={shell.railTitle}>
          {total} match{total === 1 ? '' : 'es'} for “{query.trim()}”
        </span>
      </div>

      {total === 0 ? (
        <p className={shell.railEmpty}>
          No tools or objectives match “{query.trim()}” in this stage.
        </p>
      ) : (
        <div className={shell.railList}>
          {toolMatches.length > 0 && (
            <>
              <span className={css.groupLabel}>Tools</span>
              {toolMatches.map((match) => {
                const Icon = match.tool.icon;
                const stratum = findPlanStratum(match.objective.stratumId);
                const canOpenInPlan =
                  onOpenToolInPlan != null &&
                  (planToolIds?.has(match.tool.id) ?? false);
                return (
                  <div key={match.tool.id} className={css.toolRowWrap}>
                    <button
                      type="button"
                      className={css.toolRow}
                      onClick={() => onSelectTool(match)}
                    >
                      <Icon size={15} aria-hidden="true" className={css.toolIcon} />
                      <span className={css.toolBody}>
                        <span className={css.toolLabel}>{match.tool.label}</span>
                        <span className={css.toolMeta}>
                          {match.categoryLabel}
                          {' · '}
                          {match.objective.shortTitle ?? match.objective.title}
                          {stratum ? ` · S${stratum.ordinal}` : ''}
                        </span>
                      </span>
                    </button>
                    {canOpenInPlan && (
                      <button
                        type="button"
                        className={css.openInPlanBtn}
                        onClick={() => onOpenToolInPlan(match)}
                      >
                        Open in Plan
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {objectiveMatches.length > 0 && (
            <>
              <span className={css.groupLabel}>Objectives</span>
              {objectiveMatches.map((objective) => {
                const stratum = findPlanStratum(objective.stratumId);
                return (
                  <ActTierObjectiveCard
                    key={objective.id}
                    objective={objective}
                    eyebrow={
                      stratum ? `S${stratum.ordinal} · ${stratum.title}` : 'Objective'
                    }
                    progress={progressByObjective[objective.id] ?? EMPTY_PROGRESS}
                    isActive={objective.id === activeObjectiveId}
                    onSelect={() => onSelectObjective(objective)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
