// AttentionRail.tsx
//
// Per-Project Home (Slice 5.4) side rail. Surfaces the same urgency chips
// Portfolio Home renders on its cards, but laid out vertically with
// slightly larger touch targets so the steward can scan the full reason
// list at a glance. Both surfaces consume `buildUrgencyChips` from the
// shared helper so the channel-to-tone mapping never drifts.

import {
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { ProjectUrgencyResult } from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import { buildUrgencyChips } from './urgencyChips.js';
import css from './PerProjectHomePage.module.css';

export interface AttentionRailProps {
  urgency: ProjectUrgencyResult | undefined;
}

export default function AttentionRail({ urgency }: AttentionRailProps) {
  const chips = buildUrgencyChips(urgency);

  return (
    <BentoBox outer="default" padding="md" aria-label="Attention rail">
      <BentoBox.Header className={css.railHeader}>
        <h3 className={css.railTitle}>Attention</h3>
        {chips.length > 0 ? (
          <span className={css.railCount} aria-live="polite">
            {chips.length}
          </span>
        ) : null}
      </BentoBox.Header>

      <BentoBox.Body>
        {chips.length === 0 ? (
          <p className={css.railClear}>No urgent signals. Land is steady.</p>
        ) : (
          <ul className={css.railList}>
            {chips.map((chip) => (
              <li
                key={chip.key}
                className={`${css.railChip} ${css[`railChip-${chip.tone}`]}`}
              >
                {chip.tone === 'critical' || chip.tone === 'high' ? (
                  <AlertTriangle size={12} aria-hidden />
                ) : chip.tone === 'cadence' ? (
                  <RefreshCw size={12} aria-hidden />
                ) : (
                  <Clock size={12} aria-hidden />
                )}
                {chip.label}
              </li>
            ))}
          </ul>
        )}
      </BentoBox.Body>
    </BentoBox>
  );
}
