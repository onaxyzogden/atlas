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
import type { ReactNode } from 'react';
import type {
  PlanStratum,
  PlanStratumObjective,
  ProjectTypeId,
} from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import ActRailModeToggle, { type RailMode } from './ActRailModeToggle.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import { getSourceTag, type SourceTagKind } from '../../plan/strata/sourceTag.js';
import ProtocolLayerPanel from '../../plan/strata/ProtocolLayerPanel.js';
import styles from './ActTierShell.module.css';

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
  /** Active stratum — scopes the protocol list to this stratum's group (Act). */
  activeStratumId: string | null;
  /**
   * Stratum scope for the protocols list specifically. Omitted -> defaults to
   * `activeStratumId` (Act behaviour, per-stratum). Pass `null` to show the full
   * S1->S7 library regardless of the open stratum (Plan tier shell). Kept
   * separate from `activeStratumId` so the objectives list still tracks the open
   * stratum while the protocol list spans every stratum.
   */
  protocolScopeStratumId?: string | null;
  /** Currently-selected protocol template id (drives the right-rail detail). */
  selectedProtocolId: string | null;
  /** Fired when a protocol card is clicked — opens the right-rail detail. */
  onSelectProtocol: (templateId: string) => void;
  /** Act-only: enable the protocol bulk-activation toolbar in the panel. */
  bulkActivation?: boolean;
  /**
   * Hide the Objectives/Protocols mode toggle and force the objectives list.
   * The Plan tier shell (PlanTierShell) reuses this rail purely as an objectives
   * list — it has no standing-protocol library mode — so it passes `true` to
   * suppress the toggle. Additive + defaulted `false` so Act callers are
   * unchanged (the toggle still renders for Act).
   */
  hideModeToggle?: boolean;
  /**
   * OPTIONAL replacement for the default stratum header (eyebrow + title +
   * summary). When provided, it renders IN PLACE of the static header in the
   * objectives view — the Plan tier shell passes its interactive stratum
   * switcher here. Default undefined -> the static header renders (Act
   * byte-identical).
   */
  headerSlot?: ReactNode;
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
  activeStratumId,
  protocolScopeStratumId,
  selectedProtocolId,
  onSelectProtocol,
  bulkActivation = false,
  hideModeToggle = false,
  headerSlot,
}: Props) {
  // When the toggle is hidden (Plan tier shell), the rail is always the
  // objectives list regardless of the incoming `mode`.
  const effectiveMode: RailMode = hideModeToggle ? 'objectives' : mode;
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

  return (
    <div className={styles.railPanel}>
      {!hideModeToggle && (
        <div className={styles.railModeBar}>
          <ActRailModeToggle
            mode={mode}
            onChange={onModeChange}
            attentionCount={triggeredCount}
          />
        </div>
      )}

      {effectiveMode === 'protocols' ? (
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
            activeStratumId={
              protocolScopeStratumId !== undefined
                ? protocolScopeStratumId
                : activeStratumId
            }
            selectedProtocolId={selectedProtocolId}
            onSelectProtocol={onSelectProtocol}
            bulkActivation={bulkActivation}
          />
        </div>
      ) : (
        <>
          {headerSlot ?? (
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
                  // No eyebrow here: every card in this list belongs to the
                  // selected stratum, which the rail header already names, so the
                  // per-card stratum title was redundant. (The search rail still
                  // passes an eyebrow — its results span strata.)
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
