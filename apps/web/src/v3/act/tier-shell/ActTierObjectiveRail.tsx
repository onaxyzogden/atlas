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

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  OperationalRole,
  PlanStratum,
  PlanStratumObjective,
  ProjectTypeId,
  UniversalDomain,
} from '@ogden/shared';
import ActTierObjectiveCard from './ActTierObjectiveCard.js';
import ActRailModeToggle, { type RailMode } from './ActRailModeToggle.js';
import type { ObjectiveProgress } from './objectiveProgress.js';
import { getSourceTag, type SourceTagKind } from '../../plan/strata/sourceTag.js';
import ProtocolLayerPanel from '../../plan/strata/ProtocolLayerPanel.js';
import ViewFocusToggle from '../../roles/ViewFocusToggle.js';
import { composeScopedRail, type ScopedRailEntry } from '../../roles/railScope.js';
import { useResolvedOperationalRoles } from '../../roles/useResolvedOperationalRoles.js';
import type { SurfaceReason } from '../../roles/alwaysSurface.js';
import type { ViewFocusMode } from '../../../store/uiStore.js';
import styles from './ActTierShell.module.css';
// The "Viewing as" picker reuses RoleFocusControl's parchment select styling so
// the tier-shell picker is visually identical to the one in the Ops Hub /
// field-action shells (single source of truth for the control's look).
import roleCss from '../../roles/RoleFocusControl.module.css';

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

/** Stable empty surface map — the scoped path with no promotions still gets a
 *  referentially-stable Map so the scopedRail useMemo dep doesn't churn. */
const EMPTY_SURFACE_MAP: ReadonlyMap<string, SurfaceReason[]> = new Map();

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

  // ---- Operational Role Layer (additive; all undefined ⇒ byte-identical) ----
  /**
   * The viewer's domain scope when scoping is ENGAGED (`useViewScope().isScoped`).
   * Omitted / empty ⇒ the rail renders exactly as today (no partition, no
   * dimming). When present + non-empty the objectives split into an in-focus
   * list (in-scope + promoted) and a collapsible "Outside your focus" group.
   */
  scopedDomains?: ReadonlySet<UniversalDomain>;
  /**
   * Always-surface promotions, keyed by objective id (built once in the shell
   * via `collectAlwaysSurface`). An out-of-scope objective listed here is
   * promoted into the in-focus list with an amber chip rather than buried.
   */
  surfaceMap?: ReadonlyMap<string, SurfaceReason[]>;
  /** Render the "My focus / Full view" toggle (= `useViewScope().layerActive`). */
  showFocusToggle?: boolean;
  /** Current focus mode for the toggle. Required when `showFocusToggle`. */
  focusMode?: ViewFocusMode;
  /** Persist a focus choice (`useViewScope().setFocusMode`). */
  onFocusModeChange?: (mode: ViewFocusMode) => void;
  /**
   * Act role-based view filter (additive). When true, a "Viewing as" role
   * <select> renders beside the focus toggle so a coordinator can scope the rail
   * to ANY operational role's domains, not just their own
   * (`useViewScope(_, { allowRoleOverride: true }).canPickRole`). Plan/Observe
   * never pass it ⇒ no picker, byte-identical. Requires `onFocusRoleChange`.
   */
  canPickRole?: boolean;
  /** The active "view as" override role (`null` ⇒ the viewer's own roles). */
  focusRole?: OperationalRole | null;
  /** Persist a "view as" override (`null` ⇒ back to own roles). */
  onFocusRoleChange?: (role: OperationalRole | null) => void;
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
  scopedDomains,
  surfaceMap,
  showFocusToggle = false,
  focusMode,
  onFocusModeChange,
  canPickRole = false,
  focusRole = null,
  onFocusRoleChange,
}: Props) {
  // When the toggle is hidden (Plan tier shell), the rail is always the
  // objectives list regardless of the incoming `mode`.
  const effectiveMode: RailMode = hideModeToggle ? 'objectives' : mode;
  const eyebrow = stratum ? `Stratum S${stratum.ordinal}` : 'Stratum';

  // Collapsible "Outside your focus" group. The open state is DERIVED (see
  // `outsideOpen` below the scopedRail memo): collapsed when the viewer has work
  // in focus, but auto-expanded when NOTHING is in focus so the rail lands on
  // actionable work instead of an empty pane + a forced click. `outsideOverride`
  // holds an explicit user toggle; it resets to null (back to the derived
  // default) whenever the stratum changes, so a section opened on one stratum
  // doesn't stay stuck open on the next. Nothing is ever hidden — the
  // out-of-focus cards are one click away (never hide, only de-emphasize).
  const [outsideOverride, setOutsideOverride] = useState<boolean | null>(null);
  useEffect(() => {
    setOutsideOverride(null);
  }, [activeStratumId]);

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

  // Option C: this project's resolved domain map + label resolver so the
  // out-of-focus role badges reflect any per-project re-scope/rename. No
  // override ⇒ built-in map + labels ⇒ byte-identical badges.
  const { defs, domainsMap: roleDomainsMap, labelFor: roleLabelFor } =
    useResolvedOperationalRoles(projectId);

  // Operational Role Layer: when scoping is engaged, partition the (already
  // source-filtered) objectives into the in-focus list (in-scope + promoted)
  // and the collapsible out-of-focus group. `null` ⇒ render the flat list,
  // byte-identical to the pre-layer rail.
  const scopedRail = useMemo(
    () =>
      scopedDomains && scopedDomains.size > 0
        ? composeScopedRail(
            visibleObjectives,
            scopedDomains,
            surfaceMap ?? EMPTY_SURFACE_MAP,
            { domainsMap: roleDomainsMap, labelFor: roleLabelFor },
          )
        : null,
    [visibleObjectives, scopedDomains, surfaceMap, roleDomainsMap, roleLabelFor],
  );

  // Effective open state for the out-of-focus group: an explicit user toggle
  // when present, otherwise auto-expand when nothing is in focus (mainList
  // empty) so the member lands on actionable work rather than an empty pane.
  const outsideDefaultOpen =
    scopedRail != null &&
    scopedRail.mainList.length === 0 &&
    scopedRail.outsideList.length > 0;
  const outsideOpen = outsideOverride ?? outsideDefaultOpen;

  // Shared card renderer for the scoped path — threads the per-entry scope
  // state, promotion reasons, and owning-role badges into the pure card. The
  // 1-based `index` (numbered badge) restarts per rendered sub-list: it is the
  // map index of whichever list (in-focus or out-of-focus) this card belongs to.
  const renderScopedCard = (entry: ScopedRailEntry, index: number) => (
    <ActTierObjectiveCard
      key={entry.objective.id}
      objective={entry.objective}
      index={index + 1}
      progress={progressByObjective[entry.objective.id] ?? EMPTY_PROGRESS}
      isActive={entry.objective.id === activeObjectiveId}
      onSelect={() => onSelectObjective(entry.objective.id)}
      scopeState={entry.scopeState}
      surfaceReasons={entry.reasons}
      roleBadges={entry.roleBadges}
    />
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
          {((showFocusToggle && focusMode && onFocusModeChange) ||
            (canPickRole && onFocusRoleChange)) && (
            <div className={styles.focusToggleBar}>
              {showFocusToggle && focusMode && onFocusModeChange && (
                <ViewFocusToggle
                  focusMode={focusMode}
                  onChange={onFocusModeChange}
                  inFocusCount={scopedRail?.inFocusCount}
                  totalCount={scopedRail?.totalCount}
                />
              )}
              {/* "Viewing as" role picker (Act only). Prop-driven so the rail
                  stays presentational and Plan — which passes none of these —
                  is byte-identical. Mirrors RoleFocusControl's markup/testid so
                  it reads identically to the Ops Hub / field-action picker. */}
              {canPickRole && onFocusRoleChange && (
                <label className={roleCss.pickerWrap}>
                  <span className={roleCss.pickerLabel}>Viewing as</span>
                  <select
                    className={roleCss.select}
                    value={focusRole ?? ''}
                    onChange={(e) =>
                      onFocusRoleChange(
                        e.target.value === ''
                          ? null
                          : (e.target.value as OperationalRole),
                      )
                    }
                    data-testid="role-view-as-select"
                  >
                    <option value="">My roles</option>
                    {defs.map((def) => (
                      <option key={def.slug} value={def.slug}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </label>
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
          ) : scopedRail ? (
            // Scoped: in-focus list (in-scope + promoted) then a collapsible
            // "Outside your focus" group. Nothing is dropped — every objective
            // is in exactly one of the two lists, both always reachable.
            <>
              {scopedRail.mainList.length > 0 ? (
                <div className={styles.railList}>
                  {scopedRail.mainList.map(renderScopedCard)}
                </div>
              ) : (
                <p className={styles.railEmpty}>
                  None of the {scopedRail.outsideList.length} objective
                  {scopedRail.outsideList.length === 1 ? '' : 's'} in this stratum
                  fall in your focus — they are expanded below so you can still act
                  on them.
                </p>
              )}
              {scopedRail.outsideList.length > 0 && (
                <div className={styles.outsideSection}>
                  <button
                    type="button"
                    className={styles.outsideToggle}
                    aria-expanded={outsideOpen}
                    onClick={() => setOutsideOverride(!outsideOpen)}
                    data-testid="rail-outside-focus-toggle"
                  >
                    <span className={styles.outsideCaret} aria-hidden="true">
                      {outsideOpen ? '▾' : '▸'}
                    </span>
                    Outside your focus ({scopedRail.outsideList.length})
                  </button>
                  {outsideOpen && (
                    <div className={styles.railList}>
                      {scopedRail.outsideList.map(renderScopedCard)}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.railList}>
              {visibleObjectives.map((objective, i) => (
                <ActTierObjectiveCard
                  key={objective.id}
                  objective={objective}
                  index={i + 1}
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
