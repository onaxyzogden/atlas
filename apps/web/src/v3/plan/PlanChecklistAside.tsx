/**
 * PlanChecklistAside — right guidance rail for the Plan stage.
 *
 * 8 module guidance cards grounded in permaculture design methodology.
 * Mirrors ObserveChecklistAside: inactive cards select the module,
 * active card toggles the slide-up. Inactive cards fade when one is active.
 */

import type { PlanModule } from './types.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL } from './types.js';
import css from './PlanChecklistAside.module.css';

interface PlanModuleGuidance {
  why: string;
  how: string[];
}

const PLAN_MODULE_GUIDANCE: Record<PlanModule, PlanModuleGuidance> = {
  'dynamic-layering': {
    why: 'Mapping permanence scales first — from earthworks and buildings down to annual crops — ensures the most energy-intensive decisions are made before ephemeral ones (Holmgren P11: Use edges and value the marginal).',
    how: [
      'Toggle zone and sector overlays to confirm map layers are live.',
      'Open Permanence Scales and categorise each element by its lifespan.',
      'Sequence design decisions from most permanent to least permanent.',
    ],
  },
  'water-management': {
    why: 'Catch and store energy (Holmgren P2) begins with water. Every drop harvested on-site multiplies fertility, moderates microclimate, and reduces flood risk.',
    how: [
      'Calculate runoff from roof and slope areas before placing swales.',
      'Place swales on keyline or contour using the Swale / Drain tool.',
      'Locate storage tanks and ponds below the highest reliable runoff source.',
    ],
  },
  'zone-circulation': {
    why: 'Zones radiate outward from the centre of use. Circulation routes follow zone boundaries to minimise labour and erosion (OSU PDC, Week 3: Zones & Sectors).',
    how: [
      'Draw zone boundaries using the Zone Level Layer.',
      'Overlay path frequency data — high-traffic paths pave themselves.',
      'Re-route paths along ridges or contours to eliminate erosion.',
    ],
  },
  'plant-systems': {
    why: 'Produce no waste (Holmgren P6): multi-storey polycultures close nutrient cycles and maximise photosynthesis per square metre across all vertical layers.',
    how: [
      'Build at least one guild for each zone before selecting species.',
      'Use the Canopy Simulator to check solar access between layers.',
      'Plant the highest-permanence woody plants first.',
    ],
  },
  'soil-fertility': {
    why: 'Use and value renewable resources (Holmgren P5): soil biology is the primary fertility engine. Every waste stream on-site is a soil amendment waiting to be unlocked.',
    how: [
      'Map all organic waste streams and match them to a fertility pathway.',
      'Place composting and processing areas within Zone 1–2 for ease of management.',
      'Design soil-building sequences that precede annual cropping by at least one season.',
    ],
  },
  'cross-section-solar': {
    why: 'The vertical transect reveals competition for light between layers and checks solar access for passive heating, solar panels, and photosynthesis (Mollison, Designer\'s Manual ch.4).',
    how: [
      'Draw a cross-section along the primary sun-facing slope.',
      'Enable the Solar Overlay to confirm winter sun angles are unobstructed.',
      'Adjust canopy heights in the Plant Systems module to resolve shading conflicts.',
    ],
  },
  'phasing-budgeting': {
    why: 'Design from patterns to details (Holmgren P7): phasing matches implementation scale to available labour, capital, and ecological readiness — avoiding overwhelm.',
    how: [
      'Sequence earthworks and water systems before planting phases.',
      'Assign seasonal task windows to match climate rhythms.',
      'Use the Labor & Budget rollup to stress-test each phase against capacity.',
    ],
  },
  'principle-verification': {
    why: 'Apply self-regulation and accept feedback (Holmgren P4): checking the design against all 12 Holmgren principles catches blind spots before implementation begins.',
    how: [
      'Work through the Holmgren checklist with the full design in front of you.',
      'Flag any principle scoring less than 3 for a design review.',
      'Document the rationale for each score as a project record.',
    ],
  },
};

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (module: PlanModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function PlanChecklistAside({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  return (
    <div
      className={css.checklistBox}
      data-has-active={activeModule !== null ? 'true' : 'false'}
    >
      {PLAN_MODULES.map((mod) => {
        const isActive = activeModule === mod;
        const guidance = PLAN_MODULE_GUIDANCE[mod];

        const handleClick = () => {
          if (isActive) {
            if (slideUpOpen) onCloseSlideUp();
            else onOpenSlideUp();
          } else {
            onSelectModule(mod);
          }
        };

        const handleKey = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        };

        const title = isActive
          ? slideUpOpen
            ? `Close ${PLAN_MODULE_LABEL[mod]} details`
            : `Open ${PLAN_MODULE_LABEL[mod]} details`
          : `Switch to ${PLAN_MODULE_LABEL[mod]}`;

        return (
          <section
            key={mod}
            className={`${css.group} ${isActive ? css.groupActive : ''}`}
            data-module={mod}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            title={title}
            onClick={handleClick}
            onKeyDown={handleKey}
          >
            <header className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>{PLAN_MODULE_LABEL[mod]}</span>
            </header>
            <p className={css.why}>{guidance.why}</p>
            <div className={css.howBlock}>
              <span className={css.blockLabel}>How</span>
              <ul className={css.howList}>
                {guidance.how.map((step) => (
                  <li key={step} className={css.howItem}>{step}</li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
