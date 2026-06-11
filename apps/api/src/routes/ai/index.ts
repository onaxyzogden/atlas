/**
 * AI proxy route — relays chat messages to the Anthropic API from the backend,
 * keeping the API key server-side. Replaces the dangerous direct-browser-access
 * pattern that was in apps/web/src/lib/claude.ts.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../lib/config.js';
import { AppError, NotFoundError } from '../../lib/errors.js';

import { AIEnrichmentRequest } from '@ogden/shared';
import { claudeClient } from '../../services/ai/ClaudeClient.js';
import { runAgent } from '../../services/ai/agentRegistry.js';
import { buildNarrativeContext } from '../../services/ai/NarrativeContextBuilder.js';
import {
  writeAiOutput,
  getLatestAiOutputsForProject,
  type StoredAiOutput,
} from '../../services/ai/AiOutputWriter.js';

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(32000),
    }),
  ).min(1),
  systemPrompt: z.string().max(64000),
});

const AgentChatParams = z.object({ projectId: z.string().uuid() });

const OUTPUT_TYPES = ['site_narrative', 'design_recommendation'] as const;
type GeneratableOutputType = (typeof OUTPUT_TYPES)[number];

const GenerateOutputsParams = z.object({ projectId: z.string().uuid() });

const GenerateOutputsBody = z.object({
  outputTypes: z.array(z.enum(OUTPUT_TYPES)).min(1).default([...OUTPUT_TYPES]),
  force: z.boolean().default(false),
});

// A row generated within this window is returned as-is instead of
// re-generating — debounces double-clicks and parallel panel mounts
// without a job queue.
const GENERATE_FRESHNESS_WINDOW_MS = 5 * 60_000;

const AgentChatBody = z.object({
  role: z.enum(['agro-designer', 'hydro-engineer', 'general']).optional(),
  autoRoute: z.boolean().optional().default(true),
  contextText: z.string().min(1).max(64000),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  const { authenticate, resolveProjectRole } = fastify;

  // POST /ai/chat — proxy chat to Anthropic Messages API
  fastify.post('/chat', { preHandler: [authenticate] }, async (req) => {
    if (!config.ANTHROPIC_API_KEY) {
      throw new AppError('AI_NOT_CONFIGURED', 'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.', 503);
    }

    const body = ChatRequestSchema.parse(req.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: body.systemPrompt,
        messages: body.messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = err?.error?.message ?? `Anthropic API error ${response.status}`;
      throw new AppError('AI_API_ERROR', msg, 502);
    }

    const data = await response.json() as {
      content: { type: string; text: string }[];
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return {
      data: {
        content: text,
        model: data.model,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
      meta: undefined,
      error: null,
    };
  });

  // POST /ai/enrich-assessment — AI-enriched assessment flags. Wired to
  // claudeClient.enrichAssessmentFlags(); returns 503 when ANTHROPIC_API_KEY
  // is not configured so the caller can degrade gracefully.
  fastify.post('/enrich-assessment', { preHandler: [authenticate] }, async (req) => {
    if (!config.ANTHROPIC_API_KEY) {
      throw new AppError('AI_NOT_CONFIGURED', 'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.', 503);
    }

    const body = AIEnrichmentRequest.parse(req.body);
    const result = await claudeClient.enrichAssessmentFlags(body);
    return {
      data: result,
      meta: undefined,
      error: null,
    };
  });

  // POST /ai/project/:projectId/agent-chat — Phase C.6 agent workforce
  // entry point. Wraps `claudeClient.chatWithRole` with a role registry
  // that composes a per-role system addendum on top of the cached Atlas
  // base prompt, parses the trailing HANDOFF: line into structured form,
  // and never auto-chains: callers decide whether to act on a handoff.
  //
  // Gated on `authenticate + resolveProjectRole` — any authenticated
  // project member may call it (reads-only, no writes).
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/agent-chat',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      if (!config.ANTHROPIC_API_KEY) {
        throw new AppError(
          'AI_NOT_CONFIGURED',
          'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.',
          503,
        );
      }
      const { projectId } = AgentChatParams.parse(req.params);
      const body = AgentChatBody.parse(req.body ?? {});

      const result = await runAgent({
        role: body.role,
        autoRoute: body.autoRoute,
        contextText: body.contextText,
        projectId,
      });

      return {
        data: result,
        meta: undefined,
        error: null,
      };
    },
  );

  // POST /ai/project/:projectId/generate-outputs — on-demand generation of
  // site_narrative / design_recommendation rows. Synchronous (same latency
  // class as /ai/enrich-assessment); the BullMQ narrative-generation worker
  // remains the pipeline-driven path — this is the user-triggered one.
  //
  // Unless `force`, a row generated within the freshness window is returned
  // instead of re-generating. Response is keyed by output_type, matching
  // GET /projects/:id/ai-outputs so web callers share one mapping layer.
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/generate-outputs',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      if (!config.ANTHROPIC_API_KEY) {
        throw new AppError(
          'AI_NOT_CONFIGURED',
          'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.',
          503,
        );
      }
      const { projectId } = GenerateOutputsParams.parse(req.params);
      const body = GenerateOutputsBody.parse(req.body ?? {});

      const contextText = await buildNarrativeContext(fastify.db, projectId);
      if (contextText === null) throw new NotFoundError('Project', projectId);

      const existing = await getLatestAiOutputsForProject(fastify.db, projectId);

      const now = Date.now();
      const needed = body.force
        ? body.outputTypes
        : body.outputTypes.filter((type) => {
            const row = existing[type];
            if (!row) return true;
            const ageMs = now - new Date(row.generatedAt).getTime();
            // Unparseable timestamps count as stale: regenerate.
            return !(Number.isFinite(ageMs) && ageMs < GENERATE_FRESHNESS_WINDOW_MS);
          });

      const generated = await Promise.all(
        needed.map(async (type): Promise<[GeneratableOutputType, StoredAiOutput]> => {
          const input = { projectId, contextText };
          const output =
            type === 'site_narrative'
              ? await claudeClient.generateSiteNarrative(input)
              : await claudeClient.generateDesignRecommendation(input);
          const id = await writeAiOutput(fastify.db, output);
          return [
            type,
            {
              id,
              projectId: output.projectId,
              outputType: output.outputType,
              content: output.content,
              confidence: output.confidence,
              dataSources: output.dataSources,
              caveat: output.caveat ?? null,
              needsSiteVisit: output.needsSiteVisit,
              modelId: output.modelId,
              generatedAt: output.generatedAt,
            },
          ];
        }),
      );

      const data: Record<string, StoredAiOutput> = {};
      for (const type of body.outputTypes) {
        const row = existing[type];
        if (row) data[type] = row;
      }
      for (const [type, row] of generated) data[type] = row;

      return {
        data,
        meta: { generated: needed },
        error: null,
      };
    },
  );
}
