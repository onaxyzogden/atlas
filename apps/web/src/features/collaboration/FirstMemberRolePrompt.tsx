/**
 * FirstMemberRolePrompt -- a dismissible inline nudge shown when a project
 * first grows past solo and assignable members still lack an operational focus
 * (ADR 2026-06-24 Operational Role Layer). It points the steward at the two
 * assignment surfaces (their own focus above, others in Plan -> People, Roles
 * and Governance). Dismissal persists per project in localStorage so it never
 * nags on a later visit. The mount condition lives in the parent (MembersTab).
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import css from './FirstMemberRolePrompt.module.css';

const dismissKey = (projectId: string) =>
  `ogden:opRolePrompt:dismissed:${projectId}`;

interface FirstMemberRolePromptProps {
  projectId: string;
}

export default function FirstMemberRolePrompt({
  projectId,
}: FirstMemberRolePromptProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissKey(projectId)) === '1',
  );

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(projectId), '1');
    } catch {
      // private-mode / quota -- the in-memory flag still hides it this session.
    }
    setDismissed(true);
  };

  return (
    <div className={css.root} data-testid="first-member-role-prompt">
      <div className={css.body}>
        <strong className={css.title}>Set operational roles</strong>
        <p className={css.text}>
          Your team has grown beyond a solo project. Give each member an
          operational role for a focused default view -- nothing is hidden, only
          de-emphasized. Set your own focus above, and assign others in Plan --
          People, Roles and Governance.
        </p>
      </div>
      <button
        type="button"
        className={css.dismiss}
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}
