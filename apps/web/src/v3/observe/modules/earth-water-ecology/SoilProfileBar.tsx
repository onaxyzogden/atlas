interface JarTest {
  sandPct: number;
  siltPct: number;
  clayPct: number;
}

interface Props {
  jarTest?: JarTest | null;
  className?: string;
}

export default function SoilProfileBar({ jarTest, className }: Props) {
  if (!jarTest) {
    return (
      <div className={`soil-profile-bar is-empty ${className ?? ''}`}>
        <span>No jar test recorded — fill a jar ¾ with soil and water, shake, and let settle 24 h.</span>
      </div>
    );
  }

  const { sandPct, siltPct, clayPct } = jarTest;
  const total = sandPct + siltPct + clayPct || 100;
  const W = 240;
  const H = 120;
  const barW = 48;
  const barX = (W - barW) / 2;
  const barY = 12;
  const barH = H - 28;

  const sandH = (sandPct / total) * barH;
  const siltH = (siltPct / total) * barH;
  const clayH = (clayPct / total) * barH;

  // Layers drawn bottom-up: sand → silt → clay
  const sandY = barY + barH - sandH;
  const siltY = sandY - siltH;
  const clayY = siltY - clayH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`soil-profile-bar ${className ?? ''}`}
      role="img"
      aria-label="Jar test soil profile"
    >
      {/* sand */}
      <rect x={barX} y={sandY} width={barW} height={sandH} className="jar-sand" />
      {/* silt */}
      <rect x={barX} y={siltY} width={barW} height={siltH} className="jar-silt" />
      {/* clay */}
      <rect x={barX} y={clayY} width={barW} height={clayH} className="jar-clay" />
      {/* border */}
      <rect x={barX} y={barY} width={barW} height={barH} className="jar-outline" fill="none" />
      {/* labels */}
      <text x={barX + barW + 8} y={sandY + sandH / 2 + 4} className="jar-label">Sand {Math.round(sandPct)}%</text>
      <text x={barX + barW + 8} y={siltY + siltH / 2 + 4} className="jar-label">Silt {Math.round(siltPct)}%</text>
      <text x={barX + barW + 8} y={clayY + clayH / 2 + 4} className="jar-label">Clay {Math.round(clayPct)}%</text>
    </svg>
  );
}
