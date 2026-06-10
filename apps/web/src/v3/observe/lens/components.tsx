// components.tsx — Observe lens surface (mock-backed; not yet wired to live data)
//
// Faithful JS→TS port of every presentational component in the observational-
// lens Observe concept. Inline styles + the local C/F token palette are kept
// verbatim for pixel fidelity (NOT reskinned to tokens.css). All data flows
// from the resolved LensDataBundle via useLensData() (mock OR live); lens
// identity originates in @ogden/shared via OBSERVE_LENSES.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ObserveLensId } from '@ogden/shared';
import { C, F } from './tokens.js';
import { OBSERVE_COPY } from '../../copy/index.js';
import { useLensData } from './lensData/LensDataContext.js';
import type {
  ClimateData,
  DataPoint,
  Freshness,
  HumanData,
  HydrologyData,
  InfraEmptyData,
  LensDisplay,
  MockObservation,
  SoilData,
  TopographyData,
} from './types.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function FreshnessBadge({ freshness, compact }: { freshness: Freshness; compact?: boolean }) {
  const { freshness: FRESHNESS } = useLensData();
  const cfg = FRESHNESS[freshness] || FRESHNESS.missing;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: F.sans, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
      {cfg.dot && <span style={{ width: 5, height: 5, borderRadius: 3, background: cfg.color, display: 'inline-block' }} />}
      {!compact && cfg.label}
    </span>
  );
}

function ConfidenceDot({ level }: { level?: string }) {
  const colors: Record<string, string> = { high: C.green, medium: C.amber, low: C.textTertiary };
  return <span style={{ width: 6, height: 6, borderRadius: 3, background: (level && colors[level]) || C.textTertiary, display: 'inline-block' }} />;
}

// --- OBSERVATION PIN (shared by PseudoMap + ObserveMap) -------------------------
// One observation marker in absolute SVG user-space coords (px, py). PseudoMap
// passes coords from the normalized [0,1] viewBox; ObserveMap passes screen px
// from map.project(...). `pointerEvents: 'auto'` lets pins stay clickable when
// the ObserveMap overlay container sets pointer-events: none (harmless in
// PseudoMap, whose container has default pointer-events). Markup is identical to
// the prior inline pin -- this is a DRY extraction, not a redesign.
export function ObservationPin({
  px,
  py,
  obs,
  mapColor,
  isActive,
  isSelected,
  onClick,
}: {
  px: number;
  py: number;
  obs: MockObservation;
  mapColor?: string;
  isActive: boolean;
  isSelected: boolean;
  onClick: (obs: MockObservation) => void;
}) {
  const isDivergence = obs.type === 'divergence';
  return (
    <g
      style={{ cursor: 'pointer', opacity: isActive ? 1 : 0.12, transition: 'opacity 0.3s', pointerEvents: 'auto' }}
      onClick={() => onClick(obs)}
    >
      {isSelected && (
        <circle cx={px} cy={py} r={16} fill="none" stroke={mapColor} strokeWidth="1" opacity="0.5">
          <animate attributeName="r" from="12" to="22" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isDivergence ? (
        <polygon points={`${px},${py - 8} ${px + 7},${py + 4} ${px - 7},${py + 4}`} fill={C.amber} filter="url(#glow)" />
      ) : (
        <circle
          cx={px}
          cy={py}
          r={isSelected ? 7 : 5}
          fill={mapColor || C.textSecondary}
          stroke={isSelected ? '#EDE9E0' : 'transparent'}
          strokeWidth="1.5"
          filter={isSelected ? 'url(#glow)' : 'none'}
          style={{ transition: 'r 0.2s' }}
        />
      )}
    </g>
  );
}

// ─── PSEUDO MAP ───────────────────────────────────────────────────────────────
export function PseudoMap({ activeLens, onObsClick, selectedObs }: {
  activeLens: string;
  onObsClick: (obs: MockObservation) => void;
  selectedObs: MockObservation | null;
}) {
  const { lenses: LENSES, observations: MOCK_OBSERVATIONS, project: PROJECT } = useLensData();
  const lensById: Record<string, LensDisplay> = Object.fromEntries(LENSES.map((l) => [l.id, l]));
  const contours = [
    'M 60 380 Q 180 340 300 360 Q 420 380 520 350 Q 580 330 640 340',
    'M 40 320 Q 160 280 290 300 Q 430 320 540 290 Q 610 270 660 280',
    'M 20 250 Q 150 210 280 230 Q 440 260 560 220 Q 630 200 680 210',
    'M 80 170 Q 200 140 320 160 Q 460 185 570 155 Q 640 138 690 148',
    'M 140 90  Q 250 70  360 88  Q 490 108 590 85  Q 655 72  700 80',
  ];
  const waterPath = 'M 280 50 Q 310 120 330 190 Q 345 240 350 310 Q 352 360 340 420 Q 330 460 310 510';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0D1209', overflow: 'hidden' }}>
      <svg viewBox="0 0 720 550" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="tg" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#1A1F10" />
            <stop offset="60%" stopColor="#111409" />
            <stop offset="100%" stopColor="#0A0D06" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="sglow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width="720" height="550" fill="url(#tg)" />
        <rect x="28" y="28" width="664" height="494" rx="4" fill="none" stroke="#2A3020" strokeWidth="1.5" strokeDasharray="6 4" />
        {contours.map((d, i) => <path key={i} d={d} fill="none" stroke={activeLens === 'foundation' ? '#2A3018' : '#1E2412'} strokeWidth={activeLens === 'foundation' ? '1.2' : '0.8'} style={{ transition: 'all 0.4s' }} />)}
        <path d={waterPath} fill="none" stroke={activeLens === 'water' ? C.water + '90' : C.water + '30'} strokeWidth={activeLens === 'water' ? '2.5' : '1.5'} strokeLinecap="round" style={{ transition: 'all 0.4s' }} filter={activeLens === 'water' ? 'url(#sglow)' : 'none'} />
        <ellipse cx="200" cy="320" rx="120" ry="80" fill={C.sageDim + '30'} style={{ opacity: activeLens === 'living' ? 0.7 : 0.2, transition: 'opacity 0.4s' }} />
        <ellipse cx="520" cy="430" rx="100" ry="70" fill={C.amberDim + '40'} style={{ opacity: activeLens === 'climate' ? 0.7 : 0.15, transition: 'opacity 0.4s' }} />
        {MOCK_OBSERVATIONS.map((obs) => {
          const lens = lensById[obs.lens];
          const isActive = !activeLens || activeLens === 'all' || obs.lens === activeLens;
          const isSelected = selectedObs?.id === obs.id;
          return (
            <ObservationPin
              key={obs.id}
              px={obs.x * 720}
              py={obs.y * 550}
              obs={obs}
              mapColor={lens?.mapColor}
              isActive={isActive}
              isSelected={isSelected}
              onClick={onObsClick}
            />
          );
        })}
      </svg>
      {selectedObs && (
        <div style={{ position: 'absolute', left: `calc(${selectedObs.x * 100}% + 14px)`, top: `calc(${selectedObs.y * 100}% - 20px)`, background: C.bg3, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '8px 12px', maxWidth: 200, pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
          <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600, fontFamily: F.sans }}>{selectedObs.label}</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, fontFamily: F.mono }}>{selectedObs.type} · {selectedObs.age} ago</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: C.water }} /><span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>Water</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="9" height="8"><polygon points="4.5,0 9,8 0,8" fill={C.amber} /></svg><span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>Divergence ▲</span></div>
      </div>
      <div style={{ position: 'absolute', top: 12, left: 12, background: C.bg3 + 'EE', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: C.textSecondary, fontFamily: F.mono, letterSpacing: '0.08em' }}>
        CYCLE {PROJECT.cycle}  ·  {PROJECT.totalDataPoints} DATA POINTS
      </div>
    </div>
  );
}

// ─── LENS BAR ─────────────────────────────────────────────────────────────────
export function LensBar({ activeLens, onLensChange }: { activeLens: string; onLensChange: (id: string) => void }) {
  const { lenses: LENSES, freshness: FRESHNESS } = useLensData();
  const items: Array<{ id: string; label: string; icon: string; color: string; freshness?: Freshness }> = [
    { id: 'all', label: 'All', icon: '⊕', color: C.textSecondary },
    ...LENSES,
  ];
  return (
    <div style={{ display: 'flex', gap: 2, padding: '8px 10px', background: C.bg2, borderBottom: `1px solid ${C.border}`, overflowX: 'auto', flexShrink: 0 }}>
      {items.map((l) => {
        const isEmpty = l.freshness === 'missing';
        const fresh = l.freshness ? FRESHNESS[l.freshness] : null;
        const active = activeLens === l.id;
        return (
          <button key={l.id} onClick={() => onLensChange(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, border: `1px solid ${active ? l.color : C.border}`, background: active ? l.color + '20' : 'transparent', color: active ? l.color : isEmpty ? C.textTertiary : C.textSecondary, fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: F.sans, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s', opacity: isEmpty && !active ? 0.5 : 1 }}>
            <span style={{ fontSize: 12 }}>{l.icon}</span>
            {l.label}
            {fresh && !isEmpty && fresh.dot && l.freshness !== 'current' && <span style={{ width: 6, height: 6, borderRadius: 3, background: fresh.color, display: 'inline-block' }} />}
            {isEmpty && <span style={{ fontSize: 10, color: C.textTertiary }}>—</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── INTELLIGENCE PANEL ───────────────────────────────────────────────────────
export function IntelligencePanel({ activeLens, selectedObs, onOpenDetail, footer }: {
  activeLens: string;
  selectedObs: MockObservation | null;
  onOpenDetail: (lensId: ObserveLensId) => void;
  // Optional lens-level content rendered INSIDE the single scroll body, after
  // the active view — lets the Observe dashboard stack the Recent Observations
  // list beneath Land Intelligence in one shared scroll (no separate rail).
  footer?: ReactNode;
}) {
  const { lenses: LENSES } = useLensData();
  const [view, setView] = useState<'summary' | 'temporal'>('summary');
  const lens = LENSES.find((l) => l.id === activeLens);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 4px', flexShrink: 0 }}>
        {[{ id: 'summary', label: 'Land State' }, { id: 'temporal', label: 'Timeline' }].map((tab) => (
          <button key={tab.id} onClick={() => setView(tab.id as 'summary' | 'temporal')} style={{ flex: 1, padding: '11px 4px', fontSize: 12, fontWeight: 600, fontFamily: F.sans, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'transparent', border: 'none', borderBottom: view === tab.id ? `2px solid ${C.textSecondary}` : '2px solid transparent', color: view === tab.id ? C.textPrimary : C.textTertiary, cursor: 'pointer', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'summary' && <SummaryView lens={lens} activeLens={activeLens} selectedObs={selectedObs} onOpenDetail={onOpenDetail} />}
        {view === 'temporal' && <TemporalView lens={lens} activeLens={activeLens} />}
        {footer}
      </div>
    </div>
  );
}

function SummaryView({ lens, activeLens, selectedObs, onOpenDetail }: {
  lens?: LensDisplay;
  activeLens: string;
  selectedObs: MockObservation | null;
  onOpenDetail: (lensId: ObserveLensId) => void;
}) {
  const { domainDetail: DOMAIN_DETAIL, project: PROJECT } = useLensData();
  const detail = DOMAIN_DETAIL[activeLens as ObserveLensId];
  // Router-sourced projectId: present on the project-scoped Observe mounts
  // (/v3/project/$projectId/observe/...), absent on the standalone mock
  // prototype route. The "Review in Plan" CTA only navigates when scoped to a
  // real project; in the mock prototype it stays inert.
  const navigate = useNavigate();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const handleReviewInPlan = () => {
    if (!projectId) return;
    navigate({ to: '/v3/project/$projectId/plan', params: { projectId } });
  };
  return (
    <div>
      {PROJECT.planRevision.active && (
        <div style={{ margin: '12px 12px 0', background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
            <span>⚠ Plan Review Required</span><span style={{ fontWeight: 400 }}>{PROJECT.planRevision.count} triggers</span>
          </div>
          {PROJECT.planRevision.triggers.map((t, i) => (
            <div key={i} style={{ marginBottom: i < PROJECT.planRevision.triggers.length - 1 ? 6 : 0 }}>
              <div style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>{t.domain}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{t.detail}</div>
            </div>
          ))}
          <button type="button" onClick={handleReviewInPlan} disabled={!projectId} style={{ marginTop: 8, width: '100%', padding: '6px 0', background: C.amber + '20', border: `1px solid ${C.amber}40`, borderRadius: 6, color: C.amber, fontSize: 12, fontWeight: 600, cursor: projectId ? 'pointer' : 'default', fontFamily: F.sans }}>Review in Plan →</button>
        </div>
      )}
      <div style={{ padding: '12px 12px 0' }}>
        <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Land State · {PROJECT.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[{ label: 'Total observations', value: PROJECT.totalDataPoints, color: C.textPrimary }, { label: 'Domains current', value: PROJECT.domainsCurrentCount, color: C.green }, { label: 'Ageing / stale', value: PROJECT.domainsAgeingCount, color: C.amber }, { label: OBSERVE_COPY.notYetRead, value: PROJECT.domainsMissingCount, color: C.textTertiary }].map((stat) => (
            <div key={stat.label} style={{ background: C.bg3, borderRadius: 7, padding: '8px 10px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: F.mono }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2, fontFamily: F.sans }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      {selectedObs && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Selected Observation</div>
          <div style={{ background: C.bg3, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.borderLight}` }}>
            <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600, marginBottom: 4, fontFamily: F.sans }}>{selectedObs.label}</div>
            <div style={{ display: 'flex', gap: 8 }}><span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.mono }}>{selectedObs.type}</span><span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>{selectedObs.age} ago</span></div>
            {selectedObs.type === 'divergence' && <div style={{ marginTop: 8, padding: '5px 8px', background: C.amberDim, borderRadius: 5, fontSize: 11, color: C.amber }}>Unresolved divergence — review in Act</div>}
          </div>
        </div>
      )}
      {lens && activeLens !== 'all' && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ height: 1, background: C.border, marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: lens.color, fontFamily: F.serif }}>{lens.label}</div>
            <FreshnessBadge freshness={lens.freshness} />
          </div>
          {lens.summary ? <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 12, fontFamily: F.sans }}>{lens.summary}</div> : <div style={{ textAlign: 'center', padding: '16px 0' }}><div style={{ fontSize: 28, color: C.textTertiary, marginBottom: 6, opacity: 0.4 }}>{lens.icon}</div><div style={{ fontSize: 13, color: C.textTertiary, fontFamily: F.sans, lineHeight: 1.5 }}>Your land is ready to be read.</div></div>}
          {lens.keyData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {lens.keyData.map((kd) => (
                <div key={kd.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans }}>{kd.label}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.mono, fontWeight: 600 }}>{kd.value}</span><ConfidenceDot level={kd.confidence} /></div>
                </div>
              ))}
            </div>
          )}
          {lens.divergence && <div style={{ marginBottom: 8, padding: '8px 10px', background: C.amberDim, borderRadius: 6, border: `1px solid ${C.amber}30` }}><div style={{ fontSize: 11, color: C.amber, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unresolved Divergence</div><div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{lens.divergence.label}</div><div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2, fontFamily: F.mono }}>{lens.divergence.age} ago</div></div>}
          {lens.planTrigger && <div style={{ marginBottom: 8, padding: '8px 10px', background: C.goldDim, borderRadius: 6, border: `1px solid ${C.gold}30` }}><div style={{ fontSize: 11, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan Trigger</div><div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{lens.planTrigger.label}</div></div>}
          {detail && (
            <button onClick={() => onOpenDetail(activeLens as ObserveLensId)} style={{ width: '100%', padding: '8px 0', background: lens.color + '18', border: `1px solid ${lens.color}40`, borderRadius: 7, color: lens.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F.sans, letterSpacing: '0.02em' }}>
              Domain Detail → All {lens.observations} observations
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DOMAINS RAIL (left sidebar) ─────────────────────────────────────────────
export function DomainsView({ activeLens, onSelectLens, onOpenDetail, horizontal = false }: {
  activeLens: string;
  onSelectLens: (id: string) => void;
  onOpenDetail: (lensId: ObserveLensId) => void;
  horizontal?: boolean;
}) {
  const { lenses: LENSES, domainDetail: DOMAIN_DETAIL } = useLensData();
  // Horizontal mode: lens cards laid out as a scroll-x row (the top-bar lens
  // selector). Vertical mode (default): the original stacked left-rail list.
  const outerStyle: CSSProperties = horizontal
    ? { display: 'flex', flexDirection: 'row', gap: 8, padding: '10px 12px', overflowX: 'auto', alignItems: 'stretch' }
    : { padding: '12px' };
  return (
    <div style={outerStyle}>
      {!horizontal && (
        <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>6 Observational Lenses</div>
      )}
      {LENSES.map((lens) => {
        const isActive = activeLens === lens.id;
        const hasDetail = Boolean(DOMAIN_DETAIL[lens.id]);
        return (
          <div key={lens.id} style={horizontal ? { width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' } : { marginBottom: 6 }}>
            <div onClick={() => onSelectLens(isActive ? 'all' : lens.id)} style={{ padding: '10px 12px', background: isActive ? lens.color + '14' : C.bg3, border: `1px solid ${isActive ? lens.color + '50' : C.border}`, borderRadius: hasDetail ? '8px 8px 0 0' : 8, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16, color: lens.color }}>{lens.icon}</span><span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.sans }}>{lens.label}</span></div>
                <FreshnessBadge freshness={lens.freshness} compact />
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>{lens.observations} obs{lens.lastObserved ? ` · ${lens.lastObserved}` : ''}</span>
                {lens.divergence && <span style={{ fontSize: 11, color: C.amber }}>▲ Divergence</span>}
              </div>
              {lens.summary && <div style={{ marginTop: 4, fontSize: 12, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.5 }}>{lens.summary.length > 70 ? lens.summary.slice(0, 68) + '…' : lens.summary}</div>}
            </div>
            {hasDetail && (
              <button onClick={() => onOpenDetail(lens.id)} style={{ width: '100%', padding: '6px 0', background: lens.color + '0A', border: `1px solid ${lens.color}30`, borderTop: 'none', borderRadius: '0 0 8px 8px', color: lens.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F.sans }}>
                View all observations →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DomainsRail({ activeLens, onSelectLens, onOpenDetail }: {
  activeLens: string;
  onSelectLens: (id: string) => void;
  onOpenDetail: (lensId: ObserveLensId) => void;
}) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: C.bg2, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DomainsView activeLens={activeLens} onSelectLens={onSelectLens} onOpenDetail={onOpenDetail} />
      </div>
    </div>
  );
}

function TemporalView({ lens, activeLens }: { lens?: LensDisplay; activeLens: string }) {
  const TEMPORAL_DATA: Record<string, { metric: string; points: Array<{ cycle: string; date: string; value: number; location: string }> }> = {
    water: { metric: 'Infiltration rate (mm/hr)', points: [{ cycle: 'Baseline', date: 'Oct 24', value: 28, location: 'Zone A' }, { cycle: 'Baseline', date: 'Oct 24', value: 41, location: 'Zone B' }, { cycle: 'Baseline', date: 'Nov 24', value: 35, location: 'Zone C' }, { cycle: 'Cycle 1', date: 'Jan 25', value: 62, location: 'Zone A' }, { cycle: 'Cycle 1', date: 'Feb 25', value: 58, location: 'Zone B' }] },
    living: { metric: 'Soil pH', points: [{ cycle: 'Baseline', date: 'Mar 24', value: 5.2, location: 'Zone 1' }, { cycle: 'Baseline', date: 'Mar 24', value: 5.4, location: 'Zone 2' }, { cycle: 'Baseline', date: 'Mar 24', value: 6.1, location: 'Zone 3' }] },
  };
  const data = activeLens && activeLens !== 'all' ? TEMPORAL_DATA[activeLens] : null;
  if (!data) return <div style={{ padding: '20px 16px', textAlign: 'center' }}><div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 8, fontFamily: F.sans }}>Select a lens to view its timeline</div><div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans }}>Timeline requires ≥ 2 observations at the same location across cycles.</div></div>;
  const values = data.points.map((p) => p.value), min = Math.min(...values) * 0.9, max = Math.max(...values) * 1.1, range = max - min;
  const chartH = 100, chartW = 240, pad = 16;
  const pts = data.points.map((p, i) => ({ ...p, px: pad + (i / (data.points.length - 1)) * (chartW - pad * 2), py: chartH - pad - ((p.value - min) / range) * (chartH - pad * 2) }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ');
  const first = pts[0], last = pts[pts.length - 1];
  const areaD = first && last ? `${pathD} L ${last.px} ${chartH - pad} L ${first.px} ${chartH - pad} Z` : pathD;
  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Timeline · {lens?.label}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10, fontFamily: F.sans }}>{data.metric}</div>
      <div style={{ background: C.bg3, borderRadius: 8, padding: '12px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ display: 'block' }}>
          <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lens?.color || C.teal} stopOpacity="0.3" /><stop offset="100%" stopColor={lens?.color || C.teal} stopOpacity="0" /></linearGradient></defs>
          <path d={areaD} fill="url(#ag)" />
          <path d={pathD} fill="none" stroke={lens?.color || C.teal} strokeWidth="1.5" strokeLinecap="round" />
          {pts.map((p, i) => <circle key={i} cx={p.px} cy={p.py} r="3" fill={lens?.color || C.teal} stroke={C.bg3} strokeWidth="1.5" />)}
        </svg>
      </div>
      {pts.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
          <div><span style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.mono, fontWeight: 600 }}>{p.value}</span><span style={{ fontSize: 11, color: C.textTertiary, marginLeft: 6, fontFamily: F.sans }}>{p.location}</span></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.mono }}>{p.date}</div><div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans }}>{p.cycle}</div></div>
        </div>
      ))}
    </div>
  );
}

// ─── DOMAIN DETAIL SLIDE-UP ───────────────────────────────────────────────────
export function DomainDetailSlideUp({ lensId, onClose }: { lensId: ObserveLensId; onClose: () => void }) {
  const { domainDetail: DOMAIN_DETAIL, lenses: LENSES, typeIcon: TYPE_ICON } = useLensData();
  const detail = DOMAIN_DETAIL[lensId];
  const lens = LENSES.find((l) => l.id === lensId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ flood: true });
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);

  if (!detail || !lens) return null;

  const toggleCollapsed = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  const togglePoint = (id: string) => setExpandedPoint((prev) => (prev === id ? null : id));

  const allTypes = [...new Set(detail.subdomains.flatMap((sd) => sd.points.map((p) => p.type)))];

  const filterPoints = (points: DataPoint[]) =>
    activeFilter === 'all' ? points : points.filter((p) => p.type === activeFilter);

  const divergencePoints = detail.subdomains.flatMap((sd) => sd.points).filter((p) => p.isDivergence);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: C.bg, animation: 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, flexShrink: 0, background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: F.sans }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, color: lens.color }}>{lens.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: lens.color, fontFamily: F.serif }}>{detail.lensLabel}</div>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>{detail.domains.join(' · ')}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FreshnessBadge freshness={detail.freshness} />
          <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>{detail.totalPoints} data points</span>
          <button style={{ padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, background: C.bg3, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: F.sans }}>View Timeline ↗</button>
        </div>
      </div>

      {/* ── Body: two-column ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: focused domain map + specialised display */}
        <div style={{ width: '42%', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` }}>

          {/* Domain map */}
          <div style={{ height: '40%', position: 'relative', background: '#0A0F08', borderBottom: `1px solid ${C.border}` }}>
            <DomainMiniMap lensId={lensId} lens={lens} focusId={mapFocusId} />
          </div>

          {/* Specialised display */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {detail.specialised.type === 'hydrology' && <HydrologySpecialised data={detail.specialised} color={lens.color} />}
            {detail.specialised.type === 'soil' && <SoilSpecialised data={detail.specialised} color={lens.color} />}
            {detail.specialised.type === 'topography' && <TopographySpecialised data={detail.specialised} />}
            {detail.specialised.type === 'climate' && <ClimateSpecialised data={detail.specialised} color={lens.color} />}
            {detail.specialised.type === 'human' && <HumanSpecialised data={detail.specialised} />}
            {detail.specialised.type === 'infrastructure_empty' && <InfrastructureEmptySpecialised data={detail.specialised} />}
            {/* Graceful degrade (live mode): no structured measurement series
                exists for this lens (seeded captures carry only label + note),
                so there is nothing to chart. The real captured observations
                still render in the right-hand data-point list. */}
            {detail.specialised.type === 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 2px' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                  No structured measurements yet
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: C.textTertiary }}>
                  This lens has no recorded measurement series to chart -- showing the captured observations on the right.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: data point list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Filter bar */}
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0, background: C.bg2 }}>
            {['all', ...allTypes].map((t) => (
              <button key={t} onClick={() => setActiveFilter(t)} style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${t === activeFilter ? lens.color : C.border}`, background: t === activeFilter ? lens.color + '20' : 'transparent', color: t === activeFilter ? lens.color : C.textTertiary, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F.sans, textTransform: t === 'all' ? 'none' : 'capitalize' }}>
                {TYPE_ICON[t] || ''} {t === 'all' ? 'All types' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Sub-domain groups */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {detail.subdomains.map((sd) => {
              const isCollapsed = collapsed[sd.id] ?? sd.collapsed;
              const filtered = filterPoints(sd.points);
              if (filtered.length === 0 && activeFilter !== 'all') return null;
              return (
                <div key={sd.id}>
                  {/* Sub-domain header */}
                  <div onClick={() => toggleCollapsed(sd.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', background: C.bg2, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13, color: lens.color, opacity: 0.7 }}>{sd.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, fontFamily: F.sans }}>{sd.label}</span>
                      <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>{sd.points.length} {sd.points.length === 1 ? 'point' : 'points'}</span>
                    </div>
                    <span style={{ fontSize: 11, color: C.textTertiary }}>{isCollapsed ? '▸' : '▾'}</span>
                  </div>

                  {/* Points */}
                  {!isCollapsed && filtered.length === 0 && sd.emptyNote && (
                    <div style={{ padding: '14px 16px', background: 'transparent' }}>
                      <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans, lineHeight: 1.6, fontStyle: 'italic' }}>{sd.emptyNote}</div>
                    </div>
                  )}
                  {!isCollapsed && filtered.map((pt) => (
                    <DataPointRow key={pt.id} pt={pt} lensColor={lens.color} isExpanded={expandedPoint === pt.id} onToggle={() => { togglePoint(pt.id); setMapFocusId(pt.id); }} />
                  ))}
                </div>
              );
            })}

            {/* Divergence section */}
            {divergencePoints.length > 0 && (
              <div>
                <div style={{ padding: '9px 14px', background: C.amberDim, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.amber}30`, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, color: C.amber }}>▲</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.amber, fontFamily: F.sans }}>Divergence Records</span>
                  <span style={{ fontSize: 11, color: C.amber + '99', fontFamily: F.mono }}>{divergencePoints.length} unresolved</span>
                </div>
                {divergencePoints.map((pt) => (
                  <DataPointRow key={pt.id} pt={pt} lensColor={C.amber} isDivergenceSection isExpanded={expandedPoint === pt.id} onToggle={() => { togglePoint(pt.id); setMapFocusId(pt.id); }} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DATA POINT ROW ───────────────────────────────────────────────────────────
function DataPointRow({ pt, lensColor, isDivergenceSection, isExpanded, onToggle }: {
  pt: DataPoint;
  lensColor: string;
  isDivergenceSection?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { typeIcon: TYPE_ICON } = useLensData();
  const isSuperseded = pt.isSuperseded;
  const isDivergence = pt.isDivergence;
  const rowColor = isDivergenceSection ? C.amber : lensColor;
  // Mockup data-log convention: colour the entry icon + value by observation
  // TYPE (measurement/trace/logged), not the lens colour. Falls back to the
  // lens colour for any unmapped type. Divergence keeps amber.
  const TYPE_COLOR: Record<string, string> = {
    measurement: C.teal, gps_trace: C.blue, gps_point: C.blue, logged_result: C.green,
    observation_note: C.green, species: C.sage, photo: C.blue, declaration: C.gold,
  };
  const typeColor = isDivergence ? C.amber : (TYPE_COLOR[pt.type] ?? rowColor);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: isExpanded ? C.bg3 : isSuperseded ? C.bg + '80' : 'transparent', opacity: isSuperseded ? 0.55 : 1, transition: 'background 0.15s' }}>
      {/* Row summary */}
      <div onClick={onToggle} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Type icon */}
        <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, marginTop: 1, background: isDivergence ? C.amberDim : typeColor + '18', border: `1px solid ${isDivergence ? C.amber + '40' : typeColor + '30'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: isDivergence ? C.amber : typeColor }}>
          {isDivergence ? '▲' : (TYPE_ICON[pt.type] || '·')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isSuperseded ? C.textTertiary : C.textPrimary, fontFamily: F.sans, lineHeight: 1.3 }}>{pt.label}</span>
            {isSuperseded && (
              <span style={{ fontSize: 10, background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 5px', color: C.textTertiary, fontFamily: F.sans, fontWeight: 600 }}>SUPERSEDED</span>
            )}
            {pt.supersedesId && (
              <span style={{ fontSize: 10, background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 4, padding: '1px 5px', color: C.green, fontFamily: F.sans, fontWeight: 600 }}>REPLACES EARLIER</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: typeColor, fontFamily: F.mono, fontWeight: 600, marginBottom: 3 }}>{pt.value}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>{pt.location}</span>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>·</span>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>{pt.observedAt}</span>
            <ConfidenceDot level={pt.confidence} />
          </div>
        </div>

        <span style={{ fontSize: 12, color: C.textTertiary, flexShrink: 0, marginTop: 6 }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: '2px 16px 14px 52px' }}>

          {/* Proof record */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Proof Record</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(pt.photos ?? 0) > 0 && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '3px 9px', background: C.bg4, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
                  <span style={{ fontSize: 10, color: C.textSecondary }}>⊡ {pt.photos} photo{(pt.photos ?? 0) > 1 ? 's' : ''}</span>
                </div>
              )}
              {(pt.gpsPoints ?? 0) > 0 && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '3px 9px', background: C.bg4, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
                  <span style={{ fontSize: 10, color: C.textSecondary }}>• {pt.gpsPoints} GPS point{(pt.gpsPoints ?? 0) > 1 ? 's' : ''}</span>
                </div>
              )}
              {pt.measurements && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '3px 9px', background: C.bg4, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
                  <span style={{ fontSize: 10, color: C.textSecondary }}>⊞ {pt.measurements}</span>
                </div>
              )}
            </div>
            {pt.notes && (
              <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5, fontFamily: F.sans, fontStyle: 'italic', padding: '7px 10px', background: C.bg4, borderLeft: `2px solid ${C.borderLight}`, borderRadius: '0 5px 5px 0' }}>
                "{pt.notes}"
              </div>
            )}
          </div>

          {/* Source + cycle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F.sans }}>Source task</div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.4 }}>{pt.sourceTask}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textTertiary, fontFamily: F.sans }}>Plan objective</div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.4 }}>{pt.planObjective}</div>
            </div>
          </div>

          {/* Timestamps + cycle */}
          <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono, marginBottom: 8 }}>
            Observed: {pt.observedAt} · Recorded: {pt.recordedAt} · {pt.cycle}
          </div>

          {/* Supersession notice */}
          {pt.isSuperseded && (
            <div style={{ padding: '6px 9px', background: C.bg4, borderRadius: 5, border: `1px solid ${C.border}`, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>
                Superseded by a later observation at the same location.
                <button style={{ marginLeft: 8, fontSize: 11, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.sans, padding: 0 }}>View superseding record →</button>
              </div>
              <button style={{ marginTop: 5, fontSize: 11, color: C.textTertiary, background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontFamily: F.sans }}>Mark as "not a replacement"</button>
            </div>
          )}
          {pt.supersedesId && (
            <div style={{ padding: '6px 9px', background: C.greenDim, borderRadius: 5, border: `1px solid ${C.green}20`, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: C.green, fontFamily: F.sans }}>
                Replaces an earlier observation.
                <button style={{ marginLeft: 8, fontSize: 11, color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.sans, padding: 0 }}>View superseded record →</button>
              </div>
            </div>
          )}

          {/* Divergence status */}
          {pt.isDivergence && (
            <div style={{ padding: '7px 10px', background: C.amberDim, borderRadius: 6, border: `1px solid ${C.amber}30` }}>
              <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginBottom: 2 }}>Unresolved divergence · {pt.divergenceAge} open</div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans, marginBottom: 6 }}>No Plan revision triggered yet. Review required before next Act cycle.</div>
              <button style={{ fontSize: 11, color: C.amber, background: 'none', border: `1px solid ${C.amber}40`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: F.sans }}>Flag for Plan revision →</button>
            </div>
          )}

          {/* Tags */}
          {pt.tags && pt.tags.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {pt.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 9, color: C.textTertiary, background: C.bg4, border: `1px solid ${C.borderLight}`, borderRadius: 5, padding: '1px 7px', fontFamily: F.sans }}>{tag}</span>
              ))}
            </div>
          )}

          {/* View on map */}
          <button style={{ marginTop: 10, fontSize: 11, color: C.textSecondary, background: 'transparent', border: `1px solid ${C.borderLight}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: F.sans, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>⊹ View on map</button>
        </div>
      )}
    </div>
  );
}

// ─── DOMAIN MINI MAP ──────────────────────────────────────────────────────────
function DomainMiniMap({ lensId, lens, focusId }: { lensId: ObserveLensId; lens: LensDisplay; focusId: string | null }) {
  const { observations: MOCK_OBSERVATIONS } = useLensData();
  const waterPath = 'M 140 10 Q 155 55 165 95 Q 173 120 175 155 Q 176 180 170 210 Q 165 230 155 255';
  const contours = [
    'M 20 200 Q 90 175 150 185 Q 210 195 260 175 Q 290 163 310 168',
    'M 10 155 Q 80 130 145 142 Q 215 158 270 135 Q 305 122 330 128',
    'M 30 105 Q 95 82 160 94 Q 228 110 285 90 Q 320 78 350 84',
  ];
  const domainPoints = MOCK_OBSERVATIONS.filter((o) => o.lens === lensId);

  return (
    <svg viewBox="0 0 360 260" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="mmg" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#181F10" />
          <stop offset="100%" stopColor="#0A0E06" />
        </radialGradient>
        <filter id="mglow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="360" height="260" fill="url(#mmg)" />
      <rect x="8" y="8" width="344" height="244" rx="3" fill="none" stroke="#2A3020" strokeWidth="1" strokeDasharray="4 3" />

      {/* Lens-specific overlays */}
      {(lensId === 'foundation' || lensId === 'water' || lensId === 'living') && (
        contours.map((d, i) => <path key={i} d={d} fill="none" stroke={lensId === 'foundation' ? '#3A4020' : '#222A14'} strokeWidth={lensId === 'foundation' ? '1.2' : '0.8'} />)
      )}

      {/* Water lens: creek + spring zones */}
      {lensId === 'water' && (
        <>
          <path d={waterPath} fill="none" stroke={C.water + 'AA'} strokeWidth="2.5" strokeLinecap="round" filter="url(#mglow)" />
          <ellipse cx="108" cy="100" rx="18" ry="12" fill={C.waterDim} stroke={C.water + '40'} strokeWidth="1" />
          <ellipse cx="220" cy="80" rx="14" ry="9" fill={C.amberDim} stroke={C.amber + '40'} strokeWidth="1" />
        </>
      )}

      {/* Foundation lens: elevation fill zones */}
      {lensId === 'foundation' && (
        <>
          <path d="M 20 180 Q 100 170 180 175 Q 250 180 330 165 L 340 244 L 20 244 Z" fill={C.waterDim + '50'} />
          <path d="M 20 120 Q 100 108 180 115 Q 250 120 330 105 L 330 165 Q 250 180 180 175 Q 100 170 20 180 Z" fill={C.sageDim + '40'} />
          <path d="M 60 50 Q 130 38 200 48 Q 270 58 320 42 L 330 105 Q 250 120 180 115 Q 100 108 20 120 L 20 75 Z" fill={C.earthDim + '60'} />
        </>
      )}

      {/* Climate lens: zone fills + frost pocket */}
      {lensId === 'climate' && (
        <>
          <ellipse cx="270" cy="200" rx="55" ry="38" fill={C.blueDim + '60'} stroke={C.blue + '25'} strokeWidth="1" />
          <text x="270" y="204" textAnchor="middle" fontSize="7" fill={C.blue + '88'} fontFamily={F.mono}>FROST</text>
          <ellipse cx="60" cy="90" rx="40" ry="28" fill={C.amberDim + '50'} stroke={C.amber + '25'} strokeWidth="1" />
          <text x="60" y="93" textAnchor="middle" fontSize="7" fill={C.amber + '88'} fontFamily={F.mono}>WARM</text>
          {/* SW wind arrow */}
          <line x1="280" y1="50" x2="230" y2="90" stroke={C.amber + '88'} strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="230,90 240,78 242,92" fill={C.amber + '88'} />
          <text x="295" y="46" fontSize="7" fill={C.amber + '88'} fontFamily={F.mono}>SW</text>
        </>
      )}

      {/* Living lens: soil zone fill */}
      {lensId === 'living' && (
        <ellipse cx="140" cy="160" rx="90" ry="60" fill={C.sageDim + '50'} stroke={C.sage + '30'} strokeWidth="1" />
      )}

      {/* Human lens: boundary emphasis */}
      {lensId === 'human' && (
        <>
          <rect x="16" y="16" width="328" height="228" rx="4" fill="none" stroke={C.violet + '30'} strokeWidth="1.5" strokeDasharray="6 3" />
          <rect x="55" y="60" width="80" height="50" rx="3" fill={C.violetDim + '60'} stroke={C.violet + '25'} strokeWidth="1" />
          <text x="95" y="88" textAnchor="middle" fontSize="7" fill={C.violet + '88'} fontFamily={F.mono}>BARN</text>
        </>
      )}

      {/* Infrastructure lens: empty / ghosted */}
      {lensId === 'infrastructure' && (
        <>
          <line x1="30" y1="130" x2="330" y2="130" stroke={C.teal + '15'} strokeWidth="1" strokeDasharray="8 4" />
          <rect x="80" y="80" width="60" height="40" rx="2" fill="none" stroke={C.teal + '20'} strokeWidth="1" strokeDasharray="3 2" />
          <rect x="200" y="160" width="50" height="35" rx="2" fill="none" stroke={C.teal + '20'} strokeWidth="1" strokeDasharray="3 2" />
          <text x="180" y="135" textAnchor="middle" fontSize="9" fill={C.textTertiary + '60'} fontFamily={F.mono}>{OBSERVE_COPY.notYetRead.toLowerCase()}</text>
        </>
      )}

      {/* Observation points */}
      {domainPoints.map((obs) => {
        const isFocus = obs.id === focusId;
        const px = obs.x * 360, py = obs.y * 260;
        const isDivergence = obs.type === 'divergence';
        return (
          <g key={obs.id}>
            {isFocus && <circle cx={px} cy={py} r={14} fill={lens.color + '18'} stroke={lens.color + '50'} strokeWidth="1" />}
            {isDivergence
              ? <polygon points={`${px},${py - 7} ${px + 6},${py + 4} ${px - 6},${py + 4}`} fill={C.amber} filter="url(#mglow)" />
              : <circle cx={px} cy={py} r={isFocus ? 6 : 4} fill={lens.mapColor} stroke={isFocus ? '#EDE9E0' : 'transparent'} strokeWidth="1.5" filter={isFocus ? 'url(#mglow)' : 'none'} />}
          </g>
        );
      })}

      <text x="12" y="248" fontSize="8" fill={C.textTertiary} fontFamily={F.mono}>
        {lensId.toUpperCase()} LENS  ·  {domainPoints.length} POINT{domainPoints.length !== 1 ? 'S' : ''}
      </text>
    </svg>
  );
}

// ─── SPECIALISED: HYDROLOGY ───────────────────────────────────────────────────
function HydrologySpecialised({ data, color }: { data: HydrologyData; color: string }) {
  const maxRate = Math.max(...data.infiltrationData.map((d) => d.rate));
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Infiltration Rate Comparison</div>
      {data.infiltrationData.map((d) => (
        <div key={d.zone} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans }}>{d.zone}</span>
            <span style={{ fontSize: 12, color: color, fontFamily: F.mono, fontWeight: 600 }}>{d.rate} mm/hr</span>
          </div>
          <div style={{ height: 6, background: C.bg4, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${(d.rate / maxRate) * 100}%`, background: d.status === 'good' ? C.green : d.status === 'moderate' ? C.amber : C.red, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 2, fontFamily: F.sans, textTransform: 'capitalize' }}>{d.status}</div>
        </div>
      ))}

      <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Water Source Inventory</div>
      {data.sources.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {s.divergence && <span style={{ fontSize: 11, color: C.amber }}>▲</span>}
            <div>
              <div style={{ fontSize: 12, color: s.divergence ? C.amber : C.textPrimary, fontFamily: F.sans, fontWeight: s.divergence ? 600 : 400 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, textTransform: 'capitalize' }}>{s.type} · {s.status}</div>
            </div>
          </div>
          <ConfidenceDot level={s.confidence} />
        </div>
      ))}
    </div>
  );
}

// ─── SPECIALISED: SOIL ────────────────────────────────────────────────────────
function SoilSpecialised({ data, color }: { data: SoilData; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Soil pH by Zone</div>
      {data.phData.map((d) => (
        <div key={d.zone} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans }}>{d.zone}</span>
            <span style={{ fontSize: 12, color: color, fontFamily: F.mono, fontWeight: 600 }}>pH {d.ph}</span>
          </div>
          {/* pH bar: 4.0 (acid) → 8.0 (alkaline), ideal 6.0–7.0 */}
          <div style={{ height: 8, background: C.bg4, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            {/* Ideal zone marker */}
            <div style={{ position: 'absolute', left: '50%', width: '25%', height: '100%', background: C.green + '20', borderLeft: `1px solid ${C.green}30`, borderRight: `1px solid ${C.green}30` }} />
            <div style={{ position: 'absolute', height: '100%', width: 6, borderRadius: 3, background: d.ph < 6 ? C.amber : d.ph > 7 ? C.blue : C.green, left: `${((d.ph - 4) / 4) * 100}%`, transform: 'translateX(-50%)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textTertiary, fontFamily: F.mono, marginTop: 2 }}>
            <span>4.0 acid</span><span>ideal 6–7</span><span>8.0 alkaline</span>
          </div>
          {(d.om !== undefined || d.compaction !== undefined) && (
            <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
              {d.om !== undefined && <span style={{ fontSize: 11, color: C.textTertiary }}>OM {d.om}%</span>}
              {d.compaction !== undefined && <span style={{ fontSize: 11, color: C.textTertiary }}>Compaction: {d.compaction}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SPECIALISED: TOPOGRAPHY ─────────────────────────────────────────────────
function TopographySpecialised({ data }: { data: TopographyData }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Elevation Zones</div>
      {data.elevationZones.map((z, i) => (
        <div key={i} style={{ marginBottom: 4, padding: '8px 12px', background: C.bg4, borderRadius: 7, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Colored indicator bar (mockup .zone-indicator) */}
          <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0, marginTop: 1, background: z.color }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, fontFamily: F.sans, marginBottom: 1 }}>{z.label}</div>
            <div style={{ fontSize: 11, color: C.textSecondary }}>{z.aspect}</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontStyle: 'italic', marginTop: 2 }}>{z.use}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: F.mono, color: C.textSecondary, flexShrink: 0, marginTop: 1 }}>{z.area}</span>
        </div>
      ))}
      <div style={{ height: 1, background: C.border, margin: '12px 0' }} />
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Slope Breakdown</div>
      {data.slopeBreakdown.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans }}>{s.label}</span>
            <span style={{ fontSize: 12, color: s.color, fontFamily: F.mono, fontWeight: 600 }}>{s.pct}%</span>
          </div>
          <div style={{ height: 5, background: C.bg4, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SPECIALISED: CLIMATE / WIND ROSE ────────────────────────────────────────
function ClimateSpecialised({ data, color }: { data: ClimateData; color: string }) {
  const maxFreq = Math.max(...data.windRose.map((d) => d.freq));
  const dirs = data.windRose;
  const cx = 80, cy = 80, r = 55;
  const riskColor: Record<string, string> = { low: C.green, medium: C.amber, high: C.red };

  return (
    <div>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Wind Rose</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <svg viewBox="0 0 160 160" width={150} height={150}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={C.border} strokeWidth="0.4" strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r={r * 0.3} fill="none" stroke={C.border} strokeWidth="0.4" strokeDasharray="2 2" />
          {dirs.map((d, i) => {
            const angle = (i * 45 - 90) * (Math.PI / 180);
            const petal = (d.freq / maxFreq) * r * 0.9;
            const w = 10 * (Math.PI / 180);
            const x1 = cx + Math.cos(angle - w) * petal * 0.3;
            const y1 = cy + Math.sin(angle - w) * petal * 0.3;
            const x2 = cx + Math.cos(angle) * petal;
            const y2 = cy + Math.sin(angle) * petal;
            const x3 = cx + Math.cos(angle + w) * petal * 0.3;
            const y3 = cy + Math.sin(angle + w) * petal * 0.3;
            const isSW = d.dir === 'SW';
            return (
              <g key={d.dir}>
                <path d={`M ${cx} ${cy} L ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3} Z`} fill={isSW ? color + 'CC' : color + '55'} stroke={isSW ? color : color + '44'} strokeWidth="0.5" />
                <text x={cx + Math.cos(angle) * (r + 10)} y={cy + Math.sin(angle) * (r + 10)} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={isSW ? color : C.textTertiary} fontFamily={F.mono} fontWeight={isSW ? '700' : '400'}>{d.dir}</text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={3} fill={C.bg3} stroke={color} strokeWidth="1" />
        </svg>
      </div>

      <div style={{ height: 1, background: C.border, margin: '8px 0 12px' }} />
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Microclimate Zones</div>
      {data.microclimates.map((m, i) => (
        <div key={i} style={{ marginBottom: 6, padding: '7px 9px', background: C.bg4, borderRadius: 6, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.sans, fontWeight: 600 }}>{m.label}</span>
            <span style={{ fontSize: 10, color: riskColor[m.risk] || C.textTertiary, fontFamily: F.mono }}>{m.size}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary }}>{m.character}</div>
        </div>
      ))}
    </div>
  );
}

// ─── SPECIALISED: HUMAN SYSTEMS ──────────────────────────────────────────────
function HumanSpecialised({ data }: { data: HumanData }) {
  const statusColor: Record<string, string> = { pending: '#D4944A', outstanding: '#C45A4A', flagged: '#C45A4A', confirmed: '#5AAF72' };
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Readiness Overview</div>
      {data.capacityBars.map((b, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans }}>{b.label}</span>
            <span style={{ fontSize: 12, color: b.color, fontFamily: F.mono, fontWeight: 600 }}>{b.pct}%</span>
          </div>
          <div style={{ height: 6, background: C.bg4, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}

      <div style={{ height: 1, background: C.border, margin: '12px 0' }} />
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Consent & Compliance</div>
      {data.consentItems.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans, flex: 1, paddingRight: 8 }}>{item.label}</span>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: statusColor[item.status] || C.textTertiary, fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</div>
            {item.weeks !== '—' && <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>{item.weeks}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SPECIALISED: INFRASTRUCTURE EMPTY ───────────────────────────────────────
function InfrastructureEmptySpecialised({ data }: { data: InfraEmptyData }) {
  const priorityColor: Record<string, string> = { high: C.amber, medium: C.teal, low: C.textTertiary };
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '16px 0 14px' }}>
        <div style={{ fontSize: 32, color: C.textTertiary, opacity: 0.25, marginBottom: 8 }}>◫</div>
        <div style={{ fontSize: 13, color: C.textTertiary, fontFamily: F.sans, lineHeight: 1.6, marginBottom: 4 }}>Your land is ready to be read.</div>
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans, opacity: 0.7 }}>No infrastructure observations yet.</div>
      </div>
      <div style={{ height: 1, background: C.border, margin: '8px 0 12px' }} />
      <div style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Suggested First Observations</div>
      {data.suggestedTasks.map((t, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans, marginBottom: 1 }}>{t.label}</div>
            <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans }}>{t.domain}</div>
          </div>
          <span style={{ fontSize: 10, color: priorityColor[t.priority], fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.priority}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CYCLE SPIRAL BAR ─────────────────────────────────────────────────────────
export function CycleTimelineBar({ vertical = false }: { vertical?: boolean }) {
  const { cycle: CYCLE, lenses: LENSES } = useLensData();
  const [expanded, setExpanded] = useState(false);
  const reviewUrgent = CYCLE.nextReviewDays <= 14;

  // ── Spiral geometry ──
  // One full turn = one cycle. Past cycle (Baseline) = inner ring.
  // Current cycle = outer ring, arc drawn to elapsed position.
  // Observation points plotted as radial marks around the current ring.

  const SVG_H = 140;
  const cx = 80, cy = 72;

  // Rings: baseline (inner), current (outer)
  const R_PAST = 30, R_CUR = 52;

  // Helper: polar → cartesian, angle 0 = top, clockwise
  const polar = (rad: number, angleDeg: number) => ({
    x: cx + rad * Math.sin((angleDeg * Math.PI) / 180),
    y: cy - rad * Math.cos((angleDeg * Math.PI) / 180),
  });

  // Arc path helper
  const arc = (rad: number, startDeg: number, endDeg: number, sweep = 1) => {
    const s = polar(rad, startDeg), e = polar(rad, endDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${large} ${sweep} ${e.x} ${e.y}`;
  };

  // Phases map to degree arcs: Plan 0→79, Act 79→259, Observe 259→360
  const phases = [
    { id: 'plan', label: 'Plan', color: C.blue, start: 0, end: 79, status: 'complete' },
    { id: 'act', label: 'Act', color: C.violet, start: 79, end: 259, status: 'complete' },
    { id: 'observe', label: 'Observe', color: C.green, start: 259, end: 360, status: 'active' },
  ];

  // Current position angle
  const posDeg = (CYCLE.elapsed / CYCLE.totalDays) * 360;
  const posPoint = polar(R_CUR, posDeg);

  // Next review marker
  const reviewDeg = ((CYCLE.elapsed + CYCLE.nextReviewDays) / CYCLE.totalDays) * 360;
  const reviewPoint = polar(R_CUR + 8, reviewDeg);

  // Observation marks — plot lens data points as radial ticks
  // Distribute by lens freshness / observation timing around Observe arc (259→posDeg)
  const obsTicks = LENSES.filter((l) => l.observations > 0).map((l, i, arr) => {
    const spread = Math.max(posDeg - 259, 5);
    const tickDeg = 259 + (i / (arr.length - 1 || 1)) * spread;
    const inner = polar(R_CUR - 5, tickDeg);
    const outer = polar(R_CUR + 5, tickDeg);
    return { ...l, tickDeg, inner, outer };
  });

  // ── Full spiral diagram (reused by horizontal expanded panel + vertical rail) ──
  // The legend is split out into its own DOM block (`spiralLegend`) so it can be
  // stacked BENEATH the spiral; the SVG viewBox is cropped to the spiral's own
  // span (cx=80 centred in a 160-wide box) so it no longer reserves the right
  // half for the legend.
  const SPIRAL_VB_W = cx * 2; // 160 — centres the spiral (cx=80) in its own box
  // Render the spiral 60% larger than its 160x140 viewBox (geometry unchanged —
  // viewBox stays 0 0 160 140; only the rendered box grows). The rail column
  // width still bounds the on-screen size when narrower than the scaled max.
  const SPIRAL_SCALE = 1.6;
  const spiralDiagram = (
    <svg width="100%" height={SVG_H * SPIRAL_SCALE} viewBox={`0 0 ${SPIRAL_VB_W} ${SVG_H}`} style={{ maxWidth: SPIRAL_VB_W * SPIRAL_SCALE }}>

      <defs>
        <filter id="spglow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Guide rings ── */}
      <circle cx={cx} cy={cy} r={R_PAST} fill="none" stroke={C.border} strokeWidth="0.5" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r={R_CUR} fill="none" stroke={C.border} strokeWidth="0.5" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r={R_CUR + 14} fill="none" stroke={C.border} strokeWidth="0.3" strokeDasharray="2 4" opacity="0.5" />

      {/* ── Baseline cycle (inner ring, full, muted) ── */}
      <circle cx={cx} cy={cy} r={R_PAST} fill="none" stroke={C.textTertiary} strokeWidth="2" opacity="0.2" />
      {/* Baseline label */}
      <text x={cx} y={cy - R_PAST - 5} textAnchor="middle" fontSize="7" fill={C.textTertiary} fontFamily={F.mono} opacity="0.6">Baseline · 8 pts</text>

      {/* ── Current cycle phase arcs ── */}
      {phases.map((ph) => {
        if (ph.status === 'complete') {
          return (
            <path key={ph.id} d={arc(R_CUR, ph.start, ph.end)} fill="none" stroke={ph.color} strokeWidth="3" opacity="0.45" strokeLinecap="round" />
          );
        }
        // Active (Observe): draw only up to current position
        return (
          <path key={ph.id} d={arc(R_CUR, ph.start, posDeg)} fill="none" stroke={ph.color} strokeWidth="3" opacity="0.9" strokeLinecap="round" filter="url(#spglow)" />
        );
      })}

      {/* Remaining Observe arc — dashed ghost */}
      <path d={arc(R_CUR, posDeg, 360)} fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.18" strokeDasharray="4 4" strokeLinecap="round" />

      {/* ── Phase arc labels (outside ring) ── */}
      {phases.map((ph) => {
        const midDeg = ph.status === 'active' ? (259 + posDeg) / 2 : (ph.start + ph.end) / 2;
        const labelR = R_CUR + 13;
        const lp = polar(labelR, midDeg);
        return (
          <text key={ph.id} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={ph.status === 'active' ? ph.color : C.textTertiary} fontFamily={F.mono} fontWeight={ph.status === 'active' ? '700' : '400'} opacity={ph.status === 'active' ? 1 : 0.6}>
            {ph.label}
          </text>
        );
      })}

      {/* ── Observation ticks on current ring ── */}
      {obsTicks.map((l) => (
        <g key={l.id}>
          <line x1={l.inner.x} y1={l.inner.y} x2={l.outer.x} y2={l.outer.y} stroke={l.color} strokeWidth="1.5" opacity={l.freshness === 'stale' ? 0.4 : 0.85} strokeLinecap="round" />
          {/* Stale: hollow dot at tick end */}
          {l.freshness === 'stale' && (
            <circle cx={l.outer.x} cy={l.outer.y} r="2.5" fill="none" stroke={C.red} strokeWidth="1" opacity="0.7" />
          )}
        </g>
      ))}

      {/* ── Current position cursor ── */}
      <circle cx={posPoint.x} cy={posPoint.y} r={5.5} fill={C.green} stroke={C.bg2} strokeWidth="1.5" filter="url(#spglow)" />
      {/* Inner dot */}
      <circle cx={posPoint.x} cy={posPoint.y} r={2} fill={C.bg2} />

      {/* ── Next review marker ── */}
      <polygon points={`${reviewPoint.x},${reviewPoint.y - 5} ${reviewPoint.x + 4},${reviewPoint.y + 3} ${reviewPoint.x - 4},${reviewPoint.y + 3}`} fill={reviewUrgent ? C.amber : C.textTertiary} opacity={reviewUrgent ? 0.9 : 0.5} />

      {/* ── Spiral connector (past ring → current, at phase 0) ── */}
      {(() => {
        const inner = polar(R_PAST, 0);
        const outer = polar(R_CUR, 0);
        return <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={C.textTertiary} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3" />;
      })()}

      {/* ── Centre label ── */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="9" fill={C.textPrimary} fontFamily={F.serif} fontWeight="600">Cycle {CYCLE.number}</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="7" fill={C.textTertiary} fontFamily={F.mono}>Day {CYCLE.elapsed}</text>
    </svg>
  );

  // ── Legend (DOM block, stacked beneath the spiral) ──
  // Pulled out of the SVG so the spiral and its key sit vertically stacked
  // (legend beneath) instead of side-by-side. Wraps to fit the narrow rail.
  const spiralLegend = (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px' }}>
      {[
        { color: C.green, label: 'Now' },
        { color: C.amber, label: `Review · ${CYCLE.nextReviewDays}d` },
        { color: C.red, label: 'Stale data' },
        { color: C.textTertiary, label: 'Baseline' },
      ].map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, opacity: item.color === C.textTertiary ? 0.3 : 0.8, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans }}>{item.label}</span>
        </span>
      ))}
    </div>
  );

  // ── Now-callout + signal rows (reused by both layouts) ──
  const cycleSignals = (
    <>
      {/* Current phase call-out */}
      <div style={{ padding: '8px 12px', borderRadius: 7, background: C.green + '0F', border: `1px solid ${C.green}25`, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, fontFamily: F.sans }}>Now · Observe active</div>
        <div style={{ fontSize: 13, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.5 }}>{CYCLE.elapsed} days in · {CYCLE.totalDays - CYCLE.elapsed} days remain before Cycle {CYCLE.number + 1} begins</div>
      </div>

      {/* Signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: reviewUrgent ? C.amberDim : C.bg3, border: `1px solid ${reviewUrgent ? C.amber + '40' : C.border}` }}>
          <span style={{ fontSize: 16, color: reviewUrgent ? C.amber : C.textTertiary }}>◷</span>
          <div>
            <div style={{ fontSize: 12, color: reviewUrgent ? C.amber : C.textSecondary, fontWeight: 600, fontFamily: F.sans }}>Plan review in {CYCLE.nextReviewDays} days</div>
            <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>Land evidence feeds next planning cycle</div>
          </div>
        </div>

        {CYCLE.staleDomains.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: C.redDim, border: `1px solid ${C.red}30` }}>
            <span style={{ fontSize: 16, color: C.red }}>○</span>
            <div>
              <div style={{ fontSize: 12, color: C.red, fontWeight: 600, fontFamily: F.sans }}>{d} — data gone stale</div>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>Observations overdue · refresh before Plan review</div>
            </div>
          </div>
        ))}

        {CYCLE.ageingDomains.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: C.amberDim, border: `1px solid ${C.amber}30` }}>
            <span style={{ fontSize: 16, color: C.amber }}>◑</span>
            <div>
              <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, fontFamily: F.sans }}>{d} — ageing</div>
              <div style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>Within threshold · refresh recommended</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ── Vertical sidebar mode (full, always-expanded) ──
  if (vertical) {
    // Fills the StageShell left rail (width/height 100%) and draws its own bento
    // card (surface + border + radius), mirroring Act's .railPanel. No fixed
    // width / flexShrink / borderRight -- the rail grid owns the column width.
    return (
      <div style={{ width: '100%', height: '100%', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Cycle header */}
        <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>CYCLE {CYCLE.number}</span>
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>{CYCLE.name}</span>
          </div>
          {/* Plan/Act/Observe phase chips removed (2026-06-03) per operator: the
              spiral already encodes phase position; the horizontal expanded panel
              keeps its own chip row. */}
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>Day {CYCLE.elapsed} / {CYCLE.totalDays}</span>
        </div>

        {/* Spiral + legend, vertically stacked (legend beneath) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {spiralDiagram}
          {spiralLegend}
        </div>

        {/* Callout + signals */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column' }}>
          {cycleSignals}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden' }}>
      {/* ── Always-visible strip ── */}
      <div onClick={() => setExpanded((e) => !e)} style={{ display: 'flex', alignItems: 'center', padding: '0 16px 0 12px', height: 36, cursor: 'pointer', userSelect: 'none', gap: 0 }}>
        {/* Compact inline spiral preview */}
        <svg width={56} height={30} viewBox="0 0 56 30" style={{ flexShrink: 0, marginRight: 10 }}>
          {/* Background rings */}
          <circle cx={15} cy={15} r={8} fill="none" stroke={C.border} strokeWidth="1" />
          <circle cx={15} cy={15} r={13} fill="none" stroke={C.border} strokeWidth="0.5" strokeDasharray="2 2" />
          {/* Past cycle ring (full, muted) */}
          <circle cx={15} cy={15} r={8} fill="none" stroke={C.textTertiary} strokeWidth="1.5" opacity="0.3" />
          {/* Current cycle — Plan arc */}
          {(() => {
            const s = { x: 15 + 13 * Math.sin(0), y: 15 - 13 * Math.cos(0) };
            const e = { x: 15 + 13 * Math.sin(79 * Math.PI / 180), y: 15 - 13 * Math.cos(79 * Math.PI / 180) };
            return <path d={`M ${s.x} ${s.y} A 13 13 0 0 1 ${e.x} ${e.y}`} fill="none" stroke={C.blue} strokeWidth="2" opacity="0.7" />;
          })()}
          {/* Act arc */}
          {(() => {
            const s = { x: 15 + 13 * Math.sin(79 * Math.PI / 180), y: 15 - 13 * Math.cos(79 * Math.PI / 180) };
            const e = { x: 15 + 13 * Math.sin(259 * Math.PI / 180), y: 15 - 13 * Math.cos(259 * Math.PI / 180) };
            return <path d={`M ${s.x} ${s.y} A 13 13 0 1 1 ${e.x} ${e.y}`} fill="none" stroke={C.violet} strokeWidth="2" opacity="0.7" />;
          })()}
          {/* Observe arc so far */}
          {(() => {
            const deg = posDeg;
            const s = { x: 15 + 13 * Math.sin(259 * Math.PI / 180), y: 15 - 13 * Math.cos(259 * Math.PI / 180) };
            const e = { x: 15 + 13 * Math.sin(deg * Math.PI / 180), y: 15 - 13 * Math.cos(deg * Math.PI / 180) };
            const large = deg - 259 > 180 ? 1 : 0;
            return <path d={`M ${s.x} ${s.y} A 13 13 0 ${large} 1 ${e.x} ${e.y}`} fill="none" stroke={C.green} strokeWidth="2" />;
          })()}
          {/* Position dot */}
          <circle cx={15 + 13 * Math.sin(posDeg * Math.PI / 180)} cy={15 - 13 * Math.cos(posDeg * Math.PI / 180)} r={2.5} fill={C.green} stroke={C.bg2} strokeWidth="1" />
        </svg>

        {/* Cycle label */}
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono, marginRight: 4 }}>CYCLE {CYCLE.number}</span>
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.sans, marginRight: 10 }}>{CYCLE.name}</span>

        {/* Phase pills */}
        <div style={{ display: 'flex', gap: 3, marginRight: 10 }}>
          {phases.map((ph) => (
            <span key={ph.id} style={{ fontSize: 10, fontFamily: F.sans, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: ph.status === 'active' ? ph.color + '22' : 'transparent', border: `1px solid ${ph.status === 'active' ? ph.color + '55' : C.border}`, color: ph.status === 'active' ? ph.color : C.textTertiary }}>
              {ph.label}{ph.status === 'active' ? ' ●' : ' ✓'}
            </span>
          ))}
        </div>

        {/* Day counter */}
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono, marginRight: 'auto' }}>Day {CYCLE.elapsed} / {CYCLE.totalDays}</span>

        {/* Signals */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {CYCLE.staleDomains.length > 0 && (
            <span style={{ fontSize: 10, color: C.red, fontFamily: F.sans, padding: '2px 7px', borderRadius: 8, background: C.redDim, border: `1px solid ${C.red}30` }}>{CYCLE.staleDomains.length} stale</span>
          )}
          <span style={{ fontSize: 10, fontFamily: F.mono, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: reviewUrgent ? C.amberDim : C.bg3, border: `1px solid ${reviewUrgent ? C.amber + '50' : C.border}`, color: reviewUrgent ? C.amber : C.textTertiary }}>{CYCLE.nextReviewDays}d to review</span>
          <span style={{ fontSize: 11, color: C.textTertiary }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── Expanded spiral panel ── */}
      {expanded && (
        <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${C.border}`, maxHeight: 180 }}>
          {/* Left: full spiral diagram + legend, stacked */}
          <div style={{ width: SPIRAL_VB_W + 24, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 8px' }}>
            {spiralDiagram}
            {spiralLegend}
          </div>

          {/* Right: contextual text — one clear thing per row */}
          <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
            {cycleSignals}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECENT OBSERVATIONS STRIP (bottom tray) ──────────────────────────────────
// Horizontal, scroll-x strip of the most-recent mock observations. Lives in the
// StageShell bottom tray (between-rails). Filters by the active lens; clicking a
// card selects the matching map pin via the SAME selectedObs/onObsClick thread
// the PseudoMap uses (zero new state). Authored at natural Act-ladder sizes (no
// zoom) so it needs no de-zoom rebake.

// Parse a fuzzy age string ('12d', '8mo', '2d', ...) into hours, for a
// most-recent-first sort. Unknown formats sort last.
const AGE_UNIT_HOURS: Record<string, number> = { h: 1, d: 24, w: 168, mo: 730, y: 8760 };
function ageToHours(age: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*(mo|[hdwy])$/i.exec(age.trim());
  if (!m) return Number.MAX_SAFE_INTEGER;
  const [, num, unit] = m;
  if (!num || !unit) return Number.MAX_SAFE_INTEGER;
  return parseFloat(num) * (AGE_UNIT_HOURS[unit.toLowerCase()] ?? 1);
}

export function RecentObservationsStrip({ activeLens, selectedObs, onObsClick, vertical = false }: {
  activeLens: string;
  selectedObs: MockObservation | null;
  onObsClick: (obs: MockObservation) => void;
  // When true, render WITHOUT the outer bento card as a stacked section (header
  // + vertical full-width card column) — used inside IntelligencePanel's scroll
  // body so Recent Observations sits beneath Land Intelligence in one rail. The
  // default horizontal strip path (StageShell bottom tray) is byte-unchanged.
  vertical?: boolean;
}) {
  const { lenses: LENSES, observations: MOCK_OBSERVATIONS, typeIcon: TYPE_ICON } = useLensData();
  const lensById: Record<string, LensDisplay> = Object.fromEntries(LENSES.map((l) => [l.id, l]));
  const visible = (activeLens && activeLens !== 'all'
    ? MOCK_OBSERVATIONS.filter((o) => o.lens === activeLens)
    : [...MOCK_OBSERVATIONS]
  ).slice().sort((a, b) => ageToHours(a.age) - ageToHours(b.age));

  const outerStyle: CSSProperties = vertical
    ? { display: 'flex', flexDirection: 'column', minWidth: 0, borderTop: `1px solid ${C.border}` }
    : { display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' };

  return (
    <div style={outerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F.sans }}>
          Recent observations
        </span>
        <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>
          {visible.length} {activeLens && activeLens !== 'all' ? `· ${lensById[activeLens]?.label ?? activeLens}` : 'all lenses'}
        </span>
      </div>
      {visible.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px 10px', fontSize: 11, color: C.textTertiary, fontFamily: F.sans }}>
          No observations recorded for this lens yet.
        </div>
      ) : (
        <div style={vertical
          ? { flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', padding: '0 12px 10px', minWidth: 0 }
          : { flex: 1, display: 'flex', gap: 8, alignItems: 'stretch', padding: '0 12px 10px', overflowX: 'auto', minWidth: 0 }}>
          {visible.map((obs) => {
            const lens = lensById[obs.lens];
            const color = lens?.color || C.textSecondary;
            const isSelected = selectedObs?.id === obs.id;
            const isDivergence = obs.type === 'divergence';
            const glyph = isDivergence ? '▲' : (TYPE_ICON[obs.type] || '·');
            return (
              <button
                key={obs.id}
                type="button"
                onClick={() => onObsClick(obs)}
                title={`${obs.label} · ${obs.type} · ${obs.age} ago`}
                style={{
                  ...(vertical
                    ? { width: '100%' }
                    : { flex: '0 0 auto', width: 168, minWidth: 168 }),
                  display: 'flex', flexDirection: 'column', gap: 6,
                  padding: '9px 11px', textAlign: 'left', cursor: 'pointer', fontFamily: F.sans,
                  background: isSelected ? color + '14' : C.bg3,
                  border: `1px solid ${isSelected ? color + '70' : C.border}`,
                  borderRadius: 7, transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{
                    width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, fontSize: 12, color: isDivergence ? C.amber : color,
                    background: (isDivergence ? C.amber : color) + '18', border: `1px solid ${(isDivergence ? C.amber : color)}30`,
                  }}>
                    {glyph}
                  </span>
                  <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono, whiteSpace: 'nowrap' }}>{obs.age} ago</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {obs.label}
                </span>
                <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lens?.label ?? obs.lens} · {obs.type.replace('_', ' ')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
export function TopBar() {
  const { project: PROJECT } = useLensData();
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.06em', fontFamily: F.sans }}>OGDEN</span>
          <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans }}>Land OS</span>
        </div>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ display: 'flex', gap: 3 }}>
          {[{ label: 'Observe', pct: 37, active: true, color: C.green }, { label: 'Plan', pct: 13, active: false, color: C.blue }, { label: 'Act', pct: 21, active: false, color: C.violet }].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, background: s.active ? s.color + '20' : 'transparent', border: `1px solid ${s.active ? s.color + '60' : C.border}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.active ? s.color : C.textTertiary, fontFamily: F.sans }}>{s.label}</span>
              <span style={{ fontSize: 11, color: s.active ? s.color + 'CC' : C.textTertiary, fontFamily: F.mono }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans }}>{PROJECT.name}</div>
        <button style={{ padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, background: C.bg3, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: F.sans }}>Share ↗</button>
        <button style={{ padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, background: C.bg3, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontFamily: F.sans }}>Present</button>
      </div>
    </div>
  );
}
