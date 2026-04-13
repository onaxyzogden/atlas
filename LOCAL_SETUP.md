# OGDEN Atlas - Local Development Setup

Complete guide to running Atlas locally from a fresh clone.

---

## 1. Prerequisites

| Tool | Minimum Version | Check Command |
|------|-----------------|---------------|
| Node.js | 20.0.0 | `node -v` |
| pnpm | 9.0.0 (repo uses 10.32.1) | `pnpm -v` |
| Docker + Docker Compose | Any recent version | `docker compose version` |

Install pnpm if you don't have it:

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

You will also need a **MapTiler API key** (free tier is fine) from https://www.maptiler.com/ — the map will not render without it.

---

## 2. Clone and Install

```bash
git clone https://github.com/onaxyzogden/atlas.git
cd atlas
pnpm install
```

This installs dependencies for all workspaces (`apps/api`, `apps/web`, `packages/shared`).

---

## 3. Environment Setup

### 3a. API Server (`apps/api/.env`)

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and set these values:

| Variable | Required | What to Set |
|----------|----------|-------------|
| `DATABASE_URL` | YES | `postgresql://ogden:ogden_dev_password@localhost:5432/ogden_atlas` (matches Docker Compose defaults - no change needed) |
| `JWT_SECRET` | YES | **Must be at least 32 characters.** Replace the placeholder with any random string, e.g.: `openssl rand -hex 32` |
| `REDIS_URL` | YES | `redis://localhost:6379` (default - no change needed) |
| `PORT` | no | `3001` (default - no change needed) |
| `NODE_ENV` | no | `development` (default) |
| `ANTHROPIC_API_KEY` | no | Only needed for AI chat features |

The `.env.example` ships with working defaults for everything **except** `JWT_SECRET`. You must change it from the placeholder to a real 32+ character string or the server will refuse to start.

Example working `apps/api/.env`:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://ogden:ogden_dev_password@localhost:5432/ogden_atlas
REDIS_URL=redis://localhost:6379
JWT_SECRET=a]3Fk9$mPqR7vWx2Tz!bN4cY8dL0eJ6hG1iKoU5sA
```

### 3b. Web Frontend (`apps/web/.env`)

```bash
cp apps/web/.env.example apps/web/.env
```

Open `apps/web/.env` and set:

| Variable | Required | What to Set |
|----------|----------|-------------|
| `VITE_MAPTILER_KEY` | YES | Your MapTiler API key (get one free at maptiler.com) |

Without `VITE_MAPTILER_KEY`, the app loads but the map shows a "Map token missing" fallback instead of a map.

---

## 4. Start the Database

Start PostgreSQL (with PostGIS) and Redis via Docker Compose:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Verify both containers are running and healthy:

```bash
docker compose -f infrastructure/docker-compose.yml ps
```

Expected output — both should show `healthy`:

```
NAME              STATUS
ogden-postgres    Up ... (healthy)
ogden-redis       Up ... (healthy)
```

You can also test the database connection directly:

```bash
docker exec ogden-postgres pg_isready -U ogden -d ogden_atlas
```

Expected: `ogden_atlas - accepting connections`

> **Note:** On a brand-new database volume, Docker automatically runs the SQL files from `apps/api/src/db/migrations/` (mounted into `/docker-entrypoint-initdb.d`). However, this only happens on the very first startup. If you add migrations later or the volume already exists, you must run the migration runner (next step).

---

## 5. Run Migrations

From the repo root:

```bash
pnpm --filter @ogden/api migrate
```

Or from the `apps/api` directory:

```bash
cd apps/api
pnpm migrate
```

Expected output:

```
Running migrations...

  -> Applying 001_initial.sql ...
  -> 001_initial.sql applied
  -> Applying 002_add_password_auth.sql ...
  -> 002_add_password_auth.sql applied
  -> Applying 003_terrain_analysis_tier3.sql ...
  -> 003_terrain_analysis_tier3.sql applied
  -> Applying 004_project_portals.sql ...
  -> 004_project_portals.sql applied
  -> Applying 005_multi_user_collab.sql ...
  -> 005_multi_user_collab.sql applied

5 migration(s) applied successfully.
```

Running it again is safe — already-applied migrations are skipped:

```
Running migrations...

  ✓ 001_initial.sql (already applied)
  ✓ 002_add_password_auth.sql (already applied)
  ...

All migrations already applied.
```

---

## 6. Start the API Server

```bash
cd apps/api
pnpm dev
```

Expected output (confirms successful startup):

```
[HH:MM:SS] INFO: PostgreSQL connected
[HH:MM:SS] INFO: Redis connected
[HH:MM:SS] INFO: OGDEN API running on port 3001
```

If you see `Data pipeline workers started`, that's also normal — it means Redis + BullMQ are working.

Leave this terminal running.

---

## 7. Start the Frontend

Open a **new terminal**:

```bash
cd apps/web
pnpm dev
```

Expected output:

```
  VITE v8.x.x  ready in XXXms

  -> Local:   http://localhost:5200/
  -> Network: http://xxx.xxx.xxx.xxx:5200/
```

Open **http://localhost:5200** in your browser.

---

## 8. Verify Registration Works

1. Open http://localhost:5200/login
2. Click the **"Create Account"** tab
3. Fill in:
   - **Name:** any display name
   - **Email:** `test@example.com`
   - **Password:** at least 8 characters
4. Click **Create Account**
5. If registration succeeds, you are redirected to the home page (project list)

To verify via API directly (with the API server running):

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

Expected response (HTTP 201):

```json
{
  "data": {
    "token": "eyJhbG...",
    "user": {
      "id": "some-uuid",
      "email": "test@example.com",
      "displayName": null
    }
  },
  "error": null
}
```

---

## 9. Common Errors and Fixes

### `Invalid environment variables` then immediate exit

**Cause:** Missing or invalid values in `apps/api/.env`.

| Field | Error | Fix |
|-------|-------|-----|
| `DATABASE_URL` | "Required" or "Invalid url" | Set to `postgresql://ogden:ogden_dev_password@localhost:5432/ogden_atlas` |
| `JWT_SECRET` | "String must contain at least 32 character(s)" | Replace placeholder with a 32+ character string |

### `connect ECONNREFUSED 127.0.0.1:5432`

**Cause:** PostgreSQL is not running.

```bash
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.yml ps   # verify "healthy"
```

### `connect ECONNREFUSED 127.0.0.1:6379`

**Cause:** Redis is not running. Same fix — run docker compose up.

### `relation "users" does not exist`

**Cause:** Migrations haven't been applied.

```bash
pnpm --filter @ogden/api migrate
```

### `column "password_hash" of relation "users" does not exist`

**Cause:** Migration `002_add_password_auth.sql` was not applied. Run the migration runner — it will apply only the missing ones.

### Port 3001 already in use

**Cause:** Another process is using port 3001.

```bash
# Find what's using it:
netstat -ano | findstr :3001        # Windows
lsof -i :3001                      # macOS/Linux

# Or change the port in apps/api/.env:
PORT=3002
```

If you change the API port, also update the Vite proxy target — but by default the proxy is hardcoded to `localhost:3001` in `apps/web/vite.config.ts`.

### Port 5200 already in use

**Cause:** Another Vite dev server is running. Kill it or set a different port:

```bash
cd apps/web
PORT=5201 pnpm dev
```

### Map shows "Map token missing" fallback

**Cause:** `VITE_MAPTILER_KEY` not set in `apps/web/.env`. Get a key from https://www.maptiler.com/ and restart the dev server (env changes require restart).

### `fetch failed` or `Network Error` on registration

**Cause:** The API server is not running. Start it with `cd apps/api && pnpm dev` and check that it prints "OGDEN API running on port 3001".

### Docker volume has stale data from a previous setup

If migrations fail with "already exists" errors, the Docker initdb already ran the SQL files on first boot. The migration runner's `schema_migrations` table won't know about those. Fix:

```bash
# Option A: Wipe the volume and start fresh
docker compose -f infrastructure/docker-compose.yml down -v
docker compose -f infrastructure/docker-compose.yml up -d
pnpm --filter @ogden/api migrate

# Option B: Manually record already-applied migrations
docker exec -i ogden-postgres psql -U ogden -d ogden_atlas <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO schema_migrations (version, name) VALUES
  ('001_initial', '001_initial.sql'),
  ('002_add_password_auth', '002_add_password_auth.sql'),
  ('003_terrain_analysis_tier3', '003_terrain_analysis_tier3.sql'),
  ('004_project_portals', '004_project_portals.sql'),
  ('005_multi_user_collab', '005_multi_user_collab.sql')
ON CONFLICT DO NOTHING;
SQL
```

---

## Quick Start (TL;DR)

```bash
# 1. Install
pnpm install

# 2. Environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/api/.env  -> set JWT_SECRET (32+ chars)
# Edit apps/web/.env  -> set VITE_MAPTILER_KEY

# 3. Database
docker compose -f infrastructure/docker-compose.yml up -d

# 4. Migrations
pnpm --filter @ogden/api migrate

# 5. Run (two terminals)
cd apps/api  && pnpm dev    # Terminal 1: API on :3001
cd apps/web  && pnpm dev    # Terminal 2: Frontend on :5200
```
