/**
 * ObserveChecklistAside — right-rail Permaculture-Scholar guidance for Observe.
 *
 * Replaces the legacy static checklist with module-aware WHY/HOW/Pitfall cards
 * grounded in a 2026-05-06 Permaculture Scholar dialogue (Holmgren P1–P7,
 * Mollison Designer's Manual ch.2, OSU PDC). Cards delegate to the shared
 * `<GuidanceCard>`; this file owns the Observe-specific guidance copy and the
 * per-module dot palette.
 *
 * Source: notebook 5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b, conversation
 * 48a34396-5525-4a57-9884-108d93b1872f, turn 1.
 */

import { useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useObserveHowChecksStore } from '../../../store/observeHowChecksStore.js';
import { useObjectiveSummaryStore } from '../../../store/objectiveSummaryStore.js';
import { useAutoScrollToActiveModule } from '../../_shared/hooks/useAutoScrollToActiveModule.js';
import { GuidanceCard } from '../../_shared/components/GuidanceCard.js';
import { progressFromChecks } from '../../_shared/objectiveWorkspace/objectiveStatus.js';
import {
  BE_CATEGORY_GUIDANCE,
  BE_CATEGORY_LABEL,
  BE_TOOL_GROUPS,
} from '../../_shared/builtEnvironmentTools.js';
import type { BuiltEnvironmentCategory } from '@ogden/shared';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import { MODULE_GUIDANCE, OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import { BE_CATEGORY_TO_OBSERVE_MODULE } from '../observeSectionMap.js';
import css from './ObserveChecklistAside.module.css';

/**
 * Stable empty-array reference for the zustand selector. DO NOT inline `?? []`
 * inside the selector — zustand uses `Object.is` for change detection and a
 * fresh `[]` literal each render produces an infinite re-render loop.
 */
const EMPTY_CHECKS: readonly number[] = [];

interface ObserveChecklistAsideProps {
  activeModule: ObserveModule | null;
  /**
   * The reconciled picked-section id (owned by `ObserveLayout`, shared with
   * the main rail). Non-null → exactly that card lights; null → fall back to
   * whole-family module-equality highlight.
   */
  effectiveSectionId: string | null;
  /** Section selection — narrows / toggles the cross-rail highlight. */
  onSelectSection: (module: ObserveModule, sectionId: string) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function ObserveGuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectSection,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: ObserveModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectSection: (module: ObserveModule, sectionId: string) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const checkedList = useObserveHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = useObserveHowChecksStore((s) => s.toggle);

  const summaryText = useObjectiveSummaryStore((s) =>
    projectId ? s.getSummary('observe', projectId, module) : '',
  );
  const setSummary = useObjectiveSummaryStore((s) => s.setSummary);

  const guidance = MODULE_GUIDANCE[module];
  const progress = progressFromChecks(checkedList, guidance.how.length);

  return (
    <GuidanceCard
      moduleKey={module}
      label={OBSERVE_MODULE_LABEL[module]}
      dotColor={OBSERVE_MODULE_DOT[module]}
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
          projectId && setSummary('observe', projectId, module, text),
        disabled: !projectId,
      }}
    />
  );
}

export default function ObserveChecklistAside({
  activeModule,
  effectiveSectionId,
  onSelectSection,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: ObserveChecklistAsideProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const navigate = useNavigate();

  const asideRef = useRef<HTMLElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  // 2026-05-24 — Goal 2 (Stage Compass focus): the rail follows the compass's
  // single-objective focus. With no objective selected, show a quiet prompt
  // back to the compass instead of the full card menu.
  if (activeModule === null) {
    return (
      <aside
        ref={asideRef}
        className={css.checklistBox}
        data-has-active={false}
        aria-label="Observe guidance"
      >
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below, or open the Stage Compass to
            choose your next objective.
          </p>
          {projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/compass',
                  params: { projectId },
                })
              }
            >
              Open Stage Compass
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Focus mode: render ONLY the active objective's card(s). Built Environment
  // is one objective surfaced as its per-category cards; every other module is
  // a single guidance card. Context cards (ReadyCue, PlacedFeatures) are
  // intentionally omitted so the rail mirrors the compass's single focus.
  const showBuiltEnvironment = activeModule === 'built-environment';

  return (
    <aside
      ref={asideRef}
      className={css.checklistBox}
      data-has-active
      aria-label="Observe guidance"
    >
      {!showBuiltEnvironment &&
        OBSERVE_MODULES.map((mod) => {
          // Render only the active module's card. `activeModule` is already
          // narrowed to exclude `built-environment` here (handled by the
          // branch below), so a single equality check yields exactly one card.
          if (mod !== activeModule) return null;
          const active =
            effectiveSectionId !== null
              ? effectiveSectionId === mod
              : mod === activeModule;
          return (
            <ObserveGuidanceCard
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
      {showBuiltEnvironment &&
        BE_TOOL_GROUPS.map((group) => {
          // 2026-05-14 — Vegetation BE category suppressed in Observe to
          // match the rail; mature trees / shrubs live under the
          // `earth-water-ecology` module guidance instead.
          if (group.category === 'vegetation') return null;
          // 2026-05-14 — Earthworks BE category dropped; Berm / Raised bed /
          // Terrace surface inside EWE / Amenities sections. No standalone
          // guidance card.
          if (group.category === 'earthworks') return null;
          const routed = BE_CATEGORY_TO_OBSERVE_MODULE[group.category];
          // Only categories that belong to the active Built Environment
          // objective render here (vegetation/earthworks already skipped).
          if (routed !== activeModule) return null;
          const guidance = BE_CATEGORY_GUIDANCE[group.category];
          const sectionId = `be-${group.category}`;
          const active =
            effectiveSectionId !== null
              ? effectiveSectionId === sectionId
              : routed === activeModule;
          return (
            <GuidanceCard
              key={`be-${group.category}`}
              moduleKey={`be-${group.category}` as `be-${BuiltEnvironmentCategory}`}
              label={BE_CATEGORY_LABEL[group.category]}
              dotColor={OBSERVE_MODULE_DOT[routed]}
              active={active}
              slideUpOpen={slideUpOpen}
              guidance={guidance}
              checkedList={EMPTY_CHECKS}
              onToggle={() => {
                /* category cards don't persist how-checks — they share the
                 * routed module's slot. checksDisabled flag below suppresses
                 * the UI affordance entirely. */
              }}
              onSelect={() => onSelectSection(routed, sectionId)}
              onOpenSlideUp={onOpenSlideUp}
              onCloseSlideUp={onCloseSlideUp}
              checksDisabled
            />
          );
        })}
    </aside>
  );
}
