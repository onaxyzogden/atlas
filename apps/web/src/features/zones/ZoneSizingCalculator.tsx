/**
 * ZoneSizingCalculator — per-zone recommended size range
 * based on category and total property acreage.
 */

import { useMemo } from 'react';
import type { LandZone } from '../../store/zoneStore.js';
import { ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import { computeZoneSizing, ZONE_SIZING_DEFAULTS, type ZoneSizingResult } from './zoneAnalysis.js';
import p from '../../styles/panel.module.css';

interface ZoneSizingCalculatorProps {
  zones: LandZone[];
  totalAcreage: number | null;
}

export default function ZoneSizingCalculator({ zones, totalAcreage }: ZoneSizingCalculatorProps) {
  const sizing = useMemo(
    () => computeZoneSizing(zones, totalAcreage),
    [zones, totalAcreage],
  );

  if (!totalAcreage || totalAcreage <= 0) {
    return (
      <div className={p.card} style={{ opacity: 0.7 }}>
        <div className={p.cardTitle}>Zone Sizing</div>
        <div className={p.cardDesc}>Set project acreage to see sizing recommendations.</div>
      </div>
    );
  }

  if (sizing.length === 0) {
    return (
      <div className={p.card}>
        <div className={p.cardTitle}>Zone Sizing</div>
        <div className={p.cardDesc}>Draw zones to see how they compare to recommended ranges.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className={p.sectionLabel}>Zone Sizing Calculator</h3>
      <div className={p.section}>
        {sizing.map((s) => (
          <SizingRow key={s.zone.id} result={s} totalAcreage={totalAcreage} />
        ))}
      </div>
    </div>
  );
}

function SizingRow({ result, totalAcreage }: { result: ZoneSizingResult; totalAcreage: number }) {
  const { zone, actualAcres, minAcres, maxAcres, status } = result;
  const cfg = ZONE_CATEGORY_CONFIG[zone.category];
  const defaults = ZONE_SIZING_DEFAULTS[zone.category];

  const statusColor =
    status === 'within' ? 'var(--color-confidence-high, #2d7a4f)'
    : status === 'under' ? 'var(--color-warning-500, #ca8a04)'
    : 'var(--color-error-500, #c4493a)';

  const statusLabel =
    status === 'within' ? 'In range'
    : status === 'under' ? 'Under-sized'
    : 'Over-sized';

  // Progress bar: position within 0..maxAcres*1.2
  const barMax = maxAcres * 1.2;
  const actualPct = Math.min(100, (actualAcres / barMax) * 100);
  const minPct = (minAcres / barMax) * 100;
  const maxPct = (maxAcres / barMax) * 100;

  return (
    <div className={p.card} style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
          <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{zone.name}</span>
        </div>
        <span style={{ fontSize: '0.6875rem', color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
      </div>

      {/* Mini range bar */}
      <div style={{ position: 'relative', height: 6, background: 'var(--color-sand-100, #e5e0d5)', borderRadius: 3, marginBottom: 4 }}>
        {/* Recommended range highlight */}
        <div style={{
          position: 'absolute',
          left: `${minPct}%`,
          width: `${maxPct - minPct}%`,
          height: '100%',
          background: 'var(--color-sage-200, #c5d4bd)',
          borderRadius: 3,
        }} />
        {/* Actual position marker */}
        <div style={{
          position: 'absolute',
          left: `${actualPct}%`,
          top: -2,
          width: 4,
          height: 10,
          background: statusColor,
          borderRadius: 2,
          transform: 'translateX(-2px)',
        }} />
      </div>

      <div style={{ fontSize: '0.6875rem', color: 'var(--color-panel-muted, #8a8578)', lineHeight: 1.4 }}>
        {actualAcres.toFixed(2)} ac — recommend {minAcres.toFixed(1)}–{maxAcres.toFixed(1)} ac ({defaults.label})
      </div>
    </div>
  );
}
