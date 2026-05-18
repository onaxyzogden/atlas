/**
 * SuccessionPathCard — Plan Module 4 (Plant Systems), Sub-project B1.
 *
 * Editable Year0→Year30 succession-path designer over the additive
 * `successionPathStore` slice. "Seed from guilds" derives default
 * milestones from each guild member's catalog `daysToMaturity` (Year 0
 * plant + a thin/remove at round(days/365), clamped 0..30). Rows
 * auto-persist (no save gate, matching GuildSpatialBuilderCard).
 *
 * The read-only CanopySuccessionCard simulator remains the projection;
 * this card is the editable design intent.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { findEntry } from '../../../../data/plantCatalog.js';
import { labelFor } from './guildIntegrityMath.js';
import {
  useSuccessionPathStore,
  type SuccessionMilestone,
} from '../../../../store/successionPathStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const MAX_YEAR = 30;

function clampYear(y: number): number {
  if (Number.isNaN(y)) return 0;
  return Math.min(MAX_YEAR, Math.max(0, Math.round(y)));
}

export default function SuccessionPathCard({ project }: Props) {
  const guilds = usePolycultureStore((s) => s.guilds);
  const byProject = useSuccessionPathStore((s) => s.byProject);
  const setMilestones = useSuccessionPathStore((s) => s.setMilestones);
  const upsertMilestone = useSuccessionPathStore((s) => s.upsertMilestone);
  const removeMilestone = useSuccessionPathStore((s) => s.removeMilestone);
  const clearPath = useSuccessionPathStore((s) => s.clearPath);

  const projectGuilds = useMemo(
    () => guilds.filter((g) => g.projectId === project.id),
    [guilds, project.id],
  );

  const path = byProject[project.id];
  const milestones = path?.milestones ?? [];

  const plantedSpecies = useMemo(() => {
    const set = new Set<string>();
    for (const m of milestones)
      for (const p of m.plantings)
        if (p.action === 'plant') set.add(p.speciesId);
    return set;
  }, [milestones]);

  const seedFromGuilds = () => {
    const byYear = new Map<number, SuccessionMilestone>();
    const ensure = (year: number): SuccessionMilestone => {
      let m = byYear.get(year);
      if (!m) {
        m = { year, plantings: [] };
        byYear.set(year, m);
      }
      return m;
    };
    for (const g of projectGuilds) {
      for (const mem of g.members) {
        ensure(0).plantings.push({
          speciesId: mem.speciesId,
          action: 'plant',
          guildId: g.id,
        });
        const days = findEntry(mem.speciesId)?.daysToMaturity;
        if (days != null) {
          const y = clampYear(days / 365);
          if (y > 0) {
            ensure(y).plantings.push({
              speciesId: mem.speciesId,
              action: 'thin',
              guildId: g.id,
            });
          }
        }
      }
    }
    const next = [...byYear.values()].sort((a, b) => a.year - b.year);
    setMilestones(project.id, next);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Succession path · Year 0 → 30</h1>
        <p className={styles.lede}>
          The editable establishment intent for this project&apos;s guilds:
          when each species is planted, thinned, or removed across a 30-year
          horizon. Seed defaults from the guilds, then adjust. Edits persist
          immediately — there is no save step. The read-only Canopy
          succession card remains the simulated projection.
        </p>
      </header>

      <div className={styles.section}>
        <div
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <button
            type="button"
            className={styles.pill}
            style={{ cursor: 'pointer' }}
            onClick={seedFromGuilds}
            disabled={projectGuilds.length === 0}
            title="Build default milestones from each guild member's days-to-maturity"
          >
            Seed from guilds ({projectGuilds.length})
          </button>
          {milestones.length > 0 && (
            <button
              type="button"
              className={styles.pill}
              style={{ cursor: 'pointer' }}
              onClick={() => clearPath(project.id)}
              title="Clear all milestones for this project"
            >
              Clear path
            </button>
          )}
        </div>
      </div>

      {milestones.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            {projectGuilds.length === 0
              ? 'No guilds in this project yet — compose a guild first, then seed the succession path from it.'
              : 'No succession milestones yet. Use “Seed from guilds” to derive a Year-0 planting plus thinning years from days-to-maturity.'}
          </p>
        </div>
      )}

      {milestones.map((m) => {
        const yearWarn = m.year < 0 || m.year > MAX_YEAR;
        return (
          <div className={styles.section} key={m.year}>
            <h2 className={styles.sectionTitle}>
              <span
                style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
              >
                Year
                <input
                  type="number"
                  min={0}
                  max={MAX_YEAR}
                  value={m.year}
                  onChange={(e) => {
                    const ny = clampYear(Number(e.target.value));
                    if (ny === m.year) return;
                    removeMilestone(project.id, m.year);
                    upsertMilestone(project.id, { ...m, year: ny });
                  }}
                  style={{ width: 64 }}
                />
                {yearWarn && (
                  <span className={`${styles.pill} ${styles.pillUnmet ?? ''}`}>
                    out of 0–{MAX_YEAR}
                  </span>
                )}
              </span>
              <button
                type="button"
                className={styles.pill}
                style={{ cursor: 'pointer', marginLeft: 8 }}
                onClick={() => removeMilestone(project.id, m.year)}
              >
                Remove year
              </button>
            </h2>
            {m.plantings.length === 0 ? (
              <p className={styles.empty}>No plantings at this milestone.</p>
            ) : (
              <ul className={styles.list}>
                {m.plantings.map((p, i) => {
                  const orphanRemoval =
                    p.action !== 'plant' && !plantedSpecies.has(p.speciesId);
                  return (
                    <li
                      key={`${p.speciesId}-${p.action}-${i}`}
                      className={styles.listRow}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <strong>{labelFor(p.speciesId)}</strong>
                        <span className={styles.pill}>{p.action}</span>
                        {orphanRemoval && (
                          <span
                            className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                          >
                            {p.action} of a species never planted
                          </span>
                        )}
                        <button
                          type="button"
                          className={styles.pill}
                          style={{ cursor: 'pointer', marginLeft: 'auto' }}
                          onClick={() =>
                            upsertMilestone(project.id, {
                              ...m,
                              plantings: m.plantings.filter((_, j) => j !== i),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
