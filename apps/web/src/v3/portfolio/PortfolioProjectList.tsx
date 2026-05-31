/**
 * PortfolioProjectList — left zone of Portfolio Home (§2.1). A filterable list
 * of every project: header (title + count + New-project), text filter, stage
 * filter chips, and selectable rows with a stage pill. Selection is shared
 * with the map via `selectedId` / `onSelect`.
 *
 * Owner-only gating of the New-project button (§8) lands in P7; for now it is
 * always shown.
 */

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { GitCompare, Plus, Search } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
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
}

export default function PortfolioProjectList({
  projects,
  selectedId,
  onSelect,
  onNewProject,
  stageById,
}: Props) {
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter | 'all'>('all');

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
    <div className={css.root}>
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
            const isSelected = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={css.item}
                  data-selected={isSelected}
                  onClick={() => onSelect(p.id)}
                >
                  <span
                    className={css.itemDot}
                    style={{ background: STAGE_PAINT[stage].color }}
                    aria-hidden="true"
                  />
                  <span className={css.itemBody}>
                    <span className={css.itemName}>{p.name}</span>
                    <span className={css.itemMeta}>
                      {STAGE_PAINT[stage].label} · {projectAreaLabel(p)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Portfolio-level entry to cross-project Observe comparison (§6). */}
      <footer className={css.footer}>
        <Link to="/v3/portfolio/observe-compare" className={css.compareLink}>
          <GitCompare size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>Compare Observe data</span>
        </Link>
      </footer>
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
