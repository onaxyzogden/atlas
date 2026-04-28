/**
 * /v3/project/:projectId/report — Project Report (Phase 8 MVP).
 *
 * "Generate Summary" reveals a print-styled summary that aggregates
 * verdict + scores + blockers + actions. PDF export deferred to v3.1.
 */

import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import { useV3Project } from "../data/useV3Project.js";
import type { ProjectScores } from "../types.js";
import css from "./ReportPage.module.css";

const SCORE_KEYS: Array<{ key: keyof ProjectScores; label: string }> = [
  { key: "landFit", label: "Land Fit" },
  { key: "water", label: "Water" },
  { key: "regulation", label: "Regulation" },
  { key: "access", label: "Access" },
  { key: "financial", label: "Financial" },
  { key: "designCompleteness", label: "Design" },
];

export default function ReportPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const [generated, setGenerated] = useState(false);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Report"
        title="Project Report"
        subtitle="Generate and share the project summary — verdict, scores, blockers, and next actions."
        actions={
          <div className={css.headerActions}>
            <button
              type="button"
              className={`${css.btn} ${css.btnPrimary}`}
              onClick={() => setGenerated(true)}
            >
              {generated ? "Regenerate Summary" : "Generate Summary"}
            </button>
            <button
              type="button"
              className={css.btn}
              onClick={() => window.print()}
              disabled={!generated}
            >
              Print
            </button>
          </div>
        }
      />

      {!generated ? (
        <section className={css.placeholder} aria-label="Report placeholder">
          <p className={css.placeholderTitle}>Ready to generate.</p>
          <p className={css.placeholderText}>
            Click <strong>Generate Summary</strong> to compile the verdict, six scores,
            blocking issues, and next actions into a print-ready brief.
            PDF export ships in v3.1.
          </p>
        </section>
      ) : (
        <article className={css.summary} aria-label="Project summary">
          <header className={css.summaryHeader}>
            <span className={css.eyebrow}>Project Summary · Generated just now</span>
            <h2 className={css.summaryTitle}>{project.name}</h2>
            <p className={css.summaryMeta}>
              {project.location.region} · {project.location.acreage} {project.location.acreageUnit}
            </p>
          </header>

          <section className={css.block}>
            <h3 className={css.blockTitle}>Verdict</h3>
            <div className={css.verdictRow}>
              <span className={css.verdictScore}>{project.verdict.score}</span>
              <div className={css.verdictBody}>
                <span className={css.verdictLabel}>{project.verdict.label}</span>
                <p className={css.verdictSummary}>{project.verdict.summary}</p>
              </div>
            </div>
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>Scores</h3>
            <ul className={css.scoreList}>
              {SCORE_KEYS.map(({ key, label }) => {
                const s = project.scores[key];
                return (
                  <li key={key} className={css.scoreRow}>
                    <span className={css.scoreLabel}>{label}</span>
                    <span className={css.scoreBar}>
                      <span className={css.scoreFill} style={{ width: `${s.value}%` }} />
                    </span>
                    <span className={css.scoreValue}>{s.value}</span>
                    <span className={css.scoreNote}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>
              Blocking Issues <span className={css.count}>({project.blockers.length})</span>
            </h3>
            {project.blockers.length === 0 ? (
              <p className={css.muted}>No blocking issues.</p>
            ) : (
              <ol className={css.blockerList}>
                {project.blockers.map((b) => (
                  <li key={b.id} className={css.blockerItem}>
                    <div className={css.blockerHead}>
                      <span className={`${css.severity} ${css[`sev-${b.severity}`]}`}>{b.severity}</span>
                      <span className={css.blockerTitle}>{b.title}</span>
                    </div>
                    <p className={css.blockerText}>{b.description}</p>
                    <p className={css.blockerAction}><strong>Recommended:</strong> {b.recommendedAction}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>
              Next Actions <span className={css.count}>({project.actions.length})</span>
            </h3>
            <ul className={css.actionList}>
              {project.actions.map((a) => (
                <li key={a.id} className={css.actionItem}>
                  <span className={`${css.actionDot} ${css[`act-${a.status}`]}`} />
                  <span className={css.actionTitle}>{a.title}</span>
                  {a.dueLabel && <span className={css.actionDue}>{a.dueLabel}</span>}
                </li>
              ))}
            </ul>
          </section>

          <footer className={css.summaryFooter}>
            <span>OGDEN Atlas · {project.shortLabel}</span>
            <span>Mock summary · Live PDF export in v3.1</span>
          </footer>
        </article>
      )}
    </div>
  );
}
