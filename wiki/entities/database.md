# Database
**Type:** infrastructure
**Status:** active
**Path:** `apps/api/src/db/migrations/001_initial.sql`

## Purpose
PostgreSQL 16 + PostGIS 3.4 schema for all persistent data. SRID 4326 throughout, GIST indexes on geometry columns, auto-update triggers on `updated_at`.

## Tables (12)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, email, password_hash | bcrypt hashed |
| `organizations` | id, name, slug | Multi-tenant support |
| `organization_members` | org_id, user_id, role | owner/admin/member |
| `projects` | 44 columns incl. parcel_boundary (geometry), centroid, acreage | Main entity |
| `project_layers` | layer_type, fetch_status, confidence, geojson_data, raster_url | Cached API data |
| `terrain_analysis` | project_id, slope/aspect/elevation stats | Computed from DEM |
| `site_assessments` | 5 scores (0-100), score_breakdown (jsonb), flags (jsonb) | Versioned, is_current flag |
| `design_features` | feature_type, subtype, geometry, properties (jsonb), phase_tag | Zones/structures/paths |
| `spiritual_zones` | zone_type, qibla_bearing, solar_events | Islamic design elements |
| `project_files` | file_type, storage_url, processing_status | Uploaded files |
| `data_pipeline_jobs` | job_type, status, progress | BullMQ job tracking |
| `project_exports` | export_type, storage_url, generated_at, generated_by | PDF exports |

## Connection Pattern
```typescript
import postgres from 'postgres';
const sql = postgres(config.DATABASE_URL, { max: 20, idle_timeout: 30 });
// Decorated onto Fastify as `fastify.db`
// Query: const [row] = await db`SELECT ... WHERE id = ${id}`;
```

## Docker
```yaml
# infrastructure/docker-compose.yml
postgres:
  image: postgis/postgis:16-3.4
  ports: ["5432:5432"]
redis:
  image: redis:7-alpine
  ports: ["6379:6379"]
```

## Notes
- No ORM — raw SQL via `postgres` template literals
- All geometry stored as SRID 4326 (WGS84)
- Acreage computed via `ST_Area(ST_Transform(geom, 26917)) / 4046.86` (UTM zone 17N)
- JSONB used for flexible data: score_breakdown, flags, properties, style
