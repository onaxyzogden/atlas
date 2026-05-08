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
    why: 'Yeomans\' nine ranks decide order: Climate → Landform → Water → Access → Structures → Subsystems → Soil → Vegetation → Fauna. Per Permaculture Scholar (2026-05-07): collapsing Access + Structures is a Keyline violation; visualising ordering and warning when prerequisites are skipped is what the module must do (Mollison ch.5; Holmgren P8 Integrate rather than segregate).',
    how: [
      'Open Permanence scales for the rank-by-rank rollup of element counts.',
      'Open Permanence ladder to see proportional bars + any ordering warnings.',
      'Resolve violations top-down: design the missing higher-rank layer before adding more elements below it.',
    ],
  },
  'water-management': {
    why: 'Water design is a directed graph: catchments shed → storage retains → swales spread → sinks absorb. Per Permaculture Scholar (2026-05-07): every node must declare an overflow target so excess flows along the topographic slope rather than disappearing off-site (Mollison, Designers\' Manual ch.7; Holmgren P2: Catch and store energy).',
    how: [
      'List catchments first — roofs, paved areas, pasture — with surface coefficients.',
      'Add storage and swale nodes; pick an overflow target for every one.',
      'Open Network & balance to see total yield, retained volume, and orphans.',
    ],
  },
  'zone-circulation': {
    why: 'Zones are a frequency-of-visit ladder (Z0 home → Z5 wilderness), not land-use categories. Per Permaculture Scholar (2026-05-07): a steward must be able to *see* whether daily / weekly paths actually intersect their high-maintenance Z1 / Z2 elements (Mollison, Designers\' Manual; Yeomans Scale of Permanence — subdivision and livestock come later).',
    how: [
      'Tag each drawn zone with its Z-level in the Zone level layer tab.',
      'Tag each drawn path with daily / weekly / occasional / rare in the Path frequency tab.',
      'Open Overview & validation to verify high-frequency paths reach Z1 / Z2.',
    ],
  },
  livestock: {
    why: 'Subdivision and livestock sit at rank 7 of Yeomans\' Scale of Permanence — fence lines and animal cells are designed *after* climate, landform, water, access, and structures are settled, because they consume the slowest-to-change layers (Mollison, Designers\' Manual ch.8; Yeomans, Water for Every Farm). Locking in cell shapes before water and access exist forces expensive re-fencing later.',
    how: [
      'Confirm water lines and access tracks exist on the design before drawing paddock cells.',
      'Size cells to the herd / flock\'s daily grazing demand and target rest period.',
      'Site shelters and water points so each cell has both within reasonable walking distance.',
    ],
  },
  'plant-systems': {
    why: 'Tree placement follows the patterns of water flow and access (Mollison, Designers\' Manual ch.10; OSU PDC, Tree Influence on Watershed). Pick species against site context, place guilds on the parcel where water and access already lead, then track the 30-year succession arc.',
    how: [
      'Use the site-match score to filter species against the project\'s hardiness band.',
      'Place each guild centroid on the parcel diagram in line with water flow and zones.',
      'Step through the succession scenarios (Year 1 / 5 / 10 / 20 / 30+) to check light by layer.',
    ],
  },
  'soil-fertility': {
    why: 'Per Permaculture Scholar (2026-05-07): soil fertility is the "digestive system" of the design and must be diagnosed before it is amended. OSU PDC mandates jar-test, percolation, and pH as the bare-minimum baseline; Holmgren P6 (Produce no waste) requires that every fertility unit have both a feedstock source and a destination.',
    how: [
      'Open Soil baseline first: enter jar-test %, percolation, and pH to surface limiting factors.',
      'Add fertility infrastructure (composters, hugelkultur beds, worm bins) on the designer tab.',
      'Wire waste vectors between zones, structures, crops, and fertility units.',
      'Open Closed-loop graph to verify no fertility unit is orphaned (no flows attached).',
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
