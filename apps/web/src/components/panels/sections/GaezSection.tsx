/**
 * Sprint BP — FAO GAEZ v4 agro-climatic suitability section extracted from
 * SiteIntelligencePanel.
 *
 * Sprint BI — FAO GAEZ v4 5-arc-min regional prior. Non-toggleable but has
 * fragment wrapper + inline `enabled`/`!enabled` sub-structure.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo, useState } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

// Sprint BZ — suitability-class → token color mapping for badges in the
// 47-row full-ranking disclosure. Mirrors the existing inline ternary at
// the "Suitability" row (S1=high, S2=medium, S3/N/NS/WATER/UNKNOWN=low).
// Kept module-local; if this pattern spreads, promote to tokens.ts.
function suitabilityColor(cls: string): string {
  if (cls === 'S1') return confidence.high;
  if (cls === 'S2') return confidence.medium;
  return confidence.low;
}

export interface GaezTop3Crop {
  crop: string;
  yieldKgHa: number | null;
  suitability: string;
}

export interface GaezCropRow {
  crop: string;
  label: string;
  waterSupply: string;
  inputLevel: string;
  suitabilityClass: string;
  attainableYield: number | null;
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
  fullRanking?: GaezCropRow[];
  resolutionNote?: string | null;
  licenseNote?: string | null;
  source?: string;
}

export interface GaezSectionProps {
  gaezMetrics: GaezMetrics | null;
}

export const GaezSection = memo(function GaezSection({ gaezMetrics }: GaezSectionProps) {
  const [fullOpen, setFullOpen] = useState(false);
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
          {(gaezMetrics.fullRanking ?? []).length > 0 && (
            <div className={p.mt8}>
              <button
                type="button"
                onClick={() => setFullOpen((v) => !v)}
                className={`${s.liveDataHeader} ${fullOpen ? s.liveDataHeaderOpen : ''}`}
                aria-expanded={fullOpen}
              >
                <span className={s.liveDataTitle}>
                  Full crop ranking ({gaezMetrics.fullRanking!.length})
                </span>
                <div className={p.flex1} />
                <svg
                  className={`${s.chevron} ${!fullOpen ? s.chevronClosed : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path d="M3 5l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {fullOpen && (
                <div className={p.innerPad}>
                  {gaezMetrics.fullRanking!.map((row) => {
                    const color = suitabilityColor(row.suitabilityClass);
                    return (
                      <div
                        key={`${row.crop}-${row.waterSupply}-${row.inputLevel}`}
                        className={s.liveDataRow}
                      >
                        <span className={s.liveDataLabel} style={{ textTransform: 'capitalize' }}>
                          {row.label}
                        </span>
                        <span className={s.liveDataValue}>
                          <span
                            className={s.scoreBadge}
                            style={{ background: `${color}18`, color, marginRight: 6 }}
                          >
                            {row.suitabilityClass}
                          </span>
                          {row.attainableYield !== null
                            ? `${row.attainableYield.toLocaleString()} kg/ha`
                            : '\u2014'}
                          <span className={s.flagSource} style={{ marginLeft: 6 }}>
                            {row.waterSupply === 'rainfed' ? 'rain-fed' : row.waterSupply || '\u2014'}
                            {row.inputLevel ? `, ${row.inputLevel} input` : ''}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
