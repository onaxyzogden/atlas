// moduleDomainMigration.ts
//
// Pure, framework-agnostic utility that remaps a `byProject` localStorage
// blob from legacy module ids (ObserveModule / PlanModule / ActModule) to
// UniversalDomain ids. Designed to be wired into Zustand `persist.migrate`
// callbacks in a future cutover slice — NOT invoked at runtime in slice 1.
//
// Shape contract (the common shape of the 6 module-keyed persist stores —
// observeCompassStore, planCompassStore, actCompassStore plus the matching
// howChecks stores):
//
//   { byProject: Record<ProjectId, Record<LegacyModuleId, T>> }
//
// On migration we collapse the inner ModuleId axis from the 7 / 15 / 8
// legacy ids to the 16 UniversalDomain ids by mapLegacyModuleId. Unknown
// module ids are dropped with a console.warn. Shape mismatches return null
// so the caller (Zustand) falls back to default state — same posture as the
// v1->v2 migration already in apps/web/src/store/closedLoopStore.ts.
//
// Collision behaviour: collisions are REAL within Plan (15->11) and Act
// (8->6). Known collisions (see universalDomain.test.ts for the exhaustive
// list):
//   Plan -> access-circulation:    dynamic-layering, zone-circulation
//   Plan -> built-infrastructure:  structures-subsystems, machinery
//   Plan -> ecology:               regeneration-monitor, habitat-allocation, biodiversity-monitor
//   Act  -> built-infrastructure:  build, maintain
//   Act  -> monitoring-records:    tracker, review
// This naive utility warns + last-wins on collision, which IS lossy. Step 3
// (the cutover that wires this into Zustand persist.migrate) MUST supply a
// merge strategy per store — typically by deep-merging the inner T or by
// concatenating arrays — when the colliding stage is Plan or Act. Observe
// is collision-free and can use this utility directly.

import type { LegacyStage } from './moduleDomainMap.js';
import { mapLegacyModuleId } from './moduleDomainMap.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

interface ByProjectModuleBlob<T> {
  byProject: Record<string, Record<string, T>>;
}

interface ByProjectDomainBlob<T> {
  byProject: Record<string, Partial<Record<UniversalDomain, T>>>;
}

function isByProjectModuleBlob(value: unknown): value is ByProjectModuleBlob<unknown> {
  if (value === null || typeof value !== 'object') return false;
  const candidate = (value as { byProject?: unknown }).byProject;
  if (candidate === null || typeof candidate !== 'object') return false;
  // We do not deep-inspect every inner value — the migration is shape-light
  // by design (one map of maps). Inner T is preserved opaque.
  return true;
}

/**
 * Remap a `byProject` blob's inner ModuleId axis from legacy module ids to
 * UniversalDomain ids. Pure, deterministic, side-effects only via
 * console.warn for unknown keys / collisions.
 *
 * @returns the remapped blob, or `null` if the input shape is not
 * `{ byProject: Record<string, Record<string, T>> }`.
 */
export function migrateByProjectModuleKeys<T>(
  persisted: unknown,
  stage: LegacyStage,
): ByProjectDomainBlob<T> | null {
  if (!isByProjectModuleBlob(persisted)) return null;

  const out: ByProjectDomainBlob<T> = { byProject: {} };

  for (const [projectId, moduleMap] of Object.entries(persisted.byProject)) {
    if (moduleMap === null || typeof moduleMap !== 'object') continue;
    const domainMap: Partial<Record<UniversalDomain, T>> = {};

    for (const [moduleId, value] of Object.entries(moduleMap)) {
      const domain = mapLegacyModuleId(stage, moduleId);
      if (domain === null) {
        // eslint-disable-next-line no-console
        console.warn(
          `[moduleDomainMigration] dropping unknown ${stage} module id "${moduleId}" for project ${projectId}`,
        );
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(domainMap, domain)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[moduleDomainMigration] domain collision on "${domain}" for project ${projectId} (stage ${stage}); later module id "${moduleId}" wins`,
        );
      }
      domainMap[domain] = value as T;
    }

    out.byProject[projectId] = domainMap;
  }

  return out;
}
