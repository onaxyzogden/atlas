// severityTierStyle.ts
//
// The tier colour + icon table for the OLOS Protocol System (Trigger
// Recognition UX Spec v1.1, Section 3.1). These are LITERAL hexes and Unicode
// glyphs, NOT spine CSS-vars (C.*/F.*): the spec pins exact, theme-independent
// values so that Stop (alarm red) and Abundance (growth green) stay maximally
// distinct under any lighting, light or dark surface. Do not swap these for
// theme tokens.
//
// Glyphs are written as \uXXXX escapes to keep this source ASCII-only and
// immune to cp1252/UTF-8 round-tripping on Windows; at runtime each escape is
// the single Unicode character noted in the trailing comment.

import { type SeverityTier } from '../../schemas/protocol/protocol.schema.js';

/** Visual treatment for one tier (or the pending pseudo-tier). */
export interface TierVisual {
  /** Fill colour behind the badge. */
  bg: string;
  /** Foreground: icon stroke, border, and label text. */
  fg: string;
  /** Single Unicode glyph, rendered 22px bold in `fg` (spec 3.1). */
  icon: string;
  /** Human label shown beside the glyph. */
  label: string;
}

/**
 * The four severity tiers, keyed by `SeverityTier`. A `Record<SeverityTier, ...>`
 * so adding a tier to the enum forces a matching entry here (compile error
 * otherwise).
 */
export const TIER_VISUAL: Record<SeverityTier, TierVisual> = {
  stop: { bg: '#FDECEA', fg: '#A31515', icon: '\u2715', label: 'Stop' }, // MULTIPLICATION X
  respond: { bg: '#FFF8E1', fg: '#B05C00', icon: '\u25B2', label: 'Respond' }, // BLACK UP-POINTING TRIANGLE
  watch: { bg: '#EAF4FF', fg: '#2E75B6', icon: '\u25CF', label: 'Watch' }, // BLACK CIRCLE
  abundance: { bg: '#F0F9F0', fg: '#3A7D44', icon: '\u2665', label: 'Abundance' }, // BLACK HEART SUIT
};

/**
 * Styling for the PENDING pseudo-tier: a protocol activation awaiting review
 * ("Flag for review" / pending_review). Not a `SeverityTier` value - it
 * describes confirmation state, so it lives outside `TIER_VISUAL`.
 */
export const PENDING_VISUAL: TierVisual = {
  bg: '#F5F0FF',
  fg: '#6B48C8',
  icon: '\u29D6', // WHITE HOURGLASS
  label: 'Pending',
};
