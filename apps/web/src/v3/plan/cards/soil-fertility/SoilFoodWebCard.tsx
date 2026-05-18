/**
 * SoilFoodWebCard — Plan Module 5 (Soil Fertility), Sub-project B2.
 *
 * Design-time soil-biology audit over this project's guilds:
 * mycorrhizal-network coherence vs the anchor, dominant root-exudate
 * rollup, and an explicit unverified flag for members with no profile.
 * Pure read — no store writes, no save gate, no goal-tree criterion
 * (mirrors the B1 GuildIntegrity / EdgeConnectivity precedent; B2 has
 * no observation stream to score).
 *
 * Reads:
 *   - `usePolycultureStore.guilds` filtered by `project.id`.
 *   - the static soilBiologyProfiles table (via soilFoodWebMath).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import {
  checkGuilds,
  type SoilWebFinding,
} from './soilFoodWebMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEVERITY_LABEL: Record<SoilWebFinding['severity'], string> = {
  error: 'CONFLICT',
  warning: 'REVIEW',
  info: 'NOTE',
};

export default function SoilFoodWebCard({ project }: Props) {
  const guilds = usePolycultureStore((s) => s.guilds);

  const projectGuilds = useMemo(
    () => guilds.filter((g) => g.projectId === project.id),
    [guilds, project.id],
  );

  const findings = useMemo<SoilWebFinding[]>(
    () => checkGuilds(projectGuilds),
    [projectGuilds],
  );

  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const infos = findings.filter((f) => f.severity === 'info').length;

  const byGuild = useMemo(() => {
    const map = new Map<string, SoilWebFinding[]>();
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
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Soil food-web</h1>
        <p className={styles.lede}>
          A design-time soil-biology read of every guild in this project:
          mycorrhizal-network coherence against the guild anchor, the
          dominant root-exudate character that biases which rhizosphere
          microbes the guild recruits, and an explicit note for any member
          whose soil-biology profile is unavailable. This card never blocks
          a save — it surfaces design signal only, and never silently
          passes an unprofiled species.
        </p>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project rollup</h2>
        <div className={styles.statRow}>
          <span>Guilds audited</span>
          <span>{projectGuilds.length}</span>
        </div>
        <div className={styles.statRow}>
          <span>Mycorrhizal reviews</span>
          <span>{warnings}</span>
        </div>
        <div className={styles.statRow}>
          <span>Notes (exudate / unprofiled)</span>
          <span>{infos}</span>
        </div>
      </div>

      {projectGuilds.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No guilds in this project yet. Compose a guild from the Plant
            Systems tools; this card will read its soil biology as soon as
            it has members.
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
                No mycorrhizal or profile issues detected.
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
                            f.severity === 'warning'
                              ? (styles.pillUnmet ?? '')
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
