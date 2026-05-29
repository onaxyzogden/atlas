/**
 * WizardTensionPanel — Sub-slice E.1.
 *
 * Advisory panel that surfaces the named design tensions active for the current
 * primary + secondary selection (Wizard Step 2, Section A). Tensions are NEVER
 * blocking: the panel explains the friction and the tier where it is resolved
 * during planning, and a single "I understand, continue" action records a
 * timestamped acknowledgement. The wizard's Next button does not depend on it.
 *
 * Controlled by WizardStep2Vision; acknowledgements are written to
 * metadata.projectTypeRecord.tensionAcknowledgements.
 */

import type { DesignTension } from '@ogden/shared';
import { AlertTriangle } from 'lucide-react';
import styles from './WizardTensionPanel.module.css';

export interface WizardTensionPanelProps {
  /** The design tensions active for the current selection (non-empty). */
  tensions: readonly DesignTension[];
  /** Tension ids already acknowledged for this project. */
  acknowledgedTensionIds: readonly string[];
  /** Record an acknowledgement for every currently active tension. */
  onAcknowledge: () => void;
}

export default function WizardTensionPanel({
  tensions,
  acknowledgedTensionIds,
  onAcknowledge,
}: WizardTensionPanelProps) {
  const acked = new Set(acknowledgedTensionIds);
  const allAcknowledged = tensions.every((t) => acked.has(t.id));

  return (
    <section className={styles.panel} aria-label="Design tension advisory">
      <header className={styles.head}>
        <AlertTriangle size={15} aria-hidden="true" className={styles.icon} />
        <span className={styles.title}>
          {tensions.length === 1
            ? 'This pairing has a known design tension'
            : 'This pairing has known design tensions'}
        </span>
      </header>
      <ul className={styles.list}>
        {tensions.map((t) => (
          <li key={t.id} className={styles.item}>
            <p className={styles.itemDesc}>{t.description}</p>
            <p className={styles.itemTier}>Resolved at: {t.resolutionTierLabel}</p>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        {allAcknowledged ? (
          <span className={styles.ackedNote}>
            Acknowledged - you can continue.
          </span>
        ) : (
          <button
            type="button"
            className={styles.ackBtn}
            onClick={onAcknowledge}
          >
            I understand, continue
          </button>
        )}
        <span className={styles.advisory}>
          Advisory only - this never blocks you.
        </span>
      </div>
    </section>
  );
}
