/**
 * useViewScope -- the single per-shell gate for the Operational Role Layer
 * (ADR 2026-06-24). Each tier-shell (Act, Plan, Observe) calls this ONCE and
 * threads the result down to its rails. It answers three questions:
 *
 *   layerActive -- should the layer's UI (focus toggle, dimming) appear at all?
 *   focusMode   -- is the viewer currently in 'role' (scoped) or 'full' view?
 *   scope       -- the viewer's domain Set when scoped (empty otherwise).
 *   isScoped    -- the single boolean the rails branch on: apply scoping now?
 *
 * Activation rules (safe degradation -- the layer can never blank a screen):
 *   - SOLO projects: layer suppressed (a lone steward owns every domain).
 *   - NO operational roles: layer suppressed (empty scope ⇒ full view).
 *   - Otherwise active; default focus is 'role' (computed, not stored), so a
 *     steward who later gains/loses a role re-defaults correctly without a
 *     stale persisted override. An EXPLICIT 'full' / 'role' choice is honored.
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
  /** Render the layer's UI (focus toggle, dim affordances)? Solo / no-role ⇒ false. */
  layerActive: boolean;
  /** The viewer's current view mode. Meaningful only when `layerActive`. */
  focusMode: ViewFocusMode;
  /** The viewer's operational domain scope (empty ⇒ full view). */
  scope: ReadonlySet<UniversalDomain>;
  /** The single branch the rails read: should scoping be applied right now? */
  isScoped: boolean;
  /** Persist an explicit focus choice for this project. */
  setFocusMode: (mode: ViewFocusMode) => void;
}

export function useViewScope(projectId: string): ViewScope {
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

  // Build the Set ONLY when the raw role array OR the project domain map changes.
  const scope = useMemo<ReadonlySet<UniversalDomain>>(
    () => scopeForRoles(roles, domainsMap),
    [roles, domainsMap],
  );

  const storedMode = useUIStore((s) => s.viewFocusMode[projectId]);
  const setViewFocusMode = useUIStore((s) => s.setViewFocusMode);

  const layerActive = !solo && roles.length > 0;
  // Computed default is 'role' (scope to your domains); an explicit choice wins.
  const focusMode: ViewFocusMode = storedMode ?? 'role';
  const isScoped = layerActive && focusMode === 'role' && scope.size > 0;

  const setFocusMode = useCallback(
    (mode: ViewFocusMode) => setViewFocusMode(projectId, mode),
    [projectId, setViewFocusMode],
  );

  return { layerActive, focusMode, scope, isScoped, setFocusMode };
}
