/**
 * TeamInviteRow — Phase 2 / Slice 2.3.
 *
 * One row in Step 3's pending-invites list. Fields: email + role select +
 * remove. Duplicate-email warning is rendered inline (a sibling control's
 * concern — the parent knows the full invite list and tells this row
 * whether its email collides). Per spec AC 7.3: flag duplicates, do not
 * silently dedupe.
 */

import type { TeamInviteRole } from './teamInviteTypes.js';
import styles from './TeamInviteRow.module.css';

export interface TeamInviteRowValue {
  email: string;
  role: TeamInviteRole;
}

export interface TeamInviteRowProps {
  value: TeamInviteRowValue;
  /** True when another invite in the list already uses this email. */
  duplicate?: boolean;
  onChange: (next: TeamInviteRowValue) => void;
  onRemove: () => void;
  /** Used to make labels unique per row (for screen readers). */
  index: number;
}

const ROLE_OPTIONS: ReadonlyArray<{ id: TeamInviteRole; label: string }> = [
  { id: 'team_member', label: 'Team member' },
  { id: 'contractor', label: 'Contractor' },
  { id: 'landowner', label: 'Landowner' },
  { id: 'reviewer', label: 'Reviewer' },
];

export default function TeamInviteRow({
  value,
  duplicate = false,
  onChange,
  onRemove,
  index,
}: TeamInviteRowProps) {
  const emailId = `invite-email-${index}`;
  const roleId = `invite-role-${index}`;
  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <label className="visually-hidden" htmlFor={emailId}>
          Invitee email
        </label>
        <input
          id={emailId}
          type="email"
          className={styles.input}
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="name@example.com"
          data-duplicate={duplicate ? 'true' : undefined}
          aria-invalid={duplicate || undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={styles.field}>
        <label className="visually-hidden" htmlFor={roleId}>
          Invitee role
        </label>
        <select
          id={roleId}
          className={styles.select}
          value={value.role}
          onChange={(e) =>
            onChange({ ...value, role: e.target.value as TeamInviteRole })
          }
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className={styles.removeBtn}
        onClick={onRemove}
        aria-label={`Remove invite ${index + 1}`}
        title="Remove"
      >
        Remove
      </button>
      {duplicate && (
        <p className={styles.warning} role="status">
          Duplicate email — flag, not auto-deduped.
        </p>
      )}
    </div>
  );
}
