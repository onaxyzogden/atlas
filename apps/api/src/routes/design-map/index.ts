/**
 * Design Map generator route — Phase B.5.1.
 *
 * `POST /api/v1/design-map/project/:projectId/generate`
 *
 *   - Dry-run (default `persist: false`) returns candidate features +
 *     summary + warnings without writing anything. Any authenticated
 *     project member may invoke it.
 *   - Persist (`persist: true`) writes each feature to `design_features`
 *     inside a single transaction, broadcasts `features_bulk_created`,
 *     and logs activity. Restricted to `owner` / `designer` via
 *     `requireRole`.
 *
 * The route is a thin adapter — it does no geometry math. It assembles
 * the generator's inputs from the project's terrain + watershed rows,
 * invokes the pure-function `generateDesignMap` service, and (optionally)
 * persists the result with the same SQL shape as the existing
 * `design-features/:projectId/bulk` route.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateDesignFeatureInput,
  DesignFeatureSummary,
  toCamelCase,
} from '@ogden/shared';
import { ForbiddenError } from '../../lib/errors.js';
import { generateDesignMap } from '../../services/designMap/index.js';
import type {
  ContourInput,
  EnterpriseKind,
  GenerateDesignMapInput,
  SwaleCandidateInput,
} from '../../services/designMap/DesignMapGenerator.js';
import type { LineString, Ring } from '../../services/designMap/geometry.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });

const EnterpriseEnum = z.enum([
  'livestock',
  'orchard',
  'market_garden',
  'retreat',
  'education',
  'agritourism',
  'carbon',
  'grants',
]);

const RequestBody = z.object({
  persist: z.boolean().optional().default(false),
  options: z
    .object({
      enterprises: z.array(EnterpriseEnum).optional(),
      orchard: z.record(z.unknown()).optional(),
      swale: z.record(z.unknown()).optional(),
      paddock: z.record(z.unknown()).optional(),
      corridor: z.record(z.unknown()).optional(),
    })
    .optional(),
});

interface PolygonGeom {
  type: 'Polygon';
  coordinates: number[][][];
}
interface MultiPolygonGeom {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}
type ParcelGeom = PolygonGeom | MultiPolygonGeom;

/**
 * Pick the outer ring of the parcel boundary. The boundary column is a
 * `MULTIPOLYGON` (the project boundary route always wraps with `ST_Multi`)
 * but raw `Polygon` geometries are also accepted defensively.
 */
function extractOuterRing(geom: ParcelGeom | null): Ring | null {
  if (!geom) return null;
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 4) return null;
    return ring.map((p) => [p[0]!, p[1]!] as [number, number]);
  }
  if (geom.type === 'MultiPolygon') {
    // Pick the largest polygon by ring length — a fair proxy for "the
    // primary parcel" when the boundary is multi-part.
    let best: number[][] | null = null;
    for (const poly of geom.coordinates) {
      const ring = poly[0];
      if (ring && (best === null || ring.length > best.length)) best = ring;
    }
    if (!best || best.length < 4) return null;
    return best.map((p) => [p[0]!, p[1]!] as [number, number]);
  }
  return null;
}

interface ContourFeature {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: number[][] };
  properties?: Record<string, unknown> | null;
}
interface ContourFC {
  type: 'FeatureCollection';
  features: ContourFeature[];
}

function extractContours(
  fc: ContourFC | null,
  meanSlopePct: number | null,
): ContourInput[] {
  if (!fc || !Array.isArray(fc.features)) return [];
  const out: ContourInput[] = [];
  for (const feat of fc.features) {
    const coords = feat?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const line: LineString = coords.map(
      (p) => [p[0]!, p[1]!] as [number, number],
    );
    const elev = (feat.properties?.['elevation'] ??
      feat.properties?.['elevation_m']) as number | undefined;
    out.push({
      line,
      ...(typeof elev === 'number' ? { elevationM: elev } : {}),
      ...(meanSlopePct !== null ? { meanSlopePct } : {}),
    });
  }
  return out;
}

interface RawSwaleCandidate {
  start?: [number, number];
  end?: [number, number];
  lengthCells?: number;
  meanSlope?: number;
  elevation?: number;
  suitabilityScore?: number;
}

function extractSwaleCandidates(
  summaryData: Record<string, unknown> | null,
): SwaleCandidateInput[] {
  if (!summaryData) return [];
  const block = summaryData['swaleCandidates'] as
    | { candidates?: RawSwaleCandidate[] }
    | undefined;
  if (!block?.candidates) return [];
  const out: SwaleCandidateInput[] = [];
  for (const c of block.candidates) {
    if (
      !c.start ||
      !c.end ||
      typeof c.lengthCells !== 'number' ||
      typeof c.meanSlope !== 'number' ||
      typeof c.elevation !== 'number' ||
      typeof c.suitabilityScore !== 'number'
    ) {
      continue;
    }
    out.push({
      start: [c.start[0]!, c.start[1]!],
      end: [c.end[0]!, c.end[1]!],
      lengthCells: c.lengthCells,
      meanSlope: c.meanSlope,
      elevation: c.elevation,
      suitabilityScore: c.suitabilityScore,
    });
  }
  return out;
}

function parseFeatureRow(row: Record<string, unknown>) {
  return DesignFeatureSummary.parse(toCamelCase(row));
}

export default async function designMapRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/generate',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req, reply) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const body = RequestBody.parse(req.body ?? {});

      // Persistence requires owner/designer — gate early so non-writers
      // do not pay for terrain/watershed lookups on a doomed request.
      if (body.persist && req.projectRole !== 'owner' && req.projectRole !== 'designer') {
        throw new ForbiddenError(
          'Persisting a generated design map requires owner or designer role.',
        );
      }

      // ── Inputs ─────────────────────────────────────────────────────────
      const [project] = await db<{
        acreage: number | null;
        parcel_boundary_geojson: ParcelGeom | null;
      }[]>`
        SELECT
          acreage::float8 AS acreage,
          ST_AsGeoJSON(parcel_boundary)::jsonb AS parcel_boundary_geojson
        FROM projects
        WHERE id = ${projectId}
      `;
      const boundary = extractOuterRing(project?.parcel_boundary_geojson ?? null);
      if (!boundary) {
        reply.code(409);
        return {
          data: null,
          error: {
            code: 'NO_BOUNDARY',
            message:
              'Project has no parcel boundary — set one before generating a design map.',
          },
        };
      }
      const acres = project?.acreage ?? 0;

      const [terrain] = await db<{
        contour_geojson: ContourFC | null;
        slope_mean_deg: number | null;
      }[]>`
        SELECT contour_geojson, slope_mean_deg::float8 AS slope_mean_deg
        FROM terrain_analysis
        WHERE project_id = ${projectId}
      `;
      // Convert mean slope degrees → percent rise/run for the generator.
      const meanSlopePct =
        terrain?.slope_mean_deg !== null && terrain?.slope_mean_deg !== undefined
          ? Math.tan((terrain.slope_mean_deg * Math.PI) / 180) * 100
          : null;
      const contours = extractContours(terrain?.contour_geojson ?? null, meanSlopePct);

      const [watershed] = await db<{
        summary_data: Record<string, unknown> | null;
      }[]>`
        SELECT summary_data
        FROM project_layers
        WHERE project_id = ${projectId}
          AND layer_type = 'watershed_derived'
      `;
      const swaleCandidates = extractSwaleCandidates(watershed?.summary_data ?? null);

      // ── Generate ────────────────────────────────────────────────────────
      const enterprises = body.options?.enterprises as
        | EnterpriseKind[]
        | undefined;
      const generatorInput: GenerateDesignMapInput = {
        parcel: { boundary },
        acres,
        ...(contours.length > 0 ? { contours } : {}),
        ...(swaleCandidates.length > 0 ? { swaleCandidates } : {}),
        ...(enterprises ? { enterprises } : {}),
        // `riparianLines` deferred — `drainage_divide` is polygons, not lines.
      };
      const result = generateDesignMap(generatorInput);

      // ── Dry-run short-circuit ───────────────────────────────────────────
      if (!body.persist) {
        return {
          data: {
            features: result.features,
            summary: result.summary,
            warnings: result.warnings,
          },
          meta: undefined,
          error: null,
        };
      }

      // ── Persist ─────────────────────────────────────────────────────────
      const validFeatures = result.features.map((f) =>
        CreateDesignFeatureInput.parse(f),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- postgres.js TransactionSql type loses call signature via Omit
      const insertedRows = await db.begin(async (sql: any) => {
        const rows: unknown[] = [];
        for (const feature of validFeatures) {
          const geomStr = JSON.stringify(feature.geometry);
          const [row] = await sql`
            INSERT INTO design_features (
              project_id, feature_type, subtype, geometry, label,
              properties, phase_tag, style, sort_order, created_by
            ) VALUES (
              ${projectId},
              ${feature.featureType},
              ${feature.subtype ?? null},
              ST_GeomFromGeoJSON(${geomStr}),
              ${feature.label ?? null},
              ${sql.json(feature.properties)},
              ${feature.phaseTag ?? null},
              ${feature.style ? sql.json(feature.style) : null},
              ${feature.sortOrder ?? 0},
              ${req.userId}
            )
            RETURNING
              id, project_id, feature_type, subtype,
              ST_AsGeoJSON(geometry)::jsonb AS geometry,
              label, properties, phase_tag, style,
              sort_order, created_by, created_at, updated_at
          `;
          rows.push(parseFeatureRow(row!));
        }
        return rows;
      });

      const inserted = insertedRows as { id: string }[];
      const ids = inserted.map((r) => r.id);

      fastify.wsBroadcast(
        projectId,
        {
          type: 'features_bulk_created',
          payload: {
            count: inserted.length,
            features: inserted,
            source: 'design-map-generator',
          } as unknown as Record<string, unknown>,
          userId: req.userId,
          userName: null,
          timestamp: new Date().toISOString(),
        },
        req.userId,
      );

      await logActivity(db, {
        projectId,
        userId: req.userId!,
        action: 'design_map_generated',
        entityType: 'design_map',
        entityId: projectId,
        metadata: {
          featureCount: inserted.length,
          summary: result.summary,
          warningCount: result.warnings.length,
        },
      });

      reply.code(201);
      return {
        data: {
          features: inserted,
          summary: result.summary,
          warnings: result.warnings,
          persisted: { count: inserted.length, ids },
        },
        meta: undefined,
        error: null,
      };
    },
  );
}
