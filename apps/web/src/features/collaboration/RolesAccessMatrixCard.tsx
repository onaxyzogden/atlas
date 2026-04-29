/**
 * §20 RolesAccessMatrixCard — access-posture rollup for a project.
 *
 * MembersTab already invites people, lists them, and lets owners flip
 * roles. What's been missing is a steward-facing rollup that answers:
 * "what does our access posture look like right now?" — i.e. how many
 * people hold each role, what each role is allowed to do, and where
 * the gaps are (no reviewer, single-owner bus risk, no designer, all
 * viewers, my own role unknown).
 *
 * Pure derivation from memberStore + authStore. No member writes.
 *
 * Closes manifest §20 `multi-user-rbac` (P3) partial -> done.
 */

import { useEffect, useMemo } from 'react';
import { useMemberStore } from '../../store/memberStore.js';
import { useAuthStore } from '../../store/authStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { ProjectRole } from '@ogden/shared';
import css from './RolesAccessMatrixCard.module.css';

interface Props {
  project: LocalProject;
}

const ROLES: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

const ROLE_BLURB: Record<ProjectRole, string> = {
  owner: 'Full access — can invite, transfer, delete',
  designer: 'Edits zones, structures, paths',
  reviewer: 'Comments and suggests edits',
  viewer: 'Read-only',
};

type Action = 'read' | 'comment' | 'edit' | 'approve';
const ACTIONS: Action[] = ['read', 'comment', 'edit', 'approve'];
const ACTION_LABEL: Record<Action, string> = {
  read: 'View',
  comment: 'Comment',
  edit: 'Edit',
  approve: 'Approve / sign-off',
};

const RBAC: Record<ProjectRole, Record<Action, boolean>> = {
  owner:    { read: true, comment: true, edit: true, approve: true },
  designer: { read: true, comment: true, edit: true, approve: false },
  reviewer: { read: true, comment: true, edit: false, approve: true },
  viewer:   { read: true, comment: false, edit: false, approve: false },
};

interface Flag {
  level: 'warn' | 'info' | 'ok';
  text: string;
}

export default function RolesAccessMatrixCard({ project }: Props) {
  const members = useMemberStore((s) => s.members);
  const myRole = useMemberStore((s) => s.myRole);
  const isLoading = useMemberStore((s) => s.isLoading);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const fetchMyRole = useMemberStore((s) => s.fetchMyRole);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;

  const projectId = project.serverId ?? project.id;

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembers(projectId);
      fetchMyRole(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isAuthenticated]);

  const counts = useMemo(() => {
    const c: Record<ProjectRole, number> = { owner: 0, designer: 0, reviewer: 0, viewer: 0 };
    for (const m of members) c[m.role] += 1;
    return c;
  }, [members]);

  const total = members.length;

  const flags: Flag[] = useMemo(() => {
    const out: Flag[] = [];
    if (total === 0) {
      out.push({ level: 'warn', text: 'No members loaded yet — sign in to fetch the team roster.' });
      return out;
    }
    if (counts.owner === 0) {
      out.push({ level: 'warn', text: 'No owner on record — ownership transfer or invite chain may be broken.' });
    } else if (counts.owner === 1 && total > 1) {
      out.push({ level: 'info', text: 'Single owner — consider naming a backup before extended absences.' });
    }
    if (counts.reviewer === 0 && total > 1) {
      out.push({ level: 'warn', text: 'No reviewer assigned — comments and sign-off lack a dedicated voice.' });
    }
    if (counts.designer === 0 && total > 1) {
      out.push({ level: 'info', text: 'No designer — only owner edits will land. Add a designer to share execution.' });
    }
    if (total > 1 && counts.owner === 0 && counts.designer === 0) {
      out.push({ level: 'warn', text: 'Read-only team — no one can place or move features on this project.' });
    }
    if (out.length === 0) {
      out.push({ level: 'ok', text: 'Healthy posture — owner, design capacity, and reviewer voice are all present.' });
    }
    return out;
  }, [counts, total]);

  const editors = counts.owner + counts.designer;
  const voices = counts.owner + counts.reviewer;

  return (
    <section className={css.card} aria-label="Roles and access matrix">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Roles & Access</h3>
          <p className={css.cardHint}>
            Who holds which role on this project, what each role can do, and where the gaps
            are. Rollup of <strong>{total}</strong> member{total === 1 ? '' : 's'} from the
            project access list.
          </p>
        </div>
        {myRole && (
          <span className={`${css.myRoleBadge} ${css[`role_${myRole}`]}`}>
            You {'\u2192'} {ROLE_LABEL[myRole]}
          </span>
        )}
      </header>

      {!isAuthenticated ? (
        <p className={css.empty}>Sign in to view the access matrix for this project.</p>
      ) : isLoading && total === 0 ? (
        <p className={css.empty}>Loading team roster…</p>
      ) : (
        <>
          <div className={css.headlineRow}>
            <Headline value={total} label="members" />
            <Headline value={editors} label="can edit" />
            <Headline value={voices} label="can sign off" />
            <Headline value={counts.viewer} label="read-only" />
          </div>

          <ul className={css.roleStrip} aria-label="Role distribution">
            {ROLES.map((r) => (
              <li key={r} className={`${css.roleChip} ${css[`role_${r}`]}`}>
                <span className={css.roleCount}>{counts[r]}</span>
                <span className={css.roleName}>{ROLE_LABEL[r]}</span>
                <span className={css.roleBlurb}>{ROLE_BLURB[r]}</span>
              </li>
            ))}
          </ul>

          <div className={css.matrixWrap}>
            <table className={css.matrix}>
              <thead>
                <tr>
                  <th className={css.thRole}>Role</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className={css.thAction}>{ACTION_LABEL[a]}</th>
                  ))}
                  <th className={css.thHeld}>Held</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r} className={counts[r] === 0 ? css.rowVacant : undefined}>
                    <td className={`${css.tdRole} ${css[`role_${r}`]}`}>{ROLE_LABEL[r]}</td>
                    {ACTIONS.map((a) => (
                      <td key={a} className={css.tdAction}>
                        <span className={RBAC[r][a] ? css.cellYes : css.cellNo}>
                          {RBAC[r][a] ? '\u2713' : '\u2014'}
                        </span>
                      </td>
                    ))}
                    <td className={css.tdHeld}>
                      {counts[r] > 0 ? (
                        <span className={css.heldYes}>{counts[r]}</span>
                      ) : (
                        <span className={css.heldNo}>none</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={css.flagList} aria-label="Access posture flags">
            {flags.map((f, i) => (
              <li key={i} className={`${css.flag} ${css[`flag_${f.level}`]}`}>
                <span className={css.flagDot} aria-hidden="true" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={css.footnote}>
        Static permission table {'\u2014'} mirrors the rules enforced by the API. Manage
        members and flip roles in the Collaboration panel below.
      </p>
    </section>
  );
}

function Headline({ value, label }: { value: number; label: string }) {
  return (
    <div className={css.headline}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
