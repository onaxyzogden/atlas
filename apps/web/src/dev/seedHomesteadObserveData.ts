/**
 * seedHomesteadObserveData — Observe-stage (Stage 1, Roots & Diagnosis) fixture
 * for the Homestead — Atlas Sample (offline demo).
 *
 * The homestead sample ships its OWN Observe substrate rather than reusing the
 * shared `seedBuiltinObserveData` (the 351-House fixture). That keeps the two
 * samples honestly distinct: the homestead's site narrative, regional context,
 * hazards/sectors, topography, soils, ecology, SWOT, and Observe data-points
 * must describe the operator's ACTUAL chosen property — region, climate,
 * hardiness, terrain, soils — so the parcel, the drawn permaculture zones 0–5,
 * and the Observe cards are internally coherent.
 *
 * STATUS — Phase 4 dependency (deliberately a no-op for now).
 * The location-specific facts are authored in Phase 4, AFTER the operator draws
 * the boundary + zones on a real site and the geometry is captured (see
 * `seedHomesteadDesign.ts` + `HOMESTEAD_SAMPLE_BOUNDARY` in projectStore.ts).
 * Until that capture lands there is no real site to describe, so this seeder
 * does nothing: the homestead clone simply starts with an empty Observe stage
 * (honestly "not yet surveyed") rather than wearing another property's content.
 *
 * When Phase 4 lands, flesh this out by mirroring the module structure of
 * `apps/web/src/data/builtinSampleObserveData.ts` — vision/members, regional,
 * hazards+sectors, topography, soils, ecology, SWOT, then
 * `seedBuiltinObserveDataPoints`-style projection into the data-point store —
 * but with homestead-specific, covenant-aligned content geo-referenced inside
 * the captured boundary.
 *
 * Signature matches `seedBuiltinObserveData(localProjectId)` so the call site in
 * `demoSession.ts` (the homestead branch of the clone loop) is a drop-in.
 * Idempotent by construction (a no-op today; the Phase-4 fill must keep that
 * property via per-store id-equality checks, like the shared seeder).
 */

export function seedHomesteadObserveData(localProjectId: string): void {
  // Phase-4 dependency: no location-specific Observe facts to seed until the
  // operator's site geometry is captured. Intentionally a no-op — see the file
  // header. `localProjectId` is the visitor's clone id (not the canonical
  // builtin) and will key every seeded entry once this is authored.
  void localProjectId;
}
