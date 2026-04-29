/**
 * §18 AiSiteSummaryCard — narrative site descriptor with per-claim source
 * attribution and an overall confidence band.
 *
 * Spec mapping: §18 AI Design Support · `ai-site-summary` (P3, partial → done).
 *
 * Distinct from `AiSiteSynthesisCard` (which produces constraint/opportunity
 * findings) — this card reads the seven Tier-1 site-data layers and produces
 * five short, attributed paragraphs describing the parcel's character:
 * Climate, Terrain, Soil & Hydrology, Vegetation & Cover, Regulatory. Each
 * sentence cites the layer's `attribution` so a steward can trace the claim
 * back to the underlying source.
 *
 * Confidence band aggregates the seven Tier-1 layers' per-layer `confidence`
 * field (high=3, medium=2, low=1) into one of three bands:
 *   HIGH    — ≥ 6 layers complete and weighted avg ≥ 2.5
 *   MEDIUM  — ≥ 4 layers complete and weighted avg ≥ 1.8
 *   LOW     — anything below
 *
 * Pure presentation — no shared math, no fetches, no entity writes. The
 * "AI" framing is spec language; the engine is a deterministic rule cascade
 * over typed layer summaries.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import type {
  ClimateSummary,
  ElevationSummary,
  SoilsSummary,
  WatershedSummary,
  WetlandsFloodSummary,
  LandCoverSummary,
  ZoningSummary,
} from '@ogden/shared/scoring';
import css from './AiSiteSummaryCard.module.css';

type Confidence = 'high' | 'medium' | 'low';
type Band = 'HIGH' | 'MEDIUM' | 'LOW';

const CONFIDENCE_WEIGHT: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

const TIER1_LAYERS = [
  'elevation',
  'soils',
  'watershed',
  'wetlands_flood',
  'land_cover',
  'climate',
  'zoning',
] as const;

interface Section {
  id: string;
  title: string;
  sentences: { text: string; attribution: string | null }[];
  hasData: boolean;
}

interface Props {
  project: LocalProject;
}

function fmtNum(n: number | null | undefined, digits = 0, suffix = ''): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toFixed(digits)}${suffix}`;
}

function getAttribution(layers: { layerType: string; attribution: string }[], type: string): string | null {
  const layer = layers.find((l) => l.layerType === type);
  return layer?.attribution ?? null;
}

function getLayerConfidence(
  layers: { layerType: string; confidence: Confidence; fetchStatus: string }[],
  type: string,
): Confidence | null {
  const layer = layers.find((l) => l.layerType === type);
  if (!layer || layer.fetchStatus !== 'complete') return null;
  return layer.confidence;
}

export default function AiSiteSummaryCard({ project }: Props) {
  const siteData = useSiteData(project.id);

  const summary = useMemo(() => {
    if (!siteData || !siteData.layers || siteData.layers.length === 0) {
      return null;
    }

    const layers = siteData.layers;

    const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
    const elevation = getLayerSummary<ElevationSummary>(siteData, 'elevation');
    const soils = getLayerSummary<SoilsSummary>(siteData, 'soils');
    const watershed = getLayerSummary<WatershedSummary>(siteData, 'watershed');
    const wetlandsFlood = getLayerSummary<WetlandsFloodSummary>(siteData, 'wetlands_flood');
    const landCover = getLayerSummary<LandCoverSummary>(siteData, 'land_cover');
    const zoning = getLayerSummary<ZoningSummary>(siteData, 'zoning');

    const sections: Section[] = [];

    /* ── Climate ────────────────────────────────────────── */
    {
      const sentences: Section['sentences'] = [];
      const attr = getAttribution(layers, 'climate');
      const precip = fmtNum(climate?.annual_precip_mm, 0, ' mm/yr');
      const temp = fmtNum(climate?.annual_temp_mean_c, 1, '°C');
      const grow = fmtNum(climate?.growing_season_days, 0, ' days');
      const zone = climate?.hardiness_zone ?? null;
      const koppen = climate?.koppen_label ?? climate?.koppen_classification ?? null;

      const climateBits: string[] = [];
      if (precip) climateBits.push(`receives ${precip} of precipitation`);
      if (temp) climateBits.push(`averages ${temp}`);
      if (climateBits.length > 0) {
        sentences.push({ text: `The site ${climateBits.join(' and ')}.`, attribution: attr });
      }
      if (grow) {
        sentences.push({
          text: `Growing season is ${grow}${zone ? ` (hardiness zone ${zone})` : ''}.`,
          attribution: attr,
        });
      }
      if (koppen) {
        sentences.push({ text: `Köppen classification: ${koppen}.`, attribution: attr });
      }
      sections.push({ id: 'climate', title: 'Climate', sentences, hasData: sentences.length > 0 });
    }

    /* ── Terrain ────────────────────────────────────────── */
    {
      const sentences: Section['sentences'] = [];
      const attr = getAttribution(layers, 'elevation');
      const minE = elevation?.min_elevation_m;
      const maxE = elevation?.max_elevation_m;
      const slope = fmtNum(elevation?.mean_slope_deg, 1, '°');
      const aspect = elevation?.predominant_aspect ?? null;

      if (minE != null && maxE != null && Number.isFinite(minE) && Number.isFinite(maxE)) {
        sentences.push({
          text: `Elevation ranges from ${minE.toFixed(0)}–${maxE.toFixed(0)} m.`,
          attribution: attr,
        });
      }
      if (slope) {
        sentences.push({
          text: `Mean slope is ${slope}${aspect ? `, predominant aspect ${aspect}` : ''}.`,
          attribution: attr,
        });
      }
      sections.push({ id: 'terrain', title: 'Terrain', sentences, hasData: sentences.length > 0 });
    }

    /* ── Soil & Hydrology ───────────────────────────────── */
    {
      const sentences: Section['sentences'] = [];
      const soilAttr = getAttribution(layers, 'soils');
      const waterAttr = getAttribution(layers, 'watershed');
      const texture = soils?.predominant_texture ?? soils?.texture_class ?? null;
      const drainage = soils?.drainage_class ?? null;
      const om = fmtNum(soils?.organic_matter_pct, 1, '%');
      const hg = soils?.hydrologic_group ?? null;
      const wsName = watershed?.watershed_name ?? null;
      const stream = watershed?.nearest_stream_m;

      const soilBits: string[] = [];
      if (texture) soilBits.push(texture.toLowerCase());
      if (drainage) soilBits.push(`${drainage.toLowerCase()} drainage`);
      if (soilBits.length > 0) {
        sentences.push({ text: `Soil is ${soilBits.join(', ')}.`, attribution: soilAttr });
      }
      if (om) {
        sentences.push({
          text: `Organic matter ${om}${hg ? `, hydrologic group ${hg}` : ''}.`,
          attribution: soilAttr,
        });
      }
      if (wsName || (stream != null && Number.isFinite(stream))) {
        const parts: string[] = [];
        if (wsName) parts.push(`Sits within ${wsName}`);
        if (stream != null && Number.isFinite(stream)) {
          parts.push(`${parts.length === 0 ? 'Nearest stream is ' : 'nearest stream '}${stream.toFixed(0)} m away`);
        }
        sentences.push({ text: `${parts.join('; ')}.`, attribution: waterAttr });
      }
      sections.push({
        id: 'soil-water',
        title: 'Soil & hydrology',
        sentences,
        hasData: sentences.length > 0,
      });
    }

    /* ── Vegetation & Cover ─────────────────────────────── */
    {
      const sentences: Section['sentences'] = [];
      const attr = getAttribution(layers, 'land_cover');
      const primary = landCover?.primary_class ?? null;
      const canopy = fmtNum(landCover?.tree_canopy_pct, 0, '%');
      const cropland = fmtNum(landCover?.cropland_pct, 0, '%');

      if (primary) {
        sentences.push({
          text: `Land cover is predominantly ${primary.toLowerCase()}.`,
          attribution: attr,
        });
      }
      const ccBits: string[] = [];
      if (canopy) ccBits.push(`tree canopy ${canopy}`);
      if (cropland) ccBits.push(`cropland ${cropland}`);
      if (ccBits.length > 0) {
        sentences.push({ text: `${ccBits.join(', ')}.`, attribution: attr });
      }
      sections.push({
        id: 'vegetation',
        title: 'Vegetation & cover',
        sentences,
        hasData: sentences.length > 0,
      });
    }

    /* ── Regulatory ─────────────────────────────────────── */
    {
      const sentences: Section['sentences'] = [];
      const wfAttr = getAttribution(layers, 'wetlands_flood');
      const zAttr = getAttribution(layers, 'zoning');
      const flood = wetlandsFlood?.flood_zone ?? null;
      const wetlandPct = fmtNum(wetlandsFlood?.wetland_pct, 0, '%');
      const ca = wetlandsFlood?.conservation_authority ?? null;
      const zCode = zoning?.zoning_code ?? null;
      const zDesc = zoning?.zoning_description ?? null;
      const muni = zoning?.municipality ?? zoning?.county_name ?? null;

      if (flood || wetlandPct) {
        const parts: string[] = [];
        if (flood) parts.push(`Flood zone: ${flood}`);
        if (wetlandPct) parts.push(`wetland coverage ${wetlandPct}`);
        sentences.push({ text: `${parts.join('; ')}.`, attribution: wfAttr });
      }
      if (ca) {
        sentences.push({ text: `Conservation authority: ${ca}.`, attribution: wfAttr });
      }
      if (zCode || zDesc) {
        const z = [zCode, zDesc].filter(Boolean).join(' — ');
        sentences.push({
          text: `Zoning: ${z}${muni ? ` (${muni})` : ''}.`,
          attribution: zAttr,
        });
      }
      sections.push({
        id: 'regulatory',
        title: 'Regulatory',
        sentences,
        hasData: sentences.length > 0,
      });
    }

    /* ── Confidence band ────────────────────────────────── */
    let completeCount = 0;
    let weightSum = 0;
    let weightCount = 0;
    for (const t of TIER1_LAYERS) {
      const c = getLayerConfidence(layers, t);
      if (c) {
        completeCount++;
        weightSum += CONFIDENCE_WEIGHT[c];
        weightCount++;
      }
    }
    const avg = weightCount > 0 ? weightSum / weightCount : 0;
    let band: Band = 'LOW';
    if (completeCount >= 6 && avg >= 2.5) band = 'HIGH';
    else if (completeCount >= 4 && avg >= 1.8) band = 'MEDIUM';

    return {
      sections,
      band,
      completeCount,
      avgConfidence: avg,
      isLive: siteData.isLive,
      liveCount: siteData.liveCount,
    };
  }, [siteData]);

  if (!summary) {
    return (
      <div className={css.section}>
        <h3 className={css.sectionLabel}>{'AI SITE SUMMARY (\u00A718)'}</h3>
        <div className={css.card}>
          <div className={css.cardHead}>
            <div>
              <h4 className={css.cardTitle}>Site descriptor</h4>
              <p className={css.cardHint}>
                Narrative summary of the parcel&rsquo;s character with per-claim
                source attribution and an overall confidence band.
              </p>
            </div>
            <span className={css.aiBadge}>AI DRAFT</span>
          </div>
          <div className={css.empty}>
            Site data not yet fetched. Open Site Intelligence to populate
            climate, terrain, soil, hydrology, land cover, wetland/flood,
            and zoning layers — the descriptor draws from those seven sources.
          </div>
        </div>
      </div>
    );
  }

  const renderedSections = summary.sections.filter((s) => s.hasData);

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'AI SITE SUMMARY (\u00A718)'}</h3>
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Site descriptor</h4>
            <p className={css.cardHint}>
              Narrative summary of the parcel&rsquo;s character. Every claim
              cites its source layer; the overall confidence band reflects how
              many of the seven Tier-1 layers are complete and how confident
              each one is.
            </p>
          </div>
          <span className={css.aiBadge}>AI DRAFT</span>
        </div>

        <div className={css.metaRow}>
          <span className={`${css.confBand} ${css[`band_${summary.band}`]}`}>
            {summary.band} CONFIDENCE
          </span>
          <span className={css.metaItem}>
            {summary.completeCount}/{TIER1_LAYERS.length} layers complete
          </span>
          {summary.isLive && (
            <span className={css.liveBadge}>
              {summary.liveCount} LIVE
            </span>
          )}
        </div>

        {renderedSections.length === 0 ? (
          <div className={css.empty}>
            Layers fetched but none surfaced descriptive fields yet. Refresh
            Site Intelligence to retry adapter calls.
          </div>
        ) : (
          <div className={css.paraList}>
            {renderedSections.map((s) => (
              <div key={s.id} className={css.para}>
                <div className={css.paraTitle}>{s.title}</div>
                <div className={css.paraBody}>
                  {s.sentences.map((sent, i) => (
                    <span key={i} className={css.sentence}>
                      {sent.text}
                      {sent.attribution && (
                        <span className={css.attr}>{' '}({sent.attribution})</span>
                      )}
                      {i < s.sentences.length - 1 && ' '}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
