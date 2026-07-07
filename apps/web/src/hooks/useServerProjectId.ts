/**
 * Server-project-id resolution (H4, deep-audit 2026-07-03).
 *
 * Local project ids are crypto.randomUUID() minted client-side and distinct
 * from the server's project UUID by construction — passing one to a server
 * endpoint (exports, portal publish, SOM trajectory) 404s with a misleading
 * error toast. Every HTTP call that addresses a project must go through this
 * seam: route param or store id in, `serverId` out, `null` meaning "not yet
 * synced" — callers disable their control honestly instead of firing a
 * doomed request.
 *
 * Accepts either the local id or the serverId itself (deep links and portal
 * routes already navigate by serverId), matching the id-or-serverId lookup
 * convention used across the app.
 */
import { useProjectStore } from '../store/projectStore.js';

/** Honest copy for export/publish controls disabled because serverId is null.
 *  Mirrors the existing MapSheetExportControl wording. */
export const NOT_SYNCED_EXPORT_TITLE =
  'Save this project to the server to enable PDF export.';

/**
 * Imperative resolver for non-React call sites (event handlers, hooks that
 * already hold a store snapshot). Prefer useServerProjectId in components —
 * it re-renders when sync completes.
 */
export function resolveServerProjectId(
  projectId: string | null | undefined,
): string | null {
  if (!projectId) return null;
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId || p.serverId === projectId);
  return project?.serverId ?? null;
}

/**
 * Reactive resolver: null while the project is local-only, flips to the
 * server UUID the moment sync assigns one. Returns a primitive, so it is
 * referentially stable as a zustand selector.
 */
export function useServerProjectId(
  projectId: string | null | undefined,
): string | null {
  return useProjectStore((s) =>
    projectId
      ? (s.projects.find((p) => p.id === projectId || p.serverId === projectId)
          ?.serverId ?? null)
      : null,
  );
}
