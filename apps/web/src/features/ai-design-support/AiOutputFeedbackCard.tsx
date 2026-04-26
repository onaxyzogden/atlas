/**
 * §17 AiOutputFeedbackCard — closes the AI-output rating loop. Lists the
 * AI-DRAFT-tagged surfaces currently on the EcologicalDashboard and lets
 * the steward thumbs-up / thumbs-down each one, optionally tag it
 * ("Useful", "Wrong", "Generic", "Missing context", "Too cautious",
 * "Too aggressive"), and leave a one-line note. Feedback is persisted
 * per project in localStorage and cross-tab synced via the storage
 * event.
 *
 * Pure presentation — no remote endpoint, no analytics call. The intent
 * is steward self-tracking: "which outputs am I trusting; which am I
 * routinely overriding?" — so the team building the inputs can iterate
 * with grounded ratings rather than guesswork.
 *
 * Closes manifest §17 `ai-output-rating-feedback` (P3) partial -> done.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './AiOutputFeedbackCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'up' | 'down' | null;

const TAGS = [
  'Useful',
  'Wrong',
  'Generic',
  'Missing context',
  'Too cautious',
  'Too aggressive',
] as const;
type Tag = (typeof TAGS)[number];

interface Feedback {
  verdict: Verdict;
  tags: Tag[];
  note: string;
  updatedAt: string;
}

type FeedbackMap = Record<string, Feedback>;

interface OutputRow {
  id: string;
  surface: string;
  label: string;
  blurb: string;
}

const OUTPUTS: OutputRow[] = [
  {
    id: 'ai-site-synthesis',
    surface: '§17',
    label: 'AI site synthesis',
    blurb: 'Layer-grounded narrative summary of climate, soil, terrain, hydrology, and land cover.',
  },
  {
    id: 'assumption-gap-detector',
    surface: '§17',
    label: 'Assumption gap detector',
    blurb: 'Default-value detection across mission weights, layer presence, and entity composition.',
  },
  {
    id: 'needs-site-visit',
    surface: '§17',
    label: 'Needs-site-visit flags',
    blurb: 'Checklist of layer-by-layer questions a steward should walk for next site visit.',
  },
  {
    id: 'alternative-layout-rationale',
    surface: '§17',
    label: 'Alternative layout rationale',
    blurb: 'Suggested swaps + dashboard delta across project basics, scoring, entities, economics, vision.',
  },
  {
    id: 'design-brief-pitch',
    surface: '§17',
    label: 'Design brief / landowner pitch',
    blurb: 'Exportable one-page narrative bundling vision, site context, design state, assumptions, next moves.',
  },
  {
    id: 'ecological-risk-warnings',
    surface: '§17',
    label: 'Ecological risk warnings',
    blurb: 'Concrete failure-mode scan crossing site-data layers with placed entities.',
  },
  {
    id: 'educational-explainer',
    surface: '§17',
    label: 'Educational explainer & checklists',
    blurb: 'What-is + pre-place checklists per entity type.',
  },
  {
    id: 'why-here-panels',
    surface: '§19',
    label: 'Why-here / problem / if-omitted panels',
    blurb: 'Three-panel rationale per placed entity type.',
  },
];

function storageKey(projectId: string): string {
  return `ogden-ai-feedback-${projectId}`;
}

function loadFeedback(projectId: string): FeedbackMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as FeedbackMap;
    return {};
  } catch {
    return {};
  }
}

function saveFeedback(projectId: string, map: FeedbackMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(map));
  } catch {
    /* swallow quota errors */
  }
}

const EMPTY_FEEDBACK: Feedback = {
  verdict: null,
  tags: [],
  note: '',
  updatedAt: '',
};

export default function AiOutputFeedbackCard({ project }: Props) {
  const [feedback, setFeedback] = useState<FeedbackMap>(() => loadFeedback(project.id));
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Cross-tab sync via the storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(project.id)) {
        setFeedback(loadFeedback(project.id));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  // Reload when the project changes.
  useEffect(() => {
    setFeedback(loadFeedback(project.id));
    setOpenKey(null);
  }, [project.id]);

  const update = useCallback(
    (id: string, patch: Partial<Feedback>) => {
      setFeedback((prev) => {
        const current = prev[id] ?? EMPTY_FEEDBACK;
        const next: Feedback = {
          ...current,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        const map = { ...prev, [id]: next };
        saveFeedback(project.id, map);
        return map;
      });
    },
    [project.id],
  );

  const setVerdict = (id: string, verdict: Verdict) => {
    const current = feedback[id]?.verdict;
    update(id, { verdict: current === verdict ? null : verdict });
  };

  const toggleTag = (id: string, tag: Tag) => {
    const current = feedback[id]?.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    update(id, { tags: next });
  };

  const setNote = (id: string, note: string) => {
    update(id, { note });
  };

  const resetAll = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Clear all AI output feedback for this project?');
      if (!ok) return;
    }
    setFeedback({});
    saveFeedback(project.id, {});
  };

  const counts = useMemo(() => {
    const list = Object.values(feedback);
    const up = list.filter((f) => f.verdict === 'up').length;
    const down = list.filter((f) => f.verdict === 'down').length;
    const tagCounts: Record<string, number> = {};
    for (const f of list) {
      for (const t of f.tags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
    }
    let topTag: string | null = null;
    let topCount = 0;
    for (const [t, n] of Object.entries(tagCounts)) {
      if (n > topCount) {
        topTag = t;
        topCount = n;
      }
    }
    return {
      rated: up + down,
      total: OUTPUTS.length,
      up,
      down,
      topTag,
      topCount,
    };
  }, [feedback]);

  return (
    <section className={css.card} aria-label="AI output feedback">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>AI output rating &amp; feedback</h3>
          <p className={css.cardHint}>
            Rate the AI-DRAFT outputs surfaced on this project. Thumbs +
            tags + an optional note are persisted per project in your
            browser, so you can track which outputs you trust and which
            you routinely override. Stays local &mdash; <em>nothing is
            sent off-device</em>.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={css.summaryRow}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>
            {counts.rated} <span className={css.summaryDenom}>/ {counts.total}</span>
          </div>
          <div className={css.summaryLabel}>Rated</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.toneUp}`}>{counts.up}</div>
          <div className={css.summaryLabel}>Useful</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.toneDown}`}>{counts.down}</div>
          <div className={css.summaryLabel}>Off-base</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>
            {counts.topTag ? `${counts.topTag} (${counts.topCount})` : '\u2014'}
          </div>
          <div className={css.summaryLabel}>Most-flagged tag</div>
        </div>
        <button type="button" className={css.resetBtn} onClick={resetAll} disabled={counts.rated === 0}>
          Reset
        </button>
      </div>

      <ul className={css.list}>
        {OUTPUTS.map((o) => {
          const f = feedback[o.id] ?? EMPTY_FEEDBACK;
          const isOpen = openKey === o.id;
          const verdictLabel =
            f.verdict === 'up' ? 'Useful' : f.verdict === 'down' ? 'Off-base' : null;
          return (
            <li
              key={o.id}
              className={`${css.row} ${
                f.verdict === 'up'
                  ? css.row_up
                  : f.verdict === 'down'
                    ? css.row_down
                    : ''
              } ${isOpen ? css.rowOpen : ''}`}
            >
              <div className={css.rowHead}>
                <button
                  type="button"
                  className={css.rowToggleArea}
                  onClick={() => setOpenKey(isOpen ? null : o.id)}
                  aria-expanded={isOpen}
                >
                  <span className={css.rowSurface}>{o.surface}</span>
                  <span className={css.rowLabel}>{o.label}</span>
                  {verdictLabel && (
                    <span
                      className={`${css.rowVerdict} ${
                        f.verdict === 'up' ? css.tag_up : css.tag_down
                      }`}
                    >
                      {verdictLabel}
                    </span>
                  )}
                  {f.tags.length > 0 && (
                    <span className={css.rowTagCount}>{f.tags.length} tag{f.tags.length === 1 ? '' : 's'}</span>
                  )}
                  <span className={css.rowToggle}>{isOpen ? '\u2212' : '+'}</span>
                </button>
                <div className={css.verdictRow}>
                  <button
                    type="button"
                    className={`${css.thumbBtn} ${f.verdict === 'up' ? css.thumbActive_up : ''}`}
                    onClick={() => setVerdict(o.id, 'up')}
                    aria-pressed={f.verdict === 'up'}
                    aria-label="Mark useful"
                  >
                    {'\u{1F44D}'}
                  </button>
                  <button
                    type="button"
                    className={`${css.thumbBtn} ${f.verdict === 'down' ? css.thumbActive_down : ''}`}
                    onClick={() => setVerdict(o.id, 'down')}
                    aria-pressed={f.verdict === 'down'}
                    aria-label="Mark off-base"
                  >
                    {'\u{1F44E}'}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className={css.rowBody}>
                  <p className={css.blurb}>{o.blurb}</p>
                  <div className={css.tagBar}>
                    {TAGS.map((t) => {
                      const active = f.tags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`${css.tagBtn} ${active ? css.tagBtnActive : ''}`}
                          onClick={() => toggleTag(o.id, t)}
                          aria-pressed={active}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    className={css.note}
                    placeholder="Optional note — what was wrong, what was useful, what to revisit"
                    value={f.note}
                    onChange={(e) => setNote(o.id, e.target.value)}
                    rows={2}
                  />
                  {f.updatedAt && (
                    <div className={css.timestamp}>
                      Last updated {new Date(f.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        <em>Where this feedback lives:</em> per-project in browser
        localStorage under <code>{storageKey(project.id)}</code>. No
        network call. The summary row helps you see your own trust pattern
        across surfaces; the per-row tags help you remember <em>why</em>
        an output was off-base when you next revisit it.
      </p>
    </section>
  );
}
