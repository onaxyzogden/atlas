/**
 * ActTierZeroWorkbench -- the inline (non-map) Tier-0 container.
 *
 * A 3-pane workbench composing three already-committed children:
 *   - LEFT  : an objectives rail (one row per objective with its decision count)
 *             + a "Completes Tier 0 / Unlocks Tier 1" next-box.
 *   - CENTER: <DecisionList> for the active objective.
 *   - RIGHT : <DecisionWorkingPanel> for the selected decision.
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
import { boundaryModeFor } from './BoundaryCapture.js';
import { stakeholderModeFor } from './StakeholderCapture.js';
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
  onSelectObjective: (objectiveId: string) => void;
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

  // c3 (Indigenous land relationships / cultural obligations) is mandatory and
  // NON-deferrable (Amanah): hide the defer button. undefined => deferrable for
  // every other item, including the other stakeholder items.
  const deferrable = item.id === 's1-stakeholders-c3' ? false : undefined;

  const feedsLabel = item.feedsInto.length
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
  onSelectObjective,
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

  // Boundary objective drives the center-list mode badges + the static
  // map-activation strip. Neither renders for any other objective (e.g. vision).
  const isBoundaryObjective = activeObjective.id === 's1-boundaries';

  // Stakeholder objective drives the center-list mode badges + two strips above
  // the list (per the operator mockup olos_stakeholders_mixed_surface.html):
  // a static map-strip ("2 overlays active on map") and a LIVE reg-strip showing
  // the shared register count. Neither renders for any other objective.
  const isStakeholderObjective = activeObjective.id === 's1-stakeholders';

  const selectedItem =
    activeObjective.checklist.find((i) => i.id === selectedItemId) ?? null;
  const target = selectedItem ? buildDecisionTarget(selectedItem) : null;

  const total = objectives.length;
  const remaining = objectives.filter((o) => {
    const done = (progressByObjective[o.id] ?? []).length;
    return done < o.checklist.length;
  }).length;

  return (
    <div className={css.root}>
      {/* ---------- LEFT: objectives rail ---------- */}
      <aside className={css.lrail}>
        <div className={css.railLbl}>Objectives</div>
        {objectives.map((o) => {
          const done = (progressByObjective[o.id] ?? []).length;
          const objTotal = o.checklist.length;
          const isActive = o.id === activeObjective.id;
          const isDone = objTotal > 0 && done === objTotal;
          return (
            <div
              key={o.id}
              className={css.objItem}
              data-objective-row=""
              data-objective-id={o.id}
              data-active={isActive ? 'true' : 'false'}
              data-done={isDone ? 'true' : 'false'}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={() => onSelectObjective(o.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectObjective(o.id);
                }
              }}
            >
              <div className={css.objT}>{o.title}</div>
              <div className={css.objM}>
                {done} / {objTotal} decisions made
              </div>
            </div>
          );
        })}

        <div className={css.railDiv} />

        <div className={css.nextBox}>
          <div className={css.nextLbl}>Completes Tier 0</div>
          <div className={css.nextTxt}>
            {remaining} of {total} objectives still to decide.
          </div>
          <div className={css.nextUnlock}>Unlocks Tier 1 -- Land Reading</div>
        </div>
      </aside>

      {/* ---------- CENTER: decision list ---------- */}
      <section className={css.center}>
        {isBoundaryObjective ? (
          <div className={css.mapStrip} data-testid="boundary-map-strip">
            <Layers size={15} className={css.mapStripIcon} aria-hidden="true" />
            <span>
              2 overlays will activate on the map: Risk / Compliance, Site
              Boundary
            </span>
          </div>
        ) : null}
        {isStakeholderObjective ? (
          <>
            <div className={css.mapStrip} data-testid="stakeholder-map-strip">
              <Layers
                size={15}
                className={css.mapStripIcon}
                aria-hidden="true"
              />
              <span>2 overlays active on map</span>
            </div>
            <div className={css.regStrip} data-testid="stakeholder-reg-strip">
              <Users size={14} className={css.regStripIcon} aria-hidden="true" />
              <span
                className={css.regStripCount}
                data-testid="stakeholder-reg-count"
              >
                {stakeholderCount}
              </span>
              <span className={css.regStripLabel}>stakeholders in register</span>
              <span className={css.regStripNote}>
                Items 1-4 build the register - Items 5-6 annotate it
              </span>
            </div>
          </>
        ) : null}
        <DecisionList
          objective={activeObjective}
          completedItemIds={completedForActive}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          modeFor={
            isBoundaryObjective
              ? (itemId) =>
                  itemId.startsWith('s1-boundaries-')
                    ? boundaryModeFor(itemId)
                    : null
              : isStakeholderObjective
                ? (itemId) =>
                    itemId.startsWith('s1-stakeholders-')
                      ? stakeholderModeFor(itemId)
                      : null
                : undefined
          }
        />
      </section>

      {/* ---------- RIGHT: working panel ---------- */}
      <section className={css.right}>
        <DecisionWorkingPanel
          decision={target}
          projectId={projectId}
          resolveOptions={resolveOptions}
          successCriteriaOptions={scOptions}
          labourSkillSuggestions={labourSkills}
          visionClassifySuggestions={vcSuggestions}
          initialValue={selectedItem ? (formValues[selectedItem.id] ?? {}) : {}}
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
