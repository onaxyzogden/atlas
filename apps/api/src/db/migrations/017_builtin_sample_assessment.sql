-- 017_builtin_sample_assessment.sql
-- Seeds a site_assessments row for the 351 House — Halton, ON demo project.
-- Realistic scores for a Carolinian 5b hardiness homestead:
--   gentle mid-slopes, good ag potential, low-moderate water stress.
-- Individual sub-scores live in score_breakdown JSONB (migration 009 dropped
-- the legacy per-domain numeric columns, keeping only overall_score).
-- Idempotent — skipped if an assessment already exists for this project.

INSERT INTO site_assessments (
  id,
  project_id,
  version,
  is_current,
  confidence,
  overall_score,
  score_breakdown,
  flags,
  needs_site_visit,
  data_sources_used,
  computed_at
)
SELECT
  '00000000-0000-0000-0000-000000005a01',
  '00000000-0000-0000-0000-0000005a3791',
  1,
  true,
  'medium',
  77.0,
  '{
    "suitability":           { "score": 78.5, "slope": 85, "soilDrainage": 72, "aspectExposure": 80, "erosionRisk": 78 },
    "buildability":          { "score": 71.0, "slopeConstraint": 76, "accessRoutes": 68, "soilStability": 71, "floodRisk": 69 },
    "waterResilience":       { "score": 74.5, "rainfallCapture": 78, "droughtRisk": 65, "infiltration": 74, "swaleOpportunity": 81 },
    "agriculturalPotential": { "score": 83.5, "climateWindow": 88, "soilFertility": 79, "waterAvailability": 74, "biodiversitySupport": 93 }
  }'::jsonb,
  '[
    { "id": "slope-gentle",      "category": "terrain",  "severity": "low",    "title": "Gentle slopes throughout",           "body": "Mean slope 4.2 deg — low erosion risk, good for swales and keylines.",          "actionable": true  },
    { "id": "water-stress-mod",  "category": "water",    "severity": "medium", "title": "Moderate summer water stress",        "body": "Jul-Aug deficit ~40 mm. Prioritise rainwater capture and mulching.",           "actionable": true  },
    { "id": "carolinian-bio",    "category": "ecology",  "severity": "low",    "title": "High biodiversity corridor potential", "body": "Mixedwood Plains ecoregion — strong native plant palette and pollinator habitat.", "actionable": false },
    { "id": "frost-window",      "category": "climate",  "severity": "medium", "title": "Late spring frost risk",              "body": "Last frost risk to May 3 (10% risk). Delay tender crops until May 15.",          "actionable": true  },
    { "id": "swale-opportunity", "category": "water",    "severity": "low",    "title": "Swale and pond siting opportunity",   "body": "SE-facing lower slopes ideal for water harvesting earthworks.",               "actionable": true  }
  ]'::jsonb,
  false,
  ARRAY['elevation', 'slope', 'climate_analysis', 'soil_ecology', 'hydrology'],
  '2026-05-01 09:00:00+00'
WHERE NOT EXISTS (
  SELECT 1 FROM site_assessments
  WHERE project_id = '00000000-0000-0000-0000-0000005a3791'
);
