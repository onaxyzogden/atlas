/**
 * FertilityColocationCard — Plan Module 6 (Soil & Fertility), readout.
 *
 * Closed-loop proximity check. Permaculture short-loop discipline:
 * guilds that depend on heavy mulch / compost / chop-and-drop input
 * should sit *near* the fertility infrastructure that feeds them,
 * inside a walking radius. PDC Zone 1 / Zone 2 framing maps roughly
 * to:
 *   - close   ≤ 25 m  (Zone 1, daily reach)
 *   - medium  25–75 m (Zone 2, weekly reach)
 *   - far     > 75 m  (Zone 3+ — heavier hauls or a moved unit)
 *
 * Reads `polycultureStore.guilds` + `closedLoopStore.fertilityInfra`
 * (both have absolute `center: [lng, lat]`), computes nearest
 * fertility unit per placed guild via haversine, buckets the result.
 *
 * Cap discipline (asymmetric rule, established Phase B):
 *   - This is a *readout* card. Both the guild slice and the
 *     fertility slice run through `usePhaseStoreCappedEntities`,
 *     so on `phase-1` / `phase-2` views entities whose BuildPhase's
 *     `yeomansCap` exceeds the view cap drop out.
 *   - Registration cards (GuildSpatialBuilderCard,
 *     SoilFertilityDesignerCard) stay uncapped.
 *
 * Unplaced guilds (no `center`) and guilds whose nearest fertility
 * unit doesn't exist at this view land in the "Unplaced or unpaired"
 * bucket — the steward needs to see them to act, not have them
 * silently filtered.
 *
 * See wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  usePolycultureStore,
  type Guild,
} from '../../../../store/polycultureStore.js';
import {
  useClosedLoopStore,
  type FertilityInfra,
  type FertilityInfraType,
} from '../../../../store/closedLoopStore.js';
import { findSpecies } from '../../../../data/plantDatabase.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import { haversineM } from '../../../../lib/geo.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// Tunable. Centralised so a future steward request to widen Zone 1
// is a one-line change.
const BUCKET_CLOSE_M = 25;
const BUCKET_MEDIUM_M = 75;

type BucketKey = 'close' | 'medium' | 'far' | 'unpaired';

const BUCKET_LABEL: Record<BucketKey, string> = {
  close:    'Close (≤ 25 m)',
  medium:   'Medium (25–75 m)',
  far:      'Far (> 75 m)',
  unpaired: 'Unplaced or unpaired',
};

const FERTILITY_LABEL: Record<FertilityInfraType, string> = {
  composter:           'composter',
  hugelkultur:         'hugelkultur',
  biochar:             'biochar kiln',
  worm_bin:            'worm bin',
  cover_crop:          'cover crop',
  chop_and_drop:       'chop-and-drop',
  dynamic_accumulator: 'dynamic accumulator',
  rotational_grazing:  'rotational grazing',
};

function anchorLabelFor(g: Guild): string {
  const anchor = findSpecies(g.anchorSpeciesId);
  if (!anchor) return g.anchorSpeciesId || 'No anchor';
  return anchor.commonName;
}

interface GuildRow {
  id: string;
  anchorLabel: string;
  bucket: BucketKey;
  /** Distance in metres to nearest fertility unit. null if no
   *  fertility unit available or guild itself unplaced. */
  distanceM: number | null;
  /** Type of the nearest fertility unit. null if no pairing. */
  nearestType: FertilityInfraType | null;
}

function bucketFor(distanceM: number): BucketKey {
  if (distanceM <= BUCKET_CLOSE_M) return 'close';
  if (distanceM <= BUCKET_MEDIUM_M) return 'medium';
  return 'far';
}

export default function FertilityColocationCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);

  const guildsRaw = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );
  const fertilityRaw = useMemo(
    () => allFertility.filter((f) => f.projectId === project.id),
    [allFertility, project.id],
  );
  const guilds = usePhaseStoreCappedEntities(guildsRaw);
  const fertility = usePhaseStoreCappedEntities(fertilityRaw);

  const rows: GuildRow[] = useMemo(() => {
    const placedFertility: FertilityInfra[] = fertility.filter((f) => !!f.center);
    return guilds.map((g) => {
      const anchorLabel = anchorLabelFor(g);
      if (!g.center || placedFertility.length === 0) {
        return { id: g.id, anchorLabel, bucket: 'unpaired', distanceM: null, nearestType: null };
      }
      let bestM = Infinity;
      let bestType: FertilityInfraType | null = null;
      for (const f of placedFertility) {
        const d = haversineM(g.center, f.center);
        if (d < bestM) {
          bestM = d;
          bestType = f.type;
        }
      }
      return {
        id: g.id,
        anchorLabel,
        bucket: bucketFor(bestM),
        distanceM: bestM,
        nearestType: bestType,
      };
    });
  }, [guilds, fertility]);

  /**
   * Reverse view: for each visible+placed fertility unit, the list of
   * guilds within Zone-2 reach (≤ 75 m) it could plausibly serve.
   * Surfaces the load-balance question the forward view can't: a
   * composter sitting next to zero guilds is over-resourced for its
   * location; one unit serving every guild is a single point of
   * failure for the closed loop. Units with no guilds in range still
   * render so the steward sees the orphan case.
   */
  const byFertility = useMemo(() => {
    const placedGuildEntries = guilds
      .filter((g) => !!g.center)
      .map((g) => ({ id: g.id, anchorLabel: anchorLabelFor(g), center: g.center as [number, number] }));
    const placedFertility = fertility.filter((f) => !!f.center);
    return placedFertility.map((f) => {
      const served = placedGuildEntries
        .map((g) => ({
          id: g.id,
          anchorLabel: g.anchorLabel,
          distanceM: haversineM(g.center, f.center),
        }))
        .filter((s) => s.distanceM <= BUCKET_MEDIUM_M)
        .sort((a, b) => a.distanceM - b.distanceM);
      return { id: f.id, type: f.type, served };
    }).sort((a, b) => b.served.length - a.served.length);
  }, [guilds, fertility]);

  const overall = useMemo(() => {
    const total = rows.length;
    const close = rows.filter((r) => r.bucket === 'close').length;
    const unpaired = rows.filter((r) => r.bucket === 'unpaired').length;
    const distances = rows.map((r) => r.distanceM).filter((d): d is number => d != null).sort((a, b) => a - b);
    let median: number | null = null;
    if (distances.length > 0) {
      const mid = Math.floor(distances.length / 2);
      if (distances.length % 2 === 1) {
        median = distances[mid] ?? null;
      } else {
        const a = distances[mid - 1] ?? 0;
        const b = distances[mid] ?? 0;
        median = Math.round((a + b) / 2);
      }
    }
    const placedPct = total === 0 ? 0 : Math.round((close / total) * 100);
    return {
      total,
      fertilityCount: fertility.length,
      close,
      unpaired,
      median,
      placedPct,
    };
  }, [rows, fertility.length]);

  function pillClassFor(score: number): string {
    if (score >= 70) return styles.pillMet ?? '';
    if (score >= 30) return styles.pillPartial ?? '';
    return styles.pillUnmet ?? '';
  }

  const bucketOrder: BucketKey[] = ['close', 'medium', 'far', 'unpaired'];
  const bucketRows: Record<BucketKey, GuildRow[]> = {
    close:    rows.filter((r) => r.bucket === 'close'),
    medium:   rows.filter((r) => r.bucket === 'medium'),
    far:      rows.filter((r) => r.bucket === 'far'),
    unpaired: rows.filter((r) => r.bucket === 'unpaired'),
  };

  const emptyAll = guildsRaw.length === 0 && fertilityRaw.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 6 · Soil &amp; Fertility</span>
        <h1 className={styles.title}>Fertility colocation</h1>
        <p className={styles.lede}>
          For each visible guild, the nearest fertility unit
          (composter, biochar kiln, hugelkultur, worm bin, cover crop,
          chop-and-drop, dynamic accumulator, rotational-grazing
          paddock) by haversine distance, bucketed into Zone-1
          (≤ 25 m) / Zone-2 (25–75 m) / Zone-3+ (&gt; 75 m). Guilds
          without a centroid, or guilds in a view with no fertility
          infrastructure placed, land in <em>Unplaced or unpaired</em>.
          Year 1 / Year 5 views cap both stores per the Scale of
          Permanence; Current / Vision views show everything. The
          <em> By fertility unit</em> section flips the pairing —
          per unit, which guilds it could plausibly serve — so the
          steward catches over-resourced or single-point-of-failure
          units.
        </p>
      </header>

      {emptyAll ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No guilds or fertility infrastructure placed for this
            project yet. Use the Guild Builder (Plant Systems) and the
            Soil-Fertility Designer to compose and place them, then
            return here to see the proximity rollup.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Overall
              <span
                className={`${styles.pill} ${pillClassFor(overall.placedPct)}`}
                style={{ marginLeft: 8 }}
              >
                {overall.placedPct}% close
              </span>
            </h2>
            <div className={styles.statRow}>
              <span>Guilds visible at this view</span>
              <span>{overall.total}</span>
            </div>
            <div className={styles.statRow}>
              <span>Fertility units visible at this view</span>
              <span>{overall.fertilityCount}</span>
            </div>
            <div className={styles.statRow}>
              <span>In Zone-1 walking radius (≤ 25 m)</span>
              <span>{overall.close} / {overall.total}</span>
            </div>
            <div className={styles.statRow}>
              <span>Unpaired (no centroid, or no fertility in view)</span>
              <span>{overall.unpaired}</span>
            </div>
            {overall.median != null && (
              <div className={styles.statRow}>
                <span>Median nearest distance</span>
                <span>{overall.median} m</span>
              </div>
            )}
          </section>

          {bucketOrder.map((key) => {
            const items = bucketRows[key];
            const total = items.length;
            // Close = good; far/unpaired = warm/unmet.
            const score =
              key === 'close'    ? 100 :
              key === 'medium'   ? 60  :
              key === 'far'      ? 20  :
                                    0;
            return (
              <section key={key} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {BUCKET_LABEL[key]}
                  <span
                    className={`${styles.pill} ${pillClassFor(score)}`}
                    style={{ marginLeft: 8 }}
                  >
                    {total} guild{total === 1 ? '' : 's'}
                  </span>
                </h2>

                {total === 0 && key === 'close' && (
                  <p className={styles.empty} style={{ marginTop: 0 }}>
                    No guilds are in Zone-1 reach of any fertility
                    unit yet. Move a composter or worm bin closer to
                    a high-input guild to shorten the loop.
                  </p>
                )}
                {total === 0 && key !== 'close' && (
                  <p className={styles.listMeta} style={{ marginTop: 0 }}>
                    — none —
                  </p>
                )}

                {total > 0 && (
                  <ul className={styles.list}>
                    {items.map((row) => (
                      <li key={row.id} className={styles.listRow}>
                        <div>
                          <strong>{row.anchorLabel}</strong>
                          <span
                            className={styles.listMeta}
                            style={{ marginLeft: 8 }}
                          >
                            {row.nearestType
                              ? `· nearest ${FERTILITY_LABEL[row.nearestType]}`
                              : '· no fertility paired'}
                          </span>
                        </div>
                        <span
                          className={`${styles.pill} ${
                            row.bucket === 'close'
                              ? styles.pillMet ?? ''
                              : row.bucket === 'medium'
                                ? styles.pillPartial ?? ''
                                : styles.pillUnmet ?? ''
                          }`}
                        >
                          {row.distanceM != null ? `${Math.round(row.distanceM)} m` : 'unpaired'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {byFertility.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                By fertility unit
                <span
                  className={`${styles.pill} ${styles.pillPartial ?? ''}`}
                  style={{ marginLeft: 8 }}
                >
                  {byFertility.length} unit{byFertility.length === 1 ? '' : 's'}
                </span>
              </h2>
              <p className={styles.listMeta} style={{ marginTop: 0 }}>
                For each placed fertility unit, the guilds it could
                plausibly serve (within Zone-2 reach, ≤ 75 m), sorted
                nearest first. A unit with zero guilds in range is
                over-resourced for its location; a unit serving every
                guild is a single point of failure for the closed loop.
              </p>
              <ul className={styles.list}>
                {byFertility.map((unit) => {
                  const servedCount = unit.served.length;
                  const pillTone =
                    servedCount === 0    ? styles.pillUnmet :
                    servedCount >= 3     ? styles.pillMet :
                                            styles.pillPartial;
                  return (
                    <li
                      key={unit.id}
                      className={styles.listRow}
                      style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {FERTILITY_LABEL[unit.type]}
                        </strong>
                        <span className={`${styles.pill} ${pillTone ?? ''}`}>
                          {servedCount === 0
                            ? 'no guilds in range'
                            : `serves ${servedCount} guild${servedCount === 1 ? '' : 's'}`}
                        </span>
                      </div>
                      {servedCount > 0 && (
                        <ul className={styles.list} style={{ margin: 0 }}>
                          {unit.served.map((s) => (
                            <li key={s.id} className={styles.listRow}>
                              <span>{s.anchorLabel}</span>
                              <span
                                className={`${styles.pill} ${
                                  s.distanceM <= BUCKET_CLOSE_M
                                    ? styles.pillMet ?? ''
                                    : styles.pillPartial ?? ''
                                }`}
                              >
                                {Math.round(s.distanceM)} m
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
