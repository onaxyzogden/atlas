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

import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveChecklistAside.module.css';

interface ObserveChecklistAsideProps {
  activeModule: ObserveModule | null;
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
}: {
  module: ObserveModule;
  active: boolean;
}) {
  const guidance = MODULE_GUIDANCE[module];
  return (
    <section
      className={`${css.group} ${active ? css.groupActive : ''}`}
      data-module={module}
    >
      <header className={css.groupHeader}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.groupLabel}>{OBSERVE_MODULE_LABEL[module]}</span>
      </header>
      <p className={css.why}>{guidance.why}</p>
      <div className={css.howBlock}>
        <span className={css.blockLabel}>How</span>
        <ol className={css.howList}>
          {guidance.how.map((step, i) => (
            <li key={i} className={css.howItem}>
              {step}
            </li>
          ))}
        </ol>
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
}: ObserveChecklistAsideProps) {
  if (activeModule) {
    return (
      <aside className={css.checklistBox} aria-label="Observe guidance">
        <GuidanceCard module={activeModule} active />
      </aside>
    );
  }
  return (
    <aside className={css.checklistBox} aria-label="Observe guidance">
      {OBSERVE_MODULES.map((mod) => (
        <GuidanceCard key={mod} module={mod} active={false} />
      ))}
    </aside>
  );
}
