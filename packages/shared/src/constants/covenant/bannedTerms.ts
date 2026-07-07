/**
 * bannedTerms — the single covenant banned-term source of truth.
 *
 * Before the 2026-07-03 deep audit, four inline copies of a "CSA / advance-sale"
 * regex lived apart across the codebase (the reality-check detector, the seeded-
 * recipe conformance guard, and two catalogue guards). They had drifted: each
 * caught terms the others missed, so the same covenant prohibition was enforced
 * to a different depth depending on which surface you touched. This module is
 * the one set they now all scan against.
 *
 * TWO TIERS, because the terms are not forbidden the same way:
 *
 *   HARD-BAN — denotes the forbidden financial model (riba / gharar /
 *     bayʿ mā laysa ʿindak — the sale of what one does not yet possess), the
 *     erased "CSRA" brand, or the forbidden public label ("investor"). There is
 *     no licit use in authored copy; a hit is a failure wherever it appears,
 *     scope-note disclaimers included.
 *
 *   CONDITIONAL — has exactly one licit context: a scopeNote / disclaimer that
 *     NAMES the term precisely in order to forbid it (e.g. a revenue-model
 *     objective that documents "no CSA / subscription"), or a future
 *     membership benefit designed afresh under Scholar-Council review. Callers
 *     scan ACTIVE copy against this tier and let scope-note text through.
 *
 * Term-set wording confirmed by the operator before merge (Amanah gate):
 * `presale` → hard-ban (a literal advance sale); `subscription` → conditional
 * (dual-use: capital-subscription is banned, a content/newsletter subscription
 * is licit); and the riba/equity family (usury, interest-bearing, equity-stake,
 * return-on-investment, ROI) added to hard-ban — deliberately EXCLUDING bare
 * "shares" / "interest" / "dividend" / "equity", which carry licit meanings and
 * would false-positive.
 *
 * 2026-07-05 (three-way adjudication of the parallel covenant implementations):
 * `gharar` promoted into hard-ban — the header above already named it as a
 * forbidden model, but no term actually matched it — and two derived exports
 * added so the last two inline consumers stop maintaining drifting copies:
 * `COVENANT_WORD_TOKENS` (bare lexemes for `includes()`-style guards, e.g. the
 * S7 break-even test) and `COVENANT_SOURCE_GREP_RE` (the grep-safe subset for
 * whole-source scans, e.g. the showcase guard). Operator-confirmed before merge.
 *
 * Permitted capital channels (never banned, named here for the reviewer):
 * charitable donation, restricted donation, qard ḥasan (interest-free loan),
 * in-kind contribution, sponsorship.
 */

/** One covenant-banned term: a matcher plus why it is forbidden. */
export interface CovenantBannedTerm {
  /** Stable label for diagnostics and for naming the hit in a failure. */
  readonly label: string;
  /** The matcher. Case-insensitive, and stateless (never the `g` flag, so it
   *  is safe to `.test()` the same pattern repeatedly). */
  readonly pattern: RegExp;
  /** One line on why it is forbidden — for the reviewer and the Scholar Council. */
  readonly rationale: string;
  /**
   * A bare lowercase lexeme, set only on short, unambiguous single words that
   * are safe to test as a raw substring (`text.includes(token)`). Feeds
   * `COVENANT_WORD_TOKENS`, the list the S7 break-even guard scans with.
   */
  readonly token?: string;
  /**
   * True when the term is "exotic" enough to appear in a whole-source-tree grep
   * without matching ordinary identifiers. Feeds `COVENANT_SOURCE_GREP_RE`, the
   * union the showcase source scan uses. Deliberately unset for common code
   * words (csa / subscription / presale / advance-sale) that would false-positive.
   */
  readonly grepSafe?: boolean;
}

/**
 * TIER 1 — HARD-BAN. Forbidden wherever it appears, disclaimers included.
 */
export const COVENANT_HARD_BAN: readonly CovenantBannedTerm[] = [
  {
    label: 'community-supported',
    pattern: /community[- ]supported/i,
    rationale: 'CSA framing — advance-purchase of a future harvest (bayʿ mā laysa ʿindak)',
  },
  {
    label: 'CSRA',
    pattern: /\bCSRA\b/i,
    rationale: 'the "Community-Supported Regenerative Agriculture" brand, erased on fiqh grounds 2026-05-04',
    token: 'csra',
    grepSafe: true,
  },
  {
    label: 'salam',
    pattern: /\bsalam\b/i,
    rationale: 'salam is an advance-purchase contract; not a permitted MTC capital channel',
    token: 'salam',
    grepSafe: true,
  },
  {
    label: 'riba',
    pattern: /\briba\b/i,
    rationale: 'interest — categorically forbidden',
    grepSafe: true,
  },
  {
    label: 'gharar',
    pattern: /\bgharar\b/i,
    rationale:
      'excessive contractual uncertainty — categorically forbidden (harvested from the parallel surface-model impl, operator-signed 2026-07-05)',
    grepSafe: true,
  },
  {
    label: 'usury',
    pattern: /\busury\b/i,
    rationale: 'interest by another name — categorically forbidden',
  },
  {
    label: 'interest-bearing',
    pattern: /interest[- ]bearing/i,
    rationale: 'riba instrument (bare "interest" is deliberately not banned)',
  },
  {
    label: 'investor',
    pattern: /\binvestor/i,
    rationale: 'forbidden public label; capital contributors are "capital partners & allies"',
    token: 'investor',
    grepSafe: true,
  },
  {
    label: 'equity-stake',
    pattern: /equity[- ]stake/i,
    rationale: 'return-on-advance-capital framing (bare "equity" is deliberately not banned)',
  },
  {
    label: 'return-on-investment',
    pattern: /return[- ]on[- ]investment/i,
    rationale: 'return-on-advance-capital framing',
  },
  {
    label: 'ROI',
    pattern: /\bROI\b/i,
    rationale: 'return-on-investment abbreviation',
  },
  {
    label: 'advance-sale',
    pattern: /advance[- ]sale/i,
    rationale: 'sale of what one does not yet possess (bayʿ mā laysa ʿindak)',
  },
  {
    label: 'advance-purchase',
    pattern: /advance[- ]purchase/i,
    rationale: 'purchase of what the seller does not yet possess (bayʿ mā laysa ʿindak)',
    grepSafe: true,
  },
  {
    label: 'presale',
    pattern: /\bpre-?sale/i,
    rationale: 'a pre-sale is an advance sale (bayʿ mā laysa ʿindak)',
  },
  {
    label: 'bayʿ mā laysa',
    pattern: /bay\S*\s*m[āa]\s*laysa/i,
    rationale: 'the prohibition maxim itself must not surface in seed-able copy',
  },
];

/**
 * TIER 2 — CONDITIONAL. Forbidden in active copy; tolerated only in a scopeNote
 * that names it to forbid it, or a Scholar-Council-gated future benefit.
 */
export const COVENANT_CONDITIONAL: readonly CovenantBannedTerm[] = [
  {
    label: 'CSA',
    pattern: /\bcsa\b/i,
    rationale: 'community-supported-agriculture abbreviation; may be named in a scopeNote to forbid it',
    token: 'csa',
  },
  {
    label: 'subscription',
    pattern: /subscription/i,
    rationale: 'capital-subscription is banned; content/newsletter subscription is licit',
  },
  {
    label: 'yield-share',
    pattern: /yield[- ]share/i,
    rationale: 'contemplated only as a future membership benefit under Scholar-Council review',
    grepSafe: true,
  },
];

/** The union — every covenant-banned term across both tiers. */
export const COVENANT_BANNED_ALL: readonly CovenantBannedTerm[] = [
  ...COVENANT_HARD_BAN,
  ...COVENANT_CONDITIONAL,
];

/**
 * Bare single-word lexemes — the `token` of every term that carries one — for
 * consumers that scan with `text.includes(token)` rather than a RegExp (the S7
 * break-even covenant guard). Only short, unambiguous words safe as a raw
 * substring appear here: `csra`, `salam`, `investor`, `csa`.
 */
export const COVENANT_WORD_TOKENS: readonly string[] = COVENANT_BANNED_ALL
  .map((t) => t.token)
  .filter((tok): tok is string => tok != null);

/**
 * One case-insensitive, stateless RegExp unioning every `grepSafe` term, for
 * whole-source-tree scans (the showcase covenant guard) where matching an
 * ordinary identifier would be a false positive. The common code words
 * (csa / subscription / presale / advance-sale) are deliberately excluded; the
 * "exotic" terms (CSRA, salam, riba, gharar, investor, advance-purchase,
 * yield-share) are kept. Consumers may append their own extra alternatives onto
 * `.source` (e.g. the showcase guard adds `\bROI\b`).
 */
export const COVENANT_SOURCE_GREP_RE: RegExp = new RegExp(
  COVENANT_BANNED_ALL
    .filter((t) => t.grepSafe)
    .map((t) => t.pattern.source)
    .join('|'),
  'i',
);

/**
 * The labels of every banned term appearing in `text` (empty array = clean).
 * Pass a tier (`COVENANT_HARD_BAN` / `COVENANT_CONDITIONAL`) to scope the scan;
 * defaults to the full union.
 */
export function matchCovenantBannedTerms(
  text: string | null | undefined,
  terms: readonly CovenantBannedTerm[] = COVENANT_BANNED_ALL,
): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  return terms.filter((t) => t.pattern.test(text)).map((t) => t.label);
}

/**
 * True when `text` carries any banned term from `terms` (default: the full
 * union). Pass `COVENANT_HARD_BAN` to scan disclaimers, `COVENANT_CONDITIONAL`
 * to scan active copy for the dual-use terms.
 */
export function detectCovenantBanned(
  text: string | null | undefined,
  terms: readonly CovenantBannedTerm[] = COVENANT_BANNED_ALL,
): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  return terms.some((t) => t.pattern.test(text));
}
