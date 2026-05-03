-- 021_builtin_steward_vision.sql
-- Adds stewardName and visionStatement to the 351 House project metadata.
-- Used by StewardSurveyPage and VisionPage to surface real values.
-- Idempotent — COALESCE keeps any existing value.

UPDATE projects SET
  metadata = metadata || jsonb_build_object(
    'stewardName',     COALESCE(metadata->>'stewardName',     'Yousef Abdelsalam'),
    'visionStatement', COALESCE(metadata->>'visionStatement', 'A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land - modest scale, long horizon.')
  )
WHERE id = '00000000-0000-0000-0000-0000005a3791';
