/**
 * EnergyDemandRollup — §13 `energy-demand-notes`.
 *
 * Surfaces the steward-entered per-utility daily kWh placeholder as a total,
 * breaks it down by category (Energy · Water · Infrastructure), compares it
 * against an estimated solar supply derived from placed solar_panel count,
 * and flags the gap. Intentionally a placeholder model — not a forecast.
 *
 * Assumes ~2.5 kWh/day per placed solar_panel at 4.5 kWh/m²/day irradiance
 * and 18% efficiency (2 m² per residential panel). Swap in a real irradiance
 * value when NASA POWER data is wired into the panel context.
 */

import { useMemo } from 'react';
import type { Utility } from '../../store/utilityStore.js';
import { UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import { estimateSolarOutput } from './utilityAnalysis.js';
import p from '../../styles/panel.module.css';

interface Props {
  utilities: Utility[];
}

export default function EnergyDemandRollup({ utilities }: Props) {
  const rollup = useMemo(() => {
    const withDemand = utilities.filter(
      (u) => typeof u.demandKwhPerDay === 'number' && u.demandKwhPerDay > 0,
    );
    const total = withDemand.reduce((a, u) => a + (u.demandKwhPerDay ?? 0), 0);

    const byCategory = new Map<string, { total: number; count: number }>();
    for (const u of withDemand) {
      const cat = UTILITY_TYPE_CONFIG[u.type]?.category ?? 'Other';
      const prev = byCategory.get(cat) ?? { total: 0, count: 0 };
      byCategory.set(cat, { total: prev.total + (u.demandKwhPerDay ?? 0), count: prev.count + 1 });
    }

    const solarPanelCount = utilities.filter((u) => u.type === 'solar_panel').length;
    const solarEstimate = solarPanelCount > 0 ? estimateSolarOutput(solarPanelCount).dailyKwh : 0;
    const gap = solarEstimate - total;

    return {
      withDemandCount: withDemand.length,
      totalUtilities: utilities.length,
      total,
      byCategory,
      solarEstimate,
      gap,
    };
  }, [utilities]);

  if (utilities.length === 0) return null;

  const gapColor =
    rollup.total === 0
      ? 'var(--color-panel-muted)'
      : rollup.gap >= 0
        ? 'var(--color-confidence-high, #7a9e5b)'
        : 'var(--color-error, #c67050)';

  const gapLabel =
    rollup.total === 0
      ? 'Add demand values to see supply vs. load'
      : rollup.gap >= 0
        ? `+${rollup.gap.toFixed(1)} kWh/day surplus`
        : `${rollup.gap.toFixed(1)} kWh/day shortfall`;

  return (
    <div>
      <div className={p.sectionLabel}>Energy Demand</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div style={statCellStyle}>
          <div style={statValueStyle}>{rollup.total.toFixed(1)}</div>
          <div style={statLabelStyle}>kWh/day load</div>
        </div>
        <div style={statCellStyle}>
          <div style={statValueStyle}>{rollup.solarEstimate.toFixed(1)}</div>
          <div style={statLabelStyle}>kWh/day solar</div>
        </div>
        <div style={statCellStyle}>
          <div style={{ ...statValueStyle, color: gapColor }}>
            {rollup.total === 0 ? '\u2014' : `${rollup.gap >= 0 ? '+' : ''}${rollup.gap.toFixed(1)}`}
          </div>
          <div style={statLabelStyle}>net kWh/day</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: gapColor, marginBottom: 8 }}>{gapLabel}</div>

      {rollup.byCategory.size > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 6 }}>
            Load by category
          </div>
          {Array.from(rollup.byCategory.entries())
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([cat, data]) => {
              const pct = rollup.total > 0 ? (data.total / rollup.total) * 100 : 0;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, minWidth: 70, color: 'var(--color-panel-text)' }}>{cat}</span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(180, 165, 140, 0.12)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(var(--color-gold-rgb), 0.65)' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--color-panel-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>
                    {data.total.toFixed(1)} kWh ({data.count})
                  </span>
                </div>
              );
            })}
        </>
      )}

      <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginTop: 10, lineHeight: 1.5 }}>
        {rollup.withDemandCount} of {rollup.totalUtilities} utilities have demand set. Solar estimate assumes {'\u224B'}2.5 kWh/day per placed solar panel at 4.5 kWh/m{'\u00B2'}/day irradiance. Update each utility's demand note in the placement modal.
      </div>
    </div>
  );
}

const statCellStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'rgba(20, 22, 20, 0.45)',
  border: '1px solid rgba(180, 165, 140, 0.12)',
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  alignItems: 'flex-start',
};

const statValueStyle: React.CSSProperties = {
  fontFamily: "var(--font-display, 'Lora', Georgia, serif)",
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--color-panel-text)',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-panel-muted)',
};
