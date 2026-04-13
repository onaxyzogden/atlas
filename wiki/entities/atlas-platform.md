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
~65% Done, ~25% Partial, ~10% Stub (as of 2026-04-10 audit).

## Key Metrics
- 193 source files, 440 code nodes
- 18 Zustand stores (all localStorage-persisted, no backend sync yet)
- 12 database tables (full PostGIS schema)
- 7 data layer types x 2 countries (US + CA)

## Current State
- Project CRUD, map drawing, zone/structure/paddock/crop/path placement: **production-ready**
- Authentication (JWT): **working**
- Data pipeline orchestration: **working** (adapters mostly stubbed)
- Financial modeling engine: **working** (client-side, regional benchmarks)
- PDF export service: **working** (7 templates, Puppeteer, S3/local storage)
- Dashboard: 14 pages, mixed data status (live vs. demo)
- Backend sync for stores: **not started** (Sprint 3+ item)
- CI/CD, tests, production deployment: **not started**

## Launch Blockers
1. No backend sync (data is localStorage-only)
2. No CI/CD pipeline
3. Auth guard disabled in frontend (commented out for dev)
4. No production deployment config

## Pre-Launch Hardening (2026-04-12)
- 19 CRITICAL/HIGH fixes completed (Phases A–D)
- 12 MEDIUM/LOW fixes completed (Phases E–F)
- Test coverage: 420 tests passing (64 API, 356 web)
- Build: all 3 workspaces compile clean
- Remaining deferred items: hardcoded hex colors (510 occ), console statements (79 occ), z-index standardization, WS stale connection cleanup, TS composite references, Docker initdb race, layers snake_case rename
