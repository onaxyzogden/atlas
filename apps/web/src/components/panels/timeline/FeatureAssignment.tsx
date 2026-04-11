import type { PhaseSummary } from './timelineHelpers.js';
import p from '../../../styles/panel.module.css';
import s from '../TimelinePanel.module.css';

interface Props {
  phaseSummaries: Map<string, PhaseSummary>;
  totalFeatures: number;
}

const TYPE_ICONS: Record<string, string> = {
  structure: '\u{1F3D7}',
  path: '\u{1F6E4}',
  utility: '\u26A1',
};

export default function FeatureAssignment({ phaseSummaries, totalFeatures }: Props) {
  if (totalFeatures === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Feature Assignment</div>
        <div className={p.empty}>No features placed yet. Draw zones, place structures, and add paths to see them organized by phase.</div>
      </div>
    );
  }

  const phases = Array.from(phaseSummaries.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className={p.sectionLabel}>Feature Assignment ({totalFeatures} total)</div>
      {phases.map(([phaseName, summary]) => (
        <div key={phaseName} className={s.featurePhaseGroup}>
          <div className={s.featurePhaseHeader}>
            {phaseName} ({summary.featureCount})
          </div>
          {summary.features.map((f) => (
            <div key={f.id} className={s.featureItem} style={{ padding: '4px 0' }}>
              <span style={{ fontSize: 12, marginRight: 4 }}>{TYPE_ICONS[f.featureType] ?? ''}</span>
              <span>{f.name}</span>
              <span style={{ color: 'var(--color-panel-muted)', fontSize: 10, marginLeft: 'auto' }}>{f.subType}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
