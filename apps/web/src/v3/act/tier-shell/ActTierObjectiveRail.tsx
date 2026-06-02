// ActTierObjectiveRail.tsx
//
// Left rail: the selected stratum's objectives as ActTierObjectiveCards. The
// per-objective progress map is computed once in ActTierShell (see
// objectiveProgress.ts) and passed in, so the rail and the map markers always
// agree and neither recomputes. Header shows the active stratum as category.
//
// A mode toggle at the top switches the rail between the objective list and the
// standing-protocol library (ProtocolLayerPanel, reused from the Plan spine).
// An aggregate amber badge on the Protocols segment flags triggered protocols.

import { useMemo } from 'react';
import type {
  PlanStratum,
  PlanStratumObjective,
  ProjectTypeId,
} from '@ogden/shared';
import { getObjectiveActTools } from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import ActRailModeToggle, { type RailMode } from './ActRailModeToggle.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import { resolveActTools } from './actToolCatalog.js';
import ProtocolLayerPanel from '../../plan/strata/ProtocolLayerPanel.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import styles from './ActTierShell.module.css';
import detail from './ActTierObjectiveRail.module.css';

/** Max act-tool chips shown inline before collapsing to a "+N more" note. */
const MAX_TOOL_CHIPS = 6;

/** v1 heuristic: which objectives surface the live closed-loop flow block.
 *  Resource-flow / waste-vector objectives (e.g. homestead `hms-s2-resource-flows`).
 *  Material flows are project-scoped, not objective-scoped, so this is an
 *  id-pattern gate rather than a structural link. */
function isResourceFlowObjective(objectiveId: string): boolean {
  return /resource-flow|waste|material-flow/i.test(objectiveId);
}

const EMPTY_PROGRESS: ObjectiveProgress = {
  total: 0,
  verified: 0,
  state: 'available',
};

/** Stable empty triggered-ids default — keeps ProtocolLayerPanel's useMemo(Set)
 *  identity stable across renders when the rail is mounted without the prop
 *  (e.g. existing tests, or before the Act evaluation engine lands). */
const EMPTY_TRIGGERED_IDS: readonly string[] = [];

interface Props {
  stratum: PlanStratum | undefined;
  objectives: readonly PlanStratumObjective[];
  progressByObjective: Readonly<Record<string, ObjectiveProgress>>;
  activeObjectiveId: string | null;
  onSelectObjective: (objectiveId: string) => void;
  mode: RailMode;
  onModeChange: (mode: RailMode) => void;
  triggeredCount: number;
  /** Template ids the Act evaluation engine currently considers triggered. */
  triggeredIds?: readonly string[];
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
}

export default function ActTierObjectiveRail({
  stratum,
  objectives,
  progressByObjective,
  activeObjectiveId,
  onSelectObjective,
  mode,
  onModeChange,
  triggeredCount,
  triggeredIds = EMPTY_TRIGGERED_IDS,
  projectId,
  primaryTypeId,
  secondaryTypeIds,
}: Props) {
  const eyebrow = stratum ? `Stratum S${stratum.ordinal}` : 'Stratum';

  // Resolve the selected objective (header replaces stratum content when set).
  const activeObjective = activeObjectiveId
    ? objectives.find((o) => o.id === activeObjectiveId) ?? null
    : null;

  // Live closed-loop material flows, scoped to this project (mirrors
  // ClosedLoopGraphCard). Hook called unconditionally (Rules of Hooks).
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const flows = useMemo(
    () => allFlows.filter((f) => f.projectId === projectId),
    [allFlows, projectId],
  );
  const closedFlows = flows.filter((f) => f.sourceId && f.sinkId).length;

  // Act tools this objective "calls for" (catalogue-id list -> labelled tools).
  const tools = useMemo(
    () => (activeObjective ? resolveActTools(getObjectiveActTools(activeObjective)) : []),
    [activeObjective],
  );

  const activeProgress =
    (activeObjective && progressByObjective[activeObjective.id]) || EMPTY_PROGRESS;
  const activeProgressLabel =
    activeProgress.total === 0
      ? 'No tasks yet'
      : `${activeProgress.verified}/${activeProgress.total} done`;

  return (
    <div className={styles.railPanel}>
      <div className={styles.railModeBar}>
        <ActRailModeToggle
          mode={mode}
          onChange={onModeChange}
          attentionCount={triggeredCount}
        />
      </div>

      {mode === 'protocols' ? (
        // .olos-spine-root activates the `--spine-*` custom properties the shared
        // protocol cards are styled with (declared in spine-theme.css, imported by
        // ProtocolLayerPanel). Without this scope the cards render "naked" — the
        // bento framing + emphasis depend on these vars resolving.
        <div
          className={`olos-spine-root ${styles.railProtocolBody} ${styles.railProtocolFramed}`}
        >
          <ProtocolLayerPanel
            variant="act"
            framed
            triggeredIds={triggeredIds}
            projectId={projectId}
            primaryTypeId={primaryTypeId}
            secondaryTypeIds={secondaryTypeIds}
          />
        </div>
      ) : (
        <>
          {activeObjective ? (
            <div className={styles.railHeader}>
              {/* Eyebrow keeps the stratum context even when the objective owns
                  the header body. */}
              <span className={styles.railEyebrow}>
                {stratum ? `${eyebrow} . ${stratum.title}` : eyebrow}
              </span>
              <span className={styles.railTitle}>
                {activeObjective.shortTitle ?? activeObjective.title}
              </span>

              <p className={detail.detailQuestion}>
                {activeObjective.focusedQuestion}
              </p>

              <div className={detail.detailRow}>
                <span className={detail.detailLabel}>Decision progress</span>
                <span
                  className={detail.progress}
                  data-state={activeProgress.state}
                >
                  {activeProgressLabel}
                </span>
              </div>

              {activeObjective.completionGate && (
                <div className={detail.detailRow}>
                  <span className={detail.detailLabel}>Completion gate</span>
                  <span className={detail.gate}>
                    {activeObjective.completionGate}
                  </span>
                </div>
              )}

              {activeObjective.actHandoff && (
                <div className={detail.detailRow}>
                  <span className={detail.detailLabel}>Act handoff</span>
                  <span className={detail.handoff}>
                    {activeObjective.actHandoff}
                  </span>
                </div>
              )}

              {tools.length > 0 && (
                <div className={detail.detailRow}>
                  <span className={detail.detailLabel}>Tools</span>
                  <div className={detail.toolChips}>
                    {tools.slice(0, MAX_TOOL_CHIPS).map((tool) => (
                      <span key={tool.id} className={detail.toolChip}>
                        {tool.label}
                      </span>
                    ))}
                    {tools.length > MAX_TOOL_CHIPS && (
                      <span className={detail.toolMore}>
                        +{tools.length - MAX_TOOL_CHIPS} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isResourceFlowObjective(activeObjective.id) && (
                <div className={detail.flowBlock}>
                  {flows.length > 0 ? (
                    <span className={detail.flowValue}>
                      Material flows: {flows.length}{' '}
                      <span className={detail.flowClosed}>
                        ({closedFlows} closed-loop)
                      </span>
                    </span>
                  ) : (
                    <span className={detail.flowHint}>
                      No material flows recorded yet
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.railHeader}>
              <span className={styles.railEyebrow}>{eyebrow}</span>
              <span className={styles.railTitle}>
                {stratum?.title ?? 'Objectives'}
              </span>
              {stratum?.summary && (
                <span className={styles.railSummary}>{stratum.summary}</span>
              )}
            </div>
          )}
          {objectives.length === 0 ? (
            <p className={styles.railEmpty}>No objectives in this stratum.</p>
          ) : (
            <div className={styles.railList}>
              {objectives.map((objective) => (
                <ActTierObjectiveCard
                  key={objective.id}
                  objective={objective}
                  eyebrow={stratum?.title ?? 'Objective'}
                  progress={progressByObjective[objective.id] ?? EMPTY_PROGRESS}
                  isActive={objective.id === activeObjectiveId}
                  onSelect={() => onSelectObjective(objective.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
