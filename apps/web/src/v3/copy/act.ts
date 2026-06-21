/**
 * Act-surface copy (apps/web/src/v3/act/**).
 *
 * Covers UI/UX suggestions:
 *   1 (language audit, act strings), 3 (feeds-into fallback template),
 *   4 (visible Observe-signal confirmation), 7 (philosophical post-divergence
 *   confirmation).
 */

export const ACT_COPY = {
  decisionList: {
    activeDecision: "Active decision",
    yourDecisions: "Your decisions",
    completionGate: "Completion gate",
    optional: "optional",
    // Plan Declaration only: label above the Act-stage handoff artifact name.
    actHandoff: "Act handoff",
    // Plan Reception only (Tier-2 systems reading): label above the Observe-stage
    // survey-record name -- the dual output sibling to the Act handoff.
    observeOutput: "Observe output",
    // Stacked workbench (Plan Declaration + Reception): the back affordance shown
    // above the collapsed selected tile to return to the full decision list.
    backToList: "All decisions",
  },

  workingPanel: {
    workingOn: "Working on",
    recorded: "Recorded",
    recordButton: "Record this decision",
    whyThese: "Why these?",
    whyTheseOptional: "(optional)",
    deferActive: "Not ready -- needs more observation",
    // Deferred-state label. Avoids the word "Deferred" so it does not collide
    // with Plan's objective-level "Deferred" status (left-rail card + Restore);
    // the workbench now renders only in Plan, so this is the item-level affordance.
    deferDeferred: "On hold -- needs observation",
    /** Toggled-state label when a decision carries a custom defer label. */
    addLater: "Will add later",
    decisionPlaceholder: "Capture this decision in your own words.",
    rationalePlaceholder: "What evidence or reasoning shapes this set? (optional)",
  },

  divergence: {
    title: "Reality diverges from the plan",
    intro:
      "Divergence is field-truth, not failure. Capture what you saw so it flows to Observe and the parent objective can be reviewed.",
    whatChanged: "What changed?",
    noteLabel: "Note (required)",
    notePlaceholder: "Briefly describe the divergence so a reviewer can act on it.",
    photoLabel: "Photo (required)",
    locationLabel: "Location (recommended)",
    submit: "Submit divergence",
    cancel: "Cancel",
    close: "Close",
    requiredHint: "Type, note, and a photo are required.",
    /**
     * Suggestion 7 — shown after a divergence is recorded. Encodes the
     * product's stance: the land's account is the permanent record.
     */
    confirmation:
      "Recorded. This is now part of your land's permanent record -- whatever the plan said, the land said this first.",
    confirmCta: "Done",
  },
} as const;

/** Decision-list progress count, e.g. "3 / 7 decisions made". */
export function decisionCount(done: number, total: number): string {
  return `${done} / ${total} decisions made`;
}

/**
 * Suggestion 3 — fallback "feeds into" chip when an objective carries no
 * authored `feedHint`. The concrete-consequence text itself lives as
 * authored `feedHint` seed data in packages/shared; this is only the
 * generic chrome template that resolves downstream objective names.
 */
export function feedsFallback(names: readonly string[]): string {
  if (names.length === 0) return "";
  return `Feeds ${names.join(", ")}`;
}

/**
 * Act-only OUTCOME title transform. The Plan checklist shows the imperative
 * `label` (an ACTION: "Articulate the land vision in one paragraph."); the Act
 * "Your decisions" list shows the OUTCOME ("Land vision in one paragraph").
 *
 * Conservative and DISPLAY-ONLY (never a gate): it strips ONLY a curated set of
 * safe leading imperatives (plus an optional article), drops a trailing
 * period/ellipsis, and capitalizes. Anything it does not positively recognize is
 * returned unchanged -- so unknown verbs and decision-framing / fiqh-sensitive
 * labels ("Decide whether to offer a season pass...", "X vs Y") degrade safely
 * to the exact original label. Callers may hand-override per item via the
 * optional `outcomeTitle` field (PlanDecisionChecklistItemSchema); this is the
 * derive-when-unset fallback.
 */
const OUTCOME_SAFE_VERBS = new Set([
  "articulate", "list", "set", "define", "inventory", "record", "identify",
  "document", "map", "describe", "outline", "specify", "capture", "draft",
  "establish", "confirm", "select", "classify", "assess", "calculate",
  "estimate", "catalogue", "catalog", "compile", "note", "summarize",
  "summarise", "plan", "design", "build",
  // NOTE: do NOT add "state" -- existing fixtures use "State the primary
  // purpose" and must render verbatim. Curate against the test fixtures.
]);
const OUTCOME_LEAD_ARTICLES = new Set(["the", "a", "an", "your"]);
// Decision-framing leads stay verbatim -- the steward records a CHOICE, not an
// outcome, so mangling these would misrepresent guardrail items.
const OUTCOME_PROTECTED_LEAD = new Set([
  "decide", "choose", "determine", "evaluate", "weigh", "consider",
]);
const OUTCOME_PROTECTED_MARKERS = [/\bwhether\b/i, /\bvs\.?\b/i];

export function toOutcomeTitle(label: string): string {
  const trimmed = label.trim();
  const words = trimmed.split(/\s+/);
  const first = (words[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (OUTCOME_PROTECTED_LEAD.has(first)) return label; // decision-framing -> verbatim
  if (OUTCOME_PROTECTED_MARKERS.some((re) => re.test(trimmed))) return label; // whether / vs -> verbatim
  if (!OUTCOME_SAFE_VERBS.has(first)) return label; // unknown verb -> verbatim
  let rest = words.slice(1);
  if (rest.length && OUTCOME_LEAD_ARTICLES.has(rest[0]!.toLowerCase())) {
    rest = rest.slice(1);
  }
  if (!rest.length) return label;
  const out = rest.join(" ").replace(/\s*[.…]+\s*$/, "");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * Suggestion 4 — confirmation shown after the first verified Act task,
 * closing the Plan -> Act -> Observe loop visibly. `domainLabel` is the
 * Observe domain the proof routed to (read from the existing feed key); it
 * may be null when the route is not resolvable.
 */
export function observeSignalConfirmation(domainLabel: string | null): string {
  if (!domainLabel) {
    return "Recorded. What you did in the field now lives in your land's record -- you'll see it surface in Observe.";
  }
  return `Recorded. What you did in the field now lives in your land's record -- you'll see it surface in Observe under ${domainLabel}.`;
}
