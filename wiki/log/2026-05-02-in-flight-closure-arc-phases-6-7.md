# 2026-05-02 — In-flight closure arc (Phases 6 + 7)


Closed the bulk of `.claude/plans/few-concerns-shiny-quokka.md` across
an autonomous-loop session arc. Phases 0 (interactive verification) and
8 (ADR-gated future work) remain open by design.

**Phase 6 — V3 page-level CTA wiring** (commits `6658ff1`, `ff7ba5c`,
`2d961f5`, `d32186a`, `c47eed5`, `6dc545a`):

- **6.6** HomeRail stage progress now derives from
  `project.actions.filter(a => a.status === 'done').length / total`
  rather than a fixture literal.
- **6.3** New `useBuildTaskStore` (zustand + persist) keys task
  overrides on `${projectId}::${taskId}`. BuildPage status pills cycle
  `todo → in-progress → done → todo`; "Mark phase complete" sets every
  task in a phase to `done`.
- **6.1** DiscoverPage chips now drive a real `applyCandidateFilters`
  pass over the candidate set (acreage band, price band, use-fit tag).
  Selecting ≥2 candidates surfaces a `CompareModal` with side-by-side
  verdict / scores / top blocker.
- **6.2** ProvePage **Fix on Map** flies the design-page MapLibre
  canvas to the blocker centroid via a transient `useMapFocusStore`
  (not persisted — purely a UI signal). **Generate Brief** downloads
  a Markdown brief built by `generateProveBrief.ts` (verdict, blockers,
  best uses, vision fit, execution, design rules).
- **6.5** ReportPage gains **Download Markdown** (via
  `generateProjectReport.ts`), **Print / PDF** (browser print dialog),
  and **Copy share link** (clipboard + toast). react-pdf was rejected
  for v3.1 — runtime cost (~3MB) doesn't earn its keep against
  print-to-PDF + Markdown.
- **6.4** OperatePage **Create Field Task** + **Log Observation**
  CTAs wired to the fieldwork store.

**Phase 7 — Backend scaffold backfill** (commits `dae36f9`,
`9f0cdff`):

- **7.2** New `packages/shared/src/schemas/sectionResponse.ts` exports
  a `sectionResponse(summary)` helper that wraps a section-specific
  Summary in the same `'ready' | 'not_ready'` discriminated union
  used by section2/section5. All 26 stub schemas (section3, 4, 6..29)
  now export a typed `<Domain>Summary` (3-5 domain fields per the V3
  read-paths) plus a `<Domain>Response`. The
  `Generated stub. Replace with the real Zod types as this section…`
  comment is gone repo-wide.
- **7.1** All 25 scaffold-stub routes under `apps/api/src/routes/`
  replaced with real Fastify handlers that mount the standard
  `authenticate + requirePhase + resolveProjectRole` chain (matching
  basemap-terrain) and return their typed envelope parsed via Zod.
  Until the matching processor lands they emit
  `{ status: 'not_ready', reason: 'not_implemented' }` — a stable
  contract the V3 UI already discriminates against. The
  `Generated stub from scaffold-section.ts` comment is gone repo-wide.
- **7.3** Dead-on-arrival: `structureDemand.ts` and `comfortGrid.ts`
  no longer exist under `packages/shared/src/scoring/`; fuzzyMCDM is
  already wired into `computeScores.ts`; the provenance tooltip UX
  shipped earlier; `hydrologyMetrics.ts:65` is an intentional
  back-compat fallback, not a TODO.

**Verification per phase:**

- **6.x** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  clean for `@ogden/web`.
- **7.x** — same flag, clean for both `packages/shared` and
  `apps/api`. `git grep "Generated stub"` returns nothing.

**Out-of-scope for autonomous closure:**

- **Phase 0** — needs a running dev server + signed-out preview +
  Diagnosis Report markdown export inspection. Requires human at
  the browser.
- **Phase 8** — raster pollinator corridor analysis, global
  groundwater REST sources, phase-gated future routes
  (`MT`/`FUTURE`/`P4`), OBSERVE Phase 4b–4f. Each needs a scoped
  ADR before implementation.

**ADR:** [`wiki/decisions/2026-05-02-section-response-envelope.md`](decisions/2026-05-02-section-response-envelope.md).
