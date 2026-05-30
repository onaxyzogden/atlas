// sourceTag — derives the Universal / Primary / Secondary source tag shown on
// objective surfaces (cards, header) per Plan Navigation Spec v1.1 section 5.
//
// The data already exists on every resolved objective: `source` (which layer
// emitted it) and `sourceTypeId` (the contributing project type). Objectives
// from the legacy static skeleton leave `source` unset and are read as
// `universal`, so the tag is always derivable without a schema change.
//
// Pure + presentational — no React, no store. Styling lives in the consuming
// component's .module.css via the returned `kind` (data attribute).

import type { PlanStratumObjective } from '@ogden/shared';
import { findProjectType } from '@ogden/shared';

export type SourceTagKind = 'universal' | 'primary' | 'secondary';

export interface SourceTag {
  kind: SourceTagKind;
  label: string;
}

/**
 * Resolve the source tag for an objective. Unset `source` reads as universal
 * (legacy skeleton). Secondary objectives are labelled with the contributing
 * type name, e.g. "Secondary - Silvopasture"; the separator is an ASCII hyphen.
 */
export function getSourceTag(objective: PlanStratumObjective): SourceTag {
  const kind: SourceTagKind = objective.source ?? 'universal';

  if (kind === 'secondary') {
    const typeLabel =
      (objective.sourceTypeId
        ? findProjectType(objective.sourceTypeId)?.label
        : undefined) ??
      objective.sourceTypeId ??
      'Secondary type';
    return { kind, label: `Secondary - ${typeLabel}` };
  }

  return { kind, label: kind === 'primary' ? 'Primary' : 'Universal' };
}
