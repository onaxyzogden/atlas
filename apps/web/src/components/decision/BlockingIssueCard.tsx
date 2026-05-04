/**
 * BlockingIssueCard — single weighted siting violation as a compact card.
 * Consumes `WeightedViolation` directly from useSitingEvaluation.
 */

import type { WeightedViolation } from '../../hooks/useSitingEvaluation.js';
import css from './BlockingIssueCard.module.css';

export interface BlockingIssueCardProps {
  violation: WeightedViolation;
  onLocate?: (violation: WeightedViolation) => void;
}

const TONE_LABEL: Record<WeightedViolation['effectiveSeverity'], string> = {
  blocking: 'Blocking',
  warning: 'Warning',
  advisory: 'Advisory',
};

export default function BlockingIssueCard({ violation, onLocate }: BlockingIssueCardProps) {
  const tone = violation.effectiveSeverity;
  return (
    <article className={`${css.card} ${css[`tone-${tone}`]}`} aria-label={`${TONE_LABEL[tone]}: ${violation.title}`}>
      <header className={css.header}>
        <span className={css.toneTag}>{TONE_LABEL[tone]}</span>
        {violation.needsSiteVisit && <span className={css.siteVisit}>Site visit</span>}
      </header>

      <h4 className={css.title}>{violation.title}</h4>
      {violation.affectedElementName && (
        <p className={css.affected}>
          Affects <span className={css.affectedName}>{violation.affectedElementName}</span>
        </p>
      )}
      {violation.suggestion && <p className={css.suggestion}>{violation.suggestion}</p>}

      <footer className={css.footer}>
        <span className={css.source} title={`Data source: ${violation.dataSource}`}>{violation.dataSource}</span>
        {onLocate && (
          <button type="button" className={css.locate} onClick={() => onLocate(violation)}>
            Locate
          </button>
        )}
      </footer>
    </article>
  );
}
