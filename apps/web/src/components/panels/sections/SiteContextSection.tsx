/**
 * Sprint BP — Site Context section extracted from SiteIntelligencePanel.
 *
 * Composite toggleable card aggregating 5 sub-metric sub-blocks (Sprints O/P/BB):
 *  - Crop Validation (USDA NASS CDL)
 *  - Biodiversity + IUCN Habitat (GBIF)
 *  - SoilGrids global cross-check (ISRIC 250m)
 *  - Critical Habitat (USFWS ESA)
 *  - Storm Events / Disaster History (FEMA)
 *
 * All 5 sub-metrics are optional; outer `hasAny` short-circuit kept inside.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { ConfBadge } from './_shared.js';
import { capConf } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface CropValidationMetrics {
  cropName: string | null;
  cropYear: number | null;
  landUseClass: string | null;
  isAgricultural: boolean;
  isCropland: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface BiodiversityMetrics {
  speciesRichness: number;
  totalObservations: number;
  biodiversityClass: string | null;
  iucnHabitatCode: string | null;
  iucnHabitatLabel: string | null;
  searchRadiusKm: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface SoilGridsMetrics {
  ph: number | null;
  nitrogen: number | null;
  socGKg: number | null;
  cfvo: number | null;
  clay: number | null;
  sand: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface CriticalHabitatMetrics {
  onSite: boolean;
  speciesOnSite: number;
  speciesNearby: number;
  speciesList: string[];
  primarySpecies: string | null;
  primaryStatus: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface StormMetrics {
  disasterCount10yr: number;
  majorDisasterCount: number;
  latestDate: string | null;
  latestTitle: string | null;
  latestType: string | null;
  mostCommonType: string | null;
  stateName: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface SiteContextSectionProps {
  cropValidationMetrics: CropValidationMetrics | null;
  biodiversityMetrics: BiodiversityMetrics | null;
  soilGridsMetrics: SoilGridsMetrics | null;
  criticalHabitatMetrics: CriticalHabitatMetrics | null;
  stormMetrics: StormMetrics | null;
  siteContextOpen: boolean;
  onToggleSiteContext: () => void;
}

export const SiteContextSection = memo(function SiteContextSection({
  cropValidationMetrics,
  biodiversityMetrics,
  soilGridsMetrics,
  criticalHabitatMetrics,
  stormMetrics,
  siteContextOpen,
  onToggleSiteContext,
}: SiteContextSectionProps) {
  const hasAny =
    cropValidationMetrics ||
    criticalHabitatMetrics ||
    stormMetrics ||
    biodiversityMetrics ||
    soilGridsMetrics;
  if (!hasAny) return null;

  return (
    <SectionProfiler id="site-intel-site-context">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleSiteContext}
          className={`${s.liveDataHeader} ${siteContextOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9670;</span>
          <span className={s.liveDataTitle}>Site Context</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!siteContextOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {siteContextOpen && (
          <div className={p.innerPad}>
            {/* Crop Validation */}
            {cropValidationMetrics && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Current Land Use</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {cropValidationMetrics.cropName ?? cropValidationMetrics.landUseClass ?? 'Unknown'}
                </span>
                <span className={s.flagSource}>
                  {cropValidationMetrics.cropYear ? `CDL ${cropValidationMetrics.cropYear}` : 'USDA NASS'}
                </span>
              </div>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Classification</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${cropValidationMetrics.isCropland ? confidence.medium : cropValidationMetrics.isAgricultural ? confidence.high : 'var(--color-panel-muted, #666)'}18`,
                    color: cropValidationMetrics.isCropland ? confidence.medium : cropValidationMetrics.isAgricultural ? confidence.high : 'var(--color-panel-muted, #666)',
                  }}>
                    {cropValidationMetrics.isCropland ? 'Active Cropland' : cropValidationMetrics.isAgricultural ? 'Agricultural' : cropValidationMetrics.landUseClass ?? 'Non-agricultural'}
                  </span>
                </div>
                <ConfBadge level={capConf(cropValidationMetrics.confidence)} />
              </div>
            </>)}
            {/* Sprint BB: Biodiversity + IUCN Habitat */}
            {biodiversityMetrics && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Biodiversity</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${biodiversityMetrics.biodiversityClass === 'Very High' || biodiversityMetrics.biodiversityClass === 'High' ? confidence.high : biodiversityMetrics.biodiversityClass === 'Moderate' ? confidence.medium : confidence.low}18`,
                    color: biodiversityMetrics.biodiversityClass === 'Very High' || biodiversityMetrics.biodiversityClass === 'High' ? confidence.high : biodiversityMetrics.biodiversityClass === 'Moderate' ? confidence.medium : confidence.low,
                  }}>
                    {biodiversityMetrics.biodiversityClass ?? 'Unknown'}
                  </span>
                </div>
                <span className={s.flagSource}>
                  {biodiversityMetrics.speciesRichness} spp. / {biodiversityMetrics.searchRadiusKm} km
                </span>
              </div>
              {biodiversityMetrics.iucnHabitatLabel && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>IUCN Habitat</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                    {biodiversityMetrics.iucnHabitatLabel}
                  </span>
                  <span className={s.flagSource}>code {biodiversityMetrics.iucnHabitatCode}</span>
                </div>
              )}
            </>)}
            {/* Sprint BB: SoilGrids global cross-check */}
            {soilGridsMetrics && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>SoilGrids (global)</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {soilGridsMetrics.ph !== null ? `pH ${soilGridsMetrics.ph.toFixed(1)}` : ''}
                  {soilGridsMetrics.nitrogen !== null ? ` \u00b7 N ${soilGridsMetrics.nitrogen.toFixed(2)} g/kg` : ''}
                  {soilGridsMetrics.socGKg !== null ? ` \u00b7 SOC ${soilGridsMetrics.socGKg.toFixed(1)} g/kg` : ''}
                </span>
                <span className={s.flagSource}>ISRIC 250m</span>
              </div>
              {(soilGridsMetrics.clay !== null || soilGridsMetrics.sand !== null || soilGridsMetrics.cfvo !== null) && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>SG Texture / CFVO</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                    {soilGridsMetrics.clay !== null ? `${soilGridsMetrics.clay}% clay` : '\u2014'}
                    {soilGridsMetrics.sand !== null ? ` \u00b7 ${soilGridsMetrics.sand}% sand` : ''}
                    {soilGridsMetrics.cfvo !== null ? ` \u00b7 ${soilGridsMetrics.cfvo}% cfvo` : ''}
                  </span>
                  <span className={s.flagSource}>0-30 cm mean</span>
                </div>
              )}
            </>)}
            {/* Critical Habitat */}
            {criticalHabitatMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Critical Habitat</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: criticalHabitatMetrics.onSite ? confidence.low : criticalHabitatMetrics.speciesNearby > 0 ? confidence.medium : confidence.high,
                }}>
                  {criticalHabitatMetrics.onSite
                    ? `On-site (${criticalHabitatMetrics.speciesOnSite} spp.)`
                    : criticalHabitatMetrics.speciesNearby > 0
                    ? `${criticalHabitatMetrics.speciesNearby} spp. nearby`
                    : 'None detected'}
                </span>
                <span className={s.flagSource}>
                  {criticalHabitatMetrics.primarySpecies ?? 'USFWS ESA'}
                </span>
              </div>
            )}
            {/* Storm Events / Disaster History */}
            {stormMetrics && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Disaster History</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: stormMetrics.majorDisasterCount === 0 ? confidence.high
                    : stormMetrics.majorDisasterCount <= 3 ? confidence.medium : confidence.low,
                }}>
                  {stormMetrics.disasterCount10yr} in 10 yr
                </span>
                <span className={s.flagSource}>
                  {stormMetrics.mostCommonType ?? stormMetrics.stateName ?? 'FEMA'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
