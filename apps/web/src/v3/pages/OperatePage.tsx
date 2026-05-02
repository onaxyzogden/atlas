/**
 * /v3/project/:projectId/operate — Operations Hub (Phase 7).
 *
 * Layout (top to bottom):
 *   [PageHeader]                 Daily framing + primary action
 *   [Today on the Land]          7 MetricCards (livestock, water, pasture, etc.)
 *   [Field Activity Map]         OperateMap (MapLibre) + FieldFlagOverlay
 *   [Alerts + Upcoming]          Two side-by-side panels (animal/water + this week)
 *
 * Phase 5.2 PR2: live `OperateMap` (MapLibre) replaces `FieldMapPlaceholder`.
 * Right rail is mounted by V3ProjectLayout → DecisionRail → OperateRail.
 */

import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import MetricCard from "../components/MetricCard.js";
import OperateMap from "../components/OperateMap.js";
import FieldFlagOverlay from "../components/overlays/FieldFlagOverlay.js";
import ObservedStamp from "../components/ObservedStamp.js";
import LogObservationDialog from "../components/LogObservationDialog.js";
import CreateFieldTaskDialog from "../components/CreateFieldTaskDialog.js";
import { useV3Project } from "../data/useV3Project.js";
import { useFieldFlags } from "../data/useFieldFlags.js";
import { useFieldTaskStore, type FieldTask } from "../../store/fieldTaskStore.js";
import type { OpsTone, UpcomingEvent } from "../types.js";
import "../styles/chrome.css";
import css from "./OperatePage.module.css";

const TODAY_OBSERVED = new Date(Date.now() - 18 * 60_000).toISOString();

export default function OperatePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const brief = project?.operate;
  // Phase 5.2 PR3: live flags from livestock + water stores, with the
  // brief's hand-authored flags as fallback for the MTC dev fixture.
  const fieldFlags = useFieldFlags(project?.id, { briefFlags: brief?.fieldFlags });
  // Phase 5.2 PR4: "Log Observation" CTA opens a modal that writes into
  // useFieldworkStore. Map-click placement defers to Phase 5.1 PR3's
  // shared drop affordance.
  const [logOpen, setLogOpen] = useState(false);
  // Phase 6.4: "Create Field Task" CTA opens a modal that writes into
  // useFieldTaskStore. The Upcoming panel surfaces live tasks alongside
  // the brief's hand-authored fixture rows so a created task lands on
  // the calendar within the same render tick.
  const [taskOpen, setTaskOpen] = useState(false);
  const projectTasks = useFieldTaskStore((s) =>
    project ? s.tasks.filter((t) => t.projectId === project.id) : [],
  );

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

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
            <button
              type="button"
              className={`${css.btn} ${css.btnPrimary}`}
              onClick={() => setTaskOpen(true)}
            >
              Create Field Task
            </button>
            <button type="button" className={css.btn} onClick={() => setLogOpen(true)}>
              Log Observation
            </button>
          </div>
        }
      />

      <section className={css.section} aria-label="Today on the land">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Steward · Today</p>
          <h2 className={css.sectionTitle}>Today on the Land</h2>
          <p className={css.sectionSub}>What's happening across the operation right now.</p>
          <ObservedStamp at={TODAY_OBSERVED} verb="last observed" />
        </header>
        <div className={css.tileGrid}>
          {brief.today.map((tile) => (
            <MetricCard
              key={tile.id}
              label={tile.title}
              value={tile.headline}
              subtext={tile.detail}
              status={{ label: tile.status.label, tone: toMetricTone(tile.status.tone) }}
              accent="quiet-ring"
            />
          ))}
        </div>
      </section>

      <section className={css.section} aria-label="Field activity map">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Steward · Map</p>
          <h2 className={css.sectionTitle}>Field Activity</h2>
          <p className={css.sectionSub}>
            {fieldFlags.length === 0
              ? "Nothing happening on the land right now."
              : "Live flags from livestock, water, and weather signals on the parcel."}
          </p>
        </header>
        <OperateMap
          // Fallback centroid only used when the project carries no boundary
          // polygon — every real project does, so this is the dev-mock path.
          centroid={[-78.20, 44.50]}
          boundary={project.location.boundary}
          legendNote={`${fieldFlags.length} active flag${fieldFlags.length === 1 ? "" : "s"}`}
        >
          {({ map }) => <FieldFlagOverlay map={map} flags={fieldFlags} />}
        </OperateMap>
      </section>

      <section className={css.split} aria-label="Alerts and upcoming">
        <article className={css.panel}>
          <header className={css.panelHeader}>
            <p className="eyebrow">Steward · Alerts</p>
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
            <p className="eyebrow">Steward · Calendar</p>
            <h2 className={css.sectionTitle}>Upcoming This Week</h2>
            <p className={css.sectionSub}>Events on the calendar that change today's plan.</p>
          </header>
          <ul className={css.upcomingList}>
            {projectTasks.map((t) => (
              <li key={t.id} className={css.upcomingItem}>
                <span className={css.upcomingWhen}>{formatTaskWhen(t)}</span>
                <span className={css.upcomingTitle}>{t.title}</span>
                <span className={`${css.upcomingCat} ${css[`cat-${t.category}`]}`}>
                  {categoryLabel(t.category)}
                </span>
              </li>
            ))}
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

      {logOpen && (
        <LogObservationDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={[-78.20, 44.50]}
          onClose={() => setLogOpen(false)}
        />
      )}

      {taskOpen && (
        <CreateFieldTaskDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={[-78.20, 44.50]}
          onClose={() => setTaskOpen(false)}
        />
      )}
    </div>
  );
}

function formatTaskWhen(task: FieldTask): string {
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return "—";
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((dueDay - startOfToday) / dayMs);
  if (diffDays < 0) return `Overdue · ${due.toLocaleDateString()}`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return due.toLocaleDateString(undefined, { weekday: "long" });
  return due.toLocaleDateString();
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
