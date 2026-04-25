/**
 * §6 SeasonalShadowCard — per-month solar-noon shadow rollup across the year.
 *
 * Complements the existing ShadowFootprintsCard (which shows winter vs. summer
 * solstice noon shadow length per structure) by surfacing the full seasonal
 * arc: how shadow length grows from June minimum to December maximum, which
 * structures throw the longest winter shadows, and how many months any
 * structure exceeds 2× height shadow (a rough flag for chronic-shade impact
 * on downstream zones).
 *
 * Heuristic only — uses Spencer (1971) solar declination + flat-ground
 * assumption (no terrain). Tree shadows deferred until a canopy entity exists.
 */
import { useMemo } from 'react';
import { computeSunPath, summarizeSunPath } from '@ogden/shared';
import { type Structure } from '../../store/structureStore.js';
import { estimateStructureHeightM } from '../structures/footprints.js';
import css from './SeasonalShadowCard.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Mid-month day-of-year (Jan 15, Feb 15, ...) for representative noon altitude.
const MID_MONTH_DOY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];

interface MonthlyShadow {
  month: string;
  // Ratio of shadow length to structure height. Infinite when sun below horizon.
  ratio: number;
  altitudeDeg: number;
}

interface StructureProfile {
  id: string;
  name: string;
  type: string;
  heightM: number;
  monthly: MonthlyShadow[];
  winterAvgRatio: number; // mean of Nov/Dec/Jan/Feb (or May/Jun/Jul/Aug south)
  peakWinterLengthM: number;
  monthsOverTwo: number; // months with shadow > 2× height
}

function computeShadowRatio(latitude: number, dayOfYear: number): { ratio: number; altitudeDeg: number } {
  const path = computeSunPath(latitude, dayOfYear);
  const summary = summarizeSunPath(path);
  const altDeg = summary.solarNoon.elevation;
  if (altDeg <= 0.5) return { ratio: Number.POSITIVE_INFINITY, altitudeDeg: altDeg };
  const tanAlt = Math.tan((altDeg * Math.PI) / 180);
  if (tanAlt < 1e-4) return { ratio: Number.POSITIVE_INFINITY, altitudeDeg: altDeg };
  return { ratio: 1 / tanAlt, altitudeDeg: altDeg };
}

function buildStructureProfile(structure: Structure, latitude: number, ratiosByMonth: Array<{ ratio: number; altitudeDeg: number }>): StructureProfile {
  const heightM = estimateStructureHeightM(structure);
  const monthly: MonthlyShadow[] = ratiosByMonth.map((r, i) => ({
    month: MONTHS[i] ?? '',
    ratio: r.ratio,
    altitudeDeg: r.altitudeDeg,
  }));
  // "Winter" months — flip for southern hemisphere (sun lowest in Jun/Jul).
  const isSouth = latitude < 0;
  const winterIdx = isSouth ? [4, 5, 6, 7] : [10, 11, 0, 1];
  const winterRatios = winterIdx.map((i) => monthly[i]?.ratio ?? 0).filter((r) => Number.isFinite(r));
  const winterAvgRatio = winterRatios.length > 0 ? winterRatios.reduce((a, b) => a + b, 0) / winterRatios.length : 0;
  const peakWinterRatio = winterIdx.reduce((max, i) => {
    const r = monthly[i]?.ratio ?? 0;
    return Number.isFinite(r) && r > max ? r : max;
  }, 0);
  const monthsOverTwo = monthly.filter((m) => Number.isFinite(m.ratio) && m.ratio > 2).length;
  return {
    id: structure.id,
    name: structure.name,
    type: structure.type,
    heightM,
    monthly,
    winterAvgRatio,
    peakWinterLengthM: peakWinterRatio * heightM,
    monthsOverTwo,
  };
}

function fmtMeters(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m > 999) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(1)} m`;
}

function fmtRatio(r: number): string {
  if (!Number.isFinite(r)) return '∞';
  return `${r.toFixed(1)}×`;
}

interface Props {
  structures: Structure[];
  lat: number;
}

export default function SeasonalShadowCard({ structures, lat }: Props) {
  const ratiosByMonth = useMemo(
    () => MID_MONTH_DOY.map((doy) => computeShadowRatio(lat, doy)),
    [lat],
  );

  const profiles = useMemo(
    () => structures.map((st) => buildStructureProfile(st, lat, ratiosByMonth)),
    [structures, lat, ratiosByMonth],
  );

  if (structures.length === 0) {
    return (
      <div className={css.card}>
        <p className={css.empty}>
          Place at least one structure to see the seasonal shadow arc — winter
          solar-noon shadows can be 4–8× longer than summer at temperate latitudes,
          which is the difference between a productive understory and a chronic
          dead zone.
        </p>
      </div>
    );
  }

  // Site-mean monthly shadow ratio across all structures (excluding ∞).
  const siteMonthly = MONTHS.map((label, i) => {
    const finite = profiles
      .map((p) => p.monthly[i]?.ratio ?? 0)
      .filter((r) => Number.isFinite(r));
    const mean = finite.length > 0 ? finite.reduce((a, b) => a + b, 0) / finite.length : 0;
    const altitude = ratiosByMonth[i]?.altitudeDeg ?? 0;
    return { label, mean, altitude };
  });
  const maxRatio = Math.max(...siteMonthly.map((s) => s.mean), 1);

  // Tallest structure
  const tallest = profiles.reduce((max, p) => (p.heightM > max.heightM ? p : max), profiles[0]!);
  // Annual mean shadow length (across all months × all structures, ignoring ∞)
  const allFinite = profiles.flatMap((p) => p.monthly.map((m) => m.ratio).filter((r) => Number.isFinite(r)));
  const annualMeanRatio = allFinite.length > 0 ? allFinite.reduce((a, b) => a + b, 0) / allFinite.length : 0;
  const annualMeanLengthM = annualMeanRatio * (profiles.reduce((s, p) => s + p.heightM, 0) / profiles.length);
  // Site winter peak — max of any structure's peak winter shadow length
  const sitePeakWinterLengthM = profiles.reduce((max, p) => (p.peakWinterLengthM > max ? p.peakWinterLengthM : max), 0);
  // Months any structure exceeds 2× shadow
  const anyMonthOverTwo = MONTHS.filter((_, i) => profiles.some((p) => {
    const r = p.monthly[i]?.ratio ?? 0;
    return Number.isFinite(r) && r > 2;
  })).length;

  // Top-3 winter shadow casters
  const topWinter = [...profiles]
    .filter((p) => Number.isFinite(p.winterAvgRatio) && p.winterAvgRatio > 0)
    .sort((a, b) => b.peakWinterLengthM - a.peakWinterLengthM)
    .slice(0, 3);

  return (
    <div className={css.card}>
      <p className={css.hint}>
        Solar-noon shadow length per structure across the 12-month arc. Winter
        shadows can stretch 4–8× longer than summer at temperate latitudes — use
        this rollup to spot chronic-shade conflicts upstream of crop or solar
        zones, not just at the solstice extremes.
      </p>

      <div className={css.statRow}>
        <div className={css.stat}>
          <div className={css.statLabel}>Tallest</div>
          <div className={css.statValue}>{tallest.heightM.toFixed(1)} m</div>
          <div className={css.statSub}>{tallest.name}</div>
        </div>
        <div className={css.stat}>
          <div className={css.statLabel}>Annual avg shadow</div>
          <div className={css.statValue}>{fmtMeters(annualMeanLengthM)}</div>
          <div className={css.statSub}>noon, all structures</div>
        </div>
        <div className={css.stat}>
          <div className={css.statLabel}>Winter peak</div>
          <div className={css.statValue}>{fmtMeters(sitePeakWinterLengthM)}</div>
          <div className={css.statSub}>longest single structure</div>
        </div>
        <div className={css.stat}>
          <div className={css.statLabel}>Months {'>'} 2×</div>
          <div className={css.statValue}>{anyMonthOverTwo} <span className={css.statUnit}>/12</span></div>
          <div className={css.statSub}>at least one structure</div>
        </div>
      </div>

      <div className={css.chartBlock}>
        <div className={css.chartHead}>
          <div className={css.chartTitle}>Site-mean noon shadow ratio (× height)</div>
          <div className={css.chartHint}>shadow length ÷ structure height; bars darken when sun is low</div>
        </div>
        <div className={css.barGroup} role="img" aria-label="Monthly shadow ratio">
          {siteMonthly.map((m) => {
            const display = Math.min(m.mean, 8);
            const heightPct = Math.max(4, (display / Math.max(maxRatio, 1)) * 100);
            const tone = m.mean > 3 ? css.barWinter : m.mean > 1.5 ? css.barShoulder : css.barSummer;
            return (
              <div key={m.label} className={css.barCol}>
                <div className={css.barTrack}>
                  <div className={`${css.bar} ${tone}`} style={{ height: `${heightPct}%` }} title={`${fmtRatio(m.mean)} at ${m.altitude.toFixed(0)}° solar altitude`} />
                </div>
                <div className={css.barLabel}>{m.label}</div>
                <div className={css.barRatio}>{fmtRatio(m.mean)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={css.castersBlock}>
        <div className={css.chartHead}>
          <div className={css.chartTitle}>Top winter shadow casters</div>
          <div className={css.chartHint}>ranked by peak winter noon shadow length</div>
        </div>
        {topWinter.length === 0 ? (
          <p className={css.empty}>No structures cast meaningful winter shadows at this latitude.</p>
        ) : (
          <ul className={css.casterList}>
            {topWinter.map((p) => (
              <li key={p.id} className={css.caster}>
                <div className={css.casterHead}>
                  <div>
                    <div className={css.casterName}>{p.name}</div>
                    <div className={css.casterType}>{p.type.replace(/_/g, ' ')} · {p.heightM.toFixed(1)} m</div>
                  </div>
                  <div className={css.casterMetrics}>
                    <div className={css.casterPeak}>{fmtMeters(p.peakWinterLengthM)}</div>
                    <div className={css.casterPeakLabel}>winter peak</div>
                  </div>
                </div>
                <div className={css.spark}>
                  {p.monthly.map((m, i) => {
                    const cap = Math.min(Number.isFinite(m.ratio) ? m.ratio : 8, 8);
                    const h = Math.max(3, (cap / 8) * 100);
                    return (
                      <div
                        key={i}
                        className={css.sparkBar}
                        style={{ height: `${h}%`, opacity: m.altitudeDeg > 30 ? 0.55 : 0.9 }}
                        title={`${m.month}: ${fmtRatio(m.ratio)}`}
                      />
                    );
                  })}
                </div>
                <div className={css.casterFlags}>
                  {p.monthsOverTwo >= 6 && <span className={css.flag}>chronic long shadow ({p.monthsOverTwo}/12 months &gt; 2×)</span>}
                  {!Number.isFinite(p.peakWinterLengthM) && <span className={css.flag}>polar winter — sun below horizon</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={css.footnote}>
        Heights are template estimates from <em>estimateStructureHeightM</em>. Shadow length
        ≈ height ÷ tan(solar altitude) at solar noon, mid-month. Flat-ground assumption — terrain
        slope and tree canopies are not modelled. Use alongside the Shadow Footprints card above
        for solstice extremes.
      </p>
    </div>
  );
}
