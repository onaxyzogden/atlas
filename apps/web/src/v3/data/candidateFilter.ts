/**
 * Candidate-filter helpers — Phase 6.1.
 *
 * Pure: keep DiscoverPage easy to read and the chip vocabulary stable
 * regardless of how the candidate fixture grows.
 */

import type { Candidate } from "../types.js";
import type { FilterState } from "../components/FiltersBar.js";

const HA_PER_AC = 0.404686;

function acreageHectares(c: Candidate): number {
  return c.acreageUnit === "ha" ? c.acreage : c.acreage * HA_PER_AC;
}

function matchAcreage(c: Candidate, label: string | null | undefined): boolean {
  if (!label) return true;
  const ha = acreageHectares(c);
  switch (label) {
    case "< 50 ha": return ha < 50;
    case "50–150 ha": return ha >= 50 && ha <= 150;
    case "> 150 ha": return ha > 150;
    default: return true;
  }
}

function matchPrice(c: Candidate, label: string | null | undefined): boolean {
  if (!label) return true;
  switch (label) {
    case "< $1M": return c.priceUsd < 1_000_000;
    case "$1M–$2M": return c.priceUsd >= 1_000_000 && c.priceUsd <= 2_000_000;
    case "> $2M": return c.priceUsd > 2_000_000;
    default: return true;
  }
}

function matchUseFit(c: Candidate, label: string | null | undefined): boolean {
  if (!label) return true;
  const target = label.toLowerCase();
  return c.fitTags.some((t) => t.toLowerCase() === target);
}

export function applyCandidateFilters(
  candidates: Candidate[],
  filters: FilterState,
): Candidate[] {
  return candidates.filter(
    (c) =>
      matchAcreage(c, filters["acreage"]) &&
      matchPrice(c, filters["price"]) &&
      matchUseFit(c, filters["use-fit"]),
  );
}
