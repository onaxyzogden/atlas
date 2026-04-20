/**
 * Sprint BK — Regulatory & Heritage section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BC/BF/BH regulatory cards: conservation easement, heritage,
 * BC ALR, EA/permit triggers, typical setbacks, mineral rights, water rights,
 * ag use-value assessment, and Ecological Gifts Program (CA).
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { EIATriggerResult, SetbackResult, AgUseValueResult } from '../../../lib/regulatoryIntelligence.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface EasementMetrics {
  present: boolean;
  holder: string | null;
  nearby: number;
}

export interface HeritageMetrics {
  present: boolean;
  name: string | null;
  nearestKm: number | null;
}

export interface AlrMetrics {
  inAlr: boolean;
  region: string | null;
}

export interface MineralRightsMetrics {
  federalEstate: boolean;
  claimsCount: number;
  claimTypes: string[];
  note: string | null;
  source: string;
  stateChecked: boolean;
  stateAgency: string | null;
  stateWells: number | null;
  stateWellTypes: string[];
  stateNote: string | null;
  bcMtoPresent: boolean;
  bcMtoCount: number;
}

export interface WaterRightsMetrics {
  doctrine: string;
  doctrineDescription: string | null;
  agency: string | null;
  hasLiveRegistry: boolean;
  diversionsWithin5km: number | null;
  nearestKm: number | null;
  nearestPriorityDate: string | null;
  nearestUse: string | null;
  nearestFlow: string | null;
  note: string | null;
}

export interface EcoGiftsMetrics {
  nearbyCount: number;
  nearestKm: number | null;
  nearestName: string | null;
  nearestAreaHa: number | null;
  nearestYear: number | null;
  oltaNote: string | null;
  programNote: string | null;
}

export interface RegulatoryHeritageSectionProps {
  easementMetrics: EasementMetrics | null;
  heritageMetrics: HeritageMetrics | null;
  alrMetrics: AlrMetrics | null;
  eiaTriggers: EIATriggerResult | null;
  typicalSetbacks: SetbackResult | null;
  mineralRightsMetrics: MineralRightsMetrics | null;
  waterRightsMetrics: WaterRightsMetrics | null;
  agUseValueMetrics: AgUseValueResult | null;
  ecoGiftsMetrics: EcoGiftsMetrics | null;
}

export const RegulatoryHeritageSection = memo(function RegulatoryHeritageSection({
  easementMetrics,
  heritageMetrics,
  alrMetrics,
  eiaTriggers,
  typicalSetbacks,
  mineralRightsMetrics,
  waterRightsMetrics,
  agUseValueMetrics,
  ecoGiftsMetrics,
}: RegulatoryHeritageSectionProps) {
  const anyPresent =
    easementMetrics ||
    heritageMetrics ||
    alrMetrics ||
    typicalSetbacks ||
    mineralRightsMetrics ||
    waterRightsMetrics ||
    agUseValueMetrics?.program_available ||
    ecoGiftsMetrics ||
    (eiaTriggers && eiaTriggers.likelyTriggers.length > 0);

  if (!anyPresent) return null;

  return (
    <SectionProfiler id="site-intel-regulatory">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&sect;</span>
          <span className={s.liveDataTitle}>Regulatory & Heritage</span>
        </div>
        <div className={p.innerPad}>
          {easementMetrics && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Conservation Easement</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: easementMetrics.present ? confidence.low : confidence.high,
              }}>
                {easementMetrics.present ? 'On-site' : easementMetrics.nearby > 0 ? `${easementMetrics.nearby} nearby` : 'None'}
              </span>
              <span className={s.flagSource}>{easementMetrics.holder ?? 'NCED'}</span>
            </div>
          )}
          {heritageMetrics && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Heritage Site</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: heritageMetrics.present ? confidence.low
                  : heritageMetrics.nearestKm != null && heritageMetrics.nearestKm < 1 ? confidence.medium
                  : confidence.high,
              }}>
                {heritageMetrics.present ? 'On-site'
                  : heritageMetrics.nearestKm != null ? `${heritageMetrics.nearestKm} km` : 'None'}
              </span>
              <span className={s.flagSource}>{heritageMetrics.name ?? 'NRHP'}</span>
            </div>
          )}
          {alrMetrics && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>BC ALR</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: alrMetrics.inAlr ? confidence.medium : confidence.high,
              }}>
                {alrMetrics.inAlr ? 'Inside ALR' : 'Outside ALR'}
              </span>
              <span className={s.flagSource}>{alrMetrics.region ?? 'BC OATS'}</span>
            </div>
          )}
          {eiaTriggers && eiaTriggers.likelyTriggers.length > 0 && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>EA / Permit Triggers</span>
                <span className={s.scoreBadge} style={{
                  background: `${eiaTriggers.regulatoryBurden === 'Low' ? confidence.high : eiaTriggers.regulatoryBurden === 'Moderate' ? confidence.medium : confidence.low}18`,
                  color: eiaTriggers.regulatoryBurden === 'Low' ? confidence.high : eiaTriggers.regulatoryBurden === 'Moderate' ? confidence.medium : confidence.low,
                }}>
                  {eiaTriggers.regulatoryBurden}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: semantic.sidebarIcon, lineHeight: 1.5 }}>
                {eiaTriggers.likelyTriggers.map((t, i) => (<li key={i}>{t}</li>))}
              </ul>
            </div>
          )}
          {typicalSetbacks && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Typical Setbacks</span>
                <span className={s.scoreBadge} style={{
                  background: `${confidence.medium}18`, color: confidence.medium,
                }}>
                  {typicalSetbacks.broad_class.replace('_', ' ')}
                </span>
              </div>
              <div className={p.tokenIconGrid2}>
                <div>Front: {typicalSetbacks.front_setback_m} m</div>
                <div>Side: {typicalSetbacks.side_setback_m} m</div>
                <div>Rear: {typicalSetbacks.rear_setback_m} m</div>
                {typicalSetbacks.waterbody_buffer_m != null && (
                  <div>Waterbody buffer: {typicalSetbacks.waterbody_buffer_m} m</div>
                )}
                {typicalSetbacks.wetland_buffer_m != null && (
                  <div>Wetland buffer: {typicalSetbacks.wetland_buffer_m} m</div>
                )}
              </div>
              <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                {typicalSetbacks.regulatory_note}
              </div>
            </div>
          )}
          {mineralRightsMetrics && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Mineral / Subsurface Rights</span>
                <span className={s.scoreBadge} style={{
                  background: `${mineralRightsMetrics.federalEstate || mineralRightsMetrics.bcMtoPresent ? confidence.low : confidence.high}18`,
                  color: mineralRightsMetrics.federalEstate || mineralRightsMetrics.bcMtoPresent ? confidence.low : confidence.high,
                }}>
                  {mineralRightsMetrics.federalEstate ? 'Federal estate'
                    : mineralRightsMetrics.bcMtoPresent ? 'BC MTO tenure'
                    : 'Not federal'}
                </span>
              </div>
              {(mineralRightsMetrics.claimsCount > 0 || mineralRightsMetrics.claimTypes.length > 0) && (
                <div className={p.itemLabel}>
                  {mineralRightsMetrics.claimsCount} federal claim(s) within 2 km
                  {mineralRightsMetrics.claimTypes.length > 0 ? ` \u00b7 ${mineralRightsMetrics.claimTypes.join(', ')}` : ''}
                </div>
              )}
              {mineralRightsMetrics.stateChecked && mineralRightsMetrics.stateWells != null && (
                <div className={p.itemLabel}>
                  {mineralRightsMetrics.stateWells} state-registered well(s) within 2 km
                  {mineralRightsMetrics.stateWellTypes.length > 0 ? ` \u00b7 ${mineralRightsMetrics.stateWellTypes.join(', ')}` : ''}
                  {mineralRightsMetrics.stateAgency ? ` \u00b7 ${mineralRightsMetrics.stateAgency}` : ''}
                </div>
              )}
              {mineralRightsMetrics.bcMtoPresent && (
                <div className={p.itemLabel}>
                  BC Mineral Titles Online tenure present ({mineralRightsMetrics.bcMtoCount} polygon{mineralRightsMetrics.bcMtoCount === 1 ? '' : 's'})
                </div>
              )}
              {mineralRightsMetrics.stateNote && !mineralRightsMetrics.stateChecked && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                  {mineralRightsMetrics.stateNote}
                </div>
              )}
              {mineralRightsMetrics.note && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                  {mineralRightsMetrics.note}
                </div>
              )}
              <div className={`${p.tokenIcon} ${p.fs10} ${p.mt2}`}>
                {mineralRightsMetrics.source}
              </div>
            </div>
          )}
          {waterRightsMetrics && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Water Rights</span>
                <span className={s.scoreBadge} style={{
                  background: `${waterRightsMetrics.hasLiveRegistry ? confidence.high : confidence.medium}18`,
                  color: waterRightsMetrics.hasLiveRegistry ? confidence.high : confidence.medium,
                }}>
                  {waterRightsMetrics.doctrine.replace(/_/g, ' ')}
                </span>
              </div>
              {waterRightsMetrics.agency && (
                <div className={p.itemLabel}>
                  {waterRightsMetrics.agency}
                </div>
              )}
              {waterRightsMetrics.hasLiveRegistry && waterRightsMetrics.diversionsWithin5km != null && (
                <div className={p.itemLabel}>
                  {waterRightsMetrics.diversionsWithin5km} diversion(s) within 5 km
                  {waterRightsMetrics.nearestKm != null ? ` \u00b7 nearest ${waterRightsMetrics.nearestKm} km` : ''}
                </div>
              )}
              {waterRightsMetrics.nearestPriorityDate && (
                <div className={p.itemLabel}>
                  Nearest priority: {waterRightsMetrics.nearestPriorityDate}
                  {waterRightsMetrics.nearestUse ? ` \u00b7 ${waterRightsMetrics.nearestUse}` : ''}
                  {waterRightsMetrics.nearestFlow ? ` \u00b7 ${waterRightsMetrics.nearestFlow}` : ''}
                </div>
              )}
              {waterRightsMetrics.doctrineDescription && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                  {waterRightsMetrics.doctrineDescription}
                </div>
              )}
              {waterRightsMetrics.note && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt2}`}>
                  {waterRightsMetrics.note}
                </div>
              )}
            </div>
          )}
          {agUseValueMetrics?.program_available && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Ag Use-Value Assessment</span>
                <span className={s.scoreBadge} style={{
                  background: `${agUseValueMetrics.eligibility === 'Eligible' ? confidence.high
                    : agUseValueMetrics.eligibility === 'Likely Eligible' ? confidence.medium
                    : agUseValueMetrics.eligibility === 'Below Threshold' ? confidence.low
                    : confidence.medium}18`,
                  color: agUseValueMetrics.eligibility === 'Eligible' ? confidence.high
                    : agUseValueMetrics.eligibility === 'Likely Eligible' ? confidence.medium
                    : agUseValueMetrics.eligibility === 'Below Threshold' ? confidence.low
                    : confidence.medium,
                }}>
                  {agUseValueMetrics.eligibility}
                </span>
              </div>
              {agUseValueMetrics.program_name && (
                <div className={p.itemLabel}>
                  {agUseValueMetrics.program_name}
                </div>
              )}
              {agUseValueMetrics.estimated_tax_reduction_range_pct && (
                <div className={p.itemLabel}>
                  Estimated tax reduction: {agUseValueMetrics.estimated_tax_reduction_range_pct[0]}&ndash;{agUseValueMetrics.estimated_tax_reduction_range_pct[1]}%
                </div>
              )}
              <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                {agUseValueMetrics.regulatory_note}
              </div>
              {agUseValueMetrics.statute_reference && (
                <div className={`${p.tokenIcon} ${p.fs10} ${p.mt2}`}>
                  Statute: {agUseValueMetrics.statute_reference}
                </div>
              )}
            </div>
          )}
          {ecoGiftsMetrics && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Ecological Gifts Program</span>
                <span className={s.scoreBadge} style={{
                  background: `${confidence.medium}18`, color: confidence.medium,
                }}>
                  {ecoGiftsMetrics.nearbyCount} within 50 km
                </span>
              </div>
              {ecoGiftsMetrics.nearestName && ecoGiftsMetrics.nearestKm != null && (
                <div className={p.itemLabel}>
                  {`Nearest: ${ecoGiftsMetrics.nearestName} \u00b7 ${ecoGiftsMetrics.nearestKm} km`}
                  {ecoGiftsMetrics.nearestAreaHa != null ? ` \u00b7 ${ecoGiftsMetrics.nearestAreaHa} ha` : ''}
                  {ecoGiftsMetrics.nearestYear != null ? ` \u00b7 ${ecoGiftsMetrics.nearestYear}` : ''}
                </div>
              )}
              {ecoGiftsMetrics.oltaNote && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt4}`}>
                  {ecoGiftsMetrics.oltaNote}
                </div>
              )}
              {ecoGiftsMetrics.programNote && (
                <div className={`${p.tokenIconFs10Italic} ${p.mt2}`}>
                  {ecoGiftsMetrics.programNote}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
