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
import type { AssessmentFlag, EcoregionId, PollinatorGuild } from '@ogden/shared';
import { computePollinatorHabitat } from '@ogden/shared';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useMapStore } from '../../../store/mapStore.js';
import ProgressBar from '../components/ProgressBar.js';
import { DashboardSectionSkeleton } from '../../../components/ui/DashboardSectionSkeleton.js';
import RegenerationTimelineCard from '../../regeneration/RegenerationTimelineCard.js';
import RestorationPriorityCard from '../../restoration/RestorationPriorityCard.js';
import SoilSamplesCard from '../../soil-samples/SoilSamplesCard.js';
import ZoneEcologyRollup from '../../zones/ZoneEcologyRollup.js';
import CarbonByLandUseCard from '../../zones/CarbonByLandUseCard.js';
import ZoneSeasonalityRollup from '../../zones/ZoneSeasonalityRollup.js';
import EcologicalProtectionCard from '../../zones/EcologicalProtectionCard.js';
import ProtectedAreasHabitatCard from '../../zones/ProtectedAreasHabitatCard.js';
import CarryingCapacityCard from '../../scenarios/CarryingCapacityCard.js';
import AiSiteSynthesisCard from '../../ai-design-support/AiSiteSynthesisCard.js';
import AiSiteSummaryCard from '../../ai-design-support/AiSiteSummaryCard.js';
import AssumptionGapDetectorCard from '../../ai-design-support/AssumptionGapDetectorCard.js';
import NeedsSiteVisitCard from '../../ai-design-support/NeedsSiteVisitCard.js';
import AlternativeLayoutRationaleCard from '../../ai-design-support/AlternativeLayoutRationaleCard.js';
import FeaturePlacementSuggestionsCard from '../../ai-design-support/FeaturePlacementSuggestionsCard.js';
import DesignBriefPitchCard from '../../ai-design-support/DesignBriefPitchCard.js';
import EcologicalRiskWarningsCard from '../../ai-design-support/EcologicalRiskWarningsCard.js';
import EducationalExplainerCard from '../../ai-design-support/EducationalExplainerCard.js';
import WhyHerePanelsCard from '../../ai-design-support/WhyHerePanelsCard.js';
import AiOutputFeedbackCard from '../../ai-design-support/AiOutputFeedbackCard.js';
import PhasedBuildStrategyCard from '../../ai-design-support/PhasedBuildStrategyCard.js';
import NutrientBalanceCard from '../../soil-fertility/NutrientBalanceCard.js';
import SoilRiskHotspotsCard from '../../soil-fertility/SoilRiskHotspotsCard.js';
import MissionImpactRollupCard from '../../decision/MissionImpactRollupCard.js';
import MissionTradeoffExplorerCard from '../../decision/MissionTradeoffExplorerCard.js';
import MobileTractorZonesCard from '../../livestock/MobileTractorZonesCard.js';
import PresentationDeckCard from '../../collaboration/PresentationDeckCard.js';
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

interface PollinatorOppSummary {
  corridorReadiness?: number | null;
  patchCount?: number | null;
  gridSize?: number | null;
  ecoregionId?: string | null;
  patchesByQuality?: {
    high?: number | null;
    moderate?: number | null;
    low?: number | null;
    hostile?: number | null;
  };
  patchesByRole?: {
    core?: number | null;
    stepping_stone?: number | null;
    isolated?: number | null;
    matrix?: number | null;
  };
  confidence?: 'high' | 'medium' | 'low';
  caveat?: string | null;
}

const MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatBloomWindow(bloom: [number, number] | undefined | null): string {
  if (!bloom) return '';
  const [a, b] = bloom;
  const start = MONTH_ABBR[a] ?? '';
  const end = MONTH_ABBR[b] ?? '';
  if (!start || !end) return '';
  return start === end ? start : `${start}\u2013${end}`;
}

function connectivityLabel(band: 'isolated' | 'fragmented' | 'connected' | 'unknown'): string {
  switch (band) {
    case 'connected': return 'Connected';
    case 'fragmented': return 'Fragmented';
    case 'isolated': return 'Isolated';
    default: return 'Unknown';
  }
}

/**
 * Guild badges — short abbreviation + full label tooltip. Rendered next to
 * each plant in the recommended species list so the steward can see at a
 * glance which pollinator guilds the plant supports. Order in this object
 * is preserved when rendering for visual consistency.
 */
const GUILD_META: Record<PollinatorGuild, { abbr: string; label: string }> = {
  bees_generalist: { abbr: 'Be', label: 'Generalist bees' },
  bumblebees: { abbr: 'Bb', label: 'Bumblebees' },
  specialist_bees: { abbr: 'Sp', label: 'Specialist bees' },
  butterflies: { abbr: 'Bf', label: 'Butterflies' },
  moths_night_pollinators: { abbr: 'Mo', label: 'Moths / night pollinators' },
  hummingbirds: { abbr: 'Hu', label: 'Hummingbirds' },
};

const ECOLOGY_LAYER_SOURCES = new Set(['land_cover', 'wetlands_flood', 'soils', 'soil_regeneration', 'pollinator_opportunity']);

export default function EcologicalDashboard({ project, onSwitchToMap }: EcologicalDashboardProps) {
  const siteData = useSiteData(project.id);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [caveatsOpen, setCaveatsOpen] = useState<boolean>(false);
  const setPollinatorOpportunityVisible = useMapStore((s) => s.setPollinatorOpportunityVisible);

  /**
   * Empty-state CTA — switches the project view to the map and turns on
   * the pollinator-opportunity overlay, which triggers the layer fetch
   * (and materialization on the backend if it's not yet computed). This
   * is the only path to populating the curated species list + suitability
   * score, so the empty-state block surfaces it as the primary action
   * rather than as flat hint text.
   */
  const runPollinatorAnalysis = () => {
    setPollinatorOpportunityVisible(true);
    onSwitchToMap();
  };

  const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
  const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
  const wetlands = siteData ? getLayerSummary<WetlandsSummary>(siteData, 'wetlands_flood') : null;
  const soilRegen = siteData ? getLayerSummary<SoilRegenSummary>(siteData, 'soil_regeneration') : null;
  const pollinatorOpp = siteData ? getLayerSummary<PollinatorOppSummary>(siteData, 'pollinator_opportunity') : null;

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

  // Pollinator habitat + ecoregion (P2). Read-side heuristic; not part of
  // scoring. When `pollinator_opportunity` hasn't been materialized yet,
  // `ecoregionId` + `corridorReadiness` are undefined and the result falls
  // back to habitat-class categories with connectivityBand='unknown'.
  const pollinatorHabitat = useMemo(() => {
    // Local LandCover/Wetlands interfaces in this file are a loose superset
    // of the @ogden/shared ones; cast through `unknown` to cross the
    // declaration boundary without weakening the shared types.
    return computePollinatorHabitat({
      landCover: (landCover ?? null) as unknown as Parameters<typeof computePollinatorHabitat>[0]['landCover'],
      wetlands: (wetlands ?? null) as unknown as Parameters<typeof computePollinatorHabitat>[0]['wetlands'],
      ecoregionId: (pollinatorOpp?.ecoregionId as EcoregionId | null | undefined) ?? null,
      corridorReadiness: pollinatorOpp?.corridorReadiness ?? null,
    });
  }, [landCover, wetlands, pollinatorOpp]);

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
        {/* Timeline + manual samples + zone-ecology tags are project-scoped,
            not site-data-scoped — surface them during env-data load so users
            can log observations without waiting on third-party API
            roundtrips. */}
        <ZoneEcologyRollup projectId={project.id} />
        <EcologicalProtectionCard projectId={project.id} />
        <ZoneSeasonalityRollup projectId={project.id} />
        <CarbonByLandUseCard projectId={project.id} />
        <SoilSamplesCard project={project} />
        <RegenerationTimelineCard project={project} />
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

      {/* §18 AI design synthesis — deterministic constraint/opportunity rollup */}
      <AiSiteSynthesisCard project={project} />

      {/* §18 AI site summary — narrative descriptor with attribution + confidence */}
      <AiSiteSummaryCard project={project} />

      {/* §17 Assumption & open-question detector — pairs with the synthesis card */}
      <AssumptionGapDetectorCard project={project} />

      {/* §17 Needs-site-visit flags — what to walk for next time */}
      <NeedsSiteVisitCard project={project} />

      {/* §17 Alternative layout rationale — proposed swaps + dashboard delta */}
      <AlternativeLayoutRationaleCard project={project} />

      {/* §17 AI feature placement suggestions — site-derived "where to put what" */}
      <FeaturePlacementSuggestionsCard project={project} />

      {/* §17 Design brief / landowner pitch — exportable one-page summary */}
      <DesignBriefPitchCard project={project} />

      {/* §17 Ecological risk warnings — concrete failure modes from layers + entities */}
      <EcologicalRiskWarningsCard project={project} />

      {/* §17 Educational explainer — what-is + pre-place checklists per entity type */}
      <EducationalExplainerCard project={project} />

      {/* §19 Why-here / problem / if-omitted panels per placed entity type */}
      <WhyHerePanelsCard project={project} />

      {/* §17 AI output rating + feedback — local thumbs/tags/notes per surface */}
      <AiOutputFeedbackCard project={project} />

      {/* §17 Phased build / water / grazing / orchard strategies */}
      <PhasedBuildStrategyCard project={project} />

      {/* §11 Nutrient cycling balance — N demand vs. supply rollup */}
      <NutrientBalanceCard projectId={project.id} />

      {/* §22 Mission-weighted impact — multi-axis ROI rollup */}
      <MissionImpactRollupCard project={project} />

      {/* §22 Mission tradeoff explorer — interactive weight-tuning what-if */}
      <MissionTradeoffExplorerCard project={project} />

      {/* §11 Mobile-tractor zones — chicken / rabbit / pig candidates */}
      <MobileTractorZonesCard projectId={project.id} />

      {/* §20 Meeting presentation deck — flattens project into a 7-slide briefing */}
      <PresentationDeckCard project={project} />

      {/* Soil Health */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>SOIL HEALTH</h2>

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
            <h3 className={css.subSectionLabel}>PHYSICAL PROPERTIES</h3>
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
            <h3 className={css.subSectionLabel}>PARTICLE SIZE</h3>
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
            <h3 className={css.subSectionLabel}>CHEMICAL PROPERTIES</h3>
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
            <h3 className={css.subSectionLabel}>DERIVED INDICES</h3>
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

        {/* User-entered soil observations (projects.metadata.soilNotes) —
            surfaces what the owner/designer saw on-site, alongside the
            SSURGO / SoilGrids adapter output above. */}
        {project.metadata?.soilNotes && (() => {
          const sn = project.metadata!.soilNotes!;
          const hasAny = sn.ph || sn.organicMatter || sn.compaction || sn.biologicalActivity;
          if (!hasAny) return null;
          return (
            <>
              <h3 className={css.subSectionLabel}>FIELD OBSERVATIONS</h3>
              <div className={css.soilDataRow}>
                {sn.ph && <SoilMetric label="OBSERVED pH" value={sn.ph} />}
                {sn.organicMatter && <SoilMetric label="OBSERVED OM" value={sn.organicMatter} />}
              </div>
              {(sn.compaction || sn.biologicalActivity) && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sn.compaction && (
                    <div style={{ fontSize: 12, color: 'rgba(180,165,140,0.85)' }}>
                      <strong style={{ color: 'rgba(180,165,140,0.6)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>Compaction:</strong> {sn.compaction}
                    </div>
                  )}
                  {sn.biologicalActivity && (
                    <div style={{ fontSize: 12, color: 'rgba(180,165,140,0.85)' }}>
                      <strong style={{ color: 'rgba(180,165,140,0.6)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>Biology:</strong> {sn.biologicalActivity}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

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
        <h2 className={css.sectionLabel}>VEGETATION COMMUNITIES</h2>
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
        <h2 className={css.sectionLabel}>WETLAND & RIPARIAN</h2>
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

      {/* Native Planting & Pollinator Habitat — P2 ecoregion surfacing.
          Reads pollinator_opportunity for the CEC Level III ecoregion +
          patch-graph connectivity band, and renders a curated plant list
          when the ecoregion resolves. Falls back to habitat-class
          categories otherwise. */}
      <div className={`${css.section} ${css.pollinatorSection}`}>
        <h2 className={`${css.sectionLabel} ${css.pollinatorSectionLabel}`}>
          NATIVE PLANTING & POLLINATOR HABITAT
        </h2>

        {/* Ecoregion + connectivity strip */}
        <div className={css.pollinatorEcoregionStrip}>
          {pollinatorHabitat.ecoregion ? (
            <div className={css.pollinatorEcoregionBlock}>
              <span className={css.pollinatorEcoregionLabel}>CEC ECOREGION</span>
              <span className={css.pollinatorEcoregionName}>{pollinatorHabitat.ecoregion.name}</span>
              <span className={css.pollinatorEcoregionId}>{`Level III \u00B7 ${pollinatorHabitat.ecoregion.id}`}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={runPollinatorAnalysis}
              className={`${css.pollinatorEcoregionBlock} ${css.pollinatorRunCta}`}
              aria-label="Run pollinator analysis to resolve ecoregion and populate species recommendations"
            >
              <span className={css.pollinatorEcoregionLabel}>CEC ECOREGION</span>
              <span className={css.pollinatorRunCtaLabel}>
                Run pollinator analysis
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className={css.pollinatorEcoregionId}>
                Resolves species + suitability
              </span>
            </button>
          )}
          <div className={css.pollinatorEcoregionBlock}>
            <span className={css.pollinatorEcoregionLabel}>HABITAT SUITABILITY</span>
            <span className={css.pollinatorEcoregionName}>
              {pollinatorHabitat.suitabilityScore}<span className={css.miniScoreOf}>/100</span>
            </span>
            <span className={css.pollinatorEcoregionId}>
              {pollinatorHabitat.suitabilityBand === 'high' ? 'High' : pollinatorHabitat.suitabilityBand === 'moderate' ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className={css.pollinatorEcoregionBlock}>
            <span className={css.pollinatorEcoregionLabel}>CORRIDOR CONNECTIVITY</span>
            <span className={css.pollinatorEcoregionName}>{connectivityLabel(pollinatorHabitat.connectivityBand)}</span>
            <span className={css.pollinatorEcoregionId}>
              {pollinatorOpp?.patchCount != null ? `${pollinatorOpp.patchCount} patches` : 'Patch-graph'}
            </span>
          </div>
        </div>

        {/* Recommended native species — curated ecoregion list when
            available, habitat-class fallback categories otherwise. */}
        {pollinatorHabitat.ecoregionPlants.length > 0 ? (
          <>
            <h3 className={css.subSectionLabel}>RECOMMENDED NATIVE SPECIES</h3>
            <ul className={css.pollinatorPlantsList}>
              {pollinatorHabitat.ecoregionPlants.map((plant) => {
                // Stable order: keys of GUILD_META, filtered to plant.guilds.
                const orderedGuilds = (Object.keys(GUILD_META) as PollinatorGuild[]).filter(
                  (g) => plant.guilds.includes(g),
                );
                return (
                  <li key={plant.scientific} className={css.pollinatorPlantItem}>
                    <div className={css.pollinatorPlantHead}>
                      <div>
                        <span className={css.pollinatorPlantCommon}>{plant.common}</span>
                        <span className={css.pollinatorPlantSci}>{plant.scientific}</span>
                      </div>
                      {orderedGuilds.length > 0 && (
                        <div
                          className={css.pollinatorGuildBadges}
                          aria-label={`Pollinator guilds: ${orderedGuilds.map((g) => GUILD_META[g].label).join(', ')}`}
                        >
                          {orderedGuilds.map((g) => (
                            <span
                              key={g}
                              className={css.pollinatorGuildBadge}
                              title={GUILD_META[g].label}
                            >
                              {GUILD_META[g].abbr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={css.pollinatorPlantMeta}>
                      {`${plant.habit}${formatBloomWindow(plant.bloom) ? ` \u00B7 ${formatBloomWindow(plant.bloom)}` : ''}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <h3 className={css.subSectionLabel}>HABITAT-CLASS CATEGORIES</h3>
            <ul className={css.pollinatorPlantsList}>
              {pollinatorHabitat.nativePlantCategories.map((cat, i) => (
                <li key={i} className={css.pollinatorPlantItem}>
                  <span className={css.pollinatorPlantCommon}>{cat}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Caveat drawer — first caveat is always visible inline; if there
            are more, "Why this matters" toggles the full ordered list. The
            shared package guarantees `caveats` is non-empty when at least
            one of land-cover/wetlands/ecoregion data is missing or coarse,
            so the drawer surfaces the honest scoping the heuristic ships
            with rather than burying it. */}
        {pollinatorHabitat.caveats.length > 0 && (
          <div className={css.pollinatorCaveats}>
            <p className={css.coverNote}>{pollinatorHabitat.caveats[0]}</p>
            {pollinatorHabitat.caveats.length > 1 && (
              <>
                <button
                  type="button"
                  className={css.pollinatorCaveatToggle}
                  onClick={() => setCaveatsOpen((v) => !v)}
                  aria-expanded={caveatsOpen}
                  aria-controls="pollinator-caveat-list"
                >
                  {caveatsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {caveatsOpen
                    ? 'Hide details'
                    : `Why this matters (${pollinatorHabitat.caveats.length - 1} more)`}
                </button>
                {caveatsOpen && (
                  <ul
                    id="pollinator-caveat-list"
                    className={css.pollinatorCaveatList}
                  >
                    {pollinatorHabitat.caveats.slice(1).map((c, i) => (
                      <li key={i} className={css.pollinatorCaveatItem}>{c}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Ecological Interventions — from Tier 3 soil_regeneration */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>ECOLOGICAL INTERVENTIONS</h2>
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

      {/* Zone ecological-condition rollup — §7 invasive pressure + succession
          stage aggregated by acreage across all zones. */}
      <ZoneEcologyRollup projectId={project.id} />

      {/* §17 Ecological & wildlife protection rules — heuristic checks
          against conservation / water_retention zones (footprint
          violations, riparian setback, invasive-pressure flags). */}
      <EcologicalProtectionCard projectId={project.id} />

      {/* §3 Protected areas + critical habitat posture — surfaces
          USFWS / state-park proximity and listed-species presence
          from infrastructure + critical_habitat layer summaries. */}
      <ProtectedAreasHabitatCard projectId={project.id} />

      {/* §3 Soil risk hotspots — derived dry / wet / erosion / compaction
          advisories per zone, using paddock stocking density, succession
          stage, and proximity to water utilities. Closes the partial-status
          §3 sun-trap-dry-wet-erosion-compaction manifest item (the sun-trap
          half is covered upstream by MicroclimateInsightsCard). */}
      <SoilRiskHotspotsCard projectId={project.id} />

      {/* §8 Seasonal / phased-use rollup: acres-by-season + per-month
          coverage strip from zone.seasonality tags. */}
      <ZoneSeasonalityRollup projectId={project.id} />

      {/* §7 Carbon-by-land-use: per-zone-category sequestration estimate
          driven by drawn zones + successionStage tags. Distinct from the
          modeled SOC card below — vegetation potential vs. soil pool. */}
      <CarbonByLandUseCard projectId={project.id} />

      {/* Manual soil samples — §7 lab results + in-field biological-activity
          readings, complements the modeled SSURGO / SoilGrids layers. */}
      <SoilSamplesCard project={project} />

      {/* Regeneration Timeline — §7 intervention log (migration 015 + shared schema). */}
      <RegenerationTimelineCard project={project} />

      {/* §4 Restoration priority — composite per-zone score + Y1/Y2/Y3+ phased sequence. */}
      <RestorationPriorityCard project={project} />

      {/* §16 Carrying capacity rollup — site-level "what can this land carry?"
          across livestock head-capacity, crop yield, and water budget. */}
      <CarryingCapacityCard project={project} />

      {/* Carbon Estimate */}
      {carbon && (
        <div className={css.section}>
          <h2 className={css.sectionLabel}>CARBON SEQUESTRATION ESTIMATE</h2>
          <div className={css.carbonGrid}>
            <CarbonMetric label="Current SOC" value={carbon.totalCurrentSOC_tC != null ? `${carbon.totalCurrentSOC_tC.toFixed(1)} tC` : null} />
            <CarbonMetric label="Potential SOC" value={carbon.totalPotentialSOC_tC != null ? `${carbon.totalPotentialSOC_tC.toFixed(1)} tC` : null} />
            <CarbonMetric label="Annual Sequestration" value={carbon.totalAnnualSeq_tCyr != null ? `${carbon.totalAnnualSeq_tCyr.toFixed(2)} tC/yr` : null} />
          </div>
        </div>
      )}

      {/* Ecological Opportunities — from rules engine */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>ECOLOGICAL OPPORTUNITIES</h2>
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
