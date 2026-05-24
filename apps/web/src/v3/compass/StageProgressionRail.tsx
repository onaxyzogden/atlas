/**
 * StageProgressionRail — left rail for the Stage Compass.
 *
 * Three things, top to bottom: per-stage progress (Observe live from gating,
 * Plan/Act stubbed at 0% until their compasses exist), the static "Real Outcome
 * Rule" explainer, and a Recent Activity feed (seeded for the prototype).
 */

import { ShieldCheck } from 'lucide-react';
import type { ObjectiveProgress } from './compassGating.js';
import css from './StageProgressionRail.module.css';

interface RailProps {
  observeProgress: ObjectiveProgress;
}

const STAGE_ROWS = [
  { id: 'observe', label: 'Observe' },
  { id: 'plan', label: 'Plan' },
  { id: 'act', label: 'Act' },
] as const;

// Prototype seed — a plausible stewardship trail. Real activity will derive
// from verification events once the evidence backend lands.
const RECENT_ACTIVITY: { who: string; what: string; when: string }[] = [
  { who: 'You', what: 'Verified "Map water sources"', when: '2h ago' },
  { who: 'A. Rahman', what: 'Logged evidence on soil pits', when: 'Yesterday' },
  { who: 'You', what: 'Verified "Walk the boundary"', when: '2 days ago' },
];

export default function StageProgressionRail({ observeProgress }: RailProps) {
  return (
    <aside className={css.rail} aria-label="Stage progression">
      <section className={css.block}>
        <p className="eyebrow">Stage progression</p>
        <ul className={css.stages}>
          {STAGE_ROWS.map((row) => {
            const pct = row.id === 'observe' ? observeProgress.pct : 0;
            return (
              <li key={row.id} className={css.stageRow}>
                <div className={css.stageHead}>
                  <span className={css.stageName}>{row.label}</span>
                  <span className={css.stageValue}>{pct}%</span>
                </div>
                <div className={css.track}>
                  <div className={css.fill} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${css.block} ${css.ruleCard}`}>
        <span className={css.ruleIcon}>
          <ShieldCheck size={16} strokeWidth={1.75} />
        </span>
        <div>
          <p className={css.ruleTitle}>The Real Outcome Rule</p>
          <p className={css.ruleBody}>
            A step only counts when its evidence is verified — not when it is
            clicked. Progress here mirrors real fieldwork on the land.
          </p>
        </div>
      </section>

      <section className={css.block}>
        <p className="eyebrow">Recent activity</p>
        <ul className={css.feed}>
          {RECENT_ACTIVITY.map((item, i) => (
            <li key={i} className={css.feedItem}>
              <span className={css.feedDot} aria-hidden />
              <div className={css.feedBody}>
                <p className={css.feedWhat}>{item.what}</p>
                <p className={css.feedMeta}>
                  {item.who} · {item.when}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
