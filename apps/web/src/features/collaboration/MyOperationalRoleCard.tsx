/**
 * MyOperationalRoleCard -- the viewer's self-service control for their OWN
 * operational roles on this project (ADR 2026-06-24 Operational Role Layer).
 *
 * Route-agnostic: it reads the viewer's own member row and writes that same row
 * back, so a future Project Settings page can host it verbatim. The solo +
 * role-applicability gate lives in the parent (MembersTab) -- this card renders
 * its content whenever it has an own row to edit and otherwise no-ops.
 *
 * View-scoping only: roles set the default domain focus across Plan, Act, and
 * Observe; they never grant or remove a capability, and an empty selection
 * means the full unfiltered view (ScopePreview emptyMeans="full").
 */

import { useMemberStore } from '../../store/memberStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { type OperationalRole } from '@ogden/shared';
import { useResolvedOperationalRoles } from '../../v3/roles/useResolvedOperationalRoles.js';
import p from '../../styles/panel.module.css';
import css from './MyOperationalRoleCard.module.css';
import ScopePreview from './ScopePreview.js';

interface MyOperationalRoleCardProps {
  projectId: string;
}

export default function MyOperationalRoleCard({
  projectId,
}: MyOperationalRoleCardProps): JSX.Element | null {
  const userId = useAuthStore((s) => s.user?.id);
  const setOperationalRoles = useMemberStore((s) => s.setOperationalRoles);
  // Option C: project-resolved defs (label/description) + domain map so the
  // pills carry this project's natural role names and the ScopePreview reflects
  // any re-scope. No override ⇒ the six built-ins ⇒ byte-identical.
  const { defs, domainsMap } = useResolvedOperationalRoles(projectId);
  // The viewer's own role array, read straight off their roster row. Returns
  // the stable stored reference (never a fresh array) so the selector is
  // re-render-safe. `undefined` => the viewer has no member row yet.
  const myRoles = useMemberStore((s) =>
    userId ? s.members.find((m) => m.userId === userId)?.operationalRoles : undefined,
  );

  if (!userId || myRoles === undefined) return null;
  const current = myRoles;

  const toggle = (slug: OperationalRole) => {
    const next = current.includes(slug)
      ? current.filter((r) => r !== slug)
      : [...current, slug];
    void setOperationalRoles(projectId, userId, next);
  };

  return (
    <div className={css.root} data-testid="my-operational-role-card">
      <h3 className={p.sectionLabel}>My focus</h3>
      <p className={css.hint}>
        Operational roles set your default domain focus across Plan, Act, and
        Observe. No roles -- you keep the full view. Out-of-scope signals are
        de-emphasized, never hidden.
      </p>
      <div className={css.chips}>
        {defs.map((def) => {
          const active = current.includes(def.slug);
          return (
            <button
              key={def.slug}
              type="button"
              className={css.chip}
              data-active={active}
              title={def.description}
              onClick={() => toggle(def.slug)}
            >
              {def.label}
            </button>
          );
        })}
      </div>
      <ScopePreview roles={current} emptyMeans="full" domainsMap={domainsMap} />
    </div>
  );
}
