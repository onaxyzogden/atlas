/**
 * EnergyDemandRollup — §13 `energy-demand-notes`.
 *
 * Surfaces site-wide daily kWh load as a total, breaks it down by source
 * (Energy · Water · Infrastructure · Structures), compares against an
 * estimated solar supply derived from placed solar_panel count, and flags
 * the gap.
 *
 * Loads come from per-type defaults in `@ogden/shared/demand` for both
 * placed utilities (well_pump, lighting, laundry_station, …) and structures
 * (cabin, bathhouse, greenhouse, …). Steward-entered `demandKwhPerDay`
 * on a utility overrides its default. Solar generation uses NASA POWER
 * `solar_radiation_kwh_m2_day` from the climate layer when the parent
 * threads it through `solarIrradianceKwhM2Day`; falls back to a 4.5
 * kWh/m²/day temperate-zone baseline otherwise.
 */

import { useMemo } from 'react';
import {
  getStructureKwhPerDay,
  getUtilityKwhPerDay,
} from '@ogden/shared/demand';
import type { Utility } from '../../store/utilityStore.js';
import { UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import type { Structure } from '../../store/structureStore.js';
import { estimateSolarOutput } from './utilityAnalysis.js';
import p from '../../styles/panel.module.css';

interface Props {
  utilities: Utility[];
  /** Placed structures contributing to daily load (cabin, bathhouse, greenhouse, …). */
  structures?: Structure[];
  /** NASA POWER irradiance (kWh/m²/day) when the climate layer is loaded. */
  solarIrradianceKwhM2Day?: number;
}

export default function EnergyDemandRollup({ utilities, structures = [], solarIrradianceKwhM2Day }: Props) {
  const rollup = useMemo(() => {
    // Per-utility load (default for the type, override when steward set demandKwhPerDay)
    const utilLoads = utilities.map((u) => ({
      utility: u,
      kwh: getUtilityKwhPerDay(u),
    }));
    const utilityTotal = utilLoads.reduce((a, x) => a + x.kwh, 0);

    // Per-structure load
    const structLoads = structures.map((s) => ({
      structure: s,
      kwh: getStructureKwhPerDay(s),
    }));
    const structureTotal = structLoads.reduce((a, x) => a + x.kwh, 0);

    const total = utilityTotal + structureTotal;

    const byCategory = new Map<string, { total: number; count: number }>();
    for (const { utility: u, kwh } of utilLoads) {
      if (kwh <= 0) continue;
      const cat = UTILITY_TYPE_CONFIG[u.type]?.category ?? 'Other';
      const prev = byCategory.get(cat) ?? { total: 0, count: 0 };
      byCategory.set(cat, { total: prev.total + kwh, count: prev.count + 1 });
    }
    if (structureTotal > 0) {
      const structCount = structLoads.filter((x) => x.kwh > 0).length;
      byCategory.set('Structures', { total: structureTotal, count: structCount });
    }

    const utilitiesWithLoadCount = utilLoads.filter((x) => x.kwh > 0).length;

    const solarPanelCount = utilities.filter((u) => u.type === 'solar_panel').length;
    const solarSample = solarPanelCount > 0
      ? estimateSolarOutput(solarPanelCount, solarIrradianceKwhM2Day)
      : null;
    const solarEstimate = solarSample?.dailyKwh ?? 0;
    const irradianceUsed = solarSample?.avgIrradiance ?? (solarIrradianceKwhM2Day ?? 4.5);
    const gap = solarEstimate - total;

    return {
      withDemandCount: utilitiesWithLoadCount,
      totalUtilities: utilities.length,
      structureLoadCount: structLoads.filter((x) => x.kwh > 0).length,
      total,
      byCategory,
      solarEstimate,
      gap,
      irradianceUsed,
      irradianceFromClimateLayer: typeof solarIrradianceKwhM2Day === 'number' && solarIrradianceKwhM2Day > 0,
    };
  }, [utilities, structures, solarIrradianceKwhM2Day]);

  if (utilities.length === 0 && structures.length === 0) return null;

  const gapColor =
    rollup.total === 0
      ? 'var(--color-panel-muted)'
      : rollup.gap >= 0
        ? 'var(--color-confidence-high, #7a9e5b)'
        : 'var(--color-error, #c67050)';

  const gapLabel =
    rollup.total === 0
      ? 'Place utilities or structures to see supply vs. load'
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
            {rollup.total === 0 ? '—' : `${rollup.gap >= 0 ? '+' : ''}${rollup.gap.toFixed(1)}`}
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
        {rollup.withDemandCount} of {rollup.totalUtilities} utilities and {rollup.structureLoadCount} of {structures.length} structures contributing load.
        Loads use per-type defaults from <code>@ogden/shared/demand</code>; per-utility <em>demandKwhPerDay</em> overrides its default. Solar estimate assumes ~2 m{'²'} per placed panel at {rollup.irradianceUsed.toFixed(1)} kWh/m{'²'}/day irradiance{rollup.irradianceFromClimateLayer ? ' (NASA POWER).' : ' (temperate-zone default — load climate layer for site-specific value).'}
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
  fontFamily: 'var(--font-display)',
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
