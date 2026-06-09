/**
 * Observe-surface copy (apps/web/src/v3/observe/**).
 *
 * Covers UI/UX suggestions:
 *   1 (language audit, observe strings), 8 (per-domain empty-state question),
 *   9 (ecological revision banner), 10 (cycle-name echo, observe side).
 */

import { UNIVERSAL_DOMAIN_LABELS, type UniversalDomain } from "@ogden/shared";
import { joinReadable } from "./shared.js";

export type RevisionPriority = "critical" | "high" | "informational";

export const OBSERVE_COPY = {
  /** Generic land-vocabulary fallback where a domain is not in scope. */
  notYetRead: "Not yet read",
} as const;

/**
 * Suggestion 8 — instead of a flat "Not yet observed", each domain surfaces
 * the question the land cannot yet answer and why it matters. The compiler
 * enforces a question for every one of the 16 universal domains.
 */
const DOMAIN_QUESTION: Record<UniversalDomain, string> = {
  "vision-intent":
    "No vision recorded yet. Every later decision leans on knowing what this land is meant to become.",
  "land-base":
    "Your land's edges and legal footing aren't recorded yet. Nothing can be sized or sited until they are.",
  "climate":
    "We don't yet know how sun, wind, frost, and storms move across your site. Choices made now are guesses against the weather.",
  "topography":
    "The shape of your land isn't read yet. Until it is, you can't tell where water will run or where to place anything.",
  "hydrology":
    "We don't know where your water moves yet. Until you do, your swale and dam decisions are guesses.",
  "soil":
    "No soil readings yet. Zone and planting designs made without this are working blind.",
  "ecology":
    "No ecology surveys recorded. Guild design and species integration can't be confirmed yet.",
  "plants-food":
    "No planting or crop record yet. What grows where stays unsettled until you read the ground that feeds it.",
  "animals-livestock":
    "No animal or livestock record yet. Paddocks, water points, and rotations can't be sized without it.",
  "built-infrastructure":
    "No structures or assets logged yet. Access, water, and energy plans depend on knowing what's already here.",
  "access-circulation":
    "No access or circulation read yet. Where people and machines move shapes every zone you'll draw.",
  "energy-resources":
    "No energy or resource flows recorded yet. You can't close a loop you haven't traced.",
  "people-governance":
    "No people or governance recorded yet. Who decides, and who does the work, shapes what the land can hold.",
  "economics-capacity":
    "No economics or capacity recorded yet. Ambition outruns the land until you know what you can carry.",
  "risk-compliance":
    "No risks or constraints recorded yet. The land may say no in ways you haven't checked for.",
  "monitoring-records":
    "Nothing tracked yet. Without a baseline, you won't see what your work changes.",
};

/** The question a domain can't yet answer while it has no observations. */
export function domainUnansweredQuestion(domain: UniversalDomain): string {
  return DOMAIN_QUESTION[domain];
}

/**
 * Suggestion 9 — ecological framing of the Plan-revision banner headline.
 * Suggestion 10 — echoes the active cycle title when one is in scope.
 */
const REVISION_HEADLINE: Record<RevisionPriority, string> = {
  critical: "The land is asking you to look again",
  high: "Field evidence is pulling against your plan",
  informational: "New observations since your last review",
};

export function revisionHeadline(
  priority: RevisionPriority,
  cycleTitle?: string | null,
): string {
  const base = REVISION_HEADLINE[priority];
  return cycleTitle ? `${base} -- ${cycleTitle}` : base;
}

/**
 * Suggestion 9 + 10 — supporting line beneath the revision headline.
 * Reframes "events" as "readings" (land vocabulary), names the impacted
 * domains, and echoes the cycle title when present (no-op when null).
 */
export function revisionSupporting(input: {
  eventCount: number;
  domains: readonly UniversalDomain[];
  cycleTitle?: string | null;
}): string {
  const { eventCount, domains, cycleTitle } = input;
  const noun = eventCount === 1 ? "reading" : "readings";
  const cyclePart = cycleTitle ? ` in your ${cycleTitle} cycle` : "";
  if (domains.length === 0) {
    return `${eventCount} new ${noun}${cyclePart} since you last looked.`;
  }
  const labels = domains.map((d) => UNIVERSAL_DOMAIN_LABELS[d]);
  return `${eventCount} new ${noun} across ${joinReadable(labels)}${cyclePart} since you last looked.`;
}

/**
 * Suggestion 10 — cycle eyebrow for an Observe domain card. Returns null
 * when no cycle title is in scope so the card can omit the line entirely.
 */
export function domainCardCycleEyebrow(cycleTitle: string | null): string | null {
  return cycleTitle ? cycleTitle : null;
}
