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
  // ── Reverse-proxy awareness ──────────────────────────────────────────────
  // Controls how Fastify derives the client IP (req.ip) from X-Forwarded-For.
  // The per-IP portal rate limits (PORTAL_*_RATE_LIMIT_MAX) are USELESS unless
  // this is set in any deployment that sits behind a proxy: every request would
  // otherwise share the proxy's single IP bucket (ineffective AND a self-DoS
  // vector). Passed through to the Fastify `trustProxy` option in app.ts.
  //   ''/unset/'false' — trust nobody (correct for local dev: the socket peer
  //                      IS the client; a spoofed XFF must be ignored). DEFAULT.
  //   'true'           — trust the whole XFF chain (spoofable; avoid in prod).
  //   a number N       — trust N proxy hops nearest the server (proxy-addr
  //                      semantics). On Render the chain is
  //                      client → Render edge → nginx → api, so api trusts 2
  //                      hops to recover the client IP. CONFIRM the count against
  //                      live logs before relying on it (see render.yaml note):
  //                      too few → everyone shares the proxy bucket; too many →
  //                      a client can spoof X-Forwarded-For.
  //   a subnet/IP list — trust exactly those addresses (comma-separated).
  TRUST_PROXY: z.string().optional().transform((v) => (v ? v : undefined)),
  // Per-IP caps for the UNAUTHENTICATED public portal routes (fixed 1-minute
  // window). Tighter than the global limit: these are the only routes
  // reachable without a JWT, so they bound the blast radius of a leaked
  // share token. PDF cap is lower — each hit streams a multi-MB binary.
  PORTAL_PUBLIC_RATE_LIMIT_MAX: z.coerce.number().default(60),
  PORTAL_PDF_RATE_LIMIT_MAX: z.coerce.number().default(10),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')).transform((v) => v || undefined),
  SUPABASE_SERVICE_KEY: z.string().optional().transform((v) => v || undefined),
  S3_BUCKET: z.string().optional().transform((v) => v || undefined),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')).transform((v) => v || undefined),
  ANTHROPIC_API_KEY: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  // ── Email (verification + password reset) ────────────────────────────────
  // EMAIL_TRANSPORT — 'console' (default) logs links to stdout, no account
  //   needed; 'resend' sends real mail via the Resend REST API.
  // RESEND_API_KEY — required only when EMAIL_TRANSPORT=resend (else falls back
  //   to console with a warning, so a missing key never blocks boot).
  // APP_PUBLIC_URL — base URL used to build verify/reset links in emails.
  EMAIL_TRANSPORT: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional().transform((v) => v || undefined),
  EMAIL_FROM: z.string().default('OGDEN Atlas <noreply@ogden.ag>'),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:5200'),
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
  // ── Placement guard (design-features PostGIS validation) ────────────────
  // off     — skip entirely.
  // log     — evaluate + log violations, never reject (default: legacy rows
  //           synced before the rules existed must not brick sync).
  // enforce — blocks always 409; warns 409 unless acknowledgeWarnings.
  PLACEMENT_GUARD_MODE: z.enum(['off', 'log', 'enforce']).default('log'),
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
