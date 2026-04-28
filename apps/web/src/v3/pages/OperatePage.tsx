/**
 * /v3/project/:projectId/operate — Operations Hub (Phase 7).
 *
 * Layout (top to bottom):
 *   [PageHeader]                 Daily framing + primary action
 *   [Today on the Land]          7 MetricCards (livestock, water, pasture, etc.)
 *   [Field Activity Map]         FieldMapPlaceholder — live MapboxGL deferred to v3.1
 *   [Alerts + Upcoming]          Two side-by-side panels (animal/water + this week)
 *
 * RULE 2: no MapboxGL imports in v3.0 — placeholder only.
 * Right rail is mounted by V3ProjectLayout → DecisionRail → OperateRail.
 */

import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import MetricCard from "../components/MetricCard.js";
import FieldMapPlaceholder from "../components/FieldMapPlaceholder.js";
import { useV3Project } from "../data/useV3Project.js";
import type { OpsTone, UpcomingEvent } from "../types.js";
import css from "./OperatePage.module.css";

export default function OperatePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const brief = project.operate;
  if (!brief) {
    return <div className={css.page}>Operations data is not yet available for this project.</div>;
  }

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Operate"
        title="Operations Hub"
        subtitle="Run the land well today. Small daily actions, lasting impact."
        actions={
          <div className={css.headerActions}>
            <button type="button" className={`${css.btn} ${css.btnPrimary}`}>Create Field Task</button>
            <button type="button" className={css.btn}>Log Observation</button>
          </div>
        }
      />

      <section className={css.section} aria-label="Today on the land">
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Today on the Land</h2>
          <p className={css.sectionSub}>What's happening across the operation right now.</p>
        </header>
        <div className={css.tileGrid}>
          {brief.today.map((tile) => (
            <MetricCard
              key={tile.id}
              label={tile.title}
              value={tile.headline}
              subtext={tile.detail}
              status={{ label: tile.status.label, tone: toMetricTone(tile.status.tone) }}
            />
          ))}
        </div>
      </section>

      <section className={css.section} aria-label="Field activity map">
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Field Activity</h2>
          <p className={css.sectionSub}>Where today's flags fall on the parcel — illustrative until the live map arrives.</p>
        </header>
        <FieldMapPlaceholder flags={brief.fieldFlags} />
      </section>

      <section className={css.split} aria-label="Alerts and upcoming">
        <article className={css.panel}>
          <header className={css.panelHeader}>
            <h2 className={css.sectionTitle}>Animal &amp; Water Alerts</h2>
            <p className={css.sectionSub}>Things needing attention beyond today's checklist.</p>
          </header>
          <ul className={css.alertList}>
            {brief.alerts.map((a) => (
              <li key={a.id} className={`${css.alertItem} ${css[`tone-${a.tone}`]}`}>
                <div className={css.alertTitle}>{a.title}</div>
                <div className={css.alertDetail}>{a.detail}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className={css.panel}>
          <header className={css.panelHeader}>
            <h2 className={css.sectionTitle}>Upcoming This Week</h2>
            <p className={css.sectionSub}>Events on the calendar that change today's plan.</p>
          </header>
          <ul className={css.upcomingList}>
            {brief.upcoming.map((e) => (
              <li key={e.id} className={css.upcomingItem}>
                <span className={css.upcomingWhen}>{e.when}</span>
                <span className={css.upcomingTitle}>{e.title}</span>
                <span className={`${css.upcomingCat} ${css[`cat-${e.category}`]}`}>{categoryLabel(e.category)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function toMetricTone(tone: OpsTone): "neutral" | "good" | "watch" | "warning" {
  return tone;
}

function categoryLabel(c: UpcomingEvent["category"]): string {
  switch (c) {
    case "ops": return "Ops";
    case "weather": return "Weather";
    case "regulation": return "Regulation";
    case "team": return "Team";
    case "education": return "Education";
  }
}
