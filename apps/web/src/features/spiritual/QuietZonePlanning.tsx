import { useMemo } from 'react';
import type { LandZone } from '../../store/zoneStore.js';
import type { DesignPath } from '../../store/pathStore.js';
import { analyzeQuietZoneProximity } from './spiritualAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props {
  spiritualZones: LandZone[];
  infrastructureZones: LandZone[];
  vehiclePaths: DesignPath[];
}

const RISK_CLASS: Record<string, string | undefined> = { low: s.riskLow, medium: s.riskMedium, high: s.riskHigh };

export default function QuietZonePlanning({ spiritualZones, infrastructureZones, vehiclePaths }: Props) {
  const reports = useMemo(
    () => analyzeQuietZoneProximity(spiritualZones, infrastructureZones, vehiclePaths),
    [spiritualZones, infrastructureZones, vehiclePaths],
  );

  if (spiritualZones.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Quiet Zone Analysis</div>
        <div className={p.empty}>No spiritual zones drawn. Add zones with the "Spiritual" category to analyze noise proximity.</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Quiet Zone Analysis</div>
      {reports.map((r) => (
        <div key={r.zone.id} className={s.quietCard}>
          <div className={s.quietName}>{r.zone.name}</div>
          <div className={s.quietMeta}>
            <span className={`${s.riskBadge} ${RISK_CLASS[r.noiseRisk]}`}>{r.noiseRisk} noise risk</span>
            {r.nearestSource !== 'None' && (
              <span>Nearest: {r.nearestSource} ({Math.round(r.distanceM)}m)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
