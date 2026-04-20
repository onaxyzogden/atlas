/**
 * Sprint BO — Regional Species Context section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BF Cat 6b+6c regional invasive + pollinator-friendly native
 * species context (ISSG / regional floras). Non-toggleable.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface SpeciesIntelligence {
  region: string;
  invasiveCount: number | null;
  nativeCount: number | null;
  topInvasives: string[];
  pollinatorNatives: string[];
  invNote: string | null;
  natNote: string | null;
  source: string;
}

export interface RegionalSpeciesSectionProps {
  speciesIntelligence: SpeciesIntelligence | null;
}

export const RegionalSpeciesSection = memo(function RegionalSpeciesSection({
  speciesIntelligence,
}: RegionalSpeciesSectionProps) {
  if (!speciesIntelligence) return null;
  const hasAny =
    speciesIntelligence.invasiveCount != null ||
    speciesIntelligence.nativeCount != null ||
    speciesIntelligence.invNote ||
    speciesIntelligence.natNote;
  if (!hasAny) return null;

  return (
    <SectionProfiler id="site-intel-regional-species">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#10047;</span>
          <span className={s.liveDataTitle}>Regional Species Context</span>
        </div>
        <div className={p.innerPad}>
          <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
            <div className={p.flexBetween}>
              <span className={s.liveDataLabel}>Invasive / Noxious</span>
              <span className={s.scoreBadge} style={{
                background: `${confidence.low}18`, color: confidence.low,
              }}>
                {speciesIntelligence.invasiveCount != null ? `${speciesIntelligence.invasiveCount} in ${speciesIntelligence.region}` : speciesIntelligence.region}
              </span>
            </div>
            {speciesIntelligence.topInvasives.length > 0 ? (
              <div className={p.tokenIconFs11Leading}>
                {speciesIntelligence.topInvasives.slice(0, 5).join(', ')}
              </div>
            ) : speciesIntelligence.invNote && (
              <div className={p.tokenIconFs10Italic}>
                {speciesIntelligence.invNote}
              </div>
            )}
          </div>
          <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
            <div className={p.flexBetween}>
              <span className={s.liveDataLabel}>Pollinator-friendly Natives</span>
              <span className={s.scoreBadge} style={{
                background: `${confidence.high}18`, color: confidence.high,
              }}>
                {speciesIntelligence.nativeCount != null ? `${speciesIntelligence.nativeCount} natives` : 'Reference'}
              </span>
            </div>
            {speciesIntelligence.pollinatorNatives.length > 0 ? (
              <div className={p.tokenIconFs11Leading}>
                {speciesIntelligence.pollinatorNatives.slice(0, 5).join(', ')}
              </div>
            ) : speciesIntelligence.natNote && (
              <div className={p.tokenIconFs10Italic}>
                {speciesIntelligence.natNote}
              </div>
            )}
            <div style={{ fontSize: 10, color: semantic.sidebarIcon, marginTop: 4 }}>
              {speciesIntelligence.source}
            </div>
          </div>
        </div>
      </div>
    </SectionProfiler>
  );
});
