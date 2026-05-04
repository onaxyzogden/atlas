/**
 * §26 WorkspaceManagementReadinessCard — workspace-wide project posture audit.
 *
 * Sibling of §26 `AuditLogCard`, `MetadataManagementCard`, and the §26
 * `UserManagementReadinessCard` that lives on the collaboration tab. Where
 * those cards verdict a single project's per-project surfaces, this card
 * verdicts the *workspace itself* — how many projects the steward has, how
 * they break down by status (active/archived/shared/candidate) and type
 * (homestead/regenerative_farm/retreat_center/etc.), and whether recent
 * activity is concentrated or distributed. A pre-action sanity check before
 * the steward duplicates, archives, or transfers projects.
 *
 * Pure derivation — reads the current `useProjectStore` snapshot. No fetch,
 * no shared math, no map overlays.
 *
 * Closes manifest §26 `workspace-management` (P1) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import css from './WorkspaceManagementReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'healthy' | 'lean' | 'sparse' | 'cluttered' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  healthy: 'Workspace healthy',
  lean: 'Lean but viable',
  sparse: 'Single-project workspace',
  cluttered: 'Archive sprawl',
  empty: 'Workspace empty',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  healthy: 'Multiple active projects with varied types and recent activity.',
  lean: 'Workspace covers the basics but at minimum scale.',
  sparse: 'Only one project in this workspace — no comparison set yet.',
  cluttered: 'Archived projects dominate — prune or reactivate to keep the workspace legible.',
  empty: 'No projects loaded — open one to populate the workspace.',
};

type ProjectStatus = LocalProject['status'];

const STATUS_ORDER: ProjectStatus[] = ['active', 'shared', 'candidate', 'archived'];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  shared: 'Shared',
  candidate: 'Candidate',
  archived: 'Archived',
};

const RECENT_DAYS = 30;
const STALE_DAYS = 180;
const ARCHIVE_RATIO_THRESHOLD = 0.5;

function verdictClass(v: Verdict): string {
  if (v === 'healthy') return css.verdictGood ?? '';
  if (v === 'lean') return css.verdictMixed ?? '';
  if (v === 'sparse' || v === 'cluttered') return css.verdictWarn ?? '';
  return css.verdictEmpty ?? '';
}

function relativeDays(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return -1;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  return days < 0 ? 0 : days;
}

function relativeLabel(days: number): string {
  if (days < 0) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function typeLabel(t: string | null): string {
  if (!t) return 'Untyped';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkspaceManagementReadinessCard({ project }: Props): JSX.Element {
  const projects = useProjectStore((s) => s.projects);

  const audit = useMemo(() => {
    const total = projects.length;

    const statusCounts: Record<ProjectStatus, number> = {
      active: 0,
      shared: 0,
      candidate: 0,
      archived: 0,
    };
    const typeCounts = new Map<string, number>();
    let recentTouches = 0;
    let staleProjects = 0;
    let newestUpdateDays = Number.POSITIVE_INFINITY;

    for (const p of projects) {
      statusCounts[p.status] += 1;
      const tk = typeLabel(p.projectType);
      typeCounts.set(tk, (typeCounts.get(tk) ?? 0) + 1);
      const days = relativeDays(p.updatedAt);
      if (days < 0) continue;
      if (days <= RECENT_DAYS) recentTouches += 1;
      if (days > STALE_DAYS) staleProjects += 1;
      if (days < newestUpdateDays) newestUpdateDays = days;
    }
    const newestUpdateLabel =
      newestUpdateDays === Number.POSITIVE_INFINITY ? '—' : relativeLabel(newestUpdateDays);

    const activeCount = statusCounts.active;
    const archivedCount = statusCounts.archived;
    const distinctTypes = typeCounts.size;
    const archiveRatio = total === 0 ? 0 : archivedCount / total;

    let verdict: Verdict;
    if (total === 0) verdict = 'empty';
    else if (total === 1) verdict = 'sparse';
    else if (archiveRatio >= ARCHIVE_RATIO_THRESHOLD && activeCount <= 1) verdict = 'cluttered';
    else if (activeCount >= 2 && distinctTypes >= 2 && recentTouches >= 1) verdict = 'healthy';
    else verdict = 'lean';

    const types = Array.from(typeCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      statusCounts,
      activeCount,
      archivedCount,
      distinctTypes,
      recentTouches,
      staleProjects,
      newestUpdateLabel,
      archiveRatio,
      types,
      verdict,
    };
  }, [projects]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Workspace Management Readiness
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Verdicts the workspace containing <em>{project.name}</em> on project count, status
            distribution, type variety, and recent activity. The duplicate / archive / transfer
            actions live on the project switcher and dashboard — this is a pre-action sanity check.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {audit.total === 0 ? (
        <p className={css.empty}>
          No projects loaded in this workspace. Create or open a project to populate the audit.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.total}</span>
              <span className={css.statLabel}>Projects</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.activeCount}</span>
              <span className={css.statLabel}>Active</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.archivedCount}</span>
              <span className={css.statLabel}>Archived</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.distinctTypes}</span>
              <span className={css.statLabel}>Distinct types</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.recentTouches}</span>
              <span className={css.statLabel}>Touched ·30d</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.newestUpdateLabel}</span>
              <span className={css.statLabel}>Newest edit</span>
            </div>
          </div>

          <div className={css.block}>
            <h4 className={css.blockTitle}>Status distribution</h4>
            <ul className={css.statusList}>
              {STATUS_ORDER.map((s) => {
                const count = audit.statusCounts[s];
                const isActiveProjectStatus = project.status === s;
                const fillClass =
                  s === 'archived' ? css.rowBarFillArchive ?? '' : css.rowBarFill ?? '';
                return (
                  <li key={s} className={css.statusRow}>
                    <span className={css.rowLabel}>
                      {STATUS_LABEL[s]}
                      {isActiveProjectStatus ? <span className={css.activeTag}>this</span> : null}
                    </span>
                    <span className={css.rowCount}>{count}</span>
                    <span
                      className={`${css.rowBar} ${count === 0 ? css.barEmpty ?? '' : ''}`}
                      aria-hidden="true"
                    >
                      <span
                        className={fillClass}
                        style={{ width: `${audit.total === 0 ? 0 : (count / audit.total) * 100}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {audit.types.length > 0 && (
            <div className={css.block}>
              <h4 className={css.blockTitle}>Type mix</h4>
              <ul className={css.typeList}>
                {audit.types.map((t) => {
                  const isActive = typeLabel(project.projectType) === t.label;
                  return (
                    <li key={t.label} className={css.typeRow}>
                      <span className={css.rowLabel}>
                        {t.label}
                        {isActive ? <span className={css.activeTag}>this</span> : null}
                      </span>
                      <span className={css.rowCount}>{t.count}</span>
                      <span
                        className={`${css.rowBar} ${t.count === 0 ? css.barEmpty ?? '' : ''}`}
                        aria-hidden="true"
                      >
                        <span
                          className={css.rowBarFill}
                          style={{
                            width: `${audit.total === 0 ? 0 : (t.count / audit.total) * 100}%`,
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(audit.total === 1 ||
            audit.archiveRatio >= ARCHIVE_RATIO_THRESHOLD ||
            audit.staleProjects > 0 ||
            audit.distinctTypes <= 1) && (
            <div className={`${css.block} ${css.warnBlock}`}>
              <h4 className={css.blockTitle}>Workspace flags</h4>
              <ul className={css.flagList}>
                {audit.total === 1 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>!</span>
                    Single-project workspace — no peer projects to compare against or borrow
                    templates from. Consider duplicating once a baseline is set.
                  </li>
                )}
                {audit.archiveRatio >= ARCHIVE_RATIO_THRESHOLD && audit.total > 1 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>!</span>
                    {audit.archivedCount} of {audit.total} projects are archived (
                    {Math.round(audit.archiveRatio * 100)}%) — the switcher will feel cluttered.
                    Prune stale archives or reactivate.
                  </li>
                )}
                {audit.distinctTypes <= 1 && audit.total > 1 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>?</span>
                    All projects share a single type — the workspace is narrow. Adding a contrasting
                    type (retreat, market_garden, etc.) builds comparison range.
                  </li>
                )}
                {audit.staleProjects > 0 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>·</span>
                    {audit.staleProjects} project{audit.staleProjects === 1 ? '' : 's'} not edited
                    in {Math.round(STALE_DAYS / 30)} months — confirm whether they should be
                    archived or revisited.
                  </li>
                )}
              </ul>
            </div>
          )}

          <p className={css.footnote}>
            <em>Verdict thresholds:</em> healthy = ≥2 active, ≥2 distinct types, ≥1 recent edit;
            cluttered = archived share ≥{Math.round(ARCHIVE_RATIO_THRESHOLD * 100)}% with ≤1 active;
            sparse = exactly 1 project. Recent-edit window is {RECENT_DAYS}d; stale threshold is{' '}
            {STALE_DAYS}d.
          </p>
        </>
      )}
    </section>
  );
}
