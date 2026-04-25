/**
 * §18 AiSiteSynthesisCard — deterministic constraint + opportunity rollup
 * derived from existing site assessment scores and currently-placed
 * features (structures, utilities, zones, crops, paddocks).
 *
 * Framed as an "AI draft" because that's the spec language (§18:
 * 'AI constraint and opportunity summaries'), but the engine here is a
 * deterministic rule cascade — same inputs always produce the same
 * outputs. This keeps the card presentation-only and reviewable: every
 * finding cites its sources so a steward can trace it back to the
 * underlying layer or store.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import css from './AiSiteSynthesisCard.module.css';

/* ── Layer-summary shapes (loose; we only use a few fields) ────────────── */

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
}
interface SoilsSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

/* ── Finding model ─────────────────────────────────────────────────────── */

type Severity = 'high' | 'medium' | 'low';
type Tone = 'constraint' | 'opportunity';

interface Finding {
  id: string;
  tone: Tone;
  severity: Severity;
  title: string;
  narrative: string;
  /** Short attribution chips so the reader can audit the source. */
  sources: string[];
}

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/* ── Rule cascade ──────────────────────────────────────────────────────── */

interface Inputs {
  acreage: number | null;
  precipMm: number | null;
  meanTempC: number | null;
  meanSlopeDeg: number | null;
  organicMatterPct: number | null;
  canopyPct: number | null;
  drainageClass: string | null;
  hydrologyScore: number | null;
  habitatScore: number | null;
  regenScore: number | null;
  structureCounts: Partial<Record<StructureType, number>>;
  utilityCounts: Partial<Record<UtilityType, number>>;
  zoneCounts: Partial<Record<ZoneCategory, number>>;
  cropCounts: Partial<Record<CropAreaType, number>>;
  paddockCount: number;
  paddockTotalAreaM2: number;
  totalStructures: number;
}

function has<T extends string>(counts: Partial<Record<T, number>>, ...kinds: T[]): boolean {
  return kinds.some((k) => (counts[k] ?? 0) > 0);
}

function synthesizeFindings(i: Inputs): Finding[] {
  const out: Finding[] = [];

  /* ── Constraints ───────────────────────────────────────────────────── */

  if (i.meanSlopeDeg !== null && i.meanSlopeDeg >= 15
      && !has(i.cropCounts, 'silvopasture', 'food_forest', 'orchard')
      && !has(i.utilityCounts, 'rain_catchment')) {
    out.push({
      id: 'steep-no-erosion-control',
      tone: 'constraint', severity: 'high',
      title: 'Steep terrain without erosion control',
      narrative: `Mean parcel slope is ${i.meanSlopeDeg.toFixed(1)}\u00B0 but no terracing crops, swales, or rain-catchment intercepts are placed. Concentrated runoff will scour the contour line every storm.`,
      sources: ['Elevation', 'Crops', 'Utilities'],
    });
  }

  if (i.precipMm !== null && i.precipMm < 500
      && !has(i.utilityCounts, 'rain_catchment', 'water_tank', 'well_pump')
      && !has(i.structureCounts, 'water_tank', 'well', 'water_pump_house')) {
    out.push({
      id: 'dry-no-catchment',
      tone: 'constraint', severity: 'high',
      title: 'Low rainfall with no catchment placed',
      narrative: `Annual precipitation is ${i.precipMm.toFixed(0)} mm \u2014 below the 500 mm dryland threshold \u2014 but no rainwater catchment, storage tank, or well is placed. The site is one drought season away from a hard limit.`,
      sources: ['Climate', 'Utilities', 'Structures'],
    });
  }

  if (i.paddockCount > 0
      && !has(i.utilityCounts, 'compost', 'biochar')
      && !has(i.structureCounts, 'compost_station')) {
    out.push({
      id: 'livestock-no-compost',
      tone: 'constraint', severity: 'medium',
      title: 'Livestock without manure handling',
      narrative: `${i.paddockCount} paddock${i.paddockCount === 1 ? '' : 's'} drawn but no compost station, biochar kiln, or composting utility placed. Manure becomes a liability instead of a fertility loop.`,
      sources: ['Livestock', 'Utilities', 'Structures'],
    });
  }

  if (i.meanTempC !== null && i.meanTempC >= 18
      && i.canopyPct !== null && i.canopyPct < 10
      && !has(i.cropCounts, 'shelterbelt', 'windbreak', 'food_forest', 'orchard', 'silvopasture')) {
    out.push({
      id: 'hot-low-canopy',
      tone: 'constraint', severity: 'medium',
      title: 'Hot climate, low tree canopy',
      narrative: `Mean annual temperature ${i.meanTempC.toFixed(1)}\u00B0C with only ${i.canopyPct.toFixed(0)}% canopy. Daytime ground temperatures will spike, evaporation will run high, and outdoor work windows will shrink.`,
      sources: ['Climate', 'Land cover', 'Crops'],
    });
  }

  if (i.hydrologyScore !== null && i.hydrologyScore < 50) {
    out.push({
      id: 'low-water-resilience',
      tone: 'constraint', severity: 'medium',
      title: 'Site water resilience below baseline',
      narrative: `Hydrology score is ${i.hydrologyScore.toFixed(0)}/100 \u2014 the rollup of catchment, storage, and drought buffer is sub-baseline. Plan a §14 water-budget review before stocking up infrastructure.`,
      sources: ['Hydrology score'],
    });
  }

  if (i.organicMatterPct !== null && i.organicMatterPct < 2.0) {
    out.push({
      id: 'low-organic-matter',
      tone: 'constraint', severity: 'medium',
      title: 'Low organic matter limits productivity',
      narrative: `Topsoil organic matter is ${i.organicMatterPct.toFixed(1)}% \u2014 below the 2% threshold where biological cycling carries production. Cover cropping, compost extracts, and animal-impact rotations are the usual first moves.`,
      sources: ['Soil'],
    });
  }

  if (i.totalStructures >= 4 && (i.structureCounts.prayer_space ?? 0) === 0
      && (i.zoneCounts.spiritual ?? 0) === 0) {
    out.push({
      id: 'no-spiritual-space',
      tone: 'constraint', severity: 'low',
      title: 'Habitation density without spiritual space',
      narrative: `${i.totalStructures} structures placed but no prayer space or spiritual zone defined. For an Islamic-grounded site, this is the first thing a visitor will look for and not find.`,
      sources: ['Structures', 'Zones'],
    });
  }

  /* ── Opportunities ─────────────────────────────────────────────────── */

  if (i.acreage !== null && i.acreage >= 5
      && i.meanSlopeDeg !== null && i.meanSlopeDeg < 5
      && !has(i.cropCounts, 'garden_bed', 'market_garden', 'row_crop')) {
    out.push({
      id: 'flat-land-underused',
      tone: 'opportunity', severity: 'high',
      title: 'Productive flat land underused',
      narrative: `${i.acreage.toFixed(1)} acres at ${i.meanSlopeDeg.toFixed(1)}\u00B0 mean slope with no garden bed, market garden, or row crop placed. The simplest yield on the parcel is the one nobody's drawn yet.`,
      sources: ['Acreage', 'Elevation', 'Crops'],
    });
  }

  if (i.precipMm !== null && i.precipMm >= 1000
      && !has(i.utilityCounts, 'rain_catchment')
      && !has(i.zoneCounts, 'water_retention')) {
    out.push({
      id: 'wet-no-retention',
      tone: 'opportunity', severity: 'high',
      title: 'Water-rich climate, retention undersized',
      narrative: `Annual precipitation is ${i.precipMm.toFixed(0)} mm but no rain catchment or water-retention zone is placed. Holding even 5% of incoming rainfall on the parcel changes everything downstream.`,
      sources: ['Climate', 'Utilities', 'Zones'],
    });
  }

  if (i.organicMatterPct !== null && i.organicMatterPct >= 4.0
      && !has(i.cropCounts, 'orchard', 'food_forest', 'silvopasture')) {
    out.push({
      id: 'good-soil-no-perennial',
      tone: 'opportunity', severity: 'medium',
      title: 'Premium soil for agroforestry not yet captured',
      narrative: `Organic matter at ${i.organicMatterPct.toFixed(1)}% is well above the 4% threshold where perennial systems thrive. An orchard, food forest, or silvopasture block would compound this advantage for decades.`,
      sources: ['Soil', 'Crops'],
    });
  }

  if (i.habitatScore !== null && i.habitatScore >= 65
      && !has(i.cropCounts, 'pollinator_strip', 'food_forest')
      && !has(i.zoneCounts, 'conservation')) {
    out.push({
      id: 'pollinator-corridor-opportunity',
      tone: 'opportunity', severity: 'medium',
      title: 'Pollinator corridor opportunity',
      narrative: `Habitat sensitivity score is ${i.habitatScore.toFixed(0)}/100 with no pollinator strip, food forest, or conservation zone placed. The biology is ready; the design needs to invite it in.`,
      sources: ['Habitat score', 'Crops', 'Zones'],
    });
  }

  if (i.meanTempC !== null && i.meanTempC < 14
      && !has(i.structureCounts, 'greenhouse')) {
    out.push({
      id: 'cool-no-greenhouse',
      tone: 'opportunity', severity: 'medium',
      title: 'Season extension via greenhouse',
      narrative: `Mean annual temperature is ${i.meanTempC.toFixed(1)}\u00B0C \u2014 a greenhouse extends the growing window by 6\u20138 weeks on each end and unlocks year-round leafy production.`,
      sources: ['Climate', 'Structures'],
    });
  }

  if (i.canopyPct !== null && i.canopyPct < 15
      && !has(i.structureCounts, 'solar_array')
      && !has(i.utilityCounts, 'solar_panel')) {
    out.push({
      id: 'sun-exposed-no-solar',
      tone: 'opportunity', severity: 'low',
      title: 'Solar siting potential underused',
      narrative: `Tree canopy is ${i.canopyPct.toFixed(0)}% \u2014 the parcel is sun-exposed and no solar array or panel is placed. A modest array sized to the site\u2019s daytime load is usually the cheapest energy decision available.`,
      sources: ['Land cover', 'Structures', 'Utilities'],
    });
  }

  /* ── Sort: high → low within each tone, then by id for stability ──── */

  return out.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return sev !== 0 ? sev : a.id.localeCompare(b.id);
  });
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface Props {
  project: LocalProject;
}

export default function AiSiteSynthesisCard({ project }: Props) {
  const siteData = useSiteData(project.id);

  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allZones = useZoneStore((s) => s.zones);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const structures = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const crops = useMemo(() => allCropAreas.filter((c) => c.projectId === project.id), [allCropAreas, project.id]);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === project.id), [allPaddocks, project.id]);

  const findings = useMemo<Finding[]>(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om = isFinite(omRaw) ? omRaw : null;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy = isFinite(canopyRaw) ? canopyRaw : null;

    const scores = siteData?.layers?.length
      ? computeAssessmentScores(siteData.layers, project.acreage ?? null)
      : [];
    const habitatScore = scores.find((s) => s.label === 'Habitat Sensitivity')?.score ?? null;
    const regenScore = scores.find((s) => s.label === 'Regenerative Potential')?.score ?? null;
    const hydrologyScore = scores.find((s) => s.label === 'Hydrology')?.score ?? null;

    const tally = <T extends string>(items: { type: T }[]): Partial<Record<T, number>> => {
      const out: Partial<Record<T, number>> = {};
      for (const it of items) out[it.type] = (out[it.type] ?? 0) + 1;
      return out;
    };
    const zoneTally = (items: { category: ZoneCategory }[]): Partial<Record<ZoneCategory, number>> => {
      const out: Partial<Record<ZoneCategory, number>> = {};
      for (const z of items) out[z.category] = (out[z.category] ?? 0) + 1;
      return out;
    };

    return synthesizeFindings({
      acreage: project.acreage ?? null,
      precipMm: climate?.annual_precip_mm ?? null,
      meanTempC: climate?.annual_temp_mean_c ?? null,
      meanSlopeDeg: elevation?.mean_slope_deg ?? null,
      organicMatterPct: om,
      canopyPct: canopy,
      drainageClass: soils?.drainage_class ?? null,
      hydrologyScore,
      habitatScore,
      regenScore,
      structureCounts: tally(structures),
      utilityCounts: tally(utilities),
      zoneCounts: zoneTally(zones),
      cropCounts: tally(crops),
      paddockCount: paddocks.length,
      paddockTotalAreaM2: paddocks.reduce((sum, p) => sum + p.areaM2, 0),
      totalStructures: structures.length,
    });
  }, [siteData, project.acreage, structures, utilities, zones, crops, paddocks]);

  const constraints = findings.filter((f) => f.tone === 'constraint');
  const opportunities = findings.filter((f) => f.tone === 'opportunity');

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'AI DESIGN SYNTHESIS (\u00A718)'}</h3>

      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>What does the design tell us?</h4>
            <p className={css.cardHint}>
              A draft synthesis of the parcel\u2019s constraints and
              opportunities, derived from current site assessment scores
              and the features you\u2019ve placed. Every finding cites its
              sources so you can trace it back to the underlying data.
            </p>
          </div>
          <span className={css.heuristicBadge}>AI draft</span>
        </div>

        {findings.length === 0 ? (
          <div className={css.empty}>
            <p>
              No findings yet. Add site data layers (climate, soils,
              elevation, land cover) and place a few structures, zones, or
              crop areas to surface the synthesis.
            </p>
          </div>
        ) : (
          <div className={css.twoCol}>
            <FindingColumn
              tone="constraint"
              label="CONSTRAINTS"
              findings={constraints}
            />
            <FindingColumn
              tone="opportunity"
              label="OPPORTUNITIES"
              findings={opportunities}
            />
          </div>
        )}

        <p className={css.footnote}>
          <em>AI draft.</em> Generated deterministically from current
          scores and placements{' \u2014 '}same inputs always produce the
          same findings. This is not a substitute for site visits, soil
          tests, or steward judgement; it surfaces the patterns the data
          already implies. <strong>Review for accuracy</strong> before
          sharing with funders or community.
        </p>
      </div>
    </div>
  );
}

function FindingColumn({ tone, label, findings }: { tone: Tone; label: string; findings: Finding[] }) {
  return (
    <div className={css.column}>
      <div className={css.columnHead}>
        <span className={`${css.columnLabel} ${tone === 'constraint' ? css.columnLabelConstraint : css.columnLabelOpportunity}`}>
          {tone === 'constraint' ? '\u25BC' : '\u25B2'} {label} ({findings.length})
        </span>
      </div>
      {findings.length === 0 ? (
        <div className={css.columnEmpty}>
          {tone === 'constraint'
            ? 'No constraints surfaced from current data.'
            : 'No new opportunities surfaced from current data.'}
        </div>
      ) : (
        <ul className={css.findingList}>
          {findings.map((f) => (
            <li key={f.id} className={`${css.finding} ${css[`sev_${f.severity}`]}`}>
              <div className={css.findingHead}>
                <span className={`${css.severityDot} ${css[`dot_${f.severity}`]}`} aria-hidden />
                <span className={css.findingTitle}>{f.title}</span>
              </div>
              <p className={css.findingNarrative}>{f.narrative}</p>
              <div className={css.findingSources}>
                {f.sources.map((s) => (
                  <span key={s} className={css.sourceChip}>{s}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
