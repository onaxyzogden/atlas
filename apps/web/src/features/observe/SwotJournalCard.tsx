/**
 * SwotJournalCard — Phase 4f OBSERVE surface (Module 6: SWOT Synthesis).
 *
 * Continuous, free-form journal: every observation gets tagged Strength,
 * Weakness, Opportunity, or Threat as it accumulates. Persists via
 * useSiteAnnotationsStore.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSiteAnnotationsStore,
  newAnnotationId,
  type SwotBucket,
  type SwotEntry,
} from '../../store/siteAnnotationsStore.js';
import styles from './SwotJournalCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const BUCKETS: Array<{ key: SwotBucket; label: string; colClass: string }> = [
  { key: 'S', label: 'Strengths',     colClass: styles.colS! },
  { key: 'W', label: 'Weaknesses',    colClass: styles.colW! },
  { key: 'O', label: 'Opportunities', colClass: styles.colO! },
  { key: 'T', label: 'Threats',       colClass: styles.colT! },
];

interface DraftMap {
  S: { title: string; body: string };
  W: { title: string; body: string };
  O: { title: string; body: string };
  T: { title: string; body: string };
}

const EMPTY_DRAFT: DraftMap = {
  S: { title: '', body: '' },
  W: { title: '', body: '' },
  O: { title: '', body: '' },
  T: { title: '', body: '' },
};

export default function SwotJournalCard({ project }: Props) {
  const allEntries = useSiteAnnotationsStore((s) => s.swot);
  const addSwot = useSiteAnnotationsStore((s) => s.addSwot);
  const removeSwot = useSiteAnnotationsStore((s) => s.removeSwot);

  const entries = useMemo(
    () => allEntries.filter((e) => e.projectId === project.id),
    [allEntries, project.id],
  );

  const byBucket = useMemo<Record<SwotBucket, SwotEntry[]>>(() => {
    const out: Record<SwotBucket, SwotEntry[]> = { S: [], W: [], O: [], T: [] };
    for (const e of entries) out[e.bucket].push(e);
    for (const k of Object.keys(out) as SwotBucket[]) {
      out[k].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return out;
  }, [entries]);

  const [drafts, setDrafts] = useState<DraftMap>(EMPTY_DRAFT);

  function commit(bucket: SwotBucket) {
    const draft = drafts[bucket];
    if (!draft.title.trim()) return;
    const entry: SwotEntry = {
      id: newAnnotationId('swot'),
      projectId: project.id,
      bucket,
      title: draft.title.trim(),
      body: draft.body.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addSwot(entry);
    setDrafts((d) => ({ ...d, [bucket]: { title: '', body: '' } }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 6 · SWOT Synthesis</span>
        <h1 className={styles.title}>Continuous SWOT Journal</h1>
        <p className={styles.lede}>
          Capture observations as they arrive. Tag each as a Strength, Weakness,
          Opportunity, or Threat. Entries feed the Diagnosis Report and the
          Hub's Module 6 counts.
        </p>
      </header>

      <div className={styles.board}>
        {BUCKETS.map((b) => (
          <section key={b.key} className={`${styles.column} ${b.colClass}`}>
            <header className={styles.colHead}>
              <h2 className={styles.colTitle}>{b.label}</h2>
              <span className={styles.colCount}>{byBucket[b.key].length}</span>
            </header>

            {byBucket[b.key].map((e) => (
              <article key={e.id} className={styles.entry}>
                <span className={styles.entryTitle}>{e.title}</span>
                {e.body ? <span className={styles.entryBody}>{e.body}</span> : null}
                <div className={styles.entryFoot}>
                  <span className={styles.entryDate}>{e.createdAt.slice(0, 10)}</span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeSwot(e.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}

            <div className={styles.addBox}>
              <input
                type="text"
                placeholder="Title"
                value={drafts[b.key].title}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [b.key]: { ...d[b.key], title: e.target.value } }))
                }
              />
              <textarea
                placeholder="Notes (optional)"
                value={drafts[b.key].body}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [b.key]: { ...d[b.key], body: e.target.value } }))
                }
              />
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => commit(b.key)}
                disabled={!drafts[b.key].title.trim()}
              >
                + Add to {b.label}
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
