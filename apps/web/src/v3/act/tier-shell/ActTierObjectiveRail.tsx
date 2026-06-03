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

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
import { getSourceTag, type SourceTagKind } from '../../plan/strata/sourceTag.js';
import ProtocolLayerPanel from '../../plan/strata/ProtocolLayerPanel.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import styles from './ActTierShell.module.css';
import detail from './ActTierObjectiveRail.module.css';

/** Max act-tool chips shown inline before collapsing to a "+N more" note. */
const MAX_TOOL_CHIPS = 6;

// Source filter (All / Universal / Primary / Secondary) — parity with the Plan
// ObjectiveColumn. Purely a view filter over the rendered list; it never
// touches progress, status, or the map markers. The bar only shows when this
// stratum actually mixes sources, so an all-universal stratum stays uncluttered.
type SourceFilter = 'all' | SourceTagKind;
const SOURCE_FILTERS: ReadonlyArray<{ key: SourceFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'universal', label: 'Universal' },
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
];

/** Act-tool ids whose presence on an objective surfaces the live closed-loop
 *  material-flow block. Material flows are PROJECT-scoped, not objective-scoped, so
 *  this is a heuristic about *where it is worth surfacing the project's flow count*.
 *
 *  Deliberately MAXIMALIST (operator decision 2026-06-02c): every act-tool that
 *  represents a material SOURCE or SINK -- organic-matter/nutrient cycling, water
 *  sources/sinks/buffers/conveyance, yield production, the livestock/manure
 *  pathway, and the field-log tools that track material movement -- counts as a
 *  flow signal. This favours discoverability of the closed-loop feature (the block
 *  degrades gracefully to a quiet "No material flows recorded yet" hint) over a
 *  tight signal; the accepted cost is that the block appears on most production /
 *  water / integration objectives. `compost` remains the canonical structural
 *  signal (s6 integration default across ALL project types, soil-improvement,
 *  forage-improvement). */
const FLOW_TOOL_IDS: ReadonlySet<string> = new Set([
  // organic-matter / nutrient cycling
  'compost',
  'fertility-unit',
  // water sources, sinks, buffers, conveyance
  'watercourse',
  'spring',
  'storage',
  'swale',
  'sink',
  'tanks',
  'wells',
  // yield sources (production -> harvest material)
  'crops',
  'orchards',
  'beds',
  // livestock / manure pathway
  'paddocks',
  'pasture',
  'barns',
  // field-log tools that explicitly track material movement
  'harvest',
  'livestock',
  // dedicated closed-loop / greywater flow-authoring tool (arm.kind 'flow';
  // added 2026-06-02d). This is the SINGLE strongest flow signal: it is the only
  // tool that actually authors a MaterialFlow into closedLoopStore (default
  // materialKind 'greywater'), so its presence on an objective is a direct
  // statement that a closed loop is recorded there - unlike the source/sink
  // tools above, which only imply a flow. With a real authoring tool now wired,
  // the maximalist source/sink set could be narrowed later; it is kept for now
  // so the block stays discoverable on production / water / integration work.
  'flow-connector',
]);

/** Prose signal (focused question / title) for waste-vector / closed-loop / water-
 *  reuse objectives that lack a flow tool. Includes greywater / rainwater-harvest /
 *  water-reuse terms (there is no dedicated greywater tool in the Act catalogue
 *  yet). Terms stay scoped (e.g. "water re-use", not bare "reuse") to avoid false
 *  positives on incidental copy. */
const FLOW_PROSE_RE =
  /waste-to-input|closed[- ]loop|material flow|feedback loop|nutrient cycl|grey[- ]?water|rainwater harvest|water re-?use|water recycl/i;

/** Which objectives surface the live closed-loop flow block. Broadened from the
 *  original id-only substring gate (which missed the `rf-`-prefixed farm
 *  waste-vector objective) to an OR over three signals -- material flows are
 *  project-scoped, not objective-scoped, so this stays a heuristic, but it now
 *  keys off the objective's resolved act-tools and prose rather than its id alone:
 *    1. id pattern (keeps homestead `hms-s2-resource-flows` lit);
 *    2. resolved act-tools include any material source/sink tool (FLOW_TOOL_IDS,
 *       the maximalist set: compost/water/yield/livestock/log tools);
 *    3. focused-question / title prose names a closed-loop / waste-vector /
 *       water-reuse concern (FLOW_PROSE_RE, incl. greywater).
 */
function isResourceFlowObjective(
  objective: PlanStratumObjective,
  toolIds: readonly string[],
): boolean {
  if (/resource-flow|waste|material-flow/i.test(objective.id)) return true;
  if (toolIds.some((id) => FLOW_TOOL_IDS.has(id))) return true;
  return FLOW_PROSE_RE.test(`${objective.focusedQuestion} ${objective.title}`);
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

  // Source filter (parity with Plan ObjectiveColumn). The bar only shows when
  // this stratum mixes sources; on an all-universal stratum it would be inert
  // noise. `effectiveFilter` guards against a sticky selection hiding every
  // card after the steward switches to a stratum lacking that source. The
  // filter never feeds progress/status or the map markers.
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const sourceKinds = useMemo(() => {
    const kinds = new Set<SourceTagKind>();
    for (const o of objectives) kinds.add(getSourceTag(o).kind);
    return kinds;
  }, [objectives]);
  const effectiveFilter: SourceFilter =
    sourceFilter !== 'all' && sourceKinds.has(sourceFilter)
      ? sourceFilter
      : 'all';
  const visibleObjectives = useMemo(
    () =>
      effectiveFilter === 'all'
        ? objectives
        : objectives.filter((o) => getSourceTag(o).kind === effectiveFilter),
    [objectives, effectiveFilter],
  );

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
              {/* Explicit deselect affordance. Re-selecting the active objective
                  toggles it off in the shell (handleSelectObjective), so calling
                  onSelectObjective with the active id returns the rail to the
                  stratum dashboard - a discoverable alternative to re-clicking
                  the card/pin. */}
              <button
                type="button"
                className={detail.detailDeselect}
                onClick={() => onSelectObjective(activeObjective.id)}
                data-testid="act-rail-objective-deselect"
              >
                <ChevronLeft size={13} aria-hidden />
                All objectives
              </button>
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

              {isResourceFlowObjective(
                activeObjective,
                tools.map((t) => t.id),
              ) && (
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
          {sourceKinds.size > 1 && (
            <div
              role="group"
              aria-label="Filter objectives by source"
              className={styles.railFilterBar}
            >
              {SOURCE_FILTERS.filter(
                (f) => f.key === 'all' || sourceKinds.has(f.key),
              ).map((f) => {
                const isActive = effectiveFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    className={styles.railFilterPill}
                    data-active={isActive}
                    aria-pressed={isActive}
                    onClick={() => setSourceFilter(f.key)}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {objectives.length === 0 ? (
            <p className={styles.railEmpty}>No objectives in this stratum.</p>
          ) : visibleObjectives.length === 0 ? (
            <p className={styles.railEmpty}>
              No {effectiveFilter} objectives in this stratum.
            </p>
          ) : (
            <div className={styles.railList}>
              {visibleObjectives.map((objective) => (
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
