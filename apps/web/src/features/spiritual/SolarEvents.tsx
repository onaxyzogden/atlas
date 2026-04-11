import { useMemo } from 'react';
import { computeSeasonalTable, formatTime } from './solarCalc.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props { center: [number, number] | null; }

export default function SolarEvents({ center }: Props) {
  const table = useMemo(() => {
    if (!center) return [];
    return computeSeasonalTable(center[1], center[0]);
  }, [center]);

  if (table.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Solar Events</div>
        <div className={p.empty}>Set a property boundary to calculate solar times</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Solar Events</div>
      <table className={s.solarTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Fajr</th>
            <th>Sunrise</th>
            <th>Noon</th>
            <th>Sunset</th>
            <th>Maghrib</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row) => (
            <tr key={row.label} className={row.label === 'Today' ? s.solarToday : undefined}>
              <td style={{ fontFamily: 'inherit', fontWeight: row.label === 'Today' ? 600 : 400 }}>{row.label}</td>
              <td>{formatTime(row.times.dawn)}</td>
              <td>{formatTime(row.times.sunrise)}</td>
              <td>{formatTime(row.times.solarNoon)}</td>
              <td>{formatTime(row.times.sunset)}</td>
              <td>{formatTime(row.times.dusk)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
