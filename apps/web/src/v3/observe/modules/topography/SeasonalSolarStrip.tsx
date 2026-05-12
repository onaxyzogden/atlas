import { solsticeAltitudes } from './derivations.js';
import styles from './SeasonalSolarStrip.module.css';

interface Props {
  lat: number | null | undefined;
  className?: string;
}

export default function SeasonalSolarStrip({ lat, className }: Props) {
  if (lat == null) {
    return (
      <div className={`${styles.strip} ${styles.empty} ${className ?? ''}`}>
        <span>Project latitude pending</span>
      </div>
    );
  }

  const { summer, equinox, winter } = solsticeAltitudes(lat);
  const W = 320;
  const H = 120;
  const padX = 24;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const cx = W / 2;
  const baseY = padY + innerH;
  const r = Math.min(innerW / 2, innerH);

  const arc = (alt: number, cls: 'summer' | 'equinox' | 'winter') => {
    const altFrac = Math.max(0, Math.min(1, alt / 90));
    const arcR = r * altFrac;
    if (arcR <= 0) return null;
    return (
      <path
        key={cls}
        d={`M${cx - arcR} ${baseY} A${arcR} ${arcR} 0 0 1 ${cx + arcR} ${baseY}`}
        className={`${styles.arc} ${styles[cls]}`}
        fill="none"
      />
    );
  };

  return (
    <svg
      className={`${styles.strip} ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Seasonal solar altitude"
    >
      <line x1={padX} x2={W - padX} y1={baseY} y2={baseY} className={styles.horizon} />
      {arc(summer, 'summer')}
      {arc(equinox, 'equinox')}
      {arc(winter, 'winter')}
      <text x={padX} y={H - 2} className={styles.tick}>
        E
      </text>
      <text x={W - padX} y={H - 2} textAnchor="end" className={styles.tick}>
        W
      </text>
      <text x={cx} y={padY + 8} textAnchor="middle" className={styles.tick}>
        Summer {Math.round(summer)}° · Equinox {Math.round(equinox)}° · Winter {Math.round(winter)}°
      </text>
    </svg>
  );
}
