/**
 * VisionFitAnalysisCard — surfaces per-requirement vision fit results
 * (e.g. Buildability 56/45 → "Workable") for the *currently selected*
 * project type. Extracted from DecisionSupportPanel so the Feasibility
 * Command Center's Fit column can render it as a standalone card.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useTypeFitRanking } from './hooks/useTypeFitRanking.js';
import { fitStatusLabel, type FitResult } from '../../lib/visionFit.js';
import css from './VisionFitAnalysisCard.module.css';

interface Props {
  project: LocalProject;
}

export default function VisionFitAnalysisCard({ project }: Props) {
  const { currentFit } = useTypeFitRanking(project);

  if (!currentFit || currentFit.results.length === 0) {
    return (
      <section className={css.card}>
        <h3 className={css.title}>Vision Fit Analysis</h3>
        <p className={css.empty}>
          Awaiting site data and project type to score requirements.
        </p>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <header className={css.head}>
        <h3 className={css.title}>Vision Fit Analysis</h3>
        <p className={css.hint}>
          Per-requirement fit for the selected project type. Each row shows the actual
          score against its threshold, the requirement weight, and the data confidence.
        </p>
      </header>
      <ul className={css.list}>
        {currentFit.results.map((fit) => (
          <FitRow key={fit.scoreName} fit={fit} />
        ))}
      </ul>
    </section>
  );
}

function FitRow({ fit }: { fit: FitResult }) {
  const statusClass =
    fit.status === 'strong' ? css.rowGood : fit.status === 'challenge' ? css.rowBad : css.rowMid;

  return (
    <li className={`${css.row} ${statusClass}`}>
      <div className={css.rowMain}>
        <span className={css.rowName}>{fit.scoreName}</span>
        <span className={css.rowStatus}>{fitStatusLabel(fit.status)}</span>
      </div>
      <div className={css.rowMeta}>
        <span className={css.rowScores}>
          {fit.actual} / {fit.threshold} threshold
        </span>
        <span className={`${css.weightBadge} ${css[`weight_${fit.weight}`]}`}>{fit.weight}</span>
        <span className={css.conf}>{fit.confidence} conf.</span>
      </div>
    </li>
  );
}
