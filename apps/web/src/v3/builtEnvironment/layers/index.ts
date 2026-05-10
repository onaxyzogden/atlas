/**
 * Shared Built-Environment layer barrel — single import surface for
 * Plan + Observe consumers of the 3D + extrusion + terrain machinery.
 * Per ADR `2026-05-10-atlas-built-environment-unification.md` Phase 4.
 *
 * Phase 4.1b (this commit): the implementations now physically live
 * here (no longer Plan-coupled shims). Each layer reads directly from
 * `useBuiltEnvironmentStoreV2` and accepts a `stateFilter` prop so
 * either stage can scope the slice it cares about.
 */
export { default as DesignElementGlbLayer } from './DesignElementGlbLayer.js';
export { default as DesignElementExtrusionLayer } from './DesignElementExtrusionLayer.js';
export { default as Terrain3DController } from './Terrain3DController.js';
export type { StateFilter } from './DesignElementExtrusionLayer.js';
