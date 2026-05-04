/**
 * PathFrequencyEditor — PLAN Module 3.
 *
 * Inline editor that tags each existing path with a usage frequency.
 * Daily / weekly paths should be the widest and best-surfaced; rare
 * paths should be deprioritised in budgeting.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePathStore, PATH_TYPE_CONFIG } from '../../store/pathStore.js';
import styles from './planCard.module.css';

type Frequency = 'daily' | 'weekly' | 'occasional' | 'rare';

const FREQS: Array<{ value: Frequency; label: string }> = [
  { value: 'daily',      label: 'Daily' },
  { value: 'weekly',     label: 'Weekly' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'rare',       label: 'Rare' },
];

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function PathFrequencyEditor({ project }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const updatePath = usePathStore((s) => s.updatePath);

  const paths = useMemo(() => allPaths.filter((p) => p.projectId === project.id), [allPaths, project.id]);

  const totals = useMemo(() => {
    const t: Record<Frequency | 'unset', number> = { daily: 0, weekly: 0, occasional: 0, rare: 0, unset: 0 };
    for (const p of paths) {
      const k = p.usageFrequency ?? 'unset';
      t[k] += p.lengthM;
    }
    return t;
  }, [paths]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 3 · Zone &amp; Circulation</span>
        <h1 className={styles.title}>Path usage frequency</h1>
        <p className={styles.lede}>
          Tag each path by how often it actually carries traffic. Daily and
          weekly routes drive Z1/Z2 placement; rare ones can stay narrow
          and unimproved.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Length by frequency</h2>
        {FREQS.map((f) => (
          <div key={f.value} className={styles.statRow}>
            <span>{f.label}</span>
            <span>{Math.round(totals[f.value]).toLocaleString()} m</span>
          </div>
        ))}
        <div className={styles.statRow}>
          <span>Untagged</span>
          <span>{Math.round(totals.unset).toLocaleString()} m</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Paths</h2>
        {paths.length === 0 ? (
          <p className={styles.empty}>No paths drawn for this project yet.</p>
        ) : (
          <ul className={styles.list}>
            {paths.map((p) => (
              <li key={p.id} className={styles.listRow}>
                <div>
                  <strong>{p.name || PATH_TYPE_CONFIG[p.type]?.label || p.type}</strong>
                  <div className={styles.listMeta}>
                    {PATH_TYPE_CONFIG[p.type]?.label} · {Math.round(p.lengthM)} m
                  </div>
                </div>
                <select
                  value={p.usageFrequency ?? ''}
                  onChange={(e) =>
                    updatePath(p.id, { usageFrequency: (e.target.value || undefined) as Frequency | undefined })
                  }
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(232,220,200,0.92)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <option value="">— unset —</option>
                  {FREQS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
