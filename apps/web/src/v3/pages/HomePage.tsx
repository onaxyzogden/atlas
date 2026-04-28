/**
 * /v3/project/:projectId/home — Project Command Home (Phase 3).
 *
 * Layout (top to bottom):
 *   [StageHero]                  active project verdict + actions
 *   [Project Health strip]       6 score MetricCards
 *   [Top Blocker]                single BlockerCard, full-width
 *   [3-column row]               Recent Activity · Top Decisions · Next Actions
 *
 * Right rail is mounted by V3ProjectLayout → DecisionRail → HomeRail.
 */

import { useParams } from "@tanstack/react-router";
import StageHero from "../components/StageHero.js";
import MetricCard from "../components/MetricCard.js";
import BlockerCard from "../components/BlockerCard.js";
import ActivityList from "../components/ActivityList.js";
import ActionList from "../components/ActionList.js";
import { useV3Project } from "../data/useV3Project.js";
import type { ProjectScores, Score } from "../types.js";
import css from "./HomePage.module.css";

const SCORE_ORDER: ReadonlyArray<keyof ProjectScores> = [
  "landFit",
  "water",
  "regulation",
  "access",
  "designCompleteness",
  "financial",
];

export default function HomePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const topBlocker = project.blockers[0];
  const decisions = project.actions.filter((a) => a.type === "decision");
  const nextActions = project.actions.filter((a) => a.type !== "decision").slice(0, 5);

  return (
    <div className={css.page}>
      <StageHero
        eyebrow="Active Project"
        title={project.name}
        verdict={project.verdict}
        meta={`${project.location.region} · ${project.location.acreage} ${project.location.acreageUnit}`}
        actions={[
          { label: "Continue Project", onClick: () => {} },
          { label: "Generate Brief", variant: "secondary", onClick: () => {} },
        ]}
      />

      <section className={css.section}>
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Project Health</h2>
          <span className={css.sectionHint}>How the land is performing across the six core lenses</span>
        </header>
        <div className={css.healthGrid}>
          {SCORE_ORDER.map((key) => (
            <ScoreTile key={key} score={project.scores[key]} />
          ))}
        </div>
      </section>

      {topBlocker && (
        <section className={css.section}>
          <header className={css.sectionHeader}>
            <h2 className={css.sectionTitle}>Top Blocker</h2>
            <span className={css.sectionHint}>Address this first to move the verdict forward</span>
          </header>
          <BlockerCard blocker={topBlocker} onAction={() => {}} />
        </section>
      )}

      <section className={css.threeCol}>
        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Recent Activity</h2>
            <span className={css.colCount}>{project.activity.length}</span>
          </header>
          <ActivityList entries={project.activity} limit={5} />
        </div>

        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Top Decisions Needed</h2>
            <span className={css.colCount}>{decisions.length}</span>
          </header>
          <ActionList actions={decisions} emptyMessage="No open decisions." />
        </div>

        <div className={css.col}>
          <header className={css.colHeader}>
            <h2 className={css.colTitle}>Next Actions</h2>
            <span className={css.colCount}>{nextActions.length}</span>
          </header>
          <ActionList actions={nextActions} emptyMessage="Nothing queued." />
        </div>
      </section>
    </div>
  );
}

function ScoreTile({ score }: { score: Score }) {
  return (
    <MetricCard
      label={score.category}
      value={score.value}
      score={score.value}
      subtext={score.label}
    />
  );
}
