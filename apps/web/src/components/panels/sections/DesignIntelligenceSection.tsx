/**
 * Sprint BL — Design Intelligence section extracted from SiteIntelligencePanel.
 *
 * Renders the multi-subsystem design rollup: passive solar, windbreak,
 * water harvesting (swales + ponds), septic suitability, shadow modeling,
 * rainwater harvesting sizing, pond volume estimate, fire risk zoning,
 * footprint optimization, and compost siting.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { DesignIntelligenceResult } from '../../../lib/designIntelligence.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface DesignIntelligenceSectionProps {
  designIntelligence: DesignIntelligenceResult | null;
  diOpen: boolean;
  onToggleDi: () => void;
}

export const DesignIntelligenceSection = memo(function DesignIntelligenceSection({
  designIntelligence,
  diOpen,
  onToggleDi,
}: DesignIntelligenceSectionProps) {
  if (!designIntelligence) return null;
  const hasAny = designIntelligence.passiveSolar
    || designIntelligence.windbreak
    || designIntelligence.waterHarvesting
    || designIntelligence.septic
    || designIntelligence.shadow
    || designIntelligence.rwh
    || designIntelligence.pondVolume
    || designIntelligence.fireRisk
    || designIntelligence.footprint
    || designIntelligence.compostSiting;
  if (!hasAny) return null;

  return (
    <SectionProfiler id="site-intel-design">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleDi}
          className={`${s.liveDataHeader} ${diOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9670;</span>
          <span className={s.liveDataTitle}>Design Intelligence</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!diOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {diOpen && (
          <div className={p.innerPad}>
            {/* Passive Solar */}
            {designIntelligence.passiveSolar && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Passive Solar</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.passiveSolar.solarAdvantage === 'Excellent' || designIntelligence.passiveSolar.solarAdvantage === 'Good' ? confidence.high : designIntelligence.passiveSolar.solarAdvantage === 'Moderate' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.passiveSolar.solarAdvantage === 'Excellent' || designIntelligence.passiveSolar.solarAdvantage === 'Good' ? confidence.high : designIntelligence.passiveSolar.solarAdvantage === 'Moderate' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.passiveSolar.solarAdvantage}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.passiveSolar.currentAspect}-facing</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Building Orient.</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  Long axis E–W, glazing faces {designIntelligence.passiveSolar.optimalAspect}
                </span>
              </div>
              <div className={p.detailText}>
                {designIntelligence.passiveSolar.recommendation}
              </div>
            </>)}
            {/* Windbreak */}
            {designIntelligence.windbreak && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Windbreak</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  Orient {designIntelligence.windbreak.windbreakOrientation}
                </span>
                <span className={s.flagSource}>{designIntelligence.windbreak.primaryWindDir} prevailing</span>
              </div>
              {designIntelligence.windbreak.secondaryWindDir && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Secondary Wind</span>
                  <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right', opacity: 0.8 }}>
                    {designIntelligence.windbreak.secondaryWindDir}
                  </span>
                  <span className={s.flagSource}>consider L-shape</span>
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.windbreak.recommendation}
              </div>
            </>)}
            {/* Water Harvesting — swales + ponds */}
            {designIntelligence.waterHarvesting && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Swale Sites</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.waterHarvesting.swaleRating === 'Excellent' || designIntelligence.waterHarvesting.swaleRating === 'Good' ? confidence.high : designIntelligence.waterHarvesting.swaleRating === 'Fair' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.waterHarvesting.swaleRating === 'Excellent' || designIntelligence.waterHarvesting.swaleRating === 'Good' ? confidence.high : designIntelligence.waterHarvesting.swaleRating === 'Fair' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.waterHarvesting.swaleRating}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.waterHarvesting.swaleCandidateCount} candidate{designIntelligence.waterHarvesting.swaleCandidateCount !== 1 ? 's' : ''}</span>
              </div>
              {designIntelligence.waterHarvesting.topSwale && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Best Swale</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                    {designIntelligence.waterHarvesting.topSwale.meanSlope.toFixed(1)}° slope · {designIntelligence.waterHarvesting.topSwale.elevation.toFixed(0)} m elev
                  </span>
                  <span className={s.flagSource}>score {designIntelligence.waterHarvesting.topSwale.suitabilityScore}</span>
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.waterHarvesting.swaleRecommendation}
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Pond Sites</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.waterHarvesting.pondRating === 'Excellent' || designIntelligence.waterHarvesting.pondRating === 'Good' ? confidence.high : designIntelligence.waterHarvesting.pondRating === 'Fair' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.waterHarvesting.pondRating === 'Excellent' || designIntelligence.waterHarvesting.pondRating === 'Good' ? confidence.high : designIntelligence.waterHarvesting.pondRating === 'Fair' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.waterHarvesting.pondRating}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.waterHarvesting.pondCandidateCount} candidate{designIntelligence.waterHarvesting.pondCandidateCount !== 1 ? 's' : ''}</span>
              </div>
              {designIntelligence.waterHarvesting.topPond && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Best Pond</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                    {designIntelligence.waterHarvesting.topPond.meanSlope.toFixed(1)}° slope · acc {designIntelligence.waterHarvesting.topPond.meanAccumulation.toFixed(0)}
                  </span>
                  <span className={s.flagSource}>score {designIntelligence.waterHarvesting.topPond.suitabilityScore}</span>
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.waterHarvesting.pondRecommendation}
              </div>
            </>)}
            {/* Septic / Leach Field Suitability */}
            {designIntelligence.septic && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Septic</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.septic.septicRating === 'Excellent' || designIntelligence.septic.septicRating === 'Good' ? confidence.high : designIntelligence.septic.septicRating === 'Marginal' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.septic.septicRating === 'Excellent' || designIntelligence.septic.septicRating === 'Good' ? confidence.high : designIntelligence.septic.septicRating === 'Marginal' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.septic.septicRating}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.septic.recommendedSystem}</span>
              </div>
              {designIntelligence.septic.limitingFactors.length > 0 && (
                <div style={{ padding: '2px 8px', fontSize: 11, color: 'var(--color-panel-muted, #888)' }}>
                  {designIntelligence.septic.limitingFactors.map((f, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>• {f}</div>
                  ))}
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.septic.recommendation}
              </div>
            </>)}
            {/* Shadow / Shade Modeling */}
            {designIntelligence.shadow && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Sun Access</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.shadow.sunAccessRating === 'Excellent' || designIntelligence.shadow.sunAccessRating === 'Good' ? confidence.high : designIntelligence.shadow.sunAccessRating === 'Limited' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.shadow.sunAccessRating === 'Excellent' || designIntelligence.shadow.sunAccessRating === 'Good' ? confidence.high : designIntelligence.shadow.sunAccessRating === 'Limited' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.shadow.sunAccessRating}
                  </span>
                </div>
                <span className={s.flagSource}>annual</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Winter Noon Sun</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: designIntelligence.shadow.winterShadeRisk === 'Low' ? confidence.high
                    : designIntelligence.shadow.winterShadeRisk === 'Moderate' ? confidence.medium
                    : confidence.low,
                }}>
                  {designIntelligence.shadow.winterNoonAltitude}°
                </span>
                <span className={s.flagSource}>{designIntelligence.shadow.winterShadeRisk} shade</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Summer Noon Sun</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {designIntelligence.shadow.summerNoonAltitude}°
                </span>
                <span className={s.flagSource}>Jun 21</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Equinox Noon Sun</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {designIntelligence.shadow.equinoxNoonAltitude}°
                </span>
                <span className={s.flagSource}>Mar/Sep 21</span>
              </div>
              <div className={p.detailText}>
                {designIntelligence.shadow.recommendation}
              </div>
            </>)}
            {/* Rainwater Harvesting Sizing */}
            {designIntelligence.rwh && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>RWH Potential</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.rwh.rwhRating === 'Excellent' || designIntelligence.rwh.rwhRating === 'Good' ? confidence.high : designIntelligence.rwh.rwhRating === 'Limited' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.rwh.rwhRating === 'Excellent' || designIntelligence.rwh.rwhRating === 'Good' ? confidence.high : designIntelligence.rwh.rwhRating === 'Limited' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.rwh.rwhRating}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.rwh.annualPrecipMm.toFixed(0)} mm/yr</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Yield / 100 m² roof</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {designIntelligence.rwh.harvestPer100m2Liters.toLocaleString()} L/yr
                </span>
                <span className={s.flagSource}>{designIntelligence.rwh.harvestPer100m2M3} m³</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Typical Farmhouse</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {designIntelligence.rwh.typicalFarmhouseM3} m³/yr
                </span>
                <span className={s.flagSource}>{designIntelligence.rwh.daysOfHouseholdSupply} days supply</span>
              </div>
              <div className={p.detailText}>
                {designIntelligence.rwh.recommendation}
              </div>
            </>)}
            {/* Pond Volume Estimate */}
            {designIntelligence.pondVolume && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Pond Volume</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.pondVolume.volumeRating === 'Large' ? confidence.high : designIntelligence.pondVolume.volumeRating === 'Medium' ? confidence.high : designIntelligence.pondVolume.volumeRating === 'Small' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.pondVolume.volumeRating === 'Large' ? confidence.high : designIntelligence.pondVolume.volumeRating === 'Medium' ? confidence.high : designIntelligence.pondVolume.volumeRating === 'Small' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.pondVolume.volumeRating}
                  </span>
                </div>
                <span className={s.flagSource}>{designIntelligence.pondVolume.estimatedVolumeM3.toLocaleString()} m³</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Est. Dimensions</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {designIntelligence.pondVolume.estimatedAreaM2.toLocaleString()} m² × {designIntelligence.pondVolume.estimatedDepthM} m
                </span>
                <span className={s.flagSource}>~{designIntelligence.pondVolume.estimatedGallonsUs.toLocaleString()} gal</span>
              </div>
              <div className={p.detailText}>
                {designIntelligence.pondVolume.recommendation}
              </div>
            </>)}
            {/* Fire Risk Zoning */}
            {designIntelligence.fireRisk && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Fire Risk</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.fireRisk.fireRiskClass === 'Low' ? confidence.high : designIntelligence.fireRisk.fireRiskClass === 'Moderate' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.fireRisk.fireRiskClass === 'Low' ? confidence.high : designIntelligence.fireRisk.fireRiskClass === 'Moderate' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.fireRisk.fireRiskClass}
                  </span>
                </div>
                <span className={s.flagSource}>score {designIntelligence.fireRisk.compositeScore}</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Fuel Loading</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {designIntelligence.fireRisk.fuelLoading}/100
                </span>
                <span className={s.flagSource}>land cover</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Slope / Wind Factor</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {designIntelligence.fireRisk.slopeFactor.toFixed(2)}× / {designIntelligence.fireRisk.windFactor.toFixed(2)}×
                </span>
                <span className={s.flagSource}>spread multipliers</span>
              </div>
              <div className={p.detailText}>
                {designIntelligence.fireRisk.recommendation}
              </div>
            </>)}
            {/* Footprint Optimization */}
            {designIntelligence.footprint && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Footprint Quality</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.footprint.rating === 'Excellent' || designIntelligence.footprint.rating === 'Good' ? confidence.high : designIntelligence.footprint.rating === 'Marginal' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.footprint.rating === 'Excellent' || designIntelligence.footprint.rating === 'Good' ? confidence.high : designIntelligence.footprint.rating === 'Marginal' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.footprint.rating}
                  </span>
                </div>
                <span className={s.flagSource}>score {designIntelligence.footprint.compositeScore}/100</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Best Aspect</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {designIntelligence.footprint.bestAspectDirection}
                </span>
                <span className={s.flagSource}>building axis</span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Sub-scores</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  T{designIntelligence.footprint.subScores.terrain} · S{designIntelligence.footprint.subScores.solar} · W{designIntelligence.footprint.subScores.wind} · D{designIntelligence.footprint.subScores.drainage} · F{designIntelligence.footprint.subScores.flood}
                </span>
                <span className={s.flagSource}>terrain/solar/wind/drain/flood</span>
              </div>
              {designIntelligence.footprint.limitingFactors.length > 0 && (
                <div style={{ padding: '2px 8px 4px', fontSize: 11, color: 'var(--color-panel-muted, #888)' }}>
                  <strong>Limiting:</strong>
                  <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                    {designIntelligence.footprint.limitingFactors.map((f, i) => (
                      <li key={i} style={{ marginBottom: 1 }}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.footprint.recommendedBuildZone}
              </div>
            </>)}
            {/* Compost Siting */}
            {designIntelligence.compostSiting && (<>
              <div className={p.separatorThin} />
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Compost Siting</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${designIntelligence.compostSiting.rating === 'Excellent' || designIntelligence.compostSiting.rating === 'Good' ? confidence.high : designIntelligence.compostSiting.rating === 'Marginal' ? confidence.medium : confidence.low}18`,
                    color: designIntelligence.compostSiting.rating === 'Excellent' || designIntelligence.compostSiting.rating === 'Good' ? confidence.high : designIntelligence.compostSiting.rating === 'Marginal' ? confidence.medium : confidence.low,
                  }}>
                    {designIntelligence.compostSiting.rating}
                  </span>
                </div>
                <span className={s.flagSource}>
                  {designIntelligence.compostSiting.slopeDeg !== null ? `${designIntelligence.compostSiting.slopeDeg.toFixed(1)}° slope` : 'slope n/a'}
                </span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Direction</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {designIntelligence.compostSiting.recommendedDirectionFromDwelling}
                </span>
                <span className={s.flagSource}>from dwelling</span>
              </div>
              {designIntelligence.compostSiting.drainageClass && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Drainage</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                    {designIntelligence.compostSiting.drainageClass}
                  </span>
                  <span className={s.flagSource}>soils</span>
                </div>
              )}
              <div className={p.detailText}>
                {designIntelligence.compostSiting.recommendation}
              </div>
            </>)}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
