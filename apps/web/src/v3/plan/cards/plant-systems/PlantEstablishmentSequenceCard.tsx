/**
 * PlantEstablishmentSequenceCard — Plan Module 4 (Plant Systems), readout.
 *
 * Closes the loop on `Guild.phase`'s docstring promise: "Lets the
 * Phasing dashboard sequence guild establishment by build phase."
 * Groups project guilds by their assigned BuildPhase (phaseStore
 * `order`-sorted) and surfaces, per phase:
 *   - guild count + placed/unplaced split
 *   - per-guild anchor, member count, layer-coverage (n/7)
 * Plus an "Unassigned" bucket for guilds with no phase yet.
 *
 * Cap discipline (asymmetric rule established for Phase B):
 *   - This is a *readout* card. The guild slice is run through
 *     `usePhaseStoreCappedEntities`, so guilds whose BuildPhase's
 *     `yeomansCap` exceeds the year scrubber's
 *     `yeomansCapForYear(currentYear)` simply drop out.
 *   - The registration cards (PlantDatabaseSiteMatchCard,
 *     GuildSpatialBuilderCard, CanopySuccessionCard) stay uncapped
 *     — a steward must be able to compose a Year-5 guild from a
 *     Year-1 view. Same precedent as the Holmgren feature picker
 *     and WaterStorageCard overflow targets.
 *
 * Note on the Unassigned bucket: guilds whose `phase` is undefined
 * pass through the adapter unchanged (the adapter only caps
 * entities that *have* a phase). Guilds capped *out* by a Yeomans
 * mismatch are removed entirely — they're not re-bucketed into
 * Unassigned. That distinction is intentional: Unassigned means
 * "the steward hasn't sequenced this yet"; capped-out means "this
 * guild's phase is real but not in scope for the active view."
 *
 * See wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  usePolycultureStore,
  type Guild,
  type GuildLayer,
} from '../../../../store/polycultureStore.js';
import { usePhaseStore, type BuildPhase } from '../../../../store/phaseStore.js';
import { findSpecies } from '../../../../data/plantCatalog.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const ALL_LAYERS: GuildLayer[] = [
  'canopy',
  'sub_canopy',
  'shrub',
  'herbaceous',
  'ground_cover',
  'vine',
  'root',
];
const LAYER_TOTAL = ALL_LAYERS.length;

interface GuildRow {
  id: string;
  anchorLabel: string;
  memberCount: number;
  layerCount: number;
  placed: boolean;
}

interface PhaseBucket {
  phase: BuildPhase | null; // null = Unassigned bucket
  rows: GuildRow[];
  placed: number;
  unplaced: number;
}

function describeGuild(g: Guild): GuildRow {
  const anchor = findSpecies(g.anchorSpeciesId);
  const anchorLabel = anchor
    ? `${anchor.commonName} (${anchor.latinName})`
    : g.anchorSpeciesId || 'No anchor';
  const layerSet = new Set<GuildLayer>();
  for (const m of g.members) layerSet.add(m.layer);
  return {
    id: g.id,
    anchorLabel,
    memberCount: g.members.length,
    layerCount: layerSet.size,
    placed: !!g.center,
  };
}

export default function PlantEstablishmentSequenceCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allPhases = usePhaseStore((s) => s.phases);

  // Scope by project, then apply Yeomans cap. The adapter passes
  // entities lacking a `phase` field through unchanged, so the
  // Unassigned bucket survives the cap.
  const guildsRaw = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );
  const guilds = usePhaseStoreCappedEntities(guildsRaw);

  // Project-scoped, order-sorted BuildPhases. Derive in useMemo
  // because `getProjectPhases` allocates a fresh array each call
  // (see phaseStore.ts docstring on selector stability).
  const phases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === project.id)
        .sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const buckets: PhaseBucket[] = useMemo(() => {
    const byPhase = new Map<string, GuildRow[]>();
    const unassigned: GuildRow[] = [];
    for (const g of guilds) {
      const row = describeGuild(g);
      if (g.phase) {
        const arr = byPhase.get(g.phase) ?? [];
        arr.push(row);
        byPhase.set(g.phase, arr);
      } else {
        unassigned.push(row);
      }
    }
    const phasedBuckets: PhaseBucket[] = phases.map((phase) => {
      const rows = byPhase.get(phase.id) ?? [];
      const placed = rows.filter((r) => r.placed).length;
      return {
        phase,
        rows,
        placed,
        unplaced: rows.length - placed,
      };
    });
    const unassignedBucket: PhaseBucket = {
      phase: null,
      rows: unassigned,
      placed: unassigned.filter((r) => r.placed).length,
      unplaced: unassigned.filter((r) => !r.placed).length,
    };
    return [...phasedBuckets, unassignedBucket];
  }, [guilds, phases]);

  // Overall health: % phased and % placed across the visible set.
  const overall = useMemo(() => {
    const total = guilds.length;
    let phased = 0;
    let placed = 0;
    for (const g of guilds) {
      if (g.phase) phased += 1;
      if (g.center) placed += 1;
    }
    const phasedPct = total === 0 ? 0 : Math.round((phased / total) * 100);
    const placedPct = total === 0 ? 0 : Math.round((placed / total) * 100);
    return { total, phased, placed, phasedPct, placedPct };
  }, [guilds]);

  function pillClassFor(score: number): string {
    if (score >= 70) return styles.pillMet ?? '';
    if (score >= 30) return styles.pillPartial ?? '';
    return styles.pillUnmet ?? '';
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Plant establishment sequence</h1>
        <p className={styles.lede}>
          Guilds grouped by the build phase they're assigned to, in
          phaseStore order. As you scrub the year cursor, the list
          reflects only guilds whose phase fits the active
          Scale-of-Permanence cap (Year ≤ 2 → water; Year ≤ 5 →
          buildings; Year 6+ uncapped). Use the Guild Builder to
          compose guilds and assign them to a phase — this card is read-only.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Overall
          <span
            className={`${styles.pill} ${pillClassFor(overall.placedPct)}`}
            style={{ marginLeft: 8 }}
          >
            {overall.placedPct}% placed
          </span>
        </h2>
        <div className={styles.statRow}>
          <span>Guilds visible at this view</span>
          <span>{overall.total}</span>
        </div>
        <div className={styles.statRow}>
          <span>Sequenced (have a phase)</span>
          <span>
            {overall.phased} / {overall.total}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Placed on the parcel (have a centroid)</span>
          <span>
            {overall.placed} / {overall.total}
          </span>
        </div>
      </section>

      {buckets.map((bucket) => {
        const label = bucket.phase ? bucket.phase.name : 'Unassigned';
        const sublabel = bucket.phase?.timeframe ?? null;
        const total = bucket.rows.length;
        // For phased buckets, the pill reflects placement health.
        // For the Unassigned bucket, the pill reflects how many
        // still need sequencing.
        const pillScore = bucket.phase
          ? total === 0
            ? 0
            : Math.round((bucket.placed / total) * 100)
          : total === 0
          ? 100
          : 0;
        const key = bucket.phase?.id ?? '__unassigned__';
        return (
          <section key={key} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {label}
              <span
                className={`${styles.pill} ${pillClassFor(pillScore)}`}
                style={{ marginLeft: 8 }}
              >
                {bucket.phase
                  ? `${bucket.placed} placed · ${bucket.unplaced} unplaced`
                  : `${total} guild${total === 1 ? '' : 's'} to sequence`}
              </span>
            </h2>
            {sublabel && (
              <p className={styles.listMeta} style={{ marginTop: 0 }}>
                {sublabel}
              </p>
            )}

            {total === 0 && bucket.phase && (
              <p className={styles.empty} style={{ marginTop: 0 }}>
                No guilds assigned to <strong>{bucket.phase.name}</strong> yet.
                Use the Guild Builder to compose one and tag its phase.
              </p>
            )}
            {total === 0 && !bucket.phase && (
              <p className={styles.empty} style={{ marginTop: 0 }}>
                Every visible guild is sequenced into a build phase. Nice.
              </p>
            )}

            {total > 0 && (
              <ul className={styles.list}>
                {bucket.rows.map((row) => (
                  <li key={row.id} className={styles.listRow}>
                    <div>
                      <strong>{row.anchorLabel}</strong>
                      <span
                        className={styles.listMeta}
                        style={{ marginLeft: 8 }}
                      >
                        · {row.memberCount} member
                        {row.memberCount === 1 ? '' : 's'} · {row.layerCount}/
                        {LAYER_TOTAL} layers
                      </span>
                    </div>
                    <span
                      className={`${styles.pill} ${
                        row.placed ? styles.pillMet ?? '' : styles.pillUnmet ?? ''
                      }`}
                    >
                      {row.placed ? 'Placed' : 'Unplaced'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
