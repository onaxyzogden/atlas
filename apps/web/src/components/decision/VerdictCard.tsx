/**
 * VerdictCard — overall siting verdict surface for the AdaptiveDecisionRail.
 *
 * Domain-specific (lives under components/decision, not components/ui).
 * Tones are tied to the rule severities: blocking | warning | advisory | clear.
 */

import type { ReactNode } from 'react';
import css from './VerdictCard.module.css';

export type VerdictTone = 'blocking' | 'warning' | 'advisory' | 'clear';

export interface VerdictCardProps {
  verdict: VerdictTone;
  title: string;
  summary: string;
  blockingCount?: number;
  warningCount?: number;
  advisoryCount?: number;
  primaryAction?: { label: string; onClick: () => void };
  children?: ReactNode;
}

const TONE_LABEL: Record<VerdictTone, string> = {
  blocking: 'Blocking',
  warning: 'Warnings',
  advisory: 'Advisories',
  clear: 'Clear',
};

export default function VerdictCard({
  verdict,
  title,
  summary,
  blockingCount,
  warningCount,
  advisoryCount,
  primaryAction,
  children,
}: VerdictCardProps) {
  return (
    <section className={`${css.card} ${css[`tone-${verdict}`]}`} aria-label={`Siting verdict: ${TONE_LABEL[verdict]}`}>
      <header className={css.header}>
        <span className={css.toneDot} aria-hidden="true" />
        <span className={css.toneLabel}>{TONE_LABEL[verdict]}</span>
      </header>

      <h3 className={css.title}>{title}</h3>
      <p className={css.summary}>{summary}</p>

      {(blockingCount !== undefined || warningCount !== undefined || advisoryCount !== undefined) && (
        <ul className={css.counts}>
          {blockingCount !== undefined && (
            <li><span className={css.countNum}>{blockingCount}</span><span className={css.countLabel}>blocking</span></li>
          )}
          {warningCount !== undefined && (
            <li><span className={css.countNum}>{warningCount}</span><span className={css.countLabel}>warnings</span></li>
          )}
          {advisoryCount !== undefined && (
            <li><span className={css.countNum}>{advisoryCount}</span><span className={css.countLabel}>advisories</span></li>
          )}
        </ul>
      )}

      {children}

      {primaryAction && (
        <button type="button" className={css.primary} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      )}
    </section>
  );
}
