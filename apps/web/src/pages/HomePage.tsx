/**
 * HomePage — project listing and welcome state.
 * Shows saved projects or an empty state guiding the user to create their first project.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import styles from './HomePage.module.css';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-Enterprise',
  moontrance: 'OGDEN Template',
};

type StatusFilter = 'all' | 'active' | 'candidate';

export default function HomePage() {
  const projects = useProjectStore((s) => s.projects);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const navigate = useNavigate();

  const handleDuplicate = (sourceId: string) => {
    const clone = duplicateProject(sourceId);
    if (clone) {
      setActiveProject(clone.id);
      navigate({ to: '/project/$projectId', params: { projectId: clone.id } });
    }
  };

  // §1 save-candidates: stewards flag exploratory properties as "candidates"
  // so the working list stays focused on active builds. The LocalProject
  // status union already has 'candidate' — this UI just surfaces writers
  // and a filter chip. Toggles between 'active' and 'candidate'; doesn't
  // touch 'archived' or 'shared'.
  const toggleCandidate = (projectId: string, current: string) => {
    updateProject(projectId, {
      status: current === 'candidate' ? 'active' : 'candidate',
    });
  };

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const candidateCount = projects.filter((p) => p.status === 'candidate').length;
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const visibleProjects = projects.filter((p) => {
    if (statusFilter === 'candidate') return p.status === 'candidate';
    if (statusFilter === 'active') return p.status === 'active';
    return true; // 'all' — include archived + shared too, preserving the
    // historical default of showing every row.
  });

  // §1 Compare-mode: a steward toggles "Compare" in the header, picks
  // 2+ project cards via checkboxes, then jumps to /projects/compare with
  // a comma-separated id list. Cancelling clears the selection without
  // navigating away.
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const startCompare = () => {
    setCompareMode(true);
    setSelectedIds([]);
  };
  const cancelCompare = () => {
    setCompareMode(false);
    setSelectedIds([]);
  };
  const submitCompare = () => {
    if (selectedIds.length < 2) return;
    navigate({
      to: '/projects/compare',
      search: { ids: selectedIds.join(',') },
    });
  };

  const [ready, setReady] = useState(() => useProjectStore.persist.hasHydrated?.() ?? true);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), 150);
    try {
      const unsub = useProjectStore.persist.onFinishHydration?.(() => {
        setReady(true);
        clearTimeout(timer);
      });
      return () => { clearTimeout(timer); unsub?.(); };
    } catch {
      clearTimeout(timer);
      setReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyInner}>
          {/* Landscape icon */}
          <svg className={styles.emptyIcon} viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="12" width="56" height="48" rx="4" />
            <path d="M8 48l16-16 12 12 8-8 20 20" />
            <circle cx="24" cy="28" r="5" />
          </svg>

          <h1 className={styles.emptyTitle}>Welcome to OGDEN</h1>
          <p className={styles.emptyTagline}>
            A tool for seeing land whole — and building it wisely.
            <br />
            Start by creating your first property project.
          </p>

          <Link to="/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg">
              + New Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Projects</h1>
          <div className={styles.headerActions}>
            {compareMode ? (
              <>
                <span className={styles.selectionCount}>
                  {selectedIds.length} selected
                </span>
                <Button variant="secondary" size="sm" onClick={cancelCompare}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {/* §1 Candidate filter — hidden until a candidate exists so
                    the chrome doesn't clutter fresh accounts. */}
                {candidateCount > 0 && (
                  <div className={styles.filterChips} role="tablist" aria-label="Filter projects by status">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === 'all'}
                      className={`${styles.filterChip} ${statusFilter === 'all' ? styles.filterChipActive : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All <span className={styles.filterChipCount}>{projects.length}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === 'active'}
                      className={`${styles.filterChip} ${statusFilter === 'active' ? styles.filterChipActive : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      Active <span className={styles.filterChipCount}>{activeCount}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === 'candidate'}
                      className={`${styles.filterChip} ${statusFilter === 'candidate' ? styles.filterChipActive : ''}`}
                      onClick={() => setStatusFilter('candidate')}
                    >
                      Candidates <span className={styles.filterChipCount}>{candidateCount}</span>
                    </button>
                  </div>
                )}
                {projects.length >= 2 && (
                  <Button variant="secondary" size="sm" onClick={startCompare}>
                    Compare
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {visibleProjects.length === 0 && statusFilter !== 'all' && (
          <div className={styles.filterEmpty}>
            {statusFilter === 'candidate'
              ? 'No projects marked as candidates yet. Use the "Mark as candidate" button on a project card to flag an exploratory property.'
              : 'No active projects. Promote a candidate from the Candidates tab, or create a new project.'}
          </div>
        )}

        <div className={styles.grid}>
          {visibleProjects.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            const isCandidate = p.status === 'candidate';
            const cardClass = `${styles.card} ${compareMode && isSelected ? styles.cardSelected : ''} ${isCandidate ? styles.cardCandidate : ''}`;
            const inner = (
              <>
                <h3 className={styles.cardName}>{p.name}</h3>

                <div className={styles.cardBadges}>
                  {p.projectType && (
                    <Badge variant="default" size="sm">
                      {PROJECT_TYPE_LABELS[p.projectType] ?? p.projectType}
                    </Badge>
                  )}
                  {isCandidate && (
                    <Badge variant="info" size="sm" dot>
                      Candidate
                    </Badge>
                  )}
                  {p.isBuiltin && (
                    <Badge variant="info" size="sm" dot>
                      Sample
                    </Badge>
                  )}
                </div>

                {p.description && (
                  <p className={styles.cardDesc}>
                    {p.description.length > 120 ? p.description.slice(0, 120) + '\u2026' : p.description}
                  </p>
                )}

                <div className={styles.cardMeta}>
                  {p.address && <span>{p.address}</span>}
                  <span className={styles.cardMetaRight}>
                    <span className={`${styles.boundaryDot} ${p.hasParcelBoundary ? styles.boundaryDotSet : styles.boundaryDotNone}`} />
                    {p.hasParcelBoundary ? 'Boundary set' : 'No boundary'}
                  </span>
                </div>
              </>
            );
            return (
              <div key={p.id} className={styles.cardWrapper}>
                {compareMode ? (
                  <button
                    type="button"
                    onClick={() => toggleSelected(p.id)}
                    className={cardClass}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Unselect' : 'Select'} ${p.name} for comparison`}
                  >
                    <span
                      className={`${styles.selectCheckbox} ${isSelected ? styles.selectCheckboxOn : ''}`}
                      aria-hidden="true"
                    >
                      {isSelected ? '\u2713' : ''}
                    </span>
                    {inner}
                  </button>
                ) : (
                  <Link
                    to="/project/$projectId"
                    params={{ projectId: p.id }}
                    className={cardClass}
                  >
                    {inner}
                  </Link>
                )}
                {!compareMode && !p.isBuiltin && (
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCandidate(p.id, p.status);
                      }}
                      aria-label={
                        isCandidate
                          ? `Promote ${p.name} to an active project`
                          : `Mark ${p.name} as a candidate property`
                      }
                      title={
                        isCandidate
                          ? 'Promote to active project'
                          : 'Mark as candidate (exploratory)'
                      }
                    >
                      {isCandidate ? 'Promote' : 'Candidate'}
                    </button>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDuplicate(p.id);
                      }}
                      aria-label={`Duplicate ${p.name} as a new project`}
                      title="Duplicate as template"
                    >
                      Duplicate
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {compareMode && (
        <div className={styles.compareBar} role="region" aria-label="Comparison selection">
          <span className={styles.compareBarText}>
            {selectedIds.length === 0
              ? 'Pick at least 2 projects to compare.'
              : selectedIds.length === 1
                ? '1 selected \u2014 pick at least one more.'
                : `${selectedIds.length} selected \u2014 ready to compare.`}
          </span>
          <div className={styles.compareBarActions}>
            <Button variant="secondary" size="sm" onClick={cancelCompare}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submitCompare}
              disabled={selectedIds.length < 2}
            >
              Compare {selectedIds.length >= 2 ? `(${selectedIds.length})` : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
