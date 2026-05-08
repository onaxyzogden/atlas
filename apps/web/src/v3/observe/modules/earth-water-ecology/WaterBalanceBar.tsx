import { roofAnnualCaptureL } from './derivations.js';

interface RoofCatchment {
  roofAreaM2: number;
  runoffCoeff?: number;
  annualPrecipMm?: number;
}

type Variant = 'capture' | 'balance' | 'storage' | 'seasonal';

interface Props {
  roofCatchment?: RoofCatchment | null;
  variant?: Variant;
  className?: string;
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// Synthetic seasonal distribution weights (fraction of annual)
const SEASON_WEIGHTS = [0.07, 0.06, 0.07, 0.08, 0.09, 0.09, 0.09, 0.08, 0.08, 0.09, 0.10, 0.10];

export default function WaterBalanceBar({ roofCatchment, variant = 'capture', className }: Props) {
  if (!roofCatchment) {
    return (
      <div className={`water-balance-bar is-empty ${className ?? ''}`}>
        <span>No roof catchment data — enter roof area and local rainfall to estimate annual harvest.</span>
      </div>
    );
  }

  const annualL = roofAnnualCaptureL(
    roofCatchment.roofAreaM2,
    roofCatchment.annualPrecipMm ?? 800,
    roofCatchment.runoffCoeff ?? 0.85,
  );
  const monthlyL = SEASON_WEIGHTS.map((w) => annualL * w);
  const maxL = Math.max(...monthlyL);

  const W = 280;
  const H = 100;
  const padX = 16;
  const padY = 12;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2 - 16;
  const barW = innerW / 12 - 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`water-balance-bar ${className ?? ''}`}
      role="img"
      aria-label={`Annual roof capture ${Math.round(annualL / 1000)} m³`}
    >
      {monthlyL.map((val, i) => {
        const bh = (val / maxL) * innerH;
        const bx = padX + i * (innerW / 12) + 1;
        const by = padY + innerH - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={bh} className="wb-bar" />
            <text x={bx + barW / 2} y={H - 4} textAnchor="middle" className="wb-month">
              {MONTHS[i]}
            </text>
          </g>
        );
      })}
      <line x1={padX} x2={W - padX} y1={padY + innerH} y2={padY + innerH} className="wb-axis" />
      <text x={padX} y={padY + 8} className="wb-total">
        {Math.round(annualL / 1000)} m³/yr · {roofCatchment.roofAreaM2} m² roof
      </text>
    </svg>
  );
}
