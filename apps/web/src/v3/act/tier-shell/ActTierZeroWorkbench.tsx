/**
 * ActTierZeroWorkbench -- the inline (non-map) Tier-0 container.
 *
 * A 2-pane canvas:
 *   - LEFT  : <DecisionList> for the active objective (css.left).
 *   - RIGHT : <DecisionWorkingPanel> for the selected decision (css.right).
 *
 * The objectives rail has been removed from this component; it is provided by
 * the parent (ActTierShell) via StageShell's leftRail slot.
 *
 * It owns ONLY the active-decision selection state (re-seeded whenever the
 * active objective changes) and the pure item->DecisionPanelTarget derivation.
 * All store reads/writes are lifted to the parent (PB7 ActTierShell wires them);
 * option resolution is pure and done here from the type-id props.
 *
 * ASCII-only: every glyph is a lucide icon rendered by a child; design tokens
 * are project var()s with literal fallbacks (see ActTierZeroWorkbench.module.css).
 */

import { useEffect, useMemo, useState } from 'react';
import { Layers, Users } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanDecisionChecklistItem,
  ProjectTypeId,
} from '@ogden/shared';
import {
  resolveFieldOptions,
  resolveSuccessCriteriaOptions,
  resolveLabourSkills,
  resolveVisionClassifyOptions,
} from '@ogden/shared';
import { findObjectiveGlobally } from '../../plan/objectiveCatalog.js';
import DecisionList from './DecisionList.js';
import DecisionWorkingPanel, {
  type DecisionPanelTarget,
} from './DecisionWorkingPanel.js';
import { ACT_TOOL_CATALOG, type FormValue } from './actToolCatalog.js';
import { workbenchAffordancesFor } from './workbenchAffordances.js';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../../../store/stakeholderRegisterStore.js';
import css from './ActTierZeroWorkbench.module.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActTierZeroWorkbenchProps {
  projectId: string;
  objectives: readonly PlanStratumObjective[];
  activeObjectiveId: string;
  primaryTypeId?: ProjectTypeId | null;
  secondaryTypeIds?: readonly ProjectTypeId[];
  /** effective per-item progress for ALL objectives (byObjective from useEffectiveChecklistProgress). */
  progressByObjective: Readonly<Record<string, readonly string[]>>;
  /** persisted reads keyed by itemId (== formId). */
  formValues: Record<string, FormValue>;
  rationales: Record<string, string>;
  deferredItems: Record<string, true>;
  onRecord: (itemId: string, value: FormValue, summary: string) => void;
  onSaveRationale: (itemId: string, text: string) => void;
  onToggleDefer: (itemId: string, deferred: boolean) => void;
}

// ---------------------------------------------------------------------------
// Pure item -> DecisionPanelTarget derivation
// ---------------------------------------------------------------------------

/**
 * Build the right-panel target for a checklist item by joining it against the
 * Act tool catalog. The matching form tool (arm.kind === 'form' &&
 * arm.formId === item.id) carries the structured `fields` + `prompt`; a
 * success-criteria item is detected via a repeatable hybrid whose optionSetId
 * is `successCriteriaByType`. Feed labels resolve target objective ids to titles.
 */
export function buildDecisionTarget(
  item: PlanDecisionChecklistItem,
): DecisionPanelTarget {
  const tool = Object.values(ACT_TOOL_CATALOG).find(
    (t) => t.arm.kind === 'form' && t.arm.formId === item.id,
  );
  const fields = tool && tool.arm.kind === 'form' ? tool.arm.fields : undefined;
  const prompt = tool && tool.arm.kind === 'form' ? tool.arm.prompt : undefined;

  const isSuccessCriteria = Boolean(
    fields?.some(
      (f) =>
        f.kind === 'repeatable' &&
        f.item.kind === 'hybrid' &&
        f.item.optionSetId === 'successCriteriaByType',
    ),
  );

  // Labour inventory is detected via the matched form tool's formId. Since the
  // tool is joined by `formId === item.id`, this is true exactly for the labour
  // decision (mirrors the existing form-tool join above).
  const isLabourInventory = Boolean(
    tool && tool.arm.kind === 'form' && tool.arm.formId === 's1-vision-labour',
  );

  // Vision-classify is detected directly by item id. Its value shape
  // { committed, aspirational } is byte-compatible with the existing form
  // tool, so the panel's isVisionClassify body-router arm (checked before the
  // generic fields/textarea fallback) takes precedence over any matched form.
  const isVisionClassify = item.id === 's1-vision-classify';

  // Boundary items are detected by id prefix; the panel's isBoundary body-router
  // arm (BoundaryCapture self-routes on itemId) takes precedence over any
  // matched generic form. False for every non-boundary id (e.g. s1-vision-*).
  const isBoundary = item.id.startsWith('s1-boundaries-');

  // Stakeholder items are detected by id prefix; the panel's isStakeholder
  // body-router arm (StakeholderCapture, store-direct) takes precedence over any
  // matched generic form. False for every non-stakeholder id.
  const isStakeholder = item.id.startsWith('s1-stakeholders-');

  // Legal-governance items detected by id prefix; the panel's isLegalGovernance
  // body-router arm (EvLegalGovernanceCapture self-routes on itemId) takes
  // precedence over any matched generic form. False for every other id.
  const isLegalGovernance = item.id.startsWith('ev-s1-legal-governance-');

  // Steward (team member capture) is a single item detected by exact id; the
  // panel's isSteward body-router arm (StewardCapture) takes precedence over any
  // matched generic form. False for every other id.
  const isSteward = item.id === 's1-vision-steward';

  // Purpose (read-only project-type grid + optional elaboration) is a single
  // item detected by exact id; the panel's isPurpose body-router arm
  // (PurposeCapture) takes precedence over the textarea fallback. The primary
  // type is sourced read-only from the project store -- not re-asked here.
  const isPurpose = item.id === 's1-vision-c1';

  // Constraints (non-negotiables + hard constraints register) is a single item
  // detected by exact id; the panel's isConstraints body-router arm
  // (ConstraintsCapture) takes precedence over the textarea fallback.
  const isConstraints = item.id === 's1-vision-constraints';

  // Assumptions (assumptions + known unknowns two-section register) is a single
  // item detected by exact id; the panel's isAssumptions body-router arm
  // (AssumptionsCapture) takes precedence over the textarea fallback.
  const isAssumptions = item.id === 's1-vision-assumptions';

  // Provision-balance is a 6-item objective (ev-s1-provision-balance-c1..-c6);
  // detected by id prefix. The panel's isProvisionBalance body-router arm
  // (ProvisionBalanceCapture self-routes on itemId via provisionBalanceModeFor)
  // takes precedence over any matched generic form. False for every other id.
  const isProvisionBalance = item.id.startsWith('ev-s1-provision-balance-');

  // Terrain is a 5-item objective (s2-terrain-c1..-c5); detected by id prefix.
  // The panel's isTerrain body-router arm (TerrainCapture self-routes on itemId
  // via terrainModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isTerrain = item.id.startsWith('s2-terrain-');

  // Climate is a 6-item objective (s2-climate-c1..-c6); detected by id prefix.
  // The panel's isClimate body-router arm (ClimateCapture self-routes on itemId
  // via climateModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isClimate = item.id.startsWith('s2-climate-');

  // Ecology is a 5-item objective (s2-ecology-c1..-c5); detected by id prefix.
  // The panel's isEcology body-router arm (EcologyCapture self-routes on itemId
  // via ecologyModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isEcology = item.id.startsWith('s2-ecology-');

  // The steward item carries a custom defer label (it stays deferrable -- only
  // Landscape context is a 6-item ecovillage objective
  // (ev-s2-landscape-vectors-c1..-c6); detected by id prefix. The panel's
  // isLandscape body-router arm (LandscapeContextCapture self-routes on itemId
  // via landscapeModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isLandscape = item.id.startsWith('ev-s2-landscape-vectors-');

  // Carrying capacity is a 7-item ecovillage objective
  // (ev-s2-carrying-capacity-c1..-c7); detected by id prefix. The panel's
  // isCarryingCapacity body-router arm (CarryingCapacityCapture self-routes on
  // itemId via carryingCapacityModeFor) takes precedence over any matched
  // generic form. The synthesis (c6) and gate (c7) modes read sibling FormValues
  // via the panel's siblingValues prop. False for every other id.
  const isCarryingCapacity = item.id.startsWith('ev-s2-carrying-capacity-');

  // s1-stakeholders-c3 sets deferrable:false). undefined => default defer copy.
  const deferLabel =
    item.id === 's1-vision-steward'
      ? 'Add team members later in settings'
      : undefined;

  // c3 (Indigenous land relationships / cultural obligations) is mandatory and
  // NON-deferrable (Amanah): hide the defer button. undefined => deferrable for
  // every other item, including the other stakeholder items.
  const deferrable = item.id === 's1-stakeholders-c3' ? false : undefined;

  // An item's explicit feedNote (free-text in-panel callout, e.g. the boundary
  // mixed-mode surface) takes precedence over the feedsInto-derived label
  // (downstream objective titles). Most items carry neither -> null.
  const feedsLabel = item.feedNote
    ? item.feedNote
    : item.feedsInto.length
      ? 'Feeds ' +
        item.feedsInto
          .map((id) => findObjectiveGlobally(id)?.title ?? id)
          .join(', ')
      : null;

  return {
    itemId: item.id,
    label: item.label,
    optional: item.optional,
    prompt,
    fields,
    feedsLabel,
    isSuccessCriteria,
    isLabourInventory,
    isVisionClassify,
    isBoundary,
    isStakeholder,
    isLegalGovernance,
    isSteward,
    isPurpose,
    isConstraints,
    isAssumptions,
    isProvisionBalance,
    isTerrain,
    isClimate,
    isEcology,
    isLandscape,
    isCarryingCapacity,
    deferLabel,
    deferrable,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActTierZeroWorkbench({
  projectId,
  objectives,
  activeObjectiveId,
  primaryTypeId,
  secondaryTypeIds,
  progressByObjective,
  formValues,
  rationales,
  deferredItems,
  onRecord,
  onSaveRationale,
  onToggleDefer,
}: ActTierZeroWorkbenchProps): JSX.Element {
  const activeObjective =
    objectives.find((o) => o.id === activeObjectiveId) ?? objectives[0];

  // Selection state: default to the active objective's first checklist item id.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () => activeObjective?.checklist[0]?.id ?? null,
  );

  // Re-seed selection whenever the active objective changes so switching
  // objectives resets to that objective's first item.
  useEffect(() => {
    setSelectedItemId(activeObjective?.checklist[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObjectiveId]);

  // Pure option resolution from the project type ids (null -> undefined). The
  // resolvers are pure and cheap; we intentionally do NOT useMemo them because
  // `secondaryTypeIds ?? []` mints a fresh array each render, which would defeat
  // memo stabilization anyway -- computing inline keeps code and intent aligned.
  const primary = primaryTypeId ?? undefined;
  const secondaries = secondaryTypeIds ?? [];
  const scOptions = resolveSuccessCriteriaOptions(primary, secondaries);
  const labourSkills = resolveLabourSkills(primary, secondaries);
  const vcSuggestions = resolveVisionClassifyOptions(primary, secondaries);
  const resolveOptions = (optionSetId: string) =>
    resolveFieldOptions(optionSetId, primary, secondaries);

  // Reactive stakeholder register count for the s1-stakeholders reg-strip.
  // MUST select the STABLE raw byProject object (frozen EMPTY fallback) and
  // derive the count via useMemo -- a fresh-array selector (listForProject)
  // would mint a new array each render and trip the Zustand v5 stable-snapshot
  // infinite-render trap. The hook stays unconditional (above the early return).
  const stakeholdersById = useStakeholderRegisterStore(
    (s) => s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID,
  );
  const stakeholderCount = useMemo(
    () => Object.values(stakeholdersById).length,
    [stakeholdersById],
  );

  // ---------- Empty container ----------
  if (!activeObjective) {
    return <div className={css.root} data-empty="true" />;
  }

  const completedForActive = progressByObjective[activeObjective.id] ?? [];

  // Per-objective affordances (map strips, live register strip, decision-group
  // headers, center-list mode mapper) are resolved from a data-driven descriptor
  // keyed by objective id. Any objective without an entry routes to the EMPTY
  // shape -- no strips, no groups, no modeFor -- so S2-S7 objectives mount the
  // generic 2-pane workbench with no special-casing here.
  const affordances = workbenchAffordancesFor(activeObjective.id);

  // The live count for a register strip; only the 'stakeholder' kind sources the
  // shared stakeholder register count (0 otherwise).
  const registerCount =
    affordances.registerStrip?.registerKind === 'stakeholder'
      ? stakeholderCount
      : 0;

  const selectedItem =
    activeObjective.checklist.find((i) => i.id === selectedItemId) ?? null;
  const target = selectedItem ? buildDecisionTarget(selectedItem) : null;

  return (
    <div className={css.root}>
      {/* ---------- LEFT pane: decision list ---------- */}
      <section className={css.left}>
        {affordances.mapStrips.map((strip) => (
          <div
            key={strip.testId}
            className={css.mapStrip}
            data-testid={strip.testId}
          >
            <Layers size={15} className={css.mapStripIcon} aria-hidden="true" />
            <span>{strip.text}</span>
          </div>
        ))}
        {affordances.registerStrip ? (
          <div
            className={css.regStrip}
            data-testid={affordances.registerStrip.testId}
          >
            <Users size={14} className={css.regStripIcon} aria-hidden="true" />
            <span
              className={css.regStripCount}
              data-testid={affordances.registerStrip.countTestId}
            >
              {registerCount}
            </span>
            <span className={css.regStripLabel}>
              {affordances.registerStrip.label}
            </span>
            <span className={css.regStripNote}>
              {affordances.registerStrip.note}
            </span>
          </div>
        ) : null}
        <DecisionList
          objective={activeObjective}
          completedItemIds={completedForActive}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          showGroups={affordances.showGroups}
          modeFor={affordances.modeFor ?? undefined}
        />
      </section>

      {/* ---------- RIGHT pane: capture form ---------- */}
      <section className={css.right}>
        <DecisionWorkingPanel
          decision={target}
          projectId={projectId}
          resolveOptions={resolveOptions}
          successCriteriaOptions={scOptions}
          labourSkillSuggestions={labourSkills}
          visionClassifySuggestions={vcSuggestions}
          initialValue={selectedItem ? (formValues[selectedItem.id] ?? {}) : {}}
          siblingValues={formValues}
          initialRationale={
            selectedItem ? (rationales[selectedItem.id] ?? '') : ''
          }
          deferred={selectedItem ? Boolean(deferredItems[selectedItem.id]) : false}
          recorded={
            selectedItem ? completedForActive.includes(selectedItem.id) : false
          }
          onRecord={(value, summary) => {
            if (selectedItem) onRecord(selectedItem.id, value, summary);
          }}
          onSaveRationale={(text) => {
            if (selectedItem) onSaveRationale(selectedItem.id, text);
          }}
          onToggleDefer={(deferred) => {
            if (selectedItem) onToggleDefer(selectedItem.id, deferred);
          }}
        />
      </section>
    </div>
  );
}
