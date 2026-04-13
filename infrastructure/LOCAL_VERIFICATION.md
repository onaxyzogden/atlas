# OGDEN Atlas -- Local Setup and Verification Guide

This guide covers everything needed to run the full OGDEN Atlas stack locally
on Windows with PostgreSQL 17 (native) and Redis 7 (WSL2).

---

## Table of Contents

1. [Prerequisites Checklist](#prerequisites-checklist)
2. [One-Time Setup Sequence](#one-time-setup-sequence)
3. [Daily Startup Sequence](#daily-startup-sequence)
4. [Environment Variable Reference](#environment-variable-reference)
5. [Verification Checklist](#verification-checklist)
6. [Common Failure Modes and Diagnosis](#common-failure-modes-and-diagnosis)

---

## Prerequisites Checklist

Confirm ALL of the following before proceeding:

- [ ] **PostgreSQL 17** installed and running as a Windows service on port 5432.
      Verify: `psql -U postgres -c "SELECT version();"` should return PostgreSQL 17.x.
      PostGIS 3.x extension bundle must be installed alongside PostgreSQL.
- [ ] **WSL2** installed with a Linux distribution (e.g., Ubuntu 22.04).
      Verify: `wsl --list --verbose` shows your distro running with VERSION 2.
- [ ] **Redis 7** installed inside WSL2.
      Verify: open a WSL2 terminal and run `redis-server --version`.
- [ ] **Node.js 20+** installed on Windows.
      Verify: `node --version` shows v20.x.x or higher.
- [ ] **pnpm 9+** installed globally.
      Verify: `pnpm --version` shows 9.x.x or higher.
      Install if missing: `npm install -g pnpm`
- [ ] **psql client** available on Windows PATH (ships with PostgreSQL).
      Verify: `psql --version`
- [ ] Git repository cloned and you are in the `atlas/` root directory.

---

## One-Time Setup Sequence

Run these steps once on a fresh machine.

### Step 1: Create the database and application user

Run the setup script as the `postgres` superuser:

```bash
psql -U postgres -f infrastructure/db-setup.sql
```

This script is idempotent and performs the following:
- Creates the `ogden_atlas` database (if it does not exist)
- Enables the `postgis` and `uuid-ossp` extensions
- Creates the `ogden_app` database user (if it does not exist)
- Grants the user full privileges on the `ogden_atlas` database and public schema

**Important:** The user is created with password `CHANGE_ME`. You must either:
- Change it via `psql -U postgres -c "ALTER USER ogden_app PASSWORD 'your_secure_password';"`, or
- Leave it as-is for local development (not recommended for shared machines)

### Step 2: Configure API environment variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set at minimum:

```
DATABASE_URL=postgresql://ogden_app:your_password@localhost:5432/ogden_atlas
REDIS_URL=redis://localhost:6379
JWT_SECRET=a-string-that-is-at-least-32-characters-long
```

The `REDIS_URL` will be overridden at startup with the WSL2 dynamic IP (see
Daily Startup). For now, any valid URL is fine as a placeholder.

### Step 3: Configure web environment variables

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

```
VITE_MAPTILER_KEY=your_maptiler_key_here
```

Get a MapTiler key at https://cloud.maptiler.com/account/keys/.

### Step 4: Install dependencies

```bash
pnpm install
```

### Step 5: Apply database migrations

Option A -- using the pnpm script (recommended):

```bash
pnpm migrate
```

Option B -- using the bash script (requires bash via Git Bash or WSL2):

```bash
bash infrastructure/run-migrations.sh
```

Both methods are idempotent. They track applied migrations in a
`schema_migrations` table and skip any already applied.

The following migrations will be applied in order:

| File | Description |
|------|-------------|
| `001_initial.sql` | Core schema: users, organizations, projects, layers, terrain, assessments, design features, spiritual zones, files, pipeline jobs, exports |
| `002_add_password_auth.sql` | Adds `password_hash` column to users table for local email/password auth |
| `003_terrain_analysis_tier3.sql` | Adds Tier 3 terrain columns: curvature, viewshed, frost pocket, cold air drainage, TPI |
| `004_project_portals.sql` | Creates `project_portals` table for public storytelling portal persistence |
| `005_multi_user_collab.sql` | Creates project_comments, project_members, project_activity, and suggested_edits tables |

After migration, verify:

```bash
psql -U ogden_app -d ogden_atlas -c "\dt"
```

You should see tables including: `users`, `organizations`, `organization_members`,
`projects`, `project_layers`, `terrain_analysis`, `site_assessments`,
`design_features`, `spiritual_zones`, `project_files`, `data_pipeline_jobs`,
`project_exports`, `project_portals`, `project_comments`, `project_members`,
`project_activity`, `suggested_edits`, `schema_migrations`.

---

## Daily Startup Sequence

Run these steps each time you start a new Windows session (or after a reboot).

### Step 1: Start Redis in WSL2

Open a WSL2 terminal:

```bash
redis-server
```

Leave this terminal open. Redis must stay running for BullMQ job queues.

### Step 2: Resolve the WSL2 Redis IP

WSL2 assigns a new virtual network IP on every Windows restart, so
`redis://localhost:6379` will not work from the Windows side. Run the helper
script to get the current IP:

```bash
bash infrastructure/wsl-redis-url.sh
```

This prints something like `redis://172.28.144.1:6379` (your IP will differ).

### Step 3: Export the Redis URL and start the API

In a **single Git Bash or WSL terminal** (so the export persists):

```bash
export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
pnpm --filter @ogden/api dev
```

The API starts on http://localhost:3001. You should see:

```
OGDEN API running on port 3001
Data pipeline workers started (tier1-data + tier3-terrain + tier3-watershed + tier3-microclimate + tier3-soil-regeneration)
WebSocket Redis broadcast subscriber active
```

Verify the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok","timestamp":"...","version":"0.1.0"}`

### Step 4: Start the web frontend

In a separate terminal:

```bash
pnpm --filter @ogden/web dev
```

The frontend starts on http://localhost:5173.

### Alternative: Start everything at once

If your `.env` already has the correct `REDIS_URL` (e.g., you updated it
manually after Step 2):

```bash
export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
pnpm dev
```

This runs `pnpm install`, `pnpm migrate`, and then starts both API and web
via Turborepo.

---

## Environment Variable Reference

### API Environment (`apps/api/.env`)

#### Required for basic function

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string. Must include the `ogden_atlas` database. | `postgresql://ogden_app:mypass@localhost:5432/ogden_atlas` |
| `REDIS_URL` | Redis connection string. Must be the WSL2 dynamic IP (not localhost) when Redis runs in WSL2. | `redis://172.28.144.1:6379` |
| `JWT_SECRET` | Secret key for signing JWT tokens. Minimum 32 characters. | `my-super-secret-key-that-is-at-least-32-chars` |

#### Required for full function

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `MAPTILER_KEY` | MapTiler API key (used for map tile rendering). | https://www.maptiler.com/ |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI chat proxy and assessment enrichment. | https://console.anthropic.com/settings/keys |
| `S3_BUCKET` | S3 bucket name for file uploads, raster storage, and PDF exports. | AWS Console or compatible S3 provider |
| `S3_REGION` | AWS region for the S3 bucket. | e.g., `us-east-1` |
| `S3_ENDPOINT` | Custom S3 endpoint URL (for non-AWS providers like MinIO, Supabase Storage). | Provider dashboard |
| `PUPPETEER_EXECUTABLE_PATH` | Path to a Chrome/Chromium binary for PDF rendering via Puppeteer. | System-dependent; often auto-detected |

#### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode. Set to `production` for deployed instances. |
| `PORT` | `3001` | Port the Fastify server listens on. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin. Must match the web frontend URL. |
| `RATE_LIMIT_MAX` | `200` | Maximum requests per window per client. |
| `RATE_LIMIT_WINDOW` | `1 minute` | Rate limit time window. |
| `SUPABASE_URL` | *(none)* | Supabase project URL (not currently used). |
| `SUPABASE_SERVICE_KEY` | *(none)* | Supabase service role key (not currently used). |

#### Feature flags (all default to `false`)

| Variable | Controls |
|----------|----------|
| `FEATURE_TERRAIN_3D` | 3D terrain visualization |
| `FEATURE_HYDROLOGY` | Hydrology analysis panel |
| `FEATURE_LIVESTOCK` | Livestock management features |
| `FEATURE_AI` | AI-powered assessment enrichment |
| `FEATURE_MULTI_USER` | Multi-user collaboration (comments, members, roles) |
| `FEATURE_OFFLINE` | Offline mode with sync |
| `FEATURE_SCENARIOS` | Design scenario comparison |
| `FEATURE_PUBLIC_PORTAL` | Public storytelling portal |

### Web Environment (`apps/web/.env`)

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `VITE_MAPTILER_KEY` | Yes | MapTiler API key for map tiles, satellite imagery, and terrain. | https://cloud.maptiler.com/account/keys/ |

---

## Verification Checklist

Work through each section below after setup to confirm everything is
functioning. Each section lists the steps to test and what to expect.

### Auth -- Registration, Login, Token Persistence

1. Open http://localhost:5173 in a browser.
2. Navigate to the register page.
3. Create an account with email and password (minimum 8 characters).
4. Verify you are redirected to the main app after registration.
5. Open browser DevTools > Application > Local Storage. Confirm a JWT token is stored.
6. Refresh the page. Verify you remain logged in (token persists).
7. Log out, then log back in with the same credentials.
8. Verify via API:
   ```bash
   # Register
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'

   # Login
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'

   # Verify token (replace TOKEN with the token from login response)
   curl http://localhost:3001/api/v1/auth/me \
     -H "Authorization: Bearer TOKEN"
   ```

### Project Creation -- 4-Step Wizard and Boundary Drawing

1. Click "New Project" in the dashboard.
2. Step 1 (Name/Type): Enter a project name and select a type (e.g., `regenerative_farm`).
3. Step 2 (Location): Select country (US or CA) and province/state.
4. Step 3 (Boundary): Draw a polygon boundary on the map using the drawing tools, or import a GeoJSON/KML file.
5. Step 4 (Notes): Add optional notes and click "Create".
6. Verify the project appears in the project list with computed acreage.
7. Verify via API:
   ```bash
   curl http://localhost:3001/api/v1/projects \
     -H "Authorization: Bearer TOKEN"
   ```
8. Confirm a `data_pipeline_jobs` record was created with `job_type = 'fetch_tier1'`:
   ```bash
   psql -U ogden_app -d ogden_atlas -c "SELECT * FROM data_pipeline_jobs ORDER BY created_at DESC LIMIT 5;"
   ```

### Layer Fetching -- US and Ontario Properties

1. Open a project that has a boundary set.
2. Navigate to the layers/data panel.
3. For US properties: elevation (USGS), soils (SSURGO), and watershed (USGS WBD) should show real data or a fetch status.
4. For Ontario properties: soils (LIO ArcGIS) and watershed (Ontario Hydro Network) should be connected.
5. Check confidence indicators on each layer (high/medium/low badges).
6. Verify via API:
   ```bash
   curl http://localhost:3001/api/v1/layers/project/PROJECT_ID \
     -H "Authorization: Bearer TOKEN"
   ```

### Tier 3 Pipeline -- Terrain, Watershed, Microclimate, Soil Regeneration

1. After Tier 1 data has been fetched for a project, the API automatically enqueues Tier 3 jobs.
2. Check the API startup logs for:
   ```
   Data pipeline workers started (tier1-data + tier3-terrain + tier3-watershed + tier3-microclimate + tier3-soil-regeneration)
   ```
3. Monitor pipeline jobs:
   ```bash
   psql -U ogden_app -d ogden_atlas -c "SELECT job_type, status, created_at FROM data_pipeline_jobs ORDER BY created_at DESC;"
   ```
4. When terrain analysis completes, verify the terrain_analysis table has data:
   ```bash
   psql -U ogden_app -d ogden_atlas -c "SELECT project_id, elevation_min_m, slope_mean_deg, tpi_dominant_class FROM terrain_analysis;"
   ```

### Site Assessment -- 7 Scores with Breakdowns

1. Open a project with fetched layers.
2. Navigate to the site assessment view.
3. Verify scores appear for: Suitability, Buildability, Water Resilience, Agricultural Potential, and Overall.
4. Each score should be 0-100 with a confidence indicator.
5. Verify via API:
   ```bash
   curl http://localhost:3001/api/v1/projects/PROJECT_ID/assessment \
     -H "Authorization: Bearer TOKEN"
   ```
6. Check the `score_breakdown` JSON field for individual factor scores.
7. Check `data_completeness_score` on the project:
   ```bash
   curl http://localhost:3001/api/v1/projects/PROJECT_ID/completeness \
     -H "Authorization: Bearer TOKEN"
   ```

### AI Assessment -- Site Narrative and Design Recommendations

Requires `ANTHROPIC_API_KEY` in `apps/api/.env`.

1. Open a project and navigate to the AI chat panel.
2. Ask a question about the site (e.g., "What are the best uses for this property?").
3. Verify a response streams back from the Claude proxy.
4. Verify via API:
   ```bash
   curl -X POST http://localhost:3001/api/v1/ai/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{
       "systemPrompt": "You are a land use advisor.",
       "messages": [{"role": "user", "content": "What crops grow well in clay soil?"}]
     }'
   ```
5. If `ANTHROPIC_API_KEY` is not set, the endpoint returns a 503 with
   `AI_NOT_CONFIGURED`. This is expected behavior.

### Feature Placement -- Zones, Structures, Paddocks, Siting Rule Alerts

1. Open a project with a boundary on the map.
2. Use the drawing tools to:
   - Draw a **zone** (e.g., food_production, habitation, conservation).
   - Place a **structure** (e.g., dwelling, greenhouse, prayer_space).
   - Create a **paddock** with livestock type and stocking rates.
   - Draw a **path** (e.g., main road, track).
3. Verify each element appears on the map with correct styling.
4. Edit a feature's properties (label, type, phase tag).
5. Delete a feature and verify it is removed.
6. Verify features persist in the database:
   ```bash
   curl http://localhost:3001/api/v1/design-features/project/PROJECT_ID \
     -H "Authorization: Bearer TOKEN"
   ```

### Exports -- PDF Site Assessment

Requires `PUPPETEER_EXECUTABLE_PATH` (or auto-detected Chrome) and optionally
`S3_BUCKET` for cloud storage.

1. Open a project with assessment data.
2. Click the export/download button for a site assessment PDF.
3. Verify a PDF file downloads or an export record is created.
4. Verify via API:
   ```bash
   curl -X POST http://localhost:3001/api/v1/projects/PROJECT_ID/exports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"exportType": "site_assessment_pdf"}'

   curl http://localhost:3001/api/v1/projects/PROJECT_ID/exports \
     -H "Authorization: Bearer TOKEN"
   ```

### Collaboration -- Organization, Members, Roles, Comments

1. **Create an organization:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/organizations \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"name": "My Farm Collective"}'
   ```
2. **Register a second user** (use a different email).
3. **Invite the second user** to a project as a reviewer:
   ```bash
   curl -X POST http://localhost:3001/api/v1/projects/PROJECT_ID/members \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"email": "second@example.com", "role": "reviewer"}'
   ```
4. **List members:**
   ```bash
   curl http://localhost:3001/api/v1/projects/PROJECT_ID/members \
     -H "Authorization: Bearer TOKEN"
   ```
5. **Add a comment** (optionally with map coordinates):
   ```bash
   curl -X POST http://localhost:3001/api/v1/projects/PROJECT_ID/comments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"text": "This area needs better drainage", "location": [-79.38, 43.65]}'
   ```
6. **Resolve a comment:**
   ```bash
   curl -X PATCH http://localhost:3001/api/v1/projects/PROJECT_ID/comments/COMMENT_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"resolved": true}'
   ```
7. Verify role enforcement: a reviewer cannot create design features (should get 403).

### Real-Time Sync -- WebSocket Presence

1. Open the same project in two browser tabs (both logged in).
2. In browser DevTools console of tab 1, verify WebSocket connection:
   ```javascript
   // Look for ws://localhost:3001/api/v1/ws/projects/PROJECT_ID?token=...
   ```
3. In tab 2, add or edit a design feature.
4. Tab 1 should receive a real-time update (feature_created / feature_updated event).
5. Verify presence indicators: each tab should show the other user as "online."
6. Close tab 2 and verify tab 1 receives a `presence_leave` event.
7. Check the API logs for WebSocket connection messages:
   ```
   [WS] UserName joined project PROJECT_ID (2 connected)
   [WS] UserName left project PROJECT_ID
   ```

### Portal -- Publish and Share Token Access

1. Open a project and navigate to the portal/sharing settings.
2. Create or update a portal configuration:
   ```bash
   curl -X POST http://localhost:3001/api/v1/projects/PROJECT_ID/portal \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"isPublished": true, "dataMaskingLevel": "curated"}'
   ```
3. Note the `shareToken` UUID in the response.
4. Access the public portal URL (no auth required):
   ```bash
   curl http://localhost:3001/api/v1/portal/SHARE_TOKEN
   ```
5. Verify it returns the portal config and project name.
6. Open the portal URL in a private/incognito browser window to confirm no login is needed.

### Offline Mode

Offline mode is currently feature-flagged (`FEATURE_OFFLINE=false` by default).
When enabled:

1. Open a project in the browser with network connection active.
2. Disconnect from the network (toggle Wi-Fi off or use DevTools Network > Offline).
3. Place a design feature on the map.
4. Verify the feature is saved locally (localStorage/Zustand persist).
5. Reconnect to the network.
6. Verify the feature syncs to the server (check API or database).

Note: Full offline sync is a work-in-progress feature. Local-first storage
via Zustand `persist` middleware is operational, but server reconciliation
may not be fully implemented.

---

## Common Failure Modes and Diagnosis

### PostGIS extension missing

**Symptom:** Migration 001_initial.sql fails with `ERROR: extension "postgis" is not available`.

**Cause:** PostGIS was not installed with PostgreSQL.

**Fix:**
1. Download the PostGIS bundle from https://postgis.net/install/ (use the Stack Builder that ships with PostgreSQL for Windows).
2. Install PostGIS for PostgreSQL 17.
3. Verify: `psql -U postgres -d ogden_atlas -c "SELECT PostGIS_Version();"` should return a version string.
4. Re-run `psql -U postgres -f infrastructure/db-setup.sql` and then `pnpm migrate`.

### Redis IP stale (connection refused)

**Symptom:** API crashes or logs `ECONNREFUSED` errors for Redis. BullMQ workers do not start.

**Cause:** WSL2 IP changed after a Windows reboot. The `REDIS_URL` in `.env` or the environment variable points to an old IP.

**Fix:**
1. Confirm Redis is running in WSL2: `wsl redis-cli ping` (should return `PONG`).
2. Get the new IP: `bash infrastructure/wsl-redis-url.sh`
3. Either update `apps/api/.env` with the new URL, or re-export in your shell:
   ```bash
   export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
   ```
4. Restart the API: `pnpm --filter @ogden/api dev`

### S3 credentials absent

**Symptom:** File uploads and PDF exports fail with S3-related errors. The API may log errors when attempting to upload to S3.

**Cause:** `S3_BUCKET`, `S3_REGION`, and/or `S3_ENDPOINT` are not set, or AWS credentials are not configured.

**Impact:** File uploads (`project_files`), raster storage (`project_layers.raster_url`), and PDF export storage (`project_exports.storage_url`) will not work.

**Fix for local dev:**
- These features can be skipped during local development if you are not testing file uploads or PDF exports.
- For testing, set up a local MinIO instance or use a test S3 bucket:
  ```
  S3_BUCKET=ogden-atlas-dev
  S3_REGION=us-east-1
  S3_ENDPOINT=http://localhost:9000
  ```

### MapTiler key absent

**Symptom:** The map canvas is blank or shows a "Map token missing" fallback component. No satellite imagery, terrain tiles, or vector base maps render.

**Cause:** `VITE_MAPTILER_KEY` is not set in `apps/web/.env`.

**Fix:**
1. Create a free MapTiler account at https://cloud.maptiler.com/.
2. Generate an API key from the account dashboard.
3. Add it to `apps/web/.env`:
   ```
   VITE_MAPTILER_KEY=your_key_here
   ```
4. Restart the web dev server: `pnpm --filter @ogden/web dev`

### Anthropic key absent

**Symptom:** AI chat returns `503 AI_NOT_CONFIGURED` with the message
"AI features are not configured. Set ANTHROPIC_API_KEY in the server environment."

**Cause:** `ANTHROPIC_API_KEY` is not set in `apps/api/.env`.

**Impact:** The AI chat proxy (`POST /api/v1/ai/chat`) and assessment enrichment
(`POST /api/v1/ai/enrich-assessment`) endpoints will return 503 errors.
All other features work normally without this key.

**Fix:**
1. Get an API key from https://console.anthropic.com/settings/keys.
2. Add it to `apps/api/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart the API.

### BullMQ worker not starting

**Symptom:** API starts but does not log the
`Data pipeline workers started (tier1-data + tier3-terrain ...)` message.
Pipeline jobs remain in `queued` status indefinitely.

**Cause:** Redis connection failed. BullMQ requires a working Redis connection
to operate the job queues.

**Diagnosis:**
1. Check the API logs for `Data pipeline workers not started (Redis/DB not available)`.
2. Verify Redis is reachable: `redis-cli -h $(wsl hostname -I | awk '{print $1}') ping`
3. Verify `REDIS_URL` matches the current WSL2 IP.

**Fix:** Same as the "Redis IP stale" fix above. Once Redis is reachable,
restart the API and confirm the worker startup message appears in the logs.

### Migration already applied error

**Symptom:** `pnpm migrate` reports that migrations are already applied, but
tables seem to be missing or incomplete.

**Cause:** The `schema_migrations` table recorded a migration as applied, but
the migration partially failed (e.g., due to a syntax error or interrupted
connection).

**Diagnosis:**
```bash
psql -U ogden_app -d ogden_atlas -c "SELECT * FROM schema_migrations ORDER BY version;"
```

Check whether all expected migrations are listed:
- `001_initial`
- `002_add_password_auth`
- `003_terrain_analysis_tier3`
- `004_project_portals`
- `005_multi_user_collab`

**Fix:**
If a migration is recorded but its tables are missing, remove its tracking row
and re-run:
```bash
psql -U ogden_app -d ogden_atlas -c "DELETE FROM schema_migrations WHERE version = '003_terrain_analysis_tier3';"
pnpm migrate
```

### Database connection refused

**Symptom:** API crashes on startup with `ECONNREFUSED 127.0.0.1:5432` or
the Zod config validation fails with `DATABASE_URL` errors.

**Cause:** PostgreSQL service is not running.

**Fix (Windows):**
1. Open Services (Win+R, type `services.msc`).
2. Find `postgresql-x64-17` (or similar).
3. Click "Start" if it is stopped.
4. Alternatively: `net start postgresql-x64-17` in an elevated command prompt.

### Port 3001 already in use

**Symptom:** API fails with `EADDRINUSE :::3001`.

**Fix:** Kill the existing process:
```bash
npx kill-port 3001
```
Or change the port in `apps/api/.env`:
```
PORT=3002
```
If you change the API port, also update `CORS_ORIGIN` in `apps/api/.env`.

### TypeScript compilation errors on `pnpm build`

**Symptom:** `pnpm build` fails with TypeScript errors in the `shared` package.

**Fix:**
1. Ensure the shared package builds first: `pnpm --filter @ogden/shared build`
2. Then build the full project: `pnpm build`
3. Or use Turborepo which handles the dependency order: `pnpm build` (from root)

### OpenAPI docs not loading

**Symptom:** Navigating to http://localhost:3001/api/docs shows an error.

**Cause:** The `openapi.yaml` file may not exist at `apps/api/openapi.yaml`.

**Note:** API docs are only available in development mode (`NODE_ENV=development`).
If the YAML file is missing, this is a non-critical issue -- all API endpoints
function normally without the docs UI.

---

## Quick Reference Card

```
                            DAILY STARTUP

  1.  WSL2:     redis-server
  2.  Git Bash: export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
  3.  Git Bash: pnpm --filter @ogden/api dev     (port 3001)
  4.  Terminal: pnpm --filter @ogden/web dev      (port 5173)

                          HEALTH CHECKS

  API:   curl http://localhost:3001/health
  DB:    psql -U ogden_app -d ogden_atlas -c "SELECT 1;"
  Redis: redis-cli -h <WSL_IP> ping

                           KEY URLs

  Web App:    http://localhost:5173
  API:        http://localhost:3001
  API Docs:   http://localhost:3001/api/docs
  Health:     http://localhost:3001/health
```
