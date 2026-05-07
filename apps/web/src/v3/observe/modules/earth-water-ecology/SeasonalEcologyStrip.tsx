import type { EcologyObservation } from '../../../../store/ecologyStore.js';

interface Props {
  observations: EcologyObservation[];
  className?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SeasonalEcologyStrip({ observations, className }: Props) {
  // Count observations per calendar month
  const counts = new Array<number>(12).fill(0);
  for (const o of observations) {
    const m = new Date(o.observedAt).getMonth();
    if (m >= 0 && m < 12) counts[m]++;
  }
  const maxCount = Math.max(...counts, 1);

  if (observations.length === 0) {
    return (
      <div className={`seasonal-ecology-strip is-empty ${className ?? ''}`}>
        <span>Record observations across seasons to build a phenology picture.</span>
      </div>
    );
  }

  return (
    <div className={`seasonal-ecology-strip ${className ?? ''}`} role="img" aria-label="Seasonal observation distribution">
      {MONTHS.map((month, i) => {
        const pct = Math.round((counts[i] / maxCount) * 100);
        return (
          <div key={month} className="seasonal-cell">
            <div className="seasonal-bar-wrap">
              <div className="seasonal-bar" style={{ height: `${pct}%` }} />
            </div>
            <span className="seasonal-month">{month}</span>
            {counts[i] > 0 && <em className="seasonal-count">{counts[i]}</em>}
          </div>
        );
      })}
    </div>
  );
}
