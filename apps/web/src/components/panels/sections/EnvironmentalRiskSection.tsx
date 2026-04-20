/**
 * Sprint BM — Environmental Risk section extracted from SiteIntelligencePanel.
 *
 * Consolidates Sprint O/T/U/BC hazard layers: air quality, seismic hazard,
 * Superfund (CERCLIS), UST/LUST, brownfields, landfills, mine hazards (MRDS),
 * FUDS (military formerly-used sites).
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

export interface AirQualityMetrics {
  aqiClass: string | null;
  pm25: number | null;
  pm25Pct: number | null;
  ozone: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface EarthquakeMetrics {
  hazardClass: string | null;
  pgaG: number | null;
  siteClass: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface SuperfundMetrics {
  nearestKm: number | null;
  nearestName: string | null;
  within2km: number;
  within5km: number;
}

export interface UstLustMetrics {
  nearestLustKm: number | null;
  nearestLustName: string | null;
  nearestUstKm: number | null;
  nearestUstName: string | null;
  lustWithin1km: number;
}

export interface BrownfieldMetrics {
  nearestKm: number | null;
  nearestName: string | null;
  within2km: number;
  within5km: number;
}

export interface LandfillMetrics {
  nearestKm: number | null;
  nearestName: string | null;
  within2km: number;
  within5km: number;
}

export interface MineHazardMetrics {
  nearestKm: number | null;
  commodity: string | null;
}

export interface FudsMetrics {
  nearestKm: number | null;
  projectType: string | null;
}

export interface EnvironmentalRiskSectionProps {
  airQualityMetrics: AirQualityMetrics | null;
  earthquakeMetrics: EarthquakeMetrics | null;
  superfundMetrics: SuperfundMetrics | null;
  ustLustMetrics: UstLustMetrics | null;
  brownfieldMetrics: BrownfieldMetrics | null;
  landfillMetrics: LandfillMetrics | null;
  mineHazardMetrics: MineHazardMetrics | null;
  fudsMetrics: FudsMetrics | null;
  envRiskOpen: boolean;
  onToggleEnvRisk: () => void;
}

export const EnvironmentalRiskSection = memo(function EnvironmentalRiskSection({
  airQualityMetrics,
  earthquakeMetrics,
  superfundMetrics,
  ustLustMetrics,
  brownfieldMetrics,
  landfillMetrics,
  mineHazardMetrics,
  fudsMetrics,
  envRiskOpen,
  onToggleEnvRisk,
}: EnvironmentalRiskSectionProps) {
  const hasAny = superfundMetrics || airQualityMetrics || earthquakeMetrics
    || ustLustMetrics || brownfieldMetrics || landfillMetrics
    || mineHazardMetrics || fudsMetrics;
  if (!hasAny) return null;

  return (
    <SectionProfiler id="site-intel-env-risk">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleEnvRisk}
          className={`${s.liveDataHeader} ${envRiskOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9888;</span>
          <span className={s.liveDataTitle}>Environmental Risk</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!envRiskOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {envRiskOpen && (
          <div className={p.innerPad}>
            {/* Air Quality */}
            {airQualityMetrics && (<>
              {airQualityMetrics.aqiClass && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Air Quality</span>
                  <div className={p.rightAlign}>
                    <span className={s.scoreBadge} style={{
                      background: `${airQualityMetrics.aqiClass === 'Good' ? confidence.high : airQualityMetrics.aqiClass === 'Moderate' ? confidence.medium : confidence.low}18`,
                      color: airQualityMetrics.aqiClass === 'Good' ? confidence.high : airQualityMetrics.aqiClass === 'Moderate' ? confidence.medium : confidence.low,
                    }}>
                      {airQualityMetrics.aqiClass}
                    </span>
                  </div>
                  <ConfBadge level={capConf(airQualityMetrics.confidence)} />
                </div>
              )}
              {airQualityMetrics.pm25 != null && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>PM2.5</span>
                  <span className={s.liveDataValue} style={{
                    flex: 1, textAlign: 'right',
                    color: airQualityMetrics.pm25 <= 12 ? confidence.high : airQualityMetrics.pm25 <= 35 ? confidence.medium : confidence.low,
                  }}>
                    {airQualityMetrics.pm25.toFixed(1)} &#181;g/m&#179;
                  </span>
                  <span className={s.flagSource}>
                    {airQualityMetrics.pm25Pct != null ? `${Math.round(airQualityMetrics.pm25Pct)}th pct.` : 'EPA EJSCREEN'}
                  </span>
                </div>
              )}
              {airQualityMetrics.ozone != null && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Ozone</span>
                  <span className={s.liveDataValue} style={{
                    flex: 1, textAlign: 'right',
                    color: airQualityMetrics.ozone <= 54 ? confidence.high : airQualityMetrics.ozone <= 70 ? confidence.medium : confidence.low,
                  }}>
                    {airQualityMetrics.ozone.toFixed(0)} ppb
                  </span>
                  <span className={s.flagSource}>{airQualityMetrics.ozone <= 54 ? 'Good' : airQualityMetrics.ozone <= 70 ? 'Moderate' : 'Elevated'}</span>
                </div>
              )}
            </>)}
            {/* Seismic Hazard */}
            {earthquakeMetrics && (<>
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Seismic Hazard</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${earthquakeMetrics.hazardClass === 'Very Low' || earthquakeMetrics.hazardClass === 'Low' ? confidence.high : earthquakeMetrics.hazardClass === 'Moderate' ? confidence.medium : confidence.low}18`,
                    color: earthquakeMetrics.hazardClass === 'Very Low' || earthquakeMetrics.hazardClass === 'Low' ? confidence.high : earthquakeMetrics.hazardClass === 'Moderate' ? confidence.medium : confidence.low,
                  }}>
                    {earthquakeMetrics.hazardClass ?? 'Unknown'}
                  </span>
                </div>
                <ConfBadge level={capConf(earthquakeMetrics.confidence)} />
              </div>
              {earthquakeMetrics.pgaG != null && (
                <div className={s.liveDataRow}>
                  <span className={s.liveDataLabel}>Peak Ground Accel.</span>
                  <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                    {earthquakeMetrics.pgaG.toFixed(3)} g
                  </span>
                  <span className={s.flagSource}>{earthquakeMetrics.siteClass ?? 'USGS'}</span>
                </div>
              )}
            </>)}
            {/* Superfund */}
            {superfundMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Contamination</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: superfundMetrics.nearestKm == null ? confidence.high
                    : superfundMetrics.within2km > 0 ? confidence.low
                    : superfundMetrics.within5km > 0 ? confidence.medium
                    : confidence.high,
                }}>
                  {superfundMetrics.nearestKm != null ? `${superfundMetrics.nearestKm} km` : 'None nearby'}
                </span>
                <span className={s.flagSource}>
                  {superfundMetrics.within5km > 0
                    ? `${superfundMetrics.within5km} site${superfundMetrics.within5km > 1 ? 's' : ''} within 5km`
                    : superfundMetrics.nearestName ?? 'EPA Envirofacts'}
                </span>
              </div>
            )}
            {/* UST / LUST */}
            {ustLustMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>UST / LUST</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: ustLustMetrics.lustWithin1km > 0 ? confidence.low
                    : ustLustMetrics.nearestLustKm != null && ustLustMetrics.nearestLustKm < 2 ? confidence.medium
                    : confidence.high,
                }}>
                  {ustLustMetrics.nearestLustKm != null
                    ? `LUST ${ustLustMetrics.nearestLustKm} km`
                    : ustLustMetrics.nearestUstKm != null ? `UST ${ustLustMetrics.nearestUstKm} km` : 'None'}
                </span>
                <span className={s.flagSource}>
                  {ustLustMetrics.lustWithin1km > 0
                    ? `${ustLustMetrics.lustWithin1km} LUST <1km`
                    : ustLustMetrics.nearestLustName ?? ustLustMetrics.nearestUstName ?? 'EPA Envirofacts'}
                </span>
              </div>
            )}
            {/* Brownfields */}
            {brownfieldMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Brownfields</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: brownfieldMetrics.nearestKm == null ? confidence.high
                    : brownfieldMetrics.within2km > 0 ? confidence.low
                    : brownfieldMetrics.within5km > 0 ? confidence.medium
                    : confidence.high,
                }}>
                  {brownfieldMetrics.nearestKm != null ? `${brownfieldMetrics.nearestKm} km` : 'None nearby'}
                </span>
                <span className={s.flagSource}>
                  {brownfieldMetrics.within5km > 0
                    ? `${brownfieldMetrics.within5km} within 5km`
                    : brownfieldMetrics.nearestName ?? 'EPA ACRES'}
                </span>
              </div>
            )}
            {/* Landfills */}
            {landfillMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Landfill</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: landfillMetrics.nearestKm == null ? confidence.high
                    : landfillMetrics.within2km > 0 ? confidence.low
                    : landfillMetrics.within5km > 0 ? confidence.medium
                    : confidence.high,
                }}>
                  {landfillMetrics.nearestKm != null ? `${landfillMetrics.nearestKm} km` : 'None nearby'}
                </span>
                <span className={s.flagSource}>
                  {landfillMetrics.nearestName ?? 'EPA FRS'}
                </span>
              </div>
            )}
            {/* Mine hazards */}
            {mineHazardMetrics && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Mine Hazards</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: mineHazardMetrics.nearestKm != null && mineHazardMetrics.nearestKm < 2 ? confidence.low
                    : mineHazardMetrics.nearestKm != null && mineHazardMetrics.nearestKm < 5 ? confidence.medium
                    : confidence.high,
                }}>
                  {mineHazardMetrics.nearestKm != null ? `${mineHazardMetrics.nearestKm} km` : 'None'}
                </span>
                <span className={s.flagSource}>
                  {mineHazardMetrics.commodity ?? 'USGS MRDS'}
                </span>
              </div>
            )}
            {/* FUDS */}
            {fudsMetrics && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>FUDS (Military)</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: fudsMetrics.nearestKm != null && fudsMetrics.nearestKm < 2 ? confidence.low
                    : fudsMetrics.nearestKm != null && fudsMetrics.nearestKm < 5 ? confidence.medium
                    : confidence.high,
                }}>
                  {fudsMetrics.nearestKm != null ? `${fudsMetrics.nearestKm} km` : 'None'}
                </span>
                <span className={s.flagSource}>
                  {fudsMetrics.projectType ?? 'USACE FUDS'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
