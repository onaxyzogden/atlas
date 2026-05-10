/**
 * Shared shim — re-exports the canonical Plan-stage 3D GLB layer
 * (`apps/web/src/v3/plan/canvas/layers/DesignElementGlbLayer.tsx`) from
 * the unified Built-Environment shared location introduced by ADR
 * `2026-05-10-atlas-built-environment-unification.md`.
 *
 * Phase 4.1 (this commit): establishes the shared import path so Phase
 * 4.2's Observe mounts can subscribe alongside Plan without churn.
 * Phase 4.1b will physically lift the implementation here and decouple
 * it from Plan-specific types (`PlanView`, `phaseIndex`); until then
 * Plan retains ownership and Observe will need to opt into Plan's
 * filtering semantics.
 */
export { default } from '../../plan/canvas/layers/DesignElementGlbLayer.js';
