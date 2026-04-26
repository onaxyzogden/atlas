/**
 * SiteIntelligencePanel — comprehensive site assessment.
 * Matches target design with "LIVE DATA" section,
 * Conservation Authority card, score circle, site summary,
 * and "What This Land Wants" block.
 *
 * All environmental data is sourced from the siteDataStore
 * and transformed via computeScores pure functions.
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, useSiteDataStore } from '../../store/siteDataStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';
import { SectionProfiler } from '../../lib/perfProfiler.js';

// Sprint BJ: module-level stable empty array so the fallback identity does
// not change between renders (previously `siteData?.layers ?? []` minted a
// new array every render, cascading through every useMemo keyed on layers).
const EMPTY_LAYERS: MockLayerResult[] = [];
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
import { matchCropsToSite, siteConditionsFromLayers, findAgroforestryCompanions, type CropMatch, type CompanionMatch } from '../../lib/cropMatching.js';
import { computeDesignIntelligence } from '../../lib/designIntelligence.js';
import { computeEIATriggers, estimateTypicalSetbacks } from '../../lib/regulatoryIntelligence.js';
import { computeGeothermalPotential, computeEnergyStorage } from '../../lib/energyIntelligence.js';
import { computeClimateProjections } from '../../lib/climateProjections.js';
import { computeEcosystemValuation, classifyWetlandFunction } from '../../lib/ecosystemValuation.js';
import { computeAhpWeights, DEFAULT_ATLAS_AHP_MATRIX } from '../../lib/fuzzyMCDM.js';
import { useSiteIntelligenceMetrics } from '../../hooks/useSiteIntelligenceMetrics.js';
import { CATEGORY_LABELS } from '../../data/ecocropSubset.js';
import { Spinner } from '../ui/Spinner.js';
import { DashboardSectionSkeleton } from '../ui/DashboardSectionSkeleton.js';
import { useOfflineGate } from '../../hooks/useOfflineGate.js';
import { confidence, semantic } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';
import s from './SiteIntelligencePanel.module.css';
// Sprint BK: shared memoized leaves + helpers relocated to sections/
import { DelayedTooltip } from '../ui/DelayedTooltip.js';
import { AILabel, RefreshIcon, ConfBadge, ScoreCircle } from './sections/_shared.js';
import {
  severityColor,
  formatComponentName,
  capConf,
  getScoreColor,
  getHydroColor,
  getSoilPhColor,
  getCompactionColor,
} from './sections/_helpers.js';
import { ScoresAndFlagsSection } from './sections/ScoresAndFlagsSection.js';
import { SynthesisSummarySection } from './sections/SynthesisSummarySection.js';
import { StickyMiniScore } from './StickyMiniScore.js';
import { CropMatchingSection } from './sections/CropMatchingSection.js';
import { RegulatoryHeritageSection } from './sections/RegulatoryHeritageSection.js';
import { HydrologyIntelligenceSection } from './sections/HydrologyIntelligenceSection.js';
import { GroundwaterSection } from './sections/GroundwaterSection.js';
import { WaterQualitySection } from './sections/WaterQualitySection.js';
import { SoilIntelligenceSection } from './sections/SoilIntelligenceSection.js';
import { DesignIntelligenceSection } from './sections/DesignIntelligenceSection.js';
import { InfrastructureAccessSection } from './sections/InfrastructureAccessSection.js';
import { EnvironmentalRiskSection } from './sections/EnvironmentalRiskSection.js';
import { EcosystemServicesSection } from './sections/EcosystemServicesSection.js';
import { ClimateProjectionsSection } from './sections/ClimateProjectionsSection.js';
import { HydrologyExtensionsSection } from './sections/HydrologyExtensionsSection.js';
import { EnergyIntelligenceSection } from './sections/EnergyIntelligenceSection.js';
import { GeologicalBedrockSection } from './sections/GeologicalBedrockSection.js';
import { SiteSummaryNarrativeSection } from './sections/SiteSummaryNarrativeSection.js';
import { AssessmentScoresSection } from './sections/AssessmentScoresSection.js';
import { FuzzyFaoSection } from './sections/FuzzyFaoSection.js';
import { AhpWeightsSection } from './sections/AhpWeightsSection.js';
import { RegionalSpeciesSection } from './sections/RegionalSpeciesSection.js';
import { CanopyStructureSection } from './sections/CanopyStructureSection.js';
import { LandUseHistorySection } from './sections/LandUseHistorySection.js';
import { OpportunitiesSection } from './sections/OpportunitiesSection.js';
import { ConstraintsSection } from './sections/ConstraintsSection.js';
import { DataLayersSection } from './sections/DataLayersSection.js';
import { SiteContextSection } from './sections/SiteContextSection.js';
import { CommunitySection } from './sections/CommunitySection.js';
import { GaezSection } from './sections/GaezSection.js';

interface SiteIntelligencePanelProps {
  project: LocalProject;
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
  { type: 'terrain_analysis', label: 'Terrain Analysis', dependsOn: ['elevation'] as const },
  { type: 'watershed_derived', label: 'Watershed Derived', dependsOn: ['watershed', 'wetlands_flood'] as const },
  { type: 'microclimate', label: 'Microclimate', dependsOn: ['climate'] as const },
  { type: 'soil_regeneration', label: 'Soil Regeneration', dependsOn: ['soils'] as const },
] as const;

function SiteIntelligencePanelImpl({ project }: SiteIntelligencePanelProps) {
  const { isOffline } = useOfflineGate();
  const [liveDataOpen, setLiveDataOpen] = useState(true);
  const [hydroOpen, setHydroOpen] = useState(true);
  const [groundwaterOpen, setGroundwaterOpen] = useState(true);
  const [wqOpen, setWqOpen] = useState(true);
  const [soilOpen, setSoilOpen] = useState(true);
  const [infraOpen, setInfraOpen] = useState(true);
  const [envRiskOpen, setEnvRiskOpen] = useState(true);
  const [siteContextOpen, setSiteContextOpen] = useState(true);
  const [demogOpen, setDemogOpen] = useState(true);
  const [diOpen, setDiOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Phase B: ref on the main suitability card — IntersectionObserver in
  // StickyMiniScore watches it to decide when to slide the mini bar in.
  const suitabilityRef = useRef<HTMLDivElement | null>(null);
  const [expandedScore, setExpandedScore] = useState<string | null>(null);
  const [showAllOpps, setShowAllOpps] = useState(false);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const siteData = useSiteData(project.id);
  const refreshProject = useSiteDataStore((st) => st.refreshProject);

  // AI enrichment data
  const enrichment = siteData?.enrichment;

  const consAuth = useMemo(() => getConservationAuth(project), [project]);

  // Derive all computed values from layer data
  const layers = siteData?.layers ?? EMPTY_LAYERS;

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

  // Tier 3 derived analysis status.
  // Scholar #UX (Phase 2): Waiting is a non-response that breaks the
  // interactive feedback loop. Compute a `blockedBy` hint from missing
  // Tier 1 dependencies so the user sees *why* the analysis is paused
  // instead of a flat "— Waiting" dead-end.
  const tier3Status = useMemo(() => {
    return TIER3_TYPES.map(({ type, label, dependsOn }) => {
      const layer = layers.find((l) => l.layerType === type);
      const status = layer?.fetchStatus;
      const normalized = status === 'complete' ? 'complete' as const
        : status === 'pending' ? 'computing' as const
        : 'waiting' as const;
      // Only compute blockedBy when truly waiting — no point telling
      // the user why something is "pending" when it's already working.
      let blockedBy: string | undefined;
      if (normalized === 'waiting') {
        const missing = dependsOn
          .filter((dep) => {
            const depLayer = layers.find((l) => l.layerType === dep);
            return depLayer?.fetchStatus !== 'complete';
          })
          .map((dep) => TIER1_LABELS[dep] ?? dep);
        if (missing.length > 0) blockedBy = missing.join(' + ');
      }
      return { label, status: normalized, blockedBy };
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
    () => computeAssessmentScores(layers, project.acreage ?? null, project.country),
    [layers, project.acreage, project.country],
  );

  const overallScore = useMemo(
    () => computeOverallScore(assessmentScores),
    [assessmentScores],
  );

  // Overall confidence = lowest confidence across all scores
  const overallConfidence = useMemo((): 'high' | 'medium' | 'low' => {
    if (assessmentScores.length === 0) return 'low';
    const levels = assessmentScores.map((sc) => sc.confidence);
    if (levels.includes('low')) return 'low';
    if (levels.includes('medium')) return 'medium';
    return 'high';
  }, [assessmentScores]);

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

  // Sprint BQ: 37 layer-metric useMemos consolidated into one hook.
  // Destructured here so the remaining panel code + section JSX continues to
  // reference each metric by its original identifier. See
  // hooks/useSiteIntelligenceMetrics.ts for the metric bodies.
  const {
    hydroMetrics, windEnergy, infraMetrics, solarPV, soilMetrics,
    groundwaterMetrics, waterQualityMetrics, superfundMetrics,
    criticalHabitatMetrics, biodiversityMetrics, soilGridsMetrics,
    ustLustMetrics, brownfieldMetrics, landfillMetrics, mineHazardMetrics,
    fudsMetrics, easementMetrics, heritageMetrics, alrMetrics,
    aquiferMetrics, waterStressMetrics, seasonalFloodingMetrics,
    stormMetrics, cropValidationMetrics, airQualityMetrics, earthquakeMetrics,
    demographicsMetrics, proximityMetrics, fuzzyFao, speciesIntelligence,
    canopyHeight, landUseHistoryMetrics, mineralRightsMetrics,
    waterRightsMetrics, agUseValueMetrics, ecoGiftsMetrics, gaezMetrics,
  } = useSiteIntelligenceMetrics(layers, project);

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
    // Sprint G: inject irrigationDeficitMm from hydro metrics
    if (hydroMetrics) {
      site.irrigationDeficitMm = hydroMetrics.irrigationDeficitMm;
    }
    return matchCropsToSite(site, {
      categories: cropCategoryFilter ? [cropCategoryFilter] : undefined,
      minSuitability: 30,
      maxResults: 100,
    });
  }, [layers, cropCategoryFilter, hydroMetrics]);

  // Sprint J: Agroforestry companion cache — compute per expanded crop
  const companionCache = useMemo((): Map<string, CompanionMatch[]> => {
    const map = new Map<string, CompanionMatch[]>();
    if (!expandedCrop) return map;
    const match = cropMatches.find((m) => m.crop.id === expandedCrop);
    if (!match) return map;
    const climateLayer = layers.find((l) => l.layerType === 'climate');
    const soilLayer = layers.find((l) => l.layerType === 'soils');
    const site = siteConditionsFromLayers(
      (climateLayer?.summary as Record<string, unknown>) ?? null,
      (soilLayer?.summary as Record<string, unknown>) ?? null,
    );
    map.set(match.crop.id, findAgroforestryCompanions(match.crop, site, 3));
    return map;
  }, [expandedCrop, cropMatches, layers]);

























  // Design Intelligence — passive solar + windbreak + water harvesting + septic + shadow + RWH + pond volume + fire risk
  const designIntelligence = useMemo(() => {
    const elevLayer = layers.find((l) => l.layerType === 'elevation');
    const climLayer = layers.find((l) => l.layerType === 'climate');
    const wdLayer = layers.find((l) => l.layerType === 'watershed_derived');
    const soilsLayer = layers.find((l) => l.layerType === 'soils');
    const gwLayer = layers.find((l) => l.layerType === 'groundwater');
    const lcLayer = layers.find((l) => l.layerType === 'land_cover');
    const wfLayer = layers.find((l) => l.layerType === 'wetlands_flood');
    if (!elevLayer && !climLayer && !wdLayer && !soilsLayer && !gwLayer && !lcLayer && !wfLayer) return null;
    const es = elevLayer?.summary as Record<string, unknown> | undefined;
    const cs = (climLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const wds = (wdLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const ss = (soilsLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const gws = (gwLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const lcs = (lcLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const wfs = (wfLayer?.summary as Record<string, unknown> | undefined) ?? null;
    const aspect = typeof es?.predominant_aspect === 'string' ? es.predominant_aspect : null;
    const slope = typeof es?.mean_slope_deg === 'number' ? es.mean_slope_deg : 0;
    const windRose = cs?.['_wind_rose'] as
      { frequencies_16: number[]; speeds_avg_ms: number[]; calm_pct: number } | undefined ?? null;
    // Use project centroid lat — compute from parcel boundary if available
    let lat: number | null = null;
    try {
      if (project.parcelBoundaryGeojson) {
        const c = turf.centroid(project.parcelBoundaryGeojson);
        lat = c.geometry.coordinates[1] ?? null;
      }
    } catch { /* boundary invalid */ }
    if (!aspect && !windRose && !wds && !ss && !gws && !cs && !lcs && !wfs && lat === null) return null;
    return computeDesignIntelligence(aspect, lat, slope, windRose, wds, ss, gws, cs, lcs, project.country ?? 'US', wfs);
  }, [layers, project.parcelBoundaryGeojson, project.country]);

  // Sprint BD: Cat 9 — Geothermal + Energy Storage intelligence
  const energyIntelligence = useMemo(() => {
    const climLayer = layers.find((l) => l.layerType === 'climate');
    const soilsLayer = layers.find((l) => l.layerType === 'soils');
    const gwLayer = layers.find((l) => l.layerType === 'groundwater');
    if (!climLayer && !soilsLayer) return null;
    const cs = climLayer?.summary as Record<string, unknown> | undefined;
    const ss = soilsLayer?.summary as Record<string, unknown> | undefined;
    const gws = gwLayer?.summary as Record<string, unknown> | undefined;
    const meanAnnualTempC = typeof cs?.annual_temp_mean_c === 'number' ? cs.annual_temp_mean_c : null;
    const texture = typeof ss?.texture_class === 'string' ? ss.texture_class : null;
    const bedrock = typeof ss?.depth_to_bedrock_m === 'number' ? ss.depth_to_bedrock_m : null;
    const waterTable = typeof gws?.groundwater_depth_m === 'number' ? gws.groundwater_depth_m : null;
    const drainage = typeof ss?.drainage_class === 'string' ? ss.drainage_class : null;
    const solar = typeof cs?.solar_radiation_kwh_m2_day === 'number' ? cs.solar_radiation_kwh_m2_day : null;
    const geothermal = (meanAnnualTempC !== null || texture !== null)
      ? computeGeothermalPotential({
          meanAnnualTempC,
          soilTextureClass: texture,
          depthToBedrockM: bedrock,
          waterTableDepthM: waterTable,
          drainageClass: drainage,
        })
      : null;
    const storage = solar !== null
      ? computeEnergyStorage({ solarRadiationKwhM2Day: solar })
      : null;
    if (!geothermal && !storage) return null;
    return { geothermal, storage };
  }, [layers]);

  // §3 geological-bedrock-notes — substrate / bedrock depth presentation inputs
  const geologicalBedrock = useMemo(() => {
    const soilsLayer = layers.find((l) => l.layerType === 'soils');
    const gwLayer = layers.find((l) => l.layerType === 'groundwater');
    const ss = soilsLayer?.summary as Record<string, unknown> | undefined;
    const gws = gwLayer?.summary as Record<string, unknown> | undefined;
    const bedrockDepthM = typeof ss?.depth_to_bedrock_m === 'number' ? ss.depth_to_bedrock_m : null;
    if (bedrockDepthM == null) return null;
    return {
      bedrockDepthM,
      textureClass: typeof ss?.texture_class === 'string' ? ss.texture_class : null,
      drainageClass: typeof ss?.drainage_class === 'string' ? ss.drainage_class : null,
      groundwaterDepthM: typeof gws?.groundwater_depth_m === 'number' ? gws.groundwater_depth_m : null,
    };
  }, [layers]);

  // Sprint BE: Cat 5 — Climate projections (IPCC AR6 regional deltas)
  const climateProjections = useMemo(() => {
    const climLayer = layers.find((l) => l.layerType === 'climate');
    if (!climLayer) return null;
    const cs = climLayer.summary as Record<string, unknown> | undefined;
    const tempC = typeof cs?.annual_temp_mean_c === 'number' ? cs.annual_temp_mean_c : null;
    const precipMm = typeof cs?.annual_precip_mm === 'number' ? cs.annual_precip_mm : null;
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      if (project.parcelBoundaryGeojson) {
        const c = turf.centroid(project.parcelBoundaryGeojson);
        lng = c.geometry.coordinates[0] ?? null;
        lat = c.geometry.coordinates[1] ?? null;
      }
    } catch { /* */ }
    if (lat == null || lng == null) return null;
    if (tempC == null && precipMm == null) return null;
    return computeClimateProjections({ lat, lng, annualTempC: tempC, annualPrecipMm: precipMm });
  }, [layers, project.parcelBoundaryGeojson]);

  // Sprint BE: Cat 7 — Ecosystem services valuation + wetland function
  const ecosystemIntelligence = useMemo(() => {
    const lcLayer = layers.find((l) => l.layerType === 'land_cover');
    const wfLayer = layers.find((l) => l.layerType === 'wetlands_flood');
    const soilsLayer = layers.find((l) => l.layerType === 'soils');
    const cvLayer = layers.find((l) => l.layerType === 'crop_validation');
    const wsLayer = layers.find((l) => l.layerType === 'watershed');
    if (!lcLayer && !wfLayer && !soilsLayer) return null;
    const lcs = lcLayer?.summary as Record<string, unknown> | undefined;
    const wfs = wfLayer?.summary as Record<string, unknown> | undefined;
    const ss = soilsLayer?.summary as Record<string, unknown> | undefined;
    const cvs = cvLayer?.summary as Record<string, unknown> | undefined;
    const wss = wsLayer?.summary as Record<string, unknown> | undefined;

    const canopy = typeof lcs?.tree_canopy_pct === 'number' ? lcs.tree_canopy_pct : null;
    const wetland = typeof wfs?.wetland_pct === 'number' ? wfs.wetland_pct : null;
    const riparian = typeof wfs?.riparian_buffer_m === 'number' ? wfs.riparian_buffer_m : null;
    const om = typeof ss?.organic_matter_pct === 'number' ? ss.organic_matter_pct : null;
    const drainage = typeof ss?.drainage_class === 'string' ? ss.drainage_class : null;
    const isCropland = cvs?.is_cropland === true;
    const streamM = typeof wss?.nearest_stream_m === 'number' ? wss.nearest_stream_m : null;

    // Inline recompute of carbon seq rate (matches computeScores.ts Sprint R formula)
    const cCanopy = canopy ?? 0;
    const cWetland = wetland ?? 0;
    const cOm = om ?? 0;
    const forestSeq = (cCanopy / 100) * 4.5;
    const wetSeq = (cWetland / 100) * 6.0;
    const soilSeq = cOm > 3 ? 1.5 : cOm > 2 ? 0.8 : cOm > 1 ? 0.3 : 0;
    const cropPenalty = isCropland ? -0.5 : 0;
    const carbonSeq = Math.round(Math.max(0, forestSeq + wetSeq + soilSeq + cropPenalty) * 100) / 100;

    let acreage: number | null = null;
    try {
      if (project.parcelBoundaryGeojson) {
        acreage = turf.area(project.parcelBoundaryGeojson) / 4046.86;
      }
    } catch { /* */ }

    const valuation = computeEcosystemValuation({
      treeCanopyPct: canopy,
      wetlandPct: wetland,
      riparianBufferM: riparian,
      organicMatterPct: om,
      isCropland,
      carbonSeqTonsCO2HaYr: carbonSeq,
      propertyAcres: acreage,
    });
    const wetlandFunction = classifyWetlandFunction({
      wetlandPct: wetland,
      nearestStreamM: streamM,
      drainageClass: drainage,
      treeCanopyPct: canopy,
      organicMatterPct: om,
      riparianBufferM: riparian,
    });
    return { valuation, wetlandFunction };
  }, [layers, project.parcelBoundaryGeojson]);

  // Sprint BC: EIA / permit trigger flags (pure computation on layer summaries)
  const eiaTriggers = useMemo(() => {
    const wfLayer = layers.find((l) => l.layerType === 'wetlands_flood');
    const lcLayer = layers.find((l) => l.layerType === 'land_cover');
    const elevLayer = layers.find((l) => l.layerType === 'elevation');
    const chLayer = layers.find((l) => l.layerType === 'critical_habitat');
    const infraLayer = layers.find((l) => l.layerType === 'infrastructure');
    const wfs = wfLayer?.summary as Record<string, unknown> | undefined;
    const lcs = lcLayer?.summary as Record<string, unknown> | undefined;
    const es = elevLayer?.summary as Record<string, unknown> | undefined;
    const chs = chLayer?.summary as Record<string, unknown> | undefined;
    const infras = infraLayer?.summary as Record<string, unknown> | undefined;
    let areaHa: number | null = null;
    try {
      if (project.parcelBoundaryGeojson) {
        areaHa = turf.area(project.parcelBoundaryGeojson) / 10000;
      }
    } catch { /* */ }
    return computeEIATriggers({
      areaHa,
      wetlandsPresent: typeof wfs?.wetland_area_pct === 'number' ? wfs.wetland_area_pct > 0 : null,
      regulatedAreaPct: typeof wfs?.regulated_area_pct === 'number' ? wfs.regulated_area_pct : null,
      floodZone: typeof wfs?.flood_zone === 'string' ? wfs.flood_zone : null,
      criticalHabitatPresent: chs?.on_site === true,
      slopeDeg: typeof es?.mean_slope_deg === 'number' ? es.mean_slope_deg : null,
      landCoverPrimaryClass: typeof lcs?.primary_class === 'string' ? lcs.primary_class : null,
      protectedAreasNearbyKm: typeof infras?.protected_area_nearest_km === 'number' ? infras.protected_area_nearest_km : null,
      heritageSitePresent: heritageMetrics?.present === true,
      conservationEasementPresent: easementMetrics?.present === true,
    });
  }, [layers, project.parcelBoundaryGeojson, heritageMetrics, easementMetrics]);


  // Sprint BF: Cat 1b — AHP default Atlas weights (deterministic, runs once)
  const ahpResult = useMemo(() => computeAhpWeights(DEFAULT_ATLAS_AHP_MATRIX), []);




  // Sprint BF: Cat 11a — Typical setbacks by broad zoning class
  const typicalSetbacks = useMemo(() => {
    const zoningL = layers.find((l) => l.layerType === 'zoning');
    const wfL = layers.find((l) => l.layerType === 'wetlands_flood');
    const wsL = layers.find((l) => l.layerType === 'watershed');
    const zs = zoningL?.summary as Record<string, unknown> | undefined;
    const wfs = wfL?.summary as Record<string, unknown> | undefined;
    const wss = wsL?.summary as Record<string, unknown> | undefined;
    if (!zs && !wfs && !wss) return null;
    return estimateTypicalSetbacks({
      zoningClass: typeof zs?.['zone_code'] === 'string' ? zs['zone_code'] as string
        : typeof zs?.['zoning_class'] === 'string' ? zs['zoning_class'] as string
        : typeof zs?.['zone'] === 'string' ? zs['zone'] as string : null,
      ruralClass: typeof zs?.['rural_class'] === 'string' ? zs['rural_class'] as string : null,
      nearestStreamM: typeof wss?.['nearest_stream_m'] === 'number' ? wss['nearest_stream_m'] as number : null,
      wetlandsPresent: typeof wfs?.['wetland_pct'] === 'number' ? (wfs['wetland_pct'] as number) > 0 : false,
      country: project.country ?? 'US',
    });
  }, [layers, project.country]);






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

  const onToggleLiveData = useCallback(() => setLiveDataOpen((v) => !v), []);
  const onToggleExpandedCrop = useCallback((id: string) => {
    setExpandedCrop((prev) => (prev === id ? null : id));
  }, []);
  const onToggleShowAllCrops = useCallback(() => setShowAllCrops((v) => !v), []);
  const onToggleHydro = useCallback(() => setHydroOpen((v) => !v), []);
  const onToggleGroundwater = useCallback(() => setGroundwaterOpen((v) => !v), []);
  const onToggleWq = useCallback(() => setWqOpen((v) => !v), []);
  const onToggleSoil = useCallback(() => setSoilOpen((v) => !v), []);
  const onToggleDi = useCallback(() => setDiOpen((v) => !v), []);
  const onToggleInfra = useCallback(() => setInfraOpen((v) => !v), []);
  const onToggleEnvRisk = useCallback(() => setEnvRiskOpen((v) => !v), []);
  const onToggleExpandedScore = useCallback((label: string) => {
    setExpandedScore((prev) => (prev === label ? null : label));
  }, []);
  const onToggleShowAllOpps = useCallback(() => setShowAllOpps((v) => !v), []);
  const onToggleShowAllRisks = useCallback(() => setShowAllRisks((v) => !v), []);
  const onToggleSiteContext = useCallback(() => setSiteContextOpen((v) => !v), []);
  const onToggleCommunity = useCallback(() => setDemogOpen((v) => !v), []);

  // ── First load — show section skeleton when no data exists yet ───────
  // Skeleton over spinner: a card-shaped shimmer sets expectations about the
  // layout that is about to appear, so the transition to real data doesn't
  // feel like a reflow. Reduced-motion users fall back to a static block via
  // the skeleton's own CSS.
  if (siteData?.status === 'loading' && layers.length === 0) {
    return (
      <div className={p.container}>
        <div className={s.headerRow}>
          <h2 className={p.title} style={{ marginBottom: 0 }}>Site Intelligence</h2>
        </div>
        <DashboardSectionSkeleton
          cards={3}
          rowsPerCard={4}
          label="Fetching environmental data"
        />
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
      {/* Phase B: sticky mini-score — first child so `position: sticky;
          top: 0` binds to the scroll root's top edge. Hidden by default;
          slides in when the main suitability card leaves the viewport. */}
      <StickyMiniScore
        score={overallScore}
        criticalCount={blockingFlags.length}
        targetRef={suitabilityRef}
      />
      {/* Header */}
      <div className={s.headerRow}>
        <h2 className={p.title} style={{ marginBottom: 0 }}>Site Intelligence</h2>
        <DelayedTooltip label="Layer refresh requires internet" disabled={!isOffline}>
        <button
          onClick={handleRefresh}
          className={`${s.refreshBtn} ${isRefreshing ? s.refreshBtnSpinning : ''}`}
          aria-label="Refresh site data"
          disabled={isOffline || isRefreshing}
        >
          <RefreshIcon spinning={isRefreshing} />
          {isRefreshing && <span className={s.refreshHint}>Refreshing...</span>}
        </button>
        </DelayedTooltip>
      </div>

      {/* ── Refresh banner ───────────────────────────────────────── */}
      {isRefreshing && (
        <div className={s.refreshBanner}>
          <Spinner size="sm" color={semantic.sidebarActive} />
          Refreshing environmental data...
        </div>
      )}

      <ScoresAndFlagsSection
        blockingFlags={blockingFlags}
        overallScore={overallScore}
        overallConfidence={overallConfidence}
        layerCompleteCount={layerCompleteCount}
        layerCompleteness={layerCompleteness}
        tier3Status={tier3Status}
        liveDataOpen={liveDataOpen}
        onToggleLiveData={onToggleLiveData}
        isLive={siteData.isLive}
        liveData={liveData}
        consAuth={consAuth}
        lastFetched={lastFetched}
        country={project.country}
        suitabilityRef={suitabilityRef}
      />

      {/* ── §4 Risk / Opportunity / Limitation synthesis ──────────────
          Compact three-pillar TL;DR wedged between the bento hero and
          the detailed intelligence stack. Derives limitations presentationally
          (no shared rule engine for that flag type yet). */}
      <SynthesisSummarySection
        topConstraints={topConstraints}
        topOpportunities={topOpportunities}
        blockingFlagsCount={blockingFlags.length}
        incompleteLayerCount={7 - layerCompleteCount}
        acreage={project.acreage ?? null}
      />

      {/* ── Hydrology Intelligence (Sprint BK: extracted) ─────────── */}
      <HydrologyIntelligenceSection
        hydroMetrics={hydroMetrics}
        windEnergy={windEnergy}
        solarPV={solarPV}
        hydroOpen={hydroOpen}
        onToggleHydro={onToggleHydro}
      />

      <GroundwaterSection
        groundwaterMetrics={groundwaterMetrics}
        groundwaterOpen={groundwaterOpen}
        onToggleGroundwater={onToggleGroundwater}
      />

      <WaterQualitySection
        waterQualityMetrics={waterQualityMetrics}
        wqOpen={wqOpen}
        onToggleWq={onToggleWq}
      />

      <SoilIntelligenceSection
        soilMetrics={soilMetrics}
        soilOpen={soilOpen}
        onToggleSoil={onToggleSoil}
      />


      <InfrastructureAccessSection
        infraMetrics={infraMetrics}
        proximityMetrics={proximityMetrics}
        infraOpen={infraOpen}
        onToggleInfra={onToggleInfra}
      />

      <EnvironmentalRiskSection
        airQualityMetrics={airQualityMetrics}
        earthquakeMetrics={earthquakeMetrics}
        superfundMetrics={superfundMetrics}
        ustLustMetrics={ustLustMetrics}
        brownfieldMetrics={brownfieldMetrics}
        landfillMetrics={landfillMetrics}
        mineHazardMetrics={mineHazardMetrics}
        fudsMetrics={fudsMetrics}
        envRiskOpen={envRiskOpen}
        onToggleEnvRisk={onToggleEnvRisk}
      />

      {/* ── Regulatory & Heritage (Sprint BK: extracted) ─────────────── */}
      <RegulatoryHeritageSection
        easementMetrics={easementMetrics}
        heritageMetrics={heritageMetrics}
        alrMetrics={alrMetrics}
        eiaTriggers={eiaTriggers}
        typicalSetbacks={typicalSetbacks}
        mineralRightsMetrics={mineralRightsMetrics}
        waterRightsMetrics={waterRightsMetrics}
        agUseValueMetrics={agUseValueMetrics}
        ecoGiftsMetrics={ecoGiftsMetrics}
      />

      <HydrologyExtensionsSection
        aquiferMetrics={aquiferMetrics}
        waterStressMetrics={waterStressMetrics}
        seasonalFloodingMetrics={seasonalFloodingMetrics}
      />

      <EnergyIntelligenceSection energyIntelligence={energyIntelligence} />

      {geologicalBedrock && (
        <GeologicalBedrockSection
          bedrockDepthM={geologicalBedrock.bedrockDepthM}
          textureClass={geologicalBedrock.textureClass}
          drainageClass={geologicalBedrock.drainageClass}
          groundwaterDepthM={geologicalBedrock.groundwaterDepthM}
        />
      )}

      <ClimateProjectionsSection climateProjections={climateProjections} />

      <EcosystemServicesSection ecosystemIntelligence={ecosystemIntelligence} />

      <FuzzyFaoSection fuzzyFao={fuzzyFao} />

      <AhpWeightsSection ahpResult={ahpResult} />

      <RegionalSpeciesSection speciesIntelligence={speciesIntelligence} />

      <CanopyStructureSection canopyHeight={canopyHeight} />

      <LandUseHistorySection landUseHistoryMetrics={landUseHistoryMetrics} />

      <SiteContextSection
        cropValidationMetrics={cropValidationMetrics}
        biodiversityMetrics={biodiversityMetrics}
        soilGridsMetrics={soilGridsMetrics}
        criticalHabitatMetrics={criticalHabitatMetrics}
        stormMetrics={stormMetrics}
        siteContextOpen={siteContextOpen}
        onToggleSiteContext={onToggleSiteContext}
      />

      <CommunitySection
        demographicsMetrics={demographicsMetrics}
        communityOpen={demogOpen}
        onToggleCommunity={onToggleCommunity}
      />

      <DesignIntelligenceSection
        designIntelligence={designIntelligence}
        diOpen={diOpen}
        onToggleDi={onToggleDi}
      />


      <SiteSummaryNarrativeSection
        enrichment={enrichment}
        siteSummary={siteSummary}
        landWants={landWants}
      />

      <AssessmentScoresSection
        assessmentScores={assessmentScores}
        expandedScore={expandedScore}
        onToggleExpandedScore={onToggleExpandedScore}
      />

      <OpportunitiesSection
        topOpportunities={topOpportunities}
        enrichment={enrichment}
        showAll={showAllOpps}
        onToggleShowAll={onToggleShowAllOpps}
      />

      <ConstraintsSection
        topConstraints={topConstraints}
        enrichment={enrichment}
        showAll={showAllRisks}
        onToggleShowAll={onToggleShowAllRisks}
      />

      <GaezSection gaezMetrics={gaezMetrics} />

      {/* ── Crop Suitability (Sprint BK: extracted) ─────────────── */}
      <CropMatchingSection
        cropMatches={cropMatches}
        cropCategoryFilter={cropCategoryFilter}
        onCropCategoryFilter={setCropCategoryFilter}
        expandedCrop={expandedCrop}
        onToggleExpanded={onToggleExpandedCrop}
        showAllCrops={showAllCrops}
        onToggleShowAll={onToggleShowAllCrops}
        companionCache={companionCache}
      />

      <DataLayersSection dataLayerRows={dataLayerRows} />
    </div>
  );
}

// ─── Sprint BJ: memoized export + dev render profiler ────────────────────
// `SiteIntelligencePanelImpl` is memoized so parent re-renders that don't
// change the `project` prop reference skip the entire 4000-line reconciliation.
// `SectionProfiler` logs renders over 16 ms in dev; tree-shaken in prod.

const MemoSiteIntelligencePanel = memo(SiteIntelligencePanelImpl);

export default function SiteIntelligencePanel(props: SiteIntelligencePanelProps) {
  return (
    <SectionProfiler id="site-intelligence-panel">
      <MemoSiteIntelligencePanel {...props} />
    </SectionProfiler>
  );
}
