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
  // Phase 2 of Full syncService Coverage: the generic versioned-blob sync
  // path. Disabled by default — push-only shadow first, then phased per the
  // execution plan. See wiki/decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch.md.
  SYNC_STATE_BLOBS: process.env['FEATURE_SYNC_STATE_BLOBS'] === 'true',
  // Clean-slate sample pipeline (2026-07). SEED_SAMPLES gates the legacy
  // builtin/demo sample seeds (351 House, MTC, Homestead, Three Streams, Apricot
  // Lane). Default OFF so "My Projects" starts empty — a genuine clean slate. The
  // old seed code is preserved, not deleted, so it stays available as a reference
  // (feedback_no_deletion); flip this on to restore the legacy fixtures.
  // H3 (deep-audit 2026-07-03): the offline demo's guest tour opens against a
  // clone of the builtin homestead sample, so a FEATURE_DEMO_OFFLINE build must
  // never evaluate this OFF — otherwise the first demo refresh after a
  // SEED_SAMPLES gate lands ships an empty portfolio and a hollow tour.
  SEED_SAMPLES:
    process.env['FEATURE_SEED_SAMPLES'] === 'true' ||
    process.env['FEATURE_DEMO_OFFLINE'] === 'true',
  // Gates the single user-authored replacement sample (SAMPLE_SEED_PROJECT_ID).
  // Dormant until the user authors + captures it; flipped on at handoff. Kept
  // independent from SEED_SAMPLES so "legacy retired" and "authored sample on"
  // can both be true at the same time.
  SEED_AUTHORED_SAMPLE: process.env['FEATURE_SEED_AUTHORED_SAMPLE'] === 'true',
  // (BUILT_ENV_V2 retired 2026-05-12 — V2 is now the unconditional path.
  //  The legacy V1 stores remain on disk as in-memory facades projecting
  //  V2 state into V1 shape; their deletion is the next milestone in
  //  wiki/decisions/2026-05-10-atlas-built-environment-unification.md.)
} as const;
