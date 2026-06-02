// PortfolioHomePage.tsx
//
// Container for the multi-project Portfolio Home surface
// (OLOS_Portfolio_Home_Spec_v1.0). A slim top bar carries the view toggle
// (§6) and the New-project action; below it sits either the four-zone Map
// view (§2, the primary surface) or the card-grid Dashboard view (§3).
//
// Mounted at `/v3/portfolio`. The original urgency-ordered card grid (Phase 5,
// Slice 5.3) is preserved as PortfolioDashboardView per the no-deletion rule —
// the map view is the new default, the grid is one toggle away.
//
// Multi-select (2026-06-02): the host owns a single select-mode + selection
// state and threads it into BOTH surfaces, so one toolbar drives batch archive
// / unarchive / delete from either the grid or the map list. A "Show archived"
// toggle swaps the visible set (the host otherwise hard-filters archived
// projects out) so archive stays reversible. Builtins are never selectable —
// the per-id store actions no-op on them anyway.

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import { toast } from '../../components/Toast.js';
import { ConfirmDestructiveDialog } from '../../components/ui/ConfirmDestructiveDialog.js';
import PortfolioMapPage from './PortfolioMapPage.js';
import PortfolioDashboardView from './PortfolioDashboardView.js';
import PortfolioBatchActionBar from './PortfolioBatchActionBar.js';
import PortfolioViewToggle, { type PortfolioView } from './PortfolioViewToggle.js';
import css from './PortfolioHomePage.module.css';

/** Select-mode bundle threaded into both portfolio surfaces. When `selectMode`
 *  is off the surfaces behave exactly as before (navigate / map-select). */
export interface PortfolioSelectMode {
  selectMode: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
}

type ConfirmKind = 'archive' | 'unarchive' | 'delete' | null;

export default function PortfolioHomePage() {
  const projects = useProjectStore((s) => s.projects);
  const archiveProjects = useProjectStore((s) => s.archiveProjects);
  const unarchiveProjects = useProjectStore((s) => s.unarchiveProjects);
  const deleteProjects = useProjectStore((s) => s.deleteProjects);
  const navigate = useNavigate();
  const [view, setView] = useState<PortfolioView>('map');

  const [selectMode, setSelectMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [busy, setBusy] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects],
  );
  const archivedProjects = useMemo(
    () => projects.filter((p) => p.status === 'archived'),
    [projects],
  );
  const visibleProjects = showArchived ? archivedProjects : activeProjects;

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelected = (id: string) => {
    // Builtins are never selectable (the store actions no-op on them anyway).
    const target = projects.find((p) => p.id === id);
    if (target?.isBuiltin) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterSelect = () => {
    setSelectMode(true);
    clearSelection();
  };
  const exitSelect = () => {
    setSelectMode(false);
    clearSelection();
  };

  const toggleShowArchived = () => {
    setShowArchived((v) => !v);
    clearSelection();
  };

  const selectedCount = selectedIds.size;

  const runBatchOp = async (kind: Exclude<ConfirmKind, null>) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const op =
        kind === 'archive'
          ? archiveProjects
          : kind === 'unarchive'
            ? unarchiveProjects
            : deleteProjects;
      const verb =
        kind === 'archive' ? 'archived' : kind === 'unarchive' ? 'restored' : 'deleted';
      const { ok, failed } = await op(ids);
      if (failed === 0) {
        toast.success(`${ok} ${ok === 1 ? 'project' : 'projects'} ${verb}.`);
      } else {
        toast.error(`${ok} ${verb}, ${failed} failed.`);
      }
    } finally {
      setBusy(false);
      setConfirmKind(null);
      exitSelect();
    }
  };

  return (
    <div className={css.container}>
      <div className={css.topbar}>
        <div className={css.topbarLead}>
          <span className={css.eyebrow}>Portfolio</span>
          <span className={css.countLabel}>
            {visibleProjects.length}{' '}
            {showArchived
              ? visibleProjects.length === 1
                ? 'archived project'
                : 'archived projects'
              : visibleProjects.length === 1
                ? 'project'
                : 'projects'}
          </span>
        </div>
        <div className={css.topbarActions}>
          <PortfolioViewToggle view={view} onChange={setView} />
          <button
            type="button"
            className={css.selectBtn}
            data-active={showArchived}
            onClick={toggleShowArchived}
          >
            {showArchived ? 'Showing archived' : `Show archived (${archivedProjects.length})`}
          </button>
          <button
            type="button"
            className={css.selectBtn}
            data-active={selectMode}
            onClick={selectMode ? exitSelect : enterSelect}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
          {!selectMode && (
            <button
              type="button"
              className={css.addBtn}
              onClick={() => navigate({ to: '/v3/project/wizard' })}
            >
              + New project
            </button>
          )}
        </div>
      </div>

      <div className={css.viewArea}>
        {view === 'map' ? (
          <PortfolioMapPage
            projects={visibleProjects}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
          />
        ) : (
          <div className={css.scrollHost}>
            <PortfolioDashboardView
              projects={visibleProjects}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
            />
          </div>
        )}
      </div>

      {selectMode && selectedCount > 0 && (
        <PortfolioBatchActionBar
          count={selectedCount}
          showingArchived={showArchived}
          onArchive={() => setConfirmKind('archive')}
          onUnarchive={() => setConfirmKind('unarchive')}
          onDelete={() => setConfirmKind('delete')}
          onCancel={exitSelect}
          busy={busy}
        />
      )}

      <ConfirmDestructiveDialog
        open={confirmKind === 'archive'}
        tone="warn"
        title={`Archive ${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'}?`}
        body={
          <p>
            Archived projects are hidden from the active portfolio but keep all
            their data. You can restore them anytime with &ldquo;Show
            archived.&rdquo;
          </p>
        }
        confirmLabel="Archive"
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => runBatchOp('archive')}
      />

      <ConfirmDestructiveDialog
        open={confirmKind === 'unarchive'}
        tone="warn"
        title={`Restore ${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'}?`}
        body={<p>These projects will return to your active portfolio.</p>}
        confirmLabel="Unarchive"
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => runBatchOp('unarchive')}
      />

      <ConfirmDestructiveDialog
        open={confirmKind === 'delete'}
        tone="danger"
        typedConfirmation="delete"
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'}?`}
        body={
          <p>
            This permanently removes{' '}
            {selectedCount === 1 ? 'this project' : 'these projects'} — every
            zone, design element, plan, and attachment. This cannot be undone.
          </p>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => runBatchOp('delete')}
      />
    </div>
  );
}
