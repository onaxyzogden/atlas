# OGDEN Atlas Platform
**Type:** project
**Status:** active
**Path:** `/` (monorepo root)

## Purpose
Geospatial land intelligence platform for regenerative property design. Helps landowners, designers, and investors plan sustainable land use projects with real data, financial modeling, and professional export capabilities.

## Stack
- **Frontend:** React 18 + TypeScript + Vite 6 + Zustand 5 + MapLibre GL + MapTiler
- **Backend:** Fastify 5 + Node.js + PostgreSQL 16/PostGIS 3.4 + Redis 7 + BullMQ
- **Shared:** Zod schemas + utilities (`packages/shared`)
- **Build:** pnpm workspaces + Turborepo
- **Domain:** atlas.ogden.ag (deployment pending)

## Monorepo Structure
```
apps/
  api/          — Fastify REST API (15+ routes)
  web/          — React SPA (30+ feature modules)
packages/
  shared/       — Zod schemas, type utilities, constants
infrastructure/
  docker-compose.yml  — PostgreSQL + Redis for local dev
design-system/
  ogden-atlas/MASTER.md  — Design tokens and component specs
```

## Overall Completion
~55% Done, ~25% Partial, ~20% Stub/Not Started (revised 2026-04-14 deep audit).

Revision rationale: The ~65% estimate counted frontend-only layer fetchers as
"connected". The deep audit flagged backend adapter coverage as a gap. See
`ATLAS_DEEP_AUDIT.md` for the original framing.

**Correction (2026-05-20):** the "ALL 14 backend adapters are stubbed
(ManualFlagAdapter)" claim is stale. Actual state: 17 live adapters under
`apps/api/src/services/pipeline/adapters/` (SSURGO, USGS Elevation, NRCan
HRDEM, OMAFRA, NHD, OHN, NWI/FEMA, Conservation Authority, NOAA, ECCC, NLCD,
AAFC, US County GIS, Ontario Municipal, NWIS, PGMN, NASA POWER).
`ManualFlagAdapter` is a defensive fallback used only when
`ADAPTER_REGISTRY[layerType]?.[country]` is undefined — it is not the
default. Adapter dispatch is gated by the boundary POST
(`POST /api/v1/projects/:id/boundary`), not by project create or address
input. See [2026-05-20 OLOS new-user-journey walkthrough](../decisions/2026-05-20-olos-new-user-journey-walkthrough.md).

## Key Metrics
- 498 source files across monorepo
- 26 Zustand stores (all localStorage-persisted, no backend sync yet)
- 16 database tables across 6 migrations (full PostGIS schema)
- 7 data layer types x 2 countries (US + CA), 28 data sources mapped
- 14 security vulnerabilities (2 critical CVEs in fast-jwt via @fastify/jwt)

## Current State
- v3 stage flow: **Stage 0 "True North / Fit Gate" → Observe → Plan → Act** (2026-05-24). New projects now open on True North — an 8-segment intent/non-negotiables questionnaire feeding a pure deterministic Fit Gate verdict (Green→Black severity, advisory soft-gate, never auto-blocks); the chosen archetype tailors the Observe compass + Command-Centre dashboards. See [2026-05-24 ADR](../decisions/2026-05-24-atlas-true-north-fit-gate-stage-0.md).
- Project CRUD, map drawing, zone/structure/paddock/crop/path placement: **production-ready**
- Authentication (JWT): **working**
- Data pipeline orchestration: **working** (adapters mostly stubbed)
- Financial modeling engine: **working** (client-side, regional benchmarks)
- PDF export service: **working** (7 templates, Puppeteer, S3/local storage)
- Dashboard: 14 pages, mixed data status (live vs. demo)
- Backend sync for stores: **not started** (Sprint 3+ item)
- CI/CD, tests, production deployment: **not started**

## Strategic Gaps
See [Gap Analysis](gap-analysis.md) for the full ~120-gap inventory against global frameworks (FAO, USDA, ASTM, IUCN, WRB). Covers soil, terrain, hydrology, climate, crop suitability, ecology, energy, infrastructure, regulatory, global coverage, and design intelligence.

## Strategic Direction (Phase 2)
The ratified Phase-2 north star is [Land OS Positioning & Phase-2 Roadmap](../concepts/land-os-positioning.md): OLOS is the full operating system for regenerative land development — success = independently running an Apricot-Lane-complexity project without external PM tools. The A track (ecological monitoring & habitat) is complete; Sub-project D (the end-to-end operating loop / command centre — capability #4) is decomposed into a sequenced D0–D5 backlog. B is track-level only; C (transition economics) is intent-only and Scholar-Council-gated. Ratifying ADR: [2026-05-18 Land OS positioning & D roadmap](../decisions/2026-05-18-atlas-land-os-positioning-and-d-roadmap.md).

### Plan-Operation roadmap — COMPLETE (Phases 1–5, 2026-05-25)
The living-plan loop layered on the 15-module Plan-Initiation surface is now closed end-to-end on `feat/atlas-permaculture`. A recorded observation flagged for plan impact → a **Plan Review** (Phase 1, `48702c66`) → an authored **Decision** (Phase 2, `c36bb5a6`) → an **Act Work Package** consumed by Act (Phase 3, `ab445034`); each decision has a per-decision **Planning Workspace** with qualitative scenario comparison (Phase 4, `6bdbb31b`); and the loop is kept honest over time by **Conflict Detection** + full-geometry **Plan Versioning** (snapshot/restore) + a **Synthesis & Approval** roll-up with an advisory steward stamp (Phase 5, `72f9cabb`/`68b5f526`/`2b408b9b`). Light shelled child routes under `/v3/project/$id/plan/*` (review, decisions, work-packages, workspace, conflicts, versions, synthesis); new `byProject` `ogden-*` stores follow the `syncManifest` versioned-blob path. Strictly operational (no financing semantics). ADRs: [Phase 1](../decisions/2026-05-25-atlas-plan-impact-flags.md) · [Phase 2](../decisions/2026-05-25-atlas-plan-decision-log.md) · [Phase 3](../decisions/2026-05-25-atlas-plan-work-packages-phase3.md) · [Phase 4](../decisions/2026-05-25-atlas-plan-workspace-phase4.md) · [Phase 5](../decisions/2026-05-25-atlas-plan-conflict-version-synthesis-phase5.md). Remaining roadmap items are *additive Initiation* work (Risk & Compliance #9, Operations Model #11), demand-gated.

## Launch Blockers
1. No backend sync (data is localStorage-only)
2. No CI/CD pipeline
3. Auth guard disabled in frontend (commented out for dev)
4. No production deployment config

## Pre-Launch Hardening (2026-04-12)
- 19 CRITICAL/HIGH fixes completed (Phases A–D)
- 12 MEDIUM/LOW fixes completed (Phases E–F)
- Test coverage: 420 tests passing (64 API, 356 web) at hardening; 384 web tests passing as of 2026-05-31 (see Plan Spine Live Reskin).
- Build: all 3 workspaces compile clean
- Remaining deferred items: hardcoded hex colors (510 occ), console statements (79 occ), z-index standardization, WS stale connection cleanup, TS composite references, Docker initdb race, layers snake_case rename

## Plan Spine Live Reskin + §10.1 Protocol Trigger (2026-05-31)
Branch `feat/atlas-permaculture`, 6 commits this session (`87959dc2`→`58b1d341`):

**Phase A** — `StratumSpineCircle`: circle glyph reads `S{n}` (✓ when complete); bold label reads the stratum title; duplicate subtitle removed.

**Phase B** — `DecisionChecklist` rewritten as faithful read-only `DecisionGroupCard` surface: colored-bubble group headers, expand/collapse, striped rows, non-interactive 14px checkbox, "Open in Act →" CTA, all production adornments preserved as read-only chips. Plan-side toggling removed.

**Phase C1–C4 (§10.1 full S6-derivation build):**
- `packages/shared`: `ParameterItem`/`ParameterGroup` Zod schemas on `PlanStratumObjective`; S6 `parameterGroup` seed (5 items, tokens verbatim from standard-template catalogue); `buildProtocolOutputs(group, valuesById)` pure derive helper; drift-guard tests.
- `planStratumStore`: parallel `valuesByProject` slice (v4→v5 persist migration, additive backfill); `setParameterValue`/`getParameterValues`/`selectParameterValues`. `protocolStore`: new `deactivateProtocol(projectId, templateId)` (removes record — inverse of `activateProtocol`).
- `ParameterGroup.tsx`: spine-token-styled editable inputs, gated on `objective.parameterGroup` + livestock enterprise, persists on keystroke.
- `ProtocolApprovalOverlay.tsx`: full modal wrapping `spine/ProtocolConfirmationFlow` with real store data — templates enterprise-filtered, outputs derived from steward values (`NO FABRICATION`), `onEditCommit` writes token values back to parameter store (single source of truth). "Approve & instantiate protocols →" gold button in `ObjectiveDetailPanel` (gated on S6 complete + parameterGroup + livestock). `ProtocolLayerPanel` now derives token outputs from `buildProtocolOutputs` (activated conditions show entered thresholds; unfilled tokens render verbatim brackets).
- Spine prototype files untouched (import-only). 384 web tests passing, web tsc exit 0.
