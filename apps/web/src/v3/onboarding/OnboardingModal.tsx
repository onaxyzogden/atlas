/**
 * OnboardingModal -- the centred welcome (first-run) and finish modal cards.
 * Reuses the design-system Modal (portal, focus trap, Escape/backdrop dismiss,
 * z-modal layering) so the tour's bookends behave like every other dialog.
 *
 * The welcome card adds the Observe -> Plan -> Act loop chip-row and an honest
 * one-paragraph intro (no overpromising -- the copy lives in onboardingSteps).
 * The finish card is a plain confirmation. Variant is keyed off `step.id`.
 */

import { Modal } from '../../components/ui/index.js';
import type { TourStep } from './onboardingSteps.js';
import css from './OnboardingModal.module.css';

interface Props {
  /** The welcome or finish modal step. */
  step: TourStep;
  /** Primary CTA: start walking (welcome) / complete (finish). */
  onPrimary: () => void;
  /** Dismiss without completing (X / backdrop / Escape / secondary button). */
  onClose: () => void;
}

const STAGE_LOOP = [
  { id: 'observe', label: 'Observe', color: 'var(--color-stage-observe, #6c8294)' },
  { id: 'plan', label: 'Plan', color: 'var(--color-stage-plan, #38a3a5)' },
  { id: 'act', label: 'Act', color: 'var(--color-stage-act, #d9a036)' },
] as const;

export default function OnboardingModal({ step, onPrimary, onClose }: Props) {
  const isWelcome = step.id === 'welcome';

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={step.title}
      footer={
        <div className={css.footer}>
          <button type="button" className={css.ghost} onClick={onClose}>
            {isWelcome ? 'Maybe later' : 'Close'}
          </button>
          <button type="button" className={css.primary} onClick={onPrimary}>
            {isWelcome ? 'Take the tour' : 'Done'}
          </button>
        </div>
      }
    >
      {isWelcome && (
        <div className={css.loop} aria-hidden="true">
          {STAGE_LOOP.map((s, i) => (
            <span key={s.id} className={css.loopItem}>
              <span className={css.loopDot} style={{ background: s.color }} />
              <span className={css.loopLabel}>{s.label}</span>
              {i < STAGE_LOOP.length - 1 && (
                <span className={css.loopArrow}>{'→'}</span>
              )}
            </span>
          ))}
          <span className={css.loopReturn} title="repeating loop">
            {'↺'}
          </span>
        </div>
      )}
      <p className={css.body}>{step.body}</p>
    </Modal>
  );
}
