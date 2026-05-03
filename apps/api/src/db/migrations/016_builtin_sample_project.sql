-- 016_builtin_sample_project.sql
-- Inserts the 351 House — Halton, ON builtin demo project.
-- Used by GET /projects/builtins (unauthenticated) to seed atlas-ui and demos.
-- Idempotent — ON CONFLICT DO NOTHING on both rows.

-- Sentinel service user that owns the builtin project.
-- Not a real auth account; auth_provider = 'system' prevents Supabase login.
INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'builtin@ogden.ag',
  'OGDEN Sample',
  'system',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 351 House — Halton, ON sample project.
-- Sentinel UUID: 00000000-0000-0000-0000-0000005a3791
-- Carolinian zone, hardiness 5b, ~25.7 ha Halton County property.
INSERT INTO projects (
  id,
  owner_id,
  name,
  description,
  status,
  project_type,
  country,
  province_state,
  address,
  acreage,
  bioregion,
  climate_region,
  units,
  metadata,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-0000005a3791',
  '00000000-0000-0000-0000-000000000001',
  '351 House — Atlas Sample',
  'Carolinian hardwood transition — 25.7 ha regenerative homestead in Halton County, ON. Hardiness zone 5b.',
  'active',
  'homestead',
  'CA',
  'ON',
  '351 House, Halton County, Ontario, Canada',
  63.49,  -- 25.7 ha in acres
  'Carolinian Canada',
  'Humid continental (Dfb)',
  'metric',
  '{"climateRegion": "Humid continental (Dfb)", "bioregion": "Carolinian Canada", "county": "Halton", "hardinessZone": "5b"}'::jsonb,
  '2026-04-12 09:00:00+00',
  now()
)
ON CONFLICT (id) DO NOTHING;
