import type { DesignPath } from '../../store/pathStore.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';

interface Props {
  arrivalPaths: DesignPath[];
  projectType: string;
}

export default function ArrivalSequence({ arrivalPaths, projectType }: Props) {
  if (projectType !== 'moontrance' && projectType !== 'retreat') return null;

  if (arrivalPaths.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Arrival Sequence</div>
        <div className={p.empty}>No arrival sequence paths drawn. Use the "Arrival Sequence" path type to define guest entry flow.</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Arrival Sequence</div>
      <div className={s.waypointList}>
        {arrivalPaths.map((path, i) => (
          <div key={path.id} className={s.waypointItem}>
            <div className={s.waypointNumber}>{i + 1}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{path.name}</div>
              <div style={{ color: 'var(--color-panel-muted)', fontSize: 10 }}>
                {path.lengthM > 1000 ? `${(path.lengthM / 1000).toFixed(1)} km` : `${Math.round(path.lengthM)} m`}
                {path.notes ? ` \u2014 ${path.notes}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
