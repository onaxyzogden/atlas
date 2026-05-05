/**
 * cpcad-ingest — Annual ingest of the CPCAD (Canadian Protected and Conserved
 * Areas Database) Esri File GDB into the `conservation_overlay_features`
 * PostGIS table.
 *
 * Source: Environment and Climate Change Canada, CPCAD
 * https://open.canada.ca/data/en/dataset/6c343726-1e92-451a-876a-76e17d398a1c
 * Licence: Open Government Licence — Canada (OGL-Canada 2.0)
 *
 * Per ADR 2026-05-04-tiered-conservation-overlay (Phase 8.2-B.4):
 *   1. Reads the local GDB at CPCAD_GDB_PATH (env var).
 *   2. Filters to STATUS=1 (established) AND BIOME='T' (terrestrial).
 *   3. Reprojects from Canada Albers Equal Area Conic (ESRI:102001) → EPSG:4326.
 *   4. Converts to newline-delimited GeoJSON (ndjson) via ogr2ogr.
 *   5. Streams ndjson into `conservation_overlay_features` via UPSERT on
 *      (source='CPCAD', source_record_id=ZONE_ID::text).
 *   6. Atomic vintage swap: after all features are written for the new vintage,
 *      deletes rows for prior CPCAD vintages so old data does not accumulate.
 *
 * Usage:
 *   CPCAD_GDB_PATH=/data/cpcad/ProtectedConservedArea_2025.gdb \
 *   DATABASE_URL=postgres://... \
 *   node --import tsx/esm apps/api/src/jobs/cpcad-ingest.ts
 *
 *   Or via ts-node / tsx:
 *   tsx apps/api/src/jobs/cpcad-ingest.ts
 *
 * Environment variables (all optional — fall back to config defaults):
 *   CPCAD_GDB_PATH   — path to the .gdb directory published by ECCC
 *   GDAL_BIN_DIR     — path to the directory containing ogr2ogr (overrides PATH)
 *   DATABASE_URL     — Postgres connection string (required; loaded via config)
 *   CPCAD_LAYER      — GDB layer name (default: auto-detected via ogrinfo)
 *   CPCAD_VINTAGE    — ingest_vintage tag (default: derived from GDB layer name)
 *
 * Schema (migration 024/025):
 *   source              = 'CPCAD'
 *   source_record_id    = ZONE_ID::text
 *   designation_type    = TYPE_E
 *   designation_name    = NAME_E
 *   attribution         = MGMT_E
 *   last_updated        = COALESCE(QUALYEAR, ESTYEAR)::text || '-12-31'
 *   ingest_vintage      = e.g. '2025'
 *   raw_attributes      = { iucn_cat, pa_oecm_df, area_ha, jurisdiction, ipca }
 *   geom                = geometry(Geometry, 4326)
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import postgres from 'postgres';
import pino from 'pino';

const logger = pino({ name: 'cpcad-ingest' });

// ─── Config ──────────────────────────────────────────────────────────────────

const GDB_PATH    = process.env['CPCAD_GDB_PATH'];
const GDAL_BIN    = process.env['GDAL_BIN_DIR'] ?? '';          // empty = use PATH
const DATABASE_URL = process.env['DATABASE_URL'];
const LAYER_OVERRIDE = process.env['CPCAD_LAYER'];              // optional
const VINTAGE_OVERRIDE = process.env['CPCAD_VINTAGE'];          // optional

if (!GDB_PATH) {
  logger.error('CPCAD_GDB_PATH environment variable is required');
  process.exit(1);
}
if (!DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ogrBin(name: string): string {
  return GDAL_BIN ? join(GDAL_BIN, name) : name;
}

/**
 * Detect the primary data layer name in the GDB using ogrinfo.
 * Looks for the layer matching /ProtectedConservedArea_\d{4}$/ (not
 * the Delisted or Comment tables).
 */
async function detectLayer(gdbPath: string): Promise<{ layer: string; vintage: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ogrBin('ogrinfo'), ['-al', '-so', gdbPath]);
    let stdout = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', () => {/* suppress PROJ version warnings */});
    proc.on('close', (code) => {
      if (code !== 0 && stdout.length === 0) {
        reject(new Error(`ogrinfo exited with code ${code}`));
        return;
      }
      const match = stdout.match(/Layer name: (ProtectedConservedArea_(\d{4}))\b/);
      if (!match) {
        reject(new Error('Could not detect CPCAD data layer from ogrinfo output'));
        return;
      }
      resolve({ layer: match[1]!, vintage: match[2]! });
    });
  });
}

// ─── GeoJSON feature type ─────────────────────────────────────────────────────

interface CpcadGeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: {
    ZONE_ID?: number | null;
    NAME_E?: string | null;
    TYPE_E?: string | null;
    MGMT_E?: string | null;
    QUALYEAR?: number | null;
    ESTYEAR?: number | null;
    O_AREA_HA?: number | null;
    JUR_ID?: string | null;
    IUCN_CAT?: number | null;
    PA_OECM_DF?: number | null;
    IPCA?: number | null;
    STATUS?: number | null;
    BIOME?: string | null;
  } | null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info({ gdbPath: GDB_PATH }, 'CPCAD ingest starting');

  // 1. Detect layer + derive vintage
  let layer = LAYER_OVERRIDE ?? '';
  let vintage = VINTAGE_OVERRIDE ?? '';

  if (!layer || !vintage) {
    logger.info('Detecting GDB layer name via ogrinfo...');
    const detected = await detectLayer(GDB_PATH!);
    layer = layer || detected.layer;
    vintage = vintage || detected.vintage;
  }
  logger.info({ layer, vintage }, 'CPCAD layer resolved');

  const db = postgres(DATABASE_URL!);

  try {
    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;

    // 2. Stream ndjson from ogr2ogr
    //    -where filters established terrestrial features.
    //    -t_srs reprojects Canada Albers → EPSG:4326.
    //    -f GeoJSONSeq → newline-delimited GeoJSON.
    const ogrArgs = [
      '-f', 'GeoJSONSeq',
      '/vsistdout/',
      GDB_PATH!,
      layer,
      '-t_srs', 'EPSG:4326',
      '-where', "STATUS = 1 AND BIOME = 'T'",
      '-lco', 'COORDINATE_PRECISION=6',
    ];

    logger.info({ cmd: ogrBin('ogr2ogr'), args: ogrArgs }, 'Spawning ogr2ogr');
    const ogr = spawn(ogrBin('ogr2ogr'), ogrArgs);
    ogr.stderr.on('data', (d: Buffer) => {
      const msg = d.toString().trim();
      // ogr2ogr emits PROJ version warnings on stderr — suppress them
      if (!msg.includes('PROJ:') && !msg.includes('ERROR 1: PROJ')) {
        logger.warn({ stderr: msg }, 'ogr2ogr stderr');
      }
    });

    const rl = createInterface({ input: ogr.stdout, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;

      let feature: CpcadGeoJsonFeature;
      try {
        feature = JSON.parse(line) as CpcadGeoJsonFeature;
      } catch {
        logger.warn({ line: line.slice(0, 120) }, 'Failed to parse GeoJSON line');
        errors++;
        continue;
      }

      const p = feature.properties;
      if (!p || !feature.geometry || p.ZONE_ID == null) {
        skipped++;
        continue;
      }

      const sourceRecordId = String(p.ZONE_ID);
      const lastUpdatedYear = p.QUALYEAR ?? p.ESTYEAR;
      const lastUpdated = lastUpdatedYear ? `${lastUpdatedYear}-12-31` : null;
      const rawAttributes = {
        iucn_cat:     p.IUCN_CAT   ?? null,
        pa_oecm_df:   p.PA_OECM_DF ?? null,
        area_ha:      p.O_AREA_HA  ?? null,
        jurisdiction: p.JUR_ID     ?? null,
        ipca:         p.IPCA       ?? null,
      };

      try {
        await db`
          INSERT INTO conservation_overlay_features (
            source,
            source_record_id,
            designation_type,
            designation_name,
            attribution,
            last_updated,
            ingest_vintage,
            geom,
            raw_attributes
          ) VALUES (
            'CPCAD',
            ${sourceRecordId},
            ${p.TYPE_E ?? 'Unknown'},
            ${p.NAME_E ?? null},
            ${p.MGMT_E ?? null},
            ${lastUpdated}::date,
            ${vintage},
            ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326),
            ${db.json(rawAttributes)}
          )
          ON CONFLICT (source, source_record_id)
          DO UPDATE SET
            designation_type  = EXCLUDED.designation_type,
            designation_name  = EXCLUDED.designation_name,
            attribution       = EXCLUDED.attribution,
            last_updated      = EXCLUDED.last_updated,
            ingest_vintage    = EXCLUDED.ingest_vintage,
            geom              = EXCLUDED.geom,
            raw_attributes    = EXCLUDED.raw_attributes,
            updated_at        = NOW()
        `;
        inserted++;
        if (inserted % 500 === 0) {
          logger.info({ inserted, skipped, errors }, 'CPCAD ingest progress');
        }
      } catch (err) {
        logger.error({ sourceRecordId, err }, 'Upsert failed for feature');
        errors++;
      }
    }

    await new Promise<void>((res, rej) =>
      ogr.on('close', (code) => (code === 0 ? res() : rej(new Error(`ogr2ogr exit ${code}`)))),
    );

    // 3. Atomic vintage swap — remove stale CPCAD rows from prior vintages
    const { count } = await db`
      DELETE FROM conservation_overlay_features
      WHERE source = 'CPCAD'
        AND ingest_vintage <> ${vintage}
    `.then((r) => ({ count: r.count }));

    logger.info(
      { inserted, skipped, errors, prunedRows: count, vintage },
      'CPCAD ingest complete',
    );
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  logger.error({ err }, 'CPCAD ingest fatal error');
  process.exit(1);
});
