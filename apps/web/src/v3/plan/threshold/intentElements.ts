/**
 * intentElements -- the typed intent list that Threshold 1 (The Reality Check)
 * classifies against the assembled survey evidence.
 *
 * DESIGN (operator decision 2026-06-17, "Derive + VisionProfile fallback"):
 * the steward's intent is NOT re-modelled or re-authored at the threshold. It
 * already exists, typed, in the Tier-0 (`s1-vision`) captures:
 *   - VisionClassifyCapture -> `{ committed[], aspirational[] }` on
 *     `s1-vision-classify` (each entry is steward-facing text, verbatim).
 *   - ConstraintsCapture -> `{ constraints: { severity, text, ... }[] }` on
 *     `s1-vision-constraints`; `severity:'nn'` ("non-negotiable") entries are
 *     the hard constraints. (`severity:'hc'` "hard constraint" entries are
 *     operational boundaries, NOT classifiable vision elements -- deliberately
 *     excluded here; widen later if the spec demands it.)
 *
 * `deriveIntentElements` reads those (already-decoded) captures and projects
 * them into a flat, typed `IntentElement[]`. When BOTH captures are empty it
 * falls back to a `VisionProfile`-derived seed so a sparse project still has
 * something to classify (the empty-Tier-0 edge case). The fallback never mixes
 * with capture-derived elements -- captures win whenever they yield anything.
 *
 * PURE / deterministic / no I/O / safe in render. Imports are TYPE-ONLY
 * (erased at build) so this module carries zero React/UI dependency and its
 * tests run without a DOM. The runtime decode (FormValue -> ClassifyValue /
 * ConstraintsModel) and the store/metadata reads live in the consuming layer.
 *
 * AMANAH: the VisionProfile fallback NEVER seeds from the economic axis
 * (`incomeStreams` / `economicStyle` / `economicIntentLevel`) and never
 * fabricates advance-sale / subscription / CSA / yield-share content. The
 * intent text it surfaces is the steward's own declared values/outcomes.
 */

import type { VisionProfile } from '@ogden/shared';
import type { ClassifyValue } from '../../act/tier-shell/VisionClassifyCapture';
import type { ConstraintsModel } from '../../act/tier-shell/ConstraintsCapture';

export type IntentElementType = 'non-negotiable' | 'committed' | 'aspirational';

/** Where a derived element came from -- aids debugging and the reference rail. */
export type IntentElementSource = 'classify' | 'constraints' | 'vision-profile';

export interface IntentElement {
  /** Stable across renders/sessions for a given (type, text); classification keys on it. */
  id: string;
  /** Steward-facing label (verbatim from captures; humanised from profile ids). */
  text: string;
  type: IntentElementType;
  source: IntentElementSource;
}

export interface DeriveIntentElementsInput {
  /** Decoded `s1-vision-classify` value, if present. */
  classify?: ClassifyValue | null;
  /** Decoded `s1-vision-constraints` value, if present. */
  constraints?: ConstraintsModel | null;
  /** `project.metadata.visionProfile`, used only as a fallback seed. */
  visionProfile?: VisionProfile | null;
}

// Type tokens keep ids short + readable: `ie-nn-<hash>`, `ie-cm-<hash>`, `ie-asp-<hash>`.
const TYPE_TOKEN: Record<IntentElementType, string> = {
  'non-negotiable': 'nn',
  committed: 'cm',
  aspirational: 'asp',
};

// FNV-1a (32-bit) -> base36. Deterministic; no crypto needed (ids, not secrets).
function hash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Normalise so trivial whitespace/case differences don't fork the id. */
function normaliseText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeId(type: IntentElementType, text: string): string {
  return `ie-${TYPE_TOKEN[type]}-${hash32(`${type}:${normaliseText(text)}`)}`;
}

function makeElement(
  type: IntentElementType,
  rawText: string,
  source: IntentElementSource,
): IntentElement | null {
  const text = rawText.trim();
  if (text === '') return null;
  return { id: makeId(type, text), text, type, source };
}

// "food-forest" -> "Food forest" (mirror of visionProfileToChecklist.humanise).
function humanise(id: string): string {
  if (!id) return '';
  const spaced = id.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// nonNegotiablesAvoid ids are "things to avoid" -- render with explicit "Avoid"
// so a non-negotiable like `debt_financing` reads "Avoid debt financing", not
// the inverted "Debt financing" (which would misread as a requirement).
function phraseAvoid(id: string): string {
  const spaced = id.replace(/[-_]+/g, ' ').trim();
  return spaced === '' ? '' : `Avoid ${spaced}`;
}

function listOrEmpty(value: readonly string[] | undefined | null): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

/** Dedup by id (same type+text) while preserving first-seen order. */
function dedupe(elements: IntentElement[]): IntentElement[] {
  const seen = new Set<string>();
  const out: IntentElement[] = [];
  for (const el of elements) {
    if (seen.has(el.id)) continue;
    seen.add(el.id);
    out.push(el);
  }
  return out;
}

/**
 * Primary path: project the two Tier-0 captures into typed intent elements.
 * Order is by type severity (non-negotiable, committed, aspirational), then by
 * source order within each type.
 */
function fromCaptures(
  classify: ClassifyValue | null | undefined,
  constraints: ConstraintsModel | null | undefined,
): IntentElement[] {
  const out: IntentElement[] = [];

  // Non-negotiable: ONLY `severity:'nn'` constraints (hard 'hc' excluded).
  for (const c of constraints?.constraints ?? []) {
    if (c.severity !== 'nn') continue;
    const el = makeElement('non-negotiable', c.text, 'constraints');
    if (el) out.push(el);
  }
  // Committed.
  for (const text of classify?.committed ?? []) {
    const el = makeElement('committed', text, 'classify');
    if (el) out.push(el);
  }
  // Aspirational.
  for (const text of classify?.aspirational ?? []) {
    const el = makeElement('aspirational', text, 'classify');
    if (el) out.push(el);
  }

  return dedupe(out);
}

/**
 * Fallback path: derive a seed from the VisionProfile when both captures are
 * empty. Mapping (per plan):
 *   - nonNegotiablesAvoid               -> non-negotiable ("Avoid <x>")
 *   - successDefinition + primaryOutcomes + systemsInScope (the enterprise mix)
 *                                       -> committed
 *   - landIdentity + values             -> aspirational
 * NEVER seeds from the economic axis (incomeStreams / economicStyle /
 * economicIntentLevel). Profile ids are humanised; landIdentity may already be
 * a free-text statement and survives humanise unchanged bar a leading capital.
 */
export function deriveIntentElementsFromProfile(
  profile: VisionProfile | null | undefined,
): IntentElement[] {
  if (!profile) return [];

  const out: IntentElement[] = [];

  // Non-negotiable -- the things the project must avoid.
  for (const id of listOrEmpty(profile.nonNegotiablesAvoid)) {
    const el = makeElement('non-negotiable', phraseAvoid(id), 'vision-profile');
    if (el) out.push(el);
  }

  // Committed -- success definition, primary outcomes, and the enterprise mix.
  const committedIds: string[] = [
    ...listOrEmpty(profile.successDefinition),
    ...listOrEmpty(profile.primaryOutcomes),
  ];
  const sys = profile.systemsInScope;
  if (sys) {
    for (const group of [sys.food, sys.animals, sys.water, sys.built]) {
      committedIds.push(...listOrEmpty(group));
    }
  }
  for (const id of committedIds) {
    const el = makeElement('committed', humanise(id), 'vision-profile');
    if (el) out.push(el);
  }

  // Aspirational -- land identity and values, held lightly.
  for (const id of [
    ...listOrEmpty(profile.landIdentity),
    ...listOrEmpty(profile.values),
  ]) {
    const el = makeElement('aspirational', humanise(id), 'vision-profile');
    if (el) out.push(el);
  }

  return dedupe(out);
}

/**
 * Derive the typed intent list for Threshold 1. Captures are authoritative;
 * the VisionProfile fallback fires ONLY when the captures yield zero elements.
 */
export function deriveIntentElements(
  input: DeriveIntentElementsInput,
): IntentElement[] {
  const fromCap = fromCaptures(input.classify, input.constraints);
  if (fromCap.length > 0) return fromCap;
  return deriveIntentElementsFromProfile(input.visionProfile);
}
