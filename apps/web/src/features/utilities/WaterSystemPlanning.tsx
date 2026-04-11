import { useMemo } from 'react';
import type { Utility } from '../../store/utilityStore.js';
import { UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import p from '../../styles/panel.module.css';
import s from './UtilityPanel.module.css';

const WATER_TYPES = ['water_tank', 'well_pump', 'greywater', 'septic', 'rain_catchment'] as const;

interface Props {
  utilities: Utility[];
  detentionAreaPct: number | null;
  swaleCount: number | null;
}

export default function WaterSystemPlanning({ utilities, detentionAreaPct, swaleCount }: Props) {
  const waterUtils = useMemo(() => utilities.filter((u) => (WATER_TYPES as readonly string[]).includes(u.type)), [utilities]);

  return (
    <div>
      <div className={p.sectionLabel}>Water Systems</div>
      {detentionAreaPct != null && (
        <div className={s.waterCard}>
          <div className={s.waterLabel}>Watershed Detention</div>
          <div className={s.waterValue}>{detentionAreaPct.toFixed(0)}% of site in detention zones</div>
        </div>
      )}
      {swaleCount != null && swaleCount > 0 && (
        <div className={s.waterCard}>
          <div className={s.waterLabel}>Swale/Pond Candidates</div>
          <div className={s.waterValue}>{swaleCount} intervention site(s) identified</div>
        </div>
      )}
      {waterUtils.length === 0 ? (
        <div className={p.empty}>No water infrastructure placed yet</div>
      ) : (
        <div className={p.section}>
          {waterUtils.map((u) => {
            const cfg = UTILITY_TYPE_CONFIG[u.type];
            return (
              <div key={u.id} className={p.itemRow}>
                <span className={p.text14}>{cfg?.icon}</span>
                <div className={p.itemContent}>
                  <div className={p.itemTitle}>{u.name}</div>
                  <div className={p.itemMeta}>{cfg?.label} {'\u2014'} {u.phase}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
