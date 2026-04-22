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
import { DashboardSectionSkeleton } from '../../../components/ui/DashboardSectionSkeleton.js';
import css from './EcologicalDashboard.module.css';

interface EcologicalDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary {
  organic_matter_pct?: number | string;
  ph_range?: string;
  ph_value?: number | null;
  drainage_class?: string;
  farmland_class?: string;
  depth_to_bedrock_m?: number | string;
  predominant_texture?: string;
  hydrologic_group?: string;
  // Extended soil properties (Sprint B)
  cec_meq_100g?: number | null;
  ec_ds_m?: number | null;
  bulk_density_g_cm3?: number | null;
  ksat_um_s?: number | null;
  awc_cm_cm?: number | null;
  rooting_depth_cm?: number | null;
  clay_pct?: number | null;
  silt_pct?: number | null;
  sand_pct?: number | null;
  caco3_pct?: number | null;
  sodium_adsorption_ratio?: number | null;
  texture_class?: string | null;
  fertility_index?: number | null;
  salinization_risk?: string | null;
  component_count?: number;
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

  const soilRegenStatus = siteData ? getLayer(siteData, 'soil_regeneration')?.fetchStatus : undefined;
  const landCoverStatus = siteData ? getLayer(siteData, 'land_cover')?.fetchStatus : undefined;

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
    const all = deriveOpportunities(siteData.layers, project.country || 'US');
    return all.filter((f) => f.layerSource && ECOLOGY_LAYER_SOURCES.has(f.layerSource));
  }, [siteData, project.country]);

  // Parse soil data
  const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
  const om = isFinite(omRaw) ? omRaw : null;
  const ph = soils?.ph_range ?? null;
  const phVal = soils?.ph_value ?? null;
  const drain = soils?.drainage_class ?? null;
  const texture = soils?.predominant_texture ?? null;
  const depthRaw = parseFloat(String(soils?.depth_to_bedrock_m ?? ''));
  const bedrock = isFinite(depthRaw) ? `${depthRaw}m` : null;
  const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
  const canopy = isFinite(canopyRaw) ? canopyRaw : null;

  // Extended soil properties
  const cec = soils?.cec_meq_100g ?? null;
  const ec = soils?.ec_ds_m ?? null;
  const bulkDensity = soils?.bulk_density_g_cm3 ?? null;
  const ksat = soils?.ksat_um_s ?? null;
  const awc = soils?.awc_cm_cm ?? null;
  const rootingDepth = soils?.rooting_depth_cm ?? null;
  const clayPct = soils?.clay_pct ?? null;
  const siltPct = soils?.silt_pct ?? null;
  const sandPct = soils?.sand_pct ?? null;
  const caco3 = soils?.caco3_pct ?? null;
  const sar = soils?.sodium_adsorption_ratio ?? null;
  const fertilityIndex = soils?.fertility_index ?? null;
  const salinizationRisk = soils?.salinization_risk ?? null;

  // Soil assessment flags
  const soilFlags = useMemo(() => {
    const flags: Array<{ label: string; type: 'warning' | 'positive' | 'info' }> = [];
    if (phVal !== null && (phVal < 5.0 || phVal > 8.5)) flags.push({ label: `pH extreme (${phVal.toFixed(1)})`, type: 'warning' });
    if (ec !== null && ec > 2) flags.push({ label: `Elevated salinity (EC ${ec.toFixed(1)} dS/m)`, type: 'warning' });
    if (bulkDensity !== null && bulkDensity > 1.6) flags.push({ label: `Compaction risk (${bulkDensity.toFixed(2)} g/cm\u00B3)`, type: 'warning' });
    if (cec !== null && cec < 5) flags.push({ label: `Low CEC (${cec.toFixed(1)} meq/100g)`, type: 'warning' });
    if (awc !== null && awc < 0.1) flags.push({ label: `Low water holding (AWC ${awc.toFixed(2)} cm/cm)`, type: 'warning' });
    if (sar !== null && sar > 6) flags.push({ label: `Sodicity concern (SAR ${sar.toFixed(1)})`, type: 'warning' });
    if (fertilityIndex !== null && fertilityIndex >= 70) flags.push({ label: `Good fertility (${fertilityIndex}/100)`, type: 'positive' });
    if (salinizationRisk === 'Low') flags.push({ label: 'Low salinization risk', type: 'positive' });
    return flags;
  }, [phVal, ec, bulkDensity, cec, awc, sar, fertilityIndex, salinizationRisk]);

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

  // First-load state — before siteData arrives, render a card-shaped
  // skeleton instead of the empty null-coalesced layout. This closes the
  // visible gap between route mount and first data frame so the user sees
  // movement immediately (UX scholar #5).
  if (!siteData || (siteData.status === 'loading' && (!siteData.layers || siteData.layers.length === 0))) {
    return (
      <div className={css.page}>
        <div className={css.headerRow}>
          <div>
            <span className={css.statusTag}>ECOLOGICAL ASSESSMENT</span>
            <h1 className={css.title}>Regenerative Potential</h1>
          </div>
        </div>
        <DashboardSectionSkeleton cards={3} rowsPerCard={4} label="Loading ecological data" />
      </div>
    );
  }

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

        {/* Core properties */}
        <div className={css.soilDataRow}>
          <SoilMetric label="ORGANIC MATTER" value={om !== null ? `${om.toFixed(1)}%` : null} />
          <SoilMetric label="pH RANGE" value={ph} />
          <SoilMetric label="DRAINAGE" value={drain} />
          <SoilMetric label="TEXTURE" value={texture} />
          {bedrock && <SoilMetric label="BEDROCK DEPTH" value={bedrock} />}
          {canopy != null && <SoilMetric label="TREE CANOPY" value={`${canopy}%`} />}
        </div>

        {/* Physical properties */}
        {(bulkDensity !== null || rootingDepth !== null || awc !== null || ksat !== null) && (
          <>
            <h4 className={css.subSectionLabel}>PHYSICAL PROPERTIES</h4>
            <div className={css.soilDataRow}>
              <SoilMetric label="BULK DENSITY" value={bulkDensity !== null ? `${bulkDensity.toFixed(2)} g/cm\u00B3` : null} />
              <SoilMetric label="ROOTING DEPTH" value={rootingDepth !== null ? `${rootingDepth.toFixed(0)} cm` : null} />
              <SoilMetric label="AVAIL. WATER" value={awc !== null ? `${awc.toFixed(2)} cm/cm` : null} />
              <SoilMetric label="HYDRAULIC COND." value={ksat !== null ? `${ksat.toFixed(1)} \u03BCm/s` : null} />
            </div>
          </>
        )}

        {/* Particle size */}
        {(clayPct !== null || siltPct !== null || sandPct !== null) && (
          <>
            <h4 className={css.subSectionLabel}>PARTICLE SIZE</h4>
            <div className={css.soilDataRow}>
              <SoilMetric label="CLAY" value={clayPct !== null ? `${clayPct.toFixed(1)}%` : null} />
              <SoilMetric label="SILT" value={siltPct !== null ? `${siltPct.toFixed(1)}%` : null} />
              <SoilMetric label="SAND" value={sandPct !== null ? `${sandPct.toFixed(1)}%` : null} />
            </div>
          </>
        )}

        {/* Chemical properties */}
        {(cec !== null || ec !== null || caco3 !== null || sar !== null) && (
          <>
            <h4 className={css.subSectionLabel}>CHEMICAL PROPERTIES</h4>
            <div className={css.soilDataRow}>
              <SoilMetric label="CEC" value={cec !== null ? `${cec.toFixed(1)} meq/100g` : null} />
              <SoilMetric label="ELEC. COND." value={ec !== null ? `${ec.toFixed(2)} dS/m` : null} />
              <SoilMetric label="CaCO\u2083" value={caco3 !== null ? `${caco3.toFixed(1)}%` : null} />
              <SoilMetric label="SAR" value={sar !== null ? `${sar.toFixed(1)}` : null} />
            </div>
          </>
        )}

        {/* Derived indices */}
        {(fertilityIndex !== null || salinizationRisk !== null) && (
          <>
            <h4 className={css.subSectionLabel}>DERIVED INDICES</h4>
            <div className={css.soilDataRow}>
              {fertilityIndex !== null && (
                <div className={css.soilDataItem}>
                  <span className={css.soilDataLabel}>FERTILITY INDEX</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: 'rgba(180,165,140,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${fertilityIndex}%`, height: '100%', borderRadius: '3px',
                        background: fertilityIndex >= 70 ? '#4a7c59' : fertilityIndex >= 40 ? '#b8860b' : '#8b4513',
                      }} />
                    </div>
                    <span className={css.soilDataValue}>{fertilityIndex}/100</span>
                  </div>
                </div>
              )}
              {salinizationRisk !== null && (
                <div className={css.soilDataItem}>
                  <span className={css.soilDataLabel}>SALINIZATION RISK</span>
                  <span className={css.soilDataValue} style={{
                    color: salinizationRisk === 'Low' ? '#4a7c59'
                      : salinizationRisk === 'Moderate' ? '#b8860b'
                      : '#8b4513',
                  }}>{salinizationRisk}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Soil assessment flags */}
        {soilFlags.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {soilFlags.map((flag) => (
              <span key={flag.label} style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                background: flag.type === 'warning' ? 'rgba(139,69,19,0.12)' : 'rgba(74,124,89,0.12)',
                color: flag.type === 'warning' ? '#8b4513' : '#4a7c59',
                border: `1px solid ${flag.type === 'warning' ? 'rgba(139,69,19,0.2)' : 'rgba(74,124,89,0.2)'}`,
              }}>
                {flag.type === 'warning' ? '\u26A0 ' : '\u2713 '}{flag.label}
              </span>
            ))}
          </div>
        )}
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
              <WetlandMetric label="Riparian Buffer" value={typeof wetlands.riparian_buffer_m === 'number' ? `${wetlands.riparian_buffer_m}m` : 'Not detected'} />
              <WetlandMetric label="Regulated Area" value={typeof wetlands.regulated_area_pct === 'number' ? `${wetlands.regulated_area_pct.toFixed(1)}%` : (wetlands.regulated_area_pct ?? 'N/A')} />
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
