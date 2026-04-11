import { useMemo } from 'react';
import type { Utility } from '../../store/utilityStore.js';
import { computeOffGridReadiness } from './utilityAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './UtilityPanel.module.css';

interface Props {
  utilities: Utility[];
  sunTrapAreaPct: number | null;
  detentionAreaPct: number | null;
}

export default function OffGridReadiness({ utilities, sunTrapAreaPct, detentionAreaPct }: Props) {
  const readiness = useMemo(
    () => computeOffGridReadiness(utilities, sunTrapAreaPct, detentionAreaPct),
    [utilities, sunTrapAreaPct, detentionAreaPct],
  );

  const scoreClass = readiness.score >= 60 ? p.scoreCircleHigh : readiness.score >= 40 ? p.scoreCircleMed : p.scoreCircleLow;
  const fillColor = readiness.score >= 60 ? '#2d7a4f' : readiness.score >= 40 ? '#c4a265' : '#c44e3f';

  return (
    <div>
      <div className={p.sectionLabel}>Off-Grid Readiness</div>
      <div className={s.offGridHeader}>
        <div className={`${p.scoreCircle} ${scoreClass}`}>{readiness.score}</div>
        <div>
          <div className={s.offGridRating}>{readiness.rating}</div>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)' }}>Composite score out of 100</div>
        </div>
      </div>
      {readiness.breakdown.map((b) => (
        <div key={b.label} className={s.breakdownRow}>
          <span className={s.breakdownLabel}>{b.label}</span>
          <div className={s.breakdownBar}>
            <div className={s.breakdownFill} style={{ width: `${(b.value / b.max) * 100}%`, background: fillColor }} />
          </div>
          <span className={s.breakdownScore}>{b.value}/{b.max}</span>
        </div>
      ))}
      {readiness.breakdown.map((b) => (
        <div key={`d-${b.label}`} style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginBottom: 2 }}>
          {b.label}: {b.detail}
        </div>
      ))}
    </div>
  );
}
