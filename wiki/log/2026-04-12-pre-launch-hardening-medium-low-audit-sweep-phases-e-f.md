# 2026-04-12 — Pre-Launch Hardening: MEDIUM/LOW Audit Sweep (Phases E+F)


**Operator:** Claude Code (Opus 4.6)
**Session scope:** Fix 12 remaining MEDIUM/LOW findings from pre-launch audit

### Phase E — Quick Wins (7 items)

| Fix | Description |
|---|---|
| E1 | Added `coverage/` to `.gitignore` (4 untracked dirs) |
| E2 | Removed dead `MAPBOX_TOKEN` from API config.ts + .env.example |
| E3 | Removed unused `Readable` import from StorageProvider.ts |
| E4 | Removed redundant `@types/jszip` (jszip ships own types) |
| E5 | Cleaned `pnpm-workspace.yaml` — removed spurious `allowBuilds` block |
| E6 | Removed unused `VITE_API_URL` from .env.example, Dockerfile, docker-compose |
| E7 | Added `pino-pretty` to API devDeps (was used but undeclared) |

### Phase F — Moderate Fixes (5 items)

| Fix | Description |
|---|---|
| F1 | Renamed `mapboxToken`→`maptilerKey`, `mapboxTransformRequest`→`maptilerTransformRequest`, `useMapbox`→`useMaplibre`. Deleted dead `mapbox.ts` shim. Updated 4 doc files. |
| F2 | Added WS broadcast for bulk feature insert + `features_bulk_created` to WsEventType enum |
| F3 | Added layer refresh deduplication (skip insert+enqueue if queued/running job exists) |
| F4 | New migration 006: `idx_pc_author` index + `set_updated_at_portals` trigger |
| F5 | Updated README roadmap table (phases 1–4 status) |

### Additional Fixes

- Fixed PWA `maximumFileSizeToCacheInBytes` for Cesium 4.1MB bundle (vite.config.ts)
- Fixed postgres.js `TransactionSql` typing issue with `any` annotation + eslint comment
- Reverted unnecessary `onlyBuiltDependencies` in root package.json (`.npmrc` is authoritative)

### Verification

- **Build:** 3/3 workspaces pass (shared + api + web)
- **Tests:** 420 passing (64 API + 356 web) across 25 test files

### Deferred (documented in plan)

- Hardcoded hex colors (510 occ, 59 files) — design-token refactor session
- Console statements (79 occ) — needs policy decision
- Z-index standardization — stacking context audit
- WS stale connection cleanup — heartbeat interval logic
- TypeScript composite references — structural tsconfig change
- Docker initdb race condition — needs Docker testing
- Layers route snake_case → camelCase — 170 frontend refs, coordinated breaking change
