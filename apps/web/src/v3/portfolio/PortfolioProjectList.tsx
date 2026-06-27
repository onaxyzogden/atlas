/**
 * PortfolioProjectList — left zone of Portfolio Home (§2.1). A filterable list
 * of every project: header (title + count + New-project), text filter, stage
 * filter chips, and selectable rows with a stage pill. Selection is shared
 * with the map via `selectedId` / `onSelect`.
 *
 * Access control (§8): the New-project button is shown to every authenticated
 * user by design — there is no `admin` ProjectRole to gate against, and
 * creating a project makes the creator its owner. Per-project capability gates
 * (relationship create, compare) live on the surfaces that own those actions.
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, GitCompare, Plus, Search } from 'lucide-react';
import { HOMESTEAD_SAMPLE_PROJECT_ID } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { DEMO_OFFLINE_ENABLED } from '../../app/demoSession.js';
import {
  STAGE_FILTERS,
  STAGE_PAINT,
  derivePortfolioStage,
  projectAreaLabel,
  type PortfolioStage,
  type StageFilter,
} from './portfolioModel.js';
import css from './PortfolioProjectList.module.css';

interface Props {
  projects: LocalProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewProject: () => void;
  /** Live-data §2.6 stage per project (usePortfolioStages), so the row pill +
   *  stage filter match the map boundaries + the selected project's rail.
   *  Falls back to coarse geometry-only derivation when absent. */
  stageById?: ReadonlyMap<string, PortfolioStage>;
  /** §8: show the cross-project Observe-compare entry only when the steward is
   *  owner-tier on at least one project. Defaults to true (open). */
  canCompare?: boolean;
  /** Manual "Sync now" for an un-synced, non-builtin project. When provided,
   *  un-synced rows show a "Not synced" tag + a Sync button; the returned
   *  promise (if any) is awaited to drive the per-row pending state. */
  onSyncProject?: (id: string) => void | Promise<void>;
  /** Multi-select (2026-06-02): in select mode each row shows a checkbox and
   *  the row click toggles batch selection instead of the map briefing.
   *  Builtins are not selectable (their checkbox is inert). */
  selectMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}

export default function PortfolioProjectList({
  projects,
  selectedId,
  onSelect,
  onNewProject,
  stageById,
  canCompare = true,
  onSyncProject,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter | 'all'>('all');
  // Per-row "Sync now" in-flight id, so only the clicked row shows "Syncing…".
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (id: string) => {
    if (!onSyncProject || syncingId) return;
    setSyncingId(id);
    try {
      await Promise.resolve(onSyncProject(id));
    } finally {
      // On success the row flips to "Synced" and the button unmounts; on
      // failure the button re-enables so the steward can retry.
      setSyncingId(null);
    }
  };

  const stageOf = (p: LocalProject): PortfolioStage =>
    stageById?.get(p.id) ?? derivePortfolioStage(p);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (stageFilter !== 'all' && stageOf(p) !== stageFilter) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, query, stageFilter, stageById]);

  return (
    <div className={css.root} data-tour="portfolio-list">
      <header className={css.header}>
        <div className={css.titleRow}>
          <h2 className={css.title}>My Projects</h2>
          <span className={css.count}>{projects.length}</span>
        </div>
        <button type="button" className={css.newBtn} onClick={onNewProject}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          <span>New</span>
        </button>
      </header>

      <div className={css.filterField}>
        <Search size={14} strokeWidth={1.75} aria-hidden="true" className={css.searchIcon} />
        <input
          type="text"
          className={css.search}
          placeholder="Filter projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={css.chips} role="group" aria-label="Filter by stage">
        <FilterChip label="All" active={stageFilter === 'all'} onClick={() => setStageFilter('all')} />
        {STAGE_FILTERS.map((s) => (
          <FilterChip
            key={s}
            label={STAGE_PAINT[s].label}
            active={stageFilter === s}
            onClick={() => setStageFilter(s)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={css.empty}>
          {projects.length === 0 ? 'No projects yet.' : 'No projects match this filter.'}
        </p>
      ) : (
        <ul className={css.list}>
          {filtered.map((p) => {
            const stage = stageOf(p);
            // Builtins are system-owned samples (never synced by the steward);
            // a real project is "synced" once it carries a serverId.
            const syncState: 'synced' | 'unsynced' | 'builtin' = p.isBuiltin
              ? 'builtin'
              : p.serverId
                ? 'synced'
                : 'unsynced';
            const isSyncing = syncingId === p.id;
            // In select mode the row toggles batch selection (except builtins);
            // otherwise it drives the map briefing as before.
            const selectable = selectMode && !p.isBuiltin;
            const isChecked = selectedIds?.has(p.id) ?? false;
            const isSelected = selectable ? isChecked : p.id === selectedId;
            // Demo onboarding anchor: the visitor's worked Homestead CLONE (it
            // carries the template flag but is not the canonical builtin — the
            // builtin shares the flag because duplicateProject copies metadata).
            // Inert outside the offline demo (no consumer mounts the tour there).
            const isSampleCloneRow =
              p.id !== HOMESTEAD_SAMPLE_PROJECT_ID &&
              (p.metadata as Record<string, unknown> | undefined)
                ?.instantiatedFromTemplate === 'homestead-sample';
            return (
              <li
                key={p.id}
                className={css.row}
                data-tour={isSampleCloneRow ? 'portfolio-sample-row' : undefined}
              >
                <button
                  type="button"
                  className={css.item}
                  data-selected={isSelected}
                  role={selectable ? 'checkbox' : undefined}
                  aria-checked={selectable ? isChecked : undefined}
                  onClick={() =>
                    selectable ? onToggleSelect?.(p.id) : onSelect(p.id)
                  }
                >
                  {selectMode ? (
                    <span
                      className={`${css.rowCheck} ${isChecked ? css.rowCheckOn : ''} ${
                        p.isBuiltin ? css.rowCheckDisabled : ''
                      }`}
                      aria-hidden="true"
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </span>
                  ) : null}
                  <span
                    className={css.itemDot}
                    style={{ background: STAGE_PAINT[stage].color }}
                    aria-hidden="true"
                  />
                  <span className={css.itemBody}>
                    <span className={css.itemName}>{p.name}</span>
                    <span className={css.itemMeta}>
                      {STAGE_PAINT[stage].label} · {projectAreaLabel(p)}
                      {/* Sync state is meaningless in the offline demo (no
                          backend), so the synced/unsynced tags are suppressed
                          there — only the truthful "Sample" tag remains. */}
                      {!DEMO_OFFLINE_ENABLED && syncState === 'unsynced' && (
                        <span className={css.tagUnsynced}>Not synced</span>
                      )}
                      {!DEMO_OFFLINE_ENABLED && syncState === 'synced' && (
                        <span className={css.tagSynced}>Synced</span>
                      )}
                      {syncState === 'builtin' && <span className={css.tagSample}>Sample</span>}
                    </span>
                  </span>
                </button>
                {!DEMO_OFFLINE_ENABLED && syncState === 'unsynced' && onSyncProject && (
                  <button
                    type="button"
                    className={css.syncBtn}
                    disabled={isSyncing}
                    onClick={() => void handleSync(p.id)}
                  >
                    {isSyncing ? 'Syncing…' : 'Sync'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Portfolio-level entry to cross-project Observe comparison (§6). Hidden
          for read-only stewards (no owner-tier project) per §8. */}
      {canCompare ? (
        <footer className={css.footer}>
          <Link to="/v3/portfolio/observe-compare" className={css.compareLink}>
            <GitCompare size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Compare Observe data</span>
          </Link>
        </footer>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={css.chip}
      data-active={active}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
