import { useMemo } from 'react';
import type { DesignPath } from '../../store/pathStore.js';
import { checkSlopeWarnings } from './accessAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';

interface Props {
  paths: DesignPath[];
  terrainSummary: { elevation_max?: number; elevation_min?: number; mean_slope_deg?: number } | null;
}

export default function SlopeWarnings({ paths, terrainSummary }: Props) {
  const warnings = useMemo(() => checkSlopeWarnings(paths, terrainSummary), [paths, terrainSummary]);

  if (warnings.length === 0) return null;

  return (
    <div>
      <div className={p.sectionLabel}>Slope Warnings</div>
      {warnings.map((w, i) => (
        <div key={i} className={s.slopeCard}>
          <div className={s.slopeMsg}>{w.message}</div>
        </div>
      ))}
    </div>
  );
}
