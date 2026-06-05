-- 035_ecosystem_farm_template.sql
-- 2026-05-21 — Phase 4 Prong 2: bootstrap the public "Ecosystem Farm
-- (Apricot-Lane-style)" project_template row by deep-snapshotting Three
-- Streams Farm (the Phase-2 builtin at 00000000-0000-0000-0000-000000357320).
--
-- The snapshot conforms to TemplateSnapshot in
-- packages/shared/src/schemas/template.schema.ts and includes the optional
-- deep fields added in Phase 4 (designFeatures, regenerationEvents,
-- projectRelationships) so cold-visitor instantiation reproduces the canon.
--
-- Geometry strategy: every design-feature geometry is centroid-normalized
-- — stored as ST_AsGeoJSON(ST_Translate(geom, -cx, -cy)) where (cx, cy) is
-- the Three Streams parcel centroid. At instantiation time, the public
-- route translates each feature by the visitor's parcel centroid so the
-- design lands on the visitor's land.
--
-- Date strategy: regeneration_events store `relativeDateDays` as the integer
-- offset from the canon Y0 anchor (2024-04-12, the first MDPI baseline
-- sample in migration 030). At instantiation time, the public route
-- multiplies by '1 day' and adds to the new project's created_at.
--
-- Relationship strategy: project_relationships are linked by design-feature
-- `label` (a stable human-meaningful string), NOT by uuid. At instantiation
-- the handler builds a label → new_id map from the freshly-inserted
-- design_features rows and resolves the edges.
--
-- Idempotent: pinned template id + ON CONFLICT (id) DO NOTHING. Re-running
-- is a no-op. Also guards on slug uniqueness — a separate template row
-- with slug='ecosystem-farm' coexisting with this one is prevented by the
-- project_templates_slug_unique partial index from migration 034.

INSERT INTO project_templates (id, owner_id, name, source_project_id, snapshot, slug, public)
SELECT
  '00000000-0000-0000-0000-0000ec05fa12'::uuid               AS id,
  '00000000-0000-0000-0000-00000000a71a'::uuid               AS owner_id,
  'Ecosystem Farm (Apricot-Lane-style)'                       AS name,
  p.id                                                        AS source_project_id,
  jsonb_build_object(
    'name',                  'Ecosystem Farm',
    'description',           p.description,
    'projectType',           p.project_type,
    'country',               p.country,
    'provinceState',         p.province_state,
    'units',                 p.units,
    'metadata',              COALESCE(p.metadata, '{}'::jsonb),
    'ownerNotes',            p.owner_notes,
    'zoningNotes',           p.zoning_notes,
    'accessNotes',           p.access_notes,
    'waterRightsNotes',      p.water_rights_notes,
    -- Parcel boundary is intentionally NULL — the visitor draws their own
    -- (or accepts the optional sample-boundary affordance from the
    -- Dreaming-tier flow client-side).
    'parcelBoundaryGeojson', NULL,
    'designFeatures',        (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name',             df.label,
            'kind',             COALESCE(df.subtype, df.feature_type),
            'relativeGeometry', ST_AsGeoJSON(
                                  ST_Translate(
                                    df.geometry,
                                    -ST_X(ST_Centroid(p.parcel_boundary)),
                                    -ST_Y(ST_Centroid(p.parcel_boundary))
                                  )
                                )::jsonb,
            'properties',       df.properties
          )
          ORDER BY df.sort_order, df.id
        ),
        '[]'::jsonb
      )
      FROM design_features df
      WHERE df.project_id = p.id
    ),
    'regenerationEvents',    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'relativeDateDays', (re.event_date - DATE '2024-04-12'),
            'phase',            re.phase,
            'eventType',        re.event_type,
            'title',             re.title,
            'description',      re.notes,
            'observations',     re.observations,
            'parentRelativeIndex', NULL
          )
          ORDER BY re.event_date, re.id
        ),
        '[]'::jsonb
      )
      FROM regeneration_events re
      WHERE re.project_id = p.id
    ),
    'projectRelationships',  (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'sourceName', src.label,
            'targetName', dst.label,
            'kind',       pr.from_output || E'→' || pr.to_input,
            'notes',      NULL
          )
          ORDER BY pr.id
        ),
        '[]'::jsonb
      )
      FROM project_relationships pr
      JOIN design_features src ON src.id::text = pr.from_id
      JOIN design_features dst ON dst.id::text = pr.to_id
      WHERE pr.project_id = p.id
    )
  )                                                           AS snapshot,
  'ecosystem-farm'                                            AS slug,
  TRUE                                                        AS public
FROM projects p
WHERE p.id = '00000000-0000-0000-0000-000000357320'::uuid
ON CONFLICT (id) DO NOTHING;
