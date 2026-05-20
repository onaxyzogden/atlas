# 2026-05-16 — P0 trust & integrity: no confident zeros (acreage + Water)


Execution session against the approved plan
(`create-a-regen-farm-melodic-bird.md`). Closed the run-2 walkthrough
(#77/#78) defect where a naive user finished a regen-farm design and was
shown "ON, CA · 0 ha · Supported · 67/100 · 0 blocking issues". Two
independent root causes fixed (the walkthrough's "0-ha is the root of the
Water balance" premise was wrong — surfaced honestly, user re-scoped):
(1) false-confidence Report — `adaptLocalProject.ts` silently `null→0`,
hardcoded `blockers:[]`, verdict fell through to "Supported"; (2) separate
— Water `catchmentYieldM3` reads each node's manual `areaM2`, unset →
silent `0 m³` collapsing the balance. User-approved scope via
AskUserQuestion: include Water + hard-degrade the verdict.

Shipped: new single-decision module `v3/data/parcelIntegrity.ts`
(`isParcelAreaValid`, `formatLocationArea`, explicit
`INTEGRITY_BLOCKER`/`INSUFFICIENT_DATA_VERDICT` deliberately not routed
through `adaptVerdict`/`VERDICT_TABLE`); `adaptLocalProject.ts` as the sole
guard seam (scorer input line left unchanged — override supersedes);
`ProjectLocation.areaKnown?`; 5 display surfaces share
`formatLocationArea`. Water: `waterMath.ts` +`DEFAULT_AREA_M2`
/`GROUND_SURFACES`/`isCatchmentAreaInvalid`/`incompleteCatchments`
(existing yield guard kept as safety net); `lib/geo.ts` +`parcelAreaM2`
(`parcelAcreage` stays canonical, untouched); Network/Catchments cards
gate the aggregate ("incomplete: N catchment(s)…", never silent `0.0 m³`),
surface-aware non-zero defaults, ground-only one-click parcel-area; no
`waterSystemsStore` migration.

Verification: `corepack pnpm --filter @ogden/web typecheck` (8 GB heap)
exit 0 (`lint`=`tsc --noEmit` equivalent — only OOMs at default heap).
Offline DOM-text asserts via real Vite→store→adapter→pages
(`preview_screenshot` timed out twice on the WebGL map canvas — disclosed
not faked, per project convention): Case A (null) / Case B (0) → "Area not
set" + blocked "Insufficient Data" verdict (score 0) + 1 blocker; Case C
(valid 12 ha) byte-for-byte unchanged ("49 Conditional", 0 blockers);
Water zero-area → "incomplete: 1 catchment has no area" not 0.0 m³,
surface defaults (roof 80 / pasture 1000), ground-only parcel-button
("≈ 112939 m²" for pasture, absent for roof), all-valid regression real
"82.6 m³ · 82.6 kL". Injected localStorage fixtures cleaned afterward;
baseline walkthrough docs left byte-for-byte unmodified. No commits (not
requested). New ADR `decisions/2026-05-16-atlas-parcel-integrity-guard.md`
+ index pointer + `entities/web-app.md` Current State updated. Deferred
(out of scope): backend `ST_GeomFromGeoJSON(FeatureCollection)`→0 +
`applyServerAcreage` overwrite (online-only).
