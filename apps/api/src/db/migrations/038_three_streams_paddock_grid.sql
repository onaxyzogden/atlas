-- 038_three_streams_paddock_grid.sql
-- 2026-05-21 — Phase 2.5 (Slice A): Three Streams Farm Y2 paddock grid
--
-- Background:
--   Phase 2 (migration 029) seeded the Three Streams Farm builtin with a
--   single cow-calf rotation pasture zone (zone_pasture_cowcalf, id
--   ...df35e00c) and a mobile-poultry follow zone over the same footprint.
--   Livestock substrate was deliberately deferred to Phase 2.5, pending the
--   parallel-session B-track engine work (rotationEngine.ts +
--   livestockRevenue.ts + RotationScheduleCard.tsx + LivestockMoveCard.tsx),
--   which has now landed.
--
--   This migration subdivides the Y2 cow-calf pasture (the north strip,
--   polygon [-79.9140..-79.9060] x [43.5615..43.5638]) into 12 paddock
--   cells as design_features so the designed map, the rotation engine, and
--   the Y2 goal-tree readiness criterion (livestock-rotation-spine-presence-pct
--   >= 90%) all have real substrate. Per canon: 80-head Black Angus /
--   Devon-cross cow-calf on a 3-day rotational move through 12 cells, with a
--   ~33-day rest per cell (12 cells x 3 graze days = 36-day cycle, satisfying
--   the parasite-break window). Poultry follow at a 3-day lag is represented
--   client-side in the livestock seeder, not as separate cells here.
--
--   The farm is fictional; the Halton-region parcel is real. Attribution
--   wording is binding: "inspired by farms like Apricot Lane Farms and the
--   rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm
--   is a fictional Ontario operation."
--
--   Sentinel UUID sub-range for these 12 cells: ...0000df35ad01 .. ad12
--   (distinct from the e0 series used by 029). Idempotent via
--   ON CONFLICT (id) DO NOTHING on pinned UUIDs.
--
--   See:
--     - wiki/entities/three-streams-farm.md  (canon — source of truth)
--     - apps/api/src/db/migrations/029_builtin_three_streams_farm.sql
--     - apps/web/src/dev/seedThreeStreamsFarm.ts  (client livestock seed)

INSERT INTO design_features (id, project_id, feature_type, subtype, geometry, label, properties, phase_tag, sort_order)
VALUES
  ('00000000-0000-0000-0000-0000df35ad01', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.914000,43.5615],[-79.913333,43.5615],[-79.913333,43.5638],[-79.914000,43.5638],[-79.914000,43.5615]]]}'),
    'Paddock 1', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":1,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 30),
  ('00000000-0000-0000-0000-0000df35ad02', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.913333,43.5615],[-79.912667,43.5615],[-79.912667,43.5638],[-79.913333,43.5638],[-79.913333,43.5615]]]}'),
    'Paddock 2', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":2,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 31),
  ('00000000-0000-0000-0000-0000df35ad03', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.912667,43.5615],[-79.912000,43.5615],[-79.912000,43.5638],[-79.912667,43.5638],[-79.912667,43.5615]]]}'),
    'Paddock 3', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":3,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 32),
  ('00000000-0000-0000-0000-0000df35ad04', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.912000,43.5615],[-79.911333,43.5615],[-79.911333,43.5638],[-79.912000,43.5638],[-79.912000,43.5615]]]}'),
    'Paddock 4', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":4,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 33),
  ('00000000-0000-0000-0000-0000df35ad05', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.911333,43.5615],[-79.910667,43.5615],[-79.910667,43.5638],[-79.911333,43.5638],[-79.911333,43.5615]]]}'),
    'Paddock 5', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":5,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 34),
  ('00000000-0000-0000-0000-0000df35ad06', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.910667,43.5615],[-79.910000,43.5615],[-79.910000,43.5638],[-79.910667,43.5638],[-79.910667,43.5615]]]}'),
    'Paddock 6', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":6,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 35),
  ('00000000-0000-0000-0000-0000df35ad07', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.910000,43.5615],[-79.909333,43.5615],[-79.909333,43.5638],[-79.910000,43.5638],[-79.910000,43.5615]]]}'),
    'Paddock 7', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":7,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 36),
  ('00000000-0000-0000-0000-0000df35ad08', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.909333,43.5615],[-79.908667,43.5615],[-79.908667,43.5638],[-79.909333,43.5638],[-79.909333,43.5615]]]}'),
    'Paddock 8', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":8,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 37),
  ('00000000-0000-0000-0000-0000df35ad09', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.908667,43.5615],[-79.908000,43.5615],[-79.908000,43.5638],[-79.908667,43.5638],[-79.908667,43.5615]]]}'),
    'Paddock 9', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":9,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 38),
  ('00000000-0000-0000-0000-0000df35ad0a', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.908000,43.5615],[-79.907333,43.5615],[-79.907333,43.5638],[-79.908000,43.5638],[-79.908000,43.5615]]]}'),
    'Paddock 10', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":10,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 39),
  ('00000000-0000-0000-0000-0000df35ad0b', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.907333,43.5615],[-79.906667,43.5615],[-79.906667,43.5638],[-79.907333,43.5638],[-79.907333,43.5615]]]}'),
    'Paddock 11', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":11,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 40),
  ('00000000-0000-0000-0000-0000df35ad0c', '00000000-0000-0000-0000-000000357320', 'zone', 'paddock',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.906667,43.5615],[-79.906000,43.5615],[-79.906000,43.5638],[-79.906667,43.5638],[-79.906667,43.5615]]]}'),
    'Paddock 12', '{"grazingCellGroup":"cowcalf-Y2","sequenceOrder":12,"targetGrazeDays":3,"targetRestDays":33,"parentZone":"zone_pasture_cowcalf"}', 'p2', 41)
ON CONFLICT (id) DO NOTHING;
