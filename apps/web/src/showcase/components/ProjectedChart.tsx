import type { ShowcaseRegenerationEvent } from '../data/snapshot';
import type { ProjectedSeries } from '../data/projectedTrajectories';

export function ProjectedChart({
  measured: _measured, projected, unit,
}: { measured: ShowcaseRegenerationEvent[]; projected: ProjectedSeries; unit: string }) {
  // Render a stub SVG composing measured + dashed projected; see MetricChart for the scaling pattern.
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        {projected.metric} <span style={{ color: '#888' }}>({unit})</span>
        <span
          style={{ background: '#fff5d6', color: '#7a5500', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}
          title="Forward-projected trajectory derived from canon milestones + MDPI Apricot Lane Y5/Y9 sampling pattern. See methodology."
        >
          Projected
        </span>
        <a href="#methodology" style={{ fontSize: 11, color: '#7a5500' }}>see methodology</a>
      </figcaption>
      <svg viewBox="0 0 480 200" role="img" aria-label={`${projected.metric} measured + projected`}>
        {/* TODO during implementation: render measured solid + projected dashed.
            The scaling helpers are identical to MetricChart — extract a shared util in Step 7.4 if both files duplicate. */}
      </svg>
    </figure>
  );
}
