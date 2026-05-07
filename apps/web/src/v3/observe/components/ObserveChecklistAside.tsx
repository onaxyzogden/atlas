/**
 * ObserveChecklistAside — right-rail Permaculture-Scholar guidance for Observe.
 *
 * Replaces the legacy static checklist with module-aware WHY/HOW/Pitfall cards
 * grounded in a 2026-05-06 Permaculture Scholar dialogue (Holmgren P1–P7,
 * Mollison Designer's Manual ch.2, OSU PDC). When a module is active, only
 * its card is shown; at the Observe landing (no module), all six render in
 * a stacked accordion-style column.
 *
 * Source: notebook 5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b, conversation
 * 48a34396-5525-4a57-9884-108d93b1872f, turn 1.
 */

import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { useObserveHowChecksStore } from '../../../store/observeHowChecksStore.js';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveChecklistAside.module.css';

/**
 * Stable empty-array reference for the GuidanceCard zustand selector.
 * DO NOT inline `?? []` inside the selector — zustand uses `Object.is`
 * for change detection and a fresh `[]` literal each render produces an
 * infinite re-render loop ("Maximum update depth exceeded").
 */
const EMPTY_CHECKS: readonly number[] = [];

interface ObserveChecklistAsideProps {
  activeModule: ObserveModule | null;
  onSelectModule: (module: ObserveModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

interface ModuleGuidance {
  why: string;
  how: string[];
  pitfall: string;
}

const MODULE_GUIDANCE: Record<ObserveModule, ModuleGuidance> = {
  'human-context': {
    why: 'Observe and Interact (Holmgren P1) begins with understanding the cultural, social, and economic climate of the human residents, who are the beating heart of the system (OSU PDC, Week 1).',
    how: [
      'Pin your primary dwelling or activity hub.',
      'Trace existing access roads and daily footpaths.',
      'Pin neighbour interfaces or public borders.',
    ],
    pitfall:
      'Do not design new paths yet; only map current existing human access and interaction.',
  },
  'macroclimate-hazards': {
    why: 'Catching and storing energy (Holmgren P2) requires first identifying major local forces, like fire and flood, that must be deflected to protect the site’s vitality (OSU PDC, Sectors/Hazards).',
    how: [
      'Outline low-lying areas where frost settles.',
      'Draw polygons over flood plains, fire corridors, or steep slide zones.',
    ],
    pitfall:
      'Don’t confuse broad macro-hazards with microclimates; hazards are extreme regional forces acting upon the site from the outside.',
  },
  topography: {
    why: 'Water flows at right angles to contour, making landform the essential first step to creating a design structured around water abundance (OSU PDC, Matrix).',
    how: [
      'Pin the highest and lowest elevation points.',
      'Trace key contour lines across slopes.',
      'Draw drainage lines where water naturally collects and exits.',
    ],
    pitfall:
      'Don’t assume slopes are uniform; topography is infinitely varied, so track exact fall lines carefully.',
  },
  'earth-water-ecology': {
    why: 'Designing for water and soil fertility creates the bones and digestive system of your site, transforming raw materials into a vibrant ecology (OSU PDC, Land Physician).',
    how: [
      'Draw lines for existing streams, swales, or ponds.',
      'Pin locations of soil test pits.',
      'Outline distinct ecological patches (e.g., mature forest, disturbed pasture).',
    ],
    pitfall:
      'Don’t forget the scales of landscape permanence; map water supplies before analyzing and altering soil.',
  },
  'sectors-zones': {
    why: 'Design from Patterns to Details (Holmgren P7) dictates mapping wild sector forces coming in, and zones of human use radiating out, so the design directly responds to them (OSU PDC, Sectors & Zones).',
    how: [
      'Drag wedges from outside the property inward to show sun, wind, and wildlife paths.',
      'Draw concentric polygons around the house based on daily-to-yearly maintenance frequency.',
    ],
    pitfall:
      'Don’t confuse zones (internal human effort/maintenance) with sectors (external wild energies flowing into the site).',
  },
  'swot-synthesis': {
    why: 'Applying Self-Regulation and Accepting Feedback (Holmgren P4) requires an honest diagnosis of site conditions before prescribing a design treatment (OSU PDC, SWOT Analysis).',
    how: [
      'Tag specific site areas with Strengths (resources) or Weaknesses (degradation).',
      'Tag external borders with Opportunities (community) or Threats (pollution/development).',
    ],
    pitfall:
      'Don’t confuse internal factors (Strengths/Weaknesses on the land) with external ones (Opportunities/Threats from the outside).',
  },
};

function GuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectModule,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: ObserveModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectModule: (module: ObserveModule | null) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const guidance = MODULE_GUIDANCE[module];
  const checkedList = useObserveHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = useObserveHowChecksStore((s) => s.toggle);

  // Mirrors ObserveModuleBar.handleCardClick — inactive card navigates,
  // active card toggles the slide-up. Keeps the right rail in lock-step
  // with the bottom rail as a module selector.
  const handleCardClick = () => {
    if (active) {
      if (slideUpOpen) onCloseSlideUp();
      else onOpenSlideUp();
      return;
    }
    onSelectModule(module);
  };
  const handleKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const title = active
    ? slideUpOpen
      ? `Close ${OBSERVE_MODULE_LABEL[module]} details`
      : `Open ${OBSERVE_MODULE_LABEL[module]} details`
    : `Switch to ${OBSERVE_MODULE_LABEL[module]}`;

  return (
    <section
      className={`${css.group} ${active ? css.groupActive : ''}`}
      data-module={module}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      title={title}
      onClick={handleCardClick}
      onKeyDown={handleKey}
    >
      <header className={css.groupHeader}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.groupLabel}>{OBSERVE_MODULE_LABEL[module]}</span>
      </header>
      <p className={css.why}>{guidance.why}</p>
      <div className={css.howBlock}>
        <span className={css.blockLabel}>How</span>
        <ul className={css.howList}>
          {guidance.how.map((step, i) => {
            const checked = checkedList.includes(i);
            return (
              <li key={i} className={css.howItem}>
                {/* stopPropagation prevents a checkbox toggle from also firing
                    the section's module-select / slide-up handler. */}
                <label
                  className={`${css.howCheck} ${checked ? css.howCheckDone : ''}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!projectId}
                    onChange={() => projectId && toggle(projectId, module, i)}
                  />
                  <span className={css.howText}>{step}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={css.pitfall}>
        <span className={css.blockLabel}>Pitfall</span>
        <p className={css.pitfallText}>{guidance.pitfall}</p>
      </div>
    </section>
  );
}

export default function ObserveChecklistAside({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: ObserveChecklistAsideProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  // Mirror the left-rail (`ObserveTools`) behavior: always render all six
  // modules so the steward can see the whole pillar set; greying handles
  // the inactive state, and the active card auto-scrolls into view on
  // module change. `block: 'nearest'` no-ops when already visible.
  const asideRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!activeModule) return;
    const root = asideRef.current;
    if (!root) return;
    const section = root.querySelector<HTMLElement>(
      `[data-module="${activeModule}"]`,
    );
    if (!section) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeModule]);

  return (
    <aside
      ref={asideRef}
      className={css.checklistBox}
      data-has-active={activeModule !== null}
      aria-label="Observe guidance"
    >
      {OBSERVE_MODULES.map((mod) => (
        <GuidanceCard
          key={mod}
          module={mod}
          active={mod === activeModule}
          projectId={projectId}
          slideUpOpen={slideUpOpen}
          onSelectModule={onSelectModule}
          onOpenSlideUp={onOpenSlideUp}
          onCloseSlideUp={onCloseSlideUp}
        />
      ))}
    </aside>
  );
}
