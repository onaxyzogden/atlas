/**
 * GuildIntegrityCard — Plan Module 4 (Plant Systems), Sub-project B1.
 *
 * Design-time companion-planting audit over this project's guilds:
 * antagonism/allelopathy (matrix + catalog incompatible fallback),
 * per-layer spacing heuristic, and maturity-sync spread. Pure read —
 * no store writes, no save gate, no goal-tree criterion (mirrors the
 * EdgeConnectivity / TemporalCoherence design-validator precedent; B1
 * has no observation stream to score).
 *
 * Reads:
 *   - `usePolycultureStore.guilds` filtered by `project.id`.
 *   - the static plant catalog + companion matrix (via guildIntegrityMath).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import {
  checkGuilds,
  type GuildFinding,
} from './guildIntegrityMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEVERITY_LABEL: Record<GuildFinding['severity'], string> = {
  error: 'CONFLICT',
  warning: 'REVIEW',
  info: 'UNVERIFIED',
};

export default function GuildIntegrityCard({ project }: Props) {
  const guilds = usePolycultureStore((s) => s.guilds);

  const projectGuilds = useMemo(
    () => guilds.filter((g) => g.projectId === project.id),
    [guilds, project.id],
  );

  const findings = useMemo<GuildFinding[]>(
    () => checkGuilds(projectGuilds),
    [projectGuilds],
  );

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const infos = findings.filter((f) => f.severity === 'info').length;

  const byGuild = useMemo(() => {
    const map = new Map<string, GuildFinding[]>();
    for (const f of findings) {
      const arr = map.get(f.guildId) ?? [];
      arr.push(f);
      map.set(f.guildId, arr);
    }
    return map;
  }, [findings]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Guild integrity</h1>
        <p className={styles.lede}>
          A design-time audit of every guild in this project: companion
          antagonism and allelopathy (companion matrix plus the plant
          catalog&apos;s incompatibility list, which covers perennials the
          annual-crop matrix omits), a per-layer spacing heuristic, and
          maturity-sync spread. This card never blocks a save — it surfaces
          design risk only. Pairs that cannot be verified are reported as
          UNVERIFIED rather than silently passed.
        </p>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project rollup</h2>
        <div className={styles.statRow}>
          <span>Guilds audited</span>
          <span>{projectGuilds.length}</span>
        </div>
        <div className={styles.statRow}>
          <span>Conflicts (catalog/matrix antagonism)</span>
          <span>
            {errors}
            {' · '}
            <span
              className={`${styles.pill} ${
                errors > 0 ? (styles.pillUnmet ?? '') : (styles.pillMet ?? '')
              }`}
            >
              {errors > 0 ? 'CONFLICT' : 'CLEAR'}
            </span>
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Reviews (spacing / maturity)</span>
          <span>{warnings}</span>
        </div>
        <div className={styles.statRow}>
          <span>Unverified pairs</span>
          <span>{infos}</span>
        </div>
      </div>

      {projectGuilds.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No guilds in this project yet. Compose a guild from the Plant
            Systems tools; this card will audit it as soon as it has members.
          </p>
        </div>
      )}

      {projectGuilds.map((g) => {
        const gf = byGuild.get(g.id) ?? [];
        return (
          <div className={styles.section} key={g.id}>
            <h2 className={styles.sectionTitle}>
              {g.name}
              {gf.length === 0 && (
                <span
                  className={`${styles.pill} ${styles.pillMet ?? ''}`}
                  style={{ marginLeft: 8 }}
                >
                  CLEAR
                </span>
              )}
            </h2>
            {gf.length === 0 ? (
              <p className={styles.empty}>
                No companion, spacing, or maturity issues detected.
              </p>
            ) : (
              <ul className={styles.list}>
                {gf.map((f, i) => (
                  <li
                    key={`${f.guildId}-${f.kind}-${f.speciesA}-${
                      f.speciesB ?? ''
                    }-${i}`}
                    className={styles.listRow}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong>
                          {f.labelA}
                          {f.labelB ? ` ↔ ${f.labelB}` : ''}
                        </strong>
                        <span
                          className={`${styles.pill} ${
                            f.severity === 'error'
                              ? (styles.pillUnmet ?? '')
                              : f.severity === 'warning'
                                ? (styles.pill ?? '')
                                : (styles.pill ?? '')
                          }`}
                        >
                          {SEVERITY_LABEL[f.severity]} · {f.kind}
                        </span>
                      </div>
                      <div className={styles.listMeta}>{f.rationale}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
