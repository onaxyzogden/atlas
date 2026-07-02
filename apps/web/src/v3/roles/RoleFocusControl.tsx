/**
 * RoleFocusControl -- the self-contained Operational Role Layer control for the
 * Act stage's role-based view filter (2026-07-01). It composes two orthogonal
 * affordances over the existing role-layer seam:
 *
 *   1. ViewFocusToggle ("My focus / Full view") -- the UNCHANGED segmented
 *      control, shown only when the viewer holds operational roles of their own
 *      (`layerActive`). Chooses WHETHER role scope applies.
 *   2. A "Viewing as" picker -- a new <select> of the project's six resolved
 *      role labels plus a "My roles" default, shown on any team project the
 *      shell opted into (`canPickRole`). Chooses WHOSE scope: a coordinator can
 *      inspect any role's slice, not just their own. Picking a specific role
 *      also flips the mode to role-focus so the scope visibly applies.
 *
 * Self-contained: takes only `projectId` (+ optional in-focus / total counts for
 * the toggle's "N / M" hint) and reads everything else from `useViewScope` (with
 * the override opted in) and `useResolvedOperationalRoles`. Renders nothing when
 * neither affordance applies (`!layerActive && !canPickRole`) -- e.g. solo
 * projects -- so mounting it unconditionally is safe.
 *
 * Never hides work: this control only drives de-emphasis / reordering downstream
 * (the covenant rule). ASCII-only copy; Atlas parchment tokens (see the sibling
 * ViewFocusToggle stylesheet).
 */

import type { OperationalRole } from '@ogden/shared';
import { useViewScope } from './useViewScope.js';
import { useResolvedOperationalRoles } from './useResolvedOperationalRoles.js';
import ViewFocusToggle from './ViewFocusToggle.js';
import css from './RoleFocusControl.module.css';

export interface RoleFocusControlProps {
  projectId: string;
  /** Items in focus under the current scope -- annotates the "My focus" segment. */
  inFocusCount?: number;
  /** Total items, for an "N / M" hint on the "My focus" segment. */
  totalCount?: number;
}

/** Sentinel <option> value for "no override" (scope to the viewer's own roles). */
const MY_ROLES = '';

export default function RoleFocusControl({
  projectId,
  inFocusCount,
  totalCount,
}: RoleFocusControlProps): JSX.Element | null {
  const {
    layerActive,
    focusMode,
    setFocusMode,
    focusRole,
    setFocusRole,
    canPickRole,
  } = useViewScope(projectId, { allowRoleOverride: true });
  const { defs } = useResolvedOperationalRoles(projectId);

  // Neither the viewer's own-role toggle nor the "view as" picker applies (solo
  // project, or a shell that did not opt in). Show nothing.
  if (!layerActive && !canPickRole) return null;

  const handlePick = (value: string) => {
    const role = value === MY_ROLES ? null : (value as OperationalRole);
    setFocusRole(role);
    // Picking a specific role means "show me that scope now": ensure role mode
    // is on so it visibly applies (an own-role viewer may have been in Full
    // view). Clearing back to "my roles" leaves the mode untouched.
    if (role && focusMode !== 'role') setFocusMode('role');
  };

  return (
    <div className={css.root} data-testid="role-focus-control">
      {layerActive && (
        <ViewFocusToggle
          focusMode={focusMode}
          onChange={setFocusMode}
          inFocusCount={inFocusCount}
          totalCount={totalCount}
        />
      )}
      {canPickRole && (
        <label className={css.pickerWrap}>
          <span className={css.pickerLabel}>Viewing as</span>
          <select
            className={css.select}
            value={focusRole ?? MY_ROLES}
            onChange={(e) => handlePick(e.target.value)}
            data-testid="role-view-as-select"
          >
            <option value={MY_ROLES}>My roles</option>
            {defs.map((def) => (
              <option key={def.slug} value={def.slug}>
                {def.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
