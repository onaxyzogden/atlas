import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  // Comma-separated list of allowed origins. Set exactly in production; defaults cover both local dev apps.
  CORS_ORIGIN: z.string().default('http://localhost:5200,http://localhost:5300'),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')).transform((v) => v || undefined),
  SUPABASE_SERVICE_KEY: z.string().optional().transform((v) => v || undefined),
  S3_BUCKET: z.string().optional().transform((v) => v || undefined),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')).transform((v) => v || undefined),
  ANTHROPIC_API_KEY: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  // ── GAEZ v4 (self-hosted rasters) ────────────────────────────────────────
  // GAEZ_DATA_DIR — local filesystem path to the converted COG directory.
  //   Defaults to `./data/gaez/cog` relative to CWD (typically apps/api).
  // GAEZ_S3_PREFIX — optional HTTPS/S3 base URL (e.g. https://bucket.s3.region.amazonaws.com/gaez/v4/).
  //   When set, overrides local FS reads with byte-range reads via geotiff.js fromUrl.
  GAEZ_DATA_DIR: z.string().default('./data/gaez/cog'),
  GAEZ_S3_PREFIX: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  // ── SoilGrids v2.0 (self-hosted rasters) ─────────────────────────────────
  // SOILGRIDS_DATA_DIR — local filesystem path to the clipped COG directory.
  //   Defaults to `./data/soilgrids/cog` relative to CWD (typically apps/api).
  // SOILGRIDS_S3_PREFIX — optional HTTPS/S3 base URL; overrides local FS when set.
  SOILGRIDS_DATA_DIR: z.string().default('./data/soilgrids/cog'),
  SOILGRIDS_S3_PREFIX: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  // ── CPCAD annual ingest ────────────────────────────────────────────────────
  // CPCAD_GDB_PATH — local filesystem path to the Esri File GDB published by
  //   ECCC (e.g. /data/cpcad/ProtectedConservedArea_2025.gdb). Updated annually
  //   when ECCC publishes the next year's release. Required only for the ingest
  //   job (apps/api/src/jobs/cpcad-ingest.ts); not needed at API server start.
  // GDAL_BIN_DIR — directory containing ogr2ogr / ogrinfo. Defaults to the
  //   PATH-resolved location; override when GDAL is installed to a non-standard
  //   path (e.g. on Windows with OSGeo4W).
  CPCAD_GDB_PATH: z.string().optional().transform((v) => v || undefined),
  GDAL_BIN_DIR: z.string().optional().transform((v) => v || undefined),
  // ── Land cover rasters (NLCD / ACI / WorldCover) ──────────────────────────
  // Per ADR 2026-05-05-pollinator-corridor-raster-pipeline. Each source has
  // its own data dir (manifest + per-vintage tile subdirs); optional S3 prefix
  // overrides local FS reads. Empty by default — services boot disabled until
  // operator runs apps/api/src/jobs/landcover-tile-ingest.ts.
  NLCD_DATA_DIR: z.string().default('./data/landcover/nlcd'),
  ACI_DATA_DIR: z.string().default('./data/landcover/aci'),
  WORLDCOVER_DATA_DIR: z.string().default('./data/landcover/worldcover'),
  LANDCOVER_S3_PREFIX: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  // Feature flag: when true, ADAPTER_REGISTRY.land_cover dispatches to the
  // raster-sample adapters (NlcdLandCoverAdapter etc.) instead of the legacy
  // WMS-based NlcdAdapter / AafcLandCoverAdapter. Operator flips this once
  // landcover-tile-ingest has populated the data dirs.
  LANDCOVER_TILES_READY: z.preprocess(
    (v) => v === 'true' || v === '1',
    z.boolean(),
  ).default(false),
  // Phase 5 feature flag (ADR 2026-05-05). When true, the
  // PollinatorOpportunityProcessor attempts the polygon-friction path
  // (polygonizeBbox + deriveCorridorFriction) before falling back to the
  // synthesized 5×5 patch grid. Independent of LANDCOVER_TILES_READY so
  // the polygon path can be exercised against fixture COGs in tests
  // without flipping the production raster-sample dispatch.
  POLLINATOR_USE_POLYGON_FRICTION: z.preprocess(
    (v) => v === 'true' || v === '1',
    z.boolean(),
  ).default(false),
  // Hard ceiling for the polygon-friction path. Per ADR D5: if
  // gdal_polygonize.py + reprojection take longer than this, the
  // processor falls back to the synthesized grid so the soil-regen
  // job doesn't block.
  POLLINATOR_POLYGON_TIMEOUT_MS: z.coerce.number().default(60_000),
});

function loadConfig() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
