/**
 * AiOutputWriter — persist `AIOutput` rows produced by ClaudeClient into the
 * `ai_outputs` table (migration 010). Reads are via `getLatestForProject` which
 * returns the most-recent row per (project_id, output_type).
 *
 * The narrative BullMQ worker calls `writeOutput(db, output)` after each
 * ClaudeClient generation; the HTTP route reads via `getLatestForProject`.
 */

import type postgres from 'postgres';
import type { AIOutput } from '@ogden/shared';

export interface StoredAiOutput {
  id: string;
  projectId: string;
  outputType: AIOutput['outputType'];
  content: string;
  confidence: 'high' | 'medium' | 'low';
  dataSources: string[];
  caveat: string | null;
  needsSiteVisit: boolean;
  modelId: string;
  generatedAt: string;
}

export async function writeAiOutput(db: postgres.Sql, output: AIOutput): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    INSERT INTO ai_outputs (
      project_id, output_type, content, confidence,
      data_sources, caveat, needs_site_visit, model_id, generated_at
    ) VALUES (
      ${output.projectId},
      ${output.outputType},
      ${output.content},
      ${output.confidence},
      ${output.dataSources},
      ${output.caveat ?? null},
      ${output.needsSiteVisit},
      ${output.modelId},
      ${output.generatedAt}
    )
    RETURNING id
  `;
  return row!.id;
}

/**
 * Return the most-recent AI output of each type for a project. The map key is
 * the `output_type` string; callers pick the fields they care about.
 */
export async function getLatestAiOutputsForProject(
  db: postgres.Sql,
  projectId: string,
): Promise<Record<string, StoredAiOutput>> {
  const rows = await db<{
    id: string;
    project_id: string;
    output_type: string;
    content: string;
    confidence: 'high' | 'medium' | 'low';
    data_sources: string[];
    caveat: string | null;
    needs_site_visit: boolean;
    model_id: string;
    generated_at: string;
  }[]>`
    SELECT DISTINCT ON (output_type)
      id, project_id, output_type, content, confidence,
      data_sources, caveat, needs_site_visit, model_id,
      generated_at::text
    FROM ai_outputs
    WHERE project_id = ${projectId}
    ORDER BY output_type, generated_at DESC
  `;

  const result: Record<string, StoredAiOutput> = {};
  for (const r of rows) {
    result[r.output_type] = {
      id: r.id,
      projectId: r.project_id,
      outputType: r.output_type as AIOutput['outputType'],
      content: r.content,
      confidence: r.confidence,
      dataSources: r.data_sources,
      caveat: r.caveat,
      needsSiteVisit: r.needs_site_visit,
      modelId: r.model_id,
      generatedAt: r.generated_at,
    };
  }
  return result;
}
