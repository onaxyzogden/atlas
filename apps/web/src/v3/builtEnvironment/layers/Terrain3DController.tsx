/**
 * Shared shim — re-exports the canonical Plan-stage Terrain3DController
 * (`apps/web/src/v3/plan/canvas/Terrain3DController.tsx`) from the
 * unified Built-Environment shared location. The controller is already
 * stage-agnostic (only depends on the MapLibre map), so Observe can
 * import it through this path without code changes once Phase 4.2
 * mounts a 3D toggle in the Observe rail.
 */
export { default } from '../../plan/canvas/Terrain3DController.js';
