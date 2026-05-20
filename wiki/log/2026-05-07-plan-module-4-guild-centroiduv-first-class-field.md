# 2026-05-07 — Plan Module 4 · Guild centroidUv first-class field


Module 4 (Plants) follow-up landed (parent: `wiki/decisions/2026-05-07-atlas-plan-plants-scholar-build-fresh.md`). `Guild` interface in `polycultureStore.ts` gains optional `centroidUv?: [number, number]` — the spatial centroid the steward placed on the parcel diagram is now a first-class field rather than a `notes:"centroidUv:u,v"` regex hack. `GuildSpatialBuilderCard.commit()` writes the field directly; the saved-guild renderer prefers `g.centroidUv` and falls back to the legacy notes regex so pre-migration entries still draw on the parcel SVG. Additive optional field — no persist-version bump. Typecheck clean (only the unrelated `elementCatalog.ts` WIP error remains).
