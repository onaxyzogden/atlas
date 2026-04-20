# Atlas Wiki Index

Authoritative accumulated-context source for the OGDEN Atlas project.
Read this first at the start of every session.

## Orientation
- [SCHEMA.md](SCHEMA.md) — Wiki conventions and page templates
- [log.md](log.md) — Chronological operation log
- [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) — Pre-commercial blockers (legal, ops, compliance)

## Entities
- [Atlas Platform](entities/atlas-platform.md) — Project overview, stack, completion status, launch blockers
- [API Backend](entities/api.md) — Fastify routes, patterns, services, dependencies
- [Web App](entities/web-app.md) — React SPA, dashboard groups, Zustand stores, feature structure
- [Shared Package](entities/shared-package.md) — Zod schemas, utilities, constants
- [Database](entities/database.md) — PostgreSQL/PostGIS schema (12 tables), connection pattern
- [Data Pipeline](entities/data-pipeline.md) — BullMQ orchestration, layer adapters, workers
- [PDF Export Service](entities/pdf-export-service.md) — Puppeteer templates, S3 storage, 7 export types
- [Gap Analysis](entities/gap-analysis.md) — ~120 gaps against global frameworks (FAO, USDA, ASTM, IUCN), triage roadmap

## Concepts
- [Design System](concepts/design-system.md) — Earth Green + Harvest Gold, Fira Code/Sans, component tokens
- [Scoring Engine](concepts/scoring-engine.md) — 8 weighted dimensions + 2-3 classifications, ~140+ components, WithConfidence, Tier 3 integration
- [Financial Model](concepts/financial-model.md) — Cost/revenue/cashflow engine, CostRange, mission scoring
- [Local-First Architecture](concepts/local-first-architecture.md) — Zustand + localStorage, no backend sync yet

## Decisions
- [2026-04-11 PDF Export Architecture](decisions/2026-04-11-pdf-export-architecture.md) — Puppeteer, sync rendering, template literals, client payload
- [2026-04-11 Dashboard Sidebar Groups](decisions/2026-04-11-dashboard-sidebar-groups.md) — Finance + Compliance groups added
- [2026-04-20 GAEZ v4 Self-Hosting](decisions/2026-04-20-gaez-self-hosting.md) — Self-host FAO GAEZ v4 Theme 4 COGs behind Fastify point-query; geotiff.js byte-range reads; CC BY-NC-SA 3.0 IGO flagged for legal review
- [2026-04-20 Atlas Staging Provisioning](decisions/2026-04-20-atlas-staging-provisioning.md) — Proposed Fly.io + S3/CloudFront + Cloudflare Pages staging env for real-data GAEZ validation; deferred pending operator commit to ~$25/mo + ~4-6 hours setup
