# OGDEN Land Design Atlas

> *A tool for seeing land whole — and building it wisely.*

A geospatial land intelligence web application for stewardship-conscious land design. Integrates public GIS data, interactive map editing, site assessment scoring, and AI-assisted design across four phases.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Map Engine | MapboxGL JS v3 + Deck.gl |
| Backend | Fastify + Node.js |
| Database | PostgreSQL 15 + PostGIS 3.4 |
| Queue | BullMQ + Redis |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage (S3-compatible) |
| Monorepo | pnpm workspaces + Turborepo |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Start local services

```bash
cd infrastructure
docker compose up -d
```

This starts PostgreSQL 15 + PostGIS 3.4 (port 5432) and Redis 7 (port 6379).
The migration in `apps/api/src/db/migrations/001_initial.sql` runs automatically on first start.

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit both `.env` files. At minimum you need:
- `JWT_SECRET` — 32+ character secret for the API
- `VITE_MAPBOX_TOKEN` — Mapbox public token (get one free at mapbox.com)

### 3. Install dependencies

```bash
pnpm install
```

### 4. Run in development

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- API health: http://localhost:3001/health

## Project Structure

```
ogden-atlas/
├── apps/
│   ├── web/          # React frontend (MapboxGL, Deck.gl, Zustand)
│   └── api/          # Fastify API (PostGIS, BullMQ, data pipeline)
├── packages/
│   └── shared/       # Zod schemas + types shared between web and api
└── infrastructure/
    └── docker-compose.yml
```

## Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| **Phase 1** | Site Intelligence | 🚧 In progress |
| **Phase 2** | Design Atlas | Planned |
| **Phase 3** | Collaboration + AI | Planned |
| **Phase 4** | Public + Portal | Planned |

## Ontario Data Stack

This project is configured for Ontario, Canada as the primary target area (Conservation Halton jurisdiction). The data pipeline uses:

- **Elevation**: NRCan HRDEM / Ontario PDEM (via Land Information Ontario)
- **Soils**: OMAFRA + CanSIS
- **Hydrology**: Ontario Hydro Network (OHN)
- **Flood & Wetlands**: Conservation Authority mapping (Conservation Halton for target area)
- **Land Cover**: AAFC Annual Crop Inventory
- **Climate**: ECCC Climate Normals
- **Zoning**: Halton Region open data

The adapter registry in `packages/shared/src/constants/dataSources.ts` routes each layer to the correct national source based on `project.country`.
