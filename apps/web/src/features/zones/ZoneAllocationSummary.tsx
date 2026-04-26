/**
 * ZoneAllocationSummary — total property area broken down by zone category,
 * with stacked bar and percentage allocated vs unallocated.
 */

import { useMemo } from 'react';
import type { LandZone, ZoneCategory } from '../../store/zoneStore.js';
import { ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import { computeAllocation } from './zoneAnalysis.js';
import p from '../../styles/panel.module.css';

interface ZoneAllocationSummaryProps {
  zones: LandZone[];
  totalAcreage: number | null;
}

export default function ZoneAllocationSummary({ zones, totalAcreage }: ZoneAllocationSummaryProps) {
  const allocation = useMemo(
    () => computeAllocation(zones, totalAcreage, ZONE_CATEGORY_CONFIG),
    [zones, totalAcreage],
  );

  if (zones.length === 0) {
    return (
      <div className={p.card} style={{ opacity: 0.7 }}>
        <div className={p.cardTitle}>Allocation Summary</div>
        <div className={p.cardDesc}>Draw zones to see land allocation breakdown.</div>
      </div>
    );
  }

  const hasProperty = allocation.totalPropertyM2 > 0;

  return (
    <div>
      <h3 className={p.sectionLabel}>Allocation Summary</h3>

      {/* Stacked bar */}
      {hasProperty && (
        <div style={{ height: 10, display: 'flex', borderRadius: 5, overflow: 'hidden', marginBottom: 8, background: 'var(--color-sand-100, #e5e0d5)' }}>
          {allocation.entries.map((e) => (
            // a11y: keyboard tooltip deferred — see accessibility-audit.md §5
            // (stacked-bar segments: adding tabstops for every slice would spam focus order)
            <div
              key={e.category}
              style={{
                width: `${e.pct}%`,
                background: e.color,
                minWidth: e.pct > 0.5 ? 2 : 0,
              }}
              title={`${e.label}: ${e.pct.toFixed(1)}%`}
            />
          ))}
        </div>
      )}

      {/* Summary line */}
      {hasProperty && (
        <div className={p.card} style={{ padding: '8px 10px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span>
              Zoned: <strong>{allocation.zonedPct.toFixed(1)}%</strong>
            </span>
            <span style={{ color: 'var(--color-panel-muted, #8a8578)' }}>
              Unallocated: {(allocation.unallocatedM2 / 4046.86).toFixed(2)} ac
            </span>
          </div>
        </div>
      )}

      {!hasProperty && (
        <div className={p.card} style={{ padding: '8px 10px', marginBottom: 8, opacity: 0.7 }}>
          <div style={{ fontSize: '0.8125rem' }}>
            Set project acreage to see allocation percentages.
          </div>
        </div>
      )}

      {/* Category table */}
      <div className={p.section}>
        {allocation.entries.map((e) => (
          <div key={e.category} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.8125rem' }}>{e.label}</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display, monospace)', color: 'var(--color-panel-muted, #8a8578)' }}>
              {e.acres.toFixed(2)} ac
            </span>
            {hasProperty && (
              <span style={{ fontSize: '0.6875rem', width: 42, textAlign: 'right', color: 'var(--color-panel-muted, #8a8578)' }}>
                {e.pct.toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
