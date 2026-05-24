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
import { useParams } from '@tanstack/react-router';
import { useObserveHowChecksStore } from '../../../store/observeHowChecksStore.js';
import ObserveReadyCue from './ObserveReadyCue.js';
import { useAutoScrollToActiveModule } from '../../_shared/hooks/useAutoScrollToActiveModule.js';
import { GuidanceCard } from '../../_shared/components/GuidanceCard.js';
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
import PlacedFeaturesCard from '../../../features/shared/placedFeatures/PlacedFeaturesCard.js';
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

  return (
    <GuidanceCard
      moduleKey={module}
      label={OBSERVE_MODULE_LABEL[module]}
      dotColor={OBSERVE_MODULE_DOT[module]}
      active={active}
      slideUpOpen={slideUpOpen}
      guidance={MODULE_GUIDANCE[module]}
      checkedList={checkedList}
      onToggle={(i) => projectId && toggle(projectId, module, i)}
      onSelect={() => onSelectSection(module, module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
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

  const asideRef = useRef<HTMLElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  return (
    <aside
      ref={asideRef}
      className={css.checklistBox}
      data-has-active={activeModule !== null}
      aria-label="Observe guidance"
    >
      <ObserveReadyCue projectId={projectId} />
      <PlacedFeaturesCard stage="observe" projectId={projectId} />
      {OBSERVE_MODULES.map((mod) => {
        // 2026-05-14 — BE flatten: parent `built-environment` guidance
        // card is replaced by 9 per-category cards rendered below.
        if (mod === 'built-environment') return null;
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
      {BE_TOOL_GROUPS.map((group) => {
        // 2026-05-14 — Vegetation BE category suppressed in Observe to
        // match the rail; mature trees / shrubs live under the
        // `earth-water-ecology` module guidance instead.
        if (group.category === 'vegetation') return null;
        // 2026-05-14 — Earthworks BE category dropped; Berm / Raised bed /
        // Terrace surface inside EWE / Amenities sections. No standalone
        // guidance card.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_OBSERVE_MODULE[group.category];
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
