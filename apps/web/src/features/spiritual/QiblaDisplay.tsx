import { useMemo } from 'react';
import { computeQibla, bearingToCardinal } from '../../lib/qibla.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props { center: [number, number] | null; }

export default function QiblaDisplay({ center }: Props) {
  const qibla = useMemo(() => {
    if (!center) return null;
    return computeQibla(center[1], center[0]);
  }, [center]);

  if (!qibla) {
    return (
      <div>
        <div className={p.sectionLabel}>Qibla Direction</div>
        <div className={p.empty}>Set a property boundary to calculate Qibla direction</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Qibla Direction</div>
      <div className={s.qiblaCard}>
        <div className={s.qiblaRow}>
          <div className={s.compassOuter}>
            <div className={s.compassNeedle} style={{ transform: `rotate(${qibla.bearing}deg)` }} />
            <div className={s.compassNorth}>N</div>
            <div className={s.compassE}>E</div>
            <div className={s.compassS}>S</div>
            <div className={s.compassW}>W</div>
          </div>
          <div>
            <div className={s.qiblaBearing}>{qibla.bearing.toFixed(1)}{"\u00B0"}</div>
            <div className={s.qiblaCardinal}>{bearingToCardinal(qibla.bearing)}</div>
            <div className={s.qiblaDistance}>{qibla.distanceKm.toFixed(0)} km to Mecca</div>
          </div>
        </div>
      </div>
    </div>
  );
}
