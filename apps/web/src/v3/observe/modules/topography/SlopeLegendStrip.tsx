import styles from './SlopeLegendStrip.module.css';

interface Props {
  className?: string;
}

type BandKey = 'flat' | 'gentle' | 'moderate' | 'steep' | 'severe';

const BANDS: Array<[string, BandKey]> = [
  ['0–3°', 'flat'],
  ['3–8°', 'gentle'],
  ['8–15°', 'moderate'],
  ['15–25°', 'steep'],
  ['25°+', 'severe'],
];

export default function SlopeLegendStrip({ className }: Props) {
  return (
    <div className={`${styles.strip} ${className ?? ''}`} role="img" aria-label="Slope legend">
      <span>Slope</span>
      <div>
        {BANDS.map(([label, key]) => (
          <span className={`${styles.band} ${styles[key]}`} key={key}>
            <i />
            <em>{label}</em>
          </span>
        ))}
      </div>
    </div>
  );
}
