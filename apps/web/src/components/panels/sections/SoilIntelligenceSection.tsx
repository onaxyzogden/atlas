/**
 * Sprint BL — Soil Intelligence section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint G soil card: pH, organic matter, CEC, texture, bulk density,
 * permeability (ksat), CaCO3, coarse fragments, rooting depth, carbon stock,
 * and WRB classification. Source: SSURGO (US) / SLC (CA) / ISRIC SoilGrids.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { getSoilPhColor, getCompactionColor } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface SoilMetrics {
  ph: number | null;
  organicMatterPct: number | null;
  cecMeq: number | null;
  bulkDensity: number | null;
  ksatUmS: number | null;
  caco3Pct: number | null;
  coarseFragmentPct: number | null;
  awcCmCm: number | null;
  textureClass: string | null;
  drainageClass: string | null;
  rootingDepthCm: number | null;
  carbonStockTCHa: number | null;
  wrbClass: string | null;
}

export interface SoilIntelligenceSectionProps {
  soilMetrics: SoilMetrics | null;
  soilOpen: boolean;
  onToggleSoil: () => void;
}

export const SoilIntelligenceSection = memo(function SoilIntelligenceSection({
  soilMetrics,
  soilOpen,
  onToggleSoil,
}: SoilIntelligenceSectionProps) {
  if (!soilMetrics) return null;

  return (
    <SectionProfiler id="site-intel-soil">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleSoil}
          className={`${s.liveDataHeader} ${soilOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>◉</span>
          <span className={s.liveDataTitle}>Soil Intelligence</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!soilOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {soilOpen && (
          <div className={p.innerPad}>
            {soilMetrics.ph != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>pH</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge}
                    style={{ background: `${getSoilPhColor(soilMetrics.ph)}18`,
                             color: getSoilPhColor(soilMetrics.ph) }}>
                    {soilMetrics.ph.toFixed(1)}
                  </span>
                </div>
                <span className={s.flagSource}>
                  {soilMetrics.ph >= 6.0 && soilMetrics.ph <= 7.5 ? 'Ideal'
                    : soilMetrics.ph >= 5.5 && soilMetrics.ph <= 8.0 ? 'Marginal' : 'Limiting'}
                </span>
              </div>
            )}
            {soilMetrics.organicMatterPct != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Organic Matter</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.organicMatterPct.toFixed(1)}%
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.organicMatterPct > 5 ? 'High' : soilMetrics.organicMatterPct > 3 ? 'Good' : soilMetrics.organicMatterPct > 2 ? 'Moderate' : 'Low'}
                </span>
              </div>
            )}
            {soilMetrics.cecMeq != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>CEC</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.cecMeq.toFixed(1)} meq/100g
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.cecMeq >= 15 ? 'High fertility' : soilMetrics.cecMeq >= 5 ? 'Moderate' : 'Low'}
                </span>
              </div>
            )}
            {soilMetrics.textureClass && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Texture</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.textureClass}
                </span>
                <span className={s.flagSource}>SSURGO</span>
              </div>
            )}
            {soilMetrics.bulkDensity != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Bulk Density</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge}
                    style={{ background: `${getCompactionColor(soilMetrics.bulkDensity)}18`,
                             color: getCompactionColor(soilMetrics.bulkDensity) }}>
                    {soilMetrics.bulkDensity.toFixed(2)} g/cm3
                  </span>
                </div>
                <span className={s.flagSource}>
                  {soilMetrics.bulkDensity <= 1.3 ? 'No risk' : soilMetrics.bulkDensity <= 1.5 ? 'Slight' : 'Compacted'}
                </span>
              </div>
            )}
            {soilMetrics.ksatUmS != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Permeability</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.ksatUmS.toFixed(1)} um/s
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.ksatUmS >= 10 && soilMetrics.ksatUmS <= 100 ? 'Moderate'
                    : soilMetrics.ksatUmS < 1 ? 'Very slow' : soilMetrics.ksatUmS > 300 ? 'Rapid' : 'Variable'}
                </span>
              </div>
            )}
            {soilMetrics.caco3Pct != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>CaCO3</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.caco3Pct.toFixed(1)}%
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.caco3Pct < 5 ? 'Non-calcareous' : soilMetrics.caco3Pct < 15 ? 'Moderate' : 'Calcareous'}
                </span>
              </div>
            )}
            {soilMetrics.coarseFragmentPct != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Coarse Fragments</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: soilMetrics.coarseFragmentPct < 15 ? confidence.high
                    : soilMetrics.coarseFragmentPct < 35 ? confidence.medium
                    : confidence.low,
                }}>
                  {soilMetrics.coarseFragmentPct.toFixed(1)}%
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.coarseFragmentPct < 15 ? 'Optimal'
                    : soilMetrics.coarseFragmentPct < 35 ? 'Moderate'
                    : soilMetrics.coarseFragmentPct < 55 ? 'Severe'
                    : 'Not suited'}
                </span>
              </div>
            )}
            {soilMetrics.rootingDepthCm != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Rooting Depth</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.rootingDepthCm} cm
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.rootingDepthCm >= 100 ? 'Deep' : soilMetrics.rootingDepthCm >= 50 ? 'Moderate' : 'Shallow'}
                </span>
              </div>
            )}
            {soilMetrics.carbonStockTCHa != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Carbon Stock</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: soilMetrics.carbonStockTCHa >= 80 ? confidence.high
                    : soilMetrics.carbonStockTCHa >= 40 ? confidence.medium
                    : confidence.low,
                }}>
                  {soilMetrics.carbonStockTCHa} tC/ha
                </span>
                <span className={s.flagSource}>
                  {soilMetrics.carbonStockTCHa >= 80 ? 'High' : soilMetrics.carbonStockTCHa >= 40 ? 'Moderate' : 'Low'}
                </span>
              </div>
            )}
            {soilMetrics.wrbClass && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>WRB Class</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {soilMetrics.wrbClass}
                </span>
                <span className={s.flagSource}>Intl. standard</span>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
