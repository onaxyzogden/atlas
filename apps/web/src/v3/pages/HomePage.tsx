/**
 * /v3/project/:projectId/home — Project Command Home (Phase 3).
 * Pixel-aligned to the Project Command Home reference design.
 *
 * Layout (top to bottom):
 *   [Page title + subtitle]
 *   [HomeHero]                    photo backdrop + verdict ring + CTAs
 *   [Project Health strip]        6-col horizontal strip with Live + last-updated
 *   [3-column row]                Recent Activity · Top Decisions · Next Actions
 *   [Help banner]                 AI Guidance · Templates · Knowledge Hub
 *
 * Right rail is mounted by V3ProjectLayout → DecisionRail → HomeRail.
 */

import { useParams } from "@tanstack/react-router";
import HomeHero from "../components/HomeHero.js";
import ActivityList from "../components/ActivityList.js";
import ActionList from "../components/ActionList.js";
import { useV3Project } from "../data/useV3Project.js";
import type { ProjectScores } from "../types.js";
import css from "./HomePage.module.css";

const SCORE_ORDER: ReadonlyArray<keyof ProjectScores> = [
  "landFit",
  "water",
  "regulation",
  "access",
  "designCompleteness",
  "financial",
];

const LAST_UPDATED = "May 1, 2026, 12:53 PM";

export default function HomePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const decisions = project.actions.filter((a) => a.type === "decision");
  const nextActions = project.actions.filter((a) => a.type !== "decision").slice(0, 5);

  return (
    <div className={css.page}>
      <header className={css.pageHeader}>
        <h1 className={css.pageTitle}>Project Command Home</h1>
        <span className={css.pageSubtitle}>Welcome back. Here's how your projects are progressing.</span>
      </header>

      <HomeHero
        projectName={project.name}
        meta={`${project.location.region} · ${project.location.acreage} ${project.location.acreageUnit}`}
        verdict={project.verdict}
        actions={[
          { label: "Continue Project", onClick: () => {} },
          { label: "Generate Brief", variant: "secondary", onClick: () => {} },
        ]}
      />

      <section className={css.section}>
        <div className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Project Health</h2>
          <span className={css.liveBadge}>
            <span className={css.liveDot} aria-hidden="true" />
            Live
          </span>
        </div>
        <div className={css.healthStrip}>
          {SCORE_ORDER.map((key) => {
            const s = project.scores[key];
            return (
              <div key={key} className={css.healthTile}>
                <span className={css.healthLabel}>{s.category}</span>
                <span className={css.healthValue}>
                  <span className={css.healthScore}>{s.value}</span>
                  <span className={css.healthDenom}>/100</span>
                </span>
                <span className={css.healthSub}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <span className={css.lastUpdated}>Last updated: {LAST_UPDATED}</span>
      </section>

      <section className={css.threeCol}>
        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Recent Activity</h2>
            <button type="button" className={css.viewAll}>View all</button>
          </header>
          <ActivityList entries={project.activity} limit={5} />
        </div>

        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Top Decisions Needed</h2>
            <button type="button" className={css.viewAll}>View all</button>
          </header>
          <ActionList actions={decisions} emptyMessage="No open decisions." />
        </div>

        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Next Actions</h2>
            <button type="button" className={css.viewAll}>View all</button>
          </header>
          <ActionList actions={nextActions} emptyMessage="Nothing queued." />
        </div>
      </section>

      <aside className={css.helpBanner}>
        <div className={css.helpText}>
          <h3 className={css.helpTitle}>Need help making progress?</h3>
          <span className={css.helpSub}>
            Use AI guidance, templates, and expert knowledge to move forward with confidence.
          </span>
        </div>
        <div className={css.helpActions}>
          <button type="button" className={css.helpBtn}>AI Guidance</button>
          <button type="button" className={css.helpBtn}>Browse Templates</button>
          <button type="button" className={css.helpBtn}>Knowledge Hub</button>
        </div>
      </aside>
    </div>
  );
}
