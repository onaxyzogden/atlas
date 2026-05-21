import type { ShowcaseRegenerationEvent } from '../data/snapshot';

export function MetricChart({
  metric, events, unit, title,
}: { metric: string; events: ShowcaseRegenerationEvent[]; unit: string; title?: string }) {
  const points = events
    .filter((e) => (e.observations as any)?.metric === metric)
    .map((e) => {
      const obs = e.observations as any;
      const value = obs.mean_om_pct_cropped ?? obs.value ?? obs.mean ?? obs.count ?? null;
      return { date: e.event_date, phase: e.phase, value: typeof value === 'number' ? value : null };
    })
    .filter((p) => p.value !== null) as { date: string; phase: string|null; value: number }[];

  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.value);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 480, H = 200, pad = 32;
  const scaleX = (t: number) => pad + ((t - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const scaleY = (v: number) => H - pad - ((v - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${scaleX(new Date(p.date).getTime()).toFixed(1)} ${scaleY(p.value).toFixed(1)}`).join(' ');

  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
        {title ?? metric} <span style={{ color: '#888' }}>({unit})</span>
      </figcaption>
      <svg data-testid="metric-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric} trajectory chart`}>
        <path d={path} fill="none" stroke="#0a7d2c" strokeWidth={2.5} />
        {points.map((p) => (
          <circle key={p.date} cx={scaleX(new Date(p.date).getTime())} cy={scaleY(p.value)} r={3} fill="#0a7d2c">
            <title>{`${p.phase ?? ''} ${p.date}: ${p.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
