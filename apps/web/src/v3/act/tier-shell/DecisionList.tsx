/**
 * DecisionList -- the center pane of the Tier-0 workbench ("Your Decisions").
 *
 * A presentational, CONTROLLED component: it lists the active objective's
 * checklist items as clickable rows and surfaces the completion gate. It owns
 * NO store and NO right-hand working panel -- selection is lifted to the parent
 * via `onSelectItem`, and effective per-item progress is passed in already
 * unioned upstream via `completedItemIds`.
 *
 * Structure (mockup center column):
 *   1. Center header (.ch): an "Active decision" eyebrow, the objective title in
 *      serif italic, and the objective's guiding question (focusedQuestion).
 *   2. A "Your Decisions" label row with a mono count chip reading
 *      "{done} / {total} decisions made".
 *   3. One decision row per checklist item: a completion circle (filled green +
 *      Check when complete), the label, an inline "optional" badge, and a feed
 *      annotation (feedsInto target ids resolved to titles). Selected and done
 *      states are reflected via data-selected / data-complete. The whole row is
 *      a keyboard-operable button.
 *   4. A completion-gate card (.cgate) when the objective carries a gate.
 *
 * Data-derivation mirrors DecisionChecklist: a completed-id Set drives per-item
 * completion, and `findObjectiveGlobally` resolves feed target ids to titles.
 */

import { Fragment } from 'react';
import {
  ArrowRight,
  Check,
  FileText,
  Map as MapIcon,
  MapPin,
  Scale,
} from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { findObjectiveGlobally } from '../../plan/objectiveCatalog.js';
import { ACT_COPY, decisionCount, feedsFallback } from '../../copy/index.js';
import css from './DecisionList.module.css';

export interface DecisionListProps {
  /** The active objective: checklist, decisionGroups, completionGate, title. */
  objective: PlanStratumObjective;
  /** Effective per-item progress for THIS objective (already unioned upstream). */
  completedItemIds: readonly string[];
  /** Currently selected checklist item id, or null when nothing is selected. */
  selectedItemId: string | null;
  /** Lift selection to the parent (which owns the right working panel). */
  onSelectItem: (itemId: string) => void;
  /**
   * OPTIONAL capture-mode resolver. When provided AND it returns a non-null
   * RAW mode key for a row, a small mode badge renders on that row (next to the
   * label / optional badge). DecisionList maps the raw key to a human label
   * (see MODE_LABELS). When absent, NO badge renders -- existing behaviour.
   */
  modeFor?: (itemId: string) => string | null;
  /**
   * OPTIONAL. When true AND the objective carries decisionGroups, the rows are
   * rendered under group-label dividers (mockup `.group-label`). Default false,
   * so stakeholders / legal-governance and every other Tier-0 surface are
   * UNCHANGED (flat list).
   */
  showGroups?: boolean;
}

// Raw mode key -> human label. The keys cover three families: the LEGACY
// BoundaryCaptureLegacy modes ('doc' | 'map' | 'mapEntry' | 'decision', still
// returned by the unwired legacy component), StakeholderMode ('mapContact' |
// 'contact' | 'cultural' | 'annotate'), and the SP1 re-decomposed BoundaryMode
// ('boundaryRegister' | 'rowRegister' | 'tenancyRegister' |
// 'titleRestrictionChecker' | 'landHistoryRegister'); unknown keys fall back to
// the raw string so the badge still renders something legible.
const MODE_LABELS: Record<string, string> = {
  doc: 'Document',
  map: 'Map',
  mapEntry: 'Map + entry',
  decision: 'Decision',
  // Stakeholder modes.
  mapContact: 'Map + contact',
  contact: 'Contact entry',
  cultural: 'Cultural',
  annotate: 'Annotate register',
  // Boundary re-decompose modes (SP1). REVIEW: badge copy.
  boundaryRegister: 'Boundary register',
  rowRegister: 'Rights of way',
  tenancyRegister: 'Tenancy register',
  titleRestrictionChecker: 'Title conditions',
  landHistoryRegister: 'Land history',
  // Legal governance modes (EV-S1.4).
  legalEntityPicker: 'Entity options',
  jurisdiction: 'Jurisdiction',
  entityDecisionRecord: 'Decision record',
  tenureModel: 'Tenure model',
  decisionFramework: 'Decision framework',
  financialGovernance: 'Financial governance',
  membershipRegister: 'Membership register',
  legalAdviceGate: 'Legal advice gate',
  // Terrain modes (U-S2.1).
  mapSource: 'Map source',
  slope: 'Map analysis',
  elevation: 'Map analysis',
  landform: 'Landform inventory',
  erosion: 'Risk survey',
  // Climate modes (U-S2.2).
  rainfall: 'Climate data',
  temperature: 'Climate data',
  wind: 'Map',
  solar: 'Map',
  fire: 'Risk survey',
  microclimate: 'Field survey',
  // Ecology modes (U-S2.3).
  vegetation: 'Vegetation survey',
  species: 'Species survey',
  corridors: 'Map',
  connectivity: 'Assessment',
  waterHabitat: 'Map',
  // Landscape & vectors modes (EV-S2.7).
  landUse: 'Map',
  sprayRisk: 'Risk survey',
  planning: 'Assessment',
  community: 'Contact entry',
  disputes: 'Document',
  catchment: 'Risk survey',
  // Carrying capacity modes (EV-S2.x). Resource ceilings + synthesis + gate.
  water: 'Water demand',
  food: 'Food production',
  waste: 'Waste & nutrients',
  energy: 'Energy systems',
  space: 'Site space',
  synthesis: 'Capacity synthesis',
  gate: 'Capacity gate',
  // Forage survey modes (SILV-S3.20).
  zones: 'Zone register',
  seasonal: 'Seasonal grid',
  capacity: 'Capacity calc',
  constraints: 'Constraint survey',
  toxic: 'Toxic-plant survey',
  // Grazing system design modes (SILV-S4.20).
  grazingMethod: 'Grazing method',
  paddockLayout: 'Paddock layout',
  grazeRest: 'Graze/rest targets',
  treeProtection: 'Tree protection',
  contingency: 'Feed-gap contingency',
  stockingDensity: 'Stocking density',
  // Livestock enterprise intent modes (SILV-S1.20). The component's generic
  // mode keys are namespaced "li-" by workbenchAffordances to avoid colliding
  // with the species / capacity labels above (forage / carrying-capacity own
  // those). 5 modes c1..c5.
  'li-rationale': 'Integration rationale',
  'li-species': 'Candidate species',
  'li-relationship': 'Enterprise relationship',
  'li-capacity': 'Operator capacity',
  'li-compat': 'Compatibility review',
  // Conflict-resolution & community-agreement framework modes (EV-S1.x).
  decisionProcess: 'Decision model',
  disputePathway: 'Dispute pathway',
  communityAgreements: 'Agreements',
  exitProcess: 'Exit process',
  dissolution: 'Dissolution',
  reviewCadence: 'Review cadence',
  signOff: 'Sign-off gate',
};

// Raw mode key -> badge icon. Covers the mixed BoundaryCaptureLegacy modes (the
// live boundary surface). Modes with no entry render a text-only badge
// (unchanged), so stakeholder / legal-governance badges are unaffected.
const MODE_ICONS: Record<string, typeof Check> = {
  doc: FileText,
  map: MapIcon,
  mapEntry: MapPin,
  decision: Scale,
};

export default function DecisionList({
  objective,
  completedItemIds,
  selectedItemId,
  onSelectItem,
  modeFor,
  showGroups = false,
}: DecisionListProps): JSX.Element {
  const completed = new Set(completedItemIds);
  const items = objective.checklist;
  const total = items.length;
  const doneCount = items.filter((i) => completed.has(i.id)).length;

  return (
    <div className={css.root}>
      {/* ---------- Center header ---------- */}
      <div className={css.ch}>
        <div className={css.chEyebrow}>{ACT_COPY.decisionList.activeDecision}</div>
        <div className={css.chTitle}>{objective.title}</div>
        {objective.focusedQuestion ? (
          <div className={css.chQ}>{objective.focusedQuestion}</div>
        ) : null}
      </div>

      {/* ---------- Decisions label + count ---------- */}
      <div className={css.decLabel}>
        <span>{ACT_COPY.decisionList.yourDecisions}</span>
        <span className={css.decCount}>{decisionCount(doneCount, total)}</span>
      </div>

      {/* ---------- Decision rows ---------- */}
      <div className={css.rows}>
        {(() => {
          // Build an itemId -> group-label map only when grouping is requested
          // and the objective carries groups; iterate items in checklist order
          // (the catalogue guarantees a full mutually-exclusive partition) and
          // emit a divider before the first row of each group.
          const groupLabelById = new Map<string, string>();
          if (showGroups) {
            for (const g of objective.decisionGroups) {
              for (const id of g.itemIds) groupLabelById.set(id, g.label);
            }
          }
          let lastGroup: string | null = null;
          return items.map((item) => {
            const complete = completed.has(item.id);
            const selected = item.id === selectedItemId;
            const feedNames = item.feedsInto.map(
              (targetId) => findObjectiveGlobally(targetId)?.title ?? targetId,
            );
            const rawMode = modeFor ? modeFor(item.id) : null;
            const modeLabel = rawMode ? (MODE_LABELS[rawMode] ?? rawMode) : null;
            const ModeIcon = rawMode ? MODE_ICONS[rawMode] : undefined;
            const groupLabel = showGroups
              ? (groupLabelById.get(item.id) ?? null)
              : null;
            const showDivider = groupLabel !== null && groupLabel !== lastGroup;
            if (groupLabel !== null) lastGroup = groupLabel;
            return (
              <Fragment key={item.id}>
                {showDivider ? (
                  <div className={css.dGroup} data-testid="decision-group">
                    {groupLabel}
                  </div>
                ) : null}
                <div
                  className={css.ditem}
                  data-testid="decision-item"
                  data-item-id={item.id}
                  data-complete={complete ? 'true' : 'false'}
                  data-selected={selected ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => onSelectItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectItem(item.id);
                    }
                  }}
                >
                  <span
                    className={css.dCirc}
                    data-complete={complete ? 'true' : 'false'}
                    aria-hidden="true"
                  >
                    {complete ? <Check size={11} /> : null}
                  </span>
                  <div className={css.dBody}>
                    <div className={css.dTxt}>
                      {item.label}
                      {item.optional ? (
                        <span className={css.dOptBadge}>{ACT_COPY.decisionList.optional}</span>
                      ) : null}
                      {modeLabel ? (
                        <span
                          className={css.dModeBadge}
                          data-testid={`mode-badge-${item.id}`}
                        >
                          {ModeIcon ? (
                            <ModeIcon
                              size={11}
                              className={css.dModeBadgeIcon}
                            />
                          ) : null}
                          {modeLabel}
                        </span>
                      ) : null}
                    </div>
                    {item.feedHint ? (
                      <div className={css.dFeed}>
                        <ArrowRight size={11} className={css.dFeedIcon} />
                        <span>{item.feedHint}</span>
                      </div>
                    ) : feedNames.length > 0 ? (
                      <div className={css.dFeed}>
                        <ArrowRight size={11} className={css.dFeedIcon} />
                        <span>{feedsFallback(feedNames)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Fragment>
            );
          });
        })()}
      </div>

      {/* ---------- Completion gate ---------- */}
      {objective.completionGate ? (
        <div className={css.cgate}>
          <div className={css.cgateLbl}>{ACT_COPY.decisionList.completionGate}</div>
          <div className={css.cgateTxt}>{objective.completionGate}</div>
        </div>
      ) : null}
    </div>
  );
}
