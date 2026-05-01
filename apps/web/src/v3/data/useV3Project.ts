/**
 * useV3Project — single read path for all /v3/* pages.
 *
 * Phase 4 unlock: this hook now consults `useProjectStore` for any non-MTC
 * id so /v3/project/:id renders against a real project loaded from the
 * client store (which itself hydrates from `/projects/builtins` and
 * `/projects` for authenticated users). The MTC fixture is preserved as a
 * deterministic dev sentinel under id `'mtc'` so smoke tests stay stable.
 *
 * Phase 4.2: real `ProjectScores` + `Verdict` come from the shared scoring
 * engine via `useSiteDataStore.dataByProject[id]`. When site data is still
 * loading or absent, the adapter falls back to placeholder scores so the
 * page renders an honest empty state instead of a fictional verdict.
 *
 * Rich briefs (`diagnose` / `prove` / `operate` / `build`) remain
 * undefined for real projects — Phase 5 + Phase 6 populate them.
 */

import { useMemo } from "react";
import { useProjectStore } from "../../store/projectStore.js";
import { useSiteDataStore } from "../../store/siteDataStore.js";
import { adaptLocalProjectToV3 } from "./adaptLocalProject.js";
import { MTC_PROJECT } from "./mockProject.js";
import type { Project } from "../types.js";

export function useV3Project(projectId: string | undefined): Project | null {
  const projects = useProjectStore((s) => s.projects);
  const dataByProject = useSiteDataStore((s) => s.dataByProject);

  return useMemo(() => {
    if (!projectId) return null;
    if (projectId === MTC_PROJECT.id) return MTC_PROJECT;
    const local = projects.find((p) => p.id === projectId || p.serverId === projectId);
    if (!local) return null;
    // Look up siteData under the local id (the canonical key used by
    // siteDataStore). Server-id-keyed lookups are not used today — every
    // store action threads the local id.
    const siteData = dataByProject[local.id];
    return adaptLocalProjectToV3(local, siteData);
  }, [projectId, projects, dataByProject]);
}
