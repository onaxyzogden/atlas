import type { Hazard } from '../../../../store/hazardsStore.js';

interface Props {
  hazards: Hazard[];
  className?: string;
}

const RISK_COL: Record<Hazard['risk'], number> = { low: 0, moderate: 1, high: 2 };
const TREND_ROW: Record<Hazard['trend'], number> = { down: 0, flat: 1, up: 2 };

export default function HazardRiskMatrix({ hazards, className }: Props) {
  const cells: Hazard[][][] = [
    [[], [], []],
    [[], [], []],
    [[], [], []],
  ];
  for (const h of hazards) {
    const col = RISK_COL[h.risk];
    const row = TREND_ROW[h.trend];
    const cell = cells[row]?.[col];
    if (cell) cell.push(h);
  }

  return (
    <div className={`hazard-risk-matrix ${className ?? ''}`}>
      <div className="matrix-y-label">Likelihood ↑</div>
      <div className="matrix-grid">
        {cells.map((rowCells, rowIdx) =>
          rowCells.map((cellHazards, colIdx) => {
            const sev = (2 - rowIdx) + colIdx;
            const tone = sev >= 3 ? 'red' : sev >= 2 ? 'gold' : 'green';
            return (
              <div
                className={`matrix-cell ${tone}`}
                key={`${rowIdx}-${colIdx}`}
                aria-label={`Likelihood ${2 - rowIdx}, Impact ${colIdx}`}
              >
                {cellHazards.map((h) => (
                  <span className="matrix-dot" key={h.id} title={h.label}>
                    {h.label.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
            );
          }),
        )}
      </div>
      <div className="matrix-x-label">Impact →</div>
      <div className="matrix-axis-labels">
        <span>Low</span>
        <span>Mod</span>
        <span>High</span>
      </div>
    </div>
  );
}
