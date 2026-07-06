/**
 * bannedTerms — the single covenant banned-term source of truth.
 *
 * Deep-audit 2026-07-03 (Amanah cluster): four divergent inline copies of the
 * "CSA / advance-sale" regex had drifted apart — each missing terms the others
 * caught (salam, advance-purchase, riba, investor). This module consolidates
 * them into ONE two-tier set, and every prior consumer now scans against it.
 *
 * Two tiers, because the terms are not all forbidden the same way:
 *
 *   HARD-BAN — denotes the forbidden financial model (riba / gharar /
 *     bayʿ mā laysa ʿindak), the erased CSRA brand, or the forbidden public
 *     label ("investor"). No licit use in authored copy; a hit is a failure
 *     wherever it appears, disclaimers included.
 *
 *   CONDITIONAL — has one licit context: a scopeNote / disclaimer that NAMES
 *     the term precisely in order to forbid it, or a Scholar-Council-gated
 *     future membership benefit. Forbidden in active copy, tolerated only in
 *     that carve-out (callers scan active language against this tier, and let
 *     scope-note text through).
 *
 * Term-set wording confirmed by the operator before merge (Amanah gate):
 *   presale → hard-ban (literal bayʿ mā laysa ʿindak); subscription →
 *   conditional (dual-use); plus the riba/equity family (usury,
 *   interest-bearing, equity-stake, return-on-investment, ROI) added to
 *   hard-ban, deliberately EXCLUDING bare "shares" / "interest" / "dividend"
 *   / "equity" to avoid false positives.
 */
import { describe, it, expect } from 'vitest';
import {
  COVENANT_HARD_BAN,
  COVENANT_CONDITIONAL,
  COVENANT_BANNED_ALL,
  COVENANT_WORD_TOKENS,
  COVENANT_SOURCE_GREP_RE,
  detectCovenantBanned,
  matchCovenantBannedTerms,
} from '../bannedTerms.js';

describe('covenant term sets', () => {
  it('the union is exactly hard-ban plus conditional', () => {
    expect(COVENANT_BANNED_ALL).toHaveLength(
      COVENANT_HARD_BAN.length + COVENANT_CONDITIONAL.length,
    );
    for (const t of [...COVENANT_HARD_BAN, ...COVENANT_CONDITIONAL]) {
      expect(COVENANT_BANNED_ALL).toContain(t);
    }
  });

  it('no term label appears in both tiers', () => {
    const hard = new Set(COVENANT_HARD_BAN.map((t) => t.label));
    for (const t of COVENANT_CONDITIONAL) {
      expect(hard.has(t.label)).toBe(false);
    }
  });

  it('every pattern is case-insensitive and stateless (no global flag)', () => {
    for (const t of COVENANT_BANNED_ALL) {
      expect(t.pattern.flags).toContain('i');
      expect(t.pattern.flags).not.toContain('g');
    }
  });
});

describe('detectCovenantBanned — hard-ban tier', () => {
  const hits: Array<[string, string]> = [
    ['community-supported', 'a community-supported agriculture model'],
    ['CSRA', 'the CSRA model'],
    ['salam', 'funded by a salam contract'],
    ['riba', 'no riba here but the word is present'],
    ['usury', 'this is usury'],
    ['interest-bearing', 'an interest-bearing account'],
    ['interest bearing (space)', 'an interest bearing note'],
    ['investor', 'seeking an investor'],
    ['investors (plural)', 'seeking investors'],
    ['equity-stake', 'take an equity-stake in the farm'],
    ['equity stake (space)', 'take an equity stake in the farm'],
    ['return-on-investment', 'a strong return-on-investment'],
    ['return on investment (space)', 'a strong return on investment'],
    ['ROI', 'track the ROI monthly'],
    ['advance-sale', 'advance-sale of the harvest'],
    ['advance sale (space)', 'advance sale of the harvest'],
    ['advance-purchase', 'an advance-purchase from members'],
    ['presale', 'presale of next season'],
    ['pre-sale (hyphen)', 'pre-sale of next season'],
    ['bayʿ mā laysa maxim', 'this is bayʿ mā laysa ʿindak'],
  ];
  for (const [label, text] of hits) {
    it(`flags ${label}`, () => {
      expect(detectCovenantBanned(text)).toBe(true);
      expect(detectCovenantBanned(text, COVENANT_HARD_BAN)).toBe(true);
    });
  }
});

describe('detectCovenantBanned — conditional tier', () => {
  const hits: Array<[string, string]> = [
    ['CSA', 'a CSA box scheme'],
    ['subscription', 'a weekly harvest subscription'],
    ['yield-share', 'a yield-share for capital partners'],
    ['yield share (space)', 'a yield share for capital partners'],
  ];
  for (const [label, text] of hits) {
    it(`flags ${label} in the union and the conditional tier`, () => {
      expect(detectCovenantBanned(text)).toBe(true);
      expect(detectCovenantBanned(text, COVENANT_CONDITIONAL)).toBe(true);
    });
    it(`does NOT flag ${label} as hard-ban`, () => {
      expect(detectCovenantBanned(text, COVENANT_HARD_BAN)).toBe(false);
    });
  }
});

describe('detectCovenantBanned — covenant-clean text is not flagged', () => {
  // The operator's exclusions: bare "shares" / "interest" / "dividend" /
  // "equity" must NOT trip — only the compound riba/equity terms do.
  const clean = [
    'Water security for the homestead',
    'Silvopasture grazing rotation',
    'Faith-aligned governance',
    'Regenerate the land',
    'he shares the boundary with a neighbour',
    'points of interest along the trail',
    'the herd returns to the barn at dusk',
    'a fair dividend of the harvest among workers',
    'equity and dignity for every steward',
    'a tribal land boundary', // must not trip \briba\b
  ];
  for (const t of clean) {
    it(`leaves clean: "${t}"`, () => {
      expect(detectCovenantBanned(t)).toBe(false);
    });
  }
});

describe('detectCovenantBanned — null / empty safe', () => {
  it('returns false for null, undefined, empty string', () => {
    expect(detectCovenantBanned(null)).toBe(false);
    expect(detectCovenantBanned(undefined)).toBe(false);
    expect(detectCovenantBanned('')).toBe(false);
  });
});

describe('matchCovenantBannedTerms — returns the labels that matched', () => {
  it('names every banned term present, hard-ban and conditional', () => {
    const labels = matchCovenantBannedTerms(
      'an investor seeking ROI via a harvest subscription',
    );
    expect(labels).toContain('investor');
    expect(labels).toContain('ROI');
    expect(labels).toContain('subscription');
  });

  it('returns an empty array for covenant-clean text', () => {
    expect(matchCovenantBannedTerms('Regenerate the land')).toEqual([]);
  });

  it('returns an empty array for null / empty', () => {
    expect(matchCovenantBannedTerms(null)).toEqual([]);
    expect(matchCovenantBannedTerms('')).toEqual([]);
  });

  it('scopes to a passed tier', () => {
    const text = 'an investor offering a CSA box';
    // Full union sees both; hard-ban sees only "investor".
    expect(matchCovenantBannedTerms(text)).toEqual(
      expect.arrayContaining(['investor', 'CSA']),
    );
    expect(matchCovenantBannedTerms(text, COVENANT_HARD_BAN)).toEqual(['investor']);
  });
});

// ---------------------------------------------------------------------------
// Harvested from the parallel "surface-model" covenant implementation and
// operator-signed 2026-07-05 (three-way adjudication): `gharar` promoted into
// the hard-ban tier (the module's own doc-comment already named it as a
// forbidden model but no term matched it), plus two derived exports that let
// the two remaining inline consumers — the S7 break-even token guard and the
// showcase source-tree grep — stop maintaining their own drifting copies.
// ---------------------------------------------------------------------------

describe('gharar — promoted into the hard-ban tier', () => {
  it('is flagged by the union and by the hard-ban tier', () => {
    expect(detectCovenantBanned('a contract clouded by gharar')).toBe(true);
    expect(detectCovenantBanned('a contract clouded by gharar', COVENANT_HARD_BAN)).toBe(true);
  });

  it('is named by matchCovenantBannedTerms', () => {
    expect(matchCovenantBannedTerms('riba and gharar together')).toContain('gharar');
  });

  it('is a bounded whole word — the Sahara stays clean', () => {
    expect(detectCovenantBanned('the Sahara at dawn')).toBe(false);
  });
});

describe('COVENANT_WORD_TOKENS — bare lexemes for includes()-style guards', () => {
  it('is exactly the unambiguous single-word set {csa, csra, investor, salam}', () => {
    expect([...COVENANT_WORD_TOKENS].sort()).toEqual(['csa', 'csra', 'investor', 'salam']);
  });

  it('every token is a lowercase bare lexeme, safe as a raw substring', () => {
    for (const tok of COVENANT_WORD_TOKENS) {
      expect(tok).toBe(tok.toLowerCase());
      expect(tok).toMatch(/^[a-z]+$/);
    }
  });
});

describe('COVENANT_SOURCE_GREP_RE — grep-safe subset for whole-source scans', () => {
  it('is a case-insensitive, stateless RegExp', () => {
    expect(COVENANT_SOURCE_GREP_RE).toBeInstanceOf(RegExp);
    expect(COVENANT_SOURCE_GREP_RE.flags).toContain('i');
    expect(COVENANT_SOURCE_GREP_RE.global).toBe(false);
  });

  it('matches the exotic covenant terms that will not collide with identifiers', () => {
    for (const term of [
      'CSRA',
      'salam',
      'riba',
      'gharar',
      'investor',
      'advance-purchase',
      'yield-share',
    ]) {
      expect(COVENANT_SOURCE_GREP_RE.test(term), term).toBe(true);
    }
  });

  it('EXCLUDES common code words that would false-positive across a source tree', () => {
    for (const word of ['subscription', 'presale', 'advance-sale', 'csa']) {
      expect(COVENANT_SOURCE_GREP_RE.test(word), word).toBe(false);
    }
  });
});
