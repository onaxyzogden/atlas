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
import { useAutoScrollToActiveModule } from '../../_shared/hooks/useAutoScrollToActiveModule.js';
import {
  GuidanceCard,
  type GuidanceCardData,
} from '../../_shared/components/GuidanceCard.js';
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
import css from './ObserveChecklistAside.module.css';

/**
 * 2026-05-14 — BE flatten. Mirrors `BE_CATEGORY_TO_OBSERVE_MODULE` in
 * `ObserveTools.tsx`. Kept here (instead of in `_shared/`) so the right
 * rail can be edited without touching the rail registry — but the two
 * tables must agree.
 */
const BE_CATEGORY_TO_OBSERVE_MODULE: Record<
  BuiltEnvironmentCategory,
  ObserveModule
> = {
  building: 'built-environment',
  agricultural: 'built-environment',
  utility: 'built-environment',
  infrastructure: 'built-environment',
  machinery: 'built-environment',
  amenity: 'built-environment',
  vegetation: 'earth-water-ecology',
  earthworks: 'topography',
  'zone-marker': 'sectors-zones',
};

/**
 * Stable empty-array reference for the zustand selector. DO NOT inline `?? []`
 * inside the selector — zustand uses `Object.is` for change detection and a
 * fresh `[]` literal each render produces an infinite re-render loop.
 */
const EMPTY_CHECKS: readonly number[] = [];

const MODULE_GUIDANCE: Record<ObserveModule, GuidanceCardData> = {
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
  'built-environment': {
    why: 'Existing infrastructure shapes what design moves are even possible — a buried gas line vetoes earthworks across it, a strong well sets your irrigation budget, fence lines define livestock subdivision options.',
    how: [
      'Trace buildings and outbuildings.',
      'Mark wells (with depth/flow if known) and septic systems.',
      'Sketch power lines and buried utilities; walk the fence lines.',
      'Drop gates and trace existing driveways.',
    ],
    pitfall:
      'Don’t skip "invisible" assets — buried lines and utility easements bind the design more than visible structures.',
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

/** Per-module dot palette. Mirrors the legacy `[data-module='...']` rules
 *  formerly carried by ObserveChecklistAside.module.css. */
const OBSERVE_MODULE_DOT: Record<ObserveModule, string> = {
  'human-context': '#5dd39e',
  'built-environment': '#8a8e94',
  'macroclimate-hazards': '#e6c34a',
  topography: '#8bd16a',
  'earth-water-ecology': '#5fc7d4',
  'sectors-zones': '#d68bd0',
  'swot-synthesis': '#e88aa4',
};

interface ObserveChecklistAsideProps {
  activeModule: ObserveModule | null;
  onSelectModule: (module: ObserveModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function ObserveGuidanceCard({
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
      onSelect={() => onSelectModule(module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
    />
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

  const asideRef = useRef<HTMLElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  return (
    <aside
      ref={asideRef}
      className={css.checklistBox}
      data-has-active={activeModule !== null}
      aria-label="Observe guidance"
    >
      {OBSERVE_MODULES.map((mod) => {
        // 2026-05-14 — BE flatten: parent `built-environment` guidance
        // card is replaced by 9 per-category cards rendered below.
        if (mod === 'built-environment') return null;
        return (
          <ObserveGuidanceCard
            key={mod}
            module={mod}
            active={mod === activeModule}
            projectId={projectId}
            slideUpOpen={slideUpOpen}
            onSelectModule={onSelectModule}
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
        const active = routed === activeModule;
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
            onSelect={() => onSelectModule(routed)}
            onOpenSlideUp={onOpenSlideUp}
            onCloseSlideUp={onCloseSlideUp}
            checksDisabled
          />
        );
      })}
    </aside>
  );
}
