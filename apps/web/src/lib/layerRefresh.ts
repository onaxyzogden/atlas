/**
 * layerRefresh — debounced site-data refresh driven by `layer_complete`
 * WebSocket events.
 *
 * The data pipeline (DataPipelineOrchestrator) broadcasts one
 * `layer_complete` per finished layer, so a pipeline run produces a burst
 * of events within seconds. A per-project trailing debounce coalesces the
 * burst into a single `refreshProject` call once the run settles, instead
 * of refetching every layer N times.
 *
 * Keyed by the project's SERVER id (the WS room id) and resolved to the
 * local project at fire time, so a project deleted or unloaded mid-debounce
 * is skipped. Never throws — WS handlers must stay non-fatal.
 *
 * Split out of wsService so the unit test doesn't drag the whole sync
 * stack in.
 */

import { debounce, type DebouncedFn } from './debounce.js';
import { useProjectStore } from '../store/projectStore.js';
import { useSiteDataStore } from '../store/siteDataStore.js';
import { deriveSiteFetchArgs } from '../store/siteFetchArgs.js';

const LAYER_REFRESH_DEBOUNCE_MS = 2_000;

const refreshDebouncers = new Map<string, DebouncedFn<[]>>();

/**
 * Schedule a debounced site-data refresh for the project identified by its
 * server id. wsService calls this only with the CONNECTED project's room id,
 * so non-active projects never refresh.
 */
export function scheduleLayerCompleteRefresh(projectServerId: string): void {
  let d = refreshDebouncers.get(projectServerId);
  if (!d) {
    d = debounce(() => {
      const project = useProjectStore
        .getState()
        .projects.find((p) => p.serverId === projectServerId);
      if (!project) {
        console.warn(
          `[WS] layer_complete refresh skipped — no local project for server id ${projectServerId}`,
        );
        return;
      }
      const args = deriveSiteFetchArgs(project);
      if (!args) {
        console.warn(
          `[WS] layer_complete refresh skipped — no valid boundary for project ${project.id}`,
        );
        return;
      }
      void useSiteDataStore
        .getState()
        .refreshProject(project.id, args.center, args.country, args.bbox);
    }, LAYER_REFRESH_DEBOUNCE_MS);
    refreshDebouncers.set(projectServerId, d);
  }
  d();
}

/**
 * Cancel all pending refreshes — called on WS disconnect / project switch so
 * a refresh scheduled for the old project never fires after leaving it.
 */
export function cancelLayerCompleteRefreshes(): void {
  for (const d of refreshDebouncers.values()) d.cancel();
  refreshDebouncers.clear();
}
