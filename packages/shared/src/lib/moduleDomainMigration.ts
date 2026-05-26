// moduleDomainMigration.ts
//
// Pure, framework-agnostic utility that remaps a `byProject` localStorage
// blob from legacy module ids (ObserveModule / PlanModule / ActModule) to
// UniversalDomain ids. Designed to be wired into Zustand `persist.migrate`
// callbacks.
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
// list and canonical ordering):
//   Plan -> access-circulation:    [dynamic-layering, zone-circulation]
//   Plan -> built-infrastructure:  [structures-subsystems, machinery]
//   Plan -> ecology:               [regeneration-monitor, habitat-allocation, biodiversity-monitor]
//   Act  -> built-infrastructure:  [build, maintain]
//   Act  -> monitoring-records:    [tracker, review]
//
// Two modes:
//
//   1. Default (no `mergeFn` supplied) — naive last-wins + warn on
//      collision. Safe for Observe (which is collision-free). LOSSY for
//      Plan and Act if any colliding modules carry persisted data.
//
//   2. With `mergeFn` — when a collision occurs the colliding values are
//      collected (in canonical insertion order — the same order as the
//      maps in moduleDomainMap.ts, which is the order locked in tests)
//      and passed to mergeFn, whose return value is stored under the
//      target domain. Step 3 of the universal-domain refactor uses this
//      with a concat-with-offset strategy for compass evidence maps and
//      how-checks index arrays so all evidence/check indices survive the
//      collapse.

import type { LegacyStage } from './moduleDomainMap.js';
import {
  mapLegacyModuleId,
  OBSERVE_MODULE_TO_DOMAIN,
  PLAN_MODULE_TO_DOMAIN,
  ACT_MODULE_TO_DOMAIN,
} from './moduleDomainMap.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

/**
 * Canonical legacy-module-id ordering per stage — the insertion order of
 * each `*_MODULE_TO_DOMAIN` map in moduleDomainMap.ts. Used to sort
 * collision-merged parts deterministically irrespective of the persisted
 * blob's iteration order.
 */
const CANONICAL_ORDER: Record<LegacyStage, ReadonlyArray<string>> = {
  observe: Object.keys(OBSERVE_MODULE_TO_DOMAIN),
  plan: Object.keys(PLAN_MODULE_TO_DOMAIN),
  act: Object.keys(ACT_MODULE_TO_DOMAIN),
};

function canonicalIndex(stage: LegacyStage, moduleId: string): number {
  const i = CANONICAL_ORDER[stage].indexOf(moduleId);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

interface ByProjectModuleBlob<T> {
  byProject: Record<string, Record<string, T>>;
}

interface ByProjectDomainBlob<T> {
  byProject: Record<string, Partial<Record<UniversalDomain, T>>>;
}

/**
 * Merge fn signature for collision handling. Called only when 2+ legacy
 * module ids collapse to the same domain within a single project. `parts`
 * is supplied in canonical insertion order (matching the `*_MODULE_TO_DOMAIN`
 * map order in moduleDomainMap.ts).
 */
export type MergeFn<T> = (
  domain: UniversalDomain,
  parts: ReadonlyArray<{ moduleId: string; value: T }>,
) => T;

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
 * console.warn for unknown keys (and collisions when no mergeFn is supplied).
 *
 * @param persisted the raw persisted blob from Zustand `persist.migrate`.
 * @param stage which legacy stage's module ids to expect on the inner axis.
 * @param mergeFn optional collision-merge strategy. When supplied, multiple
 *   legacy module ids that map to the same domain inside one project have
 *   their values collected (in canonical order) and merged via mergeFn.
 *   When omitted, the last-iterated value wins and a console.warn is
 *   emitted per collision (slice-1 behaviour).
 * @returns the remapped blob, or `null` if the input shape is not
 *   `{ byProject: Record<string, Record<string, T>> }`.
 */
export function migrateByProjectModuleKeys<T>(
  persisted: unknown,
  stage: LegacyStage,
  mergeFn?: MergeFn<T>,
): ByProjectDomainBlob<T> | null {
  if (!isByProjectModuleBlob(persisted)) return null;

  const out: ByProjectDomainBlob<T> = { byProject: {} };

  for (const [projectId, moduleMap] of Object.entries(persisted.byProject)) {
    if (moduleMap === null || typeof moduleMap !== 'object') continue;

    if (mergeFn) {
      // Collision-merging path: collect all colliding parts per domain
      // before writing.
      const groups = new Map<UniversalDomain, Array<{ moduleId: string; value: T }>>();

      for (const [moduleId, value] of Object.entries(moduleMap)) {
        const domain = mapLegacyModuleId(stage, moduleId);
        if (domain === null) {
          // eslint-disable-next-line no-console
          console.warn(
            `[moduleDomainMigration] dropping unknown ${stage} module id "${moduleId}" for project ${projectId}`,
          );
          continue;
        }
        const arr = groups.get(domain) ?? [];
        arr.push({ moduleId, value: value as T });
        groups.set(domain, arr);
      }

      const domainMap: Partial<Record<UniversalDomain, T>> = {};
      for (const [domain, parts] of groups) {
        if (parts.length === 1) {
          domainMap[domain] = parts[0]!.value;
        } else {
          // Sort by canonical order so the merge result is independent of
          // the persisted blob's iteration order.
          const ordered = [...parts].sort(
            (a, b) => canonicalIndex(stage, a.moduleId) - canonicalIndex(stage, b.moduleId),
          );
          domainMap[domain] = mergeFn(domain, ordered);
        }
      }
      out.byProject[projectId] = domainMap;
    } else {
      // Naive last-wins path (slice-1 behaviour).
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
  }

  return out;
}
