/**
 * ActChecklistAside — right guidance rail for the Act stage.
 *
 * 5 module guidance cards grounded in execution discipline.
 * Mirrors PlanChecklistAside: inactive cards select the module,
 * active card toggles the slide-up. Inactive cards fade when one is active.
 */

import type { ActModule } from './types.js';
import { ACT_MODULES, ACT_MODULE_LABEL } from './types.js';
import css from './ActChecklistAside.module.css';

interface ActModuleGuidance {
  why: string;
  how: string[];
}

const ACT_MODULE_GUIDANCE: Record<ActModule, ActModuleGuidance> = {
  build: {
    why: 'Implementation cadence determines whether a design survives contact with the land. Sequencing earthworks, infrastructure, and pilot plots in the right order protects capital and prevents rework (Mollison, Designer\'s Manual ch.14).',
    how: [
      'Track the build schedule against the approved phasing plan, not aspirational dates.',
      'Reconcile budget vs actuals at every milestone gate before unlocking the next phase.',
      'Run pilot plots before scaling — small failures inform large decisions.',
    ],
  },
  maintain: {
    why: 'Apply self-regulation and accept feedback (Holmgren P4): maintenance discipline is what separates a designed system from an abandoned one. Routine attention compounds; neglect compounds faster.',
    how: [
      'Hold the maintenance schedule on the calendar — recurring, not reactive.',
      'Audit irrigation lines, valves, and reservoirs before each dry window.',
      'Close the loop on every waste stream — compost, mulch, or animal feed.',
    ],
  },
  harvest: {
    why: 'Obtain a yield (Holmgren P3) is the test of the whole design. Logging harvests and succession data turns lived experience into evidence the next cycle can act on.',
    how: [
      'Log every harvest by weight, date, and bed — no entry is too small.',
      'Track succession plantings in real time so gaps in the bed never sit fallow.',
      'Compare actual yield to design intent at season close — adjust the plan, not the memory.',
    ],
  },
  review: {
    why: 'Use and value diversity (Holmgren P10) extends to the review process: ongoing SWOT and hazard planning catch threats before they become incidents, and reveal opportunities the original design did not anticipate.',
    how: [
      'Refresh the SWOT each season with the team, not in isolation.',
      'Walk the hazard plan annually — fire, flood, biosecurity, equipment failure.',
      'File every near-miss as a learning, not an embarrassment.',
    ],
  },
  network: {
    why: 'Integrate rather than segregate (Holmgren P8): a regenerative project is held by its network — neighbours, customers, suppliers, learners. Stewarding those relationships is part of the operation, not a marketing afterthought.',
    how: [
      'Maintain the network CRM as a living record of every meaningful contact.',
      'Run community events on a predictable cadence so trust accumulates.',
      'Document appropriate-tech adoptions so others can follow the path.',
    ],
  },
};

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ActChecklistAside({
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
      {ACT_MODULES.map((mod) => {
        const isActive = activeModule === mod;
        const guidance = ACT_MODULE_GUIDANCE[mod];

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
            ? `Close ${ACT_MODULE_LABEL[mod]} details`
            : `Open ${ACT_MODULE_LABEL[mod]} details`
          : `Switch to ${ACT_MODULE_LABEL[mod]}`;

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
              <span className={css.groupLabel}>{ACT_MODULE_LABEL[mod]}</span>
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
