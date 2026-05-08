/**
 * Adapter — convert a LocalProject (real project from useProjectStore) into a
 * Candidate-shaped object so it can render inside the Property Candidates
 * card grid on the /v3/project landing page.
 *
 * Real projects are not yet evaluated, so candidate-only fields (fitScore,
 * verdict, sub-scores, top blocker, fit tags) are left blank/sentinel and the
 * CandidateCard branches into a "Not evaluated" placeholder presentation.
 *
 * IDs are namespaced with a `local:` prefix so the landing page can
 * distinguish real-project entries from mock candidates and route clicks
 * accordingly.
 */

import type { LocalProject } from "../../store/projectStore.js";
import type { Candidate } from "../types.js";

export const LOCAL_CANDIDATE_PREFIX = "local:";

export function localProjectToCandidate(project: LocalProject): Candidate {
  const region =
    project.address ??
    project.provinceState ??
    project.country ??
    "—";

  return {
    id: `${LOCAL_CANDIDATE_PREFIX}${project.id}`,
    name: project.name,
    region,
    acreage: project.acreage ?? 0,
    acreageUnit: project.units === "metric" ? "ha" : "ac",
    priceUsd: 0,
    pricePerAcre: undefined,
    isNew: false,
    // Sentinel: undefined fitScore signals "not evaluated" to CandidateCard.
    fitScore: undefined,
    verdict: "conditional",
    verdictLabel: "Not evaluated",
    fitTags: [],
    topBlocker: { title: "—", severity: "warning", impact: "low" },
    subScores: { water: 0, access: 0, infrastructure: 0 },
  };
}

export function isLocalCandidateId(id: string): boolean {
  return id.startsWith(LOCAL_CANDIDATE_PREFIX);
}

export function localCandidateIdToProjectId(id: string): string {
  return id.startsWith(LOCAL_CANDIDATE_PREFIX)
    ? id.slice(LOCAL_CANDIDATE_PREFIX.length)
    : id;
}
