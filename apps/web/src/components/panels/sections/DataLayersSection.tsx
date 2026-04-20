/**
 * Sprint BO — Data Layers footer section extracted from SiteIntelligencePanel.
 *
 * Renders the per-layer label/value/confidence rollup at the bottom of the
 * panel. Non-toggleable.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { DataLayerRow } from '../../../lib/computeScores.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { ConfBadge } from './_shared.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface DataLayersSectionProps {
  dataLayerRows: DataLayerRow[];
}

export const DataLayersSection = memo(function DataLayersSection({
  dataLayerRows,
}: DataLayersSectionProps) {
  return (
    <SectionProfiler id="site-intel-data-layers">
      <h3 className={p.sectionLabel}>Data Layers</h3>
      <div>
        {dataLayerRows.map((row) => (
          <div key={row.label} className={s.dataLayerRow}>
            <span className={p.valueSmall}>{row.label}</span>
            <div className={p.row}>
              <span className={`${p.valueSmall} ${p.value}`} style={{ fontWeight: 600 }}>{row.value}</span>
              <ConfBadge level={row.confidence} />
            </div>
          </div>
        ))}
      </div>
    </SectionProfiler>
  );
});
