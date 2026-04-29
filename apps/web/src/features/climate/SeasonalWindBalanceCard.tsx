/**
 * §6 SeasonalWindBalanceCard — winter shelter vs summer ventilation tradeoff.
 *
 * The existing WindCorridorAuditCard scores annual exposure and the
 * WindbreakCandidatesCard suggests placement perpendicular to the *annual*
 * prevailing wind. Both miss the dual-season planning question: a windbreak
 * sized to block winter cold winds may also block the summer breeze a passive
 * ventilation strategy depends on. This card collapses the seasonal wind-rose
 * frequencies into a winter prevailing direction and a summer prevailing
 * direction, computes the angular separation, and classifies the parcel as
 * *complementary* (winter and summer winds come from opposite sides — windbreaks
 * are a free lunch), *workable* (perpendicular winds — partial conflict),
 * or *conflict* (winter and summer winds come from nearly the same arc — every
 * winter windbreak costs you summer cooling).
 *
 * Pure derivation from WindRoseData.seasonal — no map mutation, no entity
 * writes, no shared-package math.
 */
import { useMemo } from 'react';
import type { WindRoseData } from '../../lib/layerFetcher.js';
import css from './SeasonalWindBalanceCard.module.css';

interface SeasonalWindBalanceCardProps {
  windRose: WindRoseData | null;
}

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

const COMPASS_AZIMUTH: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

type Verdict = 'complementary' | 'workable' | 'conflict' | 'unknown';

interface SeasonalReading {
  season: 'Winter' | 'Summer';
  prevailing: string | null;
  azimuth: number | null;
  share: number; // 0-1 fraction of observations from prevailing 3-bin arc
  topThree: string[];
}

function prevailingFromArr(arr: number[] | undefined): { dir: string | null; share: number; topThree: string[] } {
  if (!arr || arr.length !== 16) return { dir: null, share: 0, topThree: [] };
  let bestIdx = -1;
  let bestVal = 0;
  for (let i = 0; i < 16; i++) {
    const v = arr[i] ?? 0;
    if (v > bestVal) { bestVal = v; bestIdx = i; }
  }
  if (bestIdx < 0) return { dir: null, share: 0, topThree: [] };

  // Three-bin arc centred on the peak (handles wraparound)
  const left = (bestIdx + 15) % 16;
  const right = (bestIdx + 1) % 16;
  const arcShare = (arr[left] ?? 0) + (arr[bestIdx] ?? 0) + (arr[right] ?? 0);

  const ranked = arr
    .map((v, i) => ({ v: v ?? 0, dir: COMPASS_16[i] ?? '' }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .filter((x) => x.v > 0)
    .map((x) => x.dir);

  return { dir: COMPASS_16[bestIdx] ?? null, share: arcShare, topThree: ranked };
}

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function verdictFor(sep: number | null): Verdict {
  if (sep == null) return 'unknown';
  if (sep >= 120) return 'complementary';
  if (sep >= 60) return 'workable';
  return 'conflict';
}

const VERDICT_COPY: Record<Verdict, { label: string; tone: string; note: string }> = {
  complementary: {
    label: 'Complementary',
    tone: 'good',
    note: 'Winter and summer winds approach from opposite arcs. Windbreaks placed on the cold side will not block summer cross-ventilation — design for both seasons independently.',
  },
  workable: {
    label: 'Workable',
    tone: 'mid',
    note: 'Winter and summer winds approach from perpendicular arcs. Windbreaks can be tuned (height, density, gaps) to favour winter sheltering without fully closing summer airflow, but expect tradeoffs.',
  },
  conflict: {
    label: 'Conflict',
    tone: 'bad',
    note: 'Winter and summer winds share a similar arc. Every windbreak placed for cold-season shelter also blocks the cooling breeze. Prefer deciduous species, vertical louvres, or strategic gaps over solid evergreen rows.',
  },
  unknown: {
    label: 'Unknown',
    tone: 'mid',
    note: 'Seasonal wind data is not available for this parcel.',
  },
};

export default function SeasonalWindBalanceCard({ windRose }: SeasonalWindBalanceCardProps) {
  const reading = useMemo(() => {
    if (!windRose?.seasonal) {
      return {
        winter: null as SeasonalReading | null,
        summer: null as SeasonalReading | null,
        separation: null as number | null,
        verdict: 'unknown' as Verdict,
      };
    }

    const w = prevailingFromArr(windRose.seasonal.winter);
    const s = prevailingFromArr(windRose.seasonal.summer);

    const winterAz = w.dir ? (COMPASS_AZIMUTH[w.dir] ?? null) : null;
    const summerAz = s.dir ? (COMPASS_AZIMUTH[s.dir] ?? null) : null;

    const winter: SeasonalReading | null = w.dir ? {
      season: 'Winter',
      prevailing: w.dir,
      azimuth: winterAz,
      share: w.share,
      topThree: w.topThree,
    } : null;

    const summer: SeasonalReading | null = s.dir ? {
      season: 'Summer',
      prevailing: s.dir,
      azimuth: summerAz,
      share: s.share,
      topThree: s.topThree,
    } : null;

    const separation = (winterAz != null && summerAz != null)
      ? angularSeparation(winterAz, summerAz)
      : null;

    return {
      winter,
      summer,
      separation,
      verdict: verdictFor(separation),
    };
  }, [windRose]);

  const verdict = VERDICT_COPY[reading.verdict];
  const verdictClass =
    verdict.tone === 'good' ? css.verdictGood :
    verdict.tone === 'bad' ? css.verdictBad :
    css.verdictMid;

  const hasData = reading.winter != null || reading.summer != null;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Seasonal Wind Balance</h3>
          <p className={css.hint}>
            Winter shelter vs summer ventilation — does this parcel let you have both,
            or do windbreaks force a tradeoff?
          </p>
        </div>
        <span className={css.badge}>HEURISTIC</span>
      </div>

      {!hasData ? (
        <p className={css.empty}>
          Seasonal wind data unavailable. The nearest weather station does not provide
          monthly bins, or the climate layer has not been fetched yet.
        </p>
      ) : (
        <>
          <div className={css.seasonGrid}>
            <SeasonBlock reading={reading.winter} icon={'\u2744'} accent="cold" />
            <SeasonBlock reading={reading.summer} icon={'\u2600'} accent="warm" />
          </div>

          {reading.separation != null && (
            <div className={`${css.verdict} ${verdictClass}`}>
              <div className={css.verdictHead}>
                <span className={css.verdictLabel}>{verdict.label}</span>
                <span className={css.verdictSep}>
                  {Math.round(reading.separation)}{'\u00B0'} apart
                </span>
              </div>
              <p className={css.verdictNote}>{verdict.note}</p>
            </div>
          )}

          {reading.winter && reading.summer && (
            <div className={css.guide}>
              <div className={css.guideRow}>
                <span className={css.guideLabel}>Windbreak arc</span>
                <span className={css.guideVal}>
                  {'\u00B1'}45{'\u00B0'} of {reading.winter.prevailing}
                </span>
              </div>
              <div className={css.guideRow}>
                <span className={css.guideLabel}>Keep open for cooling</span>
                <span className={css.guideVal}>
                  {'\u00B1'}45{'\u00B0'} of {reading.summer.prevailing}
                </span>
              </div>
              <div className={css.guideRow}>
                <span className={css.guideLabel}>Calm fraction</span>
                <span className={css.guideVal}>
                  {windRose?.calm_pct != null ? `${windRose.calm_pct.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <p className={css.footnote}>
        <strong>Method.</strong> Winter (DJF) and Summer (JJA) frequencies are taken
        from the station&apos;s 16-point wind rose. The peak bin per season defines
        the prevailing direction; the three-bin arc share around it indicates how
        concentrated the wind is. Angular separation between winter and summer
        peaks classifies the tradeoff: <em>{'\u2265'}120{'\u00B0'}</em> complementary,
        <em> 60-120{'\u00B0'}</em> workable, <em>{'<'}60{'\u00B0'}</em> conflict.
      </p>
    </div>
  );
}

function SeasonBlock({
  reading,
  icon,
  accent,
}: {
  reading: SeasonalReading | null;
  icon: string;
  accent: 'cold' | 'warm';
}) {
  if (!reading || !reading.prevailing) {
    return (
      <div className={`${css.season} ${accent === 'cold' ? css.seasonCold : css.seasonWarm}`}>
        <div className={css.seasonHead}>
          <span className={css.seasonIcon}>{icon}</span>
          <span className={css.seasonName}>{accent === 'cold' ? 'Winter' : 'Summer'}</span>
        </div>
        <div className={css.seasonEmpty}>No data</div>
      </div>
    );
  }

  return (
    <div className={`${css.season} ${accent === 'cold' ? css.seasonCold : css.seasonWarm}`}>
      <div className={css.seasonHead}>
        <span className={css.seasonIcon}>{icon}</span>
        <span className={css.seasonName}>{reading.season}</span>
      </div>
      <div className={css.seasonDir}>{reading.prevailing}</div>
      <div className={css.seasonShare}>
        {Math.round(reading.share * 100)}% from {reading.prevailing}{'\u00B1'}1 bin
      </div>
      {reading.topThree.length > 1 && (
        <div className={css.seasonTop}>
          Top: {reading.topThree.join(' \u00B7 ')}
        </div>
      )}
    </div>
  );
}
