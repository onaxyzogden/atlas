import postgres from 'postgres';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Three Streams Farm sentinel UUID. Inlined here rather than imported from
// `@ogden/shared/constants/system` because the package's `exports` map does
// not expose `/constants/system` and the package itself is not symlinked at
// the repo root. The canonical source of truth lives in
// `packages/shared/src/constants/system.ts:THREE_STREAMS_PROJECT_ID` — keep
// these two values in lockstep.
const THREE_STREAMS_PROJECT_ID = '00000000-0000-0000-0000-000000357320';

export type Snapshot = {
  project: any;
  layers: any[];
  designFeatures: any[];
  regenerationEvents: any[];
  spiritualZones: any[];
  relationships: any[];
};

type Queryable = { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> };

export async function buildSnapshot(db: Queryable, projectId: string): Promise<Snapshot> {
  const project = (await db.query(
    `SELECT id, name, is_builtin, country, province_state, conservation_auth_id,
            acreage, bioregion, climate_region,
            COALESCE(ST_AsGeoJSON(parcel_boundary)::json, 'null'::json) AS parcel_boundary,
            metadata
       FROM projects WHERE id = $1`, [projectId])).rows[0];
  const layers = (await db.query(
    `SELECT layer_type, source_api, data_date, summary_data
       FROM project_layers WHERE project_id = $1 ORDER BY layer_type`, [projectId])).rows;
  // `design_features` exposes its display string as `label` (the plan referred
  // to `name`, which is the column on `spiritual_zones` not here). Alias to
  // `name` so the JSON snapshot stays uniform across feature collections.
  const designFeatures = (await db.query(
    `SELECT id, feature_type, label AS name, properties,
            ST_AsGeoJSON(geometry)::json AS geometry
       FROM design_features WHERE project_id = $1 ORDER BY id`, [projectId])).rows;
  const regenerationEvents = (await db.query(
    `SELECT id, event_date, event_type, phase, observations, parent_event_id
       FROM regeneration_events WHERE project_id = $1 ORDER BY event_date, id`, [projectId])).rows;
  // `spiritual_zones` has discrete columns (zone_type, notes, qibla_bearing,
  // solar_events) rather than a single `properties` JSONB. Synthesise a
  // `properties` object so the snapshot shape matches `designFeatures`.
  const spiritualZones = (await db.query(
    `SELECT id, name,
            jsonb_build_object(
              'zone_type', zone_type,
              'notes', notes,
              'qibla_bearing', qibla_bearing,
              'solar_events', solar_events
            ) AS properties,
            ST_AsGeoJSON(geometry)::json AS geometry
       FROM spiritual_zones WHERE project_id = $1 ORDER BY id`, [projectId])).rows;
  const relationships = (await db.query(
    `SELECT from_output, to_input, ratio FROM project_relationships WHERE project_id = $1
       ORDER BY from_output, to_input, ratio`,
    [projectId])).rows;

  return { project, layers, designFeatures, regenerationEvents, spiritualZones, relationships };
}

// Adapter that wraps a `postgres` (porsager) client to satisfy the
// `Queryable` interface that `buildSnapshot` expects. Translates
// `query(sqlText, params)` into the unsafe positional form, since our
// snapshot SQL strings already contain `$1` placeholders rather than tagged
// templates. `unsafe` is intentional here — the SQL is fully static and
// project-id is the only bound parameter.
function postgresAdapter(sql: postgres.Sql): Queryable {
  return {
    async query(text: string, params: any[]) {
      const rows = (await sql.unsafe(text, params)) as any[];
      return { rows };
    },
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const sql = postgres(url, { onnotice: () => {} });
  try {
    const snap = await buildSnapshot(postgresAdapter(sql), THREE_STREAMS_PROJECT_ID);
    if (!snap.project) {
      throw new Error(`Project ${THREE_STREAMS_PROJECT_ID} not found in DATABASE_URL=${process.env.DATABASE_URL ?? '(unset)'}`);
    }
    const outPath = resolve(process.cwd(), 'apps/web/public/showcase/three-streams.json');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(snap, null, 2), 'utf8');
    console.log(`[snapshot] wrote ${outPath}`);
    console.log(`[snapshot] project=${snap.project?.name ?? '(missing)'} layers=${snap.layers.length} events=${snap.regenerationEvents.length}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Invoke `main()` when executed directly (tsx/node), but not when imported
// from the vitest test file. `pathToFileURL` normalises the cross-platform
// path comparison (Windows backslashes vs file:// URL).
const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
