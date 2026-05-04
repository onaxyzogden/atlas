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
