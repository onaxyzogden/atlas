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
