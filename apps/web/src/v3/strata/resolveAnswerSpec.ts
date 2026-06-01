/**
 * resolveAnswerSpec — pure, surface-neutral resolver that reads a checklist
 * item's `answerSpec` (declared in the shared catalogue) out of a project's
 * `ProjectMetadata` and reports whether the answer was already captured
 * upstream (creation wizard / Stage Zero Vision Builder / team step) and, if
 * so, the raw stored value(s).
 *
 * Why this lives in apps/web (not packages/shared)
 * ------------------------------------------------
 * It is the generalisation of `visionProfileToChecklist.ts` (also in
 * `v3/strata/`): a data-driven answer resolver in place of the two hand-coded
 * Stratum-1 derivations. Display labels are NOT resolved here — the
 * `AnswerRecap` renderer maps id -> label from `PROJECT_TYPES` /
 * `visionBuilderQuestions.ts`. Keeping label mapping out of `packages/shared`
 * avoids a shared -> apps/web import (see the schema note on `AnswerOptionSetId`).
 *
 * Pure / deterministic. No I/O. Safe in render and in batch loops.
 */

import type { AnswerSpec, ProjectMetadata } from '@ogden/shared';

export interface ResolvedAnswer {
  /** Whether the source data satisfies this item (drives auto-complete). */
  isAnswered: boolean;
  fieldType: AnswerSpec['fieldType'];
  optionSetId: AnswerSpec['optionSetId'];
  /**
   * Normalised raw string token(s) the renderer maps to labels:
   *  - single_select: `[id]`
   *  - multi_select : flattened ids (object-of-arrays like systemsInScope is flattened)
   *  - band         : one entry per axis, in `sourceField` order (e.g. [budget, timeline])
   *  - text         : `[prose]`
   *  - steward      : pre-formatted display strings ("Name <email>")
   */
  values: readonly string[];
}

/** Read a dotted path (e.g. `visionProfile.budgetRange`) out of an object. */
function getPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

/**
 * Normalise any stored value to a list of non-empty strings:
 *  - string      -> [string]
 *  - string[]    -> filtered
 *  - object map  -> flatten each value (handles `systemsInScope { food:[], ... }`)
 */
function toStringList(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(toStringList);
  }
  return [];
}

function describeSteward(value: unknown): string | null {
  if (value == null || typeof value !== 'object') return null;
  const s = value as { name?: unknown; email?: unknown };
  const name = typeof s.name === 'string' ? s.name.trim() : '';
  const email = typeof s.email === 'string' ? s.email.trim() : '';
  if (name && email) return `${name} <${email}>`;
  return name || email || null;
}

const EMPTY: readonly string[] = Object.freeze([]);

/**
 * Resolve a single `answerSpec` against project metadata. Returns
 * `isAnswered: false` with empty values when metadata is missing or the source
 * field(s) are empty, so callers get a stable, render-safe result.
 */
export function resolveAnswerSpec(
  metadata: ProjectMetadata | null | undefined,
  spec: AnswerSpec,
): ResolvedAnswer {
  const base: Omit<ResolvedAnswer, 'isAnswered' | 'values'> = {
    fieldType: spec.fieldType,
    optionSetId: spec.optionSetId,
  };

  if (!metadata) {
    return { ...base, isAnswered: false, values: EMPTY };
  }

  const paths = Array.isArray(spec.sourceField)
    ? spec.sourceField
    : [spec.sourceField];

  if (spec.fieldType === 'band') {
    // Each path is one axis; ALL axes must be present to count as answered.
    const axes = paths.map((p) => toStringList(getPath(metadata, p))[0] ?? '');
    const isAnswered = axes.length > 0 && axes.every((v) => v.length > 0);
    return { ...base, isAnswered, values: isAnswered ? axes : axes };
  }

  if (spec.fieldType === 'steward') {
    const out: string[] = [];
    for (const p of paths) {
      const node = getPath(metadata, p);
      if (Array.isArray(node)) {
        for (const entry of node) {
          const label = describeSteward(entry);
          if (label) out.push(label);
        }
      } else {
        const label = describeSteward(node);
        if (label) out.push(label);
      }
    }
    return { ...base, isAnswered: out.length > 0, values: out };
  }

  // single_select | multi_select | text — collect tokens across all paths.
  const values = paths.flatMap((p) => toStringList(getPath(metadata, p)));
  return { ...base, isAnswered: values.length > 0, values };
}
