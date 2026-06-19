/**
 * Plan-surface copy (apps/web/src/v3/plan/**).
 *
 * Covers UI/UX suggestions:
 *   1 (language audit, plan strings), 2 (first-entry sequence line),
 *   5 (mentor-register locked popover), 6 (site-specific unlock survey line),
 *   10 (cycle-name echo, plan side).
 */

import type { PlanStratumId } from "@ogden/shared";

/** Site-shape variants for the tier-unlock "what just became possible" line. */
export type UnlockSurveyVariant = "hilly" | "flat" | "has-infrastructure" | "default";

export const PLAN_COPY = {
  /**
   * Suggestion 2 — single sentence on first Plan entry that names the
   * unlock sequence as wisdom, not bureaucracy.
   */
  firstEntryIntro:
    "Terrain before water. Water before zones. Zones before planting. OLOS holds this sequence so you don't have to.",

  lockedPopover: {
    /** Eyebrow suffix; component builds "Stratum {ordinal} locked". */
    eyebrowSuffix: "locked",
    workCta: "Work prerequisite",
    secondaryCta: "Not now",
    acknowledgeCta: "Acknowledge",
    /** Fallback when no specific prerequisite objectives are recorded. */
    emptyPrereq:
      "Work the earlier strata first -- each one teaches you what the next one needs.",
  },

  unlockCelebration: {
    /** Eyebrow suffix; component builds "Stratum {ordinal} unlocked". */
    eyebrowSuffix: "unlocked",
    startWith: "Start with",
    empty: "This ground has nothing to read yet.",
    /** Lead-in for the suggestion-6 site survey line. */
    surveyLead: "Now worth doing on the ground",
  },
} as const;

/**
 * Suggestion 5 — the ecological logic behind why a stratum waits, in a
 * mentor's register (recognition, not gatekeeping). Keyed by the locked
 * stratum; the compiler enforces a reason for every stratum.
 */
const LOCK_REASON: Record<PlanStratumId, string> = {
  "s1-project-foundation":
    "This is where every stewardship record begins. Nothing stands before it.",
  "s2-land-reading":
    "Before you can read the land's systems, you need its edges, its people, and what it's for. That work sits just below.",
  "s3-systems-reading":
    "Water, soil, and habitat all answer to the terrain and climate you haven't read yet. Read the land first; its systems will make sense after.",
  "s4-foundation-decisions":
    "The decisions that shape everything -- where the water goes, where the zones sit -- rest on how water and soil actually behave here. Finish reading those systems first.",
  "s5-system-design":
    "You can't design the systems until the direction, water strategy, and zones are set. Those choices frame everything you'll place.",
  "s6-integration-design":
    "Integration weaves access, water, and soil work into one design -- but only once each is settled on its own. Design them first.",
  "s7-phasing-resourcing":
    "Launch preparation sequences the work and resources Phase 1 against your team's capacity. There's nothing to prepare until the design above is settled.",
};

/** The ecological reason a given stratum is still locked. */
export function lockReason(stratumId: PlanStratumId): string {
  return LOCK_REASON[stratumId] ?? PLAN_COPY.lockedPopover.emptyPrereq;
}

/** Mentor-register status label for a prerequisite objective in the popover. */
export function prereqStatusLabel(status: string): string {
  switch (status) {
    case "locked":
      return "Still waiting on its own groundwork";
    case "available":
      return "Ready to work now";
    case "active":
      return "In progress";
    case "complete":
      return "Done";
    default:
      return status;
  }
}

/**
 * Suggestion 6 — site-specific survey prompt shown when a tier unlocks.
 * Variant selection is wired only where a site signal is readily available;
 * otherwise callers pass "default" (terrain auto-detection is deferred).
 */
const UNLOCK_SURVEY_LINE: Record<UnlockSurveyVariant, string> = {
  hilly: "Survey your ridgelines and valleys -- the high ground and the low.",
  flat: "Survey your drainage channels and low points -- where water gathers and lingers.",
  "has-infrastructure":
    "Walk your access tracks and existing structures, and note their condition.",
  default: "Walk your boundary and read the lay of the land before you mark anything.",
};

export function unlockSurveyLine(variant: UnlockSurveyVariant = "default"): string {
  return UNLOCK_SURVEY_LINE[variant];
}
