/**
 * Sprint BM — Infrastructure Access section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint K infrastructure distances: hospital, masjid, market,
 * power grid, road access, water supply + Sprint W farmers-market/town
 * + Sprint L protected area. Source: OSM Overpass / WDPA.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface InfrastructureMetrics {
  hospitalKm: number | null;
  hospitalName: string | null;
  masjidKm: number | null;
  masjidName: string | null;
  marketKm: number | null;
  marketName: string | null;
  gridKm: number | null;
  roadKm: number | null;
  roadType: string | null;
  waterKm: number | null;
  protectedAreaKm: number | null;
  protectedAreaName: string | null;
  protectedAreaCount: number;
}

export interface ProximityMetrics {
  farmersMarketKm: number | null;
  farmersMarketName: string | null;
  nearestTownKm: number | null;
  nearestTownName: string | null;
}

export interface InfrastructureAccessSectionProps {
  infraMetrics: InfrastructureMetrics | null;
  proximityMetrics: ProximityMetrics | null;
  infraOpen: boolean;
  onToggleInfra: () => void;
}

export const InfrastructureAccessSection = memo(function InfrastructureAccessSection({
  infraMetrics,
  proximityMetrics,
  infraOpen,
  onToggleInfra,
}: InfrastructureAccessSectionProps) {
  if (!infraMetrics) return null;

  return (
    <SectionProfiler id="site-intel-infrastructure">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleInfra}
          className={`${s.liveDataHeader} ${infraOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9741;</span>
          <span className={s.liveDataTitle}>Infrastructure Access</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!infraOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {infraOpen && (
          <div className={p.innerPad}>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Hospital</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.hospitalKm != null
                  ? (infraMetrics.hospitalKm <= 5 ? confidence.high : infraMetrics.hospitalKm <= 15 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.hospitalKm != null ? `${infraMetrics.hospitalKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>
                {infraMetrics.hospitalName ?? 'within 25km'}
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Masjid</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.masjidKm != null
                  ? (infraMetrics.masjidKm <= 5 ? confidence.high : infraMetrics.masjidKm <= 15 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.masjidKm != null ? `${infraMetrics.masjidKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>
                {infraMetrics.masjidName ?? 'within 25km'}
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Market</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.marketKm != null
                  ? (infraMetrics.marketKm <= 5 ? confidence.high : infraMetrics.marketKm <= 15 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.marketKm != null ? `${infraMetrics.marketKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>
                {infraMetrics.marketName ?? 'within 25km'}
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Power Grid</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.gridKm != null
                  ? (infraMetrics.gridKm <= 5 ? confidence.high : infraMetrics.gridKm <= 15 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.gridKm != null ? `${infraMetrics.gridKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>substation</span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Road Access</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.roadKm != null
                  ? (infraMetrics.roadKm <= 2 ? confidence.high : infraMetrics.roadKm <= 10 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.roadKm != null ? `${infraMetrics.roadKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>
                {infraMetrics.roadType ?? 'nearest'} road
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Water Supply</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.waterKm != null
                  ? (infraMetrics.waterKm <= 5 ? confidence.high : infraMetrics.waterKm <= 15 ? confidence.medium : confidence.low)
                  : confidence.low,
              }}>
                {infraMetrics.waterKm != null ? `${infraMetrics.waterKm} km` : 'Not found'}
              </span>
              <span className={s.flagSource}>drinking water</span>
            </div>
            {proximityMetrics?.farmersMarketKm != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Farmers Market</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: proximityMetrics.farmersMarketKm <= 10 ? confidence.high
                    : proximityMetrics.farmersMarketKm <= 30 ? confidence.medium : confidence.low,
                }}>
                  {proximityMetrics.farmersMarketKm} km
                </span>
                <span className={s.flagSource}>{proximityMetrics.farmersMarketName ?? 'nearest'}</span>
              </div>
            )}
            {proximityMetrics?.nearestTownKm != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Nearest Town</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: proximityMetrics.nearestTownKm <= 5 ? confidence.high
                    : proximityMetrics.nearestTownKm <= 15 ? confidence.medium : confidence.low,
                }}>
                  {proximityMetrics.nearestTownKm} km
                </span>
                <span className={s.flagSource}>{proximityMetrics.nearestTownName ?? 'OSM'}</span>
              </div>
            )}
            <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
              <span className={s.liveDataLabel}>Protected Area</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: infraMetrics.protectedAreaKm != null
                  ? (infraMetrics.protectedAreaKm <= 1 ? confidence.low : infraMetrics.protectedAreaKm <= 5 ? confidence.medium : confidence.high)
                  : confidence.high,
              }}>
                {infraMetrics.protectedAreaKm != null
                  ? (infraMetrics.protectedAreaKm <= 0.5 ? 'Inside protected area' : `${infraMetrics.protectedAreaKm} km`)
                  : 'None within 25km'}
              </span>
              <span className={s.flagSource}>
                {infraMetrics.protectedAreaName ?? (infraMetrics.protectedAreaCount > 0 ? `${infraMetrics.protectedAreaCount} nearby` : 'OSM')}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
