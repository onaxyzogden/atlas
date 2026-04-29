/**
 * MembersTab — invite team members, manage roles, list project collaborators.
 * Replaces the static placeholder in CollaborationPanel.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMemberStore } from '../../store/memberStore.js';
import { useAuthStore } from '../../store/authStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { ProjectRole } from '@ogden/shared';
import p from '../../styles/panel.module.css';
import { role as roleToken, semantic } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import UserManagementReadinessCard from './UserManagementReadinessCard.js';

interface MembersTabProps {
  project: LocalProject;
}

const ROLE_CONFIG: Record<string, { icon: string; color: string; desc: string }> = {
  owner:    { icon: '\u{1F451}', color: roleToken.owner, desc: 'Full access \u2014 create, edit, delete, share' },
  designer: { icon: '\u270F\uFE0F',  color: roleToken.designer, desc: 'Edit zones, structures, paths \u2014 no delete' },
  reviewer: { icon: '\u{1F4AC}', color: roleToken.reviewer, desc: 'Comment, suggest edits \u2014 no direct changes' },
  viewer:   { icon: '\u{1F441}\uFE0F',  color: roleToken.viewer, desc: 'View only \u2014 no comments or changes' },
};

const ASSIGNABLE_ROLES: Array<Exclude<ProjectRole, 'owner'>> = ['designer', 'reviewer', 'viewer'];

export default function MembersTab({ project }: MembersTabProps) {
  const members = useMemberStore((s) => s.members);
  const myRole = useMemberStore((s) => s.myRole);
  const isLoading = useMemberStore((s) => s.isLoading);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const fetchMyRole = useMemberStore((s) => s.fetchMyRole);
  const inviteMember = useMemberStore((s) => s.inviteMember);
  const updateRole = useMemberStore((s) => s.updateRole);
  const removeMember = useMemberStore((s) => s.removeMember);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<ProjectRole, 'owner'>>('reviewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const projectId = project.serverId ?? project.id;

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembers(projectId);
      fetchMyRole(projectId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isAuthenticated]);

  const isOwner = myRole === 'owner';

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setIsInviting(true);
    try {
      await inviteMember(projectId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to invite member';
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  }, [inviteEmail, inviteRole, projectId, inviteMember]);

  const handleRoleChange = useCallback((userId: string, newRole: Exclude<ProjectRole, 'owner'>) => {
    updateRole(projectId, userId, newRole);
  }, [projectId, updateRole]);

  const handleRemove = useCallback((userId: string) => {
    removeMember(projectId, userId);
  }, [projectId, removeMember]);

  if (!isAuthenticated) {
    return (
      <div>
        <div className={`${p.empty} ${p.leading16}`}>
          Sign in to manage project members and collaborate with your team.
        </div>
        <RoleReference />
      </div>
    );
  }

  return (
    <div>
      {/* §26 user-management readiness audit (sibling of AuditLogCard) */}
      <UserManagementReadinessCard project={project} />

      {/* Invite form (owner only) */}
      {isOwner && (
        <div className={p.mb16}>
          <h3 className={p.sectionLabel}>Invite Member</h3>
          <div className={`${p.row}`} style={{ gap: 6, marginBottom: 6 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              placeholder="Email address..."
              className={p.input}
              style={{ flex: 1 }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Exclude<ProjectRole, 'owner'>)}
              style={{
                background: 'var(--color-panel-subtle)', color: 'var(--color-panel-text)',
                border: '1px solid var(--color-panel-card-border)', borderRadius: 6,
                padding: '6px 8px', fontSize: 12, cursor: 'pointer',
              }}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || isInviting}
            className={`${p.btnSmall} ${p.fontSemibold}`}
            style={{
              padding: '8px 14px', width: '100%',
              background: inviteEmail.trim() ? 'rgba(212,175,95,0.15)' : 'var(--color-panel-subtle)',
              color: inviteEmail.trim() ? 'var(--color-gold-brand)' : 'var(--color-panel-muted)',
              cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
              border: inviteEmail.trim() ? '1px solid rgba(212,175,95,0.25)' : '1px solid transparent',
              borderRadius: 6,
            }}
          >
            {isInviting ? 'Inviting...' : 'Invite'}
          </button>
          {inviteError && (
            <div className={`${p.text11}`} style={{ color: '#ef4444' /* red error */, marginTop: 6 }}>
              {inviteError}
            </div>
          )}
        </div>
      )}

      {/* Member list */}
      <h3 className={p.sectionLabel}>
        Team ({members.length})
        {isLoading && <span className={`${p.text10} ${p.muted}`} style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>loading...</span>}
      </h3>
      <div className={`${p.section} ${p.mb16}`}>
        {members.map((m) => {
          const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.viewer!;
          const isCurrentUser = m.userId === user?.id;
          const isMemberOwner = m.role === 'owner';
          return (
            <div
              key={m.userId}
              className={`${p.cardCompact} ${p.cardRow}`}
              style={{
                padding: '10px 12px',
                background: 'var(--color-panel-card)',
                border: '1px solid var(--color-panel-card-border)',
                alignItems: 'center',
              }}
            >
              {/* Avatar initial */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: `${cfg.color}22`, color: cfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {(m.displayName ?? m.email)[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.displayName ?? m.email.split('@')[0]}
                  {isCurrentUser && <span className={`${p.text10} ${p.muted}`} style={{ marginLeft: 4 }}>(you)</span>}
                </div>
                <div className={`${p.text10} ${p.muted}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.email}
                </div>
              </div>

              {/* Role badge / selector */}
              {isOwner && !isMemberOwner && !isCurrentUser ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.userId, e.target.value as Exclude<ProjectRole, 'owner'>)}
                  style={{
                    background: 'transparent', color: cfg.color,
                    border: `1px solid ${cfg.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: cfg.color,
                  background: `${cfg.color}15`, padding: '2px 8px',
                  borderRadius: 4, flexShrink: 0,
                }}>
                  {cfg.icon} {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                </span>
              )}

              {/* Remove button (owner only, not self, not other owner) */}
              {isOwner && !isMemberOwner && !isCurrentUser && (
                <DelayedTooltip label="Remove member">
                <button
                  onClick={() => handleRemove(m.userId)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--color-panel-muted)', fontSize: 14, padding: '0 4px',
                    flexShrink: 0,
                  }}
                >
                  {'\u2715'}
                </button>
                </DelayedTooltip>
              )}
            </div>
          );
        })}
        {members.length === 0 && !isLoading && (
          <div className={p.empty}>
            No team members yet. Invite collaborators above.
          </div>
        )}
      </div>

      <RoleReference />
    </div>
  );
}

/** Static role reference card */
function RoleReference() {
  return (
    <>
      <h3 className={p.sectionLabel}>Access Roles</h3>
      <div className={p.section}>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className={`${p.cardCompact} ${p.cardRow}`} style={{
            padding: '8px 10px',
            background: 'var(--color-panel-card)',
            border: '1px solid var(--color-panel-card-border)',
          }}>
            <span className={p.text14}>{cfg.icon}</span>
            <div>
              <div className={`${p.text12} ${p.fontMedium}`} style={{ color: cfg.color }}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </div>
              <div className={`${p.text10} ${p.muted}`}>{cfg.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
