/**
 * Sprint BK — Crop Matching section extracted from SiteIntelligencePanel.
 *
 * Renders: category filter pills, crop rows with ScoreCircle + suitability
 * class + irrigation badge, per-crop expanded breakdown with limiting-factor
 * bars, agroforestry companions, and Sprint BF annual-bed companion pairs.
 *
 * Receives all values as props. Wrapped in React.memo.
 */

import { memo } from 'react';
import type { CropMatch, CompanionMatch } from '../../../lib/cropMatching.js';
import { findCompanions } from '../../../lib/companionPlanting.js';
import { CATEGORY_LABELS } from '../../../data/ecocropSubset.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { ScoreCircle } from './_shared.js';
import { getScoreColor } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';
import { DelayedTooltip } from '../../ui/DelayedTooltip.js';

const CATEGORY_PILLS = ['cereal', 'legume', 'vegetable', 'fruit_nut', 'forage', 'cover_crop', 'forestry'] as const;

export interface CropMatchingSectionProps {
  cropMatches: CropMatch[];
  cropCategoryFilter: string | null;
  onCropCategoryFilter: (cat: string | null) => void;
  expandedCrop: string | null;
  onToggleExpanded: (id: string) => void;
  showAllCrops: boolean;
  onToggleShowAll: () => void;
  companionCache: Map<string, CompanionMatch[]>;
}

export const CropMatchingSection = memo(function CropMatchingSection({
  cropMatches,
  cropCategoryFilter,
  onCropCategoryFilter,
  expandedCrop,
  onToggleExpanded,
  showAllCrops,
  onToggleShowAll,
  companionCache,
}: CropMatchingSectionProps) {
  if (cropMatches.length === 0) return null;

  return (
    <SectionProfiler id="site-intel-crops">
      <h3 className={p.sectionLabel}>
        Crop Suitability
        <span className={s.flagSource} style={{ marginLeft: 8, fontWeight: 400 }}>
          {cropMatches.length} crops matched (FAO EcoCrop)
        </span>
      </h3>

      {/* Category filter pills */}
      <div className={s.cropFilterRow}>
        <button
          className={`${s.cropFilterPill} ${cropCategoryFilter === null ? s.cropFilterPillActive : ''}`}
          onClick={() => onCropCategoryFilter(null)}
        >
          All
        </button>
        {CATEGORY_PILLS.map((cat) => (
          <button
            key={cat}
            className={`${s.cropFilterPill} ${cropCategoryFilter === cat ? s.cropFilterPillActive : ''}`}
            onClick={() => onCropCategoryFilter(cropCategoryFilter === cat ? null : cat)}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {(showAllCrops ? cropMatches : cropMatches.slice(0, 8)).map((match) => (
          <div key={match.crop.id}>
            <div
              className={`${s.scoreRow} ${s.scoreRowClickable}`}
              onClick={() => onToggleExpanded(match.crop.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleExpanded(match.crop.id); }}
            >
              <ScoreCircle score={match.suitability} size={36} />
              <div style={{ flex: 1 }}>
                <div className={s.scoreLabel}>{match.crop.name}</div>
                <div className={s.cropMeta}>
                  <span className={s.flagSource}>{match.crop.scientificName}</span>
                  {match.limitingFactors.length > 0 && (
                    <span className={s.flagSource}> &middot; Limited by: {match.limitingFactors.join(', ')}</span>
                  )}
                </div>
              </div>
              <span
                className={s.scoreBadge}
                style={{ background: `${getScoreColor(match.suitability)}18`, color: getScoreColor(match.suitability) }}
              >
                {match.suitabilityClass}
              </span>
              <span
                className={s.scoreBadge}
                style={{
                  background: match.irrigationNeeded ? `${confidence.medium}18` : `${confidence.high}18`,
                  color: match.irrigationNeeded ? confidence.medium : confidence.high,
                  fontSize: 10,
                  marginLeft: 4,
                }}
              >
                {match.irrigationNeeded ? `+${match.irrigationGapMm} mm` : 'Rain-fed'}
              </span>
            </div>
            {expandedCrop === match.crop.id && (
              <div className={s.scoreBreakdown}>
                <div className={s.cropDetailHeader}>
                  <span>{CATEGORY_LABELS[match.crop.category] ?? match.crop.category}</span>
                  <span>&middot;</span>
                  <span>{match.crop.lifecycle}</span>
                  <span>&middot;</span>
                  <span>{match.crop.lifeForm}</span>
                  <span>&middot;</span>
                  <span>{match.crop.family}</span>
                </div>
                {match.factors.map((f) => {
                  const pct = Math.round(f.score * 100);
                  return (
                    <div key={f.factor} className={s.breakdownRow}>
                      <span className={s.breakdownName}>
                        {f.limiting ? '\u26A0 ' : ''}{f.factor}
                      </span>
                      <div className={s.breakdownBarTrack}>
                        <div
                          className={s.breakdownBarFill}
                          style={{ width: `${pct}%`, background: getScoreColor(pct) }}
                        />
                      </div>
                      <DelayedTooltip label={f.cropRange}>
                        <span className={s.breakdownValue} tabIndex={0}>
                          {f.siteValue}
                        </span>
                      </DelayedTooltip>
                    </div>
                  );
                })}
                {(() => {
                  const companions = companionCache.get(match.crop.id);
                  if (!companions || companions.length === 0) return null;
                  return (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle, #e0e0e0)', paddingTop: 6 }}>
                      <div className={p.tokenActiveFs10Bold}>
                        Agroforestry Companions
                      </div>
                      {companions.map((c) => (
                        <div key={c.crop.id} className={s.breakdownRow} style={{ gap: 4 }}>
                          <span className={s.breakdownName} style={{ fontSize: 10 }}>
                            {c.crop.name}
                          </span>
                          <span style={{ fontSize: 9, color: confidence.medium, flexShrink: 0 }}>
                            {c.reasons[0]}
                          </span>
                          <span className={s.breakdownValue} style={{ fontSize: 10 }}>
                            {c.compatibilityScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const entry = findCompanions(match.crop.name);
                  if (!entry || (entry.companions.length === 0 && entry.antagonists.length === 0)) return null;
                  return (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle, #e0e0e0)', paddingTop: 6 }}>
                      <div className={p.tokenActiveFs10Bold}>
                        Companion Planting (annual bed)
                      </div>
                      {entry.companions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                          <span className={`${p.tokenIcon} ${p.fs9} ${p.mr2}`}>Pairs:</span>
                          {entry.companions.map((c) => (
                            <DelayedTooltip key={c} label={entry.rationale[c] ?? ''} disabled={!entry.rationale[c]}>
                              <span
                                tabIndex={0}
                                className={s.scoreBadge}
                                style={{
                                  background: `${confidence.high}18`, color: confidence.high, fontSize: 9, padding: '1px 6px',
                                }}
                              >
                                {c}
                              </span>
                            </DelayedTooltip>
                          ))}
                        </div>
                      )}
                      {entry.antagonists.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          <span className={`${p.tokenIcon} ${p.fs9} ${p.mr2}`}>Avoid:</span>
                          {entry.antagonists.map((a) => (
                            <DelayedTooltip key={a} label={entry.rationale[a] ?? ''} disabled={!entry.rationale[a]}>
                              <span
                                tabIndex={0}
                                className={s.scoreBadge}
                                style={{
                                  background: `${confidence.low}18`, color: confidence.low, fontSize: 9, padding: '1px 6px',
                                }}
                              >
                                {a}
                              </span>
                            </DelayedTooltip>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: semantic.sidebarIcon, marginTop: 3, fontStyle: 'italic' }}>
                        Riotte / Jeavons / Hemenway
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
        {cropMatches.length > 8 && (
          <button className={s.showAllToggle} onClick={onToggleShowAll}>
            {showAllCrops ? 'Show top 8' : `Show all ${cropMatches.length} crops`}
          </button>
        )}
      </div>
    </SectionProfiler>
  );
});
