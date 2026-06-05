/**
 * DomainGrid — 16-card grid of the universal domains for an active Stage.
 *
 * Clicking a card navigates to the Stage × Domain Objective workspace.
 */

import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_DOMAIN_PURPOSE,
  type UniversalDomain,
  type Stage,
} from '@ogden/shared';
import { OBSERVE_MODULE_DOT } from '../../observe/moduleGuidance.js';
import css from './DomainGrid.module.css';

export interface DomainGridProps {
  stage: Stage;
  onDomainSelect: (domain: UniversalDomain) => void;
  activeDomain?: UniversalDomain;
}

export default function DomainGrid({
  stage,
  onDomainSelect,
  activeDomain,
}: DomainGridProps) {
  return (
    <div className={css.grid} role="list">
      {UNIVERSAL_DOMAINS.map((domain) => {
        const accent = OBSERVE_MODULE_DOT[domain] ?? '#9CA3AF';
        const active = activeDomain === domain;
        return (
          <button
            type="button"
            role="listitem"
            key={domain}
            className={[css.card, active ? css.cardActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onDomainSelect(domain)}
            data-stage={stage}
          >
            <span
              className={css.dot}
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <div className={css.body}>
              <h3 className={css.title}>{UNIVERSAL_DOMAIN_LABELS[domain]}</h3>
              <p className={css.purpose}>{UNIVERSAL_DOMAIN_PURPOSE[domain]}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
