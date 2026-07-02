/**
 * useViewScope -- the single per-shell gate for the Operational Role Layer
 * (ADR 2026-06-24). Each tier-shell (Act, Plan, Observe) calls this ONCE and
 * threads the result down to its rails. It answers:
 *
 *   layerActive -- should the viewer's OWN-role UI (focus toggle, dimming)
 *                  appear at all?
 *   focusMode   -- is the viewer currently in 'role' (scoped) or 'full' view?
 *   scope       -- the domain Set currently in effect when scoped (empty
 *                  otherwise); the override role's domains when a "view as"
 *                  role is picked, else the viewer's own roles' domains.
 *   isScoped    -- the single boolean the rails branch on: apply scoping now?
 *   focusRole / setFocusRole / canPickRole -- the "view as" override (opt-in).
 *
 * Activation rules (safe degradation -- the layer can never blank a screen):
 *   - SOLO projects: layer suppressed (a lone steward owns every domain).
 *   - NO operational roles: own-role UI suppressed (empty scope ⇒ full view).
 *   - Otherwise active; default focus is 'role' (computed, not stored), so a
 *     steward who later gains/loses a role re-defaults correctly without a
 *     stale persisted override. An EXPLICIT 'full' / 'role' choice is honored.
 *
 * "VIEW AS" OVERRIDE (Act role-based view filter, 2026-07-01): a coordinator
 * may scope the view to ANY role's domains, not just their own. This is OPT-IN
 * per shell via `opts.allowRoleOverride` and defaults OFF, so Plan/Observe --
 * which never pass it -- are byte-identical to the pre-filter behavior: they
 * never read `viewFocusRole`, so an override picked in Act cannot leak across
 * stages. Only the Act shells opt in. When on and a role is picked, `scope`
 * reflects THAT role's domains and `isScoped` follows it even for a viewer with
 * no roles of their own.
 *
 * ZUSTAND v5 DISCIPLINE: a selector that returns `scopeForRoles(...)` would
 * mint a fresh Set every render and drive an infinite re-render loop. So we
 * select the STABLE raw role array (referentially stable while the member row
 * is unchanged) and build the Set in a `useMemo` keyed on it. Never return a
 * fresh Set from a Zustand selector. (Mirror of the reviewFlagStore note.)
 */

import { useCallback, useMemo } from 'react';
import { scopeForRoles, type OperationalRole, type UniversalDomain } from '@ogden/shared';
import { useAuthStore } from '../../store/authStore.js';
import { useMemberStore } from '../../store/memberStore.js';
import { useUIStore, type ViewFocusMode } from '../../store/uiStore.js';
import { useIsSoloProject } from '../../features/collaboration/useIsSoloProject.js';
import { useResolvedOperationalRoles } from './useResolvedOperationalRoles.js';

/** Referentially-stable empty roles -- avoids a fresh `[]` re-keying the memo. */
const EMPTY_ROLES: OperationalRole[] = [];

export interface ViewScope {
  /** Render the viewer's OWN-role UI (focus toggle, dim affordances)? Solo / no-role ⇒ false. */
  layerActive: boolean;
  /** The viewer's current view mode. Meaningful whenever scoping can apply. */
  focusMode: ViewFocusMode;
  /**
   * The domain scope currently in effect (empty ⇒ full view): the "view as"
   * override role's domains when one is picked, otherwise the viewer's own
   * roles' domains. This is the Set the rails dim against.
   */
  scope: ReadonlySet<UniversalDomain>;
  /** The single branch the rails read: should scoping be applied right now? */
  isScoped: boolean;
  /** Persist an explicit focus choice for this project. */
  setFocusMode: (mode: ViewFocusMode) => void;
  /**
   * The "view as" override role for this project, or `null` for "my roles" (the
   * default). Always `null` unless the shell opted in via `allowRoleOverride`.
   * When set, `scope` reflects THIS role's domains.
   */
  focusRole: OperationalRole | null;
  /** Persist a "view as" override role (`null` ⇒ back to the viewer's own roles). */
  setFocusRole: (role: OperationalRole | null) => void;
  /**
   * May the viewer pick a "view as" role? True only on a team project when the
   * shell opted in (`!solo && allowRoleOverride`) -- even a coordinator with no
   * operational roles of their own can then inspect another role's slice. Solo
   * projects, and any shell that did not opt in, ⇒ false (no picker UI).
   */
  canPickRole: boolean;
}

export interface ViewScopeOptions {
  /**
   * Opt this shell into the "view as" role override (Act role-based view
   * filter). Default `false`: the hook ignores `viewFocusRole` entirely, so
   * Plan/Observe stay byte-identical and an override picked in Act never leaks
   * across stages. Only the Act shells pass `true`.
   */
  allowRoleOverride?: boolean;
}

export function useViewScope(
  projectId: string,
  opts?: ViewScopeOptions,
): ViewScope {
  const allowRoleOverride = opts?.allowRoleOverride ?? false;
  const solo = useIsSoloProject(projectId);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const members = useMemberStore((s) => s.members);
  // Option C: the viewer's scope is built from THIS project's domain map, which
  // may re-scope the six roles. `domainsMap` is memoized in the hook (stable
  // while the cached project is unchanged), so it is a safe memo key below.
  const { domainsMap } = useResolvedOperationalRoles(projectId);

  // Stable raw role array: the viewer's own row's operationalRoles, or the
  // shared EMPTY_ROLES constant. Recomputed only when the roster or viewer
  // changes; returns the member's stored array reference (stable per member).
  const roles = useMemo<OperationalRole[]>(() => {
    if (!userId) return EMPTY_ROLES;
    const me = members.find((m) => m.userId === userId);
    return me?.operationalRoles ?? EMPTY_ROLES;
  }, [members, userId]);

  const storedMode = useUIStore((s) => s.viewFocusMode[projectId]);
  const setViewFocusMode = useUIStore((s) => s.setViewFocusMode);
  // Read the override ONLY when the shell opted in. When it did not, the
  // selector returns a constant `null`, so Plan/Observe never re-render on a
  // `viewFocusRole` change and never scope to another role's domains.
  const focusRole = useUIStore((s) =>
    allowRoleOverride ? (s.viewFocusRole[projectId] ?? null) : null,
  );
  const setViewFocusRole = useUIStore((s) => s.setViewFocusRole);

  // Build the Set ONLY when the raw role array, the override, or the project
  // domain map changes. The override role (when picked) replaces the viewer's
  // own roles as the scoping source.
  const scope = useMemo<ReadonlySet<UniversalDomain>>(
    () =>
      focusRole
        ? scopeForRoles([focusRole], domainsMap)
        : scopeForRoles(roles, domainsMap),
    [roles, focusRole, domainsMap],
  );

  // layerActive is UNCHANGED from the pre-filter behavior so Plan/Observe are
  // byte-identical: it gates the viewer's OWN-role UI (the focus toggle), which
  // is meaningful only when the viewer actually holds roles on a team project.
  const layerActive = !solo && roles.length > 0;
  // canPickRole is additive and opt-in: any team project the shell opted into
  // may "view as" a role, even a coordinator with no roles of their own.
  const canPickRole = !solo && allowRoleOverride;
  // Computed default is 'role' (scope to your domains); an explicit choice wins.
  const focusMode: ViewFocusMode = storedMode ?? 'role';
  // Scope applies on any team project whenever role mode is on and the effective
  // scope is non-empty. With NO override (focusRole === null -- always the case
  // in Plan/Observe) this is provably equivalent to the old
  // `layerActive && focusMode === 'role' && scope.size > 0` (empty roles ⇒ empty
  // scope ⇒ false either way); it ADDITIONALLY lets an opted-in no-role
  // coordinator scope once they pick an override role.
  const isScoped = !solo && focusMode === 'role' && scope.size > 0;

  const setFocusMode = useCallback(
    (mode: ViewFocusMode) => setViewFocusMode(projectId, mode),
    [projectId, setViewFocusMode],
  );
  const setFocusRole = useCallback(
    (role: OperationalRole | null) => setViewFocusRole(projectId, role),
    [projectId, setViewFocusRole],
  );

  return {
    layerActive,
    focusMode,
    scope,
    isScoped,
    setFocusMode,
    focusRole,
    setFocusRole,
    canPickRole,
  };
}
