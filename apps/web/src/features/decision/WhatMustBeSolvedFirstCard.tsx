/**
 * §21 WhatMustBeSolvedFirstCard — triage rollup of "what must be solved
 * first / what can wait."
 *
 * The Feasibility Checklist already on DecisionSupportPanel evaluates
 * quality once data exists, and MissingInformationChecklistCard inventories
 * what's missing. Neither answers the steward's actual sequencing question:
 * "of everything that's still open, what blocks me from advancing at all,
 * what blocks the next phase, and what can genuinely wait?" This card
 * buckets open items into First / Then / Eventually using a deterministic
 * blocking-tier per item, then surfaces them as an ordered triage list.
 *
 * Pure derivation — reads the same project + entity + site-data signals
 * that MissingInformationChecklistCard already pulls. No writes.
 *
 * Closes manifest §21 `what-must-be-solved-first` (P2) partial -> done.
 */

import type { LocalProject } from '../../store/projectStore.js';
import {
  useTriageItems,
  TRIAGE_TIER_LABEL as TIER_LABEL,
  TRIAGE_TIER_BLURB as TIER_BLURB,
  type TriageTier as Tier,
} from './hooks/useTriageItems.js';
import css from './WhatMustBeSolvedFirstCard.module.css';

interface Props {
  project: LocalProject;
}

export default function WhatMustBeSolvedFirstCard({ project }: Props) {
  const { open, resolvedCount: resolved, openCounts: counts, grouped, verdict } = useTriageItems(project);

  return (
    <section className={css.card} aria-label="What must be solved first">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>What must be solved first</h3>
          <p className={css.cardHint}>
            Open items triaged into <strong>First</strong> (blocks everything),{' '}
            <strong>Then</strong> (blocks the next phase), and{' '}
            <strong>Eventually</strong> (can wait). Resolved items roll into the closed pile
            on the right.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>
          {verdict.label}
        </div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={counts.first} label="first" tone="first" />
        <Headline value={counts.then} label="then" tone="then" />
        <Headline value={counts.eventually} label="eventually" tone="eventually" />
        <Headline value={resolved} label="closed" tone="closed" />
      </div>

      {open.length === 0 ? (
        <p className={css.empty}>
          {'✓'} All tracked feasibility inputs are in place — no triage items pending.
        </p>
      ) : (
        <div className={css.tierStack}>
          {(['first', 'then', 'eventually'] as Tier[]).map((tier) =>
            grouped[tier].length === 0 ? null : (
              <div key={tier} className={`${css.tier} ${css[`tier_${tier}`]}`}>
                <header className={css.tierHead}>
                  <span className={css.tierBadge}>{TIER_LABEL[tier]}</span>
                  <span className={css.tierBlurb}>{TIER_BLURB[tier]}</span>
                </header>
                <ul className={css.itemList}>
                  {grouped[tier].map((it, i) => (
                    <li key={`${tier}-${i}`} className={css.item}>
                      <div className={css.itemHead}>
                        <span className={css.itemLabel}>{it.label}</span>
                        <span className={css.itemDetail}>{it.detail}</span>
                      </div>
                      <p className={css.itemRationale}>{it.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}

      <p className={css.footnote}>
        Triage tiers are deterministic per item type {'—'} they do not learn from the
        project. Resolve "First" before treating downstream feasibility as final.
      </p>
    </section>
  );
}

function Headline({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'first' | 'then' | 'eventually' | 'closed';
}) {
  return (
    <div className={`${css.headline} ${css[`headline_${tone}`]}`}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
