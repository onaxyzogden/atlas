// autoFill.ts
//
// A pure string helper for the protocol confirmation flow (Protocol Layer Spec
// §4.1 — AUTO-FILLED fields). The standard catalogue keeps the spec's bracket
// placeholders verbatim (e.g. "IF pasture cover < [approved threshold] kg DM/ha").
// At Tier-5/Stratum-6 approval, OLOS substitutes the approved tier outputs into
// those brackets and shows the steward the filled-in condition with the
// substituted segments highlighted.
//
// This slice does NOT evaluate anything — there is no eval(), no engine. We only
// split a condition string into literal vs. auto-filled segments so the
// confirmation card can render the substituted values with an amber highlight.
// The substitution values come from a mock `APPROVED_TIER_OUTPUTS` map (web-side
// only); genuine approved-output wiring is deferred.

export interface ConditionSegment {
  /** The text to render for this segment. */
  text: string;
  /** True when this segment was substituted from an approved tier output. */
  autoFilled: boolean;
  /**
   * The bracket token name (without brackets, e.g. `'approved threshold'`) for
   * an auto-filled segment. Absent on literal segments. Lets the Edit-First form
   * map each input back to the token it overrides.
   */
  token?: string;
}

/**
 * Split a protocol condition into ordered segments, substituting any
 * `[bracket token]` with its value from `outputs` (keyed WITHOUT the brackets,
 * e.g. `'approved threshold'`). Bracket tokens with no matching output are kept
 * verbatim (still flagged `autoFilled` so the card highlights the unresolved
 * placeholder). Pure — no side effects, no evaluation.
 *
 * Example:
 *   renderConditionSegments(
 *     'IF pasture cover < [approved threshold] kg DM/ha',
 *     { 'approved threshold': '1,500 kg DM/ha' },
 *   )
 *   → [
 *       { text: 'IF pasture cover < ', autoFilled: false },
 *       { text: '1,500 kg DM/ha',      autoFilled: true  },
 *       { text: ' kg DM/ha',           autoFilled: false },
 *     ]
 */
export function renderConditionSegments(
  condition: string,
  outputs: Record<string, string>,
): ConditionSegment[] {
  const segments: ConditionSegment[] = [];
  const pattern = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(condition)) !== null) {
    // Literal text before this bracket.
    if (match.index > lastIndex) {
      segments.push({ text: condition.slice(lastIndex, match.index), autoFilled: false });
    }
    const token = match[1] ?? '';
    const value = outputs[token];
    // Substitute the approved output if known; otherwise keep the placeholder
    // verbatim (still flagged so the UI shows it as an unresolved auto-fill).
    segments.push({ text: value ?? match[0], autoFilled: true, token });
    lastIndex = pattern.lastIndex;
  }

  // Trailing literal text after the last bracket (or the whole string if none).
  if (lastIndex < condition.length) {
    segments.push({ text: condition.slice(lastIndex), autoFilled: false });
  }

  return segments;
}
