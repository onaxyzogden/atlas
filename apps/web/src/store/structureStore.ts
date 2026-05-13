/**
 * structureStore — type-only re-export module (facade body deleted
 * 2026-05-12 per the BE V2 unification ADR
 * `wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
 *
 * History:
 *
 *  - V1 (pre-2026-05-10): full Zustand + zundo + persist store on the
 *    `'ogden-structures'` localStorage key, holding the canonical
 *    `Structure[]` array for the Plan stage.
 *
 *  - 2026-05-10 unification: storage migrated to `builtEnvironmentStoreV2`
 *    (single `entities[]` discriminated by `state: 'existing' | 'proposed'`).
 *    This module became a thin V2-derived facade re-projecting on every
 *    subscription tick.
 *
 *  - 2026-05-12 Phase 4 sweep: all 144 facade consumers migrated to the
 *    new selector library in `builtEnvironmentSelectors.ts`
 *    (`useAllStructures` / `useStructuresForProject` / `addStructure` / …).
 *    `placementMode` extracted to `structurePlacementStore.ts`.
 *
 *  - 2026-05-12 Phase 5 (this commit): facade body deleted. This file is
 *    kept only to re-export the `Structure` and `StructureType` types
 *    from a familiar import path so ~65 consumers that imported the
 *    types from here continue to compile without a path rewrite. Both
 *    types are pure re-exports of canonical definitions in `@ogden/shared`.
 *
 *  - Follow-up: at the next opportunistic touch, retarget all
 *    `import type { Structure, StructureType } from '.../structureStore.js'`
 *    sites at `@ogden/shared` and delete this file outright.
 */

export type { ProjectedStructure as Structure, StructureType } from '@ogden/shared';
