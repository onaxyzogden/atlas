/**
 * Sprint BK — Scores & Flags section extracted from SiteIntelligencePanel.
 *
 * Renders: blocking flags, overall suitability card (score circle + layer
 * completeness dots), tier-3 derived analyses, and the collapsible "Live Data"
 * panel with conservation-authority card + last-fetched caption.
 *
 * Receives all values as props — does not subscribe to siteDataStore itself.
 * Wrapped in React.memo so parent re-renders that don't change these props
 * skip this ~140-line JSX subtree.
 */

import { memo } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { OctagonX, Mountain, Thermometer, Layers, Waves, Droplets } from 'lucide-react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { ConfBadge, ScoreCircle } from './_shared.js';
import { capConf } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

// Map LiveDataRow icon keys (renderer-agnostic, declared in shared scoring)
// to Lucide icon components. Keeping the lookup here means the shared scoring
// module stays free of React/Lucide imports.
type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
const LIVE_DATA_ICONS: Record<string, IconComp> = {
  elevation: Mountain,
  climate: Thermometer,
  soil: Layers,
  wetlands: Waves,
  hydrology: Droplets,
};

export interface BlockingFlag {
  id: string;
  message: string;
  layerSource?: string;
}

export interface Tier3Row {
  label: string;
  status: 'complete' | 'computing' | 'waiting';
}

export interface LayerCompletenessRow {
  type: string;
  label: string;
  status: 'complete' | 'pending' | 'failed' | 'unavailable';
}

export interface LiveDataRow {
  label: string;
  value: string;
  /** Icon key — resolved to a Lucide component via LIVE_DATA_ICONS. */
  icon: 'elevation' | 'climate' | 'soil' | 'wetlands' | 'hydrology';
  color: string;
  confidence: 'High' | 'Medium' | 'Low';
  detail?: string;
}

export interface ConservationAuth {
  name: string;
  watershed: string;
  buffer: string;
}

export interface ScoresAndFlagsSectionProps {
  blockingFlags: BlockingFlag[];
  overallScore: number;
  overallConfidence: 'high' | 'medium' | 'low';
  layerCompleteCount: number;
  layerCompleteness: LayerCompletenessRow[];
  tier3Status: Tier3Row[];
  liveDataOpen: boolean;
  onToggleLiveData: () => void;
  isLive: boolean;
  liveData: LiveDataRow[];
  consAuth: ConservationAuth | null;
  lastFetched: string | null;
  country: string;
}

export const ScoresAndFlagsSection = memo(function ScoresAndFlagsSection({
  blockingFlags,
  overallScore,
  overallConfidence,
  layerCompleteCount,
  layerCompleteness,
  tier3Status,
  liveDataOpen,
  onToggleLiveData,
  isLive,
  liveData,
  consAuth,
  lastFetched,
  country,
}: ScoresAndFlagsSectionProps) {
  return (
    <SectionProfiler id="site-intel-scores">
      {/* ── Blocking Flags ───────────────────────────────────────── */}
      {blockingFlags.length > 0 && (
        <div className={s.blockingAlertWrap}>
          {blockingFlags.map((flag) => (
            <div key={flag.id} className={s.blockingAlert}>
              <span className={s.blockingAlertIcon} aria-hidden="true">
                <OctagonX size={20} strokeWidth={1.75} />
              </span>
              <div style={{ flex: 1 }}>
                <span>{flag.message}</span>
                <div style={{ marginTop: 2 }}>
                  <span className={`${s.severityBadge} ${s.severity_critical}`}>Critical</span>
                  {flag.layerSource && (
                    <span className={s.flagSource} style={{ marginLeft: 6 }}>{flag.layerSource}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Overall Suitability ────────────────────────────────────── */}
      <div className={s.suitabilityCard}>
        <ScoreCircle score={overallScore} size={68} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={s.suitabilityTitle}>Overall Suitability</div>
            <ConfBadge level={capConf(overallConfidence)} />
          </div>
          <div className={s.completenessLabel}>
            Data layers: {layerCompleteCount}/7
            {tier3Status.filter((t) => t.status === 'complete').length > 0 && (
              <span> &middot; {tier3Status.filter((t) => t.status === 'complete').length} derived</span>
            )}
          </div>
          <div className={s.layerDotsRow} title={layerCompleteness.map((l) => `${l.label}: ${l.status}`).join(', ')}>
            {layerCompleteness.map((l) => (
              <div
                key={l.type}
                className={`${s.layerDot} ${l.status === 'pending' ? s.layerDotPending : ''}`}
                title={`${l.label}: ${l.status}`}
                style={{
                  background: l.status === 'complete' ? confidence.high
                    : l.status === 'pending' ? semantic.sidebarActive
                    : 'var(--color-panel-muted, #666)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Tier 3 Status ─────────────────────────────────────────── */}
      {layerCompleteCount > 0 && (
        <div className={s.tier3Card}>
          <h3 className={p.sectionLabel} style={{ marginBottom: 4 }}>Derived Analyses</h3>
          {tier3Status.map((t3) => (
            <div key={t3.label} className={s.tier3Row}>
              <span>{t3.label}</span>
              <span className={`${s.tier3Status} ${
                t3.status === 'complete' ? s.tier3Complete
                  : t3.status === 'computing' ? s.tier3Computing
                  : s.tier3Waiting
              }`}>
                {t3.status === 'complete' ? '\u2713 Complete'
                  : t3.status === 'computing' ? '\u25CB Computing'
                  : '\u2014 Waiting'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── LIVE DATA ──────────────────────────────────────────────── */}
      <div className={s.liveDataWrap}>
        <button
          onClick={onToggleLiveData}
          className={`${s.liveDataHeader} ${liveDataOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke={semantic.sidebarActive} strokeWidth={1.5}>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" strokeLinecap="round" />
          </svg>
          <span className={s.liveDataTitle}>
            Live {country === 'CA' ? 'Ontario' : 'US'} Data
          </span>
          {isLive && (
            <span className={`${p.badgeConfidence} ${p.badgeHigh}`}>
              Live
            </span>
          )}
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round" className={`${s.chevron} ${!liveDataOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>

        {liveDataOpen && (<>
          <div className={p.innerPad}>
            {liveData.map((row) => {
              const Icon = LIVE_DATA_ICONS[row.icon];
              return (
              <div key={row.label} className={s.liveDataRow}>
                <span className={s.liveDataIcon} style={{ color: row.color }} aria-hidden="true">
                  {Icon ? <Icon size={14} strokeWidth={1.75} /> : null}
                </span>
                <span className={s.liveDataLabel}>{row.label}</span>
                <div className={p.rightAlign}>
                  <span className={s.liveDataValue}>{row.value}</span>
                </div>
                {row.detail && (
                  <span className={s.liveDataDetail}>
                    {row.detail}
                  </span>
                )}
                <ConfBadge level={row.confidence} />
              </div>
              );
            })}
          </div>

          {consAuth && (
            <div className={s.consCard}>
              <div className={s.consName}>{consAuth.name}</div>
              <div className={s.consDetail}>
                {consAuth.watershed}
                <br />
                {consAuth.buffer}
              </div>
            </div>
          )}

          {lastFetched && (
            <div className={s.lastFetched}>
              Last fetched: {lastFetched}
            </div>
          )}
        </>)}
      </div>
    </SectionProfiler>
  );
});
