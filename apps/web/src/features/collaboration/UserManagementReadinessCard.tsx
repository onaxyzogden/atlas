/**
 * §26 UserManagementReadinessCard — project user-management readiness audit.
 *
 * Sibling of §26 `AuditLogCard` and `MetadataManagementCard`. Verdicts the
 * project's membership posture from the populated `useMemberStore` snapshot:
 * total members, role distribution, owner concentration, recent join
 * activity, and stale-membership signals. The fuller invite / role-change /
 * remove UI lives below in `MembersTab`; this is a pre-action audit that
 * surfaces governance risks (single-owner concentration, viewer-only set,
 * solo project) before the steward starts inviting or pruning.
 *
 * Pure derivation — reads the current `useMemberStore` snapshot. No fetch
 * is triggered here; `MembersTab` already populates the store on mount.
 *
 * Closes manifest §26 `user-management` (P1) partial -> done.
 */

import { useMemo } from 'react';
import { useMemberStore } from '../../store/memberStore.js';
import { useAuthStore } from '../../store/authStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { ProjectRole } from '@ogden/shared';
import css from './UserManagementReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'healthy' | 'adequate' | 'solo' | 'sparse' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  healthy: 'Healthy roster',
  adequate: 'Adequate but lean',
  solo: 'Solo project',
  sparse: 'Single-owner risk',
  empty: 'Roster not loaded',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  healthy: 'Multiple roles populated; no concentration risk.',
  adequate: 'Roster covers required roles but at minimum staffing.',
  solo: 'Only the owner is on this project — no review or design help.',
  sparse: 'Single owner with no co-owner — succession risk if access is lost.',
  empty: 'No member records cached — open this tab while signed in to populate.',
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

const ROLES_ORDER: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];

const RECENT_JOIN_DAYS = 30;
const STALE_DAYS = 180;

function verdictClass(v: Verdict): string {
  if (v === 'healthy') return css.verdictGood ?? '';
  if (v === 'adequate') return css.verdictMixed ?? '';
  if (v === 'solo' || v === 'sparse') return css.verdictWarn ?? '';
  return css.verdictEmpty ?? '';
}

function relativeAge(iso: string): { label: string; days: number } {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { label: '—', days: -1 };
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return { label: 'today', days: 0 };
  if (days === 1) return { label: '1d ago', days };
  if (days < 30) return { label: `${days}d ago`, days };
  if (days < 365) return { label: `${Math.floor(days / 30)}mo ago`, days };
  return { label: `${Math.floor(days / 365)}y ago`, days };
}

export default function UserManagementReadinessCard({ project }: Props): JSX.Element {
  const members = useMemberStore((s) => s.members);
  const myRole = useMemberStore((s) => s.myRole);
  const isLoading = useMemberStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => !!s.user);

  const audit = useMemo(() => {
    const total = members.length;

    const counts: Record<ProjectRole, number> = {
      owner: 0,
      designer: 0,
      reviewer: 0,
      viewer: 0,
    };
    for (const m of members) counts[m.role] += 1;

    let recentJoins = 0;
    let staleMembers = 0;
    let newestJoinDays = Number.POSITIVE_INFINITY;
    for (const m of members) {
      const age = relativeAge(m.joinedAt);
      if (age.days < 0) continue;
      if (age.days <= RECENT_JOIN_DAYS) recentJoins += 1;
      if (age.days > STALE_DAYS) staleMembers += 1;
      if (age.days < newestJoinDays) newestJoinDays = age.days;
    }
    const newestJoinLabel =
      newestJoinDays === Number.POSITIVE_INFINITY
        ? '—'
        : newestJoinDays === 0
        ? 'today'
        : newestJoinDays === 1
        ? '1d ago'
        : newestJoinDays < 30
        ? `${newestJoinDays}d ago`
        : `${Math.floor(newestJoinDays / 30)}mo ago`;

    const ownerCount = counts.owner;
    const collaboratorCount = counts.designer + counts.reviewer;

    let verdict: Verdict;
    if (total === 0) verdict = 'empty';
    else if (total === 1 && ownerCount === 1) verdict = 'solo';
    else if (ownerCount === 1 && total < 4) verdict = 'sparse';
    else if (ownerCount >= 2 && collaboratorCount >= 1) verdict = 'healthy';
    else verdict = 'adequate';

    return {
      total,
      counts,
      ownerCount,
      collaboratorCount,
      recentJoins,
      staleMembers,
      newestJoinLabel,
      verdict,
    };
  }, [members]);

  if (!isAuthenticated) {
    return (
      <section className={css.card}>
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>
              User Management Readiness
              <span className={css.badge}>AUDIT</span>
            </h3>
            <p className={css.cardHint}>
              Sign in to load the project's member roster and verdict its governance posture.
            </p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            User Management Readiness
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Verdicts the membership of <em>{project.name}</em> on owner concentration, role coverage,
            and join recency. The full invite / role-change / remove flow lives below in this tab —
            this is a pre-action sanity check.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {audit.total === 0 ? (
        <p className={css.empty}>
          {isLoading
            ? 'Loading members…'
            : 'No member records cached for this project. The roster populates from the API on first visit to this tab.'}
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.total}</span>
              <span className={css.statLabel}>Members</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.ownerCount}</span>
              <span className={css.statLabel}>Owners</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.collaboratorCount}</span>
              <span className={css.statLabel}>Collaborators</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.recentJoins}</span>
              <span className={css.statLabel}>Joined ·30d</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.staleMembers}</span>
              <span className={css.statLabel}>Stale ·180d+</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.newestJoinLabel}</span>
              <span className={css.statLabel}>Newest join</span>
            </div>
          </div>

          <div className={css.block}>
            <h4 className={css.blockTitle}>Role distribution</h4>
            <ul className={css.roleList}>
              {ROLES_ORDER.map((r) => {
                const count = audit.counts[r];
                const isMine = myRole === r;
                return (
                  <li key={r} className={css.roleRow}>
                    <span className={css.roleLabel}>
                      {ROLE_LABEL[r]}
                      {isMine ? <span className={css.youTag}>you</span> : null}
                    </span>
                    <span className={css.roleCount}>{count}</span>
                    <span
                      className={`${css.roleBar} ${count === 0 ? css.barEmpty ?? '' : ''}`}
                      aria-hidden="true"
                    >
                      <span
                        className={css.roleBarFill}
                        style={{ width: `${audit.total === 0 ? 0 : (count / audit.total) * 100}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {(audit.ownerCount === 1 || audit.collaboratorCount === 0 || audit.staleMembers > 0) && (
            <div className={`${css.block} ${css.warnBlock}`}>
              <h4 className={css.blockTitle}>Governance flags</h4>
              <ul className={css.flagList}>
                {audit.ownerCount === 0 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>!</span>
                    No owner present — roster cannot grant or revoke access. Verify the API call
                    completed.
                  </li>
                )}
                {audit.ownerCount === 1 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>!</span>
                    Single owner — succession risk if this account is lost or rotated. Promote a
                    second owner before sharing externally.
                  </li>
                )}
                {audit.total > 0 && audit.collaboratorCount === 0 && audit.counts.viewer > 0 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>?</span>
                    Only viewers besides owner — nobody is empowered to design or review. Promote at
                    least one designer or reviewer.
                  </li>
                )}
                {audit.staleMembers > 0 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>·</span>
                    {audit.staleMembers} member{audit.staleMembers === 1 ? '' : 's'} joined more than
                    {' '}{Math.round(STALE_DAYS / 30)} months ago — confirm continued involvement.
                  </li>
                )}
              </ul>
            </div>
          )}

          <p className={css.footnote}>
            <em>Verdict thresholds:</em> healthy = ≥2 owners and ≥1 designer/reviewer; sparse = 1 owner
            and total &lt; 4; solo = exactly 1 member (owner only). Recent-join window is{' '}
            {RECENT_JOIN_DAYS}d; stale threshold is {STALE_DAYS}d.
          </p>
        </>
      )}
    </section>
  );
}
