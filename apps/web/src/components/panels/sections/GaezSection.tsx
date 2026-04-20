/**
 * Sprint BP — FAO GAEZ v4 agro-climatic suitability section extracted from
 * SiteIntelligencePanel.
 *
 * Sprint BI — FAO GAEZ v4 5-arc-min regional prior. Non-toggleable but has
 * fragment wrapper + inline `enabled`/`!enabled` sub-structure.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface GaezTop3Crop {
  crop: string;
  yieldKgHa: number | null;
  suitability: string;
}

export interface GaezMetrics {
  enabled: boolean;
  message?: string | null;
  attribution?: string | null;
  bestCrop?: string | null;
  bestManagement?: string | null;
  primaryClass?: string;
  attainableYield?: number | null;
  top3?: GaezTop3Crop[];
  resolutionNote?: string | null;
  licenseNote?: string | null;
  source?: string;
}

export interface GaezSectionProps {
  gaezMetrics: GaezMetrics | null;
}

export const GaezSection = memo(function GaezSection({ gaezMetrics }: GaezSectionProps) {
  if (!gaezMetrics) return null;

  return (
    <SectionProfiler id="site-intel-gaez">
      <h3 className={p.sectionLabel}>
        Agro-Climatic Suitability (FAO GAEZ v4)
        <span className={s.flagSource} style={{ marginLeft: 8, fontWeight: 400 }}>
          Regional prior &middot; 5 arc-min
        </span>
      </h3>
      {!gaezMetrics.enabled && (
        <div className={`${s.liveDataWrap} ${p.mb20}`}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Status</span>
            <span className={s.liveDataValue}>Not available on this deployment</span>
          </div>
          {gaezMetrics.message && (
            <div className={`${s.flagSource} ${p.mt4}`}>{gaezMetrics.message}</div>
          )}
          {gaezMetrics.attribution && (
            <div className={s.flagSource} style={{ marginTop: 4, fontStyle: 'italic' }}>
              {gaezMetrics.attribution}
            </div>
          )}
        </div>
      )}
      {gaezMetrics.enabled && (
        <div className={`${s.liveDataWrap} ${p.mb20}`}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Best crop</span>
            <span className={s.liveDataValue}>
              {gaezMetrics.bestCrop
                ? gaezMetrics.bestCrop.replace(/_/g, ' ')
                : '\u2014'}
              {gaezMetrics.bestManagement && (
                <span className={s.flagSource} style={{ marginLeft: 6 }}>
                  {gaezMetrics.bestManagement.replace(/_/g, ' / ')}
                </span>
              )}
            </span>
          </div>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Suitability</span>
            <span className={s.liveDataValue}>
              <span
                className={s.scoreBadge}
                style={{
                  background: `${
                    gaezMetrics.primaryClass === 'S1' ? confidence.high
                    : gaezMetrics.primaryClass === 'S2' ? confidence.medium
                    : gaezMetrics.primaryClass === 'S3' ? confidence.low
                    : confidence.low
                  }18`,
                  color: gaezMetrics.primaryClass === 'S1' ? confidence.high
                    : gaezMetrics.primaryClass === 'S2' ? confidence.medium
                    : confidence.low,
                }}
              >
                {gaezMetrics.primaryClass}
              </span>
            </span>
          </div>
          {gaezMetrics.attainableYield != null && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Attainable yield (best)</span>
              <span className={s.liveDataValue}>
                {(gaezMetrics.attainableYield as number).toLocaleString()} kg/ha/yr
              </span>
            </div>
          )}
          {(gaezMetrics.top3 ?? []).length > 0 && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Top 3 crops</span>
              <span className={s.liveDataValue}>
                {(gaezMetrics.top3 ?? []).map((r, i) => (
                  <span key={r.crop}>
                    {i > 0 ? ' \u00b7 ' : ''}
                    {r.crop.replace(/_/g, ' ')}
                    {r.yieldKgHa !== null && (
                      <span className={s.flagSource}> ({r.yieldKgHa.toLocaleString()} kg/ha, {r.suitability})</span>
                    )}
                  </span>
                ))}
              </span>
            </div>
          )}
          {gaezMetrics.resolutionNote && (
            <div className={`${s.flagSource} ${p.mt4}`}>{gaezMetrics.resolutionNote}</div>
          )}
          {gaezMetrics.attribution && (
            <div className={s.flagSource} style={{ marginTop: 4, fontStyle: 'italic' }}>
              {gaezMetrics.attribution}
            </div>
          )}
        </div>
      )}
    </SectionProfiler>
  );
});
