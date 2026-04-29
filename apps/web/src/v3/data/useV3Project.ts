/**
 * useV3Project — single read path for all /v3/* pages.
 *
 * Phase 1: returns the MTC fixture for any id; falls through to null otherwise
 * (lets pages render an empty-state so missing-fixture cases are visible).
 * Later phases swap the body for real store/API integration without changing
 * the call sites.
 */

import { MTC_PROJECT } from "./mockProject.js";
import type { Project } from "../types.js";

export function useV3Project(projectId: string | undefined): Project | null {
  if (!projectId) return null;
  if (projectId === MTC_PROJECT.id) return MTC_PROJECT;
  // Phase 1: any unknown id renders the MTC fixture so route stubs always have data.
  // Phase 2 will tighten this to return null + render an empty state.
  return MTC_PROJECT;
}
