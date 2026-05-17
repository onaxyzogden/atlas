# P2 Backlog — Pre-Live-Testing Hardening Pass (2026-05-16)

## Summary
The 2026-05-16 pre-live-testing hardening pass fixed all P0/P1 testing-blockers
(see [ADR — multi-device bundle escape hatch](../decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch.md)
and the [7-stage retirement ADR](../decisions/2026-05-16-atlas-7-stage-lifecycle-retirement.md)).
These P2 items were **deliberately catalogued, not executed** — they are
polish/debt that does not block external multi-device testing. Recorded here
so they are not lost.

## Items

1. **Manifest `stub`-vs-reality status semantics.** `concepts/feature-manifest.md`
   §18 (and peers) mark features `stub` that are in fact shipped/wired, and
   vice versa (the Matrix-Toggles mislabel was one instance, fixed this pass via
   the `matrixTogglesStore.ts` header). Sweep the manifest for status drift; the
   manifest is a stated source-of-truth so drift misleads future scoping.

2. **Low-confidence / `citation:null` regional cost rows.** The financial model
   carries cost rows with `citation: null` or low confidence. Not wrong, but
   should be surfaced as estimates in-UI and/or backfilled with sources
   (parallels the MILOS inline-refs ratchet discipline).

3. **Scoring-dashboard `caveats[]` truncation.** The scoring dashboard truncates
   `caveats[]`; long caveat lists are silently cut. Either paginate/expand or
   state "+N more".

4. **IGRAC CC-BY vs CC-BY-NC licence contradiction.** The Phase-8 external-data
   ADR contradicts itself on the IGRAC groundwater licence. Already flagged in
   [external-data-sources.md](external-data-sources.md); out of v3 scope
   (Phase-8 deferred) but must be resolved before that data ships.

5. **New-store migration hardening — `regenerationPlanStore` v1.** Its `migrate`
   is a v1 stub. **Correction to the original plan's P2 note:** it claimed this
   store is "not UI-mounted, so no tester data at risk." Verified false —
   `RegenerationPlanCard` *is* lazy-mounted in `PlanModuleSlideUp`
   (`plan-livestock-regeneration` → `../../features/livestock/RegenerationPlanCard`),
   so a tester *can* author regen plans. Risk is still low for a single fresh
   build (no cross-build migration in the test window — see plan assumption),
   but the stub `migrate` should be hardened (defensive defaults per key, like
   `matrixTogglesStore`) **before** testers upgrade across builds. Re-classify
   to P1 if the single-build assumption breaks.

6. **Map-overlay chrome migration.** Deferred map-overlay chrome migration
   (legend/control restyle) — cosmetic, no data risk.

7. **Focus-trap audit on `SlideUpPanel` / `RailPanelShell`.** The shared
   `_shared/moduleNav/ModuleSlideUp` traps focus via `useFocusTrap`; audit the
   other panel shells (`SlideUpPanel`, `RailPanelShell`) for the same so
   keyboard users can't tab out of an open modal.

## Constraints
- These are **not** launch blockers for the testing window; do not gate testing
  on them.
- Item 5's classification is conditional on the "single fresh build" assumption
  in the hardening plan — revisit if testers upgrade across builds.
- No-deletion policy still applies to any cleanup these spawn.
