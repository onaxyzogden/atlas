/**
 * SiteIntelligencePanel — comprehensive site assessment.
 * Matches target design with "LIVE DATA" section,
 * Conservation Authority card, score circle, site summary,
 * and "What This Land Wants" block.
 *
 * All environmental data is sourced from the siteDataStore
 * and transformed via computeScores pure functions.
 */

import { useCallback, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, useSiteDataStore } from '../../store/siteDataStore.js';
import {
  computeAssessmentScores,
  computeOverallScore,
  deriveDataLayerRows,
  deriveLiveDataRows,
  deriveOpportunities,
  deriveRisks,
  deriveSiteSummary,
  deriveLandWants,
} from '../../lib/computeScores.js';
import { Spinner } from '../ui/Spinner.js';
import p from '../../styles/panel.module.css';
import s from './SiteIntelligencePanel.module.css';

interface SiteIntelligencePanelProps {
  project: LocalProject;
}

function severityColor(severity: string, fallback: string): string {
  switch (severity) {
    case 'critical': return '#c44e3f';
    case 'warning': return '#8a6d1e';
    case 'info': return fallback;
    default: return fallback;
  }
}

function getConservationAuth(project: LocalProject) {
  if (project.country === 'CA') {
    return {
      name: project.provinceState === 'ON' ? 'Conservation Halton' : 'Grand River Conservation Authority',
      watershed: project.provinceState === 'ON' ? 'Sixteen Mile Creek Watershed' : 'Grand River Watershed',
      buffer: 'Buffer: 30m from watercourse, 120m from wetland boundary (varies)',
    };
  }
  return null;
}

export default function SiteIntelligencePanel({ project }: SiteIntelligencePanelProps) {
  const [liveDataOpen, setLiveDataOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const siteData = useSiteData(project.id);
  const refreshProject = useSiteDataStore((st) => st.refreshProject);

  // AI enrichment data
  const enrichment = siteData?.enrichment;

  const consAuth = useMemo(() => getConservationAuth(project), [project]);

  // Metadata-based completeness (project fields, not layer data)
  const fields = [
    project.hasParcelBoundary, !!project.address, !!project.projectType,
    !!project.parcelId, !!project.provinceState, !!project.ownerNotes,
    !!project.zoningNotes, !!project.waterRightsNotes,
  ];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  // Derive all computed values from layer data
  const layers = siteData?.layers ?? [];

  const liveData = useMemo(
    () => deriveLiveDataRows(layers),
    [layers],
  );

  const dataLayerRows = useMemo(
    () => deriveDataLayerRows(layers),
    [layers],
  );

  const assessmentScores = useMemo(
    () => computeAssessmentScores(layers, project.acreage ?? null),
    [layers, project.acreage],
  );

  const overallScore = useMemo(
    () => computeOverallScore(assessmentScores),
    [assessmentScores],
  );

  const opportunities = useMemo(
    () => deriveOpportunities(layers, project.country),
    [layers, project.country],
  );

  const risks = useMemo(
    () => deriveRisks(layers, project.country),
    [layers, project.country],
  );

  const siteSummary = useMemo(
    () => deriveSiteSummary(layers, {
      name: project.name,
      acreage: project.acreage ?? null,
      provinceState: project.provinceState ?? null,
      country: project.country,
    }),
    [layers, project.name, project.acreage, project.provinceState, project.country],
  );

  const landWants = useMemo(
    () => deriveLandWants(layers),
    [layers],
  );

  const lastFetched = useMemo(() => {
    if (!siteData?.fetchedAt) return null;
    const d = new Date(siteData.fetchedAt);
    return `${d.toLocaleDateString()}, ${d.toLocaleTimeString()}`;
  }, [siteData?.fetchedAt]);

  const handleRefresh = useCallback(() => {
    if (!project.parcelBoundaryGeojson || isRefreshing) return;
    try {
      const centroid = turf.centroid(project.parcelBoundaryGeojson);
      const coords = centroid.geometry.coordinates;
      const lng = coords[0] ?? 0;
      const lat = coords[1] ?? 0;
      const turfBbox = turf.bbox(project.parcelBoundaryGeojson);
      const bbox: [number, number, number, number] = [turfBbox[0], turfBbox[1], turfBbox[2], turfBbox[3]];
      setIsRefreshing(true);
      const minDelay = new Promise<void>((r) => setTimeout(r, 2000));
      Promise.all([refreshProject(project.id, [lng, lat], project.country, bbox), minDelay])
        .finally(() => setIsRefreshing(false));
    } catch { /* boundary may be invalid */ }
  }, [project.id, project.parcelBoundaryGeojson, project.country, refreshProject, isRefreshing]);

  // ── First load — show spinner when no data exists yet ──────────────────
  if (siteData?.status === 'loading' && layers.length === 0) {
    return (
      <div className={p.container}>
        <div className={s.headerRow}>
          <h2 className={p.title} style={{ marginBottom: 0 }}>Site Intelligence</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 0' }}>
          <Spinner size="lg" />
          <span style={{ fontSize: 13, color: 'var(--color-panel-muted)' }}>Fetching environmental data...</span>
        </div>
      </div>
    );
  }

  // ── Idle / no data state ───────────────────────────────────────────────
  if (!siteData || siteData.status === 'idle') {
    return (
      <div className={p.container}>
        <div className={s.headerRow}>
          <h2 className={p.title} style={{ marginBottom: 0 }}>Site Intelligence</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-panel-muted)', textAlign: 'center', padding: '48px 0' }}>
          Draw a property boundary to fetch site data
        </p>
      </div>
    );
  }

  // ── Complete / error state — render full panel ─────────────────────────
  return (
    <div className={p.container}>
      {/* Header */}
      <div className={s.headerRow}>
        <h2 className={p.title} style={{ marginBottom: 0 }}>Site Intelligence</h2>
        <button onClick={handleRefresh} className={`${s.refreshBtn} ${isRefreshing ? s.refreshBtnSpinning : ''}`} aria-label="Refresh site data">
          <RefreshIcon spinning={isRefreshing} />
          {isRefreshing && <span className={s.refreshHint}>Refreshing...</span>}
        </button>
      </div>

      {/* ── Refresh banner ───────────────────────────────────────── */}
      {isRefreshing && (
        <div className={s.refreshBanner}>
          <Spinner size="sm" color="#c4a265" />
          Refreshing environmental data...
        </div>
      )}

      {/* ── Overall Suitability ────────────────────────────────────── */}
      <div className={s.suitabilityCard}>
        <ScoreCircle score={overallScore} size={68} />
        <div>
          <div className={s.suitabilityTitle}>Overall Suitability</div>
          <div className={s.completenessLabel}>Data completeness: {completeness}%</div>
          <div className={s.completenessTrack}>
            <div className={s.completenessFill} style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </div>

      {/* ── LIVE DATA ──────────────────────────────────────────────── */}
      <div className={s.liveDataWrap}>
        {/* Header bar — clickable to collapse */}
        <button
          onClick={() => setLiveDataOpen((v) => !v)}
          className={`${s.liveDataHeader} ${liveDataOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#c4a265" strokeWidth={1.5}>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" strokeLinecap="round" />
          </svg>
          <span className={s.liveDataTitle}>
            Live {project.country === 'CA' ? 'Ontario' : 'US'} Data
          </span>
          {siteData.isLive && (
            <span className={`${p.badgeConfidence} ${p.badgeHigh}`}>
              Live
            </span>
          )}
          <div style={{ flex: 1 }} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="#9a8a74" strokeWidth={1.5} strokeLinecap="round" className={`${s.chevron} ${!liveDataOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>

        {/* Data rows — collapsible */}
        {liveDataOpen && (<>
        <div style={{ padding: '4px 0' }}>
          {liveData.map((row) => (
            <div key={row.label} className={s.liveDataRow}>
              <span className={s.liveDataIcon} style={{ color: row.color }}>
                {row.icon}
              </span>
              <span className={s.liveDataLabel}>{row.label}</span>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <span className={s.liveDataValue}>{row.value}</span>
              </div>
              {row.detail && (
                <span className={s.liveDataDetail}>
                  {row.detail}
                </span>
              )}
              <ConfBadge level={row.confidence} />
            </div>
          ))}
        </div>

        {/* Conservation Authority card */}
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

        {/* Last fetched */}
        {lastFetched && (
          <div className={s.lastFetched}>
            Last fetched: {lastFetched}
          </div>
        )}
        </>)}
      </div>

      {/* ── Site Summary ───────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Site Summary</h3>
      {enrichment?.aiNarrative ? (
        <div className={s.aiNarrative}>
          <AILabel confidence={enrichment.aiNarrative.confidence} />
          <p className={s.summaryText}>{enrichment.aiNarrative.content}</p>
          {enrichment.aiNarrative.caveat && (
            <p className={s.aiCaveat}>{enrichment.aiNarrative.caveat}</p>
          )}
        </div>
      ) : (
        <p className={s.summaryText}>{siteSummary}</p>
      )}

      {/* ── What This Land Wants ───────────────────────────────────── */}
      <div className={s.landWantsCard}>
        <h3 className={p.sectionLabel}>What This Land Wants</h3>
        {enrichment?.aiNarrative && enrichment.siteSynthesis ? (
          <div className={s.aiNarrative}>
            <AILabel confidence={enrichment.aiNarrative.confidence} />
            <p className={s.landWantsText}>{enrichment.siteSynthesis}</p>
          </div>
        ) : (
          <p className={s.landWantsText}>{landWants}</p>
        )}
      </div>

      {/* ── Design Recommendations (AI) ────────────────────────────── */}
      {enrichment?.designRecommendation && (
        <div className={s.designRecSection}>
          <h3 className={p.sectionLabel}>Design Recommendations</h3>
          <AILabel confidence={enrichment.designRecommendation.confidence} />
          <div className={s.designRecContent}>
            {enrichment.designRecommendation.content.split(/\n(?=\d+\.)/).map((block, i) => (
              <div key={i} className={s.designRecCard}>
                <p>{block.trim()}</p>
              </div>
            ))}
          </div>
          {enrichment.designRecommendation.caveat && (
            <p className={s.aiCaveat}>{enrichment.designRecommendation.caveat}</p>
          )}
        </div>
      )}

      {/* ── AI Loading Indicator ───────────────────────────────────── */}
      {enrichment?.status === 'loading' && (
        <div className={s.aiLoadingHint}>
          <Spinner size="sm" color="#c4a265" />
          <span>Generating AI insights...</span>
        </div>
      )}

      {/* ── Assessment Scores ──────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Assessment Scores</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {assessmentScores.map((item) => (
          <div key={item.label} className={s.scoreRow}>
            <ScoreCircle score={item.score} size={36} />
            <div style={{ flex: 1 }}>
              <div className={s.scoreLabel}>{item.label}</div>
              <div className={s.scoreBar}>
                <div className={s.scoreBarFill} style={{ width: `${item.score}%`, background: getScoreColor(item.score) }} />
              </div>
            </div>
            <span
              className={s.scoreBadge}
              style={{ background: `${getScoreColor(item.score)}18`, color: getScoreColor(item.score) }}
            >
              {item.rating}
            </span>
          </div>
        ))}
      </div>

      {/* ── Opportunities ──────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Main Opportunities</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {opportunities.map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.oppIcon}
                style={{ color: severityColor(flag.severity, '#2d7a4f') }}
              >
                {'\u2197'}
              </span>
              <div className={s.flagContent}>
                <span>{flag.message}</span>
                {flag.layerSource && (
                  <span className={s.flagSource}>{flag.layerSource}</span>
                )}
                {enriched?.aiNarrative && (
                  <p className={s.enrichedFlagNote}>{enriched.aiNarrative}</p>
                )}
              </div>
            </div>
          );
        })}
        {opportunities.length === 0 && (
          <span className={s.flagSource}>No opportunities identified from current data</span>
        )}
      </div>

      {/* ── Risks ──────────────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Main Risks</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {risks.map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.riskIcon}
                style={{ color: severityColor(flag.severity, '#9b3a2a') }}
              >
                {flag.severity === 'critical' ? '\u26D4' : '\u26A0'}
              </span>
              <div className={s.flagContent}>
                <span>{flag.message}</span>
                <div className={s.flagMeta}>
                  {flag.severity !== 'info' && (
                    <span className={`${s.severityBadge} ${s[`severity_${flag.severity}`]}`}>
                      {flag.severity}
                    </span>
                  )}
                  {flag.layerSource && (
                    <span className={s.flagSource}>{flag.layerSource}</span>
                  )}
                </div>
                {enriched?.aiNarrative && (
                  <p className={s.enrichedFlagNote}>{enriched.aiNarrative}</p>
                )}
              </div>
            </div>
          );
        })}
        {risks.length === 0 && (
          <span className={s.flagSource}>No risks identified from current data</span>
        )}
      </div>

      {/* ── Data Layers ────────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Data Layers</h3>
      <div>
        {dataLayerRows.map((row) => (
          <div key={row.label} className={s.dataLayerRow}>
            <span className={p.valueSmall}>{row.label}</span>
            <div className={p.row}>
              <span className={`${p.valueSmall} ${p.value}`} style={{ fontWeight: 600 }}>{row.value}</span>
              <ConfBadge level={row.confidence} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function AILabel({ confidence }: { confidence?: string }) {
  return (
    <span className={s.aiLabel}>
      <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 1l1.5 4.5H14l-3.5 2.5L12 13 8 10l-4 3 1.5-5L2 5.5h4.5z" strokeLinejoin="round" />
      </svg>
      AI-generated{confidence && confidence !== 'high' ? ` (${confidence} confidence)` : ''} &middot; verify on-site
    </span>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke={spinning ? '#c4a265' : '#9a8a74'}
      strokeWidth={1.5}
      strokeLinecap="round"
      className={spinning ? s.refreshIconSpin : undefined}
    >
      <path d="M1 1v5h5M15 15v-5h-5" />
      <path d="M2.5 10A6 6 0 0113.5 6M13.5 6A6 6 0 012.5 10" />
    </svg>
  );
}

function ConfBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const colorMap = { High: p.badgeHigh, Medium: p.badgeMedium, Low: p.badgeLow };
  return (
    <span className={`${p.badgeConfidence} ${colorMap[level]}`}>
      {level}
    </span>
  );
}

function ScoreCircle({ score, size }: { score: number; size: number }) {
  const sw = size > 50 ? 4 : 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className={s.scoreCircle} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-panel-card-border)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={getScoreColor(score)} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className={s.scoreCircleInner}>
        <span className={s.scoreCircleNum} style={{ fontSize: size > 50 ? 20 : 12 }}>{score}</span>
        {size > 50 && <span className={s.scoreCircleDenom}>/100</span>}
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#2d7a4f';
  if (score >= 60) return '#c4a265';
  return '#9b3a2a';
}
