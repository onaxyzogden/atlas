# 2026-05-25 — Stage Zero Vision Builder (name-only intake → questionnaire → Vision Profile)

**Branch.** `feat/atlas-permaculture` (`2d200759`, `50bead8b`, `e256fd22`, `520a9f9b`).

Replaced the five-step property wizard with a structured Stage Zero
questionnaire that produces a machine-readable Vision Profile (per the
`OLOS Stage Zero Vision Builder.md` spec). Three steward-confirmed scope
calls held throughout: **(1)** boundary/map moves to OBSERVE — intake
captures only a name; **(2)** module activation is **preview-only** for
the MVP (the "What this will activate in the Plan Stage" strip is shown
but does not yet gate which Plan/Act modules render); **(3)** the full
~15-step question set ships, including conditionals (livestock gated by
`hasLivestockInScope`, residential by `willLiveOnLand`).

Four phases: **P1** schema + persistence (Vision Profile on
`project.metadata.visionProfile` via `ProjectMetadata` `.passthrough()`;
localStorage key `ogden-projects`); **P2** config-driven engine
(`visionBuilderQuestions.ts` catalog with `kind`/`profilePath`/
`visibleWhen`, `useVisionBuilder.ts` cursor+derived-progress,
`deriveActivatedModules.ts`); **P3** mockup-parity UI (self-contained
`--vb-*` dark/gold palette, full-screen takeover `.page` fixed inset-0
z-600 above AppShell z-501, stage spine, Q N-of-M + progress, option-card
grid, allow-multiple, collapsible upcoming, live profile sidebar,
activation strip); **P4** flow integration (`NewProjectPage` → name-only
create → `/v3/project/$projectId/stage-zero`, preserving
`?prefillTemplate`/`?orgId`/`?fullSetup`; OBSERVE `MapToolbar` gains a
KML/KMZ/GeoJSON boundary **import** button → `parseGeoFile` →
`updateProject` persists FC + `parcelAcreage`).

Typecheck-repair follow-up (`520a9f9b`): the P4 rewrite dropped the
`WizardData` export the legacy wizard's `types.ts` imported, and omitted
`country`/`units` that `CreateProjectInput` requires (`z.infer` treats
`.default()` fields as required) — fixed by relocating `WizardData` into
the wizard package (legacy `Step*` files preserved per the no-deletion
rule) and seeding the schema's `US`/`metric` defaults at create time.

**Verified.** P3 browser: "Regenerative Farm" populated sidebar +
activation strip; "Goats" grew the total 28→32 (conditional reveal) +
added "Livestock & Subdivision"; reload resumed cursor with rehydrated
state. P4 e2e: create → stage-zero (Q1 of 28); import persists FC +
acreage 792.13 ha on a non-builtin project (builtin `mtc` carves out all
but parcelBoundary/hasParcelBoundary/metadata by design). `apps/web`
`npm run typecheck` exit 0 (8 GB-heap node script; plain `tsc` OOMs).

ADR: [[decisions/2026-05-25-atlas-stage-zero-vision-builder]]. Related:
[[decisions/2026-05-24-atlas-true-north-fit-gate-stage-0]] (shares the
"Stage Zero" framing; owns the property-fit decision rather than the
Vision Profile). **Next:** real module gating from the Vision Profile
(deferred from MVP).
