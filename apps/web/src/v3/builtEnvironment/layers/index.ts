/**
 * Shared Built-Environment layer barrel — single import surface for
 * Plan + Observe consumers of the 3D + extrusion + terrain machinery.
 * Per ADR `2026-05-10-atlas-built-environment-unification.md` Phase 4.
 *
 * The implementations still live under `v3/plan/canvas/` for now;
 * Phase 4.1b will physically lift them and decouple from Plan-specific
 * filtering (`PlanView`, `phaseIndex`).
 */
export { default as DesignElementGlbLayer } from './DesignElementGlbLayer.js';
export { default as DesignElementExtrusionLayer } from './DesignElementExtrusionLayer.js';
export { default as Terrain3DController } from './Terrain3DController.js';
