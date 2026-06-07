/**
 * StewardCapture -- a CONTROLLED renderer over a FLAT FormValue
 * (Record<string, string | string[]>) for the optional s1-vision-steward
 * checklist item. Unlike BoundaryCapture this capture has a single shape: a
 * read-only primary-steward card (derived from the auth user, NOT persisted),
 * three role-explanation cards, a project-team list, and a queued-invite form.
 *
 * The only persisted state is the queue of invites, encoded as three parallel
 * FormValue arrays -- inviteNames / inviteEmails / inviteRoles. The component
 * decodes the flat value into a StewardModel, edits the model, and re-encodes
 * on every queue/remove via the private `encodeSteward` inverse, so the
 * persisted shape stays a flat FormValue.
 *
 * Mirrors BoundaryCapture's contract: props { itemId, value, onChange,
 * resolveOptions }; exported pure helpers (decodeSteward / isStewardValid /
 * summariseSteward) plus a private encodeSteward; flat asString/asArray
 * helpers; `const emit = (next) => onChange(encodeSteward(next))`.
 *
 * `resolveOptions` is accepted for contract parity but UNUSED -- the three
 * roles are a local STEWARD_ROLES constant that is the single source of truth
 * for BOTH the explanation cards and the invite-form role selector.
 *
 * Token note: mirrors the BoundaryCapture token vocabulary (--color-text
 * {,-muted,-subtle}, --color-surface{,-alt,-raised}, --color-border{,-subtle},
 * --color-success). The invite action is QUEUE-ONLY -- no network request is
 * made; invites are sent only when the decision is recorded (later task).
 */
import * as React from 'react';
import { Lock, Plus, Send, Trash2 } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import { useAuthStore } from '../../../store/authStore.js';
import css from './StewardCapture.module.css';

export type StewardRole = 'team_member' | 'contractor' | 'landowner';

export interface StewardInvite {
  name: string;
  email: string;
  role: StewardRole;
}

export interface StewardModel {
  invites: StewardInvite[];
}

const VALID_ROLES: readonly StewardRole[] = [
  'team_member',
  'contractor',
  'landowner',
];

// Human-readable labels used by summariseSteward (NOT the card titles).
const HUMAN_LABEL: Record<StewardRole, string> = {
  team_member: 'co-steward',
  contractor: 'contractor',
  landowner: 'reviewer',
};

// --------------------------------------------------------------------------
// Role metadata -- single source for BOTH the explanation cards AND the
// invite-form role selector.
// --------------------------------------------------------------------------

interface AccessChip {
  text: string;
  yes: boolean;
}

interface StewardRoleMeta {
  value: StewardRole;
  label: string;
  description: string;
  accessChips: AccessChip[];
  // css-module class lookups are string | undefined under noUncheckedIndexedAccess
  colorClass: string | undefined;
  hint: string;
}

const STEWARD_ROLES: readonly StewardRoleMeta[] = [
  {
    value: 'team_member',
    label: 'Co-steward / team member',
    description:
      'Works the land alongside you. Sees and acts on Plan, Act, and their Observe data.',
    accessChips: [
      { text: 'Plan', yes: true },
      { text: 'Act', yes: true },
      { text: 'Observe', yes: true },
      { text: 'Notifications', yes: true },
    ],
    colorClass: css.roleSteward,
    hint: 'Sees all Plan, Act, and Observe data. Receives task notifications. Can submit proof and record decisions.',
  },
  {
    value: 'contractor',
    label: 'Contractor',
    description:
      'Executes a defined scope of Act tasks. Sees only their assigned tasks - no Plan, no Observe, no other team members.',
    accessChips: [
      { text: 'Plan', yes: false },
      { text: 'Assigned tasks only', yes: true },
      { text: 'Observe', yes: false },
    ],
    colorClass: css.roleContractor,
    hint: 'Sees only their assigned Act tasks. No Plan, no Observe, no other team members data. All contractor submissions go to review mode.',
  },
  {
    value: 'landowner',
    label: 'Landowner / external reviewer',
    description:
      'Reviews project progress and ecological outcomes. Read-only. No operational detail.',
    accessChips: [
      { text: 'Plan', yes: false },
      { text: 'Act', yes: false },
      { text: 'Progress view', yes: true },
      { text: 'Observe highlights', yes: true },
    ],
    colorClass: css.roleReviewer,
    hint: 'Read-only progress and ecological outcomes view. No operational data. Accessible via shareable link - no OLOS account required.',
  },
];

// Short selector labels (the pill row), keyed by role.
const SELECTOR_LABEL: Record<StewardRole, string> = {
  team_member: 'Co-steward',
  contractor: 'Contractor',
  landowner: 'Reviewer',
};

// --------------------------------------------------------------------------
// flat-value helpers (mirror BoundaryCapture's asString / asArray)
// --------------------------------------------------------------------------

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

function isStewardRole(v: string): v is StewardRole {
  return (VALID_ROLES as readonly string[]).includes(v);
}

// --------------------------------------------------------------------------
// decode / encode
// --------------------------------------------------------------------------

export function decodeSteward(value: FormValue): StewardModel {
  const names = asArray(value.inviteNames);
  const emails = asArray(value.inviteEmails);
  const roles = asArray(value.inviteRoles);
  const len = Math.min(names.length, emails.length, roles.length);

  const invites: StewardInvite[] = [];
  for (let i = 0; i < len; i += 1) {
    const role = roles[i] ?? '';
    // DROP rows whose role is not one of the three enum values; never coerce.
    if (!isStewardRole(role)) continue;
    invites.push({ name: names[i] ?? '', email: emails[i] ?? '', role });
  }
  return { invites };
}

// Exact inverse of decodeSteward. Private (NOT exported).
function encodeSteward(model: StewardModel): FormValue {
  return {
    inviteNames: model.invites.map((i) => i.name),
    inviteEmails: model.invites.map((i) => i.email),
    inviteRoles: model.invites.map((i) => i.role),
  };
}

// --------------------------------------------------------------------------
// validity / summary
// --------------------------------------------------------------------------

// Always valid: the item is optional, the primary steward always exists, and
// zero invites is a complete answer.
export function isStewardValid(_model: StewardModel): boolean {
  return true;
}

export function summariseSteward(model: StewardModel): string {
  const n = model.invites.length;
  if (n === 0) return 'Primary steward confirmed';

  const counts: Record<StewardRole, number> = {
    team_member: 0,
    contractor: 0,
    landowner: 0,
  };
  for (const inv of model.invites) counts[inv.role] += 1;

  const clauses: string[] = [];
  for (const role of VALID_ROLES) {
    const c = counts[role];
    if (c > 0) clauses.push(`${c} ${HUMAN_LABEL[role]}`);
  }

  return `Primary steward + ${n} invited (${clauses.join(', ')})`;
}

// --------------------------------------------------------------------------
// auth -> primary-steward display (NOT persisted)
// --------------------------------------------------------------------------

function initialsFrom(displayName: string | null | undefined): string {
  const name = (displayName ?? '').trim();
  if (name === '') return '?';
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0] ?? '');
  const initials = letters.join('').toUpperCase();
  return initials === '' ? '?' : initials;
}

// --------------------------------------------------------------------------
// component
// --------------------------------------------------------------------------

export interface StewardCaptureProps {
  itemId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
  resolveOptions: (optionSetId: string) => readonly string[];
}

const ROLE_AVATAR_CLASS: Record<StewardRole, string | undefined> = {
  team_member: css.avatarSteward,
  contractor: css.avatarContractor,
  landowner: css.avatarReviewer,
};

const ROLE_BADGE_CLASS: Record<StewardRole, string | undefined> = {
  team_member: css.badgeSteward,
  contractor: css.badgeContractor,
  landowner: css.badgeReviewer,
};

export default function StewardCapture({
  value,
  onChange,
}: StewardCaptureProps): JSX.Element {
  const model = decodeSteward(value);

  // STABLE single-ref selector (Zustand v5 -- never return a fresh object).
  const user = useAuthStore((s) => s.user);

  const displayName = user?.displayName ?? 'Primary steward';
  const email = user?.email ?? '';
  const initials = initialsFrom(user?.displayName);

  // Transient in-progress invite form fields -- NOT in FormValue.
  const [name, setName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<StewardRole>(
    'team_member',
  );

  const emit = (next: StewardModel) => onChange(encodeSteward(next));

  const canQueue = name.trim() !== '' && inviteEmail.includes('@');

  const queueInvite = () => {
    if (!canQueue) return;
    emit({
      invites: [
        ...model.invites,
        { name: name.trim(), email: inviteEmail.trim(), role: selectedRole },
      ],
    });
    setName('');
    setInviteEmail('');
  };

  const removeInvite = (index: number) => {
    emit({ invites: model.invites.filter((_, i) => i !== index) });
  };

  const teamTotal = 1 + model.invites.length;
  const selectedMeta =
    STEWARD_ROLES.find((r) => r.value === selectedRole) ?? STEWARD_ROLES[0];

  return (
    <div className={css.root}>
      {/* PRIMARY STEWARD CARD (display-only, derived from auth) */}
      <div>
        <span className={css.secLabel}>Primary steward</span>
        <div className={css.primaryCard}>
          <div
            className={`${css.avatar} ${css.avatarPrimary}`}
            data-testid="primary-steward-avatar"
          >
            {initials}
          </div>
          <div className={css.personInfo}>
            <div className={css.personName} data-testid="primary-steward-name">
              {displayName}
              <span className={css.personYou} data-testid="primary-steward-you">
                You
              </span>
            </div>
            <div className={css.personRole}>Primary steward</div>
            <div className={css.personAccess}>
              Full access - all Plan, Act, and Observe data
            </div>
          </div>
          <span
            className={css.lockIcon}
            data-testid="primary-steward-lock"
            title="Primary steward is set at account level"
          >
            <Lock size={13} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className={css.divider} />

      {/* ROLE EXPLANATION CARDS */}
      <div>
        <span className={css.secLabel}>What role does each person need?</span>
        <div className={css.roleGrid}>
          {STEWARD_ROLES.map((role) => (
            <div
              key={role.value}
              className={`${css.roleCard} ${role.colorClass}`}
              data-testid="role-card"
              data-role={role.value}
            >
              <div className={css.roleDot} />
              <div className={css.roleBody}>
                <div className={css.roleTitle}>{role.label}</div>
                <div className={css.roleDesc}>{role.description}</div>
                <div className={css.roleAccessList}>
                  {role.accessChips.map((chip) => (
                    <span
                      key={chip.text}
                      className={`${css.accessChip} ${
                        chip.yes ? css.accessYes : css.accessNo
                      }`}
                      data-testid="access-chip"
                    >
                      {chip.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={css.divider} />

      {/* TEAM LIST */}
      <div>
        <div className={css.teamHeader}>
          <span className={css.secLabel}>Project team</span>
          <span className={css.teamCount} data-testid="team-count">
            {teamTotal} {teamTotal === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className={css.teamList}>
          {/* primary steward mini row */}
          <div className={css.teamMember} data-testid="team-member">
            <div
              className={`${css.avatarSm} ${css.avatarPrimary}`}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className={css.tmInfo}>
              <div className={css.tmName}>
                {displayName}
                <span className={`${css.tmRoleBadge} ${css.badgePrimary}`}>
                  Primary
                </span>
              </div>
              {email ? <div className={css.tmEmail}>{email}</div> : null}
            </div>
          </div>

          {/* queued invites */}
          {model.invites.map((inv, index) => (
            <div
              className={css.teamMember}
              data-testid="team-member"
              key={`${inv.email}-${index}`}
            >
              <div
                className={`${css.avatarSm} ${ROLE_AVATAR_CLASS[inv.role]}`}
                aria-hidden="true"
              >
                {initialsFrom(inv.name)}
              </div>
              <div className={css.tmInfo}>
                <div className={css.tmName}>
                  {inv.name || 'Pending invite'}
                  <span
                    className={`${css.tmRoleBadge} ${ROLE_BADGE_CLASS[inv.role]}`}
                  >
                    {SELECTOR_LABEL[inv.role]}
                  </span>
                </div>
                <div className={css.tmEmail}>
                  {inv.email}
                  <span className={css.tmPending}> - invite queued</span>
                </div>
              </div>
              <button
                type="button"
                className={css.tmDel}
                data-testid={`invite-remove-${index}`}
                aria-label={`Remove ${inv.name || 'invite'}`}
                onClick={() => removeInvite(index)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* INVITE FORM */}
        <div className={css.inviteForm}>
          <div className={css.fieldLabel}>Name</div>
          <input
            type="text"
            className={css.textInput}
            data-testid="invite-name"
            aria-label="Invite name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className={css.fieldLabel}>Email</div>
          <input
            type="email"
            className={css.textInput}
            data-testid="invite-email"
            aria-label="Invite email"
            placeholder="email@address.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <div className={css.fieldLabel}>Role</div>
          <div className={css.roleSelector}>
            {STEWARD_ROLES.map((role) => {
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  className={`${css.rsBtn} ${active ? role.colorClass : ''}`}
                  data-testid={`invite-role-${role.value}`}
                  data-active={active ? 'true' : 'false'}
                  aria-pressed={active}
                  onClick={() => setSelectedRole(role.value)}
                >
                  {SELECTOR_LABEL[role.value]}
                </button>
              );
            })}
          </div>

          <div className={css.roleHint} data-testid="role-hint">
            {selectedMeta?.hint}
          </div>

          <button
            type="button"
            className={css.inviteSubmit}
            data-testid="invite-submit"
            disabled={!canQueue}
            onClick={queueInvite}
          >
            <Send size={12} />
            <span>Queue invite</span>
          </button>

          <div className={css.inviteFootnote}>
            Invite sent when you record this decision
          </div>
        </div>
      </div>

      <div className={css.divider} />

      {/* FEEDS */}
      <div className={css.feedsBlock}>
        <Plus size={11} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Team roles feed{' '}
          <strong>Act: Task assignment &amp; notifications</strong>. Role
          boundaries are enforced at the data layer - not just the interface.
        </div>
      </div>
    </div>
  );
}
