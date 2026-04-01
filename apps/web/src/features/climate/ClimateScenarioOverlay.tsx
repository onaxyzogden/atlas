/**
 * ClimateScenarioOverlay — warming scenario overlays (+1.5/2/3°C).
 * Adjusts growing season, frost dates, hardiness zone for each scenario.
 */

import { useState } from 'react';

type Scenario = 'baseline' | '+1.5C' | '+2C' | '+3C';

const SCENARIOS: { id: Scenario; label: string; tempDelta: number; color: string }[] = [
  { id: 'baseline', label: 'Current', tempDelta: 0, color: '#2d7a4f' },
  { id: '+1.5C', label: '+1.5\u00B0C', tempDelta: 1.5, color: '#c4a265' },
  { id: '+2C', label: '+2\u00B0C', tempDelta: 2, color: '#c47e3f' },
  { id: '+3C', label: '+3\u00B0C', tempDelta: 3, color: '#c44e3f' },
];

interface BaseClimate {
  annualTempC: number;
  growingDays: number;
  firstFrost: string;
  lastFrost: string;
  hardinessZone: string;
  precipMm: number;
}

const DEFAULT_BASELINE: BaseClimate = {
  annualTempC: 8.4,
  growingDays: 165,
  firstFrost: 'Oct 12',
  lastFrost: 'Apr 28',
  hardinessZone: '5b',
  precipMm: 920,
};

function projectClimate(base: BaseClimate, tempDelta: number): BaseClimate {
  const growingDelta = Math.round(tempDelta * 12); // ~12 days per degree
  const precipDelta = Math.round(tempDelta * 15); // ~15mm per degree (variable)
  const zoneShift = Math.floor(tempDelta / 1.5);

  const zones = ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b'];
  const currentIdx = zones.indexOf(base.hardinessZone);
  const newZone = zones[Math.min(zones.length - 1, currentIdx + zoneShift)] ?? base.hardinessZone;

  return {
    annualTempC: +(base.annualTempC + tempDelta).toFixed(1),
    growingDays: base.growingDays + growingDelta,
    firstFrost: shiftDate(base.firstFrost, Math.round(tempDelta * 4)),
    lastFrost: shiftDate(base.lastFrost, -Math.round(tempDelta * 4)),
    hardinessZone: newZone,
    precipMm: base.precipMm + precipDelta,
  };
}

function shiftDate(dateStr: string, daysLater: number): string {
  const months: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const parts = dateStr.split(' ');
  if (parts.length !== 2) return dateStr;
  const month = months[parts[0]!];
  const day = parseInt(parts[1]!, 10);
  if (month === undefined || isNaN(day)) return dateStr;
  const d = new Date(2024, month, day + daysLater);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export default function ClimateScenarioOverlay() {
  const [active, setActive] = useState<Scenario>('baseline');
  const scenario = SCENARIOS.find((s) => s.id === active)!;
  const projected = projectClimate(DEFAULT_BASELINE, scenario.tempDelta);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Climate Scenarios
      </div>

      {/* Scenario buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 10, fontWeight: active === s.id ? 600 : 400,
              border: `1px solid ${active === s.id ? s.color : 'var(--color-panel-card-border)'}`,
              borderRadius: 6,
              background: active === s.id ? `${s.color}15` : 'transparent',
              color: active === s.id ? s.color : 'var(--color-panel-muted)',
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Projected values */}
      <div style={{
        padding: 12, borderRadius: 8,
        background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
      }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { label: 'Mean Temp', value: `${projected.annualTempC}\u00B0C`, changed: scenario.tempDelta > 0 },
              { label: 'Growing Season', value: `${projected.growingDays} days`, changed: scenario.tempDelta > 0 },
              { label: 'Last Frost', value: projected.lastFrost, changed: scenario.tempDelta > 0 },
              { label: 'First Frost', value: projected.firstFrost, changed: scenario.tempDelta > 0 },
              { label: 'Hardiness Zone', value: projected.hardinessZone, changed: scenario.tempDelta >= 1.5 },
              { label: 'Precipitation', value: `${projected.precipMm} mm/yr`, changed: scenario.tempDelta > 0 },
            ].map((row) => (
              <tr key={row.label}>
                <td style={{ padding: '4px 0', color: 'var(--color-panel-muted)' }}>{row.label}</td>
                <td style={{ padding: '4px 0', textAlign: 'right', color: row.changed ? scenario.color : 'var(--color-panel-text)', fontWeight: row.changed ? 600 : 400 }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scenario.tempDelta >= 2 && (
        <div style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 6,
          background: 'rgba(196,78,63,0.06)', border: '1px solid rgba(196,78,63,0.15)',
          fontSize: 10, color: '#c44e3f', lineHeight: 1.5,
        }}>
          {'\u26A0'} At {scenario.label} warming, plant selection and water strategy must adapt significantly.
          Species at range limits may no longer be viable.
        </div>
      )}
    </div>
  );
}
