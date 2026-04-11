import { useMemo } from 'react';
import type { DesignPath } from '../../store/pathStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import { analyzeCorridorConnectivity } from './accessAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';

interface Props {
  corridors: DesignPath[];
  livestockZones: LandZone[];
  waterZones: LandZone[];
}

export default function AnimalCorridors({ corridors, livestockZones, waterZones }: Props) {
  const reports = useMemo(
    () => analyzeCorridorConnectivity(corridors, livestockZones, waterZones),
    [corridors, livestockZones, waterZones],
  );

  if (corridors.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Animal Corridors</div>
        <div className={p.empty}>No animal corridors drawn yet</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Animal Corridors ({corridors.length})</div>
      {reports.map((r) => (
        <div key={r.corridor.id} className={s.corridorCard}>
          <div className={s.corridorName}>{r.corridor.name}</div>
          <div>
            <span className={`${s.corridorTag} ${r.connectsToLivestock ? s.corridorConnected : s.corridorDisconnected}`}>
              {r.connectsToLivestock ? `\u2713 ${r.nearestLivestockZone}` : 'No livestock zone'}
            </span>
            <span className={`${s.corridorTag} ${r.connectsToWater ? s.corridorConnected : s.corridorDisconnected}`}>
              {r.connectsToWater ? `\u2713 ${r.nearestWaterZone}` : 'No water access'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
