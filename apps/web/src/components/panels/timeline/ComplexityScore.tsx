import type { ScoredResult } from '../../../lib/computeScores.js';
import p from '../../../styles/panel.module.css';

interface Props {
  scores: ScoredResult[] | null;
  overallScore: number | null;
}

export default function ComplexityScore({ scores, overallScore }: Props) {
  if (!scores || overallScore == null) {
    return (
      <div>
        <div className={p.sectionLabel}>Design Complexity</div>
        <div className={p.empty}>Fetch site intelligence data to compute design complexity score</div>
      </div>
    );
  }

  const scoreClass = overallScore >= 60 ? p.scoreCircleHigh : overallScore >= 40 ? p.scoreCircleMed : p.scoreCircleLow;

  return (
    <div>
      <div className={p.sectionLabel}>Design Complexity</div>
      <div className={p.row} style={{ gap: 12, marginBottom: 12 }}>
        <div className={`${p.scoreCircle} ${scoreClass}`}>{overallScore}</div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Overall Assessment</div>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)' }}>{scores.length} assessment dimensions</div>
        </div>
      </div>
      <div className={p.section}>
        {scores.map((sc) => {
          const badgeClass = sc.score >= 60 ? p.badgeHigh : sc.score >= 40 ? p.badgeMedium : p.badgeLow;
          return (
            <div key={sc.label} className={p.rowBetween} style={{ padding: '4px 0' }}>
              <span style={{ fontSize: 'var(--text-xs)' }}>{sc.label}</span>
              <span className={`${p.badge} ${badgeClass}`}>{sc.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
