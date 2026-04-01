-- OGDEN Land Design Atlas — Initial Schema
-- PostgreSQL 15 + PostGIS 3.4
-- All geometry stored in WGS84 (SRID 4326).
-- Metric area calculations use ST_Transform to UTM Zone 17N (EPSG:26917) for Ontario,
-- or the appropriate UTM zone for US properties.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for future text search

-- ────────────────────────────────────────────────────────────────────────────
-- USERS & ORGANIZATIONS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text UNIQUE NOT NULL,
  display_name      text,
  auth_provider     text NOT NULL DEFAULT 'supabase',
  preferred_locale  text NOT NULL DEFAULT 'en',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  plan        text NOT NULL DEFAULT 'free',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  org_id      uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer', -- owner | admin | editor | viewer
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- PROJECTS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid REFERENCES organizations ON DELETE SET NULL,
  owner_id                uuid NOT NULL REFERENCES users ON DELETE RESTRICT,
  name                    text NOT NULL,
  description             text,
  status                  text NOT NULL DEFAULT 'active', -- active | archived | shared
  project_type            text, -- regenerative_farm | retreat_center | homestead | educational_farm | conservation | multi_enterprise | moontrance

  -- Geospatial
  parcel_boundary         geometry(MultiPolygon, 4326),
  centroid                geometry(Point, 4326),
  acreage                 numeric(12, 4),

  -- Location metadata
  address                 text,
  parcel_id               text,       -- county APN or Ontario property roll number
  country                 char(2) NOT NULL DEFAULT 'US',   -- 'US' | 'CA'
  province_state          text,       -- 'ON' | 'BC' | 'NY' | 'CA' etc.
  county_fips             char(5),    -- US only
  conservation_auth_id    text,       -- Ontario CA code (e.g. 'CH' for Conservation Halton)
  timezone                text,

  -- Project settings
  units                   text NOT NULL DEFAULT 'metric', -- metric | imperial

  -- Free-text notes fields
  owner_notes             text,
  zoning_notes            text,
  access_notes            text,
  water_rights_notes      text,
  climate_region          text,
  bioregion               text,
  restrictions_covenants  text,
  ag_exemption_notes      text,

  -- Intelligence scores
  data_completeness_score numeric(4, 1), -- 0.0 – 100.0

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner        ON projects (owner_id);
CREATE INDEX idx_projects_org          ON projects (org_id);
CREATE INDEX idx_projects_boundary     ON projects USING GIST (parcel_boundary);
CREATE INDEX idx_projects_centroid     ON projects USING GIST (centroid);
CREATE INDEX idx_projects_country_prov ON projects (country, province_state);

-- ────────────────────────────────────────────────────────────────────────────
-- TIER 1 DATA LAYERS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_layers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  layer_type      text NOT NULL, -- elevation | soils | watershed | wetlands_flood | land_cover | climate | zoning
  source_api      text NOT NULL, -- usgs_3dep | ssurgo | nhd | nwi_fema_nfhl | nlcd | noaa_normals | county_gis
                                 -- nrcan_hrdem | omafra_cansis | ontario_hydro_network | conservation_authority | aafc_annual_crop | eccc_normals | ontario_municipal_gis
  fetch_status    text NOT NULL DEFAULT 'pending', -- pending | fetching | complete | failed | unavailable
  confidence      text,          -- high | medium | low
  data_date       date,          -- vintage/publication date of source data
  attribution_text text,

  -- Data storage (one of these will be populated depending on source type)
  geojson_data    jsonb,         -- vector layers stored inline
  summary_data    jsonb,         -- scalar summaries (e.g. climate normals, soil class breakdown)
  raster_url      text,          -- COG in S3 for raster layers
  wms_url         text,          -- proxied WMS for display layers
  wms_layers      text,          -- WMS layer names

  metadata        jsonb,         -- source-specific metadata

  fetched_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, layer_type)
);

CREATE INDEX idx_project_layers_project      ON project_layers (project_id);
CREATE INDEX idx_project_layers_project_type ON project_layers (project_id, layer_type);
CREATE INDEX idx_project_layers_status       ON project_layers (fetch_status);

-- ────────────────────────────────────────────────────────────────────────────
-- TERRAIN ANALYSIS (Tier 3 — derived from elevation data)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE terrain_analysis (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES projects ON DELETE CASCADE UNIQUE,
  elevation_min_m     numeric(8, 2),
  elevation_max_m     numeric(8, 2),
  elevation_mean_m    numeric(8, 2),
  slope_min_deg       numeric(6, 2),
  slope_max_deg       numeric(6, 2),
  slope_mean_deg      numeric(6, 2),
  aspect_dominant     text,          -- N | NE | E | SE | S | SW | W | NW
  contour_geojson     jsonb,         -- pre-computed contour lines GeoJSON
  slope_heatmap_url   text,          -- COG in S3
  aspect_heatmap_url  text,
  computed_at         timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- SITE ASSESSMENTS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE site_assessments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  version                   integer NOT NULL DEFAULT 1,
  is_current                boolean NOT NULL DEFAULT true,
  confidence                text NOT NULL DEFAULT 'low', -- high | medium | low

  -- Scores (0–100)
  suitability_score         numeric(4, 1),
  buildability_score        numeric(4, 1),
  water_resilience_score    numeric(4, 1),
  ag_potential_score        numeric(4, 1),
  overall_score             numeric(4, 1),

  -- Breakdown and flags
  score_breakdown           jsonb, -- { suitability: { slope: 80, soilDrainage: 60, ... }, ... }
  flags                     jsonb, -- AssessmentFlag[]
  needs_site_visit          boolean NOT NULL DEFAULT false,

  data_sources_used         text[], -- which layer_types contributed
  computed_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_assessments_project   ON site_assessments (project_id);
CREATE INDEX idx_site_assessments_current   ON site_assessments (project_id, is_current) WHERE is_current = true;

-- ────────────────────────────────────────────────────────────────────────────
-- DESIGN FEATURES (user-drawn elements)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE design_features (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  feature_type    text NOT NULL, -- zone | structure | path | point | annotation
  subtype         text,          -- orchard | grazing | building | road | etc.
  geometry        geometry(Geometry, 4326) NOT NULL,
  label           text,
  properties      jsonb NOT NULL DEFAULT '{}',
  phase_tag       text,          -- p1 | p2 | p3 | p4 (design build phase)
  style           jsonb,         -- { color, opacity, lineStyle }
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES users ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_features_project  ON design_features (project_id);
CREATE INDEX idx_design_features_geom     ON design_features USING GIST (geometry);
CREATE INDEX idx_design_features_type     ON design_features (project_id, feature_type);

-- ────────────────────────────────────────────────────────────────────────────
-- SPIRITUAL ZONES (P1 identity feature — first-class, not a properties blob)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE spiritual_zones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  zone_type       text NOT NULL, -- prayer_space | quiet_zone | qibla_axis | dawn_viewpoint | dusk_viewpoint | contemplative_path | water_worship_integration | scenic_overlook | gathering_circle
  geometry        geometry(Geometry, 4326) NOT NULL,
  name            text,
  notes           text,
  qibla_bearing   numeric(6, 3), -- degrees clockwise from north to Mecca, null if not applicable
  solar_events    jsonb,         -- { sunriseTime, sunsetTime, goldenHourMorning, goldenHourEvening }
  created_by      uuid REFERENCES users ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spiritual_zones_project ON spiritual_zones (project_id);
CREATE INDEX idx_spiritual_zones_geom    ON spiritual_zones USING GIST (geometry);

-- ────────────────────────────────────────────────────────────────────────────
-- FILE UPLOADS (Tier 2 user data)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_files (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  uploaded_by         uuid REFERENCES users ON DELETE SET NULL,
  filename            text NOT NULL,
  file_type           text NOT NULL, -- kml | kmz | geojson | shapefile | orthomosaic | lidar | photo | document | site_plan
  storage_url         text NOT NULL,
  file_size_bytes     bigint,
  processing_status   text NOT NULL DEFAULT 'pending', -- pending | processing | complete | failed
  processed_geojson   jsonb,  -- parsed geometry result if applicable
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_files_project ON project_files (project_id);

-- ────────────────────────────────────────────────────────────────────────────
-- DATA PIPELINE JOB TRACKING
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE data_pipeline_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects ON DELETE CASCADE,
  job_type        text NOT NULL, -- fetch_tier1 | process_upload | compute_assessment | generate_pdf
  status          text NOT NULL DEFAULT 'queued', -- queued | running | complete | failed | retrying
  bull_job_id     text,
  attempt_count   integer NOT NULL DEFAULT 0,
  error_message   text,
  result_summary  jsonb,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_jobs_project ON data_pipeline_jobs (project_id);
CREATE INDEX idx_pipeline_jobs_status  ON data_pipeline_jobs (status, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- EXPORTS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  export_type     text NOT NULL DEFAULT 'site_assessment_pdf',
  storage_url     text,
  generated_at    timestamptz,
  generated_by    uuid REFERENCES users ON DELETE SET NULL
);

CREATE INDEX idx_project_exports_project ON project_exports (project_id);

-- ────────────────────────────────────────────────────────────────────────────
-- UTILITY: updated_at triggers
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_layers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON design_features
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON spiritual_zones
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
