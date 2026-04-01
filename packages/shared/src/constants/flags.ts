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
} as const;
