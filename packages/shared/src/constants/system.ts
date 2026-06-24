// system.ts
// Sentinel UUIDs for the builtin "sample project" rolled out in
// migration 017_builtin_sample_project.sql.
//
// The sample project is a system-owned, read-only Atlas project that every
// authenticated user sees alongside their own projects. It demonstrates
// every detail surface (parcel boundary, layers, design features, regen
// events, relationships) so new users have a fully populated reference to
// explore and duplicate.
//
// Both ids are pinned constants because the migration inserts them
// literally and the API + frontend both compare against them to gate
// read-only affordances. Changing either value requires writing a follow-up
// migration that updates the row.

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000a71a';
export const SYSTEM_SAMPLE_PROJECT_ID = '00000000-0000-0000-0000-0000005a3791';

// Three Streams Farm — Apricot-Lane showcase project. Seeded by migrations
// 029 + 030 (see wiki/entities/three-streams-farm.md for canon and
// wiki/log/2026-05-20-atlas-phase-2-three-streams-demo-seed.md for the
// Phase-2 seed work). Frontend uses this sentinel to detect the project
// and run its Goal-Compass/nursery/ecology client-side seed once per
// browser (apps/web/src/dev/seedThreeStreamsFarm.ts).
export const THREE_STREAMS_PROJECT_ID = '00000000-0000-0000-0000-000000357320';

// Apricot Lane Showcase — 200-acre degraded-citrus → polyculture fixture
// (Ventura County, CA). Seeded by migration 032_builtin_apricot_lane_citrus.sql
// to back the Validation Protocol assumption A2 fixture (Phase E.1). Frontend
// uses this sentinel to detect the project and run its client-side seed once
// per browser (apps/web/src/dev/seedApricotLane.ts).
export const APRICOT_LANE_PROJECT_ID = '00000000-0000-0000-0000-000000a91c01';

// Homestead — Atlas Sample. A fully-worked, fully-curated homestead fixture
// for the offline demo (FEATURE_DEMO_OFFLINE → try.atlas.ogden.ag). Unlike the
// server-backed showcases above, this one ships entirely client-side: the
// project row + metadata + drawn design cascade to the demo clone, and a
// client seeder (apps/web/src/dev/seedHomesteadSample.ts) writes the complete
// Plan/Act/threshold journey onto the clone. First of a per-type series; the
// `f00d5ead` tail ("food-stead") keeps it mnemonic and distinct from the four
// ids above. Pinned because the seeders compare against it.
export const HOMESTEAD_SAMPLE_PROJECT_ID = '00000000-0000-0000-0000-0000f00d5ead';
