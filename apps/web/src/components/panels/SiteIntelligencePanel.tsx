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
import { matchCropsToSite, siteConditionsFromLayers, type CropMatch } from '../../lib/cropMatching.js';
import {
  computeHydrologyMetrics,
  fmtGal,
  parseHydrologicGroup,
  HYDRO_DEFAULTS,
  type HydroMetrics,
} from '../../lib/hydrologyMetrics.js';
import { CATEGORY_LABELS } from '../../data/ecocropSubset.js';
import { Spinner } from '../ui/Spinner.js';
import { useOfflineGate } from '../../hooks/useOfflineGate.js';
import { confidence, error as errorToken, semantic } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';
import s from './SiteIntelligencePanel.module.css';

interface SiteIntelligencePanelProps {
  project: LocalProject;
}

function severityColor(severity: string, fallback: string): string {
  switch (severity) {
    case 'critical': return errorToken.DEFAULT;
    case 'warning': return confidence.medium;
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

const TIER1_TYPES = ['elevation', 'soils', 'watershed', 'wetlands_flood', 'land_cover', 'climate', 'zoning'] as const;
const TIER1_LABELS: Record<string, string> = {
  elevation: 'Elevation', soils: 'Soils', watershed: 'Watershed',
  wetlands_flood: 'Wetlands', land_cover: 'Land Cover', climate: 'Climate', zoning: 'Zoning',
};

const TIER3_TYPES = [
  { type: 'terrain_analysis', label: 'Terrain Analysis' },
  { type: 'watershed_derived', label: 'Watershed Derived' },
  { type: 'microclimate', label: 'Microclimate' },
  { type: 'soil_regeneration', label: 'Soil Regeneration' },
] as const;

function formatComponentName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function capConf(c: 'high' | 'medium' | 'low'): 'High' | 'Medium' | 'Low' {
  return (c.charAt(0).toUpperCase() + c.slice(1)) as 'High' | 'Medium' | 'Low';
}

export default function SiteIntelligencePanel({ project }: SiteIntelligencePanelProps) {
  const { isOffline } = useOfflineGate();
  const [liveDataOpen, setLiveDataOpen] = useState(true);
  const [hydroOpen, setHydroOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedScore, setExpandedScore] = useState<string | null>(null);
  const [showAllOpps, setShowAllOpps] = useState(false);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const siteData = useSiteData(project.id);
  const refreshProject = useSiteDataStore((st) => st.refreshProject);

  // AI enrichment data
  const enrichment = siteData?.enrichment;

  const consAuth = useMemo(() => getConservationAuth(project), [project]);

  // Derive all computed values from layer data
  const layers = siteData?.layers ?? [];

  // Layer-based completeness (Tier 1)
  const layerCompleteness = useMemo(() => {
    return TIER1_TYPES.map((type) => {
      const layer = layers.find((l) => l.layerType === type);
      return {
        type,
        label: TIER1_LABELS[type] ?? type,
        status: (layer?.fetchStatus ?? 'unavailable') as 'complete' | 'pending' | 'failed' | 'unavailable',
      };
    });
  }, [layers]);

  const layerCompleteCount = layerCompleteness.filter((l) => l.status === 'complete').length;

  // Tier 3 derived analysis status
  const tier3Status = useMemo(() => {
    return TIER3_TYPES.map(({ type, label }) => {
      const layer = layers.find((l) => l.layerType === type);
      const status = layer?.fetchStatus;
      return {
        label,
        status: status === 'complete' ? 'complete' as const
          : status === 'pending' ? 'computing' as const
          : 'waiting' as const,
      };
    });
  }, [layers]);

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

  // Blocking flags — critical risks surfaced prominently
  const blockingFlags = useMemo(
    () => risks.filter((r) => r.severity === 'critical'),
    [risks],
  );

  // Top opportunities — prioritize those matching highest-scoring components
  const topOpportunities = useMemo(() => {
    const allComponents = assessmentScores.flatMap((sc) => sc.score_breakdown);
    const topSources = new Set(
      allComponents
        .filter((c) => c.maxPossible > 0)
        .sort((a, b) => (b.value / b.maxPossible) - (a.value / a.maxPossible))
        .slice(0, 5)
        .map((c) => c.sourceLayer),
    );
    const matched = opportunities.filter((o) => o.layerSource && topSources.has(o.layerSource));
    const rest = opportunities.filter((o) => !matched.includes(o));
    return [...matched, ...rest];
  }, [assessmentScores, opportunities]);

  // Top constraints — critical first, then those matching weakest components
  const topConstraints = useMemo(() => {
    const allComponents = assessmentScores.flatMap((sc) => sc.score_breakdown);
    const weakSources = new Set(
      allComponents
        .filter((c) => c.maxPossible > 0)
        .sort((a, b) => (a.value / a.maxPossible) - (b.value / b.maxPossible))
        .slice(0, 5)
        .map((c) => c.sourceLayer),
    );
    const critical = risks.filter((r) => r.severity === 'critical');
    const matchedNonCritical = risks.filter(
      (r) => r.severity !== 'critical' && r.layerSource && weakSources.has(r.layerSource),
    );
    const rest = risks.filter((r) => !critical.includes(r) && !matchedNonCritical.includes(r));
    return [...critical, ...matchedNonCritical, ...rest];
  }, [assessmentScores, risks]);

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

  // Crop suitability matching
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [cropCategoryFilter, setCropCategoryFilter] = useState<string | null>(null);
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  const cropMatches = useMemo((): CropMatch[] => {
    const climateLayer = layers.find((l) => l.layerType === 'climate');
    const soilLayer = layers.find((l) => l.layerType === 'soils');
    if (!climateLayer && !soilLayer) return [];
    const site = siteConditionsFromLayers(
      (climateLayer?.summary as Record<string, unknown>) ?? null,
      (soilLayer?.summary as Record<string, unknown>) ?? null,
    );
    return matchCropsToSite(site, {
      categories: cropCategoryFilter ? [cropCategoryFilter] : undefined,
      minSuitability: 30,
      maxResults: 100,
    });
  }, [layers, cropCategoryFilter]);

  // Sprint F: Hydrology Intelligence metrics
  const hydroMetrics = useMemo((): HydroMetrics | null => {
    const climateLayer   = layers.find((l) => l.layerType === 'climate');
    const watershedLayer = layers.find((l) => l.layerType === 'watershed');
    const wetlandsLayer  = layers.find((l) => l.layerType === 'wetlands_flood');
    const elevationLayer = layers.find((l) => l.layerType === 'elevation');
    const soilsLayer     = layers.find((l) => l.layerType === 'soils');
    if (!climateLayer) return null;
    const cs  = climateLayer.summary  as Record<string, unknown> | undefined;
    const ws  = watershedLayer?.summary as Record<string, unknown> | undefined;
    const wfs = wetlandsLayer?.summary  as Record<string, unknown> | undefined;
    const es  = elevationLayer?.summary as Record<string, unknown> | undefined;
    const ss  = soilsLayer?.summary     as Record<string, unknown> | undefined;
    const precipMm = typeof cs?.annual_precip_mm === 'number'
      ? cs.annual_precip_mm : HYDRO_DEFAULTS.precipMm;
    return computeHydrologyMetrics({
      precipMm,
      catchmentHa: (() => {
        const v = parseFloat(String(ws?.catchment_area_ha ?? ''));
        return isFinite(v) ? v : null;
      })(),
      propertyAcres:   project.acreage  ?? HYDRO_DEFAULTS.propertyAcres,
      slopeDeg:        typeof es?.mean_slope_deg === 'number'   ? es.mean_slope_deg   : HYDRO_DEFAULTS.slopeDeg,
      hydrologicGroup: parseHydrologicGroup(typeof ss?.hydrologic_group === 'string' ? ss.hydrologic_group : undefined),
      drainageClass:   typeof ss?.drainage_class === 'string'   ? ss.drainage_class   : HYDRO_DEFAULTS.drainageClass,
      floodZone:       typeof wfs?.flood_zone === 'string'      ? wfs.flood_zone      : HYDRO_DEFAULTS.floodZone,
      wetlandPct:      typeof wfs?.wetland_pct === 'number'     ? wfs.wetland_pct     : HYDRO_DEFAULTS.wetlandPct,
      annualTempC:     typeof cs?.annual_temp_mean_c === 'number' ? cs.annual_temp_mean_c : HYDRO_DEFAULTS.annualTempC,
    });
  }, [layers, project.acreage]);

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
        <button
          onClick={handleRefresh}
          className={`${s.refreshBtn} ${isRefreshing ? s.refreshBtnSpinning : ''}`}
          aria-label="Refresh site data"
          disabled={isOffline || isRefreshing}
          title={isOffline ? 'Layer refresh requires internet' : undefined}
        >
          <RefreshIcon spinning={isRefreshing} />
          {isRefreshing && <span className={s.refreshHint}>Refreshing...</span>}
        </button>
      </div>

      {/* ── Refresh banner ───────────────────────────────────────── */}
      {isRefreshing && (
        <div className={s.refreshBanner}>
          <Spinner size="sm" color={semantic.sidebarActive} />
          Refreshing environmental data...
        </div>
      )}

      {/* ── Blocking Flags ───────────────────────────────────────── */}
      {blockingFlags.length > 0 && (
        <div className={s.blockingAlertWrap}>
          {blockingFlags.map((flag) => (
            <div key={flag.id} className={s.blockingAlert}>
              <span className={s.blockingAlertIcon}>{'\u26D4'}</span>
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
        <div>
          <div className={s.suitabilityTitle}>Overall Suitability</div>
          <div className={s.completenessLabel}>Data layers: {layerCompleteCount}/7</div>
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
        {/* Header bar — clickable to collapse */}
        <button
          onClick={() => setLiveDataOpen((v) => !v)}
          className={`${s.liveDataHeader} ${liveDataOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke={semantic.sidebarActive} strokeWidth={1.5}>
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
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round" className={`${s.chevron} ${!liveDataOpen ? s.chevronClosed : ''}`}>
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

      {/* ── Hydrology Intelligence (Sprint F) ────────────────────── */}
      {hydroMetrics && (
        <div className={s.liveDataWrap} style={{ marginBottom: 'var(--space-5)' }}>
          <button
            onClick={() => setHydroOpen((v) => !v)}
            className={`${s.liveDataHeader} ${hydroOpen ? s.liveDataHeaderOpen : ''}`}
          >
            <span style={{ color: semantic.sidebarActive }}>&#9679;</span>
            <span className={s.liveDataTitle}>Hydrology Intelligence</span>
            <div style={{ flex: 1 }} />
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
              stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
              className={`${s.chevron} ${!hydroOpen ? s.chevronClosed : ''}`}>
              <path d="M3 7l3-3 3 3" />
            </svg>
          </button>
          {hydroOpen && (
            <div style={{ padding: '4px 0' }}>
              {/* Aridity */}
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Aridity</span>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <span className={s.scoreBadge}
                    style={{ background: `${getHydroColor(hydroMetrics.aridityClass)}18`,
                             color: getHydroColor(hydroMetrics.aridityClass) }}>
                    {hydroMetrics.aridityClass}
                  </span>
                </div>
                <span className={s.flagSource}>P/PET {hydroMetrics.aridityIndex.toFixed(2)}</span>
              </div>
              {/* Water Balance */}
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Water Balance</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right' }}>
                  {hydroMetrics.waterBalanceMm >= 0 ? '+' : ''}{hydroMetrics.waterBalanceMm} mm/yr
                </span>
                <span className={s.flagSource}>
                  {hydroMetrics.waterBalanceMm >= 0 ? 'surplus' : 'deficit'}
                </span>
              </div>
              {/* PET */}
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>PET</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right' }}>
                  {hydroMetrics.petMm} mm/yr
                </span>
                <span className={s.flagSource}>Blaney-Criddle</span>
              </div>
              {/* RWH Potential */}
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Harvest Potential</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right' }}>
                  ~{fmtGal(hydroMetrics.rwhPotentialGal)} gal/yr
                </span>
                <span className={s.flagSource}>catchment RWH</span>
              </div>
              {/* Storage Sizing */}
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Storage Sizing</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right' }}>
                  ~{fmtGal(hydroMetrics.rwhStorageGal)} gal
                </span>
                <span className={s.flagSource}>2-week buffer</span>
              </div>
              {/* Irrigation */}
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Irrigation</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right' }}>
                  {hydroMetrics.irrigationDeficitMm === 0
                    ? 'No gap projected'
                    : `${hydroMetrics.irrigationDeficitMm} mm deficit`}
                </span>
                <span className={s.flagSource}>
                  {hydroMetrics.irrigationDeficitMm === 0 ? 'surplus' : 'vs PET'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
          <Spinner size="sm" color={semantic.sidebarActive} />
          <span>Generating AI insights...</span>
        </div>
      )}

      {/* ── Assessment Scores ──────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Assessment Scores</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {assessmentScores.map((item) => (
          <div key={item.label}>
            <div
              className={`${s.scoreRow} ${s.scoreRowClickable}`}
              onClick={() => setExpandedScore(expandedScore === item.label ? null : item.label)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedScore(expandedScore === item.label ? null : item.label); }}
            >
              <ScoreCircle score={item.score} size={36} />
              <div style={{ flex: 1 }}>
                <div className={s.scoreLabel}>{item.label}</div>
                <div className={s.scoreBar}>
                  <div className={s.scoreBarFill} style={{ width: `${item.score}%`, background: getScoreColor(item.score) }} />
                </div>
              </div>
              <ConfBadge level={capConf(item.confidence)} />
              <span
                className={s.scoreBadge}
                style={{ background: `${getScoreColor(item.score)}18`, color: getScoreColor(item.score) }}
              >
                {item.rating}
              </span>
            </div>
            {expandedScore === item.label && (
              <div className={s.scoreBreakdown}>
                {item.score_breakdown.map((comp) => {
                  const pct = comp.maxPossible > 0 ? Math.max(0, Math.min(100, (comp.value / comp.maxPossible) * 100)) : 0;
                  return (
                    <div key={comp.name} className={s.breakdownRow}>
                      <span className={s.breakdownName}>{formatComponentName(comp.name)}</span>
                      <div className={s.breakdownBarTrack}>
                        <div
                          className={s.breakdownBarFill}
                          style={{ width: `${pct}%`, background: getScoreColor(pct) }}
                        />
                      </div>
                      <span className={s.breakdownValue}>
                        {comp.value}/{comp.maxPossible}
                      </span>
                      <ConfBadge level={capConf(comp.confidence)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Opportunities ──────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Main Opportunities</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {(showAllOpps ? topOpportunities : topOpportunities.slice(0, 3)).map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.oppIcon}
                style={{ color: severityColor(flag.severity, confidence.high) }}
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
        {topOpportunities.length > 3 && (
          <button className={s.showAllToggle} onClick={() => setShowAllOpps((v) => !v)}>
            {showAllOpps ? 'Show fewer' : `Show all ${topOpportunities.length}`}
          </button>
        )}
        {topOpportunities.length === 0 && (
          <span className={s.flagSource}>No opportunities identified from current data</span>
        )}
      </div>

      {/* ── Key Constraints ──────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Key Constraints</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {(showAllRisks ? topConstraints : topConstraints.slice(0, 3)).map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.riskIcon}
                style={{ color: severityColor(flag.severity, confidence.low) }}
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
        {topConstraints.length > 3 && (
          <button className={s.showAllToggle} onClick={() => setShowAllRisks((v) => !v)}>
            {showAllRisks ? 'Show fewer' : `Show all ${topConstraints.length}`}
          </button>
        )}
        {topConstraints.length === 0 && (
          <span className={s.flagSource}>No constraints identified from current data</span>
        )}
      </div>

      {/* ── Crop Suitability ─────────────────────────────────────── */}
      {cropMatches.length > 0 && (
        <>
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
              onClick={() => setCropCategoryFilter(null)}
            >
              All
            </button>
            {['cereal', 'legume', 'vegetable', 'fruit_nut', 'forage', 'cover_crop', 'forestry'].map((cat) => (
              <button
                key={cat}
                className={`${s.cropFilterPill} ${cropCategoryFilter === cat ? s.cropFilterPillActive : ''}`}
                onClick={() => setCropCategoryFilter(cropCategoryFilter === cat ? null : cat)}
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
                  onClick={() => setExpandedCrop(expandedCrop === match.crop.id ? null : match.crop.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedCrop(expandedCrop === match.crop.id ? null : match.crop.id); }}
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
                          <span className={s.breakdownValue} title={f.cropRange}>
                            {f.siteValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {cropMatches.length > 8 && (
              <button className={s.showAllToggle} onClick={() => setShowAllCrops((v) => !v)}>
                {showAllCrops ? 'Show top 8' : `Show all ${cropMatches.length} crops`}
              </button>
            )}
          </div>
        </>
      )}

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
      stroke={spinning ? semantic.sidebarActive : semantic.sidebarIcon}
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
  if (score >= 80) return confidence.high;
  if (score >= 60) return semantic.sidebarActive;
  return confidence.low;
}

function getHydroColor(cls: string): string {
  if (cls === 'Humid' || cls === 'Dry sub-humid') return confidence.high;
  if (cls === 'Semi-arid') return confidence.medium;
  return confidence.low;
}
