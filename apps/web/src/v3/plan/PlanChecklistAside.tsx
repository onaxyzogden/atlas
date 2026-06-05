/**
 * PlanChecklistAside â€” right-rail Permaculture-Scholar guidance for Plan.
 *
 * 9 module guidance cards grounded in permaculture design methodology.
 * Cards delegate to the shared `<GuidanceCard>`; this file owns the Plan
 * guidance copy and the per-module dot palette. Inactive cards select the
 * module; the active card toggles the slide-up. Active card auto-scrolls
 * into view; How bullets are individually checkable with strikethrough on
 * completion (persisted via planHowChecksStore).
 *
 * 2026-05-24 â€” Stage Compass focus (mirrors Observe / Goal 2): the rail follows
 * the compass's single-objective focus. It renders ONLY the active objective's
 * card(s); with no objective selected, a quiet prompt links back to the Plan
 * Compass. The context cards (PlanProjectTypeCard, PlacedFeaturesCard) are
 * intentionally omitted in focus mode. All card-rendering code is preserved
 * (gated on the active module), not removed.
 */

import { useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { usePlanHowChecksStore } from '../../store/planHowChecksStore.js';
import { useObjectiveSummaryStore } from '../../store/objectiveSummaryStore.js';
import { useAutoScrollToActiveModule } from '../_shared/hooks/useAutoScrollToActiveModule.js';
import { GuidanceCard } from '../_shared/components/GuidanceCard.js';
import { progressFromChecks } from '../_shared/objectiveWorkspace/objectiveStatus.js';
import {
  BE_CATEGORY_GUIDANCE,
  BE_CATEGORY_LABEL,
  BE_TOOL_GROUPS,
} from '../_shared/builtEnvironmentTools.js';
import type { BuiltEnvironmentCategory } from '@ogden/shared';
import { PLAN_MODULES, PLAN_MODULE_LABEL, type PlanModule } from './types.js';
import { PLAN_MODULE_GUIDANCE } from './planModuleGuidance.js';
import { BE_CATEGORY_TO_PLAN_MODULE } from './planSectionMap.js';
// 2026-05-24 â€” Stage Compass focus: PlanProjectTypeCard + PlacedFeaturesCard
// context cards are intentionally not rendered in single-objective focus mode
// (mirrors Goal 2's strict Observe view). The components are preserved; this
// consumer simply no longer mounts them.
import { useModuleProjectTypeReferences } from './hooks/useModuleProjectTypeReferences.js';
import { PLAN_MODULE_DOT } from './data/planModulePalette.js';
import css from './PlanChecklistAside.module.css';

const EMPTY_CHECKS: readonly number[] = [];


interface Props {
  activeModule: PlanModule | null;
  /**
   * The reconciled picked-section id (owned by `PlanLayout`, shared with the
   * main rail). Non-null â†’ exactly that card lights; null â†’ fall back to
   * whole-family module-equality highlight.
   */
  effectiveSectionId: string | null;
  /** Module-only selection (kept for `PlanProjectTypeCard`). */
  onSelectModule: (module: PlanModule | null) => void;
  /** Section selection â€” narrows / toggles the cross-rail highlight. */
  onSelectSection: (module: PlanModule, sectionId: string) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function PlanGuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectSection,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: PlanModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectSection: (module: PlanModule, sectionId: string) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const checkedList = usePlanHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = usePlanHowChecksStore((s) => s.toggle);

  const summaryText = useObjectiveSummaryStore((s) =>
    projectId ? s.getSummary('plan', projectId, module) : '',
  );
  const setSummary = useObjectiveSummaryStore((s) => s.setSummary);

  const guidance = PLAN_MODULE_GUIDANCE[module];
  const progress = progressFromChecks(checkedList, guidance.how.length);

  const refSummary = useModuleProjectTypeReferences(module, projectId);
  const showChip = refSummary.openGaps > 0;
  const chipTitle = showChip
    ? `${refSummary.openGaps} of ${refSummary.referencedBy} ticked project-type item${
        refSummary.referencedBy === 1 ? '' : 's'
      } reference ${PLAN_MODULE_LABEL[module]} but the expected how-checks or map artifacts here are still missing.`
    : '';

  return (
    <GuidanceCard
      moduleKey={module}
      label={PLAN_MODULE_LABEL[module]}
      dotColor={PLAN_MODULE_DOT[module]}
      active={active}
      slideUpOpen={slideUpOpen}
      guidance={guidance}
      checkedList={checkedList}
      onToggle={(i) => projectId && toggle(projectId, module, i)}
      onSelect={() => onSelectSection(module, module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
      progress={progress}
      summary={{
        value: summaryText,
        onChange: (text) =>
          projectId && setSummary('plan', projectId, module, text),
        disabled: !projectId,
      }}
      headerExtras={
        showChip ? (
          <span
            className={css.refChip}
            title={chipTitle}
            aria-label={chipTitle}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            â†— {refSummary.openGaps} ref{refSummary.openGaps === 1 ? '' : 's'}
          </span>
        ) : null
      }
    />
  );
}

export default function PlanChecklistAside({
  activeModule,
  effectiveSectionId,
  onSelectModule,
  onSelectSection,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const navigate = useNavigate();

  const asideRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  // 2026-05-24 â€” Stage Compass focus: with no objective selected, show a quiet
  // prompt back to the Plan Compass instead of the full card menu.
  if (activeModule === null) {
    return (
      <div
        ref={asideRef}
        className={css.checklistBox}
        data-has-active="false"
      >
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below to choose your next objective.
          </p>
          {projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/plan',
                  params: { projectId },
                })
              }
            >
              Back to Plan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={asideRef}
      className={css.checklistBox}
      data-has-active="true"
    >
      {PLAN_MODULES.map((mod) => {
        // 2026-05-14 â€” BE flatten: parent `structures-subsystems` card
        // is replaced by 9 per-category cards rendered below.
        if (mod === 'built-infrastructure') return null;
        // 2026-05-24 â€” Stage Compass focus: render only the active objective's
        // card. `activeModule` is non-null here (empty state returned above).
        if (mod !== activeModule) return null;
        const active =
          effectiveSectionId !== null
            ? effectiveSectionId === mod
            : activeModule === mod;
        return (
          <PlanGuidanceCard
            key={mod}
            module={mod}
            active={active}
            projectId={projectId}
            slideUpOpen={slideUpOpen}
            onSelectSection={onSelectSection}
            onOpenSlideUp={onOpenSlideUp}
            onCloseSlideUp={onCloseSlideUp}
          />
        );
      })}
      {BE_TOOL_GROUPS.map((group) => {
        // 2026-05-14 â€” Vegetation BE kinds already surface under the
        // `plant-systems` rail/guidance section; the BE category card
        // is redundant in Plan.
        if (group.category === 'vegetation') return null;
        // 2026-05-14 â€” Earthworks BE category dropped from Plan rail;
        // Berm / Raised bed / Terrace surface inside Water Management /
        // Plant Systems / Amenities. No standalone guidance card.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_PLAN_MODULE[group.category];
        // 2026-05-24 â€” Stage Compass focus: only BE category cards belonging to
        // the active objective render (all route to structures-subsystems).
        if (routed !== activeModule) return null;
        const guidance = BE_CATEGORY_GUIDANCE[group.category];
        const sectionId = `be-${group.category}`;
        const active =
          effectiveSectionId !== null
            ? effectiveSectionId === sectionId
            : activeModule === routed;
        return (
          <GuidanceCard
            key={`be-${group.category}`}
            moduleKey={`be-${group.category}` as `be-${BuiltEnvironmentCategory}`}
            label={BE_CATEGORY_LABEL[group.category]}
            dotColor={PLAN_MODULE_DOT[routed]}
            active={active}
            slideUpOpen={slideUpOpen}
            guidance={guidance}
            checkedList={EMPTY_CHECKS}
            onToggle={() => {
              /* BE category cards share their routed module's how-checks
               * slot â€” disabling the UI affordance here keeps the parent
               * module the single source of truth. */
            }}
            onSelect={() => onSelectSection(routed, sectionId)}
            onOpenSlideUp={onOpenSlideUp}
            onCloseSlideUp={onCloseSlideUp}
            checksDisabled
          />
        );
      })}
    </div>
  );
}
