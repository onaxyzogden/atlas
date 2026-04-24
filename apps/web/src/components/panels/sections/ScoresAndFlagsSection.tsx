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

import { memo, useState } from 'react';
import type { ComponentType, MutableRefObject, SVGProps } from 'react';
import { OctagonX, Mountain, Thermometer, Layers, Waves, Droplets, Phone, Upload, Send, X, ArrowRight, PauseCircle, ChevronDown } from 'lucide-react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { Skeleton } from '../../ui/Skeleton.js';
import { Sparkline } from '../../ui/Sparkline.js';
import { ConfBadge, ScoreCircle } from './_shared.js';
import { capConf } from './_helpers.js';
import { LayerLegendPopover } from '../LayerLegendPopover.js';
import { DelayedTooltip } from '../../ui/DelayedTooltip.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

/** Map a BlockingFlagAction kind to its Lucide glyph. Keeps kind→icon
 *  mapping co-located with the renderer rather than in shared scoring. */
function CtaIcon({ kind }: { kind: 'request' | 'upload' | 'contact' | 'dismiss' }) {
  const size = 12;
  const strokeWidth = 2;
  switch (kind) {
    case 'upload':   return <Upload size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'request':  return <Send size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'contact':  return <Phone size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'dismiss':  return <X size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  }
}

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

/** CTA attached to a blocking flag. Mirrors AssessmentFlagAction from
 *  @ogden/shared but duplicated locally so this section has no runtime
 *  dependency on the shared package beyond type-only imports (already
 *  indirectly wired through the LiveData types). */
export interface BlockingFlagAction {
  id: string;
  label: string;
  kind: 'request' | 'upload' | 'contact' | 'dismiss';
  href?: string;
}

export interface BlockingFlag {
  id: string;
  message: string;
  /** Short headline for the alert. Renderer falls back to "Critical Restriction". */
  title?: string;
  layerSource?: string;
  action?: BlockingFlagAction;
}

export interface Tier3Row {
  label: string;
  status: 'complete' | 'computing' | 'waiting';
  /** Which upstream Tier-1 layers are still missing (waiting state only). */
  blockedBy?: string;
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
  /** Formal classification (e.g. "Hardiness zone 6a"). Rendered as a
   *  dedicated chip — distinct from `detail`'s italic qualifier. Phase C. */
  classification?: string;
  /** Provenance metadata — surfaced via delayed tooltip on confidence pill. */
  source?: string;
  dataDate?: string;
  reason?: 'freshness' | 'resolution' | 'authority';
  /** Numeric trend series for inline sparkline (e.g. 12 monthly normals). */
  sparkline?: number[];
  sparklineLabel?: string;
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
  /** Phase B: ref on the suitability card so the parent's sticky
   *  mini-score can observe its intersection with the scroll root. */
  suitabilityRef?: MutableRefObject<HTMLDivElement | null>;
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
  suitabilityRef,
}: ScoresAndFlagsSectionProps) {
  return (
    <SectionProfiler id="site-intel-scores">
      {/* ── Top Bento ──────────────────────────────────────────────
          Scholar #UX (Phase B / #6): the score anchor + peer chrome
          (critical alert + derived analyses) live in a two-column
          Bento band at ≥420 px, collapsing to a single column below.
          Wrapping in `.topBento` replaces the old stacked margin-
          authored spacing — the grid owns gap. */}
      <div className={s.topBento}>
      {/* ── Overall Suitability (elevated anchor) ──────────────────
          Scholar #UX (Phase 1): the suitability score is the "heart"
          of the page and must sit on the highest elevation, *above*
          the blocking-flag alerts. Alerts are peers of the score,
          not a preamble. Reordered from alerts-first. */}
      <div
        className={s.suitabilityCard}
        ref={suitabilityRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Overall suitability score: ${overallScore} out of 100`}
      >
        <ScoreCircle score={overallScore} size={68} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={s.suitabilityTitle}>Overall Suitability</div>
            <ConfBadge level={capConf(overallConfidence)} />
          </div>
          {/* Scholar #UX (Phase C / #2): the "Data layers" label is now
              a popover trigger. Clicking reveals the full legend — which
              dot = which layer = what status — closing the gap between
              the color-dot row and the user's mental model. */}
          <LayerLegendPopover
            layerCompleteness={layerCompleteness}
            tier3Status={tier3Status as Tier3Row[]}
          >
            {(triggerProps) => (
              <button
                type="button"
                className={`${s.completenessLabel} ${s.legendTrigger}`}
                {...triggerProps}
              >
                Data layers: {layerCompleteCount}/7
                {tier3Status.filter((t) => t.status === 'complete').length > 0 && (
                  <span> &middot; {tier3Status.filter((t) => t.status === 'complete').length} derived</span>
                )}
              </button>
            )}
          </LayerLegendPopover>
          {/* a11y: keyboard tooltip deferred — see accessibility-audit.md §5
              (outer row's aggregate title duplicates the per-dot tooltips below; adding
              another tabstop on the wrapper would be redundant) */}
          <div className={s.layerDotsRow} title={layerCompleteness.map((l) => `${l.label}: ${l.status}`).join(', ')}>
            {layerCompleteness.map((l) => (
              <DelayedTooltip key={l.type} label={`${l.label}: ${l.status}`}>
                <div
                  tabIndex={0}
                  className={`${s.layerDot} ${l.status === 'pending' ? s.layerDotPending : ''}`}
                  style={{
                    background: l.status === 'complete' ? confidence.high
                      : l.status === 'pending' ? semantic.sidebarActive
                      : 'var(--color-panel-muted, #666)',
                  }}
                />
              </DelayedTooltip>
            ))}
          </div>
        </div>
      </div>

      {/* Right column of the Bento: critical alerts + derived
          analyses, stacked. Kept peer-of-score rather than preamble. */}
      <div className={s.topBentoRight}>
      {/* ── Blocking Flags (peers of the score, not preamble) ─────
          Scholar #UX (Phase A): actionable alert — Title / Reason /
          Action / Source. The alert is no longer a dead end: every
          flag can carry a primary CTA that transforms the user from
          a blocked bystander into an agent resolving the block. */}
      {blockingFlags.length > 0 && (
        <div className={s.blockingAlertWrap}>
          {blockingFlags.map((flag) => (
            <div key={flag.id} className={s.blockingAlert}>
              <span className={s.blockingAlertIcon} aria-hidden="true">
                <OctagonX size={20} strokeWidth={1.75} />
              </span>
              <div className={s.blockingAlertBody}>
                <div className={s.blockingAlertHeader}>
                  <span className={`${s.severityBadge} ${s.severity_critical}`}>Critical</span>
                  <span className={s.blockingAlertTitle}>
                    {flag.title ?? 'Critical restriction'}
                  </span>
                </div>
                <p className={s.blockingAlertReason}>{flag.message}</p>
                <div className={s.blockingAlertFooter}>
                  {flag.action && (
                    <button
                      type="button"
                      className={s.blockingAlertCta}
                      onClick={() => {
                        // Stub handler — logs the intent. Real wiring to
                        // authority-contact / upload-survey workflows is
                        // deferred to a separate sprint.
                        // eslint-disable-next-line no-console
                        console.info('[blocking-flag-action]', flag.id, flag.action);
                        if (flag.action?.href) {
                          window.open(flag.action.href, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <CtaIcon kind={flag.action.kind} />
                      <span>{flag.action.label}</span>
                      <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                  {flag.layerSource && (
                    <span className={s.flagSource}>{flag.layerSource}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>{/* /.topBentoRight */}
      </div>{/* /.topBento */}

      {/* ── LIVE DATA ────────────────────────────────────────────────
          Scholar #UX (Phase 1 refit): raw evidence (measured US/ON
          layers) now sits above Derived Analyses so the evaluator sees
          the factual stack before computed insights. Order is:
          Summary → Diagnostics → Evidence → Derived. */}
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
                {/* Phase C fix: stack value + classification chip in a
                    vertical group so the classification doesn't steal
                    horizontal space from the value (which was causing
                    Climate's "815 mm/yr · 174 frost-free" to wrap to
                    four lines in the narrow rail). */}
                <div className={s.liveDataRight}>
                  <span className={s.liveDataValue}>{row.value}</span>
                  {row.sparkline && row.sparkline.length >= 3 && (
                    <Sparkline
                      values={row.sparkline}
                      accent="primary"
                      ariaLabel={row.sparklineLabel ?? `${row.label} trend`}
                    />
                  )}
                  {row.classification && (
                    <DelayedTooltip label="Formal classification">
                      <span className={s.classificationChip} tabIndex={0}>
                        {row.classification}
                      </span>
                    </DelayedTooltip>
                  )}
                </div>
                {row.detail && (
                  <span className={s.liveDataDetail}>
                    {row.detail}
                  </span>
                )}
                <ConfBadge
                  level={row.confidence}
                  meta={{ source: row.source, dataDate: row.dataDate, reason: row.reason }}
                />
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

      {/* ── Derived Analyses ─────────────────────────────────────────
          Scholar #UX (Phase 1 + 3 refit): moved below Live Data — the
          user reads evidence first, inference second. When every row
          is still waiting on Tier-1 data, the whole card collapses to
          a single-line disclosure so it stops taking ~120 px of dead
          vertical space. Opens on click to show full dependency map. */}
      {layerCompleteCount > 0 && tier3Status.length > 0 && (
        <DerivedAnalysesCard tier3Status={tier3Status} />
      )}
    </SectionProfiler>
  );
});

/** Collapsed-by-default "Dependencies" card shown when all Tier-3
 *  analyses are still waiting on Tier-1 layers. If any row is actively
 *  computing or complete, the card expands by default. */
function DerivedAnalysesCard({ tier3Status }: { tier3Status: Tier3Row[] }) {
  const allWaiting = tier3Status.every((t) => t.status === 'waiting');
  const [open, setOpen] = useState(!allWaiting);

  const waitingCount = tier3Status.filter((t) => t.status === 'waiting').length;

  return (
    <div className={s.tier3Card}>
      <button
        type="button"
        className={s.tier3Header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {allWaiting ? (
          <>
            <PauseCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={s.tier3HeaderTitle}>
              {waitingCount} analyses awaiting Tier-1 data
            </span>
          </>
        ) : (
          <span className={s.tier3HeaderTitle}>Derived Analyses</span>
        )}
        <span className={p.flex1} />
        <ChevronDown
          size={12}
          strokeWidth={2}
          aria-hidden="true"
          className={`${s.chevron} ${!open ? s.chevronClosed : ''}`}
        />
      </button>
      {open && (
        <div className={s.tier3Body}>
          {tier3Status.map((t3) => (
            <div key={t3.label} className={s.tier3Row}>
              <span>{t3.label}</span>
              {t3.status === 'complete' ? (
                <span className={`${s.tier3Status} ${s.tier3Complete}`}>
                  {'\u2713 Complete'}
                </span>
              ) : t3.status === 'computing' ? (
                <span className={s.tier3Shimmer} aria-label="Computing">
                  <Skeleton width="72px" height="10px" />
                </span>
              ) : (
                <span className={`${s.tier3Status} ${s.tier3Waiting}`}>
                  {t3.blockedBy ? `Awaiting ${t3.blockedBy}` : '\u2014 Waiting'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
