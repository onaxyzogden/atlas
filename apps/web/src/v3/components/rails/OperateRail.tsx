/**
 * OperateRail — right-rail companion for /v3/project/:id/operate.
 *
 * Reads from project.operate (today tiles, alerts, upcoming events) and
 * surfaces the four most decision-relevant: today's priorities (warning/watch
 * tiles first), animal & water alerts, upcoming events, plus the standard
 * Create Field Task / Log Observation CTAs.
 */

import type { OpsTone, Project, TodayTile } from "../../types.js";
import css from "./railPanel.module.css";

const TONE_DOT: Record<OpsTone, string> = {
  good: css.dotGood ?? "",
  watch: css.dotWarning ?? "",
  warning: css.dotBlocking ?? "",
  neutral: css.dotInfo ?? "",
};

function priorityRank(t: TodayTile): number {
  switch (t.status.tone) {
    case "warning": return 0;
    case "watch":   return 1;
    case "neutral": return 2;
    case "good":    return 3;
    default:        return 4;
  }
}

export default function OperateRail({ project }: { project: Project }) {
  const brief = project.operate;

  if (!brief) {
    return (
      <div className={css.panel}>
        <section className={css.section}>
          <span className={css.sectionLabel}>Operations</span>
          <p className={css.cardSub}>No operations data loaded.</p>
        </section>
      </div>
    );
  }

  const priorities = [...brief.today].sort((a, b) => priorityRank(a) - priorityRank(b)).slice(0, 4);

  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Today's Priorities</span>
        <ul className={css.list}>
          {priorities.map((t) => (
            <li key={t.id} className={css.listItem}>
              <span className={`${css.dot} ${TONE_DOT[t.status.tone]}`} />
              <span>
                {t.title} · {t.headline}
                {t.due ? ` · ${t.due}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Animal &amp; Water Alerts</span>
        <ul className={css.list}>
          {brief.alerts.map((a) => (
            <li key={a.id} className={css.listItem}>
              <span className={`${css.dot} ${TONE_DOT[a.tone]}`} />
              <span>{a.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Upcoming Events</span>
        <ul className={css.list}>
          {brief.upcoming.slice(0, 4).map((e) => (
            <li key={e.id} className={css.listItem}>
              <span className={`${css.dot} ${css.dotInfo}`} />
              <span>{e.when} · {e.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className={css.cta}>Create Field Task</button>
      <button type="button" className={`${css.cta} ${css.ctaSecondary}`}>Log Observation</button>
    </div>
  );
}
