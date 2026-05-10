/**
 * useModuleProjectTypeReferences — cross-check between the project-type
 * template checklist (`planProjectTypeChecklistStore`) and the universal
 * Plan module checklists (`planHowChecksStore`) + map artifacts.
 *
 * For a given Plan module, walks the steward's currently-ticked
 * project-type items, pulls each item's `relatedWork` declarations that
 * target this module, and reports:
 *   - `referencedBy` — count of ticked project-type items that name this
 *     module in their relatedWork
 *   - `openGaps`     — count of those items whose dependencies on this
 *     module are NOT all satisfied
 *
 * Per the 2026-05-09 cross-check decision: "chip while either gap exists"
 * — a relatedWork entry is only considered satisfied when **all** its
 * `indexes` are ticked in `planHowChecksStore` for this module AND
 * (when `requiresArtifacts` is true) the module's artifact-presence
 * selector returns true. Either gap keeps the entry — and therefore
 * the project-type item — counted as an open gap.
 *
 * The chip on the module's GuidanceCard fires when `openGaps > 0`.
 */

import { usePlanHowChecksStore } from '../../../store/planHowChecksStore.js';
import { usePlanProjectTypeChecklistStore } from '../../../store/planProjectTypeChecklistStore.js';
import {
  PLAN_PROJECT_TYPE_KEYS,
  PLAN_PROJECT_TYPE_TEMPLATES,
} from '../data/planProjectTypeTemplates.js';
import { usePlanModuleArtifactPresence } from '../data/planModuleArtifactPresence.js';
import type { PlanModule } from '../types.js';

export interface ModuleReferenceSummary {
  referencedBy: number;
  openGaps: number;
}

const EMPTY: ModuleReferenceSummary = { referencedBy: 0, openGaps: 0 };

export function useModuleProjectTypeReferences(
  module: PlanModule,
  projectId: string | null,
): ModuleReferenceSummary {
  const hasArtifacts = usePlanModuleArtifactPresence(module, projectId);

  const moduleHowChecks = usePlanHowChecksStore((s) =>
    projectId ? (s.byProject[projectId]?.[module] ?? null) : null,
  );

  const projectChecks = usePlanProjectTypeChecklistStore((s) =>
    projectId ? (s.byProject[projectId]?.checks ?? null) : null,
  );

  if (!projectId || !projectChecks) return EMPTY;

  let referencedBy = 0;
  let openGaps = 0;

  for (const typeKey of PLAN_PROJECT_TYPE_KEYS) {
    const ticked = projectChecks[typeKey];
    if (!ticked || ticked.length === 0) continue;

    const items = PLAN_PROJECT_TYPE_TEMPLATES[typeKey].items;
    for (const itemIdx of ticked) {
      const item = items[itemIdx];
      if (!item) continue;

      const refs = item.relatedWork.filter((r) => r.module === module);
      if (refs.length === 0) continue;

      referencedBy += 1;

      const allSatisfied = refs.every((r) => {
        const ticks = moduleHowChecks ?? [];
        const allHowTicked =
          r.indexes.length === 0 || r.indexes.every((idx) => ticks.includes(idx));
        const artifactsOk = !r.requiresArtifacts || hasArtifacts;
        return allHowTicked && artifactsOk;
      });

      if (!allSatisfied) openGaps += 1;
    }
  }

  return referencedBy === 0 ? EMPTY : { referencedBy, openGaps };
}
