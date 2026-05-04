/**
 * StagePagePlaceholder — shared scaffold for Phase 1 stage stubs.
 *
 * Every /v3/project/:id/* page renders this until its real implementation
 * lands in Phases 3–9. Visible enough to confirm routing + layout work,
 * inert enough to be obviously unfinished.
 */

import { useParams } from "@tanstack/react-router";
import { useV3Project } from "../data/useV3Project.js";
import type { LifecycleStage } from "../types.js";
import css from "./StagePagePlaceholder.module.css";

export interface StagePagePlaceholderProps {
  stage: LifecycleStage | "home";
  title: string;
  subtitle: string;
  buildPhase: string;
}

export default function StagePagePlaceholder({
  stage,
  title,
  subtitle,
  buildPhase,
}: StagePagePlaceholderProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>{stage.toUpperCase()}</span>
        <h1 className={css.title}>{title}</h1>
        <p className={css.subtitle}>{subtitle}</p>
      </header>

      <section className={css.context}>
        <div className={css.contextRow}>
          <span className={css.contextLabel}>Project</span>
          <span className={css.contextValue}>{project?.name ?? "—"}</span>
        </div>
        <div className={css.contextRow}>
          <span className={css.contextLabel}>Verdict</span>
          <span className={css.contextValue}>{project?.verdict.label ?? "—"}</span>
        </div>
        <div className={css.contextRow}>
          <span className={css.contextLabel}>Vision Fit</span>
          <span className={css.contextValue}>
            {project ? `${project.verdict.score} / 100` : "—"}
          </span>
        </div>
      </section>

      <p className={css.note}>
        Real content for this stage lands in <strong>{buildPhase}</strong>.
      </p>
    </div>
  );
}
