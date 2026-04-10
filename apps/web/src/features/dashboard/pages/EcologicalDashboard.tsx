/**
 * EcologicalDashboard — real ecological data from layer store + scoring engine.
 * No hardcoded flora/fauna. All sections source from environmental layers,
 * assessment scores, and Tier 3 derived analyses.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary, getLayer } from '../../../store/siteDataStore.js';
import { computeAssessmentScores, deriveOpportunities } from '../../../lib/computeScores.js';
import type { ScoredResult, ScoreComponent } from '../../../lib/computeScores.js';
import type { AssessmentFlag } from '@ogden/shared';
import ProgressBar from '../components/ProgressBar.js';
import css from './EcologicalDashboard.module.css';

interface EcologicalDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary {
  organic_matter_pct?: number | string;
  ph_range?: string;
  drainage_class?: string;
  farmland_class?: string;
  depth_to_bedrock_m?: number | string;
  predominant_texture?: string;
  hydrologic_group?: string;
}

interface LandCoverSummary {
  classes?: Record<string, number>;
  tree_canopy_pct?: number | string;
  impervious_pct?: number | string;
  primary_class?: string;
}

interface WetlandsSummary {
  wetland_pct?: number;
  wetland_types?: string[];
  riparian_buffer_m?: number;
  regulated_area_pct?: number;
  flood_zone?: string;
}

interface SoilRegenSummary {
  carbonSequestration?: {
    totalCurrentSOC_tC?: number;
    totalPotentialSOC_tC?: number;
    totalAnnualSeq_tCyr?: number;
    meanSeqPotential?: number;
  };
  interventions?: Array<{ name: string; description: string; priority?: string }>;
  regenerationSequence?: string[];
  restorationPriority?: string;
}

function scoreQuality(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Developing';
}

function formatComponentName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ECOLOGY_LAYER_SOURCES = new Set(['land_cover', 'wetlands_flood', 'soils', 'soil_regeneration']);

export default function EcologicalDashboard({ project, onSwitchToMap }: EcologicalDashboardProps) {
  const siteData = useSiteData(project.id);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);

  const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
  const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
  const wetlands = siteData ? getLayerSummary<WetlandsSummary>(siteData, 'wetlands_flood') : null;
  const soilRegen = siteData ? getLayerSummary<SoilRegenSummary>(siteData, 'soil_regeneration') : null;

  const soilRegenStatus = siteData ? getLayer(siteData, 'soil_regeneration')?.fetch_status : undefined;
  const landCoverStatus = siteData ? getLayer(siteData, 'land_cover')?.fetch_status : undefined;

  // Compute scores from scoring engine
  const scores = useMemo(() => {
    if (!siteData?.layers?.length) return [];
    return computeAssessmentScores(siteData.layers, project.acreage ?? null);
  }, [siteData, project.acreage]);

  const habitatScore = scores.find((s) => s.label === 'Habitat Sensitivity');
  const regenScore = scores.find((s) => s.label === 'Regenerative Potential');
  const headlineScore = regenScore ?? habitatScore;
  const headlineValue = headlineScore?.score ?? 0;
  const headlineQuality = scoreQuality(headlineValue);

  // Derive ecological opportunities from rules engine
  const ecoOpportunities = useMemo(() => {
    if (!siteData?.layers?.length) return [];
    const all = deriveOpportunities(siteData.layers, (project.country as 'US' | 'CA') || 'US');
    return all.filter((f) => f.layerSource && ECOLOGY_LAYER_SOURCES.has(f.layerSource));
  }, [siteData, project.country]);

  // Parse soil data
  const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
  const om = isFinite(omRaw) ? omRaw : null;
  const ph = soils?.ph_range ?? null;
  const drain = soils?.drainage_class ?? null;
  const texture = soils?.predominant_texture ?? null;
  const depthRaw = parseFloat(String(soils?.depth_to_bedrock_m ?? ''));
  const bedrock = isFinite(depthRaw) ? `${depthRaw}m` : null;
  const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
  const canopy = isFinite(canopyRaw) ? canopyRaw : null;

  // Land cover classes
  const coverClasses = useMemo(() => {
    if (!landCover?.classes) return [];
    return Object.entries(landCover.classes)
      .map(([name, pct]) => ({ name, pct: typeof pct === 'number' ? pct : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [landCover]);

  // Carbon data
  const carbon = soilRegen?.carbonSequestration;

  const descQuality = headlineQuality === 'Excellent'
    ? 'Ecological indicators show strong regenerative capacity and habitat diversity potential.'
    : headlineQuality === 'Good'
      ? 'Ecological health is good. Targeted interventions could strengthen habitat corridors and soil biology.'
      : `Ecological health is ${headlineQuality.toLowerCase()}. Site assessment identifies opportunities for regenerative improvement.`;

  return (
    <div className={css.page}>
      {/* Header */}
      <div className={css.headerRow}>
        <div>
          <span className={css.statusTag}>ECOLOGICAL ASSESSMENT</span>
          <h1 className={css.title}>Regenerative Potential</h1>
        </div>
        <div className={css.scoreCard}>
          <span className={css.scoreValue}>{headlineValue}</span>
          <span className={css.scoreUnit}>/100</span>
        </div>
      </div>
      <p className={css.desc}>{descQuality}</p>

      {/* Headline scores — Habitat Sensitivity + Regenerative Potential */}
      {scores.length > 0 && (
        <div className={css.dualScoreRow}>
          {[habitatScore, regenScore].filter(Boolean).map((sc) => (
            <div key={sc!.label} className={css.miniScoreCard}>
              <div className={css.miniScoreHeader}>
                <span className={css.miniScoreLabel}>{sc!.label}</span>
                <span className={css.miniScoreConf}>{sc!.confidence}</span>
              </div>
              <div className={css.miniScoreValue}>{sc!.score}<span className={css.miniScoreOf}>/100</span></div>
              <div className={css.miniScoreRating}>{sc!.rating}</div>
              <button
                className={css.breakdownToggle}
                onClick={() => setExpandedBreakdown(expandedBreakdown === sc!.label ? null : sc!.label)}
              >
                {expandedBreakdown === sc!.label ? 'Hide breakdown' : 'Show breakdown'}
              </button>
              {expandedBreakdown === sc!.label && (
                <div className={css.breakdownList}>
                  {sc!.score_breakdown.map((comp) => (
                    <div key={comp.name} className={css.breakdownItem}>
                      <span className={css.breakdownName}>{formatComponentName(comp.name)}</span>
                      <div className={css.breakdownBarTrack}>
                        <div
                          className={css.breakdownBarFill}
                          style={{ width: `${comp.maxPossible > 0 ? (comp.value / comp.maxPossible) * 100 : 0}%` }}
                        />
                      </div>
                      <span className={css.breakdownValue}>{comp.value}/{comp.maxPossible}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Soil Health */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SOIL HEALTH</h3>
        <div className={css.soilDataRow}>
          <SoilMetric label="ORGANIC MATTER" value={om !== null ? `${om.toFixed(1)}%` : null} />
          <SoilMetric label="pH RANGE" value={ph} />
          <SoilMetric label="DRAINAGE" value={drain} />
          <SoilMetric label="TEXTURE" value={texture} />
          {bedrock && <SoilMetric label="BEDROCK DEPTH" value={bedrock} />}
          {canopy != null && <SoilMetric label="TREE CANOPY" value={`${canopy}%`} />}
        </div>
      </div>

      {/* Vegetation Communities — from land cover classes */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>VEGETATION COMMUNITIES</h3>
        {coverClasses.length > 0 ? (
          <div className={css.coverCard}>
            {coverClasses.map((c) => (
              <div key={c.name} className={css.coverRow}>
                <span className={css.coverName}>{c.name}</span>
                <div className={css.coverBarTrack}>
                  <div className={css.coverBarFill} style={{ width: `${Math.min(c.pct, 100)}%` }} />
                </div>
                <span className={css.coverPct}>{c.pct.toFixed(1)}%</span>
              </div>
            ))}
            <p className={css.coverNote}>
              Species-level data requires field survey. Classification based on NLCD/AAFC remote sensing.
            </p>
          </div>
        ) : (
          <div className={css.pendingCard}>
            {landCoverStatus === 'pending' ? 'Land cover analysis in progress...' : 'Land cover data not yet available. Run site analysis to populate.'}
          </div>
        )}
      </div>

      {/* Wetland & Riparian */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>WETLAND & RIPARIAN</h3>
        {wetlands ? (
          <div className={css.wetlandCard}>
            <div className={css.wetlandGrid}>
              <WetlandMetric label="Wetland Coverage" value={wetlands.wetland_pct != null ? `${wetlands.wetland_pct.toFixed(1)}%` : 'None mapped'} />
              <WetlandMetric label="Riparian Buffer" value={wetlands.riparian_buffer_m != null ? `${wetlands.riparian_buffer_m}m` : 'Not detected'} />
              <WetlandMetric label="Regulated Area" value={wetlands.regulated_area_pct != null ? `${wetlands.regulated_area_pct.toFixed(1)}%` : 'N/A'} />
              <WetlandMetric label="Flood Zone" value={wetlands.flood_zone ?? 'Not classified'} />
            </div>
            {wetlands.wetland_types && wetlands.wetland_types.length > 0 && (
              <div className={css.wetlandTypes}>
                <span className={css.wetlandTypesLabel}>Types: </span>
                {wetlands.wetland_types.join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div className={css.pendingCard}>
            No mapped wetlands — field verification recommended.
          </div>
        )}
      </div>

      {/* Ecological Interventions — from Tier 3 soil_regeneration */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ECOLOGICAL INTERVENTIONS</h3>
        {soilRegen?.interventions && soilRegen.interventions.length > 0 ? (
          <div className={css.interventionList}>
            {soilRegen.interventions.map((iv, i) => (
              <div key={i} className={css.interventionCard}>
                <div className={css.interventionHeader}>
                  <span className={css.interventionName}>{iv.name}</span>
                  {iv.priority && <span className={css.interventionPriority}>{iv.priority}</span>}
                </div>
                <p className={css.interventionDesc}>{iv.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.pendingCard}>
            {soilRegenStatus === 'pending' ? 'Regeneration analysis computing...' : 'Regeneration analysis requires completed soil and land cover data.'}
          </div>
        )}
      </div>

      {/* Carbon Estimate */}
      {carbon && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>CARBON SEQUESTRATION ESTIMATE</h3>
          <div className={css.carbonGrid}>
            <CarbonMetric label="Current SOC" value={carbon.totalCurrentSOC_tC != null ? `${carbon.totalCurrentSOC_tC.toFixed(1)} tC` : null} />
            <CarbonMetric label="Potential SOC" value={carbon.totalPotentialSOC_tC != null ? `${carbon.totalPotentialSOC_tC.toFixed(1)} tC` : null} />
            <CarbonMetric label="Annual Sequestration" value={carbon.totalAnnualSeq_tCyr != null ? `${carbon.totalAnnualSeq_tCyr.toFixed(2)} tC/yr` : null} />
          </div>
        </div>
      )}

      {/* Ecological Opportunities — from rules engine */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ECOLOGICAL OPPORTUNITIES</h3>
        {ecoOpportunities.length > 0 ? (
          <div className={css.opportunityList}>
            {ecoOpportunities.map((opp) => (
              <div key={opp.id} className={css.opportunityItem}>
                <div className={css.opportunityIcon}>
                  <OpportunityIcon category={opp.category} />
                </div>
                <div>
                  <span className={css.opportunityName}>{opp.message}</span>
                  {opp.layerSource && <span className={css.opportunityDesc}>Source: {opp.layerSource}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.pendingCard}>
            Ecological opportunities will be identified once layer data is available.
          </div>
        )}
      </div>

      <button className={css.surveyBtn} onClick={onSwitchToMap}>
        FIELD SURVEY
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="1" x2="7" y2="13" /><line x1="1" y1="7" x2="13" y2="7" />
        </svg>
      </button>
    </div>
  );
}

function SoilMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={css.soilDataItem}>
      <span className={css.soilDataLabel}>{label}</span>
      <span className={css.soilDataValue}>{value ?? '\u2014'}</span>
    </div>
  );
}

function WetlandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.wetlandMetric}>
      <span className={css.wetlandMetricLabel}>{label}</span>
      <span className={css.wetlandMetricValue}>{value}</span>
    </div>
  );
}

function CarbonMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={css.carbonMetric}>
      <span className={css.carbonMetricLabel}>{label}</span>
      <span className={css.carbonMetricValue}>{value ?? '\u2014'}</span>
    </div>
  );
}

function OpportunityIcon({ category }: { category: string }) {
  const p = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'rgba(180,165,140,0.5)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (category) {
    case 'conservation':
      return <svg {...p}><path d="M8 2C8 2 4 7 4 10C4 12.2 5.8 14 8 14C10.2 14 12 12.2 12 10C12 7 8 2 8 2Z" /></svg>;
    case 'agriculture':
      return <svg {...p}><path d="M8 1L4 7H6L3 13H13L10 7H12L8 1Z" /><line x1="8" y1="13" x2="8" y2="15" /></svg>;
    case 'climate':
      return <svg {...p}><circle cx="8" cy="5" r="3" /><path d="M3 13C3 13 5 9 8 9C11 9 13 13 13 13" /></svg>;
    default:
      return <svg {...p}><circle cx="8" cy="8" r="4" /></svg>;
  }
}
