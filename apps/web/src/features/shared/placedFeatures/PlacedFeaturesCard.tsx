/**
 * PlacedFeaturesCard — collapsible right-rail card listing every feature
 * the steward has placed on the map for the current project + stage.
 *
 * Reads via `usePlacedFeatures`. Row actions: visibility toggle
 * (Eye / EyeOff — sets the per-entity `hidden` flag, dims the row,
 * canvas layers honour it), focus-on-map (fly via `mapFocusStore`),
 * and delete-with-confirm.
 */

import { useMemo, useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import {
  usePlacedFeatures,
  rollupRows,
  type PlacedFeatureStage,
  type PlacedFeatureRow,
} from './usePlacedFeatures.js';
import { useMapFocusStore } from '../../../store/mapFocusStore.js';
import css from './PlacedFeaturesCard.module.css';

interface Props {
  stage: PlacedFeatureStage;
  projectId: string | null;
}

const STAGE_HINT: Record<PlacedFeatureStage, string> = {
  observe:
    'No features placed yet — use the tools on the left to record what already exists on the land.',
  plan: 'No features placed yet — use the tools on the left to drop your first design element.',
};

export default function PlacedFeaturesCard({ stage, projectId }: Props) {
  const {
    rows,
    removeBuilt,
    removeDesign,
    removeZone,
    setBuiltHidden,
    setDesignHidden,
    setZoneHidden,
  } = usePlacedFeatures(stage, projectId);
  const focus = useMapFocusStore((s) => s.focus);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hideHidden, setHideHidden] = useState(false);

  const rollup = useMemo(() => rollupRows(rows), [rows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (hideHidden && r.hidden) return false;
      if (!needle) return true;
      return (
        r.label.toLowerCase().includes(needle) ||
        r.groupLabel.toLowerCase().includes(needle) ||
        r.kind.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, hideHidden]);

  const summary = useMemo(() => {
    if (rollup.total === 0) return 'Nothing placed yet';
    const parts = rollup.perGroup
      .slice(0, 4)
      .map((g) => `${g.count} ${g.groupLabel.toLowerCase()}`);
    const tail = rollup.perGroup.length > 4 ? ` +${rollup.perGroup.length - 4} more` : '';
    return `${rollup.total} placed · ${parts.join(' · ')}${tail}`;
  }, [rollup]);

  const grouped = useMemo(() => groupByGroupLabel(filteredRows), [filteredRows]);

  function handleFocus(row: PlacedFeatureRow) {
    if (!projectId || !row.centroid) return;
    focus({ projectId, center: row.centroid, zoom: 17 });
  }

  function handleToggleHidden(row: PlacedFeatureRow) {
    const next = !row.hidden;
    if (row.source === 'built') setBuiltHidden(row.id, next);
    else if (row.source === 'design') setDesignHidden(row.id, next);
    else if (row.source === 'zone') setZoneHidden(row.id, next);
  }

  function handleDelete(row: PlacedFeatureRow) {
    if (!projectId) return;
    const ok = window.confirm(`Remove "${row.label}" from the map?`);
    if (!ok) return;
    if (row.source === 'built') removeBuilt(row.id);
    else if (row.source === 'design') removeDesign(row.id);
    else if (row.source === 'zone') removeZone(row.id);
  }

  return (
    <section
      className={css.card}
      aria-label="Placed features"
      data-testid="placed-features-card"
    >
      <button
        type="button"
        className={css.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="placed-features-body"
      >
        <span className={css.headerMain}>
          <span className={css.title}>Placed features</span>
          <span className={css.summary} title={summary}>
            {summary}
          </span>
        </span>
        <span
          className={`${css.chevron} ${open ? css.chevronOpen : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      {open && (
        <div id="placed-features-body" className={css.body}>
          {rows.length === 0 ? (
            <p className={css.empty}>{STAGE_HINT[stage]}</p>
          ) : (
            <>
              <div className={css.toolbar}>
                <label className={css.searchRow}>
                  <Search size={13} strokeWidth={1.75} aria-hidden="true" />
                  <input
                    type="search"
                    className={css.search}
                    placeholder="Search placements…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search placed features"
                  />
                </label>
                <button
                  type="button"
                  className={css.toggleHidden}
                  onClick={() => setHideHidden((v) => !v)}
                  aria-pressed={hideHidden}
                  title={
                    hideHidden
                      ? 'Showing only visible rows — click to include hidden'
                      : 'Hide rows currently toggled off the canvas'
                  }
                >
                  Hide hidden
                </button>
              </div>
              {filteredRows.length === 0 ? (
                <p className={css.empty}>
                  No placed features match your filter.
                </p>
              ) : (
                grouped.map(([groupLabel, groupRows]) => (
              <div key={groupLabel}>
                <div className={css.groupHeading}>
                  {groupLabel} ({groupRows.length})
                </div>
                {groupRows.map((row) => (
                  <div
                    key={row.rowKey}
                    className={css.row}
                    data-hidden={row.hidden || undefined}
                  >
                    <span
                      className={css.swatch}
                      style={{ background: row.color }}
                      aria-hidden="true"
                    />
                    <span className={css.rowMain}>
                      <span className={css.rowLabel} title={row.label}>
                        {row.label}
                      </span>
                      {row.meta && <span className={css.rowMeta}>{row.meta}</span>}
                    </span>
                    <span className={css.actions}>
                      <button
                        type="button"
                        className={`${css.actionBtn} ${css.actionBtnEye}`}
                        onClick={() => handleToggleHidden(row)}
                        aria-pressed={row.hidden}
                        title={row.hidden ? 'Show on map' : 'Hide on map'}
                      >
                        {row.hidden ? (
                          <EyeOff size={12} aria-hidden="true" />
                        ) : (
                          <Eye size={12} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        className={css.actionBtn}
                        onClick={() => handleFocus(row)}
                        disabled={!row.centroid}
                        title={row.centroid ? 'Focus on map' : 'No location'}
                      >
                        Focus
                      </button>
                      <button
                        type="button"
                        className={`${css.actionBtn} ${css.actionBtnDanger}`}
                        onClick={() => handleDelete(row)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function groupByGroupLabel(
  rows: PlacedFeatureRow[],
): Array<[string, PlacedFeatureRow[]]> {
  const map = new Map<string, PlacedFeatureRow[]>();
  for (const r of rows) {
    const list = map.get(r.groupLabel) ?? [];
    list.push(r);
    map.set(r.groupLabel, list);
  }
  return Array.from(map.entries());
}
