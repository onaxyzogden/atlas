/**
 * VisionActivationStrip — "What this will activate in the Plan stage".
 *
 * Informational only in this MVP: it previews the Plan modules the current
 * answers emphasise (via deriveActivatedModules) but does NOT gate rendering.
 * Real module gating is a deferred follow-up.
 */

import { Sparkles } from 'lucide-react';
import { PLAN_MODULE_FULL_LABEL, type PlanModule } from '../../plan/types.js';
import styles from './VisionActivationStrip.module.css';

interface Props {
  modules: PlanModule[];
}

export function VisionActivationStrip({ modules }: Props) {
  return (
    <section className={styles.root} aria-label="What this will activate in the Plan stage">
      <div className={styles.label}>
        <Sparkles size={14} className={styles.icon} aria-hidden="true" />
        <span>What this activates in the Plan stage</span>
      </div>
      {modules.length === 0 ? (
        <p className={styles.empty}>Answer a few questions to preview your Plan modules.</p>
      ) : (
        <ul className={styles.modules}>
          {modules.map((m) => (
            <li key={m} className={styles.module}>
              {PLAN_MODULE_FULL_LABEL[m]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
