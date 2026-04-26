/**
 * §4 RestorationPriorityCard — composite per-zone restoration priority
 * with a phased Year-1 / Year-2 / Year-3+ regeneration sequence.
 *
 * Inputs:
 *   - zones: per-zone invasivePressure, successionStage, area, category
 *   - site-data: terrain_analysis erosion class, mean slope, land_cover
 *     canopy pct (for sparse-cover penalty)
 *
 * Composite priority score per zone (0–100):
 *   - invasive pressure        (none 0 / low 8 / medium 18 / high 30)
 *   - succession setback       (bare 25 / pioneer 15 / mid 5 / climax 0)
 *   - site erosion exposure    (very high+ 20 / high 14 / moderate 8 / low 3 / very low 0)
 *   - slope amplifier          (≥15° +10, 8–15° +6, <8° 0)
 *   - category lift            (conservation / buffer / water_retention +10)
 *   - sparse-cover penalty     (canopy < 10% AND zone is conservation / commons +5)
 *
 * Priority bands → phased sequence:
 *   - Year-1 anchor   (score ≥ 60) — invasive control, erosion arresting, perimeter
 *   - Year-2 expansion (35–59)     — succession seeding, pollinator strips, woody anchors
 *   - Year-3+ closure  (15–34)     — under-canopy infill, monitoring, light maintenance
 *   - Stable / monitor (<15)       — no active intervention recommended
 *
 * Heuristic only — sized as a steward checklist, not a restoration
 * ecology engine. Mounted on EcologicalDashboard between
 * `RegenerationTimelineCard` (intervention log) and
 * `CarryingCapacityCard`.
 *
 * Spec mapping: §4 `restoration-priority-regeneration-sequence`
 * (P2 partial → done).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, type LandZone, type ZoneCategory } from '../../store/zoneStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import s from './RestorationPriorityCard.module.css';

interface RestorationPriorityCardProps {
  project: LocalProject;
}

interface ElevationSummary { mean_slope_deg?: number; }
interface LandCoverSummary { tree_canopy_pct?: number; }
interface TerrainAnalysisSummary {
  erosion_dominant_class?: string;
  erosion_mean_t_ha_yr?: number;
}

type PriorityBand = 'year_1' | 'year_2' | 'year_3' | 'monitor';

const BAND_CONFIG: Record<PriorityBand, { label: string; sequence: string; tone: 'rust' | 'amber' | 'gold' | 'sage' }> = {
  year_1: { label: 'Year-1 anchor',       sequence: 'invasive control, erosion arresting, perimeter fencing',                  tone: 'rust' },
  year_2: { label: 'Year-2 expansion',    sequence: 'succession seeding, pollinator strips, woody anchor planting',            tone: 'amber' },
  year_3: { label: 'Year-3+ closure',     sequence: 'under-canopy infill, monitoring, light maintenance',                      tone: 'gold' },
  monitor: { label: 'Stable / monitor',   sequence: 'no active intervention recommended; monitor for change in next walk',     tone: 'sage' },
};

interface ZoneScore {
  zone: LandZone;
  score: number;
  band: PriorityBand;
  drivers: string[];
}

/** Categories that get a +10 lift — restoration is core to their purpose. */
const RESTORATION_CATEGORIES: ReadonlySet<ZoneCategory> = new Set([
  'conservation', 'buffer', 'water_retention',
]);

const INVASIVE_SCORE: Record<NonNullable<LandZone['invasivePressure']>, number> = {
  none: 0,
  low: 8,
  medium: 18,
  high: 30,
};

const SUCCESSION_SCORE: Record<NonNullable<LandZone['successionStage']>, number> = {
  bare: 25,
  pioneer: 15,
  mid: 5,
  climax: 0,
};

function erosionScoreFromClass(label: string | undefined, meanTPerHaYr: number | undefined): number {
  // Prefer dominant class (categorical), fall back to mean tonnage band.
  const lower = (label ?? '').toLowerCase();
  if (lower.includes('severe')) return 20;
  if (lower.includes('very_high') || lower.includes('very high')) return 18;
  if (lower.includes('high')) return 14;
  if (lower.includes('moderate')) return 8;
  if (lower.includes('low') && !lower.includes('very_low') && !lower.includes('very low')) return 3;
  if (typeof meanTPerHaYr === 'number') {
    if (meanTPerHaYr >= 20) return 18;
    if (meanTPerHaYr >= 10) return 14;
    if (meanTPerHaYr >= 5) return 8;
    if (meanTPerHaYr >= 2) return 3;
  }
  return 0;
}

function slopeAmplifier(meanSlopeDeg: number | undefined): number {
  if (typeof meanSlopeDeg !== 'number') return 0;
  if (meanSlopeDeg >= 15) return 10;
  if (meanSlopeDeg >= 8) return 6;
  return 0;
}

function bandFor(score: number): PriorityBand {
  if (score >= 60) return 'year_1';
  if (score >= 35) return 'year_2';
  if (score >= 15) return 'year_3';
  return 'monitor';
}

function categoryLabel(cat: ZoneCategory): string {
  return cat.replace(/_/g, ' ');
}

export default function RestorationPriorityCard({ project }: RestorationPriorityCardProps) {
  const allZones = useZoneStore((st) => st.zones);
  const siteData = useSiteData(project.id);

  const analysis = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === project.id);
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const terrainAnalysis = siteData ? getLayerSummary<TerrainAnalysisSummary>(siteData, 'terrain_analysis') : null;

    const meanSlopeDeg = elevation?.mean_slope_deg;
    const canopyPct = landCover?.tree_canopy_pct;
    const erosionLift = erosionScoreFromClass(
      terrainAnalysis?.erosion_dominant_class,
      terrainAnalysis?.erosion_mean_t_ha_yr,
    );
    const slopeLift = slopeAmplifier(meanSlopeDeg);
    const sparseCanopy = typeof canopyPct === 'number' && canopyPct < 10;

    const scores: ZoneScore[] = zones.map((zone) => {
      const drivers: string[] = [];
      let score = 0;

      const invasive = zone.invasivePressure ?? null;
      if (invasive && invasive !== 'none') {
        const lift = INVASIVE_SCORE[invasive];
        score += lift;
        drivers.push(`${invasive} invasive pressure (+${lift})`);
      }

      const succession = zone.successionStage ?? null;
      if (succession && succession !== 'climax') {
        const lift = SUCCESSION_SCORE[succession];
        if (lift > 0) {
          score += lift;
          drivers.push(`${succession}-stage succession (+${lift})`);
        }
      }

      if (erosionLift > 0) {
        score += erosionLift;
        drivers.push(`site erosion ${terrainAnalysis?.erosion_dominant_class?.replace(/_/g, ' ') ?? 'elevated'} (+${erosionLift})`);
      }

      if (slopeLift > 0) {
        score += slopeLift;
        drivers.push(`mean slope ${meanSlopeDeg?.toFixed(1)}° (+${slopeLift})`);
      }

      if (RESTORATION_CATEGORIES.has(zone.category)) {
        score += 10;
        drivers.push(`${categoryLabel(zone.category)} category (+10)`);
      }

      if (sparseCanopy && (zone.category === 'conservation' || zone.category === 'commons')) {
        score += 5;
        drivers.push(`sparse canopy (${canopyPct}%) (+5)`);
      }

      const clamped = Math.min(100, Math.max(0, Math.round(score)));
      return {
        zone,
        score: clamped,
        band: bandFor(clamped),
        drivers,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    const totals = scores.reduce(
      (acc, sc) => {
        acc[sc.band] += 1;
        return acc;
      },
      { year_1: 0, year_2: 0, year_3: 0, monitor: 0 } as Record<PriorityBand, number>,
    );

    return {
      zoneCount: zones.length,
      scores,
      totals,
      siteContext: {
        meanSlopeDeg,
        canopyPct,
        erosionDominant: terrainAnalysis?.erosion_dominant_class,
        erosionMean: terrainAnalysis?.erosion_mean_t_ha_yr,
        erosionLift,
        slopeLift,
      },
    };
  }, [allZones, project.id, siteData]);

  if (analysis.zoneCount === 0) {
    return null;
  }

  const top = analysis.scores.slice(0, 5);

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Restoration priority &amp; phased sequence</h3>
          <p className={s.hint}>
            Composite per-zone score combining invasive pressure, successional stage,
            site erosion, slope, and category-of-purpose. Top {top.length} of {analysis.zoneCount} zone{analysis.zoneCount === 1 ? '' : 's'} surfaced
            with a Year-1 / Year-2 / Year-3+ regeneration sequence per band.
          </p>
        </div>
        <span className={s.badge}>
          {analysis.totals.year_1} Y1 · {analysis.totals.year_2} Y2 · {analysis.totals.year_3} Y3+
        </span>
      </div>

      {/* Site-context strip — what's lifting every zone before per-zone signals */}
      {(analysis.siteContext.erosionLift > 0 || analysis.siteContext.slopeLift > 0) && (
        <p className={s.siteContext}>
          Site-wide background lift:{' '}
          {analysis.siteContext.erosionLift > 0 && (
            <>erosion <strong>{analysis.siteContext.erosionDominant?.replace(/_/g, ' ') ?? '—'}</strong> (+{analysis.siteContext.erosionLift}){analysis.siteContext.slopeLift > 0 ? ', ' : '. '}</>
          )}
          {analysis.siteContext.slopeLift > 0 && (
            <>slope <strong>{analysis.siteContext.meanSlopeDeg?.toFixed(1)}°</strong> (+{analysis.siteContext.slopeLift}). </>
          )}
          Both apply uniformly across all zones.
        </p>
      )}

      {/* Phased band summary */}
      <ul className={s.bandSummary}>
        {(Object.keys(BAND_CONFIG) as PriorityBand[]).map((b) => {
          const cfg = BAND_CONFIG[b];
          const n = analysis.totals[b];
          return (
            <li key={b} className={`${s.bandRow} ${s[`band_${cfg.tone}`] ?? ''}`}>
              <span className={s.bandLabel}>{cfg.label}</span>
              <span className={s.bandSequence}>{cfg.sequence}</span>
              <span className={s.bandCount}>{n} zone{n === 1 ? '' : 's'}</span>
            </li>
          );
        })}
      </ul>

      {/* Top zones */}
      <ul className={s.zoneList}>
        {top.map((sc) => {
          const cfg = BAND_CONFIG[sc.band];
          return (
            <li key={sc.zone.id} className={`${s.zone} ${s[`zone_${cfg.tone}`] ?? ''}`}>
              <div className={s.zoneHead}>
                <div className={s.zoneTitleBlock}>
                  <span className={s.zoneName}>{sc.zone.name}</span>
                  <span className={s.zoneMeta}>
                    {categoryLabel(sc.zone.category)} · {(sc.zone.areaM2 / 4046.86).toFixed(2)} ac
                  </span>
                </div>
                <div className={s.zoneScoreBlock}>
                  <span className={s.zoneScore}>{sc.score}</span>
                  <span className={s.zoneScoreUnit}>/100</span>
                </div>
              </div>
              <p className={s.zoneBand}>
                <strong>{cfg.label}</strong> — {cfg.sequence}
              </p>
              {sc.drivers.length > 0 && (
                <ul className={s.driverList}>
                  {sc.drivers.map((d, i) => (
                    <li key={i} className={s.driver}>{d}</li>
                  ))}
                </ul>
              )}
              {sc.drivers.length === 0 && (
                <p className={s.driverEmpty}>
                  No restoration signals detected — zone reads as stable. Tag invasive
                  pressure or succession stage during your next walk to refine.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className={s.footnote}>
        Heuristic v1 — composite score driven by per-zone tags (invasive pressure,
        succession stage) layered on site-wide erosion and slope context. Unscored
        zones (no tags) still get site-wide lift; tag invasive and succession during
        a walk-through to sharpen the ranking. Assumes a Year-1 / Year-2 / Year-3+
        triage frame; longer rotations or different recovery cycles are out of scope
        for v1.
      </p>
    </div>
  );
}
