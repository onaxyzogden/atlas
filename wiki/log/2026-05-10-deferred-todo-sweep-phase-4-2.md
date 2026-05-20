# 2026-05-10 — Deferred-TODO sweep (Phase 4.2)


**Context.** Phase 4.2 of the pre-test friction audit
([wiki/decisions/2026-05-09-atlas-pre-test-audit.md]) called for a
disposition pass on 5 deferred TODOs: guild centroid map tool,
succession timeline slider, GAEZ scenario picker, public-portal
cache + rate-limit gaps, hydrology panel `buildLive()`/`buildMetrics()`
stubs. Gate: "promote to ADRs or close as won't-do."

**Change.**

- **Hydrology stubs closed (refactor).** Deleted the two no-op
  `buildLive()` / `buildMetrics()` helpers in
  `apps/web/src/components/panels/HydrologyRightPanel.tsx` that
  returned `null as unknown as <shape>` purely so
  `ReturnType<typeof ...>` would resolve for prop types. Extracted
  the inline shape into a named `type HydrologyLive` and aliased
  `type HydrologyMetrics = ReturnType<typeof computeHydrologyMetrics>`;
  both `RealtimePanel` / `DesignPanel` prop sites now reference the
  named types directly. Zero runtime behavior change.
- **Four items promoted with cross-references.** Each call-site now
  carries a pointer to
  [wiki/decisions/2026-05-10-deferred-todo-sweep.md]:
  - `apps/web/src/v3/plan/draw/tools/GuildTool.tsx` (guild centroid UV)
  - `apps/web/src/features/map/GaezOverlay.tsx:442` (GAEZ scenario)
  - `apps/api/src/routes/portal/public.ts` (portal cache + rate-limit;
    gate re-confirmed as "before first public URL")
  - Item 2 (succession slider) already has
    [wiki/decisions/2026-04-28-temporal-slider-succession-modeling.md]
    as its source ADR — no new entry needed.

**Verification.** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` → exit 0.

**Deferred.** Three items remain *intentionally* open with explicit
gates: guild centroid tool (before parcel-spatial guild analytics
ship), GAEZ scenario picker (before climate overlays surface
publicly), portal cache/rate-limit (before first public share URL).
Audit Phase 4 is now closed end-to-end.
