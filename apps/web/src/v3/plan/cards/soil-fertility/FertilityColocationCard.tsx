/**
 * FertilityColocationCard — Plan Module 6 (Soil & Fertility), readout.
 *
 * Closed-loop proximity check. Permaculture short-loop discipline:
 * guilds that depend on heavy mulch / compost / chop-and-drop input
 * should sit *near* the fertility infrastructure that feeds them,
 * inside a walking radius. PDC Zone 1 / Zone 2 framing maps to:
 *   - close   ≤ closeM           (Zone 1, daily reach)
 *   - medium  closeM..mediumM    (Zone 2, weekly reach)
 *   - far     > mediumM          (Zone 3+ — heavier hauls or a moved unit)
 *
 * `closeM` / `mediumM` come from `getZoneThresholds(project)` in
 * projectStore.ts — per-project design metadata. Defaults are
 * 25 m / 75 m; a Tune-zones disclosure on the card lets the steward
 * override per project.
 *
 * Reads `polycultureStore.guilds` + `closedLoopStore.fertilityInfra`
 * (both have absolute `center: [lng, lat]`), computes nearest
 * fertility unit per placed guild via haversine, buckets the result.
 *
 * Cap discipline (asymmetric rule, established Phase B):
 *   - This is a *readout* card. Both the guild slice and the
 *     fertility slice run through `usePhaseStoreCappedEntities`,
 *     so entities whose BuildPhase's `yeomansCap` exceeds the year
 *     scrubber's `yeomansCapForYear(currentYear)` drop out.
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

import { useMemo, useState, useEffect } from 'react';
import {
  useProjectStore,
  getZoneThresholds,
  DEFAULT_ZONE_THRESHOLDS,
} from '../../../../store/projectStore.js';
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
import { findSpecies } from '../../../../data/plantCatalog.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import { haversineM } from '../../../../lib/geo.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// Bucket boundaries (closeM / mediumM) live on the project via
// `getZoneThresholds` — see projectStore.ts. They're per-project
// design metadata, not module-level constants.
const TUNE_MIN_M = 1;
const TUNE_MAX_M = 500;

type BucketKey = 'close' | 'medium' | 'far' | 'unpaired';

function bucketLabelFor(key: BucketKey, closeM: number, mediumM: number): string {
  switch (key) {
    case 'close':    return `Close (≤ ${closeM} m)`;
    case 'medium':   return `Medium (${closeM}–${mediumM} m)`;
    case 'far':      return `Far (> ${mediumM} m)`;
    case 'unpaired': return 'Unplaced or unpaired';
  }
}

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
  /** Count of placed fertility units within ≤ 75 m of this guild.
   *  Used for the resilience signal: ≥ 2 = redundantly served,
   *  1 = single point of failure, 0 = unserved-but-placed. Always
   *  0 for unplaced guilds. */
  servingUnitCount: number;
  /** Distinct types among serving units (≤ 75 m). Used to surface
   *  the at-risk list's serving-unit type for single-served guilds. */
  servingUnitTypes: FertilityInfraType[];
}

function bucketFor(distanceM: number, closeM: number, mediumM: number): BucketKey {
  if (distanceM <= closeM) return 'close';
  if (distanceM <= mediumM) return 'medium';
  return 'far';
}

export default function FertilityColocationCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const setZoneThresholds = useProjectStore((s) => s.setZoneThresholds);
  const clearZoneThresholds = useProjectStore((s) => s.clearZoneThresholds);

  const { closeM, mediumM } = getZoneThresholds(project);
  const isCustomThresholds =
    project.zoneThresholds != null &&
    (project.zoneThresholds.closeM !== DEFAULT_ZONE_THRESHOLDS.closeM ||
      project.zoneThresholds.mediumM !== DEFAULT_ZONE_THRESHOLDS.mediumM);

  // Local draft state for the Tune-zones inputs. Synced to the
  // persisted thresholds on every change so a different project (or a
  // Reset click) re-seeds the inputs without keeping stale strings.
  // Writes to the store happen only when the parsed pair validates —
  // partial / invalid input shows an inline message and the store
  // doesn't update, so the visible card stays on the last valid pair.
  const [closeDraft, setCloseDraft] = useState<string>(String(closeM));
  const [mediumDraft, setMediumDraft] = useState<string>(String(mediumM));
  useEffect(() => {
    setCloseDraft(String(closeM));
    setMediumDraft(String(mediumM));
  }, [closeM, mediumM]);

  function validatePair(rawClose: string, rawMedium: string): {
    ok: boolean;
    error: string | null;
    parsed: { closeM: number; mediumM: number } | null;
  } {
    const c = Number(rawClose);
    const m = Number(rawMedium);
    if (!Number.isFinite(c) || !Number.isFinite(m)) {
      return { ok: false, error: 'Both values must be numbers.', parsed: null };
    }
    if (c < TUNE_MIN_M || c > TUNE_MAX_M) {
      return {
        ok: false,
        error: `Zone-1 max must be between ${TUNE_MIN_M} and ${TUNE_MAX_M} m.`,
        parsed: null,
      };
    }
    if (m <= c) {
      return {
        ok: false,
        error: 'Zone-2 max must be greater than Zone-1 max.',
        parsed: null,
      };
    }
    if (m > TUNE_MAX_M) {
      return {
        ok: false,
        error: `Zone-2 max cannot exceed ${TUNE_MAX_M} m.`,
        parsed: null,
      };
    }
    return { ok: true, error: null, parsed: { closeM: c, mediumM: m } };
  }

  const draftValidation = validatePair(closeDraft, mediumDraft);

  function handleCloseChange(v: string): void {
    setCloseDraft(v);
    const { ok, parsed } = validatePair(v, mediumDraft);
    if (ok && parsed) setZoneThresholds(project.id, parsed);
  }

  function handleMediumChange(v: string): void {
    setMediumDraft(v);
    const { ok, parsed } = validatePair(closeDraft, v);
    if (ok && parsed) setZoneThresholds(project.id, parsed);
  }

  function handleResetThresholds(): void {
    clearZoneThresholds(project.id);
    setCloseDraft(String(DEFAULT_ZONE_THRESHOLDS.closeM));
    setMediumDraft(String(DEFAULT_ZONE_THRESHOLDS.mediumM));
  }

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
        return {
          id: g.id,
          anchorLabel,
          bucket: 'unpaired',
          distanceM: null,
          nearestType: null,
          servingUnitCount: 0,
          servingUnitTypes: [],
        };
      }
      let bestM = Infinity;
      let bestType: FertilityInfraType | null = null;
      let servingUnitCount = 0;
      const typeSet = new Set<FertilityInfraType>();
      for (const f of placedFertility) {
        const d = haversineM(g.center, f.center);
        if (d < bestM) {
          bestM = d;
          bestType = f.type;
        }
        if (d <= mediumM) {
          servingUnitCount += 1;
          typeSet.add(f.type);
        }
      }
      return {
        id: g.id,
        anchorLabel,
        bucket: bucketFor(bestM, closeM, mediumM),
        distanceM: bestM,
        nearestType: bestType,
        servingUnitCount,
        servingUnitTypes: Array.from(typeSet),
      };
    });
  }, [guilds, fertility, closeM, mediumM]);

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
        .filter((s) => s.distanceM <= mediumM)
        .sort((a, b) => a.distanceM - b.distanceM);
      return { id: f.id, type: f.type, served };
    }).sort((a, b) => b.served.length - a.served.length);
  }, [guilds, fertility, mediumM]);

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

  /**
   * Resilience: a closed loop with one composter feeding every guild
   * collapses the moment that composter fails. The forward view's
   * "nearest unit" framing can't see this — it shows the loop is
   * tight, not that it's brittle. Bucket placed guilds (those with
   * a centroid) by how many fertility units sit within ≤ 75 m:
   *   - ≥ 2 = redundantly served (resilient)
   *   - 1   = single point of failure (at risk)
   *   - 0   = placed but no fertility in reach
   * Unplaced guilds excluded — they're the forward view's problem.
   */
  const resilience = useMemo(() => {
    const placed = rows.filter((r) => r.bucket !== 'unpaired');
    const redundant = placed.filter((r) => r.servingUnitCount >= 2);
    const single = placed.filter((r) => r.servingUnitCount === 1);
    const unserved = placed.filter((r) => r.servingUnitCount === 0);
    const placedPct =
      placed.length === 0 ? 0 : Math.round((redundant.length / placed.length) * 100);
    return {
      placedTotal: placed.length,
      redundantCount: redundant.length,
      singleServed: single,
      unservedCount: unserved.length,
      placedPct,
    };
  }, [rows]);

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
          (≤ {closeM} m) / Zone-2 ({closeM}–{mediumM} m) / Zone-3+
          (&gt; {mediumM} m). Guilds without a centroid, or guilds in
          a view with no fertility infrastructure placed, land in
          <em> Unplaced or unpaired</em>. The year scrubber caps both
          stores per the Scale of Permanence (Year ≤ 2 → water;
          Year ≤ 5 → buildings; Year 6+ uncapped). The <em>Resilience</em> section
          counts how many placed guilds have ≥ 2 fertility units
          within ≤ {mediumM} m (redundant) versus exactly one (single
          point of failure). The <em>By fertility unit</em> section
          flips the pairing — per unit, which guilds it could
          plausibly serve — so the steward catches over-resourced or
          single-point-of-failure units. Zone boundaries are
          tunable per project via <em>Tune zones</em> below — they
          are properties of the land + steward + cart, not UI
          preferences.
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
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95em',
                  marginBottom: 4,
                }}
              >
                Tune zones (advanced) — currently Zone-1 ≤ {closeM} m, Zone-2 {closeM}–{mediumM} m
                {isCustomThresholds ? ' · custom' : ' · defaults'}
              </summary>
              <p
                className={styles.listMeta}
                style={{ marginTop: 8, marginBottom: 8 }}
              >
                Zone reach is a property of your land — the slope, the
                steward's body, the cart actually used — not a UI
                preference. Steep terrain favours smaller zones; flat
                ground with a good barrow favours larger. Defaults are
                {' '}{DEFAULT_ZONE_THRESHOLDS.closeM} m / {DEFAULT_ZONE_THRESHOLDS.mediumM} m.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'flex-end',
                  marginTop: 4,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className={styles.listMeta}>Zone-1 max (m)</span>
                  <input
                    type="number"
                    min={TUNE_MIN_M}
                    max={TUNE_MAX_M}
                    step={1}
                    value={closeDraft}
                    onChange={(e) => handleCloseChange(e.target.value)}
                    style={{ width: 90, padding: '4px 6px' }}
                    aria-label="Zone-1 maximum distance in metres"
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className={styles.listMeta}>Zone-2 max (m)</span>
                  <input
                    type="number"
                    min={TUNE_MIN_M}
                    max={TUNE_MAX_M}
                    step={1}
                    value={mediumDraft}
                    onChange={(e) => handleMediumChange(e.target.value)}
                    style={{ width: 90, padding: '4px 6px' }}
                    aria-label="Zone-2 maximum distance in metres"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleResetThresholds}
                  disabled={!isCustomThresholds}
                  style={{
                    padding: '6px 12px',
                    cursor: isCustomThresholds ? 'pointer' : 'not-allowed',
                    opacity: isCustomThresholds ? 1 : 0.5,
                  }}
                >
                  Reset to defaults
                </button>
              </div>
              {!draftValidation.ok && draftValidation.error && (
                <p
                  className={styles.listMeta}
                  style={{ color: '#b91c1c', marginTop: 8, marginBottom: 0 }}
                >
                  {draftValidation.error} The bucketing below still uses the last valid pair.
                </p>
              )}
            </details>
          </section>
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
              <span>In Zone-1 walking radius (≤ {closeM} m)</span>
              <span>{overall.close} / {overall.total}</span>
            </div>
            <div className={styles.statRow}>
              <span>Unpaired (no centroid, or no fertility in view)</span>
              <span>{overall.unpaired}</span>
            </div>
            <div className={styles.statRow}>
              <span>Redundantly served (≥ 2 units, ≤ {mediumM} m)</span>
              <span>
                {resilience.redundantCount} / {resilience.placedTotal}
              </span>
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
                  {bucketLabelFor(key, closeM, mediumM)}
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

          {resilience.placedTotal > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Resilience
                <span
                  className={`${styles.pill} ${pillClassFor(resilience.placedPct)}`}
                  style={{ marginLeft: 8 }}
                >
                  {resilience.placedPct}% redundant
                </span>
              </h2>
              <p className={styles.listMeta} style={{ marginTop: 0 }}>
                A guild is <em>redundantly served</em> when at least
                two fertility units sit within ≤ {mediumM} m of it — if one
                unit fails the loop survives. Guilds served by exactly
                one unit are listed below: each is a single point of
                failure for its closed loop. Unplaced guilds are
                excluded; they're handled by the buckets above.
              </p>
              <div className={styles.statRow}>
                <span>Redundantly served (≥ 2 units)</span>
                <span>{resilience.redundantCount}</span>
              </div>
              <div className={styles.statRow}>
                <span>Single-served (1 unit — at risk)</span>
                <span>{resilience.singleServed.length}</span>
              </div>
              <div className={styles.statRow}>
                <span>Placed but no fertility in reach (0 units)</span>
                <span>{resilience.unservedCount}</span>
              </div>

              {resilience.singleServed.length === 0 ? (
                <p className={styles.empty} style={{ marginTop: 12 }}>
                  No single-served guilds at this view. Every placed
                  guild is either redundantly served or has no
                  fertility unit in reach.
                </p>
              ) : (
                <ul className={styles.list} style={{ marginTop: 8 }}>
                  {resilience.singleServed.map((row) => {
                    const onlyType = row.servingUnitTypes[0];
                    return (
                      <li key={row.id} className={styles.listRow}>
                        <div>
                          <strong>{row.anchorLabel}</strong>
                          <span
                            className={styles.listMeta}
                            style={{ marginLeft: 8 }}
                          >
                            {onlyType
                              ? `· only ${FERTILITY_LABEL[onlyType]} in reach`
                              : '· only one unit in reach'}
                          </span>
                        </div>
                        <span className={`${styles.pill} ${styles.pillUnmet ?? ''}`}>
                          {row.distanceM != null ? `${Math.round(row.distanceM)} m` : 'unpaired'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

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
                plausibly serve (within Zone-2 reach, ≤ {mediumM} m), sorted
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
                                  s.distanceM <= closeM
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
