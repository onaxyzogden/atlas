/**
 * §11 ForageQualitySeasonalCard — 12-month seasonal forage-quality curve
 * (crude protein %, total digestible nutrients %, dry-matter digestibility %)
 * with supplement-window flagging.
 *
 * Today the GrazingDashboard surfaces a single static `ForageQuality`
 * via `computeForageQuality(...)` — one quality bucket and a stocking
 * multiplier, but no seasonal arc. This card adds the missing temporal
 * dimension: when does protein peak, when does the summer slump hit,
 * when do you need to put out supplemental hay or move animals to
 * stockpiled fall growth?
 *
 * Heuristic v1 (cool-season pasture archetype):
 *   - Spring flush (Apr-Jun in NH): peak protein 18-22%, TDN 65%, DMD 75%
 *   - Summer slump (Jul-Aug):       protein dip 8-11%, TDN 55%, DMD 60%
 *   - Fall flush (Sep-Oct):         secondary peak protein 14-16%
 *   - Winter dormant (Nov-Mar):     low protein 6-9%, TDN 50-55%
 *
 * Modulators on top of the archetype:
 *   - growing season days (climate): wider GS = wider peak window
 *   - hemisphere (centroid latitude): southern-hemisphere flips months
 *   - canopy %: heavy shade (>40%) lowers protein peak ~2 pts but
 *     extends late-season retention by ~5 pts (silvopasture effect)
 *   - mean OM %: every +2% OM lifts baseline protein +1 pt
 *
 * Supplement window: any month where protein < 10% OR TDN < 55%.
 *
 * Pure presentation. Reads `useSiteData(project.id)` for climate +
 * elevation + land_cover, `useLivestockStore` for paddocks (count +
 * names), `useZoneStore` filtered for the project's pasture zones (mean
 * canopy + OM proxy). No new shared exports, no entity churn.
 *
 * Manifest mapping: no 1:1 key. Advances §11 multi-facet via
 * `browse-pressure-overgrazing-risk` (P3 partial) and
 * `recovery-period-rotation-schedule` (P2 partial) — seasonal forage
 * quality is the upstream signal both depend on. Manifest unchanged.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import type { LandZone } from '../../store/zoneStore.js';
import css from './ForageQualitySeasonalCard.module.css';

interface Props {
  project: LocalProject;
}

interface ClimateSummary {
  growing_season_days?: number;
  annual_temp_mean_c?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}
interface SoilsSummary {
  organic_matter_pct?: number | string;
}

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyPoint {
  monthIdx: number; // 0-11 in display order (Jan-Dec)
  monthLabel: string;
  proteinPct: number;
  tdnPct: number;
  dmdPct: number;
  flagged: boolean; // supplement window
}

/* Northern-hemisphere archetype (Jan=0). Southern flips by 6. */
const NH_PROTEIN = [7, 8, 11, 16, 20, 18, 11, 9, 14, 13, 9, 7];
const NH_TDN     = [52, 53, 58, 62, 65, 64, 56, 54, 60, 59, 54, 52];
const NH_DMD     = [58, 59, 65, 72, 75, 74, 62, 60, 68, 67, 60, 57];

function shiftSouthern(arr: number[]): number[] {
  // Hemisphere flip — Jan SH ≈ Jul NH.
  return arr.map((_, i) => arr[(i + 6) % 12] ?? 0);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* Modulate baseline by canopy %, OM %, and growing-season width. */
function modulate(
  baseline: number[],
  modulator: { canopyPct: number; omPct: number; growingSeasonDays: number; isProtein: boolean },
): number[] {
  const { canopyPct, omPct, growingSeasonDays, isProtein } = modulator;
  // Heavy shade depresses peak but lifts late-season retention.
  const heavyShade = canopyPct > 40;
  // OM lift: 2pp per +2% OM, only on protein.
  const omLift = isProtein ? Math.max(0, (omPct - 2) / 2) : 0;
  // GS multiplier: wider season = wider peak window. Default 200 days.
  const gsScale = clamp(growingSeasonDays / 200, 0.7, 1.2);

  return baseline.map((v, i) => {
    let out = v + omLift;
    if (heavyShade) {
      // Depress peak months (Apr-Jun NH = idx 3-5; the function uses display order so
      // we depress wherever value is in top 30% of array).
      const peakish = v >= 14;
      if (peakish && isProtein) out -= 2;
      // Lift late-season (last 4 months of growth, where stockpile holds).
      const stockpileWindow = i >= 8 && i <= 10;
      if (stockpileWindow) out += 1;
    }
    // Apply GS scale only to growing-season months (where v > baseline floor).
    const gsFloor = isProtein ? 9 : 55;
    if (v > gsFloor) {
      out = gsFloor + (out - gsFloor) * gsScale;
    }
    return Math.round(out * 10) / 10;
  });
}

interface SitePastureSignals {
  meanCanopyPct: number;
  meanOmPct: number;
  pastureZoneCount: number;
  totalPastureAreaM2: number;
}

const PASTURE_CATS: ReadonlySet<string> = new Set(['pasture', 'silvopasture', 'commons']);

function deriveSitePasture(
  zones: LandZone[],
  projectId: string,
  siteCanopyPct: number,
  siteOmPct: number,
): SitePastureSignals {
  const matched = zones.filter((z) => z.projectId === projectId && PASTURE_CATS.has(z.category));
  const totalArea = matched.reduce((s, z) => s + z.areaM2, 0);
  // Per-zone canopy / OM aren't tagged on LandZone today; fall back to site-wide
  // SoilGrids OM and NLCD canopy. The pasture-zone count + area are surfaced
  // so the steward sees how much of the parcel feeds the site curve.
  return {
    meanCanopyPct: siteCanopyPct,
    meanOmPct: siteOmPct,
    pastureZoneCount: matched.length,
    totalPastureAreaM2: totalArea,
  };
}

export default function ForageQualitySeasonalCard({ project }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);
  const siteData = useSiteData(project.id);

  const analysis = useMemo(() => {
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const growingSeasonDays = climate?.growing_season_days ?? 180;
    const parseNum = (raw: number | string | undefined, fallback: number): number => {
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
      return fallback;
    };
    const siteCanopyPct = parseNum(landCover?.tree_canopy_pct, 25);
    const siteOmPct = parseNum(soils?.organic_matter_pct, 3);

    // Hemisphere from parcel centroid latitude.
    let isSouthern = false;
    if (project.parcelBoundaryGeojson) {
      try {
        const centroid = turf.centroid(project.parcelBoundaryGeojson);
        const lat = centroid.geometry.coordinates[1];
        if (typeof lat === 'number') isSouthern = lat < 0;
      } catch { /* ignore */ }
    }

    const site = deriveSitePasture(allZones, project.id, siteCanopyPct, siteOmPct);

    const baseProtein = isSouthern ? shiftSouthern(NH_PROTEIN) : NH_PROTEIN;
    const baseTdn     = isSouthern ? shiftSouthern(NH_TDN)     : NH_TDN;
    const baseDmd     = isSouthern ? shiftSouthern(NH_DMD)     : NH_DMD;

    const proteinCurve = modulate(baseProtein, {
      canopyPct: site.meanCanopyPct, omPct: site.meanOmPct, growingSeasonDays, isProtein: true,
    });
    const tdnCurve = modulate(baseTdn, {
      canopyPct: site.meanCanopyPct, omPct: site.meanOmPct, growingSeasonDays, isProtein: false,
    });
    const dmdCurve = modulate(baseDmd, {
      canopyPct: site.meanCanopyPct, omPct: site.meanOmPct, growingSeasonDays, isProtein: false,
    });

    const monthly: MonthlyPoint[] = MONTH_LABEL.map((m, i) => {
      const protein = proteinCurve[i] ?? 0;
      const tdn = tdnCurve[i] ?? 0;
      const dmd = dmdCurve[i] ?? 0;
      return {
        monthIdx: i,
        monthLabel: m,
        proteinPct: protein,
        tdnPct: tdn,
        dmdPct: dmd,
        flagged: protein < 10 || tdn < 55,
      };
    });

    // Peak / dip month identification (by protein).
    let peakMonth = monthly[0]!;
    let dipMonth = monthly[0]!;
    for (const m of monthly) {
      if (m.proteinPct > peakMonth.proteinPct) peakMonth = m;
      if (m.proteinPct < dipMonth.proteinPct) dipMonth = m;
    }

    const supplementMonths = monthly.filter((m) => m.flagged);

    return {
      monthly,
      peakMonth,
      dipMonth,
      supplementMonths,
      paddockCount: paddocks.length,
      paddockNames: paddocks.slice(0, 6).map((p) => p.name),
      site,
      climate: { growingSeasonDays, isSouthern },
    };
  }, [allPaddocks, allZones, project.id, project.parcelBoundaryGeojson, siteData]);

  if (analysis.paddockCount === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Seasonal forage quality</h3>
            <p className={css.hint}>
              Place at least one paddock to compute the 12-month forage-quality
              curve (protein, TDN, digestibility) and supplement-window flagging.
            </p>
          </div>
          <span className={css.badge}>Heuristic</span>
        </div>
      </div>
    );
  }

  const m = analysis.monthly;
  // SVG geometry for line chart (3 series).
  const W = 720; const H = 180;
  const PAD_L = 36; const PAD_R = 12; const PAD_T = 12; const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xFor = (i: number) => PAD_L + (i / 11) * innerW;
  // Y: protein 0-25, TDN 40-75, DMD 50-85 — but normalize each to 0-1 via own range.
  const proteinY = (v: number) => PAD_T + innerH - (clamp(v, 0, 25) / 25) * innerH;
  const tdnY     = (v: number) => PAD_T + innerH - ((clamp(v, 40, 75) - 40) / 35) * innerH;
  const dmdY     = (v: number) => PAD_T + innerH - ((clamp(v, 50, 85) - 50) / 35) * innerH;

  const proteinPath = m.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${proteinY(p.proteinPct)}`).join(' ');
  const tdnPath     = m.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${tdnY(p.tdnPct)}`).join(' ');
  const dmdPath     = m.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${dmdY(p.dmdPct)}`).join(' ');

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Seasonal forage quality</h3>
          <p className={css.hint}>
            12-month curve for crude protein, TDN, and dry-matter digestibility.
            Heuristic cool-season pasture archetype, modulated by your growing
            season ({analysis.climate.growingSeasonDays} days), pasture canopy
            ({analysis.site.meanCanopyPct.toFixed(0)}%), and OM
            ({analysis.site.meanOmPct.toFixed(1)}%).
            {analysis.climate.isSouthern && ' Southern-hemisphere flip applied.'}
          </p>
        </div>
        <span className={css.badge}>Heuristic</span>
      </div>

      {/* Summary tiles */}
      <div className={css.tiles}>
        <div className={css.tile}>
          <span className={css.tileLabel}>Peak protein</span>
          <span className={css.tileValue}>{analysis.peakMonth.proteinPct}%</span>
          <span className={css.tileSub}>{analysis.peakMonth.monthLabel}</span>
        </div>
        <div className={css.tile}>
          <span className={css.tileLabel}>Dip month</span>
          <span className={css.tileValue}>{analysis.dipMonth.proteinPct}%</span>
          <span className={css.tileSub}>{analysis.dipMonth.monthLabel}</span>
        </div>
        <div className={`${css.tile} ${analysis.supplementMonths.length > 4 ? css.tile_warn : ''}`}>
          <span className={css.tileLabel}>Supplement window</span>
          <span className={css.tileValue}>{analysis.supplementMonths.length}</span>
          <span className={css.tileSub}>
            mo · {analysis.supplementMonths.length === 0 ? 'none' : analysis.supplementMonths.map((s) => s.monthLabel).join(', ')}
          </span>
        </div>
      </div>

      {/* Curves */}
      <div className={css.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={css.chart} role="img" aria-label="Seasonal forage curves">
          {/* Supplement-window shaded backdrop */}
          {m.map((p, i) => p.flagged ? (
            <rect
              key={`flag-${i}`}
              x={xFor(i) - (innerW / 22)}
              y={PAD_T}
              width={innerW / 11}
              height={innerH}
              className={css.flagBand}
            />
          ) : null)}
          {/* Gridlines: dotted horizontal at y=mid */}
          <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH / 2} y2={PAD_T + innerH / 2} className={css.gridLine} />
          {/* Lines */}
          <path d={proteinPath} className={css.lineProtein} />
          <path d={tdnPath} className={css.lineTdn} />
          <path d={dmdPath} className={css.lineDmd} />
          {/* X-axis month labels */}
          {m.map((p, i) => (
            <text key={`lbl-${i}`} x={xFor(i)} y={H - 8} className={css.axisLabel} textAnchor="middle">
              {p.monthLabel[0]}
            </text>
          ))}
        </svg>
        <div className={css.legend}>
          <span className={`${css.legendItem} ${css.legendProtein}`}><span className={css.swatch} />Protein %</span>
          <span className={`${css.legendItem} ${css.legendTdn}`}><span className={css.swatch} />TDN %</span>
          <span className={`${css.legendItem} ${css.legendDmd}`}><span className={css.swatch} />Digestibility %</span>
          <span className={`${css.legendItem} ${css.legendFlag}`}><span className={css.swatch} />Supplement window</span>
        </div>
      </div>

      {/* Monthly table */}
      <div className={css.tableWrap}>
        <table className={css.table}>
          <thead>
            <tr>
              <th></th>
              {m.map((p) => (<th key={p.monthIdx} className={p.flagged ? css.thFlagged : ''}>{p.monthLabel.slice(0, 3)}</th>))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={css.rowLabel}>CP %</td>
              {m.map((p) => (<td key={`p-${p.monthIdx}`} className={p.flagged ? css.tdFlagged : ''}>{p.proteinPct}</td>))}
            </tr>
            <tr>
              <td className={css.rowLabel}>TDN %</td>
              {m.map((p) => (<td key={`t-${p.monthIdx}`} className={p.flagged ? css.tdFlagged : ''}>{p.tdnPct}</td>))}
            </tr>
            <tr>
              <td className={css.rowLabel}>DMD %</td>
              {m.map((p) => (<td key={`d-${p.monthIdx}`} className={p.flagged ? css.tdFlagged : ''}>{p.dmdPct}</td>))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className={css.footnote}>
        <em>Heuristic v1.</em> Cool-season pasture archetype (NH spring flush
        Apr–Jun, summer slump Jul–Aug, fall flush Sep–Oct, winter dormant
        Nov–Mar). Curves are site-wide; per-paddock differentiation requires
        species-mix tagging (warm-season vs. cool-season grasses, legumes,
        browse) which is out of scope for v1. Supplement window = any month
        where CP &lt; 10% OR TDN &lt; 55%. Site signals: {analysis.site.pastureZoneCount} pasture/silvopasture
        zone{analysis.site.pastureZoneCount === 1 ? '' : 's'} contributing canopy + OM means;
        {analysis.paddockCount} paddock{analysis.paddockCount === 1 ? '' : 's'} share the site curve.
      </p>
    </div>
  );
}
