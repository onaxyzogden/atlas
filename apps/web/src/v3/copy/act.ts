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
  },

  workingPanel: {
    workingOn: "Working on",
    recorded: "Recorded",
    recordButton: "Record this decision",
    whyThese: "Why these?",
    whyTheseOptional: "(optional)",
    deferActive: "Not ready -- needs more observation",
    deferDeferred: "Deferred -- needs observation",
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
