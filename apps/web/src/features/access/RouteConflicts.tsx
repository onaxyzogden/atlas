import { useMemo } from 'react';
import type { DesignPath } from '../../store/pathStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import { detectRouteConflicts, type RouteConflict } from './accessAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';
import { error as errorToken, semantic } from '../../lib/tokens.js';

interface Props {
  paths: DesignPath[];
  zones: LandZone[];
}

const CONFLICT_LABELS: Record<RouteConflict['type'], string> = {
  vehicle_pedestrian: 'Vehicle \u00D7 Pedestrian',
  livestock_guest: 'Livestock \u00D7 Guest',
  service_spiritual: 'Service \u00D7 Spiritual',
};

export default function RouteConflicts({ paths, zones }: Props) {
  const conflicts = useMemo(() => detectRouteConflicts(paths, zones), [paths, zones]);

  return (
    <div>
      <div className={p.sectionLabel}>Route Conflicts</div>
      {conflicts.length === 0 ? (
        <div className={s.successCard}>No route conflicts detected</div>
      ) : (
        conflicts.map((c, i) => (
          <div key={i} className={`${s.conflictCard} ${c.severity === 'error' ? s.conflictError : s.conflictWarning}`}>
            <div className={s.conflictType} style={{ color: c.severity === 'error' ? errorToken.DEFAULT : semantic.sidebarActive }}>
              {CONFLICT_LABELS[c.type]}
            </div>
            <div className={s.conflictDesc}>{c.description}</div>
          </div>
        ))
      )}
    </div>
  );
}
