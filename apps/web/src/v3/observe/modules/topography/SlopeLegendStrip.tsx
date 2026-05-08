interface Props {
  className?: string;
}

const BANDS: Array<[string, string]> = [
  ['0–3°', 'flat'],
  ['3–8°', 'gentle'],
  ['8–15°', 'moderate'],
  ['15–25°', 'steep'],
  ['25°+', 'severe'],
];

export default function SlopeLegendStrip({ className }: Props) {
  return (
    <div className={`slope-legend-strip ${className ?? ''}`} role="img" aria-label="Slope legend">
      <span className="slope-legend-title">Slope</span>
      <div className="slope-legend-bands">
        {BANDS.map(([label, key]) => (
          <span className={`slope-band band-${key}`} key={key}>
            <i />
            <em>{label}</em>
          </span>
        ))}
      </div>
    </div>
  );
}
