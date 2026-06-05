/**
 * OLOS catalogue routes — read-only access to the universal catalogue
 * (overlays + objectives + checklist items + m:n overlay bundles).
 *
 * The catalogue is seeded in migration 044 and never mutates at runtime;
 * these endpoints are intentionally public (no auth required) so the
 * frontend's olosCatalogStore can prefetch on app boot.
 *
 * Mounted at /api/v1/olos in src/app.ts.
 */

import type { FastifyInstance } from 'fastify';

type Row = Record<string, unknown>;

function mapOverlayRow(row: Row) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    geometryType: row.geometry_type as string,
    defaultStyle: (row.default_style ?? {}) as Record<string, unknown>,
  };
}

function mapObjectiveRow(row: Row) {
  return {
    id: row.id as string,
    stage: row.stage as string,
    domain: row.domain as string,
    title: row.title as string,
    focusedQuestion: row.focused_question as string,
    completionCriteria: (row.completion_criteria ?? undefined) as
      | string
      | undefined,
    requiredInputs: (row.required_inputs ?? []) as unknown[],
    defaultOverlayBundle: (row.default_overlay_bundle ?? []) as string[],
    checklistItemIds: (row.checklist_item_ids ?? []) as string[],
    outputKind: row.output_kind as string,
    allowedStatuses: (row.allowed_statuses ?? []) as string[],
  };
}

function mapChecklistItemRow(row: Row) {
  return {
    id: row.id as string,
    objectiveId: row.objective_id as string,
    ordinal: Number(row.ordinal),
    instruction: row.instruction as string,
    linkedOverlayId: (row.linked_overlay_id ?? undefined) as string | undefined,
    requiredInputType: row.required_input_type as string,
    required: row.required as boolean,
  };
}

export default async function olosCatalogRoutes(fastify: FastifyInstance) {
  const { db } = fastify;

  // GET /overlays — 15 universal overlays
  fastify.get('/overlays', async () => {
    const rows = await db`
      SELECT id, name, description, geometry_type, default_style
      FROM olos_overlays
      ORDER BY id
    `;
    return {
      data: rows.map(mapOverlayRow),
      meta: { total: rows.length },
      error: null,
    };
  });

  // GET /objectives — 48 objectives (16 domains × 3 stages)
  fastify.get('/objectives', async () => {
    const rows = await db`
      SELECT id, stage, domain, title, focused_question, completion_criteria,
             required_inputs, default_overlay_bundle, checklist_item_ids,
             output_kind, allowed_statuses
      FROM olos_objectives
      ORDER BY domain, stage
    `;
    return {
      data: rows.map(mapObjectiveRow),
      meta: { total: rows.length },
      error: null,
    };
  });

  // GET /checklist-items — ~237 checklist items
  fastify.get('/checklist-items', async () => {
    const rows = await db`
      SELECT id, objective_id, ordinal, instruction, linked_overlay_id,
             required_input_type, required
      FROM olos_checklist_items
      ORDER BY objective_id, ordinal
    `;
    return {
      data: rows.map(mapChecklistItemRow),
      meta: { total: rows.length },
      error: null,
    };
  });

  // GET /catalogue — bundled response (single round trip on app boot)
  fastify.get('/catalogue', async () => {
    const [overlays, objectives, checklistItems, overlayPairs] =
      await Promise.all([
        db`SELECT id, name, description, geometry_type, default_style FROM olos_overlays ORDER BY id`,
        db`SELECT id, stage, domain, title, focused_question, completion_criteria, required_inputs, default_overlay_bundle, checklist_item_ids, output_kind, allowed_statuses FROM olos_objectives ORDER BY domain, stage`,
        db`SELECT id, objective_id, ordinal, instruction, linked_overlay_id, required_input_type, required FROM olos_checklist_items ORDER BY objective_id, ordinal`,
        db`SELECT objective_id, overlay_id FROM olos_objective_overlays`,
      ]);

    return {
      data: {
        overlays: overlays.map(mapOverlayRow),
        objectives: objectives.map(mapObjectiveRow),
        checklistItems: checklistItems.map(mapChecklistItemRow),
        objectiveOverlays: overlayPairs.map((r) => ({
          objectiveId: r.objective_id as string,
          overlayId: r.overlay_id as string,
        })),
      },
      meta: undefined,
      error: null,
    };
  });
}
