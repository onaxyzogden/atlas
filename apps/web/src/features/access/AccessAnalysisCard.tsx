import { useMemo } from 'react';
import type { DesignPath } from '../../store/pathStore.js';
import { analyzeAccess } from './accessAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';

interface Props { paths: DesignPath[]; }

export default function AccessAnalysisCard({ paths }: Props) {
  const status = useMemo(() => analyzeAccess(paths), [paths]);

  const items = [
    { label: 'Main Entry', present: !!status.mainEntry, name: status.mainEntry?.name },
    { label: 'Emergency Access', present: !!status.emergencyAccess, name: status.emergencyAccess?.name },
    { label: 'Service Access', present: !!status.serviceAccess, name: status.serviceAccess?.name },
    { label: 'Pedestrian Paths', present: status.pedestrianPaths.length > 0, name: `${status.pedestrianPaths.length} path(s)` },
    { label: 'Animal Corridors', present: status.animalCorridors.length > 0, name: `${status.animalCorridors.length} corridor(s)` },
    { label: 'Quiet Routes', present: status.quietRoutes.length > 0, name: `${status.quietRoutes.length} route(s)` },
  ];

  return (
    <div>
      <div className={p.sectionLabel}>Access Status</div>
      <div className={s.statusGrid}>
        {items.map((item) => (
          <div key={item.label} className={`${s.statusCard} ${item.present ? s.statusPresent : s.statusMissing}`}>
            <div className={s.statusLabel}>{item.label}</div>
            <div className={s.statusValue} style={{ color: item.present ? '#2d7a4f' : '#c44e3f' }}>
              {item.present ? item.name : 'Not placed'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
