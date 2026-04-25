/**
 * ZoneSeasonalityRollup — §8 dashboard card that summarizes how the
 * project's zones are scheduled across the year. Pairs with the existing
 * §7 ZoneEcologyRollup so stewards can see "what's where" alongside
 * "what's active when".
 *
 * Renders a stacked acres-by-seasonality bar with an "Untagged" bucket,
 * plus a tiny per-month coverage strip showing what fraction of the
 * project's tagged-zone acreage is "in use" each month — useful for
 * spotting seasonal labor peaks and dead months.
 *
 * Pure presentation: zone seasonality tags drive the rollup, no scoring
 * engine involvement.
 *
 * Spec: §8 `seasonal-temporary-phased-use-zones` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useZoneStore,
  SEASONALITY_LABELS,
  SEASONALITY_COLORS,
  type Seasonality,
} from '../../store/zoneStore.js';
import css from './ZoneSeasonalityRollup.module.css';

interface Props {
  projectId: string;
}

const M2_PER_ACRE = 4046.8564224;

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/**
 * Which months a given seasonality bucket counts as "active" — used for
 * the per-month coverage strip. Northern-hemisphere convention; we don't
 * yet flip for the southern hemisphere here because the §14 climate
 * latitude derivation isn't wired into ZoneStore. Stewards in the SH
 * can read summer/winter as "inverse" — the per-bucket bar is still
 * accurate.
 */
const ACTIVE_MONTHS: Record<Seasonality, boolean[]> = {
  // J F M A M J J A S O N D
  year_round:  [true, true, true, true, true, true, true, true, true, true, true, true],
  summer:      [false, false, false, false, true, true, true, true, false, false, false, false],
  winter:      [true, true, false, false, false, false, false, false, false, false, true, true],
  spring_fall: [false, false, true, true, true, false, false, false, true, true, true, false],
  // Temporary use: counted once across the year as "ambient presence" so
  // it doesn't dominate the monthly strip — split evenly across April-Oct
  // (typical event window for an outdoor-program retreat).
  temporary:   [false, false, false, true, true, true, true, true, true, true, false, false],
};

export default function ZoneSeasonalityRollup({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);

  const { totalAc, byBucket, monthlyAc, taggedAc, zoneCount } = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === projectId);
    const total = zones.reduce((sum, z) => sum + (z.areaM2 ?? 0), 0) / M2_PER_ACRE;

    const bucket: Record<Seasonality | 'untagged', number> = {
      year_round: 0,
      summer: 0,
      winter: 0,
      spring_fall: 0,
      temporary: 0,
      untagged: 0,
    };

    const monthly = new Array<number>(12).fill(0);
    let tagged = 0;

    for (const z of zones) {
      const ac = (z.areaM2 ?? 0) / M2_PER_ACRE;
      if (z.seasonality) {
        bucket[z.seasonality] += ac;
        tagged += ac;
        const months = ACTIVE_MONTHS[z.seasonality];
        for (let m = 0; m < 12; m++) {
          if (months[m]) monthly[m] += ac;
        }
      } else {
        bucket.untagged += ac;
      }
    }

    return {
      totalAc: total,
      byBucket: bucket,
      monthlyAc: monthly,
      taggedAc: tagged,
      zoneCount: zones.length,
    };
  }, [allZones, projectId]);

  if (zoneCount === 0) {
    return (
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SEASONAL &amp; PHASED USE</h3>
        <div className={css.empty}>
          Draw zones on the map and tag each one with a seasonal-use
          pattern (year-round, summer-only, winter-only, spring/fall, or
          temporary). This card will roll up acres by season and show a
          per-month coverage strip.
        </div>
      </div>
    );
  }

  const safeTotal = totalAc > 0 ? totalAc : 1;
  const monthPeak = Math.max(...monthlyAc, taggedAc > 0 ? taggedAc : 1);

  // Find the lowest-coverage month for the steward's narrative — useful
  // for identifying dead seasons that could host temporary programming.
  let minIdx = 0;
  let minVal = Infinity;
  let maxIdx = 0;
  let maxVal = -Infinity;
  for (let m = 0; m < 12; m++) {
    if (monthlyAc[m]! < minVal) { minVal = monthlyAc[m]!; minIdx = m; }
    if (monthlyAc[m]! > maxVal) { maxVal = monthlyAc[m]!; maxIdx = m; }
  }

  const segments: { key: string; label: string; acres: number; color: string }[] = [
    { key: 'year_round', label: SEASONALITY_LABELS.year_round, acres: byBucket.year_round, color: SEASONALITY_COLORS.year_round },
    { key: 'spring_fall', label: SEASONALITY_LABELS.spring_fall, acres: byBucket.spring_fall, color: SEASONALITY_COLORS.spring_fall },
    { key: 'summer', label: SEASONALITY_LABELS.summer, acres: byBucket.summer, color: SEASONALITY_COLORS.summer },
    { key: 'winter', label: SEASONALITY_LABELS.winter, acres: byBucket.winter, color: SEASONALITY_COLORS.winter },
    { key: 'temporary', label: SEASONALITY_LABELS.temporary, acres: byBucket.temporary, color: SEASONALITY_COLORS.temporary },
    { key: 'untagged', label: 'Untagged', acres: byBucket.untagged, color: 'rgba(255,255,255,0.08)' },
  ];

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>SEASONAL &amp; PHASED USE</h3>

      <div className={css.block}>
        <div className={css.blockHeader}>
          <span className={css.blockTitle}>Acres by season</span>
          <span className={css.blockMeta}>{zoneCount} zones \u00B7 {totalAc.toFixed(1)} ac total</span>
        </div>
        <div className={css.barTrack}>
          {segments.map((seg) =>
            seg.acres > 0 ? (
              <div
                key={seg.key}
                className={css.barSeg}
                style={{
                  width: `${(seg.acres / safeTotal) * 100}%`,
                  background: seg.color,
                }}
                title={`${seg.label}: ${seg.acres.toFixed(1)} ac`}
              />
            ) : null,
          )}
        </div>
        <div className={css.legend}>
          {segments.map((seg) => (
            <div key={seg.key} className={css.legendRow}>
              <span className={css.legendSwatch} style={{ background: seg.color }} />
              <span className={css.legendLabel}>{seg.label}</span>
              <span className={css.legendValue}>
                {seg.acres.toFixed(1)} ac
                {totalAc > 0 ? ` (${((seg.acres / totalAc) * 100).toFixed(0)}%)` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-month coverage strip — only meaningful once at least one
          zone is tagged, otherwise we'd render twelve empty cells and a
          confusing "0 acres each month" message. */}
      {taggedAc > 0 && (
        <div className={css.block}>
          <div className={css.blockHeader}>
            <span className={css.blockTitle}>Tagged-acre activity by month</span>
            <span className={css.blockMeta}>NH calendar</span>
          </div>
          <div className={css.monthStrip}>
            {MONTH_LABELS.map((label, i) => {
              const ac = monthlyAc[i] ?? 0;
              const pct = monthPeak > 0 ? (ac / monthPeak) * 100 : 0;
              return (
                <div
                  key={`${label}-${i}`}
                  className={css.monthCell}
                  title={`${label} \u2014 ${ac.toFixed(1)} ac active`}
                >
                  <div
                    className={css.monthBar}
                    style={{
                      height: `${pct}%`,
                      background: pct > 0 ? SEASONALITY_COLORS.year_round : 'transparent',
                    }}
                  />
                  <span className={css.monthLabel}>{label}</span>
                </div>
              );
            })}
          </div>
          <div className={css.hint}>
            Peak: <strong>{MONTH_LABELS[maxIdx]}</strong> ({maxVal.toFixed(1)} ac)
            \u00A0\u00B7\u00A0
            Quietest: <strong>{MONTH_LABELS[minIdx]}</strong> ({minVal.toFixed(1)} ac).
            Dead months are good slots for temporary / event programming.
          </div>
        </div>
      )}

      <div className={css.hint}>
        Tags are captured from the Zones panel \u2014 each zone has a
        &ldquo;Tag&rdquo; button that opens the seasonal-use selector
        alongside invasive pressure and succession stage. Untagged zones
        sit in the &ldquo;Untagged&rdquo; bucket above and are excluded
        from the monthly strip.
      </div>
    </div>
  );
}
