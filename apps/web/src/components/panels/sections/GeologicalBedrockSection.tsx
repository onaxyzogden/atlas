/**
 * GeologicalBedrockSection — §3 geological-bedrock-notes (manifest line 138).
 *
 * Surfaces depth-to-bedrock with foundation feasibility implications: shallow
 * bedrock flags excavation cost / blasting; moderate suggests piers; deep
 * permits standard slabs. Substrate texture + drainage + groundwater depth
 * frame well-drilling, septic, and pond-earthworks notes.
 *
 * Pure presentation: takes raw soils + groundwater fields, all banding and
 * verdict logic in-component.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface GeologicalBedrockSectionProps {
  bedrockDepthM: number | null;
  textureClass: string | null;
  drainageClass: string | null;
  groundwaterDepthM: number | null;
}

type Band = { label: string; tone: 'high' | 'medium' | 'low' };

function bandFor(depthM: number): Band {
  if (depthM < 1) return { label: 'Shallow', tone: 'low' };
  if (depthM < 3) return { label: 'Moderate', tone: 'medium' };
  return { label: 'Deep', tone: 'high' };
}

function foundationVerdict(depthM: number, drainage: string | null): string {
  const dryish = drainage
    ? /well|moderately|somewhat well/i.test(drainage)
    : true;
  if (depthM < 1) {
    return 'Shallow bedrock — slab on grade with surface preparation; piers or footings may need rock anchoring or blasting. Budget excavation premium.';
  }
  if (depthM < 3) {
    return dryish
      ? 'Moderate cover — drilled piers or strip footings reach competent rock without excessive excavation.'
      : 'Moderate cover but limited drainage — perched water above rock; design footing drains and verify bearing strata.';
  }
  return dryish
    ? 'Deep regolith — conventional slab or shallow strip footings on engineered fill.'
    : 'Deep regolith with restricted drainage — verify subgrade bearing; underdrain may be required.';
}

function wellNote(depthM: number): string {
  if (depthM < 1) return 'Drilled wells encounter rock immediately — casing depth minimal but yield depends on fracture density.';
  if (depthM < 3) return 'Modest overburden — well casing ~3–10 m before reaching bedrock fractures.';
  return 'Deeper overburden — wells may produce from unconsolidated aquifer above bedrock.';
}

function septicNote(depthM: number, drainage: string | null): string {
  if (depthM < 1) return 'Conventional leach field unlikely — at-grade or mound system probable; verify with perc test.';
  if (depthM < 3) {
    return drainage && /poor|very poor/i.test(drainage)
      ? 'Limited soil column + restricted drainage — engineered system likely required.'
      : 'Trench depth constrained — shallow leach field design with adequate sidewall.';
  }
  return 'Adequate soil column for conventional septic; perc test still required.';
}

function earthworksNote(depthM: number): string {
  if (depthM < 1) return 'Pond / swale excavation hits rock fast — ripping or blasting likely; pond seepage low if rock is intact.';
  if (depthM < 3) return 'Pond bottom may key into weathered rock — favourable seal; check for fractures.';
  return 'Standard earthworks; pond liner only if soil texture is coarse.';
}

function toneColor(tone: 'high' | 'medium' | 'low'): string {
  return tone === 'high' ? confidence.high : tone === 'medium' ? confidence.medium : confidence.low;
}

export const GeologicalBedrockSection = memo(function GeologicalBedrockSection({
  bedrockDepthM,
  textureClass,
  drainageClass,
  groundwaterDepthM,
}: GeologicalBedrockSectionProps) {
  if (bedrockDepthM == null) return null;

  const depthFt = Math.round(bedrockDepthM * 3.28084 * 10) / 10;
  const band = bandFor(bedrockDepthM);
  const verdict = foundationVerdict(bedrockDepthM, drainageClass);
  const tone = toneColor(band.tone);

  const gwNote =
    groundwaterDepthM != null && groundwaterDepthM < bedrockDepthM
      ? `Water table (~${groundwaterDepthM.toFixed(1)} m) sits above bedrock — saturated overburden; design dewatering for footings.`
      : groundwaterDepthM != null
        ? `Water table (~${groundwaterDepthM.toFixed(1)} m) below bedrock interface — drier excavation conditions.`
        : null;

  return (
    <SectionProfiler id="site-intel-geological-bedrock">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9968;</span>
          <span className={s.liveDataTitle}>Geological Substrate &amp; Bedrock</span>
          <div className={p.flex1} />
          <span
            className={s.scoreBadge}
            style={{
              background: 'rgba(196, 162, 101, 0.12)',
              color: 'rgba(232, 200, 130, 0.9)',
              fontSize: '9px',
              letterSpacing: '0.08em',
            }}
          >
            HEURISTIC
          </span>
        </div>
        <div className={p.innerPad}>
          <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
            <div className={p.flexBetween}>
              <span className={s.liveDataLabel}>Depth to Bedrock</span>
              <span
                className={s.scoreBadge}
                style={{ background: `${tone}18`, color: tone }}
              >
                {band.label} &middot; {bedrockDepthM.toFixed(2)} m / {depthFt} ft
              </span>
            </div>
            <div className={p.tokenIconFs12Leading}>{verdict}</div>
            {(textureClass || drainageClass) && (
              <div className={`${p.tokenIcon} ${p.fs11} ${p.mt4}`}>
                Substrate:&nbsp;
                {textureClass ? `${textureClass} texture` : 'texture n/a'}
                {drainageClass ? ` \u00b7 ${drainageClass} drainage` : ''}
              </div>
            )}
          </div>

          <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
            <span className={s.liveDataLabel}>Well-Drilling</span>
            <div className={p.tokenIconFs12Leading}>{wellNote(bedrockDepthM)}</div>
          </div>

          <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
            <span className={s.liveDataLabel}>Septic Feasibility</span>
            <div className={p.tokenIconFs12Leading}>{septicNote(bedrockDepthM, drainageClass)}</div>
          </div>

          <div className={`${s.liveDataRow} ${p.colStretchPad} ${gwNote ? '' : p.borderBottomNone}`}>
            <span className={s.liveDataLabel}>Pond / Earthworks</span>
            <div className={p.tokenIconFs12Leading}>{earthworksNote(bedrockDepthM)}</div>
          </div>

          {gwNote && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <span className={s.liveDataLabel}>Groundwater</span>
              <div className={p.tokenIconFs12Leading}>{gwNote}</div>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
