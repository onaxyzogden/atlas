/**
 * ZoneConflictDetector — identifies overlaps, incompatible adjacencies,
 * and regulatory conflicts between drawn zones.
 */

import { useMemo } from 'react';
import type { LandZone } from '../../store/zoneStore.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { getLayerSummary } from '../../store/siteDataStore.js';
import { detectZoneConflicts, type ZoneConflict } from './zoneAnalysis.js';
import p from '../../styles/panel.module.css';

interface ZoneConflictDetectorProps {
  zones: LandZone[];
  siteData: SiteData | null;
}

export default function ZoneConflictDetector({ zones, siteData }: ZoneConflictDetectorProps) {
  const conflicts = useMemo(() => {
    if (zones.length < 2) return [];
    const zoningLayer = siteData ? getLayerSummary<Record<string, unknown>>(siteData, 'zoning') : null;
    return detectZoneConflicts(zones, zoningLayer);
  }, [zones, siteData]);

  if (zones.length < 2) {
    return (
      <div className={p.card} style={{ opacity: 0.7 }}>
        <div className={p.cardTitle}>Conflict Detection</div>
        <div className={p.cardDesc}>Draw at least two zones to check for conflicts.</div>
      </div>
    );
  }

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');
  const infos = conflicts.filter((c) => c.severity === 'info');

  return (
    <div>
      <h3 className={p.sectionLabel}>
        Conflict Detection
        {conflicts.length > 0 && (
          <span style={{ fontWeight: 400, fontSize: '0.75rem', marginLeft: 6, opacity: 0.7 }}>
            {conflicts.length} found
          </span>
        )}
      </h3>

      {conflicts.length === 0 && (
        <div className={p.card} style={{ borderLeft: '3px solid var(--color-confidence-high, #2d7a4f)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-confidence-high, #2d7a4f)', fontWeight: 500 }}>
            No conflicts detected
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-panel-muted, #8a8578)', marginTop: 2 }}>
            All {zones.length} zones pass overlap, adjacency, and regulatory checks.
          </div>
        </div>
      )}

      <div className={p.section}>
        {errors.map((c, i) => (
          <ConflictCard key={`e${i}`} conflict={c} />
        ))}
        {warnings.map((c, i) => (
          <ConflictCard key={`w${i}`} conflict={c} />
        ))}
        {infos.map((c, i) => (
          <ConflictCard key={`i${i}`} conflict={c} />
        ))}
      </div>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: ZoneConflict }) {
  const borderColor =
    conflict.severity === 'error' ? 'var(--color-error-500, #c4493a)'
    : conflict.severity === 'warning' ? 'var(--color-warning-500, #ca8a04)'
    : 'var(--color-water-400, #5a8a9a)';

  const bgColor =
    conflict.severity === 'error' ? 'rgba(196, 73, 58, 0.06)'
    : conflict.severity === 'warning' ? 'rgba(202, 138, 4, 0.06)'
    : 'rgba(90, 138, 154, 0.04)';

  const typeLabel =
    conflict.type === 'overlap' ? 'Overlap'
    : conflict.type === 'adjacency' ? 'Adjacency'
    : 'Regulatory';

  return (
    <div className={p.card} style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor, padding: '8px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: borderColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {typeLabel}
        </span>
        <span style={{ fontSize: '0.625rem', color: borderColor, fontWeight: 500 }}>
          {conflict.severity}
        </span>
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
        {conflict.description}
      </div>
    </div>
  );
}
