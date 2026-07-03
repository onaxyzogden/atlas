/**
 * ActOpsHubSearch — quick-find for the Operations Hub (Phase 4 header search).
 *
 * The mock's header search wired to real objectives: type a few letters and the
 * matching objectives surface inline; clicking one opens its walkthrough via the
 * SAME act/ops/$objectiveId route a pin or category card uses (onSelectObjective
 * is the hub's existing handler). This is the most direct answer to "immediately
 * see what needs to be done" — find the task by name and jump straight into it.
 *
 * Locked objectives still appear (so the steward sees they exist) but render
 * disabled: the route's beforeLoad would otherwise bounce a locked id straight
 * back to the bare hub, which reads as a dead click. "Openable" here is computed
 * the SAME way ActTaskWalkthrough / ActTierShell compute it (effective checklist
 * progress → computeAllObjectiveStatuses), so the search and the drawer agree.
 */

import { useMemo, useState } from 'react';
import { ArrowRight, Lock, Search } from 'lucide-react';
import { PLAN_STRATA, computeAllObjectiveStatuses } from '@ogden/shared';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import css from './ActOpsHubSearch.module.css';

interface Props {
  projectId: string;
  /** Open an objective's walkthrough (the hub's act/ops/$objectiveId route). */
  onSelectObjective: (objectiveId: string) => void;
}

const MAX_RESULTS = 8;

export default function ActOpsHubSearch({ projectId, onSelectObjective }: Props) {
  const { objectives } = useProjectObjectives(projectId);
  const effectiveProgress = useEffectiveChecklistProgress(projectId, objectives);
  const [query, setQuery] = useState('');

  // Prereq-aware statuses for every objective — memoised on the data, not the
  // query, so typing doesn't recompute them. Mirrors the drawer's derivation.
  const statuses = useMemo(
    () => computeAllObjectiveStatuses(objectives, effectiveProgress.flatMap),
    [objectives, effectiveProgress],
  );

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return objectives
      .filter((o) => o.title.toLowerCase().includes(trimmed))
      .slice(0, MAX_RESULTS)
      .map((o) => {
        const tier = PLAN_STRATA.find((t) => t.id === o.stratumId);
        return {
          id: o.id,
          title: o.title,
          stratum: tier?.title ?? '',
          locked: (statuses[o.id] ?? 'locked') === 'locked',
        };
      });
  }, [objectives, statuses, trimmed]);

  return (
    <section className={css.wrap} aria-label="Find an objective">
      <div className={css.field}>
        <Search
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={css.fieldIcon}
        />
        <input
          type="search"
          className={css.input}
          placeholder="Find work by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find work by name"
        />
      </div>

      {trimmed.length > 0 && (
        <div className={css.results} role="listbox" aria-label="Matching objectives">
          {results.length === 0 ? (
            <p className={css.empty}>No matching work.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected="false"
                className={css.result}
                data-locked={r.locked}
                disabled={r.locked}
                onClick={() => onSelectObjective(r.id)}
              >
                <span className={css.resultText}>
                  {r.stratum && (
                    <span className={css.resultStratum}>{r.stratum}</span>
                  )}
                  <span className={css.resultTitle}>{r.title}</span>
                </span>
                {r.locked ? (
                  <Lock
                    size={13}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={css.resultIcon}
                  />
                ) : (
                  <ArrowRight
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={css.resultIcon}
                  />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}
