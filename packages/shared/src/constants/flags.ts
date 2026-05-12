// Feature flags — Phase 2+ features are disabled by default.
// Set env vars to enable during development of future phases.
export const FLAGS = {
  TERRAIN_3D: process.env['FEATURE_TERRAIN_3D'] === 'true',
  HYDROLOGY_TOOLS: process.env['FEATURE_HYDROLOGY'] === 'true',
  LIVESTOCK_DESIGN: process.env['FEATURE_LIVESTOCK'] === 'true',
  AI_ANALYSIS: process.env['FEATURE_AI'] === 'true',
  MULTI_USER: process.env['FEATURE_MULTI_USER'] === 'true',
  OFFLINE_MODE: process.env['FEATURE_OFFLINE'] === 'true',
  SCENARIO_MODELING: process.env['FEATURE_SCENARIOS'] === 'true',
  PUBLIC_PORTAL: process.env['FEATURE_PUBLIC_PORTAL'] === 'true',
  // Phase 2 of the Needs & Yields rollout: canvas socket/edge UI behind a
  // flag until the interaction model is validated. See ADR
  // wiki/decisions/2026-04-28-needs-yields-dependency-graph.md.
  RELATIONSHIPS: process.env['FEATURE_RELATIONSHIPS'] === 'true',
  // (BUILT_ENV_V2 retired 2026-05-12 — V2 is now the unconditional path.
  //  The legacy V1 stores remain on disk as in-memory facades projecting
  //  V2 state into V1 shape; their deletion is the next milestone in
  //  wiki/decisions/2026-05-10-atlas-built-environment-unification.md.)
} as const;
